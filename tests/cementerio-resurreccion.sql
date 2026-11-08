-- Everything, including the synthetic account, is rolled back. No existing character is changed.
begin;
create temporary table qa_revivir(gm uuid,usuario uuid,a bigint,c bigint,ocupante bigint,tumba uuid,segunda uuid,tc uuid,alma uuid,naturaleza uuid,nodo uuid);
insert into qa_revivir(gm,usuario) select (select id from public.perfiles where rol='KUROI' limit 1),gen_random_uuid();
do $$declare q record;pj bigint;item uuid;nat uuid;nodo uuid;
begin
 select * into q from qa_revivir;perform set_config('request.jwt.claim.sub',q.gm::text,true);
 insert into auth.users(id,email,aud,role,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(q.usuario,'qa-revivir-'||q.usuario::text||'@example.invalid','authenticated','authenticated','{}','{}',now(),now());
 update public.perfiles set estado='aprobado',rol='REENCARNADO',mente_colmena=false where id=q.usuario;
 insert into public.personajes(user_id,nombre,raza,atributos,nivel,exp_total,puntos_habilidad,estado_aprobacion,estado_vida) values(q.usuario,'QA resurrección A','personajes','{"vida":20,"ph":5,"fisico":6}',3,300,4,'aprobado','vivo') returning id into pj;update qa_revivir set a=pj;
 nodo:=public.arbol_guardar(pj,p_tipo=>'estadistica',p_nombre=>'Fuerza recuperada',p_atributo=>'fisico',p_incremento=>2,p_coste=>2);perform public.arbol_comprar(pj,nodo);-- El nodo se consulta por personaje en las comprobaciones.
 insert into public.naturalezas(clave,nombre,modificadores) values('qa_revivir_'||replace(q.usuario::text,'-',''),'QA naturaleza','{"fisico":3}') returning id into nat;update qa_revivir set naturaleza=nat;
 insert into public.personaje_naturalezas(personaje_id,naturaleza_id,origen) values(pj,nat,'Prueba transaccional');
 insert into public.inventario_jugador(user_id,personaje_id,nombre,tipo,stats,ligado_al_alma,slot_tipo,slot_equipado,es_activo,configuracion) values(q.usuario,pj,'QA arma','objeto','{"dano":2}',false,'mano','mano_der',true,'{"tipo_creacion":"objeto","efectos":[]}');
 insert into public.inventario_jugador(user_id,personaje_id,nombre,tipo,stats,ligado_al_alma,slot_tipo,es_activo,configuracion) values(q.usuario,pj,'QA habilidad','habilidad','{}',false,'ninguno',true,'{"tipo_creacion":"habilidad","efectos":[]}');
 insert into public.inventario_jugador(user_id,nombre,tipo,stats,ligado_al_alma,slot_tipo,es_activo) values(q.usuario,'QA alma','objeto','{}',true,'ninguno',false) returning id into item;
 update public.inventario_jugador set personaje_id=pj where id=item;update qa_revivir set alma=item;
 update public.personajes set vida_actual=0 where id=pj;
 update qa_revivir set tumba=(select id from public.cementerio_personajes where personaje_id=pj and resucitado_at is null);
end;$$;
grant select,update on qa_revivir to authenticated;
set local role authenticated;
do $$declare q record;prev jsonb;r jsonb;bloqueado boolean;fid uuid;otra uuid;id_c bigint;id_ocupante bigint;nuevo_nodo uuid;
begin
 select * into q from qa_revivir;
 perform set_config('request.jwt.claim.sub',q.usuario::text,true);
 bloqueado:=false;begin perform public.cementerio_revivir(q.tumba,'dueno');exception when insufficient_privilege then bloqueado:=true;end;
 if not bloqueado then raise exception 'El jugador puede resucitar por su cuenta.';end if;
 if exists(select 1 from public.cementerio_personajes where id=q.tumba) then raise exception 'RLS revela el cementerio al jugador.';end if;
 perform set_config('request.jwt.claim.sub',q.gm::text,true);
 bloqueado:=false;begin update public.personajes set estado_vida='vivo',vida_actual=20 where id=q.a;exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'La actualización directa elude las comprobaciones.';end if;
 prev:=public.cementerio_prever(q.tumba);
 if not (prev->>'puede_devolver')::boolean then raise exception 'Bloquea a un dueño con espacio libre: %',prev;end if;
 r:=public.cementerio_revivir(q.tumba,'dueno');
 if not exists(select 1 from public.personajes where id=q.a and estado_vida='vivo' and vida_actual=20 and ph_actual=5 and fatiga_actual=0 and nivel=3 and exp_total=300 and puntos_habilidad=2 and atributos->>'fisico'='11') then raise exception 'No restaura vida, nivel, puntos o atributos correctamente.';end if;
 if (select count(*) from public.arbol_nodos where personaje_id=q.a)<>1 then raise exception 'No preserva el árbol individual.';end if;
 if not exists(select 1 from public.inventario_jugador where id=q.alma and personaje_id is null and user_id=q.usuario) then raise exception 'La resurrección sustrajo un objeto del alma.';end if;
 if (select count(*) from public.inventario_jugador where personaje_id=q.a)<>2 then raise exception 'Duplicó o perdió las pertenencias normales.';end if;
 bloqueado:=false;begin perform public.cementerio_revivir(q.tumba,'creacion');exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'Un recuerdo se puede usar dos veces.';end if;
 -- The same body can die again without overwriting its first death.
 update public.personajes set vida_actual=0 where id=q.a;
 select id into otra from public.cementerio_personajes where personaje_id=q.a and resucitado_at is null;
 if otra=q.tumba or (select count(*) from public.cementerio_personajes where personaje_id=q.a)<>2 then raise exception 'No conserva una historia por muerte.';end if;
 r:=public.cementerio_revivir(otra,'creacion');fid:=(r->>'creacion_id')::uuid;
 if not exists(select 1 from public.forja_maestra where id=fid and tipo_creacion='personaje' and nivel=3 and exp_total=300 and stats->>'fisico'='11') then raise exception 'La tarjeta no conserva estadísticas y nivel.';end if;
 r:=public.combate_preparar_personaje(fid);
 if jsonb_array_length(r->'configuracion'->'habilidades')<>1 or jsonb_array_length(r->'configuracion'->'reserva')<>2 or not (r->'configuracion'->'equipamiento' ? 'mano_der') then raise exception 'La tarjeta no conserva habilidades, mochila y equipo: %',r;end if;
 if (select recuperacion_cementerio ? 'personaje' from public.forja_maestra where id=fid) then raise exception 'La tarjeta expone el registro privado del cementerio.';end if;
 if not exists(select 1 from public.personajes where id=q.a and estado_vida='muerto') then raise exception 'La tarjeta también devolvió al dueño indebidamente.';end if;
 -- An occupied non-hive account is blocked; hive permission permits another body.
 insert into public.personajes(user_id,nombre,raza,atributos,estado_aprobacion,estado_vida) values(q.usuario,'QA ocupante','personajes','{"vida":10}','aprobado','vivo') returning id into id_ocupante;
 insert into public.personajes(user_id,nombre,raza,atributos,nivel,exp_total,puntos_habilidad,estado_aprobacion,estado_vida) values(q.usuario,'QA resurrección C','personajes','{"vida":20,"ph":5,"fisico":6}',3,300,4,'aprobado','vivo') returning id into id_c;
 nuevo_nodo:=public.arbol_guardar(id_c,p_tipo=>'estadistica',p_nombre=>'Fuerza',p_atributo=>'fisico',p_incremento=>2,p_coste=>2);perform public.arbol_comprar(id_c,nuevo_nodo);
 insert into public.personaje_naturalezas(personaje_id,naturaleza_id,origen) values(id_c,q.naturaleza,'Prueba transaccional');
 update public.personajes set vida_actual=0 where id=id_c;
 select id into otra from public.cementerio_personajes where personaje_id=id_c and resucitado_at is null;
 prev:=public.cementerio_prever(otra);
 if (prev->>'puede_devolver')::boolean then raise exception 'Ignora el límite de cuerpos.';end if;
 bloqueado:=false;begin perform public.cementerio_revivir(otra,'dueno');exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'Se elude el límite llamando directamente al RPC.';end if;
 update public.perfiles set mente_colmena=true where id=q.usuario;
 perform public.cementerio_revivir(otra,'dueno');
 if not exists(select 1 from public.personajes where id=id_c and estado_vida='vivo') then raise exception 'No permite revivir con Mente colmena.';end if;
 -- Restore a snapshot even if the original body was subsequently deleted by the GM.
 update public.personajes set vida_actual=0 where id=id_c;
 select id into otra from public.cementerio_personajes where personaje_id=id_c and resucitado_at is null;
 perform public.personaje_borrar(id_c,q.usuario);
 perform public.cementerio_revivir(otra,'dueno');
 if not exists(select 1 from public.personajes where id=id_c and atributos->>'fisico'='11' and puntos_habilidad=2) then raise exception 'No restaura el cuerpo borrado o aplica una naturaleza dos veces.';end if;
 if (select count(*) from public.arbol_nodos where personaje_id=id_c)<>1 or (select count(*) from public.personaje_naturalezas where personaje_id=id_c)<>1 then raise exception 'No restaura árbol y naturalezas de la copia.';end if;
end;$$;
reset role;
rollback;
select 'PASS: permisos, espacio libre, límite de cuerpos, Mente colmena, dos destinos, inventario, alma, historial, tarjeta utilizable y restauración tras borrado; pruebas revertidas' as resultado;
