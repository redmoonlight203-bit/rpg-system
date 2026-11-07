begin;

-- Heredado por todas las razas y por todos los monstruos. No sustituye valores propios.
insert into public.config_estadisticas(categoria,clave,etiqueta,descripcion,valor_defecto,limite_jugador)
select c.clave,'movimiento','Movimiento (casillas)','Casillas de movimiento por turno. Cada paso horizontal o vertical cuesta 1. Mover no consume la acción. Levantarse de un derribo cuesta la mitad del movimiento máximo.',6,6
from public.categorias_forja c where c.clave in ('razas','monstruos')
and not exists(select 1 from public.config_estadisticas s where s.categoria=c.clave and s.clave='movimiento');

create or replace function public.validar_tablero_habilidad(e jsonb) returns void
language plpgsql immutable security invoker set search_path='' as $$
declare t jsonb:=e->'tablero'; d jsonb; n numeric; par record;
begin
 if not (e ? 'tablero') then return;end if;
 if jsonb_typeof(t) is distinct from 'object' or coalesce(t->>'forma','') not in ('individual','circulo','cuadrado','linea','cono','cruz') or coalesce(t->>'afecta','') not in ('enemigos','aliados','todos','yo') or e->>'efecto'='crear_arma' then raise exception 'Configuración de tablero inválida.';end if;
 for par in select * from (values('alcance',0,60),('tamano',0,12)) v(clave,minimo,maximo) loop
  if jsonb_typeof(t->par.clave) is distinct from 'number' then raise exception 'Falta % del tablero.',par.clave;end if;
  n:=(t->>par.clave)::numeric;
  if n<>trunc(n) or n<par.minimo or n>par.maximo then raise exception 'Valor inválido para % del tablero.',par.clave;end if;
 end loop;
 if t->>'forma'<>'individual' and (t->>'tamano')::numeric<1 then raise exception 'El área necesita un tamaño de al menos una casilla.';end if;
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
create or replace function public.forja_validar_tablero() returns trigger
language plpgsql security invoker set search_path='' as $$
declare e jsonb;
begin
 for e in select value from jsonb_array_elements(new.configuracion_dados) loop perform public.validar_tablero_habilidad(e);end loop;
 return new;
end;
$$;
drop trigger if exists forja_validar_tablero on public.forja_maestra;
create trigger forja_validar_tablero before insert or update of configuracion_dados on public.forja_maestra
for each row execute function public.forja_validar_tablero();
commit;
