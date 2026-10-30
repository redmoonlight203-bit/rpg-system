-- Solo para una base vacía de prueba. No ejecutar en Supabase.

create role anon;create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table perfiles(id uuid primary key,rol text);
create table personajes(id bigint primary key,user_id uuid,nombre text,estado_aprobacion text);
create table forja_maestra(id uuid primary key default gen_random_uuid(),nombre text,tipo text,estado text default 'aprobado',es_grupo boolean default false,stats jsonb default '{}',stats_rango jsonb default '{}',descripcion text,imagen_url text,clase text,ligado_al_alma boolean,slot_tipo text,es_vendible boolean,ubicacion text,poseedor_id uuid);
create table inventario_jugador(id uuid primary key default gen_random_uuid(),user_id uuid,personaje_id bigint,forja_id uuid,nombre text,tipo text,descripcion text,imagen_url text,clase text,stats jsonb,ligado_al_alma boolean,slot_tipo text,slot_equipado text,es_activo boolean);
create table negociaciones_tienda(id uuid primary key default gen_random_uuid(),item_id uuid,user_id uuid,estado text default 'pendiente');
