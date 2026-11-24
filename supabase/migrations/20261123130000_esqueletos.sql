-- Esqueletos de armas creados por el GM (plan maestro, Apéndice D · C.6). Los seis esqueletos base viven en
-- lib/esqueletos.ts; esta tabla guarda los nuevos para compartirlos entre creaciones. La definición la valida
-- lib/esqueletos.ts (validarEsqueleto); aquí se comprueba la forma mínima. Idempotente.
create table if not exists public.esqueletos(
  id text primary key check (id ~ '^[a-z_][a-z0-9_]{0,40}$' and id not in ('espada','hacha','lanza','arco','baston','punos')),
  nombre text not null check (length(btrim(nombre)) between 1 and 60),
  definicion jsonb not null check (jsonb_typeof(definicion)='object' and definicion->>'id'=id and jsonb_typeof(definicion->'anclas')='array' and jsonb_typeof(definicion->'fases')='object'),
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now()
);
alter table public.esqueletos enable row level security;
drop policy if exists esqueletos_lectura on public.esqueletos;
create policy esqueletos_lectura on public.esqueletos for select to authenticated using (true);
drop policy if exists esqueletos_gm on public.esqueletos;
create policy esqueletos_gm on public.esqueletos for all to authenticated
  using ((select private.tienda_es_gm())) with check ((select private.tienda_es_gm()));
grant select on public.esqueletos to authenticated;
grant insert, update, delete on public.esqueletos to authenticated;
