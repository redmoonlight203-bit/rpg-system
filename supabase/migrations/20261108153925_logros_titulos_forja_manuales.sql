begin;
alter table public.logros_yugen
 add column titulo_forja_id uuid references public.forja_maestra(id) on delete restrict,
 add column imagen_url text not null default '',
 add column criterio text not null default '',
 add column condiciones jsonb not null default '{}';
alter table public.logros_yugen drop constraint logros_yugen_evento_check;
alter table public.logros_yugen add constraint logros_yugen_evento_check check(evento in ('manual','enemigo_derrotado','encuentro_finalizado','sobrevivir_encuentro','nivel_alcanzado','objeto_adjudicado'));
create index logros_titulo_forja_idx on public.logros_yugen(titulo_forja_id);
alter table public.progreso_logros add column titulo_forja_id uuid references public.forja_maestra(id) on delete restrict,add column titulo_inventario_id uuid references public.inventario_jugador(id) on delete set null,add column imagen_url text not null default '',add column logro_nombre text not null default '';
create index progreso_titulo_forja_idx on public.progreso_logros(titulo_forja_id);
create index progreso_titulo_inventario_idx on public.progreso_logros(titulo_inventario_id);
-- Vincular nombres anteriores únicamente cuando existe un título inequívoco; nunca inventar creaciones.
update public.logros_yugen l set titulo_forja_id=(select min(f.id::text)::uuid from public.forja_maestra f where f.tipo_creacion='titulo' and f.estado='aprobado' and lower(btrim(f.nombre))=lower(btrim(l.titulo)))
 where (select count(*) from public.forja_maestra f where f.tipo_creacion='titulo' and f.estado='aprobado' and lower(btrim(f.nombre))=lower(btrim(l.titulo)))=1;
update public.progreso_logros p set titulo_forja_id=l.titulo_forja_id,logro_nombre=l.nombre from public.logros_yugen l where l.id=p.logro_id;

create table public.titulos_obtenidos(
 user_id uuid not null references public.perfiles(id),titulo_forja_id uuid not null references public.forja_maestra(id) on delete restrict,
 inventario_id uuid references public.inventario_jugador(id) on delete set null,logro_id uuid not null references public.logros_yugen(id),created_at timestamptz not null default now(),primary key(user_id,titulo_forja_id)
);
create index titulos_obtenidos_forja_idx on public.titulos_obtenidos(titulo_forja_id);
create index titulos_obtenidos_inventario_idx on public.titulos_obtenidos(inventario_id);
create index titulos_obtenidos_logro_idx on public.titulos_obtenidos(logro_id);
create table public.logros_concesiones(
 solicitud_id uuid primary key,logro_id uuid not null references public.logros_yugen(id),user_id uuid not null references public.perfiles(id),personaje_id bigint references public.personajes(id),
 cantidad integer not null,completar boolean not null,motivo text not null,autor uuid not null references public.perfiles(id),progreso_id uuid references public.progreso_logros(id),created_at timestamptz not null default now()
);
create index concesiones_logro_idx on public.logros_concesiones(logro_id);
create index concesiones_usuario_idx on public.logros_concesiones(user_id);
create index concesiones_personaje_idx on public.logros_concesiones(personaje_id);
create index concesiones_autor_idx on public.logros_concesiones(autor);
create index concesiones_progreso_idx on public.logros_concesiones(progreso_id);
alter table public.titulos_obtenidos enable row level security;
alter table public.logros_concesiones enable row level security;
revoke all on public.titulos_obtenidos,public.logros_concesiones from public,anon,authenticated;
grant select on public.titulos_obtenidos,public.logros_concesiones to authenticated;
create policy titulos_obtenidos_lectura on public.titulos_obtenidos for select to authenticated using(user_id=(select auth.uid()) or (select private.tienda_es_gm()));
create policy concesiones_lectura on public.logros_concesiones for select to authenticated using(user_id=(select auth.uid()) or (select private.tienda_es_gm()));
create trigger avisar_actualizacion after insert or update or delete on public.titulos_obtenidos for each statement execute function private.avisar_actualizacion();
create trigger avisar_actualizacion after insert or update or delete on public.logros_concesiones for each statement execute function private.avisar_actualizacion();

create function private.logro_validar() returns trigger language plpgsql security definer set search_path='' as $$
declare f public.forja_maestra%rowtype;c record;
begin
 if new.titulo_forja_id is null then raise exception 'Asocia el logro a un título existente de la Forja.';end if;
 select * into f from public.forja_maestra where id=new.titulo_forja_id and tipo_creacion='titulo' and estado='aprobado';
 if not found then raise exception 'Selecciona un título aprobado de la Forja.';end if;
 new.titulo:=f.nombre;
 if length(new.descripcion)>10000 or length(new.criterio)>5000 or length(new.icono)>100 then raise exception 'Descripción o icono demasiado largo.';end if;
 if length(new.imagen_url)>450000 or (new.imagen_url<>'' and not (new.imagen_url~'^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$' or (length(new.imagen_url)<=4096 and new.imagen_url~'^(https?://|/[^/])'))) then raise exception 'Sube una imagen PNG, JPG o WebP, o usa una URL válida.';end if;
 if jsonb_typeof(new.condiciones) is distinct from 'object' then raise exception 'Condiciones inválidas.';end if;
 for c in select * from jsonb_each(new.condiciones) loop
 if c.key in ('nivel_minimo','enemigo_nivel_minimo') then
 if jsonb_typeof(c.value)<>'number' or (c.value::text)::numeric<>trunc((c.value::text)::numeric) or (c.value::text)::numeric not between 1 and 100 then raise exception 'El nivel debe estar entre 1 y 100.';end if;
 elsif c.key='rondas_maximas' then
 if jsonb_typeof(c.value)<>'number' or (c.value::text)::numeric<>trunc((c.value::text)::numeric) or (c.value::text)::numeric not between 1 and 1000 then raise exception 'Indica de 1 a 1000 rondas.';end if;
 elsif c.key='sin_caer' then
 if jsonb_typeof(c.value)<>'boolean' then raise exception 'Selecciona si se exige no caer.';end if;
 elsif c.key='objeto_id' then
 if not exists(select 1 from public.forja_maestra where id=(c.value#>>'{}')::uuid and tipo_creacion='objeto' and estado='aprobado') then raise exception 'Selecciona un objeto aprobado.';end if;
 else raise exception 'Condición de logro desconocida: %',c.key;
 end if;
 end loop;
 if new.objetivo is not null and not exists(select 1 from public.forja_maestra where id=new.objetivo and tipo_creacion='personaje' and estado='aprobado') then raise exception 'Selecciona un enemigo aprobado.';end if;
 return new;
end;$$;
create trigger logro_validar before insert or update on public.logros_yugen for each row execute function private.logro_validar();

-- Un título ganado es una copia real de la Forja; se guarda en la cuenta y se equipa con las reglas habituales.
create function private.logro_titulo_copia(p_usuario uuid,p_titulo uuid,p_logro uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare f public.forja_maestra%rowtype;item uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_usuario::text||':'||p_titulo::text,2));
 select inventario_id into item from public.titulos_obtenidos where user_id=p_usuario and titulo_forja_id=p_titulo;
 if found then return item;end if;
 select * into f from public.forja_maestra where id=p_titulo and tipo_creacion='titulo' and estado='aprobado' for share;
 if not found then raise exception 'El título asociado ya no está aprobado.';end if;
 select id into item from public.inventario_jugador where user_id=p_usuario and forja_id=p_titulo and ligado_al_alma order by id limit 1;
 if item is null then
 insert into public.inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,descripcion,imagen_url,clase,stats,ligado_al_alma,slot_tipo,es_activo,motivo_entrega,configuracion)
 values(p_usuario,null,f.id,f.nombre,f.tipo,f.descripcion,f.imagen_url,f.clase,public.forja_stats_componente(f.id),true,'titulo',false,'Título obtenido por logro',public.forja_snapshot_config(f.id)) returning id into item;
 insert into public.eventos_dominio(clave,tipo,user_id,datos) values('titulo:'||item,'titulo_obtenido',p_usuario,jsonb_build_object('titulo',f.nombre,'inventario_id',item,'logro_id',p_logro));
 end if;
 insert into public.titulos_obtenidos(user_id,titulo_forja_id,inventario_id,logro_id) values(p_usuario,p_titulo,item,p_logro)
 on conflict(user_id,titulo_forja_id) do update set inventario_id=excluded.inventario_id;
 return item;
end;$$;
create function private.logro_materializar_titulo() returns trigger language plpgsql security definer set search_path='' as $$
declare l public.logros_yugen%rowtype;
begin
 select * into l from public.logros_yugen where id=new.logro_id;
 new.titulo_forja_id:=l.titulo_forja_id;new.titulo:=l.titulo;new.logro_nombre:=l.nombre;new.imagen_url:=l.imagen_url;new.icono:=l.icono;
 if new.desbloqueado and l.titulo_forja_id is not null and (new.titulo_inventario_id is null or (tg_op='UPDATE' and old.titulo_forja_id is distinct from l.titulo_forja_id)) then
 new.titulo_inventario_id:=private.logro_titulo_copia(new.user_id,l.titulo_forja_id,l.id);
 end if;
 return new;
end;$$;
create trigger logro_materializar_titulo before insert or update of desbloqueado,titulo_forja_id,cantidad on public.progreso_logros for each row execute function private.logro_materializar_titulo();
create function private.logro_sincronizar_titulo() returns trigger language plpgsql security definer set search_path='' as $$begin
 update public.progreso_logros set titulo_forja_id=new.titulo_forja_id,titulo=new.titulo,logro_nombre=new.nombre,imagen_url=new.imagen_url,icono=new.icono where logro_id=new.id;
 return new;
end;$$;
create trigger logro_sincronizar_titulo after update of titulo_forja_id,imagen_url,icono,nombre on public.logros_yugen for each row execute function private.logro_sincronizar_titulo();

create function private.logro_conceder(p_logro uuid,p_usuario uuid,p_personaje bigint,p_cantidad integer,p_completar boolean,p_motivo text,p_solicitud uuid) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if p_completar and exists(select 1 from public.titulos_obtenidos where user_id=p_usuario and titulo_forja_id=l.titulo_forja_id and inventario_id is null) then delete from public.titulos_obtenidos where user_id=p_usuario and titulo_forja_id=l.titulo_forja_id and inventario_id is null;end if;
 update public.progreso_logros set cantidad=case when p_completar then l.meta else least(l.meta,cantidad+p_cantidad) end,desbloqueado=desbloqueado or p_completar or cantidad+p_cantidad>=l.meta,updated_at=now() where id=p.id returning * into p;
 insert into public.logros_concesiones(solicitud_id,logro_id,user_id,personaje_id,cantidad,completar,motivo,autor,progreso_id) values(p_solicitud,l.id,p_usuario,p_personaje,p_cantidad,p_completar,btrim(p_motivo),auth.uid(),p.id);
 insert into public.logros_auditoria(progreso_id,autor,antes,despues,motivo,clave) values(p.id,auth.uid(),antes,to_jsonb(p),btrim(p_motivo),'manual:'||p_solicitud);
 return to_jsonb(p);
end;$$;
create function public.logro_conceder(p_logro uuid,p_usuario uuid,p_personaje bigint default null,p_cantidad integer default 1,p_completar boolean default true,p_motivo text default '',p_solicitud uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.logro_conceder(p_logro,p_usuario,p_personaje,p_cantidad,p_completar,p_motivo,p_solicitud)$$;
create function private.logro_reclamar_titulo(p_progreso uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.progreso_logros%rowtype;
begin
 select * into p from public.progreso_logros where id=p_progreso and user_id=auth.uid() and desbloqueado for update;
 if not found or not exists(select 1 from public.perfiles where id=auth.uid() and estado='aprobado') then raise exception 'Este título no está desbloqueado en tu cuenta.';end if;
 update public.progreso_logros set titulo_forja_id=titulo_forja_id where id=p.id returning * into p;
 if p.titulo_inventario_id is null then raise exception 'El título no está disponible: el GM debe asociarlo o volver a concederlo si lo retiró.';end if;
 return p.titulo_inventario_id;
end;$$;
create function public.logro_reclamar_titulo(p_progreso uuid) returns uuid language sql security invoker set search_path='' as $$select private.logro_reclamar_titulo(p_progreso)$$;

create or replace function private.logros_evento() returns trigger language plpgsql security definer set search_path='' as $$
declare l public.logros_yugen%rowtype;p public.progreso_logros%rowtype;antes jsonb;amb text;clave_evento text;incremento int;combate jsonb;actor jsonb;nivel int;
begin
 if new.user_id is null or new.personaje_id is null then return new;end if;
 select datos into combate from public.resultados_encuentro where combate_id=new.combate_id;
 if combate->'politica'->>'modo'='entrenamiento' then return new;end if;
 select pj.nivel into nivel from public.personajes pj where pj.id=new.personaje_id;
 select value into actor from jsonb_array_elements(coalesce(combate->'miembros','[]')) where value->>'personaje_id'=new.personaje_id::text limit 1;
 for l in select * from public.logros_yugen where activo and evento<>'manual' order by id loop
 if l.alcance='campana' and l.campana<>coalesce(combate->'politica'->>'campana','ambrosia') then continue;end if;
 if coalesce(nivel,1)<coalesce((l.condiciones->>'nivel_minimo')::int,1) then continue;end if;
 if l.condiciones ? 'rondas_maximas' and (combate is null or (combate->>'ronda')::int>(l.condiciones->>'rondas_maximas')::int) then continue;end if;
 if coalesce((l.condiciones->>'sin_caer')::boolean,false) and (actor is null or (actor->>'vida')::numeric<=0 or exists(select 1 from jsonb_array_elements(coalesce(combate->'eventos','[]')) e where e->>'tipo'='enemigo_derrotado' and e->>'objetivo'=actor->>'id')) then continue;end if;
 incremento:=0;
 if new.tipo='experiencia_otorgada' and new.combate_id is not null then
 if l.evento='encuentro_finalizado' then incremento:=1;
 elsif l.evento='sobrevivir_encuentro' and (actor->>'vida')::numeric>0 then incremento:=1;
 elsif l.evento='enemigo_derrotado' then
 select count(*) into incremento from jsonb_array_elements(combate->'miembros') m where (m->>'vida')::numeric<=0 and not m ? 'invocacion' and not coalesce((m->>'neutral')::boolean,false) and m->>'bando'<>combate->'cierre'->>'ganador' and (l.objetivo is null or m->>'forja_id'=l.objetivo::text) and coalesce((m->>'nivel')::int,1)>=coalesce((l.condiciones->>'enemigo_nivel_minimo')::int,1);
 end if;
 elsif new.tipo=l.evento then
 if new.tipo='nivel_alcanzado' then incremento:=greatest(1,coalesce((new.datos->>'nivel')::int-(new.datos->>'nivel_anterior')::int,1));
 elsif new.tipo='objeto_adjudicado' and l.condiciones ? 'objeto_id' then
 select coalesce(sum((e->>'cantidad')::int),0)::int into incremento from jsonb_array_elements(coalesce(new.datos->'botin','[]')) e where e->>'forja_id'=l.condiciones->>'objeto_id';
 else incremento:=1;end if;
 end if;
 if incremento=0 then continue;end if;
 amb:=case l.alcance when 'personaje' then 'personaje:'||new.personaje_id when 'campana' then 'campana:'||l.campana else 'cuenta' end;
 insert into public.progreso_logros(logro_id,user_id,personaje_id,ambito,titulo,color,icono,descripcion) values(l.id,new.user_id,new.personaje_id,amb,l.titulo,l.color,l.icono,l.descripcion) on conflict do nothing;
 select * into p from public.progreso_logros where logro_id=l.id and user_id=new.user_id and ambito=amb for update;
 clave_evento:=case when new.tipo='experiencia_otorgada' and l.alcance<>'personaje' then new.combate_id::text||':'||l.evento else new.id::text end;
 if p.desbloqueado or exists(select 1 from public.logros_auditoria where progreso_id=p.id and clave=clave_evento) then continue;end if;
 antes:=to_jsonb(p);
 update public.progreso_logros set cantidad=least(l.meta,cantidad+incremento),desbloqueado=cantidad+incremento>=l.meta,updated_at=now() where id=p.id returning * into p;
 insert into public.logros_auditoria(progreso_id,evento_id,antes,despues,motivo,clave) values(p.id,new.id,antes,to_jsonb(p),new.tipo,clave_evento);
 end loop;return new;
end;$$;
revoke all on function private.logro_validar(),private.logro_titulo_copia(uuid,uuid,uuid),private.logro_materializar_titulo(),private.logro_sincronizar_titulo(),private.logros_evento() from public,anon,authenticated;
revoke all on function private.logro_conceder(uuid,uuid,bigint,int,boolean,text,uuid),public.logro_conceder(uuid,uuid,bigint,int,boolean,text,uuid),private.logro_reclamar_titulo(uuid),public.logro_reclamar_titulo(uuid) from public,anon;
grant execute on function private.logro_conceder(uuid,uuid,bigint,int,boolean,text,uuid),public.logro_conceder(uuid,uuid,bigint,int,boolean,text,uuid),private.logro_reclamar_titulo(uuid),public.logro_reclamar_titulo(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
