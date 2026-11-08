-- Prueba aislada de PvP en una transacción; no modifica encuentros existentes.
begin;
do $test$
declare gm uuid; u uuid; v uuid; pa bigint; pb bigint; bid uuid:=gen_random_uuid(); datos jsonb; ctx jsonb; rev integer; esperado integer;
begin
 select id into gm from public.perfiles where rol='KUROI' limit 1;
 select id into u from public.perfiles where rol='REENCARNADO' and estado='aprobado' order by id limit 1;
 select id into v from public.perfiles where rol='REENCARNADO' and estado='aprobado' and id<>u order by id limit 1;
 if gm is null or u is null or v is null then raise exception 'La prueba necesita GM y dos jugadores aprobados.';end if;
 perform set_config('request.jwt.claim.sub',gm::text,true);
 insert into public.personajes(user_id,nombre,raza,atributos,estado_aprobacion,estado_vida) values(u,'QA sincronización A','personajes','{"vida":20,"ph":5}','aprobado','vivo') returning id into pa;
 insert into public.personajes(user_id,nombre,raza,atributos,estado_aprobacion,estado_vida) values(v,'QA sincronización B','personajes','{"vida":20,"ph":5}','aprobado','vivo') returning id into pb;
 datos:=jsonb_build_object('fase','en_curso','ronda',1,'actual','a','regla','impacto','registro','[]'::jsonb,'historial','[]'::jsonb,'miembros',jsonb_build_array(
 jsonb_build_object('id','a','nombre','QA A','personaje_id',pa::text,'bando','jugador','vida',20,'ph',5,'fatiga',0,'stats','{"vida":20,"ph":5}'::jsonb,'configuracion','{"tipo_creacion":"personaje","equipamiento":{}}'::jsonb),
 jsonb_build_object('id','b','nombre','QA B','personaje_id',pb::text,'bando','enemigo','vida',20,'ph',5,'fatiga',0,'stats','{"vida":20,"ph":5}'::jsonb,'configuracion','{"tipo_creacion":"personaje","equipamiento":{}}'::jsonb)));
 perform public.combate_guardar(bid,'QA sincronización PvP',datos,0);
 select version into rev from public.combates_yugen where id=bid;
 if (select count(*) from public.combate_actualizaciones where combate_id=bid)<>3 then raise exception 'Destinatarios incorrectos.';end if;
 if current_setting('yugen.combate_mutando',true)<>'0' then raise exception 'No se restauró el contexto de avisos.';end if;
 ctx:=public.jugador_consultar_rapido_servidor(u,bid,'a',rev);
 if ctx->>'sin_cambios'<>'true' then raise exception 'No se respeta la revisión actual.';end if;
 ctx:=public.jugador_consultar_rapido_servidor(u,bid,'a',null);
 if ctx->'combate' ? 'historial' then raise exception 'Se está transfiriendo el historial.';end if;
 begin
  perform public.jugador_consultar_rapido_servidor(v,bid,'a',rev);
  raise exception 'No se comprobó la propiedad.';
 exception when insufficient_privilege then null;end;
 datos:=jsonb_set(datos,'{miembros,1,vida}','17');
 ctx:=public.jugador_confirmar_rapido_servidor(u,bid,'a',rev,datos);
 if (ctx->>'version')::integer<>rev+1 or (ctx->'combate'->'miembros'->1->>'vida')::integer<>17 then raise exception 'La respuesta no contiene el resultado confirmado.';end if;
 if (select vida_actual from public.personajes where id=pb)<>17 then raise exception 'Se perdió la persistencia de vida.';end if;
 if (select jsonb_array_length(c.datos->'historial') from public.combates_yugen c where c.id=bid)<>1 then raise exception 'No se conservó deshacer.';end if;
 esperado:=rev+1;
 begin
  perform public.jugador_confirmar_rapido_servidor(u,bid,'a',rev,datos);
  raise exception 'Se permitió una versión obsoleta.';
 exception when raise_exception then if SQLERRM not like '%cambió%' then raise;end if;end;
 if (select version from public.combates_yugen where id=bid)<>esperado then raise exception 'El conflicto alteró el encuentro.';end if;
end;$test$;
select 'PvP: sincronización, vida persistente, historial, permisos y conflictos correctos; prueba revertida.' resultado;
rollback;
