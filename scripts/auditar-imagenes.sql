-- Solo lectura. Ejecutar en psql: genera y ejecuta una consulta por columna.
-- No imprime imágenes ni contenido de las filas.
select format(
 'select %L as tabla, %L as columna, count(*) as filas from %I.%I where strpos(%I::text, ''data:image/'') > 0 having count(*) > 0;',
 table_name,column_name,table_schema,table_name,column_name)
from information_schema.columns
where table_schema='public' and data_type in ('json','jsonb','text','character varying')
order by table_name,ordinal_position
\gexec
