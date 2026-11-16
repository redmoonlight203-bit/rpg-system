begin;
set lock_timeout='1500ms';
-- Imagen de raza (design.md v3): figura de cada raza en la carta de héroe y el equipamiento.
-- Regla del propietario: cada raza nueva debe tener su imagen. Una subraza puede heredar la de su raza
-- superior (Kuro hereda la de Humanos). Las razas existentes sin imagen (Dragones, Hadas) siguen
-- funcionando hasta que se les asigne una; solo se exige al crear una raza o al quitarle la imagen.
alter table public.categorias_forja add column if not exists imagen_url text;
alter table public.categorias_forja drop constraint if exists categorias_imagen_valida;
alter table public.categorias_forja add constraint categorias_imagen_valida check (
 imagen_url is null or (length(imagen_url)<=1000 and imagen_url ~ '^(/arte/razas/[a-z0-9_-]+\.webp|https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/imagenes/[0-9a-f-]{36}/[a-z0-9_/-]+\.(webp|png))$')
);

create or replace function private.categoria_imagen_heredada(p_parent uuid) returns text
language sql stable security definer set search_path='' as $$
 with recursive sube as (
  select c.id,c.parent_id,c.clave,c.imagen_url,array[c.id] vistos from public.categorias_forja c where c.id=p_parent
  union all
  select c.id,c.parent_id,c.clave,c.imagen_url,s.vistos||c.id from public.categorias_forja c join sube s on c.id=s.parent_id where not c.id=any(s.vistos)
 ) select imagen_url from sube where imagen_url is not null and clave<>'razas' limit 1
$$;
revoke all on function private.categoria_imagen_heredada(uuid) from public,anon,authenticated;

create or replace function private.categoria_es_raza(p_parent uuid) returns boolean
language sql stable security definer set search_path='' as $$
 with recursive sube as (
  select c.id,c.parent_id,c.clave,array[c.id] vistos from public.categorias_forja c where c.id=p_parent
  union all
  select c.id,c.parent_id,c.clave,s.vistos||c.id from public.categorias_forja c join sube s on c.id=s.parent_id where not c.id=any(s.vistos)
 ) select exists(select 1 from sube where clave='razas')
$$;
revoke all on function private.categoria_es_raza(uuid) from public,anon,authenticated;

create or replace function private.categoria_validar_imagen() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.parent_id is null or not private.categoria_es_raza(new.parent_id) then return new;end if;
 if new.imagen_url is not null or private.categoria_imagen_heredada(new.parent_id) is not null then return new;end if;
 if tg_op='INSERT' or old.imagen_url is not null or new.parent_id is distinct from old.parent_id then
  raise exception 'Cada raza nueva necesita su imagen. Súbela antes de guardar.' using errcode='23514';
 end if;
 return new;
end;$$;
revoke all on function private.categoria_validar_imagen() from public,anon,authenticated;
drop trigger if exists categoria_validar_imagen on public.categorias_forja;
create trigger categoria_validar_imagen before insert or update of imagen_url,parent_id on public.categorias_forja
 for each row execute function private.categoria_validar_imagen();

-- Imágenes entregadas por el propietario el 16-11-2026 (adaptadas: figura central sin los huecos dibujados).
update public.categorias_forja set imagen_url='/arte/razas/humanos.webp' where clave='personajes' and imagen_url is null;
update public.categorias_forja set imagen_url='/arte/razas/elfos.webp' where clave='elfos' and imagen_url is null;
update public.categorias_forja set imagen_url='/arte/razas/enanos.webp' where clave='enanos' and imagen_url is null;
update public.categorias_forja set imagen_url='/arte/razas/hombres-bestia.webp' where clave='hombres_bestia' and imagen_url is null;
update public.categorias_forja set imagen_url='/arte/razas/gigantes.webp' where clave='gigantes' and imagen_url is null;
notify pgrst,'reload schema';
commit;
