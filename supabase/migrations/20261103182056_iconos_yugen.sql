-- Stable icon IDs, rendered by the application. Existing images remain unchanged.
alter table public.categorias_forja add column if not exists icono text;
alter table public.forja_maestra add column if not exists icono text;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='categorias_forja_icono_formato' and conrelid='public.categorias_forja'::regclass) then
  alter table public.categorias_forja add constraint categorias_forja_icono_formato check(icono is null or icono ~ '^[a-z][a-z0-9_-]{0,63}$');
 end if;
 if not exists(select 1 from pg_constraint where conname='forja_maestra_icono_formato' and conrelid='public.forja_maestra'::regclass) then
  alter table public.forja_maestra add constraint forja_maestra_icono_formato check(icono is null or icono ~ '^[a-z][a-z0-9_-]{0,63}$');
 end if;
end $$;
with recursive razas as (
 select id from public.categorias_forja where clave='razas'
 union
 select c.id from public.categorias_forja c join razas r on c.parent_id=r.id
)
update public.categorias_forja c set icono=case lower(c.nombre)
 when 'humanos' then 'humano' when 'enanos' then 'enano'
 when 'elfos' then 'elfo' when 'dragones' then 'dragon' end
where c.id in(select id from razas) and c.icono is null
 and lower(c.nombre) in('humanos','enanos','elfos','dragones');
notify pgrst, 'reload schema';
