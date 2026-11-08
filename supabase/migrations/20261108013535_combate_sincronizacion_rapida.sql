begin;
-- Avisos pequeños y privados: el estado completo nunca se publica por Realtime.
create table public.combate_actualizaciones (
 user_id uuid not null references public.perfiles(id) on delete cascade,
 combate_id uuid not null, version integer not null, revision uuid not null default gen_random_uuid(),
 primary key(user_id,combate_id)
);
alter table public.combate_actualizaciones enable row level security;
revoke all on public.combate_actualizaciones from public,anon,authenticated;
grant select on public.combate_actualizaciones to authenticated;
grant all on public.combate_actualizaciones to service_role;
create policy combate_avisos_propios on public.combate_actualizaciones for select to authenticated using ((select auth.uid())=user_id);
create function private.combate_inicio_aviso() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform set_config('yugen.combate_mutando',(coalesce(nullif(current_setting('yugen.combate_mutando',true),''),'0')::integer+1)::text,true);
 return null;
end;$$;
create function private.combate_fin_aviso() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform set_config('yugen.combate_mutando',greatest(0,coalesce(nullif(current_setting('yugen.combate_mutando',true),''),'0')::integer-1)::text,true);
 return null;
end;$$;
create or replace function private.avisar_actualizacion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Recursos, equipo y muertes dentro del combate se notifican una sola vez abajo.
 if coalesce(nullif(current_setting('yugen.combate_mutando',true),''),'0')::integer>0 then return null;end if;
 insert into public.avisos_actualizacion(user_id,revision)
 select id,gen_random_uuid() from public.perfiles order by id
 on conflict(user_id) do update set revision=excluded.revision;
 return null;
end;$$;
create function private.combate_emitir_aviso() returns trigger language plpgsql security definer set search_path='' as $$
declare anterior jsonb; siguiente jsonb; destinatario uuid; combate uuid; rev integer;
begin
 if TG_OP<>'INSERT' then anterior:=to_jsonb(old);end if;
 if TG_OP<>'DELETE' then siguiente:=to_jsonb(new);end if;
 combate:=coalesce(siguiente->>'id',anterior->>'id')::uuid;
 rev:=coalesce(siguiente->>'version',anterior->>'version')::integer;
 for destinatario in
  select distinct u from (
   select (anterior->>'creador_id')::uuid u union select (siguiente->>'creador_id')::uuid
   union select p.user_id from jsonb_array_elements(coalesce(anterior->'datos'->'miembros','[]'::jsonb)||coalesce(siguiente->'datos'->'miembros','[]'::jsonb)) m
   join public.personajes p on p.id::text=m->>'personaje_id'
  ) usuarios where u is not null order by u
 loop
  insert into public.combate_actualizaciones(user_id,combate_id,version) values(destinatario,combate,rev)
  on conflict(user_id,combate_id) do update set version=excluded.version,revision=gen_random_uuid();
  insert into public.avisos_actualizacion(user_id,revision) values(destinatario,gen_random_uuid())
  on conflict(user_id) do update set revision=excluded.revision;
 end loop;
 return null;
end;$$;
revoke all on function private.combate_inicio_aviso(),private.combate_fin_aviso(),private.combate_emitir_aviso() from public,anon,authenticated;
drop trigger if exists avisar_actualizacion on public.combates_yugen;
create trigger combate_inicio_aviso before insert or update or delete on public.combates_yugen for each statement execute function private.combate_inicio_aviso();
create trigger zzz_combate_emitir_aviso after insert or update or delete on public.combates_yugen for each row execute function private.combate_emitir_aviso();
create trigger combate_fin_aviso after insert or update or delete on public.combates_yugen for each statement execute function private.combate_fin_aviso();
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then alter publication supabase_realtime add table public.combate_actualizaciones;end if;
end;$$;

-- La propiedad y el rol se comprueban incluso cuando el cliente ya tiene la revisión actual.
create function yugen_interno.consultar_jugador_rapido(p_usuario uuid,p_combate uuid,p_actor text,p_version integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.combates_yugen%rowtype;m jsonb; propios jsonb;
begin
 if p_combate is null then return yugen_interno.contexto_jugador(p_usuario,null,null);end if;
 if not exists(select 1 from public.perfiles where id=p_usuario and rol='REENCARNADO' and estado='aprobado') then raise exception 'Cuenta no disponible.' using errcode='42501';end if;
 select * into b from public.combates_yugen where id=p_combate;
 if not found then raise exception 'El encuentro ya no está disponible.';end if;
 select x into m from jsonb_array_elements(b.datos->'miembros') x join public.personajes p on p.id::text=x->>'personaje_id' where x->>'id'=p_actor and p.user_id=p_usuario;
 if m is null then raise exception 'Este participante no te pertenece.' using errcode='42501';end if;
 if p_version=b.version then return jsonb_build_object('sin_cambios',true,'id',b.id,'version',b.version);end if;
 select jsonb_agg(jsonb_build_object('id',x->>'id','personaje_id',x->>'personaje_id','nombre',x->>'nombre','es_turno',b.datos->>'actual'=x->>'id')) into propios
 from jsonb_array_elements(b.datos->'miembros') x join public.personajes p on p.id::text=x->>'personaje_id' where p.user_id=p_usuario;
 return jsonb_build_object('id',b.id,'nombre',b.nombre,'version',b.version,'combate',b.datos-'historial','actor',m,'propios',propios);
end;$$;
create function public.jugador_consultar_rapido_servidor(p_usuario uuid,p_combate uuid,p_actor text,p_version integer default null) returns jsonb language sql security invoker set search_path='' as $$select yugen_interno.consultar_jugador_rapido(p_usuario,p_combate,p_actor,p_version)$$;

-- Guardado y lectura en la misma transacción; el historial se reconstruye con datos del servidor.
create function yugen_interno.confirmar_jugador_rapido(p_usuario uuid,p_combate uuid,p_actor text,p_version integer,p_datos jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare anterior jsonb; historial jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_combate::text,0));
 select datos into anterior from public.combates_yugen where id=p_combate for update;
 select coalesce(jsonb_agg(valor order by n),'[]'::jsonb) into historial from (
  select valor,n from jsonb_array_elements(coalesce(anterior->'historial','[]'::jsonb)||jsonb_build_array(anterior-'historial')) with ordinality a(valor,n) order by n desc limit 10
 ) ultimos;
 perform yugen_interno.confirmar_jugador(p_usuario,p_combate,p_actor,p_version,(p_datos-'historial')||jsonb_build_object('historial',historial));
 return yugen_interno.consultar_jugador_rapido(p_usuario,p_combate,p_actor,null);
end;$$;
create function public.jugador_confirmar_rapido_servidor(p_usuario uuid,p_combate uuid,p_actor text,p_version integer,p_datos jsonb) returns jsonb language sql security invoker set search_path='' as $$select yugen_interno.confirmar_jugador_rapido(p_usuario,p_combate,p_actor,p_version,p_datos)$$;
revoke all on function yugen_interno.consultar_jugador_rapido(uuid,uuid,text,integer),yugen_interno.confirmar_jugador_rapido(uuid,uuid,text,integer,jsonb),public.jugador_consultar_rapido_servidor(uuid,uuid,text,integer),public.jugador_confirmar_rapido_servidor(uuid,uuid,text,integer,jsonb) from public,anon,authenticated;
grant execute on function yugen_interno.consultar_jugador_rapido(uuid,uuid,text,integer),yugen_interno.confirmar_jugador_rapido(uuid,uuid,text,integer,jsonb),public.jugador_consultar_rapido_servidor(uuid,uuid,text,integer),public.jugador_confirmar_rapido_servidor(uuid,uuid,text,integer,jsonb) to service_role;

create function private.combate_consultar_revision(p_id uuid,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.combates_yugen%rowtype;
begin
 if not private.tienda_es_gm() then raise exception 'Solo el GM puede consultar el encuentro completo.' using errcode='42501';end if;
 select * into b from public.combates_yugen where id=p_id and creador_id=auth.uid();
 if not found then return null;end if;
 if b.version=p_version then return jsonb_build_object('sin_cambios',true,'version',b.version);end if;
 return jsonb_build_object('id',b.id,'version',b.version,'datos',b.datos);
end;$$;
create function public.combate_consultar_revision(p_id uuid,p_version integer) returns jsonb language sql security invoker set search_path='' as $$select private.combate_consultar_revision(p_id,p_version)$$;
revoke all on function private.combate_consultar_revision(uuid,integer),public.combate_consultar_revision(uuid,integer) from public,anon;
grant execute on function private.combate_consultar_revision(uuid,integer),public.combate_consultar_revision(uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;
