-- Solo administración. Ejecutar en una transacción; primero ensayar en copia.
-- Recupera funciones e historiales previos sin borrar recompensas ni otras tablas.
-- Rechaza restauración si el estado funcional cambió desde el respaldo.
begin;
lock table public.combates_yugen in share row exclusive mode;
do $$declare rec record;begin
 if exists(select 1 from private.estabilizacion_copias c join public.combates_yugen b on c.clave='guia-v2:combate:'||b.id where (b.datos-'historial') is distinct from ((c.contenido->'datos')-'historial')) then raise exception 'El encuentro cambió: revisar recuperación manual.';end if;
 for rec in select t.tgname from pg_trigger t where t.tgrelid='public.combates_yugen'::regclass and t.tgfoid='private.encuentro_validar_ciclo()'::regprocedure loop
  execute format('alter table public.combates_yugen disable trigger %I',rec.tgname);
 end loop;
 update public.combates_yugen b set datos=c.contenido->'datos',version=b.version+1,updated_at=now()
 from private.estabilizacion_copias c where c.clave='guia-v2:combate:'||b.id;
 for rec in select contenido#>>'{}' definicion from private.estabilizacion_copias where clave like 'guia-v2:funcion:%' loop execute rec.definicion;end loop;
 for rec in select t.tgname from pg_trigger t where t.tgrelid='public.combates_yugen'::regclass and t.tgfoid='private.encuentro_validar_ciclo()'::regprocedure loop
  execute format('alter table public.combates_yugen enable trigger %I',rec.tgname);
 end loop;
end;$$;
commit;
