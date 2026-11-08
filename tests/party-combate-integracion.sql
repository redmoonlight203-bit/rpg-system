-- Ejecutar solo como prueba transaccional: no deja cambios en la campaña.
begin;
do $test$
declare gm uuid;u uuid;heroe bigint;alterno bigint;npc bigint;arma uuid;bid uuid:=gen_random_uuid();grupo jsonb;datos jsonb;ctx jsonb;indice integer;
begin
 select id into gm from public.perfiles where rol='KUROI' limit 1;
 select id into u from public.perfiles where rol='REENCARNADO' and estado='aprobado' limit 1;
 if gm is null or u is null then raise exception 'Faltan cuentas aprobadas para la prueba.';end if;
 perform set_config('request.jwt.claim.sub',gm::text,true);
 insert into public.personajes(user_id,nombre,raza,atributos,estado_aprobacion,estado_vida) values(u,'QA líder party automático','personajes','{"vida":20,"ph":5}','aprobado','vivo') returning id into heroe;
 insert into public.personajes(user_id,nombre,raza,atributos,estado_aprobacion,estado_vida) values(u,'QA cuerpo alterno','personajes','{"vida":20,"ph":5}','aprobado','vivo') returning id into alterno;
 insert into public.personajes(user_id,nombre,raza,atributos,estado_aprobacion,estado_vida,es_companero,party_activo) values(u,'QA compañero automático','personajes','{"vida":20,"ph":5}','aprobado','vivo',true,true) returning id into npc;
 insert into public.party_companeros(user_id,personaje_id,creado_por) values(u,npc,gm);
 insert into public.inventario_jugador(user_id,personaje_id,nombre,tipo,stats,slot_tipo,slot_equipado,ligado_al_alma,configuracion) values(u,npc,'QA arma de compañero','objeto','{}','mano','mano_der',false,'{"tipo_creacion":"objeto"}') returning id into arma;
 grupo:=public.combate_preparar_party(heroe);
 if not exists(select 1 from jsonb_array_elements(grupo) x where x->>'personaje_id'=heroe::text) or not exists(select 1 from jsonb_array_elements(grupo) x where x->>'personaje_id'=npc::text) then raise exception 'Falta el líder o su compañero.';end if;
 if exists(select 1 from jsonb_array_elements(grupo) x where x->>'personaje_id'=alterno::text) then raise exception 'Se añadió otro cuerpo jugable automáticamente.';end if;
 if not exists(select 1 from jsonb_array_elements(grupo) x where x->>'personaje_id'=npc::text and x->'configuracion'->'equipamiento'->'mano_der'->>'id'=arma::text) then raise exception 'No se conserva el equipo del compañero.';end if;
 -- Save only the newly created test members, leaving existing parties untouched.
 select jsonb_build_object('fase','preparacion','ronda',0,'actual',null,'regla','impacto','registro','[]'::jsonb,'miembros',jsonb_agg(x||'{"bando":"jugador","vida":20,"ph":5,"fatiga":0,"iniciativa":10,"dado_iniciativa":10,"turnos":0,"accion_usada":false,"cooldowns":{},"estados":[]}'::jsonb)) into datos from jsonb_array_elements(grupo) x where x->>'personaje_id' in (heroe::text,npc::text);
 perform public.combate_guardar(bid,'QA entrada de party',datos,0);
 perform set_config('request.jwt.claim.sub',u::text,true);
 begin
  perform public.combate_preparar_party(heroe);raise exception 'Un jugador pudo preparar un encuentro como GM.';
 exception when insufficient_privilege then null;end;
 ctx:=public.equipo_contexto_servidor(u,npc,null,null);
 if ctx->>'combate_id'<>bid::text then raise exception 'La gestión desde Party no encuentra el encuentro preparado.';end if;
 select (ord-1)::integer into indice from jsonb_array_elements(ctx->'combate'->'miembros') with ordinality x(m,ord) where m->>'id'=ctx->'actor'->>'id';
 datos:=jsonb_set(ctx->'combate',array['miembros',indice::text,'configuracion','equipamiento'],'{}');
 perform public.equipo_confirmar_servidor(u,npc,bid,ctx->'actor'->>'id',(ctx->>'version')::integer,ctx->>'firma','{}',datos);
 if (select slot_equipado from public.inventario_jugador where id=arma) is not null then raise exception 'No se guardó el cambio del NPC.';end if;
 if (select b.datos->'miembros'->indice->'configuracion'->'equipamiento' from public.combates_yugen b where b.id=bid)<>'{}'::jsonb then raise exception 'El equipo quedó desactualizado en el encuentro.';end if;
end;$test$;
rollback;
