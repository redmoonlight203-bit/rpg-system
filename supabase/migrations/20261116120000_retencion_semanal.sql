begin;
set lock_timeout='1500ms';
-- Paso 2.4 del plan: que las tablas de apoyo del combate no crezcan sin límite.
-- Solo borra datos técnicos que ya no protegen nada; nunca toca encuentros, resultados ni fichas.
--  · private.combate_acciones: recibos de idempotencia de más de 7 días. Un reintento tan tardío no existe:
--    el cliente guarda la acción pendiente solo en sessionStorage.
--  · private.combate_acciones_descartadas: marcas de descarte de más de 7 días, por el mismo motivo.
--  · public.combate_actualizaciones: avisos de encuentros que ya no existen o terminados hace más de 7 días.
--  · public.avisos_actualizacion tiene una fila por perfil (clave primaria user_id): no crece y no se borra.
-- Los encuentros terminados sin aprobar con más de 30 días no se borran: se anotan en el registro para el GM.

create table if not exists private.retencion_registro(
 id bigint generated always as identity primary key,
 ejecutado_at timestamptz not null default now(),
 recibos_borrados integer not null,
 descartes_borrados integer not null,
 avisos_combate_borrados integer not null,
 sin_aprobar jsonb not null default '[]'
);
alter table private.retencion_registro enable row level security;
revoke all on private.retencion_registro from public,anon,authenticated;

create or replace function private.retencion_ejecutar(p_dias_recibos integer default 7,p_dias_aprobacion integer default 30)
returns jsonb language plpgsql security definer set search_path='' as $$
declare recibos integer:=0;descartes integer:=0;avisos integer:=0;pendientes jsonb;fila private.retencion_registro%rowtype;
begin
 if p_dias_recibos<1 or p_dias_aprobacion<1 then raise exception 'Los plazos de retención deben ser de al menos un día.' using errcode='22023';end if;
 delete from private.combate_acciones where creado_at<now()-make_interval(days=>p_dias_recibos);
 get diagnostics recibos=row_count;
 if to_regclass('private.combate_acciones_descartadas') is not null then
  delete from private.combate_acciones_descartadas where creado_at<now()-make_interval(days=>p_dias_recibos);
  get diagnostics descartes=row_count;
 end if;
 delete from public.combate_actualizaciones a
 where not exists(select 1 from public.combates_yugen c where c.id=a.combate_id)
    or exists(select 1 from public.combates_yugen c where c.id=a.combate_id and c.datos->>'fase'='finalizado'
              and c.updated_at<now()-make_interval(days=>p_dias_recibos));
 get diagnostics avisos=row_count;
 select coalesce(jsonb_agg(jsonb_build_object('combate_id',r.combate_id,'nombre',c.nombre,'creado',r.created_at) order by r.created_at),'[]')
 into pendientes
 from public.resultados_encuentro r join public.combates_yugen c on c.id=r.combate_id
 where not r.aprobado and r.created_at<now()-make_interval(days=>p_dias_aprobacion);
 insert into private.retencion_registro(recibos_borrados,descartes_borrados,avisos_combate_borrados,sin_aprobar)
 values(recibos,descartes,avisos,pendientes) returning * into fila;
 -- Solo se guardan los últimos 52 registros (un año semanal).
 delete from private.retencion_registro where id<=fila.id-52;
 return to_jsonb(fila);
end;$$;
revoke all on function private.retencion_ejecutar(integer,integer) from public,anon,authenticated;

-- Lectura para el GM: último registro, sin exponer la tabla privada.
create or replace function public.retencion_estado() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r jsonb;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM puede consultar la retención.' using errcode='42501';end if;
 select to_jsonb(x) into r from private.retencion_registro x order by id desc limit 1;
 return coalesce(r,'{}'::jsonb);
end;$$;
revoke all on function public.retencion_estado() from public,anon;
grant execute on function public.retencion_estado() to authenticated;

-- Programación semanal (lunes 04:17 UTC) solo si pg_cron está disponible; en copias sin la extensión no falla.
do $$begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then
  create extension if not exists pg_cron;
  if exists(select 1 from cron.job where jobname='yugen-retencion-semanal') then
   perform cron.unschedule('yugen-retencion-semanal');
  end if;
  perform cron.schedule('yugen-retencion-semanal','17 4 * * 1','select private.retencion_ejecutar()');
 end if;
end$$;
notify pgrst,'reload schema';
commit;
