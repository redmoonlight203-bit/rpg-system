-- Ejecutar dentro de una transacción y terminar con ROLLBACK. No conserva datos de prueba.
do $$
declare gm uuid;u uuid;pj bigint;bid uuid:=gen_random_uuid();tid uuid:=gen_random_uuid();tabla uuid;objeto uuid;datos jsonb;res jsonb;saqueo uuid;n int;total bigint;antes numeric;logro uuid;progreso uuid;enemigo uuid;preparado jsonb;
begin
 select id into gm from public.perfiles where rol='KUROI' limit 1;
 select id into u from public.perfiles where rol='REENCARNADO' and estado='aprobado' limit 1;
 if gm is null or u is null then raise exception 'Se necesita GM y jugador aprobado para la prueba transaccional.';end if;
 perform set_config('request.jwt.claim.sub',gm::text,true);
 insert into public.personajes(user_id,nombre,raza,atributos,estado_vida,estado_aprobacion) values(u,'Verificación transaccional YUGEN','humanos','{"vida":10,"ph":2,"fisico":1}','vivo','aprobado') returning id into pj;
 datos:=jsonb_build_object('fase','finalizado','ronda',1,'actual',null,'politica',jsonb_build_object('modo','oficial','exp_base',100,'reparto','replicar','dificultad',1),'cierre',jsonb_build_object('ganador','jugador','motivo','Prueba'),'miembros',jsonb_build_array(jsonb_build_object('id','test-player','personaje_id',pj::text,'nombre','Prueba','bando','jugador','vida',10,'ph',2,'fatiga',0,'stats',jsonb_build_object('vida',10,'ph',2),'configuracion','{}'::jsonb),jsonb_build_object('id','test-enemy','nombre','Enemigo de prueba','bando','enemigo','vida',0,'ph',0,'fatiga',0,'stats',jsonb_build_object('vida',10),'configuracion','{}'::jsonb)));
 select id into objeto from public.forja_maestra where tipo_creacion='objeto' and estado='aprobado' and not coalesce(ligado_al_alma,false) limit 1;
 if objeto is not null then
 insert into public.tablas_botin(nombre,entradas) values('Tabla transaccional YUGEN',jsonb_build_array(jsonb_build_object('id','objeto','tipo','objeto','forja_id',objeto,'cantidad',1,'peso',1,'calidad_min',0,'calidad_max',4,'garantizado',true))) returning id into tabla;
 datos:=jsonb_set(datos,'{miembros,1,configuracion}',jsonb_build_object('tabla_botin_id',tabla));
 end if;
 insert into public.logros_yugen(nombre,evento,meta,titulo) values('Logro transaccional YUGEN','enemigo_derrotado',100,'Cazador de prueba') returning id into logro;
 insert into public.combates_yugen(id,nombre,datos,creador_id) values(bid,'Verificación transaccional YUGEN',datos,gm);
 res:=private.encuentro_aprobar(bid,1,0,'');res:=private.encuentro_aprobar(bid,1,0,'');
 select exp_total into total from public.personajes where id=pj;
 if total<>100 then raise exception 'EXP incorrecta o duplicada: %',total;end if;
 select puntos_habilidad into n from public.personajes where id=pj;if n<>3 then raise exception 'Se esperaban tres puntos de árbol.';end if;
 select count(*) into n from public.registro_experiencia where combate_id=bid;if n<>1 then raise exception 'EXP duplicada.';end if;
 select id into progreso from public.progreso_logros where logro_id=logro and user_id=u;
 if progreso is null or (select cantidad from public.progreso_logros where id=progreso)<>1 then raise exception 'El logro no conserva el progreso o contó al enemigo dos veces.';end if;
 if objeto is not null then
 select id into saqueo from public.saqueos_encuentro where combate_id=bid;
 if saqueo is null then raise exception 'No se generó saqueo.';end if;
 perform private.encuentro_adjudicar(saqueo,pj);perform private.encuentro_adjudicar(saqueo,pj);
 select jsonb_array_length(entrega->'ids') into n from public.saqueos_encuentro where id=saqueo;if n<>1 then raise exception 'Saqueo incorrecto o duplicado.';end if;
 end if;
 -- El entrenamiento jamás escribe los vitales de la ficha real.
 select vida_actual into antes from public.personajes where id=pj;
 datos:=jsonb_set(datos,'{politica,modo}','"entrenamiento"');datos:=jsonb_set(datos,'{miembros,0,vida}','0');
 insert into public.combates_yugen(id,nombre,datos,creador_id) values(tid,'Entrenamiento transaccional',datos,gm);
 if (select vida_actual from public.personajes where id=pj) is distinct from antes then raise exception 'El entrenamiento modificó la ficha.';end if;
 perform private.encuentro_aprobar(tid,1,0,'');
 if exists(select 1 from public.registro_experiencia where combate_id=tid) then raise exception 'Entrenamiento concedió EXP.';end if;
 select id into enemigo from public.forja_maestra where tipo_creacion='personaje' and estado='aprobado' limit 1;
 preparado:=private.arena_preparar(u,pj,null);
 if preparado->>'personaje_id'<>pj::text then raise exception 'La arena preparó otro personaje.';end if;
 if enemigo is not null then preparado:=private.arena_preparar(u,pj,enemigo);if preparado->>'forja_id'<>enemigo::text then raise exception 'El enemigo de entrenamiento no corresponde.';end if;end if;
 perform set_config('request.jwt.claim.sub',gm::text,true);
 update public.personajes set vida_actual=0 where id=pj;
 if (select estado_vida from public.personajes where id=pj)<>'vivo' then raise exception 'Cero HP provocó muerte definitiva.';end if;
 raise notice 'Integración real: EXP idempotente, +3 puntos, aislamiento de entrenamiento y 0 HP sin muerte confirmados.';
end;$$;
