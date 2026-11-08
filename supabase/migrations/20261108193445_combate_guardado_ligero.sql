begin;
-- El GM transmite cambios por participante. El servidor conserva las fichas y los diez pasos de deshacer.
create function private.combate_aplicar_cambios(p_antes jsonb,p_cambios jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare r jsonb; anterior jsonb; miembros jsonb:='[]'; ids text[]:='{}'; quitar text[]; datos jsonb;
begin
 if jsonb_typeof(p_cambios) is distinct from 'object' or jsonb_typeof(p_cambios->'campos') is distinct from 'object' or jsonb_typeof(p_cambios->'miembros') is distinct from 'array' or jsonb_array_length(p_cambios->'miembros')>100 then raise exception 'Cambios de combate inválidos.';end if;
 select coalesce(array_agg(value),'{}') into quitar from jsonb_array_elements_text(coalesce(p_cambios->'eliminar','[]'));
 datos:=(coalesce(p_antes,'{}')-quitar)||((p_cambios->'campos')-'historial'-'miembros'-'pasos_deshacer');
 for r in select value from jsonb_array_elements(p_cambios->'miembros') loop
  if coalesce(r->>'id','')='' or r->>'id'=any(ids) or jsonb_typeof(r->'campos') is distinct from 'object' then raise exception 'Participante inválido o duplicado.';end if;
  ids:=array_append(ids,r->>'id');
  select value into anterior from jsonb_array_elements(coalesce(p_antes->'miembros','[]')) where value->>'id'=r->>'id';
  select coalesce(array_agg(value),'{}') into quitar from jsonb_array_elements_text(coalesce(r->'eliminar','[]'));
  miembros:=miembros||jsonb_build_array((coalesce(anterior,'{}')-quitar)||(r->'campos')||jsonb_build_object('id',r->>'id'));
 end loop;
 return datos||jsonb_build_object('miembros',miembros);
end;$$;
revoke all on function private.combate_aplicar_cambios(jsonb,jsonb) from public,anon,authenticated;

create function public.combate_guardar_ligero(p_id uuid,p_nombre text,p_cambios jsonb,p_version integer,p_deshacer boolean default false) returns jsonb language plpgsql security definer set search_path='' set lock_timeout='1500ms' as $$
declare b public.combates_yugen%rowtype;datos jsonb;historial jsonb;respuesta jsonb;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede dirigir combates.' using errcode='42501';end if;
 if p_id is null or p_version is null or p_version<0 then raise exception 'Revisión inválida.';end if;
 if not pg_try_advisory_xact_lock(hashtextextended(p_id::text,0)) then raise exception 'Otra acción está confirmándose. Actualiza antes de volver a actuar.' using errcode='55P03';end if;
 select * into b from public.combates_yugen where id=p_id for update;
 if found then
  if b.creador_id<>auth.uid() then raise exception 'Este combate pertenece a otro director.' using errcode='42501';end if;
  if b.version<>p_version then raise exception 'El combate cambió en otra sesión. Recárgalo antes de continuar.';end if;
 elsif p_version<>0 then raise exception 'El combate ya no está disponible.';end if;
 historial:=coalesce(b.datos->'historial','[]');
 if p_deshacer then
  if coalesce((b.datos->>'progreso_confirmado')::boolean,false) then raise exception 'El progreso ya fue aplicado a las fichas.';end if;
  if jsonb_array_length(historial)=0 then raise exception 'No hay una acción anterior.';end if;
  datos:=historial->-1;historial:=historial-(jsonb_array_length(historial)-1);
  datos:=datos||jsonb_build_object('evento_visual',jsonb_build_object('id',gen_random_uuid(),'nombre','Deshacer','dados','[]'::jsonb,'creado_en',floor(extract(epoch from clock_timestamp())*1000)));
 else
  datos:=private.combate_aplicar_cambios(b.datos,p_cambios);
  if b.id is not null then
   select coalesce(jsonb_agg(v order by n),'[]') into historial from (
    select v,n from jsonb_array_elements(historial||jsonb_build_array(b.datos-'historial'-'pasos_deshacer')) with ordinality a(v,n) order by n desc limit 10
   ) ultimos;
  end if;
 end if;
 respuesta:=public.combate_guardar(p_id,p_nombre,datos||jsonb_build_object('historial',historial),p_version);
 return respuesta||jsonb_build_object('pasos_deshacer',jsonb_array_length(historial))||case when p_deshacer then jsonb_build_object('datos',datos-'historial') else '{}'::jsonb end;
end;$$;
revoke all on function public.combate_guardar_ligero(uuid,text,jsonb,integer,boolean) from public,anon;
grant execute on function public.combate_guardar_ligero(uuid,text,jsonb,integer,boolean) to authenticated;

create function public.combate_consultar_ligero(p_id uuid,p_version integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.combates_yugen%rowtype;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM puede consultar el encuentro completo.' using errcode='42501';end if;
 select * into b from public.combates_yugen where id=p_id and creador_id=auth.uid();
 if not found then return null;end if;
 if b.version=p_version then return jsonb_build_object('sin_cambios',true,'version',b.version);end if;
 return jsonb_build_object('id',b.id,'version',b.version,'datos',(b.datos-'historial')||jsonb_build_object('pasos_deshacer',jsonb_array_length(coalesce(b.datos->'historial','[]'))));
end;$$;
revoke all on function public.combate_consultar_ligero(uuid,integer) from public,anon;
grant execute on function public.combate_consultar_ligero(uuid,integer) to authenticated;

-- No convertir las filas completas a JSON: el historial no participa en los avisos.
create or replace function private.combate_emitir_aviso() returns trigger language plpgsql security definer set search_path='' as $$
declare antiguos jsonb:='[]';nuevos jsonb:='[]';creador_antes uuid;creador_despues uuid;destinatario uuid;combate uuid;rev integer;
begin
 if tg_op<>'INSERT' then antiguos:=coalesce(old.datos->'miembros','[]');creador_antes:=old.creador_id;combate:=old.id;rev:=old.version;end if;
 if tg_op<>'DELETE' then nuevos:=coalesce(new.datos->'miembros','[]');creador_despues:=new.creador_id;combate:=new.id;rev:=new.version;end if;
 for destinatario in
  select distinct u from (
   select creador_antes u union select creador_despues
   union select p.user_id from public.personajes p join (
    select value->>'personaje_id' pid from jsonb_array_elements(antiguos)
    union select value->>'personaje_id' pid from jsonb_array_elements(nuevos)
   ) participantes on p.id::text=participantes.pid
  ) usuarios where u is not null order by u
 loop
  insert into public.combate_actualizaciones(user_id,combate_id,version) values(destinatario,combate,rev)
  on conflict(user_id,combate_id) do update set version=excluded.version,revision=gen_random_uuid();
  insert into public.avisos_actualizacion(user_id,revision) values(destinatario,gen_random_uuid())
  on conflict(user_id) do update set revision=excluded.revision;
 end loop;
 return null;
end;$$;

-- Moverse no debe reescribir recursos que no cambiaron ni sus avisos derivados.
do $$declare d text;marca text:='  -- Store current resources separately; base statistics never become remaining HP.';
begin
 d:=pg_get_functiondef('private.combate_persistir_vitales()'::regprocedure);
 if position(marca in d)=0 then raise exception 'No se reconoce el disparador de recursos.';end if;
 d:=replace(d,marca,$s$
 if tg_op='UPDATE' and anterior is not null and
  (m->'vida',m->'ph',m->'fatiga',m->'stats',m->'transformacion',m->'situacion') is not distinct from
  (anterior->'vida',anterior->'ph',anterior->'fatiga',anterior->'stats',anterior->'transformacion',anterior->'situacion') then continue;end if;
$s$||marca);
 execute d;
end;$$;
-- Las esperas entre acciones concurrentes deben fallar pronto, no inmovilizar el turno.
alter function yugen_interno.confirmar_jugador_rapido(uuid,uuid,text,integer,jsonb) set lock_timeout='1500ms';
alter function public.combate_guardar(uuid,text,jsonb,integer) set lock_timeout='1500ms';
notify pgrst,'reload schema';
commit;
