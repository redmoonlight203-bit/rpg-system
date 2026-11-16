-- Solo lectura. Ejecutar en el SQL Editor de Supabase ANTES de aplicar
-- supabase/migrations/20261116130000_consolidar_funciones_combate.sql.
-- Si las tres filas dicen «coincide», la migración se aplicará sin cambiar nada.
-- Si alguna dice «DISTINTA», no aplicar: copiar pg_get_functiondef de esa función y actualizar la migración.
-- Hashes calculados sobre la cadena real de migraciones del repositorio (prueba consolidacion-funciones-database.mjs).
with esperado(funcion,hash,config) as (values
 ('public.combate_guardar_ligero','dfba2f2f5fce9a070db2e3f1cba19c76','search_path="" | lock_timeout=1500ms'),
 ('yugen_interno.confirmar_jugador_rapido','4038ef9f298778d0ab0834d8105b0248','search_path="" | lock_timeout=1500ms'),
 ('public.combate_eliminar','7387d4396b660f14e254d48069ed9989','search_path=public, pg_temp'))
select e.funcion,
 case when md5(p.prosrc)=e.hash then 'coincide' else 'DISTINTA (cuerpo)' end as cuerpo,
 case when array_to_string(p.proconfig,' | ')=e.config then 'coincide' else 'DISTINTA: '||coalesce(array_to_string(p.proconfig,' | '),'(sin config)') end as configuracion,
 p.prosecdef as security_definer
from esperado e
left join pg_proc p on p.pronamespace::regnamespace||'.'||p.proname=e.funcion
order by 1;
