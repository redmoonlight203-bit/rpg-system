begin;
-- The death transaction uses the existing internal equipment permission only while returning soul belongings.
create or replace function private.personaje_archivar() returns trigger language plpgsql security definer set search_path='' as $$
declare permiso_anterior text;
begin
 if new.estado_vida='muerto' then
  insert into public.cementerio_personajes(personaje_id,user_id,nombre,snapshot) values(new.id,new.user_id,new.nombre,jsonb_build_object('personaje',to_jsonb(new),'inventario',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at,i.id) from public.inventario_jugador i where i.personaje_id=new.id and i.user_id=new.user_id),'[]'::jsonb))) on conflict(personaje_id) do nothing;
  -- Snapshot first, then return soul-bound belongings to the account exactly once.
  permiso_anterior:=current_setting('yugen.equipo_interno',true);
  perform set_config('yugen.equipo_interno',new.id::text,true);
  update public.inventario_jugador set personaje_id=null,slot_equipado=null where personaje_id=new.id and user_id=new.user_id and ligado_al_alma;
  perform set_config('yugen.equipo_interno',coalesce(permiso_anterior,''),true);
 end if;
 return new;
end;$$;
commit;
