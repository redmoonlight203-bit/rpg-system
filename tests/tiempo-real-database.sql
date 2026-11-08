-- Run against an installed project. All data changes are rolled back.
begin;
do $$declare u uuid;antes uuid;despues uuid;begin
 select id into u from public.perfiles order by id limit 1;
 if u is null then raise exception 'Se necesita una cuenta para comprobar los avisos';end if;
 select revision into antes from public.avisos_actualizacion where user_id=u;
 update public.personajes set nombre=nombre where id=(select min(id) from public.personajes);
 select revision into despues from public.avisos_actualizacion where user_id=u;
 if despues is null or despues is not distinct from antes then raise exception 'El cambio no produjo un aviso';end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='avisos_actualizacion') then raise exception 'Falta publicar los avisos';end if;
 if has_table_privilege('authenticated','public.avisos_actualizacion','INSERT') or has_table_privilege('authenticated','public.avisos_actualizacion','UPDATE') then raise exception 'Un jugador puede falsificar avisos';end if;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from public.perfiles order by id limit 1),true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.avisos_actualizacion where user_id<>(select auth.uid())) then raise exception 'RLS permite ver avisos ajenos';end if;
 if not exists(select 1 from public.avisos_actualizacion where user_id=(select auth.uid())) then raise exception 'El usuario no recibe sus avisos';end if;
end $$;
rollback;
