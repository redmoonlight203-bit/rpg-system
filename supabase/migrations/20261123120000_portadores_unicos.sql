-- Pendiente 4 del plan «Yunque · una más»: la base impide dos portadores con la misma forma
-- y solo deja empuñar objetos que son artefactos. Idempotente.
do $$ begin
  if not exists (select 1 from pg_constraint where conname='portadores_artefacto_forma_unica') then
    alter table public.portadores_artefacto add constraint portadores_artefacto_forma_unica unique (artefacto_id, forma_tirada);
  end if;
end $$;

create or replace function public.artefacto_portar(p_artefacto uuid, p_personaje bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.portadores_artefacto; libres int[];
begin
  if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM entrega artefactos.' using errcode='42501'; end if;
  if not exists (select 1 from public.forja_maestra f where f.id=p_artefacto and f.configuracion_artefacto is not null) then
    raise exception 'Ese objeto no es un artefacto.' using errcode='P0001';
  end if;
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
