-- Las acciones propias de un personaje viven en su columna `configuracion_dados`.
-- El snapshot las expone como `acciones_personaje` (nunca mezcladas con `habilidades`).
-- Solo cambia la función: no se reescribe ningún dato.
create schema if not exists private;

do $$declare definicion text;begin
 select pg_get_functiondef('public.forja_snapshot_config(uuid)'::regprocedure) into definicion;
 definicion:=replace(definicion,'public.forja_snapshot_config(','private.forja_snapshot_config_base(');
 execute definicion;
end;$$;
alter function private.forja_snapshot_config_base(uuid) set search_path='';

create or replace function public.forja_snapshot_config(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare base jsonb;acciones jsonb;
begin
 base:=private.forja_snapshot_config_base(p_id);
 select case when f.tipo_creacion='personaje' and jsonb_typeof(f.configuracion_dados)='array' then f.configuracion_dados else '[]'::jsonb end into acciones from public.forja_maestra f where f.id=p_id;
 return base||jsonb_build_object('acciones_personaje',coalesce(acciones,'[]'::jsonb));
end;$$;

revoke all on function private.forja_snapshot_config_base(uuid),public.forja_snapshot_config(uuid) from public,anon,authenticated;
