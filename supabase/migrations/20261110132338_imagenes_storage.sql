-- Bucket preparado; la migración de retratos existentes queda pendiente de autorización pública.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('imagenes','imagenes',true,500000,array['image/webp','image/png'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy imagenes_insertar_propias on storage.objects for insert to authenticated
with check(bucket_id='imagenes' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy imagenes_leer_propias on storage.objects for select to authenticated
using(bucket_id='imagenes' and (storage.foldername(name))[1]=(select auth.uid())::text);
