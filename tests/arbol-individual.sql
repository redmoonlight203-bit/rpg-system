begin;
-- Integration checks run as real authenticated roles inside one rolled-back transaction.
create temporary table qa_arbol(gm uuid,jugador uuid,otro uuid,a bigint,b bigint,c bigint,h uuid,raiz uuid,estadistica uuid,poder uuid);
insert into qa_arbol(gm,jugador,otro) select
 (select id from public.perfiles where rol='KUROI' limit 1),
 (select id from public.perfiles where rol='REENCARNADO' and estado='aprobado' order by id limit 1),
 (select id from public.perfiles where rol='REENCARNADO' and estado='aprobado' order by id offset 1 limit 1);
do $$declare q record;pj bigint;habilidad uuid;
begin
 select * into q from qa_arbol;
 if q.gm is null or q.jugador is null or q.otro is null then raise exception 'Faltan cuentas para probar.';end if;
 perform set_config('request.jwt.claim.sub',q.gm::text,true);
 insert into public.personajes(user_id,nombre,raza,atributos,estado_aprobacion,estado_vida) values(q.jugador,'QA árbol A','personajes','{"vida":20,"ph":5,"fisico":2,"agilidad":1}','aprobado','vivo') returning id into pj;
 update qa_arbol set a=pj;
 insert into public.personajes(user_id,nombre,raza,atributos,estado_aprobacion,estado_vida) values(q.jugador,'QA árbol B','personajes','{"vida":20,"ph":5,"fisico":2,"agilidad":1}','aprobado','vivo') returning id into pj;
 update qa_arbol set b=pj;
 insert into public.personajes(user_id,nombre,raza,atributos,estado_aprobacion,estado_vida) values(q.otro,'QA árbol C','personajes','{"vida":20,"ph":5,"fisico":2,"agilidad":1}','aprobado','vivo') returning id into pj;
 update qa_arbol set c=pj;
 insert into public.forja_maestra(nombre,tipo,tipo_creacion,descripcion,creador_id,requisitos_uso) values('QA poder nivel 2',coalesce((select tipo from public.forja_maestra where tipo_creacion='habilidad' limit 1),'habilidades'),'habilidad','Poder de prueba',q.gm,'{"nivel_minimo":2}') returning id into habilidad;
 update qa_arbol set h=habilidad;
end;$$;
grant select,update on qa_arbol to authenticated;
set local role authenticated;
do $$declare q record;prev jsonb;r jsonb;bloqueado boolean;nodo uuid;raiz uuid;stat uuid;poder uuid;
begin
 select * into q from qa_arbol;
 perform set_config('request.jwt.claim.sub',q.gm::text,true);
 prev:=public.arbol_prever_experiencia(q.a,100);
 if (prev->>'puntos_anadidos')::integer<>3 or jsonb_array_length(prev->'avisos')<>1 then raise exception 'No prevé 3 puntos y aviso de árbol vacío.';end if;
 bloqueado:=false;begin perform public.progresion_dar_experiencia(q.a,100);exception when others then bloqueado:=true;end;
 if not bloqueado or (select exp_total from public.personajes where id=q.a)<>0 then raise exception 'Subió nivel sin aviso o modificó XP al rechazar.';end if;
 r:=public.arbol_dar_experiencia(q.b,300,true);
 if (r->>'puntos_anadidos')::integer<>6 or (select puntos_habilidad from public.personajes where id=q.b)<>6 then raise exception 'No concede 3 puntos por cada nivel saltado.';end if;
 raiz:=public.arbol_guardar(q.a,p_tipo=>'rama',p_nombre=>'Fuego');
 stat:=public.arbol_guardar(q.a,p_padre=>raiz,p_tipo=>'estadistica',p_nombre=>'Fuerza',p_atributo=>'fisico',p_incremento=>3,p_coste=>1);
 poder:=public.arbol_guardar(q.a,p_padre=>stat,p_tipo=>'habilidad',p_nombre=>'Poder',p_habilidad=>q.h,p_coste=>2,p_nivel=>2);
 bloqueado:=false;begin perform public.arbol_guardar(q.b,p_padre=>raiz,p_tipo=>'rama',p_nombre=>'Rama ajena');exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'Aceptó padre de otro personaje.';end if;
 bloqueado:=false;begin perform public.arbol_guardar(q.a,p_nodo=>raiz,p_padre=>poder,p_tipo=>'rama',p_nombre=>'Ciclo');exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'Permitió un ciclo.';end if;
 prev:=public.arbol_prever_experiencia(q.a,100);
 if jsonb_array_length(prev->'avisos')<>0 then raise exception 'No reconoce habilidades preparadas.';end if;
 perform public.arbol_dar_experiencia(q.a,100);
 if (select puntos_habilidad from public.personajes where id=q.a)<>3 then raise exception 'No concede puntos al personaje correcto.';end if;
 perform set_config('request.jwt.claim.sub',q.jugador::text,true);
 bloqueado:=false;begin perform public.arbol_guardar(q.a,p_tipo=>'rama',p_nombre=>'Fraude');exception when insufficient_privilege then bloqueado:=true;end;
 if not bloqueado then raise exception 'El jugador puede crear nodos.';end if;
 bloqueado:=false;begin perform public.arbol_leer(q.c);exception when insufficient_privilege then bloqueado:=true;end;
 if not bloqueado then raise exception 'Puede leer el árbol de otra cuenta.';end if;
 bloqueado:=false;begin perform public.arbol_comprar(q.b,poder);exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'Puede gastar puntos de otro cuerpo en este nodo.';end if;
 bloqueado:=false;begin perform public.arbol_comprar(q.a,poder);exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'No exige la habilidad anterior.';end if;
 perform public.arbol_comprar(q.a,stat);
 if (select atributos->>'fisico' from public.personajes where id=q.a)<>'6' then raise exception 'No suma la estadística sobre la progresión automática.';end if;
 perform public.arbol_comprar(q.a,poder);
 if (select puntos_habilidad from public.personajes where id=q.a)<>0 or (select puntos_habilidad from public.personajes where id=q.b)<>6 then raise exception 'Los puntos no son individuales o el coste es incorrecto.';end if;
 if (select count(*) from public.inventario_jugador where personaje_id=q.a and forja_id=q.h)<>1 then raise exception 'No entrega la habilidad aprendida al personaje correcto.';end if;
 bloqueado:=false;begin perform public.arbol_comprar(q.a,poder);exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'Permite comprar dos veces.';end if;
 bloqueado:=false;begin perform public.progresion_escoger_habilidad(q.a,q.h);exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'El endpoint antiguo permite eludir el árbol.';end if;
 perform set_config('request.jwt.claim.sub',q.otro::text,true);
 if exists(select 1 from public.arbol_nodos where personaje_id=q.a) then raise exception 'RLS filtra el árbol de otra cuenta.';end if;
 perform set_config('request.jwt.claim.sub',q.gm::text,true);
 bloqueado:=false;begin perform public.arbol_guardar(q.a,p_nodo=>poder,p_tipo=>'habilidad',p_nombre=>'Otro coste',p_habilidad=>q.h,p_coste=>1);exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'Modifica aprendizajes históricos.';end if;
 bloqueado:=false;begin perform public.arbol_eliminar(q.a,stat);exception when others then bloqueado:=true;end;
 if not bloqueado then raise exception 'Borra nodos aprendidos.';end if;
 nodo:=public.arbol_guardar(q.b,p_tipo=>'estadistica',p_nombre=>'Vitalidad',p_atributo=>'vida',p_incremento=>5,p_coste=>10);
 perform set_config('request.jwt.claim.sub',q.jugador::text,true);
 bloqueado:=false;begin perform public.arbol_comprar(q.b,nodo);exception when others then bloqueado:=true;end;
 if not bloqueado or (select puntos_habilidad from public.personajes where id=q.b)<>6 then raise exception 'Saldo insuficiente no es atómico.';end if;
 perform set_config('request.jwt.claim.sub',q.gm::text,true);
 perform public.arbol_guardar(q.b,p_nodo=>nodo,p_tipo=>'estadistica',p_nombre=>'Vitalidad',p_atributo=>'vida',p_incremento=>5,p_coste=>2);
 perform set_config('request.jwt.claim.sub',q.jugador::text,true);
 perform public.arbol_comprar(q.b,nodo);
 if (select vida_actual from public.personajes where id=q.b)<>20 or (select atributos->>'vida' from public.personajes where id=q.b)<>'29' then raise exception 'Aumentar vida máxima cura las heridas o suma mal.';end if;
 -- Direct writes remain forbidden; a player cannot fabricate nodes or points.
 bloqueado:=false;begin insert into public.arbol_nodos(personaje_id,tipo,nombre,coste) values(q.b,'rama','No autorizado',0);exception when insufficient_privilege then bloqueado:=true;end;
 if not bloqueado then raise exception 'Escritura directa de nodos permitida.';end if;
 update public.personajes set puntos_habilidad=1000 where id=q.b;
 if (select puntos_habilidad from public.personajes where id=q.b)<>4 then raise exception 'El jugador puede inventarse puntos.';end if;
end;$$;
reset role;

rollback;
select 'PASS: integración del árbol individual, datos de prueba revertidos' as resultado;
