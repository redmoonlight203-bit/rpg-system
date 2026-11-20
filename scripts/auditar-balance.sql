-- Consultas diagnósticas. Ejecutar con un rol autorizado de solo lectura.
-- No se recuperan identidades de jugadores ni contenido completo de fichas.
begin transaction isolation level repeatable read read only;

select clave, count(*) as registros
from public.categorias_forja
group by clave
having count(*) > 1
order by clave;

select categoria, clave, count(*) as registros
from public.config_estadisticas
group by categoria, clave
having count(*) > 1
order by categoria, clave;

select c.clave as categoria, p.clave as padre, e.clave, e.etiqueta,
       e.valor_defecto, e.limite_jugador
from public.config_estadisticas e
left join public.categorias_forja c on c.clave = e.categoria
left join public.categorias_forja p on p.id = c.parent_id
order by e.categoria, e.clave;

with valores as (
  select 'forja_maestra' as origen, c.tipo_creacion as tipo, v.key as clave, v.value
  from public.forja_maestra c
  cross join lateral jsonb_each(case when jsonb_typeof(c.stats) = 'object' then c.stats else '{}'::jsonb end) v
  union all
  select 'inventario_jugador', i.tipo, v.key, v.value
  from public.inventario_jugador i
  cross join lateral jsonb_each(case when jsonb_typeof(i.stats) = 'object' then i.stats else '{}'::jsonb end) v
)
select origen, tipo, clave, jsonb_typeof(value) as tipo_json, count(*) as registros,
       min(case when jsonb_typeof(value) = 'number' then value::numeric end) as minimo,
       max(case when jsonb_typeof(value) = 'number' then value::numeric end) as maximo
from valores
group by origen, tipo, clave, jsonb_typeof(value)
order by origen, tipo, clave, tipo_json;

with tablas as (
  select 'forja_maestra' as origen, tipo_creacion as tipo, stats -> 'peso' as peso
  from public.forja_maestra where tipo_creacion = 'objeto'
  union all
  select 'inventario_con_personaje', tipo, stats -> 'peso'
  from public.inventario_jugador where personaje_id is not null
  union all
  select 'inventario_sin_personaje', tipo, stats -> 'peso'
  from public.inventario_jugador where personaje_id is null
)
select origen, tipo, count(*) as filas,
       count(*) filter (where peso is null) as sin_peso,
       count(*) filter (where case when jsonb_typeof(peso) = 'number' then peso::numeric < 0 else peso is not null end) as peso_invalido,
       count(*) filter (where peso = '0'::jsonb) as peso_cero,
       min(case when jsonb_typeof(peso) = 'number' then peso::numeric end) as minimo,
       max(case when jsonb_typeof(peso) = 'number' then peso::numeric end) as maximo,
       'pendiente de confirmar' as unidad_historica
from tablas
group by origen, tipo
order by origen, tipo;

rollback;
