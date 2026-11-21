create table private.recuperacion_cuenta (
 usuario uuid primary key references auth.users(id) on delete cascade,
 solicitud uuid not null default gen_random_uuid(),
 creada timestamptz not null default now(),
 intento timestamptz,
 enviada timestamptz
);
alter table private.recuperacion_cuenta enable row level security;
revoke all on private.recuperacion_cuenta from public,anon,authenticated;

create function public.solicitar_recuperacion(correo text) returns void
language sql security definer set search_path='' as $$
 insert into private.recuperacion_cuenta(usuario)
 select u.id from auth.users u join public.perfiles p on p.id=u.id
 where length(correo) between 3 and 320 and lower(u.email)=lower(trim(correo))
 and p.rol <> 'KUROI' and p.estado='aprobado'
 on conflict(usuario) do update set creada=now(),solicitud=gen_random_uuid(),enviada=null,intento=null
 where recuperacion_cuenta.creada < now()-interval '1 hour'
 and (recuperacion_cuenta.enviada is not null or recuperacion_cuenta.creada < now()-interval '1 day');
$$;

create function public.recuperaciones_pendientes() returns table(solicitud uuid,correo text)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not coalesce(private.tienda_es_gm(),false) then raise exception 'Solo el GM' using errcode='42501'; end if;
 return query select r.solicitud,u.email::text from private.recuperacion_cuenta r
 join auth.users u on u.id=r.usuario join public.perfiles p on p.id=u.id
 where r.enviada is null and r.creada>now()-interval '1 day' and p.rol <> 'KUROI' and p.estado='aprobado' order by r.creada;
end;$$;

create function public.reservar_recuperacion(p_solicitud uuid) returns text
language plpgsql security definer set search_path='' as $$
declare destino text;
begin
 if auth.uid() is null or not coalesce(private.tienda_es_gm(),false) then raise exception 'Solo el GM' using errcode='42501'; end if;
 update private.recuperacion_cuenta r set intento=now() from auth.users u, public.perfiles p
 where r.usuario=u.id and p.id=u.id and p.rol<>'KUROI' and p.estado='aprobado'
 and r.solicitud=p_solicitud and r.enviada is null and r.creada>now()-interval '1 day'
 and (r.intento is null or r.intento<now()-interval '2 minutes')
 returning u.email into destino;
 return destino;
end;$$;
create function public.confirmar_envio_recuperacion(p_solicitud uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not coalesce(private.tienda_es_gm(),false) then raise exception 'Solo el GM' using errcode='42501'; end if;
 update private.recuperacion_cuenta set enviada=now() where solicitud=p_solicitud and enviada is null;
end;$$;
revoke all on function public.solicitar_recuperacion(text),public.recuperaciones_pendientes(),public.reservar_recuperacion(uuid),public.confirmar_envio_recuperacion(uuid) from public,anon,authenticated;
grant execute on function public.solicitar_recuperacion(text) to anon,authenticated;
grant execute on function public.recuperaciones_pendientes(),public.reservar_recuperacion(uuid),public.confirmar_envio_recuperacion(uuid) to authenticated;
