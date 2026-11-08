begin;
do $$
declare e jsonb:='{"id":"qa","nombre":"Forma QA","efecto":"transformacion","cantidad":0,"caras":6,"modificador":0,"duracion":2,"coste_ph":1,"transformacion":{"id":"qa","nombre":"QA","tipo":"forma","etapas":[{"id":"uno","nombre":"Primera","stats":{"vida":20,"ph":10}}]}}';fallo boolean;
begin
 perform public.naturaleza_validar_efectos(jsonb_build_array(e));
 fallo:=false;
 begin perform public.naturaleza_validar_efectos(jsonb_build_array(jsonb_set(e,'{transformacion,etapas,0,stats,vida}','0')));exception when others then fallo:=true;end;
 if not fallo then raise exception 'Se aceptó forma sin vida';end if;
 fallo:=false;
 begin perform public.validar_transformacion(jsonb_set(e,'{transformacion,etapas}',jsonb_build_array(e#>'{transformacion,etapas,0}',e#>'{transformacion,etapas,0}')));exception when others then fallo:=true;end;
 if not fallo then raise exception 'Se aceptaron etapas repetidas';end if;
 if position('vida_original' in pg_get_functiondef('private.combate_persistir_vitales()'::regprocedure))=0 then raise exception 'Falta persistencia del cuerpo';end if;
 if position('validar_transformacion(e)' in pg_get_functiondef('public.validar_configuracion_creacion()'::regprocedure))=0 then raise exception 'Falta validación del Yunque';end if;
end;$$;
rollback;
