begin;
set lock_timeout='1500ms';
-- Pactos y deudas. Hasta el 16-11 la tabla tenía la política «Permitir todo» (rol public, using true)
-- y anon tenía todos los permisos: cualquiera con la clave pública podía leer, cambiar o borrar
-- las promesas de todos. Se conserva exactamente el flujo de las pantallas:
--   jugador registra la promesa → Kuroi la aprueba o rechaza (se autoaprueba a los 5 días)
--   → Kuroi la cobra → el jugador confirma o impugna (se autoconfirma a los 2 días).
-- Las reglas ahora las comprueba el servidor.

revoke all on public.deudas_kuroi from public,anon,authenticated;
grant select,insert,update on public.deudas_kuroi to authenticated;
grant all on public.deudas_kuroi to service_role;

drop policy if exists "Permitir todo deudas_kuroi" on public.deudas_kuroi;
drop policy if exists deudas_lectura on public.deudas_kuroi;
drop policy if exists deudas_alta on public.deudas_kuroi;
drop policy if exists deudas_cambio on public.deudas_kuroi;
create policy deudas_lectura on public.deudas_kuroi for select to authenticated
 using (user_id=(select auth.uid()) or (select private.tienda_es_gm()));
create policy deudas_alta on public.deudas_kuroi for insert to authenticated
 with check (user_id=(select auth.uid()));
create policy deudas_cambio on public.deudas_kuroi for update to authenticated
 using (user_id=(select auth.uid()) or (select private.tienda_es_gm()))
 with check (user_id=(select auth.uid()) or (select private.tienda_es_gm()));

alter table public.deudas_kuroi drop constraint if exists deudas_estado_valido;
alter table public.deudas_kuroi add constraint deudas_estado_valido
 check (estado in ('pendiente_aprobacion','aprobada','rechazada','pendiente_pago_confirmacion','completada'));

create or replace function private.deudas_validar() returns trigger language plpgsql security definer set search_path='' as $$
declare gm boolean:=coalesce(private.tienda_es_gm(),false);
begin
 if tg_op='INSERT' then
  new.titulo:=btrim(coalesce(new.titulo,''));new.mensaje:=btrim(coalesce(new.mensaje,''));
  if length(new.titulo) not between 1 and 200 then raise exception 'Escribe un título de 1 a 200 caracteres.' using errcode='22023';end if;
  if length(new.mensaje) not between 1 and 5000 then raise exception 'Describe la promesa (máximo 5000 caracteres).' using errcode='22023';end if;
  new.estado:='pendiente_aprobacion';new.fecha_pago_solicitado:=null;new.created_at:=now();
  return new;
 end if;
 if new.user_id is distinct from old.user_id or new.titulo is distinct from old.titulo
    or new.mensaje is distinct from old.mensaje or new.created_at is distinct from old.created_at then
  raise exception 'El pacto no se puede modificar una vez registrado.' using errcode='42501';
 end if;
 if gm then
  -- Kuroi decide igual que antes; al cobrar, la fecha la fija el servidor para los 2 días.
  if new.estado='pendiente_pago_confirmacion' then
   if old.estado is distinct from 'pendiente_pago_confirmacion' or new.fecha_pago_solicitado is null then new.fecha_pago_solicitado:=now();end if;
  else new.fecha_pago_solicitado:=null;
  end if;
  return new;
 end if;
 if new.estado is not distinct from old.estado and new.fecha_pago_solicitado is not distinct from old.fecha_pago_solicitado then return new;end if;
 -- Lo único que el jugador puede hacer, tal como ofrecía su pantalla:
 if old.estado='pendiente_aprobacion' and new.estado='aprobada' and old.created_at<now()-interval '5 days' and new.fecha_pago_solicitado is null then return new;end if;
 if old.estado='pendiente_pago_confirmacion' and new.estado='completada' then new.fecha_pago_solicitado:=old.fecha_pago_solicitado;return new;end if;
 if old.estado='pendiente_pago_confirmacion' and new.estado='aprobada' and new.fecha_pago_solicitado is null then return new;end if;
 raise exception 'Solo Kuroi puede cambiar este pacto.' using errcode='42501';
end;$$;
revoke all on function private.deudas_validar() from public,anon,authenticated;
drop trigger if exists deudas_validar on public.deudas_kuroi;
create trigger deudas_validar before insert or update on public.deudas_kuroi for each row execute function private.deudas_validar();
notify pgrst,'reload schema';
commit;
