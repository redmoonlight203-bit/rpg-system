begin;
create or replace function public.validar_transformacion(e jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare d jsonb:=e->'transformacion';et jsonb;kv record;ids text[]:='{}';
begin
 if jsonb_typeof(d) is distinct from 'object' or coalesce(d->>'tipo','') not in ('forma','poder') or length(btrim(coalesce(d->>'id',''))) not between 1 and 100 or length(btrim(coalesce(d->>'nombre',''))) not between 1 and 120 then raise exception 'Transformación inválida.';end if;
 if jsonb_typeof(d->'etapas') is distinct from 'array' or jsonb_array_length(d->'etapas') not between 1 and 12 then raise exception 'Configura de una a doce etapas.';end if;
 for et in select value from jsonb_array_elements(d->'etapas') loop
  if length(btrim(coalesce(et->>'id',''))) not between 1 and 100 or et->>'id'=any(ids) or length(btrim(coalesce(et->>'nombre',''))) not between 1 and 120 then raise exception 'Etapa inválida o repetida.';end if;
  ids:=array_append(ids,et->>'id');
  if jsonb_typeof(et->'stats') is distinct from 'object' or et->'stats'='{}'::jsonb then raise exception 'Configura estadísticas de la etapa.';end if;
  for kv in select * from jsonb_each(et->'stats') loop
   if kv.key!~'^[a-z_][a-z0-9_]{0,63}$' or jsonb_typeof(kv.value) is distinct from 'number' then raise exception 'Estadística de forma inválida.';end if;
   if (kv.value::text)::numeric not between 0 and 1000000 then raise exception 'Estadística fuera de rango.';end if;
  end loop;
  if d->>'tipo'='forma' and coalesce((et->'stats'->>'vida')::numeric,(et->'stats'->>'hp')::numeric,0)<=0 then raise exception 'Cada forma necesita vida propia.';end if;
  if et ? 'habilidades' then
   if jsonb_typeof(et->'habilidades') is distinct from 'array' then raise exception 'Poderes de etapa inválidos.';end if;
   if exists(select 1 from jsonb_array_elements(et->'habilidades') h where jsonb_typeof(h)<>'string' or length(h#>>'{}') not between 1 and 100) then raise exception 'Poderes de etapa inválidos.';end if;
  end if;
 end loop;
end;$$;
revoke all on function public.validar_transformacion(jsonb) from public,anon;
grant execute on function public.validar_transformacion(jsonb) to authenticated;
do $$ declare f text; firma text; begin
 foreach firma in array array['public.validar_configuracion_creacion()','public.naturaleza_validar_efectos(jsonb)'] loop
  f:=pg_get_functiondef(firma::regprocedure);
  if position($old$'estado','crear_arma')$old$ in f)=0 then raise exception 'Validación cambió: %',firma;end if;
  f:=replace(f,$old$'estado','crear_arma')$old$,$new$'estado','crear_arma','transformacion')$new$);
  f:=replace(f,'  for par in select * from (values(''cantidad''','  if e->>''efecto''=''transformacion'' then perform public.validar_transformacion(e);end if;'||chr(10)||'  for par in select * from (values(''cantidad''');
  execute f;
 end loop;
 f:=pg_get_functiondef('private.combate_persistir_vitales()'::regprocedure);
 f:=replace(f,'v:=greatest(0,(m->>''vida'')::numeric);','v:=greatest(0,case when m->''transformacion''->>''tipo''=''forma'' then (m->''transformacion''->>''vida_original'')::numeric else (m->>''vida'')::numeric end);');
 f:=replace(f,'coalesce((m->''stats''->>''vida'')::numeric,(m->''stats''->>''hp'')::numeric,1)','coalesce((m->''transformacion''->''stats_originales''->>''vida'')::numeric,(m->''transformacion''->''stats_originales''->>''hp'')::numeric,(m->''stats''->>''vida'')::numeric,(m->''stats''->>''hp'')::numeric,1)');
 execute f;
end;$$;
commit;
