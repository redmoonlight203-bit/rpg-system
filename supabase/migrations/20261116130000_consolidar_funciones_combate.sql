begin;
set lock_timeout='1500ms';
-- Paso 2.2 del plan maestro: una sola definición legible de cada función crítica del combate.
-- Hasta ahora la definición vigente había que reconstruirla sumando migraciones:
--  · combate_guardar_ligero = 20261110125629_historial_sin_imagenes + dos replace() de 20261114144211_estabilizacion_guia_v2.
--  · yugen_interno.confirmar_jugador_rapido = 20261110125629_historial_sin_imagenes.
--  · combate_eliminar = 20261110125639_borrar_encuentros_terminados.
-- Esta migración NO cambia comportamiento. Guarda la definición actual en private.estabilizacion_copias,
-- declara la consolidada y aborta (sin aplicar nada) si el cuerpo, la configuración o SECURITY DEFINER
-- no son idénticos a los que había (en el cuerpo solo se toleran saltos CRLF y espacios al final de línea;
-- la versión consolidada los normaliza a LF). Si aborta, producción tiene otra versión: recuperarla con
-- pg_get_functiondef y actualizar este archivo antes de volver a intentarlo.
-- Desde aquí, cualquier cambio a estas funciones se hace con CREATE OR REPLACE completo, nunca con replace().

create temporary table consolidacion_antes on commit drop as
select p.oid::regprocedure::text firma,p.prosrc,p.proconfig,p.prosecdef,p.provolatile,pg_get_function_result(p.oid) resultado
from pg_proc p where p.oid in (
 'public.combate_guardar_ligero(uuid,text,jsonb,integer,boolean)'::regprocedure,
 'yugen_interno.confirmar_jugador_rapido(uuid,uuid,text,integer,jsonb)'::regprocedure,
 'public.combate_eliminar(uuid,integer)'::regprocedure);

insert into private.estabilizacion_copias(clave,contenido)
select 'consolidacion-2.2:funcion:'||p.oid::regprocedure::text,to_jsonb(pg_get_functiondef(p.oid))
from pg_proc p where p.oid::regprocedure::text in (select firma from consolidacion_antes)
on conflict(clave) do nothing;

-- Guardado del GM: aplica cambios o deshace; conserva hasta 10 pasos de deshacer sin imágenes
-- y los descarta al terminar el encuentro. Un encuentro terminado no se puede deshacer.
CREATE OR REPLACE FUNCTION public.combate_guardar_ligero(p_id uuid, p_nombre text, p_cambios jsonb, p_version integer, p_deshacer boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET lock_timeout TO '1500ms'
AS $cuerpo$
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
 if p_deshacer and b.datos->>'fase'='finalizado' then raise exception 'Un encuentro terminado no se puede deshacer.';end if;
 if p_deshacer then
  if coalesce((b.datos->>'progreso_confirmado')::boolean,false) then raise exception 'El progreso ya fue aplicado a las fichas.';end if;
  if jsonb_array_length(historial)=0 then raise exception 'No hay una acción anterior.';end if;
  datos:=private.imagenes_restaurar(historial->-1);historial:=historial-(jsonb_array_length(historial)-1);
  datos:=datos||jsonb_build_object('evento_visual',jsonb_build_object('id',gen_random_uuid(),'nombre','Deshacer','dados','[]'::jsonb,'creado_en',floor(extract(epoch from clock_timestamp())*1000)));
 else
  datos:=private.combate_aplicar_cambios(b.datos,p_cambios);
  if b.id is not null then
   select coalesce(jsonb_agg(v order by n),'[]') into historial from (
    select v,n from jsonb_array_elements(historial||jsonb_build_array(private.imagenes_extraer(b.datos-'historial'-'pasos_deshacer'))) with ordinality a(v,n) order by n desc limit 10
   ) ultimos;
  end if;
 end if;
 if datos->>'fase'='finalizado' then historial:='[]'::jsonb;end if;
 respuesta:=public.combate_guardar(p_id,p_nombre,datos||jsonb_build_object('historial',historial),p_version);
 return respuesta||jsonb_build_object('pasos_deshacer',jsonb_array_length(historial))||case when p_deshacer then jsonb_build_object('datos',datos-'historial') else '{}'::jsonb end;
end;$cuerpo$;
revoke all on function public.combate_guardar_ligero(uuid,text,jsonb,integer,boolean) from public,anon;
grant execute on function public.combate_guardar_ligero(uuid,text,jsonb,integer,boolean) to authenticated;

-- Confirmación de una acción de jugador: añade el estado anterior (sin imágenes) al historial
-- de deshacer, limitado a 10 pasos, y devuelve la lectura ligera del jugador.
CREATE OR REPLACE FUNCTION yugen_interno.confirmar_jugador_rapido(p_usuario uuid, p_combate uuid, p_actor text, p_version integer, p_datos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET lock_timeout TO '1500ms'
AS $cuerpo$
declare anterior jsonb; historial jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_combate::text,0));
 select datos into anterior from public.combates_yugen where id=p_combate for update;
 select coalesce(jsonb_agg(valor order by n),'[]'::jsonb) into historial from (
  select valor,n from jsonb_array_elements(coalesce(anterior->'historial','[]'::jsonb)||jsonb_build_array(private.imagenes_extraer(anterior-'historial'))) with ordinality a(valor,n) order by n desc limit 10
 ) ultimos;
 perform yugen_interno.confirmar_jugador(p_usuario,p_combate,p_actor,p_version,(p_datos-'historial')||jsonb_build_object('historial',historial));
 return yugen_interno.consultar_jugador_rapido(p_usuario,p_combate,p_actor,null);
end;$cuerpo$;

-- Borrado de un encuentro por su director. Conserva los que repartieron recompensas oficiales
-- o generaron logros auditados; borra en orden sus registros dependientes y sus recibos.
CREATE OR REPLACE FUNCTION public.combate_eliminar(p_id uuid, p_version integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $cuerpo$
declare fila public.combates_yugen%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then raise exception 'Solo Kuroi puede borrar encuentros.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into fila from public.combates_yugen where id=p_id for update;
 if not found then raise exception 'El encuentro ya no existe.';end if;
 if fila.creador_id<>auth.uid() then raise exception 'Este encuentro pertenece a otro director.' using errcode='42501';end if;
 if p_version is null or fila.version<>p_version then raise exception 'El encuentro cambió en otra sesión. Recárgalo antes de borrarlo.';end if;

 if exists(select 1 from public.resultados_encuentro r where r.combate_id=p_id and r.aprobado and coalesce(r.datos->'politica'->>'modo','oficial')<>'entrenamiento') then
  raise exception 'Este encuentro ya repartió recompensas oficiales y se conserva como registro.';
 end if;
 if exists(select 1 from public.logros_auditoria a join public.eventos_dominio e on e.id=a.evento_id where e.combate_id=p_id) then
  raise exception 'Este encuentro generó logros auditados y se conserva como registro.';
 end if;
 delete from public.registro_experiencia where combate_id=p_id;
 delete from public.saqueos_encuentro where combate_id=p_id;
 delete from public.eventos_dominio where combate_id=p_id;
 delete from public.resultados_encuentro where combate_id=p_id;
 delete from private.combate_acciones where combate_id=p_id;
 delete from public.combates_yugen where id=p_id;
end;$cuerpo$;
revoke all on function public.combate_eliminar(uuid,integer) from public,anon;
grant execute on function public.combate_eliminar(uuid,integer) to authenticated;

do $$declare a record;n record;faltan int;begin
 select 3-count(*) into faltan from consolidacion_antes;
 if faltan>0 then raise exception 'Consolidación 2.2: faltan % funciones en esta base.',faltan;end if;
 for a in select * from consolidacion_antes loop
  select p.prosrc,p.proconfig,p.prosecdef,p.provolatile,pg_get_function_result(p.oid) resultado into n
  from pg_proc p where p.oid=a.firma::regprocedure;
  -- Solo se ignoran \r y espacios al final de línea: producción tenía parte de combate_eliminar con saltos CRLF.
  if regexp_replace(replace(n.prosrc,E'\r',''),E'[ \t]+\n',E'\n','g') is distinct from regexp_replace(replace(a.prosrc,E'\r',''),E'[ \t]+\n',E'\n','g') then raise exception 'Consolidación 2.2: el cuerpo de % en esta base no coincide con el repositorio. No se aplica nada.',a.firma;end if;
  if n.proconfig is distinct from a.proconfig or n.prosecdef<>a.prosecdef or n.provolatile<>a.provolatile or n.resultado<>a.resultado then
   raise exception 'Consolidación 2.2: la configuración de % no coincide con el repositorio. No se aplica nada.',a.firma;end if;
 end loop;
end$$;
notify pgrst,'reload schema';
commit;
