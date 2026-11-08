-- Ejecutar en una transacción que termine con ROLLBACK.
do $$
declare gm uuid;u uuid;f uuid;l uuid;pj bigint;op uuid:=gen_random_uuid();p jsonb;i public.inventario_jugador%rowtype;s jsonb;n int;
begin
 select id into gm from public.perfiles where rol='KUROI' limit 1;
 select id into u from public.perfiles where rol='REENCARNADO' and estado='aprobado' limit 1;
 if gm is null or u is null then raise exception 'Falta cuenta GM o jugador aprobado.';end if;
 perform set_config('request.jwt.claim.sub',gm::text,true);
 insert into public.forja_maestra(nombre,tipo,tipo_creacion,slot_tipo,estado,creador_id,descripcion,stats,reglas_pasivas)
 values('Título de prueba transaccional','titulos_generales','titulo','titulo','aprobado',gm,'Los vecinos confían en su protector.','{"armadura":2}',
 '[{"id":"proteccion","nombre":"Protección del título","evento":"permanente","condicion":"siempre","bonos":{"armadura":3},"curacion":0,"recuperar_ph":0,"reducir_fatiga":0}]') returning id into f;
 insert into public.logros_yugen(nombre,evento,titulo,titulo_forja_id,criterio,icono,imagen_url) values('Logro de prueba transaccional','manual','El nombre lo define la Forja',f,'Rescató a los aldeanos durante la sesión presencial.','corona','data:image/png;base64,YQ==') returning id into l;
 p:=public.logro_conceder(l,u,null,1,true,'Prueba de concesión narrativa',op);
 perform public.logro_conceder(l,u,null,1,true,'Prueba de concesión narrativa',op);
 if (p->>'desbloqueado')::boolean is distinct from true then raise exception 'No se concedió el logro manual.';end if;
 select * into i from public.inventario_jugador where id=(p->>'titulo_inventario_id')::uuid;
 if i.id is null or not i.ligado_al_alma or i.personaje_id is not null or i.slot_tipo<>'titulo' or i.configuracion->>'tipo_creacion' is distinct from 'titulo' then raise exception 'La recompensa no es un título real del alma.';end if;
 if (i.configuracion->'reglas_pasivas' @> '[{"id":"proteccion","bonos":{"armadura":3}}]'::jsonb) is distinct from true then raise exception 'Se perdieron las pasivas del título.';end if;
 select count(*) into n from public.inventario_jugador where user_id=u and forja_id=f;if n<>1 then raise exception 'Título duplicado.';end if;
 insert into public.personajes(user_id,nombre,raza,atributos,estado_vida,estado_aprobacion) values(u,'Personaje de prueba del título','humanos','{"vida":10,"ph":0,"armadura":0}','vivo','aprobado') returning id into pj;
 update public.inventario_jugador set personaje_id=pj,slot_equipado='titulo' where id=i.id;
 s:=yugen_interno.preparar_jugador(pj);
 if s->'configuracion'->'equipamiento'->'titulo'->'reglas_pasivas'->0->>'id' is distinct from 'proteccion' then raise exception 'El título no llega al equipamiento de combate.';end if;
 if coalesce((s->'stats'->>'armadura')::int,0)<2 then raise exception 'Se perdió la estadística del título.';end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 if public.logro_reclamar_titulo((p->>'id')::uuid) is distinct from i.id then raise exception 'Reclamar duplicó el título.';end if;
 begin
 perform public.logro_conceder(l,u,null,1,true,'Un jugador no puede conceder',gen_random_uuid());
 raise exception 'Un jugador consiguió conceder logros.';
 exception when insufficient_privilege then null;
 end;
end;$$;
