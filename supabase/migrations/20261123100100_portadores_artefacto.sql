-- Portadores de artefacto (plan «Yunque · una más», paso 3.2).
-- Cada portador recibe una forma propia con un d100 la primera vez que empuña el artefacto; si vuelve a empuñarlo
-- recupera la misma. El GM lee y escribe; el jugador solo lee las filas de sus personajes.
create table if not exists public.portadores_artefacto(
  artefacto_id uuid not null references public.forja_maestra(id) on delete cascade,
  personaje_id bigint not null references public.personajes(id) on delete cascade,
  forma_tirada int not null check (forma_tirada between 1 and 100),
  nivel int not null default 1 check (nivel between 1 and 30),
  absorbidas jsonb not null default '[]'::jsonb check (jsonb_typeof(absorbidas)='array'),
  creado_en timestamptz not null default now(),
  primary key (artefacto_id, personaje_id)
);
create index if not exists portadores_artefacto_personaje on public.portadores_artefacto(personaje_id);
alter table public.portadores_artefacto enable row level security;
drop policy if exists portadores_artefacto_lectura on public.portadores_artefacto;
create policy portadores_artefacto_lectura on public.portadores_artefacto for select to authenticated
  using ((select private.tienda_es_gm()) or exists(select 1 from public.personajes p where p.id=personaje_id and p.user_id=(select auth.uid())));
drop policy if exists portadores_artefacto_gm on public.portadores_artefacto;
create policy portadores_artefacto_gm on public.portadores_artefacto for all to authenticated
  using ((select private.tienda_es_gm())) with check ((select private.tienda_es_gm()));
grant select on public.portadores_artefacto to authenticated;
grant insert, update, delete on public.portadores_artefacto to authenticated;

-- Empuñar: devuelve la forma del portador; la primera vez tira d100 entre las formas aún libres de ese artefacto.
create or replace function public.artefacto_portar(p_artefacto uuid, p_personaje bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.portadores_artefacto; libres int[];
begin
  if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM entrega artefactos.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_artefacto::text, 0));
  select * into v from public.portadores_artefacto where artefacto_id=p_artefacto and personaje_id=p_personaje;
  if found then return jsonb_build_object('forma_tirada',v.forma_tirada,'nivel',v.nivel,'nueva',false); end if;
  select array_agg(t) into libres from generate_series(1,100) t
    where t not in (select forma_tirada from public.portadores_artefacto where artefacto_id=p_artefacto);
  if libres is null then raise exception 'Las 100 formas de este artefacto ya tienen portador.' using errcode='P0001'; end if;
  insert into public.portadores_artefacto(artefacto_id,personaje_id,forma_tirada)
    values (p_artefacto,p_personaje,libres[1+floor(random()*array_length(libres,1))::int])
    returning * into v;
  return jsonb_build_object('forma_tirada',v.forma_tirada,'nivel',v.nivel,'nueva',true);
end $$;
revoke all on function public.artefacto_portar(uuid,bigint) from public, anon;
grant execute on function public.artefacto_portar(uuid,bigint) to authenticated;
