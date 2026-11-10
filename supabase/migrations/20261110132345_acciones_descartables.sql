create table private.combate_acciones_descartadas (combate_id uuid not null,action_id uuid not null,usuario uuid not null,creado_at timestamptz not null default now(),primary key(combate_id,action_id));
alter table private.combate_acciones_descartadas enable row level security;
revoke all on private.combate_acciones_descartadas from public,anon,authenticated;
create index combate_descartadas_creado_idx on private.combate_acciones_descartadas(creado_at);
CREATE OR REPLACE FUNCTION public.combate_guardar_accion(p_id uuid, p_nombre text, p_cambios jsonb, p_version integer, p_deshacer boolean, p_action_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET lock_timeout TO '1500ms'
AS $function$
declare r jsonb;comando jsonb;inicio timestamptz:=clock_timestamp();ms numeric;evento jsonb;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede dirigir combates.' using errcode='42501';end if;
 if p_action_id is null then raise exception 'La acción necesita action_id.' using errcode='22023';end if;
 if not pg_try_advisory_xact_lock(hashtextextended(p_id::text,0)) then raise exception 'Otra acción está confirmándose.' using errcode='55P03';end if;
 if exists(select 1 from private.combate_acciones_descartadas where combate_id=p_id and action_id=p_action_id) then raise exception 'La acción fue descartada.' using errcode='22023';end if;
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
end;$function$;

CREATE OR REPLACE FUNCTION public.combate_descartar_accion(p_id uuid, p_action_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET lock_timeout TO '1500ms'
AS $function$
declare r jsonb;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede descartar acciones.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 if not exists(select 1 from public.combates_yugen where id=p_id and creador_id=auth.uid()) then raise exception 'Encuentro no disponible.' using errcode='42501';end if;
 r:=private.combate_recibo(auth.uid(),p_id,'gm',p_action_id);
 if (r->>'confirmada')::boolean then return r;end if;
 insert into private.combate_acciones_descartadas(combate_id,action_id,usuario) values(p_id,p_action_id,auth.uid()) on conflict do nothing;
 return jsonb_build_object('confirmada',false,'descartada',true,'action_id',p_action_id);
end;$function$;
revoke all on function public.combate_descartar_accion(uuid,uuid) from public,anon;
grant execute on function public.combate_descartar_accion(uuid,uuid) to authenticated;
notify pgrst,'reload schema';

