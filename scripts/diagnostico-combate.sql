-- Diagnóstico sin modificar datos. Ejecutar bloques 1–4 en SQL Editor.
-- 1. Tamaños lógicos (no confundir con tamaño comprimido en disco).
select id,nombre,datos->>'fase' as fase,octet_length(datos::text) as bytes,
 octet_length(coalesce(datos->'historial','[]')::text) as historial_bytes,
 octet_length((datos-'historial')::text) as respuesta_datos_bytes,
 jsonb_array_length(coalesce(datos->'miembros','[]')) as miembros
from public.combates_yugen order by bytes desc;
-- 2. Triggers reales.
select event_object_table,trigger_name,action_timing,event_manipulation
from information_schema.triggers where trigger_schema='public' order by 1,2;
-- 3. Sesiones activas; no muestra texto de consultas de otros usuarios.
select pid,state,wait_event_type,wait_event,clock_timestamp()-query_start as duracion
from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid();
-- 4. Retención y volumen.
select relname,n_live_tup,n_dead_tup from pg_stat_user_tables
where relname in ('combate_acciones','combate_actualizaciones','avisos_actualizacion');
-- 5. SOLO EN UNA COPIA RESTAURADA: EXPLAIN ANALYZE ejecuta la escritura y sus triggers.
-- No activar en producción: un rollback no garantiza revertir efectos externos.
-- begin;
-- explain (analyze,buffers,wal,format json)
-- update public.combates_yugen set datos=datos where id='UUID_DE_ENCUENTRO_DE_PRUEBA';
-- rollback;
-- Este UPDATE mide una escritura sin cambios, no sustituye la medición de ataque/movimiento.
-- Registrar ambos escenarios con el mismo encuentro y carga, antes y después.
