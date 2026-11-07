begin;
-- Protect every deletion path, including direct GM table operations.
create function private.personaje_antes_borrar() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede borrar personajes.' using errcode='42501';end if;
 if exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=old.id::text) then raise exception 'Retira al personaje del encuentro o finaliza el combate antes de borrarlo.';end if;
 -- Preserve account assets before the character and its exclusive possessions disappear.
 update public.inventario_jugador set personaje_id=null,slot_equipado=null where personaje_id=old.id and ligado_al_alma;
 delete from public.inventario_jugador where personaje_id=old.id and not coalesce(ligado_al_alma,false);
 return old;
end;$$;
revoke all on function private.personaje_antes_borrar() from public,anon,authenticated;
create trigger personaje_antes_borrar before delete on public.personajes for each row execute function private.personaje_antes_borrar();
create function private.personaje_borrar(p_personaje bigint,p_usuario uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede borrar personajes.' using errcode='42501';end if;
 perform 1 from public.personajes where id=p_personaje and user_id=p_usuario for update;
 if not found then raise exception 'El personaje ya no existe o no pertenece a esa cuenta.';end if;
 delete from public.personajes where id=p_personaje and user_id=p_usuario;
end;$$;
revoke all on function private.personaje_borrar(bigint,uuid) from public,anon;
grant execute on function private.personaje_borrar(bigint,uuid) to authenticated;
create function public.personaje_borrar(p_personaje bigint,p_usuario uuid) returns void language sql security invoker set search_path='' as $$select private.personaje_borrar(p_personaje,p_usuario)$$;
revoke all on function public.personaje_borrar(bigint,uuid) from public,anon;
grant execute on function public.personaje_borrar(bigint,uuid) to authenticated;
commit;
