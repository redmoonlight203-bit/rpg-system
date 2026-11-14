-- Solo administración, después de ensayar en copia. Conserva imágenes públicas.
begin;
set local lock_timeout='5s';
lock table public.combates_yugen,public.resultados_encuentro,public.forja_maestra,public.inventario_jugador in share row exclusive mode;
do $$declare ciclo text;progreso text;rec record;actual jsonb;tabla text;ident text;viejo text;begin
 for rec in select clave,contenido from private.estabilizacion_copias where clave like 'imagenes-v2:%' and clave not like 'imagenes-v2:funcion:%' loop
  tabla:=split_part(rec.clave,':',2);ident:=split_part(rec.clave,':',3);
  execute format('select to_jsonb(t) from public.%I t where %I::text=$1',tabla,case when tabla='resultados_encuentro' then 'combate_id' else 'id' end) into actual using ident;
  if private.imagenes_a_storage(rec.contenido)-'version'-'updated_at' is distinct from actual-'version'-'updated_at' then raise exception 'La fila cambió después de migrar: %',rec.clave;end if;
 end loop;
 ciclo:=pg_get_functiondef('private.encuentro_validar_ciclo()'::regprocedure);progreso:=pg_get_functiondef('public.combate_proteger_progreso()'::regprocedure);
 viejo:='and (new.datos-''historial'') is distinct from (old.datos-''historial'')';
 if strpos(ciclo,viejo)=0 or strpos(progreso,'new.datos is distinct from old.datos')=0 then raise exception 'Controles desconocidos';end if;
 execute replace(ciclo,viejo,'and private.imagenes_a_storage(new.datos-''historial'') is distinct from private.imagenes_a_storage(old.datos-''historial'')');
 execute replace(progreso,'new.datos is distinct from old.datos','private.imagenes_a_storage(new.datos) is distinct from private.imagenes_a_storage(old.datos)');
 for tabla in select unnest(array['forja_maestra','inventario_jugador','combates_yugen','resultados_encuentro']) loop
  execute format('drop trigger aaaa_sin_imagenes_embebidas on public.%I',tabla);
 end loop;
 update public.forja_maestra f set imagen_url=c.contenido->>'imagen_url',configuracion_dados=c.contenido->'configuracion_dados'
 from private.estabilizacion_copias c where c.clave='imagenes-v2:forja_maestra:'||f.id;
 update public.inventario_jugador i set imagen_url=c.contenido->>'imagen_url'
 from private.estabilizacion_copias c where c.clave='imagenes-v2:inventario_jugador:'||i.id;
 update public.combates_yugen b set datos=c.contenido->'datos',version=b.version+1,updated_at=now()
 from private.estabilizacion_copias c where c.clave='imagenes-v2:combates_yugen:'||b.id;
 update public.resultados_encuentro r set datos=c.contenido->'datos'
 from private.estabilizacion_copias c where c.clave='imagenes-v2:resultados_encuentro:'||r.combate_id;
 execute ciclo;execute progreso;
end;$$;
commit;
