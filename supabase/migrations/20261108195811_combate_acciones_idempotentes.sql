begin;
-- Recibos mínimos y privados. El mismo action_id identifica un comando, nunca una nueva tirada.
create table private.combate_acciones (
 combate_id uuid not null,action_id uuid not null,usuario uuid not null,actor text not null,
 firma text not null,version_base integer not null,version_resultado integer not null,
 resultado jsonb not null,evento jsonb,sql_ms numeric not null,creado_at timestamptz not null default now(),
 primary key(combate_id,action_id)
);
alter table private.combate_acciones enable row level security;
revoke all on private.combate_acciones from public,anon,authenticated;
create index combate_acciones_creado_idx on private.combate_acciones(creado_at);

create function private.combate_recibo(p_usuario uuid,p_combate uuid,p_actor text,p_action_id uuid,p_comando jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare a private.combate_acciones%rowtype;
begin
 select * into a from private.combate_acciones where combate_id=p_combate and action_id=p_action_id;
 if not found then return jsonb_build_object('confirmada',false,'action_id',p_action_id);end if;
 if a.usuario<>p_usuario or a.actor<>p_actor then raise exception 'La acción pertenece a otro participante.' using errcode='42501';end if;
 if p_comando is not null and a.firma<>md5(p_comando::text) then raise exception 'No reutilices action_id para un comando diferente.' using errcode='22023';end if;
 return a.resultado||jsonb_build_object('confirmada',true,'action_id',a.action_id,'version_aplicada',a.version_resultado,'repetida',true,'evento',a.evento);
end;$$;
revoke all on function private.combate_recibo(uuid,uuid,text,uuid,jsonb) from public,anon,authenticated;

create function public.combate_accion_estado(p_id uuid,p_action_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM puede consultar esta acción.' using errcode='42501';end if;
 if exists(select 1 from public.combates_yugen where id=p_id and creador_id<>auth.uid()) then raise exception 'Este combate pertenece a otro director.' using errcode='42501';end if;
 return private.combate_recibo(auth.uid(),p_id,'gm',p_action_id);
end;$$;
revoke all on function public.combate_accion_estado(uuid,uuid) from public,anon;
grant execute on function public.combate_accion_estado(uuid,uuid) to authenticated;

create function public.combate_guardar_accion(p_id uuid,p_nombre text,p_cambios jsonb,p_version integer,p_deshacer boolean,p_action_id uuid) returns jsonb language plpgsql security definer set search_path='' set lock_timeout='1500ms' as $$
declare r jsonb;comando jsonb;inicio timestamptz:=clock_timestamp();ms numeric;evento jsonb;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede dirigir combates.' using errcode='42501';end if;
 if p_action_id is null then raise exception 'La acción necesita action_id.' using errcode='22023';end if;
 if not pg_try_advisory_xact_lock(hashtextextended(p_id::text,0)) then raise exception 'Otra acción está confirmándose.' using errcode='55P03';end if;
 comando:=jsonb_build_object('nombre',p_nombre,'cambios',p_cambios,'version',p_version,'deshacer',p_deshacer);
 r:=private.combate_recibo(auth.uid(),p_id,'gm',p_action_id,comando);
 if (r->>'confirmada')::boolean then return r;end if;
 p_cambios:=jsonb_set(p_cambios,'{campos,evento_visual}',coalesce(p_cambios->'campos'->'evento_visual','{}')||jsonb_build_object('action_id',p_action_id,'secuencia',p_version+1),true);
 r:=public.combate_guardar_ligero(p_id,p_nombre,p_cambios,p_version,p_deshacer);
 ms:=extract(epoch from clock_timestamp()-inicio)*1000;
 select datos->'evento_visual' into evento from public.combates_yugen where id=p_id;
 -- No duplicar snapshots ni imágenes en el recibo de deshacer; se recupera el snapshot actual.
 insert into private.combate_acciones(combate_id,action_id,usuario,actor,firma,version_base,version_resultado,resultado,evento,sql_ms)
 values(p_id,p_action_id,auth.uid(),'gm',md5(comando::text),p_version,(r->>'version')::int,r-'datos',evento,ms);
 return r||jsonb_build_object('confirmada',true,'action_id',p_action_id,'version_aplicada',r->'version','repetida',false,'sql_ms',ms);
end;$$;
revoke all on function public.combate_guardar_accion(uuid,text,jsonb,integer,boolean,uuid) from public,anon;
grant execute on function public.combate_guardar_accion(uuid,text,jsonb,integer,boolean,uuid) to authenticated;

-- Solo el backend autenticado puede aportar usuario o estado calculado del motor.
create function public.jugador_accion_estado_servidor(p_usuario uuid,p_combate uuid,p_actor text,p_action_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin
 r:=private.combate_recibo(p_usuario,p_combate,p_actor,p_action_id);
 if not (r->>'confirmada')::boolean then perform yugen_interno.consultar_jugador_rapido(p_usuario,p_combate,p_actor,null);end if;
 return r;
end;$$;
create function public.jugador_preparar_accion_servidor(p_usuario uuid,p_combate uuid,p_actor text,p_action_id uuid,p_comando jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;ctx jsonb;
begin
 if p_action_id is null then raise exception 'La acción necesita action_id.' using errcode='22023';end if;
 r:=private.combate_recibo(p_usuario,p_combate,p_actor,p_action_id,p_comando);
 ctx:=yugen_interno.consultar_jugador_rapido(p_usuario,p_combate,p_actor,null);
 return ctx||jsonb_build_object('recibo',r);
end;$$;
create function public.jugador_confirmar_accion_servidor(p_usuario uuid,p_combate uuid,p_actor text,p_action_id uuid,p_comando jsonb,p_version integer,p_datos jsonb) returns jsonb language plpgsql security definer set search_path='' set lock_timeout='1500ms' as $$
declare r jsonb;ctx jsonb;inicio timestamptz:=clock_timestamp();ms numeric;
begin
 if p_action_id is null then raise exception 'La acción necesita action_id.' using errcode='22023';end if;
 if not pg_try_advisory_xact_lock(hashtextextended(p_combate::text,0)) then raise exception 'Otra acción está confirmándose.' using errcode='55P03';end if;
 r:=private.combate_recibo(p_usuario,p_combate,p_actor,p_action_id,p_comando);
 if (r->>'confirmada')::boolean then
  ctx:=yugen_interno.consultar_jugador_rapido(p_usuario,p_combate,p_actor,null);
  return ctx||jsonb_build_object('recibo',r);
 end if;
 p_datos:=jsonb_set(p_datos,'{evento_visual}',coalesce(p_datos->'evento_visual','{}')||jsonb_build_object('action_id',p_action_id,'secuencia',p_version+1),true);
 ctx:=yugen_interno.confirmar_jugador_rapido(p_usuario,p_combate,p_actor,p_version,p_datos);
 ms:=extract(epoch from clock_timestamp()-inicio)*1000;
 r:=jsonb_build_object('confirmada',true,'action_id',p_action_id,'version_aplicada',ctx->'version','repetida',false,'sql_ms',ms);
 insert into private.combate_acciones(combate_id,action_id,usuario,actor,firma,version_base,version_resultado,resultado,evento,sql_ms)
 values(p_combate,p_action_id,p_usuario,p_actor,md5(p_comando::text),p_version,(ctx->>'version')::int,r,ctx->'combate'->'evento_visual',ms);
 return ctx||jsonb_build_object('recibo',r);
end;$$;
revoke all on function public.jugador_accion_estado_servidor(uuid,uuid,text,uuid),public.jugador_preparar_accion_servidor(uuid,uuid,text,uuid,jsonb),public.jugador_confirmar_accion_servidor(uuid,uuid,text,uuid,jsonb,integer,jsonb) from public,anon,authenticated;
grant execute on function public.jugador_accion_estado_servidor(uuid,uuid,text,uuid),public.jugador_preparar_accion_servidor(uuid,uuid,text,uuid,jsonb),public.jugador_confirmar_accion_servidor(uuid,uuid,text,uuid,jsonb,integer,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
