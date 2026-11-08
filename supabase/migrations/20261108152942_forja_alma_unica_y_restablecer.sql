begin;
-- Una reserva por creación, compartida por todas las vías de entrega.
create table public.forja_almas_unicas (
 forja_id uuid primary key references public.forja_maestra(id) on delete cascade,
 copia_id uuid unique,
 user_id uuid references public.perfiles(id) on delete restrict,
 created_at timestamptz not null default now()
);
alter table public.forja_almas_unicas enable row level security;
revoke all on public.forja_almas_unicas from public,anon,authenticated;
grant select on public.forja_almas_unicas to authenticated;
grant all on public.forja_almas_unicas to service_role;
create policy almas_unicas_gm on public.forja_almas_unicas for select to authenticated using ((select private.tienda_es_gm()));

-- No se elige ni se borra una copia arbitrariamente durante la migración.
do $$begin
 if exists(select 1 from public.inventario_jugador i join public.forja_maestra f on f.id=i.forja_id where f.ligado_al_alma group by f.id having count(*)>1) then raise exception 'Hay creaciones del alma duplicadas. Revisa sus copias antes de aplicar la unicidad.';end if;
end;$$;
insert into public.forja_almas_unicas(forja_id,copia_id,user_id)
 select i.forja_id,i.id,i.user_id from public.inventario_jugador i join public.forja_maestra f on f.id=i.forja_id where f.ligado_al_alma;

create function private.alma_reservar_unica() returns trigger language plpgsql security definer set search_path='' as $$
declare ligada boolean;reserva public.forja_almas_unicas%rowtype;
begin
 if TG_OP='UPDATE' and old.ligado_al_alma and (new.forja_id is distinct from old.forja_id or not new.ligado_al_alma) then raise exception 'Restablece la creación desde La Forja para desvincular su copia única.';end if;
 select ligado_al_alma into ligada from public.forja_maestra where id=new.forja_id;
 if not coalesce(ligada,false) and not coalesce(new.ligado_al_alma,false) then return new;end if;
 if new.forja_id is null then raise exception 'Una pertenencia del alma necesita su creación de origen.';end if;
 new.ligado_al_alma:=true;
 perform pg_advisory_xact_lock(hashtextextended('alma-unica:'||new.forja_id::text,0));
 select * into reserva from public.forja_almas_unicas where forja_id=new.forja_id;
 if found and reserva.copia_id is distinct from new.id then raise exception 'Esta creación ligada al alma ya tiene una copia única. Kuroi debe restablecerla antes de volver a entregarla.';end if;
 -- Incluso las entregas indirectas del árbol o de una compra llegan primero al baúl.
 if TG_OP='INSERT' and current_setting('yugen.restaurar_consumo',true) is distinct from new.id::text then new.personaje_id:=null;new.slot_equipado:=null;end if;
 insert into public.forja_almas_unicas(forja_id,copia_id,user_id) values(new.forja_id,new.id,new.user_id)
 on conflict(forja_id) do update set user_id=excluded.user_id;
 return new;
end;$$;
revoke all on function private.alma_reservar_unica() from public,anon,authenticated;
create trigger aab_alma_unica before insert or update on public.inventario_jugador for each row execute function private.alma_reservar_unica();

create function private.alma_plantilla_unica() returns trigger language plpgsql security definer set search_path='' as $$
declare cuenta integer;i public.inventario_jugador%rowtype;
begin
 if TG_OP='DELETE' then
  if old.ligado_al_alma and exists(select 1 from public.forja_almas_unicas where forja_id=old.id) then raise exception 'Restablece la creación antes de eliminar su plantilla.';end if;
  return old;
 end if;
 if TG_OP='UPDATE' and old.ligado_al_alma and not new.ligado_al_alma and exists(select 1 from public.forja_almas_unicas where forja_id=old.id) then raise exception 'Restablece primero la copia ligada al alma.';end if;
 if new.ligado_al_alma and not coalesce(old.ligado_al_alma,false) then
  perform pg_advisory_xact_lock(hashtextextended('alma-unica:'||new.id::text,0));
  select count(*) into cuenta from public.inventario_jugador where forja_id=new.id;
  if cuenta>1 or exists(select 1 from public.forja_instancias where forja_id=new.id) then raise exception 'Retira las copias adicionales o preparadas antes de ligar esta creación al alma.';end if;
  if cuenta=1 then
   select * into i from public.inventario_jugador where forja_id=new.id;
   if exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=i.personaje_id::text) then raise exception 'Termina el encuentro antes de ligar esta pertenencia al alma.';end if;
   update public.inventario_jugador set ligado_al_alma=true,personaje_id=null,slot_equipado=null where id=i.id;
  end if;
 end if;
 return new;
end;$$;
revoke all on function private.alma_plantilla_unica() from public,anon,authenticated;
create trigger alma_plantilla_unica before update or delete on public.forja_maestra for each row execute function private.alma_plantilla_unica();

-- Un alma nunca se fabrica como instancia desechable de un NPC.
create function private.alma_validar_fuente(p_forja uuid) returns void language plpgsql security definer set search_path='' as $$
declare f public.forja_maestra%rowtype;referencias jsonb;
begin
 select * into f from public.forja_maestra where id=p_forja;
 if f.ligado_al_alma then raise exception 'Esta creación es única: entrégala al baúl del alma de una cuenta.';end if;
 referencias:=jsonb_build_array(f.habilidades,f.pasivas,f.equipamiento,to_jsonb(f)->'configuracion_monstruo');
 if exists(select 1 from public.forja_maestra x where x.ligado_al_alma and exists(select 1 from jsonb_path_query(referencias,'strict $.** ? (@.type() == "string")') v where v#>>'{}'=x.id::text)) then raise exception 'El equipo o poder ligado al alma debe prestarse desde el baúl; no puede copiarse con un NPC.';end if;
end;$$;
revoke all on function private.alma_validar_fuente(uuid) from public,anon,authenticated;
create function private.alma_validar_instancia() returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.alma_validar_fuente(new.forja_id);return new;end;$$;
revoke all on function private.alma_validar_instancia() from public,anon,authenticated;
create trigger alma_instancia_unica before insert or update of forja_id on public.forja_instancias for each row execute function private.alma_validar_instancia();

-- Mantiene la preparación original, añadiendo la comprobación antes de crear snapshots.
do $$declare definicion text;begin
 select pg_get_functiondef('public.combate_preparar_personaje(uuid)'::regprocedure) into definicion;
 definicion:=replace(definicion,'public.combate_preparar_personaje(','private.alma_preparar_personaje_base(');
 execute definicion;
end;$$;
alter function private.alma_preparar_personaje_base(uuid) set search_path='';
revoke all on function private.alma_preparar_personaje_base(uuid) from public,anon,authenticated;
create function private.alma_preparar_personaje(p_forja uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede preparar personajes.' using errcode='42501';end if;
 perform private.alma_validar_fuente(p_forja);
 return private.alma_preparar_personaje_base(p_forja);
end;$$;
revoke all on function private.alma_preparar_personaje(uuid) from public,anon;
grant execute on function private.alma_preparar_personaje(uuid) to authenticated;
create or replace function public.combate_preparar_personaje(p_forja uuid) returns jsonb language sql security invoker set search_path='' as $$select private.alma_preparar_personaje(p_forja)$$;

-- La mochila de un NPC tampoco puede fabricar una segunda pieza del alma.
do $$declare definicion text;begin
 select pg_get_functiondef('private.combate_preparar_objeto(uuid)'::regprocedure) into definicion;
 definicion:=replace(definicion,'private.combate_preparar_objeto(','private.alma_preparar_objeto_base(');
 execute definicion;
end;$$;
alter function private.alma_preparar_objeto_base(uuid) set search_path='';
revoke all on function private.alma_preparar_objeto_base(uuid) from public,anon,authenticated;
create or replace function private.combate_preparar_objeto(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede preparar objetos.' using errcode='42501';end if;
 perform private.alma_validar_fuente(p_id);
 return private.alma_preparar_objeto_base(p_id);
end;$$;

create function private.forja_restablecer_alma(p_forja uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.forja_maestra%rowtype;retiradas integer;preparadas integer;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede restablecer una creación del alma.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('alma-unica:'||p_forja::text,0));
 select * into f from public.forja_maestra where id=p_forja and ligado_al_alma for update;
 if not found then raise exception 'Selecciona una creación ligada al alma.';end if;
 if exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and (
  m->>'forja_id'=p_forja::text or exists(select 1 from public.inventario_jugador i where i.forja_id=p_forja and m->>'personaje_id'=i.personaje_id::text)
 )) then raise exception 'Termina o retira el encuentro activo antes de restablecer esta creación.';end if;
 -- Los snapshots del cementerio y encuentros terminados son recuerdos, no copias utilizables.
 delete from public.inventario_jugador where forja_id=p_forja;get diagnostics retiradas=row_count;
 delete from public.forja_instancias where forja_id=p_forja;get diagnostics preparadas=row_count;
 delete from public.forja_almas_unicas where forja_id=p_forja;
 -- Invalida ofertas pendientes: no puede entregarse después de restablecer por una aceptación atrasada.
 update public.tienda_ofertas set estado='retirada',negociador_id=null where forja_id=p_forja and estado in ('disponible','negociando');
 update public.forja_maestra set ubicacion='forja',es_vendible=false where id=p_forja;
 return jsonb_build_object('retiradas',retiradas,'preparadas',preparadas,'disponible',true);
end;$$;
revoke all on function private.forja_restablecer_alma(uuid) from public,anon;
grant execute on function private.forja_restablecer_alma(uuid) to authenticated;
create function public.forja_restablecer_alma(p_forja uuid) returns jsonb language sql security invoker set search_path='' as $$select private.forja_restablecer_alma(p_forja)$$;
revoke all on function public.forja_restablecer_alma(uuid) from public,anon;
grant execute on function public.forja_restablecer_alma(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
