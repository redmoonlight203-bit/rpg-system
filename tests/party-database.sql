begin;
create temporary table qa_party(gm uuid,jugador uuid,otro uuid,heroe bigint,ajeno bigint,npc bigint,copia bigint,habilidad uuid,plantilla uuid,alma uuid,combate uuid);
insert into qa_party(gm,jugador,otro,combate) select
 (select id from public.perfiles where rol='KUROI' limit 1),
 (select id from public.perfiles where rol='REENCARNADO' and estado='aprobado' order by id limit 1),
 (select id from public.perfiles where rol='REENCARNADO' and estado='aprobado' order by id offset 1 limit 1),gen_random_uuid();
do $$declare q record;v bigint;f uuid;h uuid;
begin
 select * into q from qa_party;perform set_config('request.jwt.claim.sub',q.gm::text,true);
 if q.gm is null or q.jugador is null or q.otro is null then raise exception 'Faltan cuentas de prueba.';end if;
 insert into public.personajes(user_id,nombre,raza,atributos,exp_total,estado_aprobacion,estado_vida) values(q.jugador,'QA party héroe','personajes','{"vida":20,"ph":5,"fisico":3}',99,'aprobado','vivo') returning id into v;update qa_party set heroe=v;
 insert into public.personajes(user_id,nombre,raza,atributos,estado_aprobacion,estado_vida) values(q.otro,'QA party ajeno','personajes','{"vida":20,"ph":5,"fisico":3}','aprobado','vivo') returning id into v;update qa_party set ajeno=v;
 insert into public.forja_maestra(nombre,tipo,tipo_creacion,descripcion,creador_id) values('QA habilidad party',coalesce((select tipo from public.forja_maestra where tipo_creacion='habilidad' limit 1),'habilidades'),'habilidad','Prueba con rollback',q.gm) returning id into h;
 insert into public.forja_maestra(nombre,tipo,tipo_creacion,descripcion,creador_id,stats,habilidades) values('QA NPC party','personajes','personaje','Prueba con rollback',q.gm,'{"vida":20,"ph":5,"fisico":3}',jsonb_build_array(h)) returning id into f;
 update qa_party set habilidad=h,plantilla=f;
end;$$;
grant select,update on qa_party to authenticated;
set local role authenticated;
do $$declare q record;id_npc bigint;id_copia bigint;prev jsonb;resultado jsonb;bloqueado boolean;item uuid;
begin
 select * into q from qa_party;perform set_config('request.jwt.claim.sub',q.gm::text,true);
 id_npc:=public.party_asignar(q.jugador,p_forja=>q.plantilla,p_nombre=>'QA compañero uno');
 id_copia:=public.party_asignar(q.jugador,p_forja=>q.plantilla,p_nombre=>'QA compañero dos');
 update qa_party set npc=id_npc,copia=id_copia;
 if not exists(select 1 from public.personajes where id=id_npc and es_companero and party_activo and user_id=q.jugador) then raise exception 'No asigna una ficha controlable.';end if;
 if (select count(*) from public.inventario_jugador where personaje_id in (id_npc,id_copia) and forja_id=q.habilidad)<>2 then raise exception 'No crea inventarios independientes.';end if;
 if (select exp_total from public.forja_maestra where id=q.plantilla)<>0 then raise exception 'La plantilla recibió XP.';end if;
 bloqueado:=false;begin perform public.progresion_dar_experiencia_creacion(q.plantilla,100);exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'La API antigua permite dar XP a seres genéricos.';end if;
 perform public.arbol_dar_experiencia(id_npc,99);
 prev:=public.party_prever_experiencia(q.jugador,1);
 if not exists(select 1 from jsonb_array_elements(prev) v where (v->>'personaje')::bigint=id_npc and (v->>'puntos_anadidos')::integer=3) then raise exception 'La subida del compañero no está en la previsión.';end if;
 bloqueado:=false;begin perform public.party_dar_experiencia(q.jugador,1);exception when others then bloqueado:=true;end;
 if not bloqueado or (select exp_total from public.personajes where id=id_npc)<>99 then raise exception 'Concedió XP sin revisar avisos.';end if;
 resultado:=public.party_dar_experiencia(q.jugador,1,true);
 if (select puntos_habilidad from public.personajes where id=id_npc)<>3 or (select puntos_habilidad from public.personajes where id=q.heroe)<>3 then raise exception 'No aplica puntos individuales a héroe y compañero.';end if;
 if (select exp_total from public.personajes where id=q.ajeno)<>0 then raise exception 'Otorgó XP a otra party.';end if;
 if (select exp_total from public.forja_maestra where id=q.plantilla)<>0 then raise exception 'El reparto modificó la plantilla.';end if;
 -- A loaned soul item must return when control is revoked.
 insert into public.inventario_jugador(user_id,nombre,tipo,stats,ligado_al_alma,slot_tipo,es_activo,configuracion) values(q.jugador,'QA préstamo party','habilidad','{}',true,'ninguno',true,'{"tipo_creacion":"habilidad","requisitos_uso":{"nivel_minimo":2},"efectos":[]}') returning id into item;
 update public.inventario_jugador set personaje_id=id_npc where id=item;update qa_party set alma=item;
 perform set_config('request.jwt.claim.sub',q.jugador::text,true);
 if not exists(select 1 from public.personajes where id=id_npc) or not exists(select 1 from public.inventario_jugador where personaje_id=id_npc and forja_id=q.habilidad) then raise exception 'El jugador no puede gestionar al NPC.';end if;
 bloqueado:=false;begin perform public.party_asignar(q.jugador,p_forja=>q.plantilla);exception when insufficient_privilege then bloqueado:=true;end;
 if not bloqueado then raise exception 'El jugador puede asignarse NPC.';end if;
 bloqueado:=false;begin perform public.party_retirar(id_npc);exception when insufficient_privilege then bloqueado:=true;end;
 if not bloqueado then raise exception 'El jugador puede alterar la party del GM.';end if;
 perform set_config('request.jwt.claim.sub',q.otro::text,true);
 if exists(select 1 from public.personajes where id=id_npc) or exists(select 1 from public.party_companeros where personaje_id=id_npc) then raise exception 'RLS filtra otra party.';end if;
end;$$;
reset role;
-- The battle gateway uses these same server context functions after validating JWTs.
do $$declare q record;actor jsonb;ctx jsonb;bloqueado boolean;
begin
 select * into q from qa_party;perform set_config('request.jwt.claim.sub',q.gm::text,true);
 actor:=public.combate_preparar_jugador(q.npc)||jsonb_build_object('id','qa-npc','vida',20,'ph',5,'fatiga',0,'estados','[]'::jsonb,'bando','jugador');
 insert into public.combates_yugen(id,nombre,creador_id,datos) values(q.combate,'QA party combate',q.gm,jsonb_build_object('fase','preparacion','ronda',1,'actual','qa-npc','miembros',jsonb_build_array(actor),'registro','[]'::jsonb));
 ctx:=public.jugador_contexto_servidor(q.jugador,q.combate,'qa-npc');
 if ctx->'actor'->>'personaje_id'<>q.npc::text then raise exception 'No puede controlar al compañero en batalla.';end if;
 bloqueado:=false;begin perform public.jugador_contexto_servidor(q.otro,q.combate,'qa-npc');exception when insufficient_privilege then bloqueado:=true;end;
 if not bloqueado then raise exception 'Otra cuenta puede controlar al NPC.';end if;
 bloqueado:=false;begin perform public.party_retirar(q.npc);exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'Puede retirar un NPC dentro de un encuentro activo.';end if;
 update public.combates_yugen set datos=jsonb_set(datos,'{fase}','"finalizado"') where id=q.combate;
 perform public.party_retirar(q.npc);
 if not exists(select 1 from public.inventario_jugador where id=q.alma and user_id=q.jugador and personaje_id is null) then raise exception 'No devolvió el préstamo al baúl.';end if;
 if not exists(select 1 from public.personajes where id=q.npc and user_id=q.gm and not party_activo and exp_total=100) then raise exception 'No conserva al NPC retirado bajo control del GM.';end if;
 bloqueado:=false;begin perform public.arbol_dar_experiencia(q.npc,1,true);exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'El NPC retirado sigue recibiendo XP.';end if;
 perform set_config('request.jwt.claim.sub',q.jugador::text,true);
 bloqueado:=false;begin perform public.arbol_leer(q.npc);exception when insufficient_privilege then bloqueado:=true;end;
 if not bloqueado then raise exception 'El antiguo controlador conserva acceso al NPC.';end if;
 perform set_config('request.jwt.claim.sub',q.gm::text,true);
 perform public.party_asignar(q.otro,p_personaje=>q.npc);
 if not exists(select 1 from public.personajes where id=q.npc and user_id=q.otro and party_activo and nivel=2) then raise exception 'No reasigna conservando el nivel.';end if;
 if not exists(select 1 from public.inventario_jugador where personaje_id=q.npc and forja_id=q.habilidad and user_id=q.otro) then raise exception 'No transfiere el inventario normal del NPC.';end if;
 q.combate:=gen_random_uuid();
 insert into public.combates_yugen(id,nombre,creador_id,datos) values(q.combate,'QA party reasignada',q.gm,jsonb_build_object('fase','preparacion','ronda',1,'actual','qa-npc','miembros',jsonb_build_array(actor),'registro','[]'::jsonb));
 ctx:=public.jugador_contexto_servidor(q.otro,q.combate,'qa-npc');
 if ctx->'actor'->>'personaje_id'<>q.npc::text then raise exception 'El nuevo controlador no puede jugarlo en combate.';end if;
 bloqueado:=false;begin perform public.jugador_contexto_servidor(q.jugador,q.combate,'qa-npc');exception when insufficient_privilege then bloqueado:=true;end;
 if not bloqueado then raise exception 'Una pestaña antigua puede seguir controlando al NPC.';end if;
end;$$;
rollback;
select 'PASS: asignación GM, copias, XP individual y grupal, avisos, RLS, control en batalla, retirada, alma y reasignación; todas las pruebas revertidas' as resultado;
