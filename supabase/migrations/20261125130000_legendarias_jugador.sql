begin;
-- Acciones legendarias de los jugadores fuera de su turno.
-- Antes solo se aceptaba guardar durante el turno propio (o al responder una reacción).
-- Ahora también se acepta, sin reacción pendiente, un resultado que demuestre una acción legendaria propia:
-- mismo turno y misma ronda, y el gasto legendario del actor en esta ronda sube exactamente en uno.
-- O bien la pausa de esa acción porque el objetivo puede reaccionar: el combate no cambia salvo la reacción
-- pendiente, cuya orden es del propio actor; al responderla, el motor vuelve a exigir que sea legendaria.
create or replace function yugen_interno.legendaria_valida(p_actor text,p_antes jsonb,p_despues jsonb) returns boolean language sql immutable set search_path='' as $$
 with a as (select z from jsonb_array_elements(coalesce(p_antes->'miembros','[]')) z where z->>'id'=p_actor limit 1),
      d as (select z from jsonb_array_elements(coalesce(p_despues->'miembros','[]')) z where z->>'id'=p_actor limit 1)
 select coalesce((
  select (p_despues->>'actual') is not distinct from (p_antes->>'actual')
   and (p_despues->>'ronda') is not distinct from (p_antes->>'ronda')
   and p_despues->>'fase'='en_curso'
   and p_despues->'reaccion_pendiente' is null
   and (d.z #>> '{gasto_acciones,ronda}') is not distinct from (p_antes->>'ronda')
   and coalesce((d.z #>> '{gasto_acciones,legendaria}')::numeric,0)
       = 1+case when (a.z #>> '{gasto_acciones,ronda}') is not distinct from (p_antes->>'ronda') then coalesce((a.z #>> '{gasto_acciones,legendaria}')::numeric,0) else 0 end
  from a,d),false)
 or (p_antes->'reaccion_pendiente' is null
  and (p_despues #>> '{reaccion_pendiente,orden,actor}') is not distinct from p_actor
  and p_despues->'reaccion_pendiente'->'orden' ? 'accion'
  and (p_despues-'reaccion_pendiente'-'evento_visual'-'historial'-'resultado')=(p_antes-'evento_visual'-'historial'-'resultado'));
$$;
revoke all on function yugen_interno.legendaria_valida(text,jsonb,jsonb) from public,anon,authenticated;

create or replace function yugen_interno.confirmar_jugador(p_usuario uuid,p_combate uuid,p_actor text,p_version integer,p_datos jsonb) returns void language plpgsql security definer set search_path='' as $$
declare b public.combates_yugen%rowtype;ctx jsonb;m jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_combate::text,0));
 select * into b from public.combates_yugen where id=p_combate for update;
 ctx:=yugen_interno.contexto_jugador(p_usuario,p_combate,p_actor);m:=ctx->'actor';
 if b.version is distinct from p_version then raise exception 'El combate cambió. Recarga antes de actuar.';end if;
 if b.datos->>'fase'<>'en_curso' or (case when b.datos->'reaccion_pendiente' is not null then (b.datos #>> '{reaccion_pendiente,oferta,defensor}') is distinct from p_actor or m->>'bando'='enemigo' else (b.datos->>'actual') is distinct from p_actor and not yugen_interno.legendaria_valida(p_actor,b.datos,p_datos) end) or coalesce((m->>'vida')::numeric,0)<=0 then raise exception 'Solo puedes controlar tu personaje durante su turno.';end if;
 update public.combates_yugen set datos=p_datos,version=version+1,updated_at=now() where id=p_combate;
end;$$;
notify pgrst,'reload schema';
commit;
