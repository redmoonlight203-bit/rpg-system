-- Validación de nivel mínimo en toda la tubería, incluyendo RPCs y snapshots.
create or replace function public.forja_validar_requisitos(r jsonb)
returns void language plpgsql immutable set search_path=public,pg_temp as $$
declare p record;v jsonb;
begin
 if jsonb_typeof(r) is distinct from 'object' then raise exception 'Requisitos inválidos.'; end if;
 if r ? 'razas' then
   if jsonb_typeof(r->'razas') is distinct from 'array' or jsonb_array_length(r->'razas')>50 then raise exception 'Razas inválidas.'; end if;
   for v in select value from jsonb_array_elements(r->'razas') loop
     if jsonb_typeof(v) is distinct from 'string' or length(btrim(v#>>'{}')) not between 1 and 100 then raise exception 'Raza inválida.';end if;
   end loop;
 end if;
 if r ? 'minimos' then
   if jsonb_typeof(r->'minimos') is distinct from 'object' or (select count(*) from jsonb_object_keys(r->'minimos'))>50 then raise exception 'Mínimos inválidos.';end if;
   for p in select * from jsonb_each(r->'minimos') loop
     if p.key!~'^[a-z_][a-z0-9_]{0,63}$' or jsonb_typeof(p.value) is distinct from 'number' or (p.value::text)::numeric not between 0 and 1000000 then raise exception 'Atributo o mínimo inválido.';end if;
   end loop;
 end if;
 if r ? 'nivel_minimo' then
   if jsonb_typeof(r->'nivel_minimo') is distinct from 'number' then raise exception 'Nivel mínimo inválido.';end if;
   if (r->>'nivel_minimo')::numeric<>trunc((r->>'nivel_minimo')::numeric)
      or (r->>'nivel_minimo')::numeric not between 1 and 100 then raise exception 'Nivel mínimo inválido.';end if;
 end if;
end $$;

create or replace function public.forja_cumple_requisitos(r jsonb, raza text, stats jsonb)
returns boolean language plpgsql stable set search_path=public,pg_temp as $$
declare p record;v text;claves text[];cumple boolean:=false;s jsonb:=coalesce(stats,'{}'::jsonb);
begin
 if r is null then return true;end if;
 perform public.forja_validar_requisitos(r);
 if not s ? 'vida' and s ? 'hp' then s:=s||jsonb_build_object('vida',s->'hp');end if;
 if r ? 'nivel_minimo' and coalesce((s->>'nivel')::integer,1)<(r->>'nivel_minimo')::integer then return false;end if;
 if jsonb_array_length(coalesce(r->'razas','[]'::jsonb))>0 then
   claves:=array_append(public.forja_linaje_claves(raza),raza);
   for v in select jsonb_array_elements_text(r->'razas') loop
     if exists(select 1 from unnest(claves) k where lower(trim(k))=lower(trim(v))) then cumple:=true;end if;
   end loop;
   if not cumple then return false;end if;
 end if;
 for p in select * from jsonb_each_text(coalesce(r->'minimos','{}'::jsonb)) loop
   if coalesce((s->>p.key)::numeric,0)<p.value::numeric then return false;end if;
 end loop;
 return true;
end $$;
do $$
declare definicion text;
begin
 -- Las configuraciones y el combate usan una función compartida: aportar nivel sin reescribirla.
 select pg_get_functiondef(p.oid) into definicion from pg_proc p
 join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='yugen_interno' and p.proname='preparar_jugador';
 if definicion is null or position('s:=coalesce(p.atributos,''{}'');' in definicion)=0 then
   raise exception 'No se reconoce preparar_jugador; actualización de nivel cancelada.';
 end if;
 definicion:=replace(definicion,'s:=coalesce(p.atributos,''{}'');',
   's:=coalesce(p.atributos,''{}'')||jsonb_build_object(''nivel'',p.nivel);');
 execute definicion;

 select pg_get_functiondef(p.oid) into definicion from pg_proc p
 join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='progresion_opciones';
 if definicion is null or position('public.forja_cumple_requisitos(f.requisitos_uso,p.raza,p.atributos)' in definicion)=0 then
   raise exception 'No se reconoce progresion_opciones; actualización de nivel cancelada.';
 end if;
 definicion:=replace(definicion,
   'public.forja_cumple_requisitos(f.requisitos_uso,p.raza,p.atributos)',
   'public.forja_cumple_requisitos(f.requisitos_uso,p.raza,coalesce(p.atributos,''{}''::jsonb)||jsonb_build_object(''nivel'',p.nivel_eleccion))');
 execute definicion;
end $$;
