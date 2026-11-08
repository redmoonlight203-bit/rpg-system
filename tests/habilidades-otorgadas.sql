begin;
do $$
declare gm uuid;usr uuid:=gen_random_uuid();ajeno uuid:=gen_random_uuid();pj bigint;fid uuid;item uuid;bid uuid;preparado jsonb;datos jsonb;r jsonb;fallo boolean;cat text;
begin
 select id into gm from public.perfiles where rol='KUROI' limit 1;perform set_config('request.jwt.claim.sub',gm::text,true);
 insert into auth.users(id,email,aud,role,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(usr,'qa-hab-'||usr||'@example.invalid','authenticated','authenticated','{}','{}',now(),now()),(ajeno,'qa-hab-'||ajeno||'@example.invalid','authenticated','authenticated','{}','{}',now(),now());
 update public.perfiles set estado='aprobado',rol='REENCARNADO' where id in (usr,ajeno);
 insert into public.personajes(user_id,nombre,raza,atributos,nivel,estado_aprobacion,estado_vida) values(usr,'QA habilidades','personajes','{"vida":20,"ph":5,"fatiga":5}',2,'aprobado','vivo') returning id into pj;
 select tipo into cat from public.forja_maestra where tipo_creacion='habilidad' and estado='aprobado' limit 1;
 insert into public.forja_maestra(nombre,tipo,tipo_creacion,stats,configuracion_dados,estado) values('QA habilidad entregada',cat,'habilidad','{}','[{"id":"qa","nombre":"Golpe QA","efecto":"dano","cantidad":1,"caras":6,"modificador":0,"duracion":0,"coste_ph":0,"estado":"","tipo_dano":"fisico"}]','aprobado') returning id into fid;
 r:=public.forja_crear_copias(fid,'inventario',pj,1,'QA',gen_random_uuid());item:=(r->'ids'->>0)::uuid;
 if not (select es_activo from public.inventario_jugador where id=item) then raise exception 'La entrega sigue inactiva';end if;
 preparado:=public.combate_preparar_jugador(pj);
 if not exists(select 1 from jsonb_array_elements(preparado->'configuracion'->'habilidades') h where h->>'id'=item::text and h->'efectos'->0->>'id'='qa') then raise exception 'No llega al combate con sus acciones';end if;
 perform set_config('request.jwt.claim.sub',ajeno::text,true);fallo:=false;
 begin perform public.habilidad_activar(item,false);exception when insufficient_privilege then fallo:=true;end;
 if not fallo then raise exception 'Otra cuenta cambia habilidades ajenas';end if;
 perform set_config('request.jwt.claim.sub',usr::text,true);perform public.habilidad_activar(item,false);
 if (select es_activo from public.inventario_jugador where id=item) then raise exception 'No se desactiva';end if;
 perform public.habilidad_activar(item,true);
 perform set_config('request.jwt.claim.sub',gm::text,true);
 datos:=jsonb_build_object('fase','en_curso','actual',preparado->>'id','ronda',1,'miembros',jsonb_build_array(preparado||'{"vida":13,"ph":3,"fatiga":1,"accion_usada":false,"turnos":1}'::jsonb));
 insert into public.combates_yugen(id,nombre,datos,version,creador_id) values(gen_random_uuid(),'QA habilidades',datos,1,gm) returning id into bid;
 perform set_config('request.jwt.claim.sub',usr::text,true);perform public.habilidad_activar(item,false);
 select b.datos into datos from public.combates_yugen b where b.id=bid;
 if not (datos->'miembros'->0->>'accion_usada')::boolean or jsonb_array_length(datos->'miembros'->0->'configuracion'->'habilidades')<>0 then raise exception 'Cambio en turno no consume acción o no sincroniza';end if;
 if (datos->'miembros'->0->>'vida')::numeric<>13 or (datos->'miembros'->0->>'ph')::numeric<>3 then raise exception 'Sincronizar cambia recursos';end if;
 fallo:=false;begin perform public.habilidad_activar(item,true);exception when others then fallo:=true;end;
 if not fallo then raise exception 'Se activa sin acción disponible';end if;
 perform set_config('request.jwt.claim.sub',gm::text,true);perform public.habilidad_activar(item,true);
 if not exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros'->0->'configuracion'->'habilidades') h where b.id=bid and h->>'id'=item::text) then raise exception 'GM no sincroniza en vivo';end if;
 -- A granted power with unmet requirements is kept, but cannot be activated.
 update public.forja_maestra set requisitos_uso='{"nivel_minimo":99}' where id=fid;
 r:=public.forja_crear_copias(fid,'inventario',pj,1,'QA requisitos',gen_random_uuid());item:=(r->'ids'->>0)::uuid;
 if (select es_activo from public.inventario_jugador where id=item) then raise exception 'Se activa sin cumplir requisitos';end if;
 fallo:=false;begin perform public.habilidad_activar(item,true);exception when others then fallo:=true;end;
 if not fallo then raise exception 'Se eluden requisitos al activar';end if;
end;$$;
rollback;
