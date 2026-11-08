begin;
-- Only an opaque revision is published. Private combat state stays behind the existing RPCs.
create table if not exists public.avisos_actualizacion (
 user_id uuid primary key references public.perfiles(id) on delete cascade,
 revision uuid not null default gen_random_uuid()
);
alter table public.avisos_actualizacion enable row level security;
revoke all on public.avisos_actualizacion from anon,authenticated;
grant select on public.avisos_actualizacion to authenticated;
grant all on public.avisos_actualizacion to service_role;
create policy avisos_propios on public.avisos_actualizacion for select to authenticated using ((select auth.uid())=user_id);
create or replace function private.avisar_actualizacion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.avisos_actualizacion(user_id,revision)
 select id,gen_random_uuid() from public.perfiles order by id
 on conflict(user_id) do update set revision=excluded.revision;
 return null;
end;$$;
revoke all on function private.avisar_actualizacion() from public,anon,authenticated;
do $$declare t text;begin
 foreach t in array array['personajes','perfiles','inventario_jugador','articulos_alma','cementerio_personajes','naturalezas','personaje_naturalezas','arbol_nodos','forja_maestra','creaciones_forja','categorias_forja','config_estadisticas','combates_yugen','tienda_ofertas','negociaciones_tienda','tienda_items','monedas','saldos_usuario','movimientos_moneda','jugador_vinculos','jugador_mapas','mapas','tableros','tablero_tokens','tiempo_juego','codex_entradas','codex_descubrimientos','deudas_kuroi'] loop
  if to_regclass('public.'||t) is not null then
   execute format('create or replace trigger avisar_actualizacion after insert or update or delete on public.%I for each statement execute function private.avisar_actualizacion()',t);
  end if;
 end loop;
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='avisos_actualizacion') then alter publication supabase_realtime add table public.avisos_actualizacion;end if;
end;$$;
notify pgrst,'reload schema';
commit;
