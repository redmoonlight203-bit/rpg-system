begin;
-- Patch only the old full-sequence assignments, retaining custom compositions.
create or replace function private.corregir_origen_espacial(doc jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare resultado jsonb;par record;v jsonb;tecnica text;
begin
 if jsonb_typeof(doc)='array' then
  select coalesce(jsonb_agg(private.corregir_origen_espacial(value) order by ord),'[]') into resultado from jsonb_array_elements(doc) with ordinality a(value,ord);
  return resultado;
 elsif jsonb_typeof(doc)='object' then
  resultado:='{}';
  for par in select * from jsonb_each(doc) loop resultado:=resultado||jsonb_build_object(par.key,private.corregir_origen_espacial(par.value));end loop;
  v:=resultado->'vfx';
  if v->>'impacto' in ('espacial-azul','espacial-rojo','espacial-morado') and not v ? 'lanzamiento' and not v ? 'recorrido' then
   tecnica:=v->>'impacto';
   resultado:=jsonb_set(resultado,'{vfx}',v||jsonb_build_object('lanzamiento',tecnica||'-carga','recorrido',tecnica||'-viaje','impacto',tecnica||'-impacto'));
  end if;
  return resultado;
 end if;
 return doc;
end;$$;
revoke all on function private.corregir_origen_espacial(jsonb) from public,anon,authenticated;
update public.forja_maestra set configuracion_dados=private.corregir_origen_espacial(configuracion_dados)
 where configuracion_dados is distinct from private.corregir_origen_espacial(configuracion_dados);
update public.inventario_jugador set configuracion=private.corregir_origen_espacial(configuracion)
 where configuracion is distinct from private.corregir_origen_espacial(configuracion);
-- Active encounters keep HP, PH, turn, damage, and action history. Refresh visual assignments only.
update public.combates_yugen set datos=private.corregir_origen_espacial(datos),version=version+1,updated_at=now()
 where datos is distinct from private.corregir_origen_espacial(datos);
-- The one-time helper is not a public API.
drop function private.corregir_origen_espacial(jsonb);
commit;
