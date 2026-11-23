-- Herencia de habilidades por linaje y por clan.
-- * Clan: grupo narrativo al que el GM asigna personajes de cualquier raza (clanes, clan_miembros).
-- * Linaje: una raza o subraza de la Forja (requisito «razas», que ya incluye las subrazas del linaje).
-- * Una habilidad o pasiva con requisitos_uso.herencia=true se entrega sola a todo personaje vivo y aprobado
--   que cumpla su linaje y/o pertenezca a alguno de sus clanes, y se retira sola cuando deja de cumplirlo.
begin;
create table public.clanes(
 id uuid primary key default gen_random_uuid(),
 nombre text not null check(length(btrim(nombre)) between 1 and 80),
 descripcion text not null default '' check(length(descripcion)<=4000),
 color text not null default '#c0263a' check(color ~ '^#[0-9a-fA-F]{6}$'),
 imagen_url text not null default '' check(length(imagen_url)<=2048 and (imagen_url='' or imagen_url ~ '^(https?://|/[^/])')),
 created_at timestamptz not null default now()
);
create unique index clanes_nombre_idx on public.clanes(lower(btrim(nombre)));
create table public.clan_miembros(
 clan_id uuid not null references public.clanes(id) on delete cascade,
 personaje_id bigint not null references public.personajes(id) on delete cascade,
 desde timestamptz not null default now(),
 primary key(clan_id,personaje_id)
);
create index clan_miembros_personaje_idx on public.clan_miembros(personaje_id);
alter table public.clanes enable row level security;
alter table public.clan_miembros enable row level security;
revoke all on public.clanes,public.clan_miembros from public,anon,authenticated;
grant select on public.clanes,public.clan_miembros to authenticated;
grant insert,update,delete on public.clanes,public.clan_miembros to authenticated;
create policy clanes_lectura on public.clanes for select to authenticated using(true);
create policy clanes_gm on public.clanes for all to authenticated using((select private.tienda_es_gm())) with check((select private.tienda_es_gm()));
create policy clan_miembros_lectura on public.clan_miembros for select to authenticated using((select private.tienda_es_gm()) or exists(select 1 from public.personajes p where p.id=personaje_id and p.user_id=(select auth.uid())));
create policy clan_miembros_gm on public.clan_miembros for all to authenticated using((select private.tienda_es_gm())) with check((select private.tienda_es_gm()));
create trigger avisar_actualizacion after insert or update or delete on public.clanes for each statement execute function private.avisar_actualizacion();
create trigger avisar_actualizacion after insert or update or delete on public.clan_miembros for each statement execute function private.avisar_actualizacion();

-- Requisitos nuevos: clanes (cualquiera de la lista) y herencia (entrega automática).
do $patch$
declare d text;marca text:=' if r ? ''minimos'' then';
begin
 select pg_get_functiondef('public.forja_validar_requisitos(jsonb)'::regprocedure) into d;
 if position(marca in d)=0 then raise exception 'forja_validar_requisitos inesperado';end if;
 d:=replace(d,marca,$blk$ if r ? 'clanes' then
  if jsonb_typeof(r->'clanes') is distinct from 'array' or jsonb_array_length(r->'clanes')>20 then raise exception 'Selecciona hasta 20 clanes.';end if;
  for v in select value from jsonb_array_elements(r->'clanes') loop
   if jsonb_typeof(v) is distinct from 'string' or (v#>>'{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Clan inválido.';end if;
  end loop;
 end if;
 if r ? 'herencia' and jsonb_typeof(r->'herencia') is distinct from 'boolean' then raise exception 'Herencia inválida.';end if;
 if r->>'herencia'='true' and jsonb_array_length(coalesce(r->'razas','[]'))=0 and jsonb_array_length(coalesce(r->'clanes','[]'))=0 then raise exception 'Para heredarla, elige al menos un linaje (raza) o un clan.';end if;
$blk$||marca);
 execute d;
end;$patch$;

create function private.herencia_cumple(r jsonb,p_personaje bigint) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(r->>'herencia','false')='true'
  and (jsonb_array_length(coalesce(r->'razas','[]'))>0 or jsonb_array_length(coalesce(r->'clanes','[]'))>0)
  and exists(select 1 from public.personajes p where p.id=p_personaje and public.forja_cumple_requisitos(r,p.raza,coalesce(p.atributos,'{}')||jsonb_build_object('nivel',p.nivel)))
  and (jsonb_array_length(coalesce(r->'clanes','[]'))=0 or exists(select 1 from public.clan_miembros m where m.personaje_id=p_personaje and r->'clanes' ? m.clan_id::text))
$$;

create function private.herencia_sincronizar(p_personaje bigint) returns void language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;f public.forja_maestra%rowtype;i record;origen text;
begin
 select * into p from public.personajes where id=p_personaje for update;
 if not found or p.estado_vida is distinct from 'vivo' then return;end if;
 -- Retira lo heredado que ya no corresponde (salió del clan, cambió de linaje o el GM quitó la herencia).
 for i in select j.id,j.forja_id from public.inventario_jugador j where j.personaje_id=p.id and j.configuracion->>'heredada'='true' loop
  if p.estado_aprobacion is distinct from 'aprobado' or not exists(select 1 from public.forja_maestra x where x.id=i.forja_id and x.estado='aprobado' and private.herencia_cumple(x.requisitos_uso,p.id)) then
   delete from public.inventario_jugador where id=i.id;
  end if;
 end loop;
 if p.estado_aprobacion is distinct from 'aprobado' then return;end if;
 for f in select x.* from public.forja_maestra x where x.tipo_creacion in ('habilidad','pasiva') and x.estado='aprobado' and x.requisitos_uso->>'herencia'='true'
  and private.herencia_cumple(x.requisitos_uso,p.id) and not exists(select 1 from public.inventario_jugador j where j.personaje_id=p.id and j.forja_id=x.id) loop
  origen:=coalesce((select 'Herencia del clan '||string_agg(c.nombre,', ') from public.clanes c join public.clan_miembros m on m.clan_id=c.id and m.personaje_id=p.id where f.requisitos_uso->'clanes' ? c.id::text),'Herencia del linaje');
  insert into public.inventario_jugador(user_id,forja_id,personaje_id,nombre,tipo,descripcion,imagen_url,clase,stats,ligado_al_alma,es_activo,slot_tipo,motivo_entrega,configuracion)
  values(p.user_id,f.id,p.id,f.nombre,f.tipo,f.descripcion,f.imagen_url,f.clase,f.stats,false,true,'ninguno',origen,
   jsonb_build_object('tipo_creacion',f.tipo_creacion,'efectos',f.configuracion_dados,'reglas',f.reglas,'reglas_pasivas',f.reglas_pasivas,'requisitos_uso',f.requisitos_uso,'heredada',true));
 end loop;
end;$$;

create function private.herencia_por_miembro() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.herencia_sincronizar(case when tg_op='DELETE' then old.personaje_id else new.personaje_id end);
 return null;
end;$$;
create trigger herencia_por_miembro after insert or delete on public.clan_miembros for each row execute function private.herencia_por_miembro();

create function private.herencia_por_personaje() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.raza is not distinct from old.raza and new.nivel is not distinct from old.nivel and new.estado_vida is not distinct from old.estado_vida
  and new.estado_aprobacion is not distinct from old.estado_aprobacion and new.atributos is not distinct from old.atributos and new.user_id is not distinct from old.user_id then return null;end if;
 perform private.herencia_sincronizar(new.id);
 return null;
end;$$;
create trigger zz_herencia_por_personaje after insert or update of raza,nivel,estado_vida,estado_aprobacion,atributos,user_id on public.personajes for each row execute function private.herencia_por_personaje();

create function private.herencia_por_plantilla() returns trigger language plpgsql security definer set search_path='' as $$
declare pj bigint;
begin
 if coalesce(new.requisitos_uso->>'herencia','false')<>'true' and (tg_op='INSERT' or coalesce(old.requisitos_uso->>'herencia','false')<>'true') then return null;end if;
 if tg_op='UPDATE' and new.requisitos_uso is not distinct from old.requisitos_uso and new.estado is not distinct from old.estado then return null;end if;
 for pj in select id from public.personajes where estado_vida='vivo' and estado_aprobacion='aprobado' order by id loop
  perform private.herencia_sincronizar(pj);
 end loop;
 return null;
end;$$;
create trigger zz_herencia_por_plantilla after insert or update of requisitos_uso,estado on public.forja_maestra for each row execute function private.herencia_por_plantilla();

-- El GM puede forzar la sincronización (p. ej. tras importar personajes).
create function private.herencia_recalcular() returns integer language plpgsql security definer set search_path='' as $$
declare pj bigint;n integer:=0;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM puede recalcular la herencia.' using errcode='42501';end if;
 for pj in select id from public.personajes where estado_vida='vivo' order by id loop perform private.herencia_sincronizar(pj);n:=n+1;end loop;
 return n;
end;$$;
create function public.herencia_recalcular() returns integer language sql security invoker set search_path='' as $$select private.herencia_recalcular()$$;

revoke all on function private.herencia_cumple(jsonb,bigint),private.herencia_sincronizar(bigint),private.herencia_por_miembro(),private.herencia_por_personaje(),private.herencia_por_plantilla() from public,anon,authenticated;
revoke all on function private.herencia_recalcular(),public.herencia_recalcular() from public,anon;
grant execute on function private.herencia_recalcular(),public.herencia_recalcular() to authenticated;
notify pgrst,'reload schema';
commit;
