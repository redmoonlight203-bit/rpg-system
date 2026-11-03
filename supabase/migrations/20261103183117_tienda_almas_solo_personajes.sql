begin;
alter table public.tienda_ofertas add constraint tienda_almas_solo_personajes check(tienda<>'almas' or tipo='personaje');
create or replace function private.tienda_operar_v2(p_accion text,p_id uuid,p_forja uuid,p_descripcion text,p_tienda text,p_modo text,p_moneda uuid,p_precio bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare oferta public.tienda_ofertas%rowtype; plantilla public.forja_maestra%rowtype;
 usuario uuid:=auth.uid(); gm boolean; resultado uuid; nombre_jugador text;
begin
 if usuario is null then raise exception 'Inicia sesión.' using errcode='42501'; end if;
 gm:=private.tienda_es_gm();
 if not gm and not exists(select 1 from public.perfiles where id=usuario and rol='REENCARNADO' and estado='aprobado') then
  raise exception 'Tu cuenta no tiene acceso a la tienda.' using errcode='42501';
 end if;
 if p_tienda is null or p_tienda not in ('general','almas') then raise exception 'Tienda inválida.'; end if;
 if not gm and p_tienda='almas' and not exists(select 1 from public.perfiles where id=usuario and mente_colmena) then raise exception 'Tienda no disponible.' using errcode='42501'; end if;
 if p_accion='publicar' then
  if not gm then raise exception 'Solo el GM puede publicar.' using errcode='42501'; end if;
  if p_descripcion is null or length(trim(p_descripcion)) not between 1 and 5000 then raise exception 'Escribe una descripción de hasta 5000 caracteres.'; end if;
  if p_modo is null or p_modo not in ('presencial','monedas') then raise exception 'Elige una forma de pago.'; end if;
  if p_modo='monedas' and (p_moneda is null or p_precio is null or p_precio not between 1 and 1000000000000 or not exists(select 1 from public.monedas where id=p_moneda)) then raise exception 'Indica una moneda y un precio positivo.'; end if;
  select * into plantilla from public.forja_maestra where id=p_forja and estado='aprobado' for share;
  if not found then raise exception 'La creación ya no está disponible en la Forja.'; end if;
  if p_tienda='almas' and plantilla.tipo_creacion is distinct from 'personaje' then raise exception 'La Tienda de almas solo admite personajes.'; end if;
  insert into public.tienda_ofertas(forja_id,nombre,tipo,clase,descripcion,creador_id,tienda,modo_precio,moneda_id,precio)
   values(plantilla.id,plantilla.nombre,coalesce(plantilla.tipo_creacion,'otro'),coalesce(plantilla.clase,'D'),trim(p_descripcion),usuario,p_tienda,p_modo,case when p_modo='monedas' then p_moneda end,case when p_modo='monedas' then p_precio end) returning id into resultado;
  return resultado;
 end if;
 select * into oferta from public.tienda_ofertas where id=p_id for update;
 if not found or oferta.tienda<>p_tienda then raise exception 'La oferta ya no está disponible.'; end if;
 if not gm and oferta.tienda='almas' and not exists(select 1 from public.perfiles where id=usuario and mente_colmena) then raise exception 'Tienda no disponible.' using errcode='42501'; end if;
 if p_accion='negociar' then
  if gm then raise exception 'El GM gestiona las negociaciones de los jugadores.'; end if;
  if oferta.estado='negociando' and oferta.negociador_id=usuario then return oferta.id; end if;
  if oferta.estado<>'disponible' then raise exception 'Otro jugador ha reservado esta oferta o ya está cerrada.'; end if;
  select nombre into nombre_jugador from public.personajes where user_id=usuario order by id limit 1;
  update public.tienda_ofertas set estado='negociando',negociador_id=usuario,negociador_nombre=coalesce(nombre_jugador,'Jugador'),updated_at=now() where id=oferta.id;
 else
  if not gm then raise exception 'Solo el GM puede resolver ofertas.' using errcode='42501'; end if;
  if p_accion in ('aceptar','rechazar') then
   if oferta.estado<>'negociando' then raise exception 'La negociación ya está resuelta.'; end if;
   if p_accion='aceptar' then
    if not exists(select 1 from public.perfiles where id=oferta.negociador_id and estado='aprobado' and (oferta.tienda='general' or mente_colmena)) then raise exception 'La cuenta ya no tiene acceso a esta tienda.'; end if;
    if oferta.modo_precio='monedas' then
     update public.saldos_usuario set cantidad=cantidad-oferta.precio where user_id=oferta.negociador_id and moneda_id=oferta.moneda_id and cantidad>=oferta.precio;
     if not found then raise exception 'El jugador no tiene saldo suficiente. No se ha cobrado ni aceptado la oferta.'; end if;
     insert into public.movimientos_moneda(user_id,moneda_id,cantidad,motivo,creador_id,oferta_id) values(oferta.negociador_id,oferta.moneda_id,-oferta.precio,'Compra: '||oferta.nombre,usuario,oferta.id);
    end if;
   end if;
   update public.tienda_ofertas set estado=case when p_accion='aceptar' then 'aceptada' else 'disponible' end,
    negociador_id=case when p_accion='aceptar' then negociador_id else null end,
    negociador_nombre=case when p_accion='aceptar' then negociador_nombre else null end,updated_at=now() where id=oferta.id;
  elsif p_accion='retirar' then
   if oferta.estado<>'disponible' then raise exception 'Solo se pueden retirar ofertas disponibles.'; end if;
   update public.tienda_ofertas set estado='retirada',updated_at=now() where id=oferta.id;
  else raise exception 'Operación de tienda inválida.';
  end if;
 end if;
 return oferta.id;
end;$$;

commit;
