-- Verifica las rutas reales sin dejar creaciones ni entregas de prueba.
begin;
do $test$
declare gm uuid;a uuid;b uuid;f uuid;sol uuid:=gen_random_uuid();r jsonb;n integer;
begin
 select id into gm from public.perfiles where rol='KUROI' limit 1;
 select id into a from public.perfiles where rol='REENCARNADO' and estado='aprobado' order by id limit 1;
 select id into b from public.perfiles where rol='REENCARNADO' and estado='aprobado' and id<>a order by id limit 1;
 if gm is null or a is null or b is null then raise exception 'Faltan cuentas aprobadas para verificar.';end if;
 perform set_config('request.jwt.claim.sub',gm::text,true);
 insert into public.forja_maestra(nombre,tipo,tipo_creacion,estado,ligado_al_alma,stats,slot_tipo)
 values('QA alma única','armas','objeto','aprobado',true,'{}','mano') returning id into f;
 begin
  perform public.alma_entregar(a,f,2,gen_random_uuid());
  raise exception 'Se permitieron dos copias.';
 exception when raise_exception then if SQLERRM not like '%copia única%' then raise;end if;end;
 r:=public.alma_entregar(a,f,1,sol);
 if (select count(*) from public.inventario_jugador where forja_id=f)<>1 then raise exception 'Entrega incorrecta.';end if;
 if exists(select 1 from public.inventario_jugador where forja_id=f and personaje_id is not null) then raise exception 'No llegó al baúl.';end if;
 begin
  perform public.alma_entregar(b,f,1,gen_random_uuid());
  raise exception 'Se duplicó entre cuentas.';
 exception when raise_exception then if SQLERRM not like '%copia única%' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',a::text,true);
 begin
  perform public.forja_restablecer_alma(f);
  raise exception 'El jugador pudo restablecer.';
 exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',gm::text,true);
 r:=public.forja_restablecer_alma(f);
 if (r->>'retiradas')::integer<>1 or exists(select 1 from public.inventario_jugador where forja_id=f) then raise exception 'No se retiró la vinculación.';end if;
 perform public.alma_entregar(a,f,1,sol);
 if exists(select 1 from public.inventario_jugador where forja_id=f) then raise exception 'Una solicitud anterior volvió a entregar la copia retirada.';end if;
 perform public.alma_entregar(b,f,1,gen_random_uuid());
 if not exists(select 1 from public.forja_almas_unicas where forja_id=f and user_id=b) then raise exception 'No se puede entregar de nuevo tras restablecer.';end if;
end;$test$;
select 'Alma única: entregas, permisos, restablecimiento y respuesta atrasada correctos. Prueba revertida.' resultado;
rollback;
