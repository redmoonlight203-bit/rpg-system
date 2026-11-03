begin;
alter table public.perfiles add column mente_colmena boolean not null default false;
create table public.monedas (
 id uuid primary key default gen_random_uuid(), nombre text not null check(length(trim(nombre)) between 1 and 60),
 simbolo text not null check(length(trim(simbolo)) between 1 and 12), created_at timestamptz not null default now()
);
create unique index monedas_nombre_idx on public.monedas(lower(trim(nombre)));
insert into public.monedas(nombre,simbolo) values('Oro','ORO'),('Puntos Kuro','PK');
create table public.saldos_usuario (
 user_id uuid not null references public.perfiles(id),moneda_id uuid not null references public.monedas(id),
 cantidad bigint not null default 0 check(cantidad between 0 and 1000000000000),primary key(user_id,moneda_id)
);
create table public.movimientos_moneda (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.perfiles(id),
 moneda_id uuid not null references public.monedas(id),cantidad bigint not null check(cantidad<>0),
 motivo text not null,creador_id uuid not null references auth.users(id),oferta_id uuid references public.tienda_ofertas(id),
 created_at timestamptz not null default now(),unique(oferta_id)
);
create index movimientos_user_idx on public.movimientos_moneda(user_id,created_at desc);
create index saldos_moneda_idx on public.saldos_usuario(moneda_id);
create index movimientos_moneda_idx on public.movimientos_moneda(moneda_id);
create index movimientos_creador_idx on public.movimientos_moneda(creador_id);
alter table public.monedas enable row level security;
alter table public.saldos_usuario enable row level security;
alter table public.movimientos_moneda enable row level security;
create policy monedas_lectura on public.monedas for select to authenticated using (
 (select private.tienda_es_gm()) or exists(select 1 from public.perfiles where id=(select auth.uid()) and estado='aprobado'));
create policy saldos_lectura on public.saldos_usuario for select to authenticated using ((select private.tienda_es_gm()) or user_id=(select auth.uid()));
create policy movimientos_lectura on public.movimientos_moneda for select to authenticated using ((select private.tienda_es_gm()) or user_id=(select auth.uid()));
revoke all on public.monedas,public.saldos_usuario,public.movimientos_moneda from public,anon,authenticated;
grant select on public.monedas,public.saldos_usuario,public.movimientos_moneda to authenticated;

alter table public.tienda_ofertas add column tienda text not null default 'general' check(tienda in ('general','almas')),
 add column modo_precio text not null default 'presencial' check(modo_precio in ('presencial','monedas')),
 add column moneda_id uuid references public.monedas(id), add column precio bigint,
 add constraint tienda_precio_valido check((modo_precio='presencial' and moneda_id is null and precio is null) or (modo_precio='monedas' and moneda_id is not null and precio between 1 and 1000000000000));
create index tienda_ofertas_moneda_idx on public.tienda_ofertas(moneda_id);
create index tienda_ofertas_creador_idx on public.tienda_ofertas(creador_id);
drop policy tienda_ofertas_lectura on public.tienda_ofertas;
create policy tienda_ofertas_lectura on public.tienda_ofertas for select to authenticated using (
 (select private.tienda_es_gm()) or
 (exists(select 1 from public.perfiles where id=(select auth.uid()) and estado='aprobado' and (tienda='general' or mente_colmena))
 and (estado='disponible' or negociador_id=(select auth.uid())))
);

create function private.monedas_gestionar(p_accion text,p_usuario uuid,p_moneda uuid,p_cantidad bigint,p_nombre text,p_simbolo text,p_motivo text,p_solicitud uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare resultado uuid; anterior public.movimientos_moneda%rowtype;
begin
 if not private.tienda_es_gm() then raise exception 'Solo el GM puede gestionar monedas.' using errcode='42501'; end if;
 if p_accion='crear' then
  if length(trim(coalesce(p_nombre,''))) not between 1 and 60 or length(trim(coalesce(p_simbolo,''))) not between 1 and 12 then raise exception 'Indica nombre y símbolo válidos.'; end if;
  insert into public.monedas(nombre,simbolo) values(trim(p_nombre),trim(p_simbolo)) returning id into resultado;
  return resultado;
 end if;
 if p_accion<>'ajustar' or p_solicitud is null or p_cantidad is null or p_cantidad=0 or abs(p_cantidad::numeric)>1000000000000 or length(trim(coalesce(p_motivo,''))) not between 1 and 500 then raise exception 'Indica cantidad entera y motivo de hasta 500 caracteres.'; end if;
 if not exists(select 1 from public.perfiles where id=p_usuario and upper(rol)='REENCARNADO') then raise exception 'Elige una cuenta de jugador.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_solicitud::text,0));
 select * into anterior from public.movimientos_moneda where id=p_solicitud;
 if found then
  if anterior.user_id<>p_usuario or anterior.moneda_id<>p_moneda or anterior.cantidad<>p_cantidad or anterior.motivo<>trim(p_motivo) or anterior.creador_id<>auth.uid() then raise exception 'Solicitud utilizada para otra operación.'; end if;
  return anterior.id;
 end if;
 insert into public.saldos_usuario(user_id,moneda_id,cantidad) values(p_usuario,p_moneda,0) on conflict do nothing;
 update public.saldos_usuario set cantidad=cantidad+p_cantidad where user_id=p_usuario and moneda_id=p_moneda and cantidad+p_cantidad between 0 and 1000000000000;
 if not found then raise exception 'Saldo insuficiente o cantidad fuera de límite.'; end if;
 insert into public.movimientos_moneda(id,user_id,moneda_id,cantidad,motivo,creador_id) values(p_solicitud,p_usuario,p_moneda,p_cantidad,trim(p_motivo),auth.uid());
 return p_solicitud;
end;$$;
revoke all on function private.monedas_gestionar(text,uuid,uuid,bigint,text,text,text,uuid) from public,anon;
grant execute on function private.monedas_gestionar(text,uuid,uuid,bigint,text,text,text,uuid) to authenticated;
create function public.monedas_gestionar(p_accion text,p_usuario uuid default null,p_moneda uuid default null,p_cantidad bigint default null,p_nombre text default null,p_simbolo text default null,p_motivo text default null,p_solicitud uuid default null)
returns uuid language sql security invoker set search_path='' as $$select private.monedas_gestionar(p_accion,p_usuario,p_moneda,p_cantidad,p_nombre,p_simbolo,p_motivo,p_solicitud);$$;
revoke all on function public.monedas_gestionar(text,uuid,uuid,bigint,text,text,text,uuid) from public,anon;
grant execute on function public.monedas_gestionar(text,uuid,uuid,bigint,text,text,text,uuid) to authenticated;
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

revoke all on function private.tienda_operar_v2(text,uuid,uuid,text,text,text,uuid,bigint) from public,anon;
grant execute on function private.tienda_operar_v2(text,uuid,uuid,text,text,text,uuid,bigint) to authenticated;
create function public.tienda_operar_v2(p_accion text,p_id uuid default null,p_forja uuid default null,p_descripcion text default null,p_tienda text default 'general',p_modo text default 'presencial',p_moneda uuid default null,p_precio bigint default null)
returns uuid language sql security invoker set search_path='' as $$select private.tienda_operar_v2(p_accion,p_id,p_forja,p_descripcion,p_tienda,p_modo,p_moneda,p_precio);$$;
revoke all on function public.tienda_operar_v2(text,uuid,uuid,text,text,text,uuid,bigint) from public,anon;
grant execute on function public.tienda_operar_v2(text,uuid,uuid,text,text,text,uuid,bigint) to authenticated;
-- Los clientes anteriores pasan por las mismas comprobaciones y cobros.
create or replace function private.tienda_operar(p_accion text,p_id uuid,p_forja uuid,p_descripcion text)
returns uuid language sql security invoker set search_path='' as $$select private.tienda_operar_v2(p_accion,p_id,p_forja,p_descripcion,'general','presencial',null,null);$$;
comment on table public.saldos_usuario is 'Monedas de la cuenta del jugador, independientes de sus personajes.';
commit;
