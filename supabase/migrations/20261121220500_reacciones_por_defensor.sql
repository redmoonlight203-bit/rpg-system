create or replace function yugen_interno.confirmar_jugador(p_usuario uuid,p_combate uuid,p_actor text,p_version integer,p_datos jsonb) returns void language plpgsql security definer set search_path='' as $$
declare b public.combates_yugen%rowtype;ctx jsonb;m jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_combate::text,0));
 select * into b from public.combates_yugen where id=p_combate for update;
 ctx:=yugen_interno.contexto_jugador(p_usuario,p_combate,p_actor);m:=ctx->'actor';
 if b.version is distinct from p_version then raise exception 'El combate cambió. Recarga antes de actuar.';end if;
 if b.datos->>'fase'<>'en_curso' or (case when b.datos->'reaccion_pendiente' is not null then (b.datos #>> '{reaccion_pendiente,oferta,defensor}') is distinct from p_actor or m->>'bando'='enemigo' else (b.datos->>'actual') is distinct from p_actor end) or coalesce((m->>'vida')::numeric,0)<=0 then raise exception 'Solo puedes controlar tu personaje durante su turno.';end if;
 update public.combates_yugen set datos=p_datos,version=version+1,updated_at=now() where id=p_combate;
end;$$;
