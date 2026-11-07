begin;
create temporary table qa_tienda as
 select (select id from public.perfiles where rol='KUROI' and estado='aprobado' limit 1) gm,
 (select id from public.perfiles where rol='REENCARNADO' and estado='aprobado' order by id limit 1) jugador,
 (select id from public.perfiles where rol='REENCARNADO' and estado='aprobado' order by id offset 1 limit 1) otro,
 gen_random_uuid() oferta,gen_random_uuid() cerrada;
grant select on qa_tienda to authenticated;
do $$
declare q record; total_antes numeric; total_despues numeric; bloqueado boolean;
begin
 select * into q from qa_tienda;
 if q.gm is null or q.jugador is null or q.otro is null then raise exception 'Se necesitan GM y dos jugadores aprobados.'; end if;
 select coalesce(sum(cantidad),0) into total_antes from public.saldos_usuario;
 insert into public.tienda_ofertas(id,nombre,tipo,clase,descripcion,creador_id)
 values(q.oferta,'QA temporal','objeto','D','Prueba con rollback',q.gm);
 insert into public.tienda_ofertas(id,nombre,tipo,clase,descripcion,creador_id,estado,negociador_id)
 values(q.cerrada,'QA cerrada','objeto','D','Prueba con rollback',q.gm,'aceptada',q.jugador);
 perform set_config('request.jwt.claim.sub',q.jugador::text,true);
 perform public.tienda_operar_v3('negociar',p_id=>q.oferta,p_propuesta=>'Ofrezco una misión');
 if not exists(select 1 from public.tienda_ofertas where id=q.oferta and estado='negociando' and propuesta='Ofrezco una misión') then raise exception 'No guardó la propuesta.'; end if;
 perform public.tienda_operar_v3('proponer',p_id=>q.oferta,p_propuesta=>'Propuesta revisada');
 if not exists(select 1 from public.tienda_ofertas where id=q.oferta and propuesta='Propuesta revisada') then raise exception 'No editó la propuesta.'; end if;
 bloqueado:=false;
 begin perform public.tienda_operar_v3('proponer',p_id=>q.oferta,p_propuesta=>repeat('x',2001)); exception when others then bloqueado:=true; end;
 if not bloqueado then raise exception 'Aceptó una propuesta demasiado larga.'; end if;
 perform set_config('request.jwt.claim.sub',q.otro::text,true);
 bloqueado:=false;
 begin perform public.tienda_operar_v3('cancelar',p_id=>q.oferta); exception when insufficient_privilege then bloqueado:=true; end;
 if not bloqueado then raise exception 'Permitió cancelar la negociación de otro jugador.'; end if;
 bloqueado:=false;
 begin perform public.tienda_operar_v3('proponer',p_id=>q.oferta,p_propuesta=>'Ajena'); exception when insufficient_privilege then bloqueado:=true; end;
 if not bloqueado then raise exception 'Permitió editar la propuesta ajena.'; end if;
 perform set_config('request.jwt.claim.sub',q.jugador::text,true);
 perform public.tienda_operar_v3('cancelar',p_id=>q.oferta);
 if not exists(select 1 from public.tienda_ofertas where id=q.oferta and estado='disponible' and negociador_id is null and propuesta is null) then raise exception 'No liberó la oferta o conservó texto privado.'; end if;
 bloqueado:=false;
 begin perform public.tienda_operar_v3('cancelar',p_id=>q.cerrada); exception when others then bloqueado:=true; end;
 if not bloqueado then raise exception 'Canceló una compra aceptada.'; end if;
 perform public.tienda_operar_v3('negociar',p_id=>q.oferta,p_propuesta=>'Segunda negociación');
 perform set_config('request.jwt.claim.sub',q.gm::text,true);
 -- Legacy GM clients must also erase the proposal before returning to showcase.
 perform public.tienda_operar_v2('rechazar',p_id=>q.oferta);
 if not exists(select 1 from public.tienda_ofertas where id=q.oferta and estado='disponible' and propuesta is null) then raise exception 'Rechazar filtró una propuesta privada.'; end if;
 perform set_config('request.jwt.claim.sub',q.jugador::text,true);
 perform public.tienda_operar_v3('negociar',p_id=>q.oferta,p_propuesta=>'Solo GM y jugador');
 select coalesce(sum(cantidad),0) into total_despues from public.saldos_usuario;
 if total_antes<>total_despues then raise exception 'Negociar o cancelar cambió saldos.'; end if;
end;$$;
set local role authenticated;
do $$
declare q record;
begin
 select * into q from qa_tienda;
 perform set_config('request.jwt.claim.sub',q.otro::text,true);
 if exists(select 1 from public.tienda_ofertas where id=q.oferta) then raise exception 'RLS expone la propuesta a otro jugador.'; end if;
 perform set_config('request.jwt.claim.sub',q.jugador::text,true);
 if not exists(select 1 from public.tienda_ofertas where id=q.oferta and propuesta='Solo GM y jugador') then raise exception 'El dueño no puede leer su propuesta.'; end if;
 perform set_config('request.jwt.claim.sub',q.gm::text,true);
 if not exists(select 1 from public.tienda_ofertas where id=q.oferta and propuesta='Solo GM y jugador') then raise exception 'El GM no puede leer la propuesta.'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 begin
  perform public.tienda_operar_v3('cancelar',p_id=>q.oferta);
  raise exception 'Permitió cancelar sin sesión.';
 exception when insufficient_privilege then null; end;
end;$$;
rollback;
select 'PASS: propuesta, edición, cancelación, propiedad, límite de texto, cierre, privacidad RLS, rechazo v2, saldos y sesión; todos los datos de prueba revertidos' as resultado;
