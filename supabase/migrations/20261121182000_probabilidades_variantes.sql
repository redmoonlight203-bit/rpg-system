-- Complementa la validación existente de slots, poderes y referencias aprobadas.
create function public.validar_rangos_aparicion() returns trigger
language plpgsql set search_path = '' as $$
declare
 perfil jsonb;
 ranura jsonb;
 ajuste record;
 porcentajes jsonb;
 total numeric;
begin
 for perfil in select value from jsonb_array_elements(new.configuracion_monstruo->'variantes') loop
  for ajuste in select * from jsonb_each(perfil->'rangos') loop
   if ajuste.key in ('nivel','experiencia','exp_total')
     or jsonb_typeof(ajuste.value->'min') is distinct from 'number'
     or jsonb_typeof(ajuste.value->'max') is distinct from 'number'
     or (ajuste.value->>'min')::numeric < 0
     or (ajuste.value->>'max')::numeric not between (ajuste.value->>'min')::numeric and 1000000
   then raise exception 'Rango de variante inválido.'; end if;
  end loop;
  for ranura in select value from jsonb_each(perfil->'equipamiento') loop
   porcentajes:=ranura->'porcentajes';
   if porcentajes is null then continue; end if;
   if ranura->>'modo'<>'catalogo' or jsonb_typeof(porcentajes)<>'object'
      or exists(select 1 from jsonb_array_elements_text(ranura->'opciones') o(id) where not (porcentajes ? o.id))
      or (select count(distinct id) from jsonb_array_elements_text(ranura->'opciones') o(id))<>jsonb_array_length(ranura->'opciones')
   then raise exception 'Revisa la lista de objetos y sus porcentajes.'; end if;
   total:=0;
   for ajuste in select * from jsonb_each(porcentajes) loop
    if not ((ranura->'opciones') ? ajuste.key) or jsonb_typeof(ajuste.value)<>'number'
       or ajuste.value::text::numeric not between 0 and 100 then raise exception 'Porcentaje de objeto inválido.'; end if;
    total:=total+ajuste.value::text::numeric;
   end loop;
   if total>100.000001 then raise exception 'La suma supera el 100 por ciento.'; end if;
  end loop;
 end loop;
 return new;
end;
$$;
revoke all on function public.validar_rangos_aparicion() from public,anon,authenticated;
create trigger validar_rangos_aparicion before insert or update of configuracion_monstruo on public.forja_maestra
for each row execute function public.validar_rangos_aparicion();
