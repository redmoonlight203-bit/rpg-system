begin;
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
create or replace function private.tienda_es_gm() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI');
$$;
revoke all on function private.tienda_es_gm() from public,anon;
grant execute on function private.tienda_es_gm() to authenticated;
-- El rol que protege las ofertas no puede ser modificado por el propio jugador.
drop policy if exists "Permitir acceso a perfiles" on public.perfiles;
create policy tienda_perfiles_lectura on public.perfiles for select to authenticated
 using(id=(select auth.uid()) or (select private.tienda_es_gm()));
create policy tienda_perfiles_gm on public.perfiles for update to authenticated
 using((select private.tienda_es_gm())) with check((select private.tienda_es_gm()));
create policy tienda_perfiles_alta on public.perfiles for insert to authenticated
 with check(id=(select auth.uid()) and rol='REENCARNADO' and estado='pendiente');
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.perfiles(id,email,rol,estado) values(new.id,new.email,'REENCARNADO','pendiente');
 return new;
end;$$;
revoke all on function public.handle_new_user() from public,anon,authenticated;

create table public.tienda_ofertas (
 id uuid primary key default gen_random_uuid(),
 forja_id uuid references public.forja_maestra(id) on delete set null,
 nombre text not null, tipo text not null, clase text not null,
 descripcion text not null check(length(descripcion) between 1 and 5000),
 estado text not null default 'disponible' check(estado in ('disponible','negociando','aceptada','retirada')),
 negociador_id uuid references auth.users(id), negociador_nombre text,
 creador_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((estado in ('disponible','retirada') and negociador_id is null) or (estado in ('negociando','aceptada') and negociador_id is not null))
);
create index tienda_ofertas_forja_idx on public.tienda_ofertas(forja_id);
create index tienda_ofertas_negociador_idx on public.tienda_ofertas(negociador_id);
alter table public.tienda_ofertas enable row level security;
create policy tienda_ofertas_lectura on public.tienda_ofertas for select to authenticated using (
 (select private.tienda_es_gm()) or
 (exists(select 1 from public.perfiles where id=(select auth.uid()) and estado='aprobado')
 and (estado='disponible' or negociador_id=(select auth.uid())))
);
revoke all on public.tienda_ofertas from public,anon,authenticated;
grant select on public.tienda_ofertas to authenticated;
-- Solo estas transiciones pueden reservar una oferta. El bloqueo evita dos compradores.
create or replace function private.tienda_operar(p_accion text,p_id uuid,p_forja uuid,p_descripcion text)
returns uuid language plpgsql security definer set search_path='' as $$
declare oferta public.tienda_ofertas%rowtype; plantilla public.forja_maestra%rowtype;
 usuario uuid:=auth.uid(); gm boolean; resultado uuid; nombre_jugador text;
begin
 if usuario is null then raise exception 'Inicia sesión.' using errcode='42501'; end if;
 gm:=private.tienda_es_gm();
 if not gm and not exists(select 1 from public.perfiles where id=usuario and rol='REENCARNADO' and estado='aprobado') then
  raise exception 'Tu cuenta no tiene acceso a la tienda.' using errcode='42501';
 end if;
 if p_accion='publicar' then
  if not gm then raise exception 'Solo el GM puede publicar.' using errcode='42501'; end if;
  if p_descripcion is null or length(trim(p_descripcion)) not between 1 and 5000 then raise exception 'Escribe una descripción de hasta 5000 caracteres.'; end if;
  select * into plantilla from public.forja_maestra where id=p_forja and estado='aprobado' for share;
  if not found then raise exception 'La creación ya no está disponible en la Forja.'; end if;
  insert into public.tienda_ofertas(forja_id,nombre,tipo,clase,descripcion,creador_id)
   values(plantilla.id,plantilla.nombre,coalesce(plantilla.tipo_creacion,'otro'),coalesce(plantilla.clase,'D'),trim(p_descripcion),usuario) returning id into resultado;
  return resultado;
 end if;
 select * into oferta from public.tienda_ofertas where id=p_id for update;
 if not found then raise exception 'La oferta ya no está disponible.'; end if;
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
revoke all on function private.tienda_operar(text,uuid,uuid,text) from public,anon;
grant execute on function private.tienda_operar(text,uuid,uuid,text) to authenticated;
create or replace function public.tienda_operar(p_accion text,p_id uuid default null,p_forja uuid default null,p_descripcion text default null)
returns uuid language sql security invoker set search_path='' as $$
 select private.tienda_operar(p_accion,p_id,p_forja,p_descripcion);
$$;
revoke all on function public.tienda_operar(text,uuid,uuid,text) from public,anon;
grant execute on function public.tienda_operar(text,uuid,uuid,text) to authenticated;
comment on table public.tienda_ofertas is 'Ofertas de la Forja. Negociación presencial; sin cobros automáticos. Puntos Kuro: pendiente.';
commit;
