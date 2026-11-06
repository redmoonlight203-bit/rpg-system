-- NAVY: límite de consumo privado por usuario. La IA nunca recibe permisos de escritura.
create schema if not exists private;
create table if not exists private.navy_cupos (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  periodo text not null check (periodo in ('minuto','dia')),
  ventana timestamptz not null,
  consultas integer not null default 0 check (consultas >= 0),
  primary key (usuario_id,periodo,ventana)
);
revoke all on private.navy_cupos from public,anon,authenticated;

create or replace function public.navy_reservar_cupo()
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  usuario uuid := auth.uid();
  minuto timestamptz := date_trunc('minute',clock_timestamp());
  dia timestamptz := date_trunc('day',clock_timestamp());
  uso_minuto integer;
  uso_dia integer;
begin
  if usuario is null or not exists (
    select 1 from public.perfiles where id=usuario and rol='KUROI'
  ) then
    raise exception 'NAVY_NO_AUTORIZADO' using errcode='42501';
  end if;

  insert into private.navy_cupos(usuario_id,periodo,ventana,consultas)
  values(usuario,'minuto',minuto,1)
  on conflict (usuario_id,periodo,ventana)
  do update set consultas=private.navy_cupos.consultas+1
    where private.navy_cupos.consultas < 8
  returning consultas into uso_minuto;
  if uso_minuto is null then
    raise exception 'NAVY_LIMITE_MINUTO' using errcode='P0001';
  end if;

  insert into private.navy_cupos(usuario_id,periodo,ventana,consultas)
  values(usuario,'dia',dia,1)
  on conflict (usuario_id,periodo,ventana)
  do update set consultas=private.navy_cupos.consultas+1
    where private.navy_cupos.consultas < 80
  returning consultas into uso_dia;
  if uso_dia is null then
    raise exception 'NAVY_LIMITE_DIA' using errcode='P0001';
  end if;

  return jsonb_build_object(
    'restantes_minuto',8-uso_minuto,
    'restantes_dia',80-uso_dia
  );
end $$;
revoke all on function public.navy_reservar_cupo() from public,anon;
grant execute on function public.navy_reservar_cupo() to authenticated;
