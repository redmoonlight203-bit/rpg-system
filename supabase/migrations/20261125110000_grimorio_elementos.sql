-- Grimorio de elementos: variantes de los elementos base (fuego, agua, rayo, hielo, luz sagrada) que el GM crea en
-- /dm/elementos. Al usarse, la habilidad guarda elemento=<base> (las validaciones existentes no cambian) y una copia
-- en efectos[].elemento_def que el motor ejecuta. Lectura para todos; escritura solo GM.
begin;
create table public.elementos_personalizados(
 id text primary key check(id ~ '^[a-z_][a-z0-9_]{0,63}$' and id not in ('ninguno','cualquiera','fuego','agua','electricidad','hielo','luz_sagrada')),
 definicion jsonb not null check(jsonb_typeof(definicion)='object' and definicion->>'id'=id
  and length(btrim(coalesce(definicion->>'nombre',''))) between 1 and 120
  and coalesce(definicion->>'base','') in ('fuego','agua','electricidad','hielo','luz_sagrada')
  and pg_column_size(definicion)<=20000),
 color text not null default '#e8643c' check(color ~ '^#[0-9a-fA-F]{6}$'),
 creado_por uuid default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create trigger tocar before update on public.elementos_personalizados for each row execute function private.estados_personalizados_tocar();
alter table public.elementos_personalizados enable row level security;
revoke all on public.elementos_personalizados from public,anon,authenticated;
grant select,insert,update,delete on public.elementos_personalizados to authenticated;
create policy elementos_personalizados_lectura on public.elementos_personalizados for select to authenticated using(true);
create policy elementos_personalizados_gm on public.elementos_personalizados for all to authenticated using((select private.tienda_es_gm())) with check((select private.tienda_es_gm()));
create trigger avisar_actualizacion after insert or update or delete on public.elementos_personalizados for each statement execute function private.avisar_actualizacion();
notify pgrst,'reload schema';
commit;
