begin;
grant usage on schema private to service_role;
create table public.salas_arena(
 id uuid primary key default gen_random_uuid(),combate_id uuid not null unique references public.combates_yugen(id) on delete cascade,
 creador_id uuid not null references public.perfiles(id),invitado_id uuid references public.perfiles(id),nombre text not null,modo text not null check(modo in ('pvp','pve')),estado text not null check(estado in ('preparacion','en_curso','finalizado')),created_at timestamptz not null default now()
);
create index salas_creador_idx on public.salas_arena(creador_id);create index salas_invitado_idx on public.salas_arena(invitado_id);
alter table public.salas_arena enable row level security;
revoke all on public.salas_arena from public,anon,authenticated;grant select on public.salas_arena to authenticated;
create policy arena_salas_lectura on public.salas_arena for select to authenticated using((select private.tienda_es_gm()) or creador_id=(select auth.uid()) or invitado_id=(select auth.uid()) or (modo='pvp' and estado='preparacion' and exists(select 1 from public.perfiles where id=(select auth.uid()) and estado='aprobado' and rol='REENCARNADO')));
create trigger avisar_actualizacion after insert or update or delete on public.salas_arena for each statement execute function private.avisar_actualizacion();
create function private.arena_preparar(p_usuario uuid,p_personaje bigint,p_enemigo uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;f public.forja_maestra%rowtype;datos jsonb;s jsonb;conf jsonb;par record;
begin
 if not exists(select 1 from public.perfiles where id=p_usuario and rol='REENCARNADO' and estado='aprobado') then raise exception 'La cuenta no está disponible.';end if;
 perform set_config('request.jwt.claim.sub',p_usuario::text,true);
 if p_enemigo is not null then
 select * into f from public.forja_maestra where id=p_enemigo and tipo_creacion='personaje' and estado='aprobado';
 if not found then raise exception 'Selecciona un enemigo aprobado.';end if;
 s:=public.forja_stats_componente(f.id);conf:=public.forja_snapshot_config(f.id);
 for par in select * from jsonb_each(coalesce(conf->'bonos_equipamiento','{}')) loop if s ? par.key then s:=s||jsonb_build_object(par.key,(s->>par.key)::numeric+(par.value::text)::numeric);end if;end loop;
 return jsonb_build_object('id',gen_random_uuid(),'forja_id',f.id,'nombre',f.nombre,'stats',s,'configuracion',conf);
 end if;
 select * into p from public.personajes where id=p_personaje and user_id=p_usuario and estado_vida='vivo' and estado_aprobacion='aprobado';
 if not found then raise exception 'Selecciona uno de tus personajes vivos y aprobados.';end if;
 if exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=p.id::text) then raise exception 'Termina el encuentro actual de este personaje antes de entrar a otra sala.';end if;
 datos:=yugen_interno.preparar_jugador(p.id);
 -- Una copia temporal empieza recuperada; la ficha original nunca se actualiza.
 return datos||jsonb_build_object('vida_actual',coalesce(datos->'stats'->'vida',datos->'stats'->'hp','1'::jsonb),'ph_actual',coalesce(datos->'stats'->'ph','0'::jsonb),'fatiga_actual',0);
end;$$;
create function private.arena_contexto(p_usuario uuid,p_sala uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.salas_arena%rowtype;b public.combates_yugen%rowtype;
begin
 if not exists(select 1 from public.perfiles where id=p_usuario and rol='REENCARNADO' and estado='aprobado') then raise exception 'Cuenta no disponible.';end if;
 select * into s from public.salas_arena where id=p_sala;
 if not found or s.modo<>'pvp' or s.estado<>'preparacion' or s.creador_id=p_usuario then raise exception 'No puedes unirte a esta sala.';end if;
 select * into b from public.combates_yugen where id=s.combate_id;
 return jsonb_build_object('sala',to_jsonb(s),'combate',b.datos,'version',b.version);
end;$$;
create function private.arena_guardar(p_usuario uuid,p_sala uuid,p_nombre text,p_modo text,p_datos jsonb,p_version int default 0) returns uuid language plpgsql security definer set search_path='' as $$
declare s public.salas_arena%rowtype;b public.combates_yugen%rowtype;bid uuid:=gen_random_uuid();m jsonb;
begin
 if not exists(select 1 from public.perfiles where id=p_usuario and rol='REENCARNADO' and estado='aprobado') or p_datos->'politica'->>'modo' is distinct from 'entrenamiento' then raise exception 'Arena no autorizada.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_sala::text,0));
 select * into s from public.salas_arena where id=p_sala;
 if found then
 perform pg_advisory_xact_lock(hashtextextended(s.combate_id::text,0));
 select * into b from public.combates_yugen where id=s.combate_id for update;
 select * into s from public.salas_arena where id=p_sala for update;
 if s.creador_id=p_usuario or s.invitado_id is not null or s.estado<>'preparacion' or b.version<>p_version or jsonb_array_length(p_datos->'miembros')<>2 then raise exception 'La sala cambió. Recarga antes de unirte.';end if;
 select x into m from jsonb_array_elements(p_datos->'miembros') x where x->>'bando'='enemigo';
 if not exists(select 1 from public.personajes where id::text=m->>'personaje_id' and user_id=p_usuario and estado_vida='vivo' and estado_aprobacion='aprobado') then raise exception 'El personaje no te pertenece.';end if;
 update public.combates_yugen set datos=p_datos,version=version+1,updated_at=now() where id=b.id;
 update public.salas_arena set invitado_id=p_usuario,estado=p_datos->>'fase' where id=s.id;
 return b.id;
 end if;
 if p_version<>0 or p_modo not in ('pvp','pve') or length(btrim(coalesce(p_nombre,''))) not between 1 and 120 then raise exception 'Sala inválida.';end if;
 if exists(select 1 from public.salas_arena where creador_id=p_usuario and estado in ('preparacion','en_curso')) then raise exception 'Termina tu sala actual antes de crear otra.';end if;
 select x into m from jsonb_array_elements(p_datos->'miembros') x where x->>'bando'='jugador';
 if not exists(select 1 from public.personajes where id::text=m->>'personaje_id' and user_id=p_usuario and estado_vida='vivo' and estado_aprobacion='aprobado') then raise exception 'El personaje no te pertenece.';end if;
 insert into public.combates_yugen(id,nombre,creador_id,datos) values(bid,btrim(p_nombre),p_usuario,p_datos);
 insert into public.salas_arena(id,combate_id,creador_id,nombre,modo,estado) values(p_sala,bid,p_usuario,btrim(p_nombre),p_modo,p_datos->>'fase');
 return bid;
end;$$;
create function private.arena_actualizar() returns trigger language plpgsql security definer set search_path='' as $$begin update public.salas_arena set estado=new.datos->>'fase' where combate_id=new.id and estado is distinct from new.datos->>'fase';return new;end;$$;
create trigger arena_actualizar after update on public.combates_yugen for each row execute function private.arena_actualizar();
create function public.arena_preparar_servidor(p_usuario uuid,p_personaje bigint,p_enemigo uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.arena_preparar(p_usuario,p_personaje,p_enemigo)$$;
create function public.arena_contexto_servidor(p_usuario uuid,p_sala uuid) returns jsonb language sql security invoker set search_path='' as $$select private.arena_contexto(p_usuario,p_sala)$$;
create function public.arena_guardar_servidor(p_usuario uuid,p_sala uuid,p_nombre text,p_modo text,p_datos jsonb,p_version int default 0) returns uuid language sql security invoker set search_path='' as $$select private.arena_guardar(p_usuario,p_sala,p_nombre,p_modo,p_datos,p_version)$$;
create function private.arena_cancelar(p_sala uuid) returns void language plpgsql security definer set search_path='' as $$
declare s public.salas_arena%rowtype;
begin
 select * into s from public.salas_arena where id=p_sala;
 if not found or auth.uid() is null or (s.creador_id<>auth.uid() and s.invitado_id is distinct from auth.uid()) then raise exception 'Esta sala no te pertenece.';end if;
 perform pg_advisory_xact_lock(hashtextextended(s.combate_id::text,0));
 perform 1 from public.combates_yugen where id=s.combate_id for update;
 perform 1 from public.salas_arena where id=p_sala for update;
 update public.combates_yugen set datos=(datos||'{"fase":"finalizado","actual":null}'::jsonb),version=version+1,updated_at=now() where id=s.combate_id and datos->>'fase'<>'finalizado';
end;$$;
create function public.arena_cancelar(p_sala uuid) returns void language sql security invoker set search_path='' as $$select private.arena_cancelar(p_sala)$$;
revoke all on function private.arena_cancelar(uuid),public.arena_cancelar(uuid) from public,anon;grant execute on function private.arena_cancelar(uuid),public.arena_cancelar(uuid) to authenticated;
do $$declare f record;begin
 for f in select p.oid::regprocedure::text firma from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','public') and p.proname in ('arena_preparar','arena_contexto','arena_guardar','arena_preparar_servidor','arena_contexto_servidor','arena_guardar_servidor') loop execute format('revoke all on function %s from public,anon,authenticated',f.firma);execute format('grant execute on function %s to service_role',f.firma);end loop;
end;$$;
revoke all on function private.arena_actualizar() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
