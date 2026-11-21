-- Títulos de cuenta.
-- Un título pertenece a la cuenta (titulos_obtenidos), no a un objeto del inventario.
-- Cada personaje de la cuenta puede activar UN título normal a la vez (personajes.titulo_activo).
-- Los títulos especiales no se equipan: su efecto se aplica a todos los personajes de la cuenta
-- desde el momento en que se desbloquean.
begin;

-- 1. Ajustes del título que decide el GM: especial y efecto narrativo (p. ej. ventaja en negociaciones).
create table public.titulos_ajustes(
 titulo_forja_id uuid primary key references public.forja_maestra(id) on delete cascade,
 especial boolean not null default false,
 efecto_narrativo text not null default '' check(length(efecto_narrativo)<=1000),
 updated_at timestamptz not null default now()
);
alter table public.titulos_ajustes enable row level security;
revoke all on public.titulos_ajustes from public,anon,authenticated;
grant select on public.titulos_ajustes to authenticated;
create policy titulos_ajustes_lectura on public.titulos_ajustes for select to authenticated using(true);
create trigger avisar_actualizacion after insert or update or delete on public.titulos_ajustes for each statement execute function private.avisar_actualizacion();

-- 2. La cuenta puede obtener títulos por logros o por otras vías (tienda, entrega del GM).
alter table public.titulos_obtenidos alter column logro_id drop not null;
alter table public.titulos_obtenidos add column origen text not null default 'logro' check(length(origen) between 1 and 200);

-- 3. Título activo por personaje.
alter table public.personajes add column titulo_activo uuid references public.forja_maestra(id) on delete set null;
create index personajes_titulo_activo_idx on public.personajes(titulo_activo);

create function private.titulo_equipable(p_usuario uuid,p_titulo text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(p_titulo,'')~'^[0-9a-fA-F-]{36}$' and exists(
  select 1 from public.titulos_obtenidos o join public.forja_maestra f on f.id=o.titulo_forja_id
  left join public.titulos_ajustes a on a.titulo_forja_id=f.id
  where o.user_id=p_usuario and o.titulo_forja_id::text=lower(p_titulo) and f.tipo_creacion='titulo' and f.estado='aprobado' and not coalesce(a.especial,false))
$$;

create function private.personaje_en_combate(p_personaje bigint) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.combates_yugen b where b.datos->>'fase'='en_curso' and exists(select 1 from jsonb_array_elements(b.datos->'miembros') m where m->>'personaje_id'=p_personaje::text))
$$;

create function private.titulo_activo_validar() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.titulo_activo is null then return new;end if;
 if tg_op='UPDATE' and new.titulo_activo is not distinct from old.titulo_activo and new.user_id is not distinct from old.user_id then return new;end if;
 if not private.titulo_equipable(new.user_id,new.titulo_activo::text) then raise exception 'Ese título no pertenece a la cuenta o es especial (los especiales no se equipan).';end if;
 if tg_op='UPDATE' and new.titulo_activo is distinct from old.titulo_activo and current_setting('yugen.equipo_interno',true) is distinct from new.id::text and private.personaje_en_combate(new.id) then
  raise exception 'En combate debes cambiar el título desde el equipo gastando una acción en tu turno.';
 end if;
 return new;
end;$$;
create trigger titulo_activo_validar before insert or update of titulo_activo,user_id on public.personajes for each row execute function private.titulo_activo_validar();

-- 4. Toda entrega de un título se registra en la cuenta en lugar de crear una copia en el inventario.
create function private.titulo_registrar(p_usuario uuid,p_titulo uuid,p_logro uuid,p_origen text) returns boolean language plpgsql security definer set search_path='' as $$
declare f public.forja_maestra%rowtype;nuevo boolean;
begin
 select * into f from public.forja_maestra where id=p_titulo and tipo_creacion='titulo';
 if not found then raise exception 'El título asociado no existe.';end if;
 insert into public.titulos_obtenidos(user_id,titulo_forja_id,logro_id,origen) values(p_usuario,p_titulo,p_logro,left(coalesce(nullif(btrim(p_origen),''),'entrega'),200))
 on conflict(user_id,titulo_forja_id) do nothing;
 get diagnostics nuevo=row_count;
 if nuevo then
  insert into public.eventos_dominio(clave,tipo,user_id,datos)
  select 'titulo:'||p_usuario||':'||p_titulo,'titulo_obtenido',p_usuario,jsonb_build_object('titulo',f.nombre,'titulo_forja_id',f.id,'imagen_url',f.imagen_url,'logro_id',p_logro,'especial',coalesce((select especial from public.titulos_ajustes where titulo_forja_id=f.id),false))
  where not exists(select 1 from public.eventos_dominio where combate_id is null and clave='titulo:'||p_usuario||':'||p_titulo);
 end if;
 return nuevo;
end;$$;

create function private.titulos_a_la_cuenta() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.forja_id is null or new.user_id is null then return new;end if;
 if not exists(select 1 from public.forja_maestra where id=new.forja_id and tipo_creacion='titulo') then return new;end if;
 perform private.titulo_registrar(new.user_id,new.forja_id,null,new.motivo_entrega);
 return null; -- el título vive en la cuenta, no en el inventario
end;$$;
create trigger a_titulos_a_la_cuenta before insert on public.inventario_jugador for each row execute function private.titulos_a_la_cuenta();

-- 5. Migrar copias antiguas: se conserva la propiedad y el título equipado de cada personaje.
insert into public.titulos_obtenidos(user_id,titulo_forja_id,logro_id,origen)
 select distinct on (i.user_id,i.forja_id) i.user_id,i.forja_id,null,coalesce(nullif(i.motivo_entrega,''),'inventario')
 from public.inventario_jugador i join public.forja_maestra f on f.id=i.forja_id and f.tipo_creacion='titulo'
 where i.user_id is not null order by i.user_id,i.forja_id,i.created_at
 on conflict(user_id,titulo_forja_id) do nothing;
alter table public.personajes disable trigger titulo_activo_validar;
update public.personajes p set titulo_activo=i.forja_id from public.inventario_jugador i join public.forja_maestra f on f.id=i.forja_id and f.tipo_creacion='titulo'
 where i.personaje_id=p.id and i.user_id=p.user_id and i.slot_equipado='titulo';
alter table public.personajes enable trigger titulo_activo_validar;
alter table public.inventario_jugador disable trigger inventario_proteger_equipo;
delete from public.inventario_jugador i using public.forja_maestra f where f.id=i.forja_id and f.tipo_creacion='titulo';
alter table public.inventario_jugador enable trigger inventario_proteger_equipo;
update public.progreso_logros set titulo_inventario_id=null where titulo_inventario_id is not null;

-- 6. Los logros conceden el título a la cuenta.
create or replace function private.logro_titulo_copia(p_usuario uuid,p_titulo uuid,p_logro uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_usuario::text||':'||p_titulo::text,2));
 if not exists(select 1 from public.forja_maestra where id=p_titulo and tipo_creacion='titulo' and estado='aprobado') then raise exception 'El título asociado ya no está aprobado.';end if;
 perform private.titulo_registrar(p_usuario,p_titulo,p_logro,'Título obtenido por logro');
 return null;
end;$$;
create or replace function private.logro_materializar_titulo() returns trigger language plpgsql security definer set search_path='' as $$
declare l public.logros_yugen%rowtype;
begin
 select * into l from public.logros_yugen where id=new.logro_id;
 new.titulo_forja_id:=l.titulo_forja_id;new.titulo:=l.titulo;new.logro_nombre:=l.nombre;new.imagen_url:=l.imagen_url;new.icono:=l.icono;new.titulo_inventario_id:=null;
 if new.desbloqueado and l.titulo_forja_id is not null then perform private.logro_titulo_copia(new.user_id,l.titulo_forja_id,l.id);end if;
 return new;
end;$$;
create or replace function private.logro_conceder(p_logro uuid,p_usuario uuid,p_personaje bigint,p_cantidad integer,p_completar boolean,p_motivo text,p_solicitud uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.logros_yugen%rowtype;p public.progreso_logros%rowtype;op public.logros_concesiones%rowtype;amb text;antes jsonb;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM puede conceder logros.' using errcode='42501';end if;
 if p_solicitud is null or p_cantidad is null or p_cantidad not between 1 and 1000000 or p_completar is null or length(btrim(coalesce(p_motivo,''))) not between 1 and 500 then raise exception 'Indica cantidad y motivo para registrar la entrega.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_solicitud::text,3));
 select * into op from public.logros_concesiones where solicitud_id=p_solicitud;
 if found then
 if op.logro_id<>p_logro or op.user_id<>p_usuario or op.personaje_id is distinct from p_personaje or op.cantidad<>p_cantidad or op.completar<>p_completar or op.motivo<>btrim(p_motivo) or op.autor<>auth.uid() then raise exception 'Esta solicitud corresponde a otra entrega.';end if;
 select * into p from public.progreso_logros where id=op.progreso_id;return to_jsonb(p);
 end if;
 select * into l from public.logros_yugen where id=p_logro for share;
 if not found or l.titulo_forja_id is null then raise exception 'Asocia primero un título de la Forja a este logro.';end if;
 if not exists(select 1 from public.perfiles where id=p_usuario and rol='REENCARNADO' and estado='aprobado') then raise exception 'Selecciona un jugador aprobado.';end if;
 if (l.alcance='personaje' and p_personaje is null) or (p_personaje is not null and not exists(select 1 from public.personajes where id=p_personaje and user_id=p_usuario)) then raise exception 'Selecciona un personaje del jugador.';end if;
 amb:=case l.alcance when 'personaje' then 'personaje:'||p_personaje when 'campana' then 'campana:'||l.campana else 'cuenta' end;
 insert into public.progreso_logros(logro_id,user_id,personaje_id,ambito,titulo,color,icono,descripcion) values(l.id,p_usuario,p_personaje,amb,l.titulo,l.color,l.icono,l.descripcion) on conflict do nothing;
 select * into p from public.progreso_logros where logro_id=l.id and user_id=p_usuario and ambito=amb for update;
 antes:=to_jsonb(p);
 update public.progreso_logros set cantidad=case when p_completar then l.meta else least(l.meta,cantidad+p_cantidad) end,desbloqueado=desbloqueado or p_completar or cantidad+p_cantidad>=l.meta,updated_at=now() where id=p.id returning * into p;
 -- Volver a completar un logro ya desbloqueado restituye el título si el GM lo había retirado.
 if p.desbloqueado then perform private.logro_titulo_copia(p_usuario,l.titulo_forja_id,l.id);end if;
 insert into public.logros_concesiones(solicitud_id,logro_id,user_id,personaje_id,cantidad,completar,motivo,autor,progreso_id) values(p_solicitud,l.id,p_usuario,p_personaje,p_cantidad,p_completar,btrim(p_motivo),auth.uid(),p.id);
 insert into public.logros_auditoria(progreso_id,autor,antes,despues,motivo,clave) values(p.id,auth.uid(),antes,to_jsonb(p),btrim(p_motivo),'manual:'||p_solicitud);
 return to_jsonb(p);
end;$$;
create or replace function private.logro_reclamar_titulo(p_progreso uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.progreso_logros%rowtype;
begin
 select * into p from public.progreso_logros where id=p_progreso and user_id=auth.uid() and desbloqueado for update;
 if not found or not exists(select 1 from public.perfiles where id=auth.uid() and estado='aprobado') then raise exception 'Este título no está desbloqueado en tu cuenta.';end if;
 if p.titulo_forja_id is null then raise exception 'El GM todavía no ha asociado un título a este logro.';end if;
 perform private.logro_titulo_copia(p.user_id,p.titulo_forja_id,p.logro_id);
 return p.titulo_forja_id;
end;$$;

-- 7. El jugador activa un título en cualquiera de sus personajes (uno a la vez por personaje).
create function private.titulo_activar(p_personaje bigint,p_titulo uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare pj public.personajes%rowtype;
begin
 if auth.uid() is null then raise exception 'Inicia sesión.' using errcode='42501';end if;
 select * into pj from public.personajes where id=p_personaje for update;
 if not found or (pj.user_id is distinct from auth.uid() and not private.tienda_es_gm()) then raise exception 'Este personaje no te pertenece.';end if;
 if private.personaje_en_combate(pj.id) then raise exception 'En combate debes cambiar el título desde el equipo gastando una acción en tu turno.';end if;
 if p_titulo is not null and not private.titulo_equipable(pj.user_id,p_titulo::text) then raise exception 'Ese título no pertenece a la cuenta o es especial (los especiales ya están siempre activos).';end if;
 update public.personajes set titulo_activo=p_titulo where id=pj.id;
 return jsonb_build_object('personaje_id',pj.id,'titulo_activo',p_titulo);
end;$$;
create function public.titulo_activar(p_personaje bigint,p_titulo uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.titulo_activar(p_personaje,p_titulo)$$;

-- 8. El GM define si un título es especial y su efecto narrativo.
create function private.titulo_ajustar(p_titulo uuid,p_especial boolean,p_efecto text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM puede configurar títulos.' using errcode='42501';end if;
 if not exists(select 1 from public.forja_maestra where id=p_titulo and tipo_creacion='titulo') then raise exception 'Selecciona un título de la Forja.';end if;
 if length(coalesce(p_efecto,''))>1000 then raise exception 'El efecto narrativo admite hasta 1000 caracteres.';end if;
 insert into public.titulos_ajustes(titulo_forja_id,especial,efecto_narrativo) values(p_titulo,coalesce(p_especial,false),btrim(coalesce(p_efecto,'')))
 on conflict(titulo_forja_id) do update set especial=excluded.especial,efecto_narrativo=excluded.efecto_narrativo,updated_at=now();
 -- Un título que pasa a ser especial deja de ocupar el espacio de título de los personajes.
 if coalesce(p_especial,false) then
  update public.personajes set titulo_activo=null where titulo_activo=p_titulo and not private.personaje_en_combate(id);
 end if;
end;$$;
create function public.titulo_ajustar(p_titulo uuid,p_especial boolean default false,p_efecto text default '') returns void language sql security invoker set search_path='' as $$select private.titulo_ajustar(p_titulo,p_especial,p_efecto)$$;

-- 9. El GM puede retirar un título de una cuenta (queda auditado en el progreso del logro).
create function private.titulo_retirar(p_usuario uuid,p_titulo uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM puede retirar títulos.' using errcode='42501';end if;
 if exists(select 1 from public.personajes where user_id=p_usuario and titulo_activo=p_titulo and private.personaje_en_combate(id)) then raise exception 'Un personaje lo lleva en un combate activo.';end if;
 update public.personajes set titulo_activo=null where user_id=p_usuario and titulo_activo=p_titulo;
 delete from public.titulos_obtenidos where user_id=p_usuario and titulo_forja_id=p_titulo;
end;$$;
create function public.titulo_retirar(p_usuario uuid,p_titulo uuid) returns void language sql security invoker set search_path='' as $$select private.titulo_retirar(p_usuario,p_titulo)$$;

-- 10. El combate y el equipamiento leen los títulos desde la cuenta.
do $patch$
declare d text;marca text;
begin
 select pg_get_functiondef('yugen_interno.preparar_jugador(bigint)'::regprocedure) into d;
 marca:=' for a in select * from jsonb_each(bonos) loop s:=s||';
 if position(marca in d)=0 then raise exception 'preparar_jugador inesperado: falta el bucle de bonos';end if;
 d:=replace(d,marca,$blk$ declare tit record;tp jsonb;begin
 for tit in select f.*,coalesce(aj.especial,false) es_especial from public.titulos_obtenidos o join public.forja_maestra f on f.id=o.titulo_forja_id left join public.titulos_ajustes aj on aj.titulo_forja_id=f.id
  where o.user_id=p.user_id and f.tipo_creacion='titulo' and f.estado='aprobado' order by f.nombre,f.id loop
  tp:=jsonb_build_object('requisitos_uso',coalesce(tit.requisitos_uso,'{}'),'forja_id',tit.id,'id',tit.id,'nombre',tit.nombre,'stats',public.forja_stats_componente(tit.id),'efectos',coalesce(tit.configuracion_dados,'[]'),'slot_tipo','titulo','tipo_creacion','titulo','descripcion',tit.descripcion,'imagen_url',tit.imagen_url,'consumible',false,'reglas',coalesce(tit.reglas,'[]'),'reglas_pasivas',coalesce(tit.reglas_pasivas,'[]'),'titulo_cuenta',true);
  if tit.es_especial then
   pasivas:=pasivas||jsonb_build_array(jsonb_build_object('id','titulo:'||tit.id,'forja_id',tit.id,'nombre','Título especial: '||tit.nombre,'reglas_motor',coalesce(tit.reglas,'[]'),'reglas',coalesce(tit.reglas_pasivas,'[]')));
   for a in select * from jsonb_each(tp->'stats') loop
    if jsonb_typeof(a.value)='number' and a.key not in ('peso','durabilidad','dados_dano','caras_dano','dano') then s:=s||jsonb_build_object(a.key,coalesce((s->>a.key)::numeric,0)+(a.value::text)::numeric);end if;
   end loop;
  else
   reserva:=reserva||jsonb_build_array(tp);
   if tit.id=p.titulo_activo and not equipo ? 'titulo' then
    equipo:=equipo||jsonb_build_object('titulo',tp);
    for a in select * from jsonb_each(tp->'stats') loop
     if jsonb_typeof(a.value)='number' and a.key not in ('peso','durabilidad','dados_dano','caras_dano','dano') then bonos:=bonos||jsonb_build_object(a.key,coalesce((bonos->>a.key)::numeric,0)+(a.value::text)::numeric);end if;
    end loop;
   end if;
  end if;
 end loop;end;
$blk$||marca);
 execute d;

 select pg_get_functiondef('yugen_interno.aplicar_equipo(bigint,jsonb)'::regprocedure) into d;
 marca:='  select * into i from public.inventario_jugador where id::text=par.value and personaje_id=p.id and user_id=p.user_id for update;';
 if position(marca in d)=0 then raise exception 'aplicar_equipo inesperado: falta la validación de piezas';end if;
 d:=replace(d,marca,'  if par.key=''titulo'' and private.titulo_equipable(p.user_id,par.value) then continue;end if;'||chr(10)||marca);
 marca:=' update public.inventario_jugador set slot_equipado=null where personaje_id=p.id';
 if position(marca in d)=0 then raise exception 'aplicar_equipo inesperado: falta la limpieza de espacios';end if;
 d:=replace(d,marca,' update public.personajes set titulo_activo=case when private.titulo_equipable(p.user_id,p_equipo->>''titulo'') then (p_equipo->>''titulo'')::uuid end where id=p.id and titulo_activo is distinct from case when private.titulo_equipable(p.user_id,p_equipo->>''titulo'') then (p_equipo->>''titulo'')::uuid end;'||chr(10)||marca);
 execute d;
end;$patch$;

revoke all on function private.titulo_equipable(uuid,text),private.personaje_en_combate(bigint),private.titulo_activo_validar(),private.titulo_registrar(uuid,uuid,uuid,text),private.titulos_a_la_cuenta() from public,anon,authenticated;
revoke all on function private.titulo_activar(bigint,uuid),public.titulo_activar(bigint,uuid),private.titulo_ajustar(uuid,boolean,text),public.titulo_ajustar(uuid,boolean,text),private.titulo_retirar(uuid,uuid),public.titulo_retirar(uuid,uuid) from public,anon;
grant execute on function private.titulo_activar(bigint,uuid),public.titulo_activar(bigint,uuid),private.titulo_ajustar(uuid,boolean,text),public.titulo_ajustar(uuid,boolean,text),private.titulo_retirar(uuid,uuid),public.titulo_retirar(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
