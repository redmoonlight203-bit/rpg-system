begin;

-- Conserva el mismo trigger; amplía la validación del JSON sin reescribir creaciones.
create or replace function public.validar_tablero_habilidad(e jsonb) returns void
language plpgsql immutable security invoker set search_path='' as $$
declare
 t jsonb:=e->'tablero';
 d jsonb;
 n numeric;
 par record;
 patron jsonb;
 c jsonb;
 x numeric;
 y numeric;
 clave integer;
 vistas integer[]:=array[]::integer[];
begin
 if not (e ? 'tablero') then return;end if;
 if jsonb_typeof(t) is distinct from 'object' or coalesce(t->>'forma','') not in ('individual','circulo','cuadrado','linea','cono','cruz','personalizada') or coalesce(t->>'afecta','') not in ('enemigos','aliados','todos','yo') or e->>'efecto'='crear_arma' then raise exception 'Configuración de tablero inválida.';end if;
 for par in select * from (values('alcance',0,60),('tamano',0,12)) v(clave,minimo,maximo) loop
  if jsonb_typeof(t->par.clave) is distinct from 'number' then raise exception 'Falta % del tablero.',par.clave;end if;
  n:=(t->>par.clave)::numeric;
  if n<>trunc(n) or n<par.minimo or n>par.maximo then raise exception 'Valor inválido para % del tablero.',par.clave;end if;
 end loop;
 if t->>'forma'='personalizada' then
  if t->>'origen_area' is distinct from 'lanzador' or (t->>'alcance')::numeric<>0
     or (t->>'tamano')::numeric<>0 or t ? 'movimiento_lanzador'
     or e->>'efecto'='desplazamiento' or coalesce(e->'portal'='true'::jsonb,false) then
   raise exception 'El patrón personalizado nace de la casilla del lanzador y no mueve al lanzador.';
  end if;
  patron:=t->'patron';
  if jsonb_typeof(patron) is distinct from 'object'
     or coalesce(patron->>'orientacion','') not in ('fija','apuntar')
     or jsonb_typeof(patron->'casillas') is distinct from 'array' then
   raise exception 'Configura la orientación y dibuja las casillas del patrón.';
  end if;
  if jsonb_array_length(patron->'casillas') not between 1 and 169 then
   raise exception 'Dibuja entre 1 y 169 casillas del patrón.';
  end if;
  for c in select value from jsonb_array_elements(patron->'casillas') loop
   if jsonb_typeof(c) is distinct from 'object'
      or jsonb_typeof(c->'x') is distinct from 'number'
      or jsonb_typeof(c->'y') is distinct from 'number' then
    raise exception 'Cada casilla del patrón requiere dos coordenadas.';
   end if;
   x:=(c->>'x')::numeric;
   y:=(c->>'y')::numeric;
   if x<>trunc(x) or y<>trunc(y) or x not between -6 and 6 or y not between -6 and 6 then
    raise exception 'Las coordenadas del patrón deben ser enteras entre -6 y 6.';
   end if;
   clave:=(x::integer+6)*13+y::integer+6;
   if clave=any(vistas) then raise exception 'El patrón no puede repetir casillas.';end if;
   vistas:=array_append(vistas,clave);
  end loop;
 elsif t->>'forma'<>'individual' and (t->>'tamano')::numeric<1 then
  raise exception 'El área necesita un tamaño de al menos una casilla.';
 end if;
 if t ? 'color' and coalesce(t->>'color','') not in ('azul','rojo','verde','dorado','violeta') then raise exception 'Color del área inválido.';end if;
 if t ? 'desplazamiento' then
  d:=t->'desplazamiento';
  if jsonb_typeof(d) is distinct from 'object' or coalesce(d->>'tipo','') not in ('atraer','empujar') or coalesce(d->>'cuando','') not in ('siempre','fallo_salvacion') or jsonb_typeof(d->'casillas') is distinct from 'number' then raise exception 'Desplazamiento inválido.';end if;
  n:=(d->>'casillas')::numeric;if n<>trunc(n) or n<1 or n>12 then raise exception 'Desplazamiento de 1 a 12 casillas.';end if;
 end if;
 if t ? 'derribo' and coalesce(t->>'derribo','') not in ('siempre','fallo_salvacion') then raise exception 'Derribo inválido.';end if;
 if (t->>'derribo'='fallo_salvacion' or d->>'cuando'='fallo_salvacion') and jsonb_typeof(e->'salvacion') is distinct from 'object' then raise exception 'Configura una salvación para condicionar el desplazamiento o derribo a su fallo.';end if;
end;
$$;

commit;
