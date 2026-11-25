-- Grimorio de estados: biblioteca de estados configurables que el GM crea en /dm/estados y reutiliza en
-- cualquier habilidad. Al usarse, la definición se COPIA en efectos[].estado_def de la habilidad, que el motor
-- ya ejecuta; esta tabla no la lee el combate. Todos pueden leerla (tooltips); solo el GM la modifica.
begin;
create table public.estados_personalizados(
 id text primary key check(id ~ '^[a-z_][a-z0-9_]{0,63}$'
  and id not in ('congelado','aturdido','mojado','quemadura','veneno','regeneracion','dominado','control_mental','asustado','hipnotizado','dormido','paralizado','en_trance','guardia','ciego','escarcha','marca_luz')),
 definicion jsonb not null check(jsonb_typeof(definicion)='object' and definicion->>'id'=id
  and length(btrim(coalesce(definicion->>'nombre',''))) between 1 and 120
  and coalesce(definicion->>'categoria','') in ('mental','fisico','elemental','narrativo')
  and jsonb_typeof(definicion->'duracion')='object' and jsonb_typeof(definicion->'efectos')='array'
  and jsonb_array_length(definicion->'efectos')<=8 and pg_column_size(definicion)<=20000),
 color text not null default '#e3c58f' check(color ~ '^#[0-9a-fA-F]{6}$'),
 creado_por uuid default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create function private.estados_personalizados_tocar() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at:=now();return new;end$$;
create trigger tocar before update on public.estados_personalizados for each row execute function private.estados_personalizados_tocar();
alter table public.estados_personalizados enable row level security;
revoke all on public.estados_personalizados from public,anon,authenticated;
grant select,insert,update,delete on public.estados_personalizados to authenticated;
create policy estados_personalizados_lectura on public.estados_personalizados for select to authenticated using(true);
create policy estados_personalizados_gm on public.estados_personalizados for all to authenticated using((select private.tienda_es_gm())) with check((select private.tienda_es_gm()));
create trigger avisar_actualizacion after insert or update or delete on public.estados_personalizados for each statement execute function private.avisar_actualizacion();
notify pgrst,'reload schema';
commit;
