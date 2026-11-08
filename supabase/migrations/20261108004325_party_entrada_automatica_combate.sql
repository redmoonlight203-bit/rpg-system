begin;
create function private.combate_preparar_party(p_personaje bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare lider public.personajes%rowtype;integrante public.personajes%rowtype;preparado jsonb;resultado jsonb:='[]';
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede añadir una party al combate.' using errcode='42501';end if;
 select * into lider from public.personajes where id=p_personaje and estado_vida='vivo' and estado_aprobacion='aprobado';
 if not found then raise exception 'Elige un personaje vivo y aprobado.';end if;
 perform private.party_comprobar_gm(lider.user_id);
 -- The roster is read as one stable group, serialized with assignments and withdrawals.
 perform pg_advisory_xact_lock(hashtextextended(lider.user_id::text,0));
 select * into lider from public.personajes where id=p_personaje and estado_vida='vivo' and estado_aprobacion='aprobado' for share;
 if not found then raise exception 'El personaje ya no está disponible.';end if;
 if lider.es_companero and (not lider.party_activo or not exists(select 1 from public.party_companeros pc where pc.personaje_id=lider.id and pc.user_id=lider.user_id and pc.activo)) then raise exception 'Este NPC ya no forma parte de una party activa.';end if;
 for integrante in
  select p.* from public.personajes p where p.estado_vida='vivo' and p.estado_aprobacion='aprobado' and
  (p.id=lider.id or (not lider.es_companero and p.user_id=lider.user_id and p.es_companero and p.party_activo and exists(select 1 from public.party_companeros pc where pc.personaje_id=p.id and pc.user_id=lider.user_id and pc.activo)))
  order by (p.id=lider.id) desc,p.id for share
 loop
  preparado:=public.combate_preparar_jugador(integrante.id)||jsonb_build_object('nivel',integrante.nivel);
  if coalesce((preparado->>'requiere_configuracion')::boolean,false) then raise exception 'Configura la vida de % en su ficha antes de añadir la party.',integrante.nombre;end if;
  resultado:=resultado||jsonb_build_array(preparado);
 end loop;
 if jsonb_array_length(resultado)>100 then raise exception 'La party excede el máximo de cien participantes.';end if;
 return resultado;
end;$$;
revoke all on function private.combate_preparar_party(bigint) from public,anon;
grant execute on function private.combate_preparar_party(bigint) to authenticated;
create function public.combate_preparar_party(p_personaje bigint) returns jsonb language sql security invoker set search_path='' as $$select private.combate_preparar_party(p_personaje)$$;
revoke all on function public.combate_preparar_party(bigint) from public,anon;
grant execute on function public.combate_preparar_party(bigint) to authenticated;
notify pgrst,'reload schema';
commit;
