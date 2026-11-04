-- Validate the additive table without replacing the existing creation validator.
create or replace function public.forja_validar_tabla_armas(e jsonb)
returns void language plpgsql set search_path=public,pg_temp as $$
declare t jsonb; r jsonb; par record; n numeric; caras integer; vistas integer[] := '{}';
begin
 if not e ? 'tabla_armas' then return; end if;
 t:=e->'tabla_armas';
 if e->>'efecto' is distinct from 'crear_arma' or jsonb_typeof(t) is distinct from 'object' or jsonb_typeof(t->'caras') is distinct from 'number' then raise exception 'Tabla de armas inválida.';end if;
 n:=(t->>'caras')::numeric;
 if n<>trunc(n) or n not between 2 and 100 then raise exception 'El dado de selección debe tener entre 2 y 100 caras.';end if;
 caras:=n;
 if jsonb_typeof(t->'resultados') is distinct from 'array' or jsonb_array_length(t->'resultados')<>caras then raise exception 'Asigna un arma a cada cara del dado.';end if;
 for r in select value from jsonb_array_elements(t->'resultados') loop
  for par in select * from (values('cara',1,caras),('cantidad',1,100),('caras',2,1000),('modificador',-1000000,1000000)) v(clave,minimo,maximo) loop
   if jsonb_typeof(r->par.clave) is distinct from 'number' then raise exception 'Falta un número en el resultado: %.',par.clave;end if;
   n:=(r->>par.clave)::numeric;
   if n<>trunc(n) or n not between par.minimo and par.maximo then raise exception 'Valor inválido: %.',par.clave;end if;
  end loop;
  if (r->>'cara')::integer=any(vistas) then raise exception 'Una cara no puede repetirse.';end if;
  vistas:=array_append(vistas,(r->>'cara')::integer);
  if jsonb_typeof(r->'nombre') is distinct from 'string' or length(btrim(r->>'nombre')) not between 1 and 120 or coalesce(r->>'arma_slot','') not in ('mano_der','mano_izq','dos_manos') then raise exception 'Cada resultado necesita nombre y mano válidos.';end if;
  if r ? 'elemento' and coalesce(r->>'elemento','') not in ('ninguno','fuego','agua','hielo','electricidad','luz_sagrada') then raise exception 'Elemento de arma inválido.';end if;
 end loop;
end;$$;
create or replace function public.forja_validar_tablas_armas()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare e jsonb;
begin
 for e in select value from jsonb_array_elements(new.configuracion_dados) loop
  perform public.forja_validar_tabla_armas(e);
 end loop;
 return new;
end;$$;
create trigger forja_validar_tablas_armas before insert or update of configuracion_dados
on public.forja_maestra for each row execute function public.forja_validar_tablas_armas();
