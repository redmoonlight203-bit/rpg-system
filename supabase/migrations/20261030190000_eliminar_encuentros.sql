begin;
create or replace function public.combate_eliminar(p_id uuid,p_version integer) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare fila public.combates_yugen%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then raise exception 'Solo Kuroi puede borrar encuentros.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into fila from public.combates_yugen where id=p_id for update;
 if not found then raise exception 'El encuentro ya no existe.';end if;
 if fila.creador_id<>auth.uid() then raise exception 'Este encuentro pertenece a otro director.' using errcode='42501';end if;
 if p_version is null or fila.version<>p_version then raise exception 'El encuentro cambió en otra sesión. Recárgalo antes de borrarlo.';end if;
 delete from public.combates_yugen where id=p_id;
end;$$;
revoke all on function public.combate_eliminar(uuid,integer) from public,anon;
grant execute on function public.combate_eliminar(uuid,integer) to authenticated;
commit;
