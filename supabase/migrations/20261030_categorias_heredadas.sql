-- Ejecutar una vez en el SQL Editor de Supabase antes de usar la herencia.
-- No elimina ni renombra categorías, atributos o creaciones existentes.
begin;
alter table public.categorias_forja
  add column if not exists parent_id uuid references public.categorias_forja(id) on delete restrict;
create index if not exists categorias_forja_parent_idx on public.categorias_forja(parent_id);

-- Valida también las escrituras ajenas a la interfaz y evita ciclos concurrentes.
create or replace function public.validar_padre_categoria_yugen()
returns trigger language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(180631, 1);
  if new.parent_id is not null and exists (
    with recursive ancestros as (
      select id, parent_id, array[id] as camino from public.categorias_forja where id = new.parent_id
      union all
      select c.id, c.parent_id, a.camino || c.id
      from public.categorias_forja c join ancestros a on c.id = a.parent_id
      where not c.id = any(a.camino)
    ) select 1 from ancestros where id = new.id
  ) then
    raise exception 'Una categoría no puede heredar de sí misma ni de sus descendientes.';
  end if;
  return new;
end;
$$;
drop trigger if exists categorias_forja_validar_padre on public.categorias_forja;
create trigger categorias_forja_validar_padre before insert or update of parent_id
on public.categorias_forja for each row execute function public.validar_padre_categoria_yugen();

-- Grupo común. Los ceros son valores sin configurar, no cifras de balance.
insert into public.categorias_forja (clave, nombre, descripcion)
select 'razas', 'Razas', 'Atributos generales compartidos por las razas de Yugen.'
where not exists (select 1 from public.categorias_forja where clave = 'razas');
insert into public.config_estadisticas (categoria, clave, etiqueta, descripcion, valor_defecto)
select 'razas', s.clave, s.etiqueta, s.descripcion, 0
from (values
  ('vida', 'Vida', 'Capacidad de vida del personaje.'),
  ('armadura', 'Armadura', 'Armadura del personaje.'),
  ('ph', 'PH', 'Puntos de habilidad del personaje.'),
  ('fatiga', 'Fatiga', 'Fatiga del personaje; su interpretación se define en las reglas.')
) as s(clave, etiqueta, descripcion)
where not exists (select 1 from public.config_estadisticas e where e.categoria = 'razas' and e.clave = s.clave);
commit;
