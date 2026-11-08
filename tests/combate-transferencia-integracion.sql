-- Prueba real aislada: todo se revierte, incluidos avisos, snapshots y encuentro de QA.
begin;
set local statement_timeout='20s';
create temporary table qa_ligero_resultado(guardado_ms numeric,lectura_ms numeric,payload_completo_bytes int,payload_movimiento_bytes int,deshacer_verificado boolean);
do $test$
declare gm uuid;bid uuid:=gen_random_uuid();imagen text;datos jsonb;parche jsonb;r jsonb;lectura jsonb;ts timestamptz;ms numeric;v int;pos jsonb;
begin
 select id into gm from public.perfiles where rol='KUROI' limit 1;
 perform set_config('request.jwt.claim.sub',gm::text,true);
 select 'data:image/png;base64,'||string_agg(md5(i::text),'') into imagen from generate_series(1,12000) i;
 datos:=jsonb_build_object('fase','preparacion','ronda',1,'miembros',jsonb_build_array(jsonb_build_object('id','qa','nombre','NPC QA temporal','vida',20,'ph',0,'fatiga',0,'stats','{"vida":20}'::jsonb,'posicion','{"x":1,"y":1}'::jsonb,'configuracion',jsonb_build_object('imagen_url',imagen))));
 parche:=jsonb_build_object('campos',datos-'miembros','eliminar','[]'::jsonb,'miembros',jsonb_build_array(jsonb_build_object('id','qa','campos',datos->'miembros'->0,'eliminar','[]'::jsonb)));
 r:=public.combate_guardar_ligero(bid,'QA transferencia temporal',parche,0,false);
 for i in 1..11 loop
  parche:='{"campos":{},"eliminar":[],"miembros":[{"id":"qa","campos":{"posicion":{"x":2,"y":1}},"eliminar":[]}]}'::jsonb;
  ts:=clock_timestamp();r:=public.combate_guardar_ligero(bid,'QA transferencia temporal',parche,(r->>'version')::int,false);ms:=extract(epoch from clock_timestamp()-ts)*1000;
 end loop;
 v:=(r->>'version')::int;
 if (r->>'pasos_deshacer')::int<>10 then raise exception 'Historial incompleto.';end if;
 ts:=clock_timestamp();lectura:=public.combate_consultar_ligero(bid,null);
 insert into qa_ligero_resultado select ms,extract(epoch from clock_timestamp()-ts)*1000,octet_length(b.datos::text),octet_length(parche::text),false from public.combates_yugen b where b.id=bid;
 if lectura->'datos' ? 'historial' then raise exception 'La lectura transfiere el historial.';end if;
 if lectura->'datos'->'miembros'->0->'configuracion'->>'imagen_url' is distinct from imagen then raise exception 'Se perdió la imagen.';end if;
 if public.combate_consultar_ligero(bid,v)->>'sin_cambios'<>'true' then raise exception 'Lectura condicional incorrecta.';end if;
 select datos->'historial'->-1->'miembros'->0->'posicion' into pos from public.combates_yugen where id=bid;
 r:=public.combate_guardar_ligero(bid,'QA transferencia temporal','{}',v,true);
 if r->'datos'->'miembros'->0->'posicion' is distinct from pos or (r->>'pasos_deshacer')::int<>9 then raise exception 'Deshacer incorrecto.';end if;
 update qa_ligero_resultado set deshacer_verificado=true;
 begin
  perform public.combate_guardar_ligero(bid,'QA transferencia temporal',parche,v,false);
  raise exception 'Se permitió una versión obsoleta.';
 exception when raise_exception then if SQLERRM not like '%cambió%' then raise;end if;end;
 if has_function_privilege('anon','public.combate_guardar_ligero(uuid,text,jsonb,integer,boolean)','execute') or has_function_privilege('authenticated','private.combate_aplicar_cambios(jsonb,jsonb)','execute') then raise exception 'Permisos demasiado amplios.';end if;
end;$test$;
select * from qa_ligero_resultado;
rollback;
