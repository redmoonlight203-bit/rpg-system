begin;
select pg_advisory_xact_lock(180631,3);
do $seed$
declare datos jsonb := $data${"piezas":[{"nombre":"Yelmo del dios de la guerra","slot":"casco","stats":{"armadura":2,"peso":2,"durabilidad":300}},{"nombre":"Coraza del dios de la guerra","slot":"pechera","stats":{"armadura":6,"peso":8,"durabilidad":500}},{"nombre":"Grebas del dios de la guerra","slot":"pantalones","stats":{"armadura":3,"peso":4,"durabilidad":350}},{"nombre":"Escarpes del dios de la guerra","slot":"zapatos","stats":{"armadura":1,"peso":2,"durabilidad":300}}],"skills":[{"nombre":"Golpe del mariscal","stats":{"enfriamiento":0},"efectos":[{"id":"accion","nombre":"Golpe del mariscal","efecto":"dano","cantidad":3,"caras":8,"modificador":4,"tipo_dano":"físico","estado":"","duracion":0,"coste_ph":0,"coste_fatiga":0}]},{"nombre":"Arremetida imperial","stats":{"enfriamiento":1},"efectos":[{"id":"accion","nombre":"Arremetida imperial","efecto":"dano","cantidad":2,"caras":10,"modificador":6,"tipo_dano":"físico","estado":"","duracion":0,"coste_ph":0,"coste_fatiga":0}]},{"nombre":"Creación de armas","stats":{"enfriamiento":0},"efectos":[{"id":"accion","nombre":"Arsenal efímero","efecto":"crear_arma","cantidad":3,"caras":8,"modificador":6,"tipo_dano":"físico","estado":"","duracion":3,"coste_ph":0,"coste_fatiga":1,"arma_nombre":"Lanza del conquistador","arma_slot":"dos_manos"}]}],"passives":[{"nombre":"Mente de mariscal","reglas":[{"id":"Mente de mariscal","nombre":"Mente de mariscal","condicion":"siempre","evento":"permanente","bonos":{"iniciativa":4,"bono_impacto":2},"curacion":0,"recuperar_ph":0,"reducir_fatiga":0}]},{"nombre":"Última línea","reglas":[{"id":"Última línea","nombre":"Última línea","condicion":"vida_mitad","evento":"permanente","bonos":{"armadura":2,"dano":2},"curacion":0,"recuperar_ph":0,"reducir_fatiga":0}]}]}$data$::jsonb; v jsonb; equipo jsonb:='{}'::jsonb; v_habilidades jsonb:='[]'::jsonb; v_pasivas jsonb:='[]'::jsonb; oid uuid; hero uuid;
begin
 insert into public.config_estadisticas(categoria,clave,etiqueta,descripcion,valor_defecto)
 select 'razas',s.clave,s.etiqueta,s.descripcion,0 from (values
 ('iniciativa','Iniciativa','Bono a 1d20 para el orden de turnos.'),
 ('bono_impacto','Bono al impacto','Bono a la tirada para acertar.'),
 ('dano','Bono de daño','Bono numérico al daño de las acciones ofensivas.'))s(clave,etiqueta,descripcion)
 where not exists(select 1 from public.config_estadisticas e where e.categoria='razas' and e.clave=s.clave);
 for v in select value from jsonb_array_elements(datos->'piezas') loop
  select id into oid from public.forja_maestra where nombre=v->>'nombre' and tipo_creacion='objeto' limit 1;
  if oid is null then
   insert into public.forja_maestra(nombre,tipo,tipo_creacion,clase,slot_tipo,stats,descripcion,historia,estado)
   values(v->>'nombre','armadura','objeto','SSS',v->>'slot',v->'stats','Pieza de la panoplia SSS del dios de la guerra. Su protección se suma al equiparla.','La armadura ceremonial que Aurio lleva a la primera línea.', 'aprobado') returning id into oid;
  end if;
  equipo:=equipo||jsonb_build_object(v->>'slot',oid::text);oid:=null;
 end loop;
 for v in select value from jsonb_array_elements(datos->'skills') loop
  select id into oid from public.forja_maestra where nombre=v->>'nombre' and tipo_creacion='habilidad' limit 1;
  if oid is null then
   insert into public.forja_maestra(nombre,tipo,tipo_creacion,clase,stats,configuracion_dados,descripcion,estado)
   values(v->>'nombre','habilidades_generales','habilidad','SSS',v->'stats',v->'efectos',case when v->>'nombre'='Creación de armas' then 'Técnica natural de Aurio: crea una lanza temporal de 3d8+6, sin PH. Consume una acción y 1 Fatiga. Dura tres turnos propios completos y después se desvanece.' else 'Técnica puramente física del mejor soldado. No consume PH.' end,'aprobado') returning id into oid;
  end if;
  v_habilidades:=v_habilidades||jsonb_build_array(oid::text);oid:=null;
 end loop;
 for v in select value from jsonb_array_elements(datos->'passives') loop
  select id into oid from public.forja_maestra where nombre=v->>'nombre' and tipo_creacion='pasiva' limit 1;
  if oid is null then
   insert into public.forja_maestra(nombre,tipo,tipo_creacion,clase,reglas_pasivas,descripcion,estado)
   values(v->>'nombre','pasivas_generales','pasiva','SSS',v->'reglas',case when v->>'nombre'='Mente de mariscal' then 'Su lectura del campo concede +4 iniciativa y +2 al impacto.' else 'Con la vida a la mitad o menos, concede +2 ARM y +2 daño.' end,'aprobado') returning id into oid;
  end if;
  v_pasivas:=v_pasivas||jsonb_build_array(oid::text);oid:=null;
 end loop;
 if (select count(*) from public.forja_maestra where lower(nombre)='aurio magno')>1 then raise exception 'Hay varias creaciones llamadas Aurio Magno; evita modificar la incorrecta.';end if;
 select id into hero from public.forja_maestra where lower(nombre)='aurio magno';
 if hero is null then insert into public.forja_maestra(nombre,tipo,tipo_creacion) values('Aurio Magno','personajes','personaje') returning id into hero;end if;
 update public.forja_maestra set nombre='Aurio Magno',tipo='personajes',tipo_creacion='personaje',clase='SSS',es_grupo=false,
 stats='{"vida":100,"armadura":8,"ph":0,"fatiga":7,"iniciativa":2,"bono_impacto":6,"dano":2}'::jsonb,stats_rango='{}'::jsonb,
 equipamiento=equipo,habilidades=v_habilidades,pasivas=v_pasivas,reglas_pasivas='[]'::jsonb,configuracion_dados='[]'::jsonb,slot_tipo='ninguno',estado='aprobado',
 descripcion='El mejor soldado y gran estratega. Combate sin PH, vestido con la panoplia SSS del dios de la guerra. Sus 8 ARM de base más 12 del equipo dan 20 ARM al entrar al campo.',
 historia='Aurio no dirige desde una colina: reconoce el punto donde la línea va a romperse y ocupa ese lugar. Su disciplina sostiene al ejército y su arsenal efímero responde a la necesidad de cada enfrentamiento.'
 where id=hero;
end;$seed$;
commit;
