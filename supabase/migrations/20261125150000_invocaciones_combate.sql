begin;
-- Invocaciones en combate.
-- 1. Las habilidades del jugador (inventario) y de sus naturalezas llevan su configuración de invocación al combate.
--    Sin ella, la acción de invocar no aparecía para los personajes de jugador.
-- 2. confirmar_jugador acepta que el jugador dirija el turno de su propia invocación o de quien controla por control mental.

-- 1a. Inventario del jugador: la instantánea (o, en piezas antiguas sin ella, la creación original).
do $$declare d text;marca text:=$m$pieza:=jsonb_build_object('requisitos_uso',coalesce(i.configuracion->'requisitos_uso','{}'),$m$;begin
 select pg_get_functiondef('yugen_interno.preparar_jugador(bigint)'::regprocedure) into d;
 if position('configuracion_invocacion' in d)>0 then return;end if;
 if position(marca in d)=0 then raise exception 'preparar_jugador inesperado: falta la pieza del inventario';end if;
 d:=replace(d,marca,$m$pieza:=jsonb_build_object('configuracion_invocacion',coalesce(i.configuracion->'configuracion_invocacion',(select fm.configuracion_invocacion from public.forja_maestra fm where fm.id=i.forja_id)),'requisitos_uso',coalesce(i.configuracion->'requisitos_uso','{}'),$m$);
 execute d;
end;$$;

-- 1b. Habilidades de las naturalezas.
do $$declare d text;marca text:=$m$pieza:=jsonb_build_object('nombre',f.nombre,'stats','{}'::jsonb,$m$;begin
 select pg_get_functiondef('public.naturalezas_combate_snapshot(bigint)'::regprocedure) into d;
 if position('configuracion_invocacion' in d)>0 then return;end if;
 if position(marca in d)=0 then raise exception 'naturalezas_combate_snapshot inesperado: falta la pieza de habilidad';end if;
 d:=replace(d,marca,$m$pieza:=jsonb_build_object('configuracion_invocacion',f.configuracion_invocacion,'nombre',f.nombre,'stats','{}'::jsonb,$m$);
 execute d;
end;$$;

-- 2. ¿Dirige p_actor el turno actual? Su invocación o un combatiente bajo su control mental (el servidor comprueba el estado exacto).
create or replace function yugen_interno.dirige_turno(p_actor text,p_datos jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce((select z #>> '{invocacion,invocador}' = p_actor
   or exists(select 1 from jsonb_array_elements(coalesce(z->'estados','[]')) e where e->>'fuente'=p_actor)
  from jsonb_array_elements(coalesce(p_datos->'miembros','[]')) z where z->>'id'=p_datos->>'actual' limit 1),false);
$$;
revoke all on function yugen_interno.dirige_turno(text,jsonb) from public,anon,authenticated;

create or replace function yugen_interno.confirmar_jugador(p_usuario uuid,p_combate uuid,p_actor text,p_version integer,p_datos jsonb) returns void language plpgsql security definer set search_path='' as $$
declare b public.combates_yugen%rowtype;ctx jsonb;m jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_combate::text,0));
 select * into b from public.combates_yugen where id=p_combate for update;
 ctx:=yugen_interno.contexto_jugador(p_usuario,p_combate,p_actor);m:=ctx->'actor';
 if b.version is distinct from p_version then raise exception 'El combate cambió. Recarga antes de actuar.';end if;
 if b.datos->>'fase'<>'en_curso' or (case when b.datos->'reaccion_pendiente' is not null then (b.datos #>> '{reaccion_pendiente,oferta,defensor}') is distinct from p_actor or m->>'bando'='enemigo' else (b.datos->>'actual') is distinct from p_actor and not yugen_interno.legendaria_valida(p_actor,b.datos,p_datos) and not yugen_interno.dirige_turno(p_actor,b.datos) end) or coalesce((m->>'vida')::numeric,0)<=0 then raise exception 'Solo puedes controlar tu personaje durante su turno.';end if;
 update public.combates_yugen set datos=p_datos,version=version+1,updated_at=now() where id=p_combate;
end;$$;
notify pgrst,'reload schema';
commit;
