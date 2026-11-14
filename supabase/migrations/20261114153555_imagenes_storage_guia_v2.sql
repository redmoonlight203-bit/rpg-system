-- Nueve imágenes autorizadas por el propietario el 2026-11-14.
-- Los archivos públicos se comprobaron por SHA-256 antes de sustituir referencias.
set local lock_timeout='5s';
create table private.imagenes_storage_catalogo(data_md5 text primary key,contenido_sha256 text not null,url text not null unique,bytes integer not null);
alter table private.imagenes_storage_catalogo enable row level security;
revoke all on private.imagenes_storage_catalogo from public,anon,authenticated;
insert into private.imagenes_storage_catalogo values
('9736ee65d045b5ca6553f9d56bdf9b9b','236fd28f27e518aa8fd7c2766755f81fbbda76ee5ec662c2d2f03407e75e9c48','https://yzvpahcjbuotnqjmbkeu.supabase.co/storage/v1/object/public/imagenes/migracion-guia-v2/236fd28f27e518aa8fd7c2766755f81fbbda76ee5ec662c2d2f03407e75e9c48.webp',155472),
('2bb3ac03deffa29334261232959a96d2','89c06209f48d24ff9cf3e113bd6e128f1f554cd475e9dc4f7484edd30cd09b80','https://yzvpahcjbuotnqjmbkeu.supabase.co/storage/v1/object/public/imagenes/migracion-guia-v2/89c06209f48d24ff9cf3e113bd6e128f1f554cd475e9dc4f7484edd30cd09b80.webp',179600),
('5f4da80c720f936861b0644a3567c5c9','65389d38e50b1ec6faa885046776c18e2fc5be9e48c67a1cbb5093745bd17c5a','https://yzvpahcjbuotnqjmbkeu.supabase.co/storage/v1/object/public/imagenes/migracion-guia-v2/65389d38e50b1ec6faa885046776c18e2fc5be9e48c67a1cbb5093745bd17c5a.webp',181464),
('ca846daa1a7ccae6efde158f7583d7ed','9ea7e7a2e5cbf162fbdded45e0ad0e9fa843cbf61f5d1311c833ab001172f792','https://yzvpahcjbuotnqjmbkeu.supabase.co/storage/v1/object/public/imagenes/migracion-guia-v2/9ea7e7a2e5cbf162fbdded45e0ad0e9fa843cbf61f5d1311c833ab001172f792.webp',34860),
('75bc222e17d8b00972c4bf8eb3c5ce6f','baff2c8ec948d6cae5b1f4e7b6733a9ecc7cec390608d9e98ba7214630b2d5f5','https://yzvpahcjbuotnqjmbkeu.supabase.co/storage/v1/object/public/imagenes/migracion-guia-v2/baff2c8ec948d6cae5b1f4e7b6733a9ecc7cec390608d9e98ba7214630b2d5f5.webp',105920),
('56f580766a3b70833afa42b8ce96a876','206b0557ccd25534d64e20b6d82eeea5d3d7beee847ff3fd46c12f772406c706','https://yzvpahcjbuotnqjmbkeu.supabase.co/storage/v1/object/public/imagenes/migracion-guia-v2/206b0557ccd25534d64e20b6d82eeea5d3d7beee847ff3fd46c12f772406c706.webp',52326),
('2eae3d2a8f9e7af6d013d5f32ad5be98','1f82986aef81bb438523662f808bc00da4e699df1283d9e09540fb789f80bde4','https://yzvpahcjbuotnqjmbkeu.supabase.co/storage/v1/object/public/imagenes/migracion-guia-v2/1f82986aef81bb438523662f808bc00da4e699df1283d9e09540fb789f80bde4.webp',20844),
('56a412c38aeb43946a6a7ae2cb440c66','4530a405fc80bea630f03e655a1092c07e9706a219248c2aff606ff01fa9ff1c','https://yzvpahcjbuotnqjmbkeu.supabase.co/storage/v1/object/public/imagenes/migracion-guia-v2/4530a405fc80bea630f03e655a1092c07e9706a219248c2aff606ff01fa9ff1c.webp',47800),
('2c2f531e72461efc98bebd60e6c4f1c9','c2364c1e806158cae439a06bd88da423aa43d8cf5825293e9f66500f7258166e','https://yzvpahcjbuotnqjmbkeu.supabase.co/storage/v1/object/public/imagenes/migracion-guia-v2/c2364c1e806158cae439a06bd88da423aa43d8cf5825293e9f66500f7258166e.webp',35328);
create function private.imagenes_a_storage(j jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s text;u text;r jsonb;
begin
 if j is null then return null;end if;
 case jsonb_typeof(j)
 when 'string' then
  s:=j#>>'{}';
  if s like 'data:image/%' then
   select c.url into u from private.imagenes_storage_catalogo c where c.data_md5=md5(s);
   if not found then raise exception 'Imagen no incluida en la autorización: %',md5(s);end if;
   return to_jsonb(u);
  end if;return j;
 when 'object' then select coalesce(jsonb_object_agg(e.key,private.imagenes_a_storage(e.value)),'{}'::jsonb) into r from jsonb_each(j) e;return r;
 when 'array' then select coalesce(jsonb_agg(private.imagenes_a_storage(a.value) order by a.n),'[]'::jsonb) into r from jsonb_array_elements(j) with ordinality a(value,n);return r;
 else return j;
 end case;
end;$$;
revoke all on function private.imagenes_a_storage(jsonb) from public,anon,authenticated;

lock table public.combates_yugen,public.resultados_encuentro,public.forja_maestra,public.inventario_jugador in share row exclusive mode;
insert into private.estabilizacion_copias(clave,contenido)
select 'imagenes-v2:combates_yugen:'||id,to_jsonb(b) from public.combates_yugen b where strpos(b.datos::text,'data:image/')>0
union all select 'imagenes-v2:resultados_encuentro:'||combate_id,to_jsonb(r) from public.resultados_encuentro r where strpos(r.datos::text,'data:image/')>0
union all select 'imagenes-v2:forja_maestra:'||id,to_jsonb(f) from public.forja_maestra f where strpos(to_jsonb(f)::text,'data:image/')>0
union all select 'imagenes-v2:inventario_jugador:'||id,to_jsonb(i) from public.inventario_jugador i where strpos(to_jsonb(i)::text,'data:image/')>0;

do $$declare ciclo text;progreso text;viejo text;rec record;actual jsonb;tabla text;ident text;
begin
 ciclo:=pg_get_functiondef('private.encuentro_validar_ciclo()'::regprocedure);
 progreso:=pg_get_functiondef('public.combate_proteger_progreso()'::regprocedure);
 insert into private.estabilizacion_copias values('imagenes-v2:funcion:ciclo',now(),to_jsonb(ciclo)),('imagenes-v2:funcion:progreso',now(),to_jsonb(progreso));
 viejo:='and (new.datos-''historial'') is distinct from (old.datos-''historial'')';
 if strpos(ciclo,viejo)=0 or strpos(progreso,'new.datos is distinct from old.datos')=0 then raise exception 'Controles de inmutabilidad desconocidos';end if;
 -- Excepción exclusivamente dentro de esta transacción: equivalencia de recursos,
 -- nunca cambios de juego. Las definiciones originales se restauran antes del commit.
 execute replace(ciclo,viejo,'and private.imagenes_a_storage(new.datos-''historial'') is distinct from private.imagenes_a_storage(old.datos-''historial'')');
 execute replace(progreso,'new.datos is distinct from old.datos','private.imagenes_a_storage(new.datos) is distinct from private.imagenes_a_storage(old.datos)');
 update public.forja_maestra set imagen_url=private.imagenes_a_storage(to_jsonb(imagen_url))#>>'{}' where imagen_url like 'data:image/%';
 update public.forja_maestra set configuracion_dados=private.imagenes_a_storage(configuracion_dados) where strpos(configuracion_dados::text,'data:image/')>0;
 update public.inventario_jugador set imagen_url=private.imagenes_a_storage(to_jsonb(imagen_url))#>>'{}' where imagen_url like 'data:image/%';
 update public.combates_yugen set datos=private.imagenes_a_storage(datos),version=version+1,updated_at=now() where strpos(datos::text,'data:image/')>0;
 update public.resultados_encuentro set datos=private.imagenes_a_storage(datos) where strpos(datos::text,'data:image/')>0;
 for rec in select clave,contenido from private.estabilizacion_copias where clave like 'imagenes-v2:%' and clave not like 'imagenes-v2:funcion:%' loop
  tabla:=split_part(rec.clave,':',2);ident:=split_part(rec.clave,':',3);
  execute format('select to_jsonb(t) from public.%I t where %I::text=$1',tabla,case when tabla='resultados_encuentro' then 'combate_id' else 'id' end) into actual using ident;
  if private.imagenes_a_storage(rec.contenido)-'version'-'updated_at' is distinct from actual-'version'-'updated_at' then raise exception 'La sustitución alteró otros datos en %',rec.clave;end if;
 end loop;
 execute ciclo;execute progreso;
end;$$;
-- Ninguna protección queda relajada después de esta transacción.

-- GATE_IMAGENES_NUEVAS: evita volver a introducir binarios en registros de juego.
create function private.rechazar_imagenes_embebidas() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if strpos(to_jsonb(new)::text,'"data:image/')>0 then raise exception 'Publica la imagen y guarda su enlace antes de guardar. Las imágenes incrustadas ya no se admiten en registros de juego.' using errcode='22023';end if;
 return new;
end;$$;
revoke all on function private.rechazar_imagenes_embebidas() from public,anon,authenticated;
create trigger aaaa_sin_imagenes_embebidas before insert or update on public.forja_maestra for each row execute function private.rechazar_imagenes_embebidas();
create trigger aaaa_sin_imagenes_embebidas before insert or update on public.inventario_jugador for each row execute function private.rechazar_imagenes_embebidas();
create trigger aaaa_sin_imagenes_embebidas before insert or update on public.combates_yugen for each row execute function private.rechazar_imagenes_embebidas();
create trigger aaaa_sin_imagenes_embebidas before insert or update on public.resultados_encuentro for each row execute function private.rechazar_imagenes_embebidas();
