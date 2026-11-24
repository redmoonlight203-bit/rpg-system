-- Configuración de los códices de La creación (cómo se lee cada creación de la Forja:
-- bestiario, tarot, reliquia…). Una sola fila global con el JSON que edita el GM en el
-- Taller de códices. La aplicación valida y completa el JSON (lib/codices.ts:normalizarConfiguracion);
-- el servidor solo garantiza quién escribe, que sea un objeto y su tamaño.
begin;

create table public.forja_codices(
 id smallint primary key default 1 check(id=1),
 config jsonb not null default '{}'::jsonb check(jsonb_typeof(config)='object'),
 updated_at timestamptz not null default now(),
 updated_by uuid
);
alter table public.forja_codices enable row level security;
revoke all on public.forja_codices from public,anon,authenticated;
grant select on public.forja_codices to authenticated;
create policy forja_codices_lectura on public.forja_codices for select to authenticated using(true);
create trigger avisar_actualizacion after insert or update or delete on public.forja_codices for each statement execute function private.avisar_actualizacion();

create function private.codices_guardar(p_config jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM puede configurar los códices.' using errcode='42501';end if;
 if p_config is null or jsonb_typeof(p_config)<>'object' then raise exception 'La configuración de códices debe ser un objeto JSON.' using errcode='22023';end if;
 if octet_length(p_config::text)>200000 then raise exception 'La configuración de códices supera los 200 000 bytes.' using errcode='22023';end if;
 insert into public.forja_codices(id,config,updated_at,updated_by) values(1,p_config,now(),auth.uid())
 on conflict(id) do update set config=excluded.config,updated_at=now(),updated_by=auth.uid();
end;$$;
revoke all on function private.codices_guardar(jsonb) from public,anon;
grant execute on function private.codices_guardar(jsonb) to authenticated;

create function public.codices_guardar(p_config jsonb) returns void language sql security invoker set search_path='' as $$select private.codices_guardar(p_config)$$;
revoke all on function public.codices_guardar(jsonb) from public,anon;
grant execute on function public.codices_guardar(jsonb) to authenticated;

commit;
