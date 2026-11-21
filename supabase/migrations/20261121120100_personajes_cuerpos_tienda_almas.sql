begin;

-- Comparte el bloqueo de cuenta con las solicitudes y resurrecciones.
create index personajes_cupo_cuerpo_idx on public.personajes(user_id)
 where not es_companero and estado_vida <> 'muerto' and estado_aprobacion <> 'rechazado';

create function private.personaje_validar_cupo(p_usuario uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare colmena boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_usuario::text,0));
 select mente_colmena into colmena from public.perfiles
 where id=p_usuario and rol='REENCARNADO' for share;
 if found and not coalesce(colmena,false) and exists (
  select 1 from public.personajes where user_id=p_usuario and not es_companero
   and estado_vida <> 'muerto' and estado_aprobacion <> 'rechazado'
 ) then
  raise exception 'Este jugador ya tiene un cuerpo o una solicitud activa. Necesita Mente colmena o liberar ese espacio.';
 end if;
end;$$;
revoke all on function private.personaje_validar_cupo(uuid) from public,anon,authenticated;

create function private.personaje_proteger_cupo() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.user_id is not null and not new.es_companero
   and new.estado_vida <> 'muerto' and new.estado_aprobacion <> 'rechazado' then
  if tg_op='UPDATE' and old.user_id=new.user_id and not old.es_companero
    and old.estado_vida <> 'muerto' and old.estado_aprobacion <> 'rechazado' then
   return new;
  end if;
  perform private.personaje_validar_cupo(new.user_id);
 end if;
 return new;
end;$$;
revoke all on function private.personaje_proteger_cupo() from public,anon,authenticated;
create trigger personaje_proteger_cupo before insert or update of user_id,es_companero,estado_vida,estado_aprobacion
 on public.personajes for each row execute function private.personaje_proteger_cupo();

-- La Forja, la party y la tienda crean la misma ficha y su equipo inicial.
create function private.personaje_crear_desde_forja(
 p_usuario uuid,p_forja uuid,p_nombre text,p_nivel integer,p_destino text,p_oferta uuid default null
) returns bigint language plpgsql security invoker set search_path='' as $$
declare
 f public.forja_maestra%rowtype;
 h public.forja_maestra%rowtype;
 categoria uuid;
 atributos jsonb;
 rango record;
 componente record;
 personaje bigint;
 valor numeric;
 npc boolean:=p_destino='npc';
begin
 if p_destino is null or p_destino not in ('npc','cuerpo') then
  raise exception 'Elige si vas a recibir un NPC o un cuerpo principal.';
 end if;
 if p_nivel is null or p_nivel not between 1 and 100 then
  raise exception 'Elige un nivel entre 1 y 100.';
 end if;
 select * into f from public.forja_maestra
 where id=p_forja and tipo_creacion='personaje' and estado='aprobado' for share;
 if not found then raise exception 'Elige un personaje aprobado del Yunque.'; end if;
 if f.ligado_al_alma then raise exception 'Este personaje ligado al alma se entrega al baúl.'; end if;
 if f.es_grupo and p_nivel>f.nivel_maximo then
  raise exception 'Esta especie admite hasta nivel %.',f.nivel_maximo;
 end if;
 if p_nombre is not null and length(btrim(p_nombre)) not between 1 and 100 then
  raise exception 'Nombre inválido.';
 end if;

 select id into categoria from public.categorias_forja where clave=f.tipo;
 if not npc and exists (
  select 1 from public.categorias_forja where id=categoria and raza_unica_de<>p_usuario
 ) then
  raise exception 'Esa raza única pertenece a otro reencarnado.' using errcode='42501';
 end if;
 select coalesce(jsonb_object_agg(a.clave,a.valor_defecto),'{}') into atributos
 from public.personaje_atributos_raza(categoria) a;
 atributos:=atributos||coalesce(f.stats,'{}');
 if f.es_grupo then
  for rango in select * from jsonb_each(f.stats_rango) loop
   valor:=(rango.value->>'min')::numeric
    + ((rango.value->>'max')::numeric-(rango.value->>'min')::numeric)
      * case when f.nivel_maximo=1 then 0 else (p_nivel-1)::numeric/(f.nivel_maximo-1) end;
   atributos:=atributos||jsonb_build_object(rango.key,
    case when trunc((rango.value->>'min')::numeric)=(rango.value->>'min')::numeric
           and trunc((rango.value->>'max')::numeric)=(rango.value->>'max')::numeric
         then round(valor) else round(valor,2) end);
  end loop;
 end if;
 if not atributos ? 'vida' and atributos ? 'hp' then
  atributos:=atributos||jsonb_build_object('vida',atributos->'hp');
 end if;
 if coalesce((atributos->>'vida')::numeric,0)<=0 then
  raise exception 'Configura la vida del personaje en el Yunque.';
 end if;

 insert into public.personajes(user_id,nombre,raza,categoria_id,atributos,historia,estado_aprobacion,
  estado_vida,es_companero,party_activo,forja_origen_id,nivel,exp_total,puntos_habilidad,compra_oferta_id)
 values(p_usuario,coalesce(nullif(btrim(p_nombre),''),f.nombre),f.tipo,categoria,atributos,
  coalesce(f.historia,f.descripcion,''),'aprobado','vivo',npc,npc,f.id,p_nivel,
  50::bigint*p_nivel*(p_nivel-1),3*(p_nivel-1),p_oferta)
 returning id into personaje;

 for componente in
  select value#>>'{}' as id,null::text as slot from jsonb_array_elements(f.habilidades)
  union all select value#>>'{}',null from jsonb_array_elements(f.pasivas)
  union all select value#>>'{}',key from jsonb_each(f.equipamiento)
 loop
  select * into h from public.forja_maestra where id::text=componente.id and estado='aprobado' for share;
  if not found then raise exception 'Una habilidad o pieza del personaje ya no está disponible.'; end if;
  insert into public.inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,descripcion,
   imagen_url,clase,stats,ligado_al_alma,slot_tipo,slot_equipado,es_activo,motivo_entrega)
  values(p_usuario,personaje,h.id,h.nombre,h.tipo,coalesce(h.descripcion,''),h.imagen_url,
   h.clase,public.forja_stats_componente(h.id),coalesce(h.ligado_al_alma,false),h.slot_tipo,
   componente.slot,true,'Equipo inicial del personaje');
 end loop;
 if f.configuracion_dados<>'[]'::jsonb or f.reglas<>'[]'::jsonb then
  insert into public.inventario_jugador(user_id,personaje_id,nombre,tipo,descripcion,clase,stats,
   ligado_al_alma,slot_tipo,es_activo,configuracion)
  values(p_usuario,personaje,'Técnicas de '||f.nombre,'habilidad',coalesce(f.descripcion,''),f.clase,
   '{}',false,'ninguno',true,jsonb_build_object('tipo_creacion','habilidad','efectos',
    f.configuracion_dados,'reglas',f.reglas,'requisitos_uso','{}'::jsonb));
 end if;
 if f.reglas_pasivas<>'[]'::jsonb then
  insert into public.inventario_jugador(user_id,personaje_id,nombre,tipo,descripcion,clase,stats,
   ligado_al_alma,slot_tipo,es_activo,configuracion)
  values(p_usuario,personaje,'Naturaleza de '||f.nombre,'pasiva',coalesce(f.descripcion,''),f.clase,
   '{}',false,'ninguno',true,jsonb_build_object('tipo_creacion','pasiva','reglas_pasivas',
    f.reglas_pasivas,'requisitos_uso','{}'::jsonb));
 end if;

 if npc then
  insert into public.party_companeros(user_id,personaje_id,creado_por)
  values(p_usuario,personaje,auth.uid());
 end if;
 return personaje;
end;$$;
revoke all on function private.personaje_crear_desde_forja(uuid,uuid,text,integer,text,uuid) from public,anon,authenticated;

create or replace function private.party_asignar(p_usuario uuid,p_forja uuid,p_personaje bigint,p_nombre text,p_nivel integer)
returns bigint language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;
begin
 perform private.party_comprobar_gm(p_usuario);
 perform pg_advisory_xact_lock(hashtextextended(p_usuario::text,0));
 if (p_forja is null)=(p_personaje is null) then
  raise exception 'Selecciona una creación o un compañero retirado.';
 end if;
 if p_forja is not null then
  return private.personaje_crear_desde_forja(p_usuario,p_forja,p_nombre,p_nivel,'npc');
 end if;

 select * into p from public.personajes where id=p_personaje and es_companero
  and not party_activo and estado_vida='vivo' and estado_aprobacion='aprobado' for update;
 if not found then raise exception 'El NPC ya está asignado o no está disponible.'; end if;
 if exists (
  select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m
  where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=p.id::text
 ) then raise exception 'Retira al compañero del encuentro antes de asignarlo.'; end if;
 update public.personajes set user_id=p_usuario,party_activo=true where id=p.id;
 update public.inventario_jugador set user_id=p_usuario where personaje_id=p.id;
 insert into public.party_companeros(user_id,personaje_id,creado_por) values(p_usuario,p.id,auth.uid())
 on conflict(personaje_id) do update set user_id=excluded.user_id,activo=true,updated_at=now();
 return p.id;
end;$$;

create function private.personaje_entregar(
 p_usuario uuid,p_forja uuid,p_destino text,p_solicitud uuid,p_nombre text,p_nivel integer
) returns bigint language plpgsql security definer set search_path='' as $$
declare
 anterior public.forja_operaciones%rowtype;
 parametros jsonb;
 personaje bigint;
begin
 perform private.party_comprobar_gm(p_usuario);
 if p_solicitud is null then raise exception 'Falta el identificador de la entrega.'; end if;
 parametros:=jsonb_build_object('modo','personaje','usuario',p_usuario,'forja',p_forja,
  'destino',p_destino,'nombre',p_nombre,'nivel',p_nivel);
 perform pg_advisory_xact_lock(hashtextextended(p_solicitud::text,0));
 select * into anterior from public.forja_operaciones where id=p_solicitud;
 if found then
  if anterior.creador_id is distinct from auth.uid() or anterior.parametros is distinct from parametros then
   raise exception 'La solicitud corresponde a otra entrega.';
  end if;
  return (anterior.resultado->>'personaje')::bigint;
 end if;

 personaje:=private.personaje_crear_desde_forja(p_usuario,p_forja,p_nombre,p_nivel,p_destino);
 insert into public.forja_operaciones(id,creador_id,parametros,resultado)
 values(p_solicitud,auth.uid(),parametros,jsonb_build_object('personaje',personaje));
 return personaje;
end;$$;
revoke all on function private.personaje_entregar(uuid,uuid,text,uuid,text,integer) from public,anon;
grant execute on function private.personaje_entregar(uuid,uuid,text,uuid,text,integer) to authenticated;

create function public.personaje_entregar(
 p_usuario uuid,p_forja uuid,p_destino text,p_solicitud uuid,p_nombre text default null,p_nivel integer default 1
) returns bigint language sql security invoker set search_path='' as $$
 select private.personaje_entregar(p_usuario,p_forja,p_destino,p_solicitud,p_nombre,p_nivel);
$$;
revoke all on function public.personaje_entregar(uuid,uuid,text,uuid,text,integer) from public,anon;
grant execute on function public.personaje_entregar(uuid,uuid,text,uuid,text,integer) to authenticated;

alter table public.tienda_ofertas add column destino_personaje text
 check (destino_personaje is null or (
  destino_personaje in ('npc','cuerpo') and tienda='almas' and tipo='personaje'
  and estado in ('negociando','aceptada')
 ));

drop policy tienda_ofertas_lectura on public.tienda_ofertas;
create policy tienda_ofertas_lectura on public.tienda_ofertas for select to authenticated using (
 (select private.tienda_es_gm()) or
 (exists(select 1 from public.perfiles where id=(select auth.uid()) and rol='REENCARNADO' and estado='aprobado')
  and (estado='disponible' or negociador_id=(select auth.uid())))
);

create or replace function private.tienda_limpiar_propuesta() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.estado in ('disponible','retirada') then
  new.propuesta:=null;
  new.destino_personaje:=null;
 end if;
 return new;
end;$$;

-- La tienda conserva la reserva y el cobro existentes, con acceso para todo jugador aprobado.
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
    if not exists(select 1 from public.perfiles where id=oferta.negociador_id and estado='aprobado' and rol='REENCARNADO') then raise exception 'La cuenta ya no tiene acceso a esta tienda.'; end if;
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

create function private.tienda_operar_v4(
 p_accion text,p_id uuid,p_forja uuid,p_descripcion text,p_tienda text,
 p_modo text,p_moneda uuid,p_precio bigint,p_propuesta text,p_destino text
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 usuario uuid:=auth.uid();
 oferta public.tienda_ofertas%rowtype;
begin
 if usuario is null then raise exception 'Inicia sesión.' using errcode='42501'; end if;
 if p_accion not in ('negociar','proponer','cancelar') or p_accion is null then
  return private.tienda_operar_v2(p_accion,p_id,p_forja,p_descripcion,p_tienda,p_modo,p_moneda,p_precio);
 end if;
 if not exists(select 1 from public.perfiles where id=usuario and rol='REENCARNADO' and estado='aprobado') then
  raise exception 'Tu cuenta no tiene acceso a esta operación.' using errcode='42501';
 end if;
 if p_tienda is null or p_tienda not in ('general','almas') then raise exception 'Tienda inválida.'; end if;
 if length(coalesce(p_propuesta,''))>2000 then raise exception 'La propuesta admite hasta 2000 caracteres.'; end if;
 select * into oferta from public.tienda_ofertas where id=p_id and tienda=p_tienda for update;
 if not found then raise exception 'La oferta ya no está disponible.'; end if;

 if p_accion='negociar' then
  if oferta.estado='negociando' and oferta.negociador_id=usuario then return oferta.id; end if;
  perform private.tienda_operar_v2(p_accion,p_id,p_forja,p_descripcion,p_tienda,p_modo,p_moneda,p_precio);
 else
  if oferta.negociador_id is distinct from usuario then
   raise exception 'Solo puedes gestionar tu propia negociación.' using errcode='42501';
  end if;
  if oferta.estado<>'negociando' then raise exception 'La negociación ya está resuelta.'; end if;
  if p_accion='cancelar' then
   update public.tienda_ofertas set estado='disponible',negociador_id=null,negociador_nombre=null,
    updated_at=now() where id=oferta.id;
   return oferta.id;
  end if;
 end if;

 if p_destino is not null then
  if p_destino not in ('npc','cuerpo') or oferta.tienda<>'almas' or oferta.tipo<>'personaje'
    or not exists (
     select 1 from public.forja_maestra where id=oferta.forja_id and tipo_creacion='personaje'
      and estado='aprobado' and ligado_al_alma is not true
    ) then
   raise exception 'Esta oferta no admite la compra como NPC o cuerpo principal.';
  end if;
  if p_destino='cuerpo' then perform private.personaje_validar_cupo(usuario); end if;
 end if;

 update public.tienda_ofertas set propuesta=nullif(trim(p_propuesta),''),
  destino_personaje=coalesce(p_destino,destino_personaje),updated_at=now()
 where id=oferta.id;
 return oferta.id;
end;$$;
revoke all on function private.tienda_operar_v4(text,uuid,uuid,text,text,text,uuid,bigint,text,text) from public,anon;
grant execute on function private.tienda_operar_v4(text,uuid,uuid,text,text,text,uuid,bigint,text,text) to authenticated;

create function public.tienda_operar_v4(
 p_accion text,p_id uuid default null,p_forja uuid default null,p_descripcion text default null,
 p_tienda text default 'general',p_modo text default 'presencial',p_moneda uuid default null,
 p_precio bigint default null,p_propuesta text default null,p_destino text default null
) returns uuid language sql security invoker set search_path='' as $$
 select private.tienda_operar_v4(p_accion,p_id,p_forja,p_descripcion,p_tienda,p_modo,p_moneda,p_precio,p_propuesta,p_destino);
$$;
revoke all on function public.tienda_operar_v4(text,uuid,uuid,text,text,text,uuid,bigint,text,text) from public,anon;
grant execute on function public.tienda_operar_v4(text,uuid,uuid,text,text,text,uuid,bigint,text,text) to authenticated;

-- Los clientes anteriores también pueden acceder a la tienda y editar sus propuestas.
create or replace function private.tienda_operar_v3(
 p_accion text,p_id uuid,p_forja uuid,p_descripcion text,p_tienda text,
 p_modo text,p_moneda uuid,p_precio bigint,p_propuesta text
) returns uuid language sql security definer set search_path='' as $$
 select private.tienda_operar_v4(p_accion,p_id,p_forja,p_descripcion,p_tienda,p_modo,p_moneda,p_precio,p_propuesta,null);
$$;

create or replace function private.tienda_entregar_compra() returns trigger language plpgsql security definer set search_path='' as $$
declare f public.forja_maestra%rowtype;pj bigint;componente record;h public.forja_maestra%rowtype;
begin
 if new.estado<>'aceptada' or old.estado='aceptada' then return new;end if;
 select * into f from public.forja_maestra where id=new.forja_id for share;
 if not found then raise exception 'La plantilla ya no existe. No se ha cobrado la compra.';end if;
 if new.destino_personaje is not null then
  perform private.personaje_crear_desde_forja(new.negociador_id,f.id,null,
   case when f.es_grupo then least(f.nivel,f.nivel_maximo) else f.nivel end,
   new.destino_personaje,new.id);
 -- Las negociaciones anteriores mantienen la entrega original.
 elsif f.tipo_creacion='personaje' and not coalesce(f.ligado_al_alma,false) then
  insert into public.personajes(user_id,nombre,raza,atributos,historia,estado_aprobacion,estado_vida,compra_oferta_id)
   values(new.negociador_id,f.nombre,'Sin especificar',public.forja_stats_componente(f.id),coalesce(f.historia,f.descripcion,''),'aprobado','vivo',new.id) returning id into pj;
  for componente in select value#>>'{}' as id, null::text as slot from jsonb_array_elements(coalesce(f.habilidades,'[]')) union all select value#>>'{}',null::text from jsonb_array_elements(coalesce(f.pasivas,'[]')) union all select value#>>'{}',key from jsonb_each(coalesce(f.equipamiento,'{}')) loop
   select * into h from public.forja_maestra where id::text=componente.id;
   if found then insert into public.inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,descripcion,clase,stats,ligado_al_alma,slot_tipo,slot_equipado,es_activo,imagen_url) values(new.negociador_id,pj,h.id,h.nombre,h.tipo,h.descripcion,h.clase,public.forja_stats_componente(h.id),h.ligado_al_alma,h.slot_tipo,componente.slot,true,h.imagen_url);end if;
  end loop;
 else
  if not coalesce(f.ligado_al_alma,false) then
   select id into pj from public.personajes where user_id=new.negociador_id and estado_aprobacion='aprobado' and estado_vida='vivo' order by id limit 1;
   if pj is null then raise exception 'Este comprador necesita un personaje vivo para recibir el objeto.';end if;
   if exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=pj::text) then raise exception 'Entrega la compra cuando el personaje salga del combate.';end if;
  end if;
  insert into public.inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,descripcion,imagen_url,clase,stats,ligado_al_alma,slot_tipo,es_activo,compra_oferta_id)
   values(new.negociador_id,pj,f.id,f.nombre,f.tipo,f.descripcion,f.imagen_url,f.clase,public.forja_stats_componente(f.id),f.ligado_al_alma,f.slot_tipo,true,new.id);
 end if;
 return new;
end;$$;

notify pgrst,'reload schema';
commit;
