begin;
set lock_timeout='1500ms';
-- Creación de personajes desde el reencarnado (v1):
--  1. Foto propia del personaje (reencarnado al solicitar y GM en su ficha).
--  2. Raza única: propuesta temporal del jugador. Rechazada no deja rastro en el catálogo;
--     aprobada se publica una sola vez en Reglas y estadísticas bajo «razas».
--  3. El lugar de aparición deja de elegirse: razas de lista aparecen en la Montaña Shiro
--     y la raza única lo cede al GM.

create or replace function private.imagen_publica_valida(p text) returns boolean
language sql immutable set search_path='' as $$
 select p is null or (length(p)<=1000 and p ~ '^(/arte/razas/[a-z0-9_-]+\.webp|https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/imagenes/[0-9a-f-]{36}/[a-z0-9_/-]+\.(webp|png))$')
$$;
revoke all on function private.imagen_publica_valida(text) from public,anon;
grant execute on function private.imagen_publica_valida(text) to authenticated;

-- 1. Foto del personaje -------------------------------------------------------------
alter table public.personajes add column if not exists imagen_url text;
alter table public.personajes drop constraint if exists personajes_imagen_valida;
alter table public.personajes add constraint personajes_imagen_valida check (private.imagen_publica_valida(imagen_url));

-- 2. Raza única ----------------------------------------------------------------------
alter table public.categorias_forja add column if not exists raza_unica_de uuid references public.perfiles(id) on delete set null;
create index if not exists categorias_forja_raza_unica_de on public.categorias_forja(raza_unica_de) where raza_unica_de is not null;

create table if not exists public.razas_propuestas(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.perfiles(id) on delete cascade,
 estado text not null default 'borrador' check (estado in ('borrador','propuesta','aprobada','rechazada')),
 nombre text not null default '' check (length(nombre)<=100),
 descripcion text not null default '' check (length(descripcion)<=4000),
 icono text check (icono is null or icono ~ '^[a-z][a-z0-9_-]{0,63}$'),
 imagen_url text check (private.imagen_publica_valida(imagen_url)),
 atributos jsonb not null default '{}' check (jsonb_typeof(atributos)='object' and octet_length(atributos::text)<=20000),
 pasiva_racial jsonb check (pasiva_racial is null or (jsonb_typeof(pasiva_racial)='object' and octet_length(pasiva_racial::text)<=200000)),
 advertencia_aceptada boolean not null default false,
 comentarios_kuroi text not null default '' check (length(comentarios_kuroi)<=2000),
 categoria_id uuid references public.categorias_forja(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 resuelta_at timestamptz
);
create unique index if not exists razas_propuestas_una_activa on public.razas_propuestas(user_id) where estado in ('borrador','propuesta');
create index if not exists razas_propuestas_categoria on public.razas_propuestas(categoria_id) where categoria_id is not null;
alter table public.razas_propuestas enable row level security;
revoke all on public.razas_propuestas from public,anon,authenticated;
grant select on public.razas_propuestas to authenticated;
drop policy if exists razas_propuestas_lectura on public.razas_propuestas;
create policy razas_propuestas_lectura on public.razas_propuestas for select to authenticated
 using (user_id=(select auth.uid()) or (select private.tienda_es_gm()));

-- Atributos que puede definir una raza: los de la raíz «razas».
create or replace function private.raza_propuesta_validar_atributos(p jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare k text;v jsonb;base public.config_estadisticas%rowtype;d numeric;l numeric;salida jsonb:='{}';
begin
 if jsonb_typeof(p) is distinct from 'object' then raise exception 'Atributos inválidos.';end if;
 for k,v in select * from jsonb_each(p) loop
  select * into base from public.config_estadisticas where categoria='razas' and clave=k limit 1;
  if not found then raise exception 'El atributo % no existe en Reglas y estadísticas.',k;end if;
  if jsonb_typeof(v) is distinct from 'object' or jsonb_typeof(v->'valor_defecto') is distinct from 'number'
   or (v ? 'limite_jugador' and jsonb_typeof(v->'limite_jugador') not in ('number','null')) then raise exception 'Valor inválido para %.',base.etiqueta;end if;
  d:=(v->>'valor_defecto')::numeric;l:=(v->>'limite_jugador')::numeric;
  if d<0 or d>1000000 or (l is not null and (l<d or l>1000000)) then raise exception 'Revisa el valor y el límite de %.',base.etiqueta;end if;
  salida:=salida||jsonb_build_object(k,jsonb_build_object('valor_defecto',d,'limite_jugador',l));
 end loop;
 return salida;
end;$$;
revoke all on function private.raza_propuesta_validar_atributos(jsonb) from public,anon,authenticated;

create or replace function private.raza_propuesta_guardar(p_id uuid,p_nombre text,p_descripcion text,p_icono text,p_imagen text,p_atributos jsonb,p_pasiva jsonb,p_enviar boolean,p_acepta boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();stats jsonb;pid uuid;
begin
 if u is null then raise exception 'Inicia sesión.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('raza_propuesta:'||u::text,0));
 if not exists(select 1 from public.perfiles where id=u and rol='REENCARNADO' and estado='aprobado') then raise exception 'Cuenta no disponible.' using errcode='42501';end if;
 if not exists(select 1 from public.personajes where user_id=u and estado_aprobacion='aprobado' and estado_vida='vivo' and not coalesce(es_companero,false)) then
  raise exception 'Solo los reencarnados con un personaje aprobado pueden proponer una raza única.' using errcode='42501';end if;
 if length(btrim(coalesce(p_nombre,''))) not between 1 and 100 or length(coalesce(p_descripcion,''))>4000 then raise exception 'Revisa el nombre y la descripción de la raza.';end if;
 if p_icono is not null and p_icono!~'^[a-z][a-z0-9_-]{0,63}$' then raise exception 'Elige un emblema disponible.';end if;
 if not private.imagen_publica_valida(nullif(p_imagen,'')) then raise exception 'Sube la imagen de la raza desde la aplicación.';end if;
 stats:=private.raza_propuesta_validar_atributos(coalesce(p_atributos,'{}'));
 if p_pasiva is not null and (jsonb_typeof(p_pasiva)<>'object' or length(btrim(coalesce(p_pasiva->>'nombre',''))) not between 1 and 120
  or length(coalesce(p_pasiva->>'descripcion',''))>2000 or jsonb_typeof(p_pasiva->'reglas')<>'array' or jsonb_typeof(p_pasiva->'reglas_pasivas')<>'array'
  or jsonb_array_length(p_pasiva->'reglas')+jsonb_array_length(p_pasiva->'reglas_pasivas')=0) then raise exception 'La pasiva racial necesita nombre y al menos una regla.';end if;
 if coalesce(p_enviar,false) then
  if not coalesce(p_acepta,false) then raise exception 'Acepta la advertencia antes de enviar la raza única.';end if;
  if nullif(p_imagen,'') is null then raise exception 'Cada raza nueva necesita su imagen. Súbela antes de enviar.';end if;
  if coalesce((stats->'vida'->>'valor_defecto')::numeric,(stats->'hp'->>'valor_defecto')::numeric,0)<=0 then raise exception 'La raza necesita vida mayor que cero.';end if;
 end if;
 if p_id is null then
  insert into public.razas_propuestas(user_id,estado,nombre,descripcion,icono,imagen_url,atributos,pasiva_racial,advertencia_aceptada)
  values(u,case when p_enviar then 'propuesta' else 'borrador' end,btrim(p_nombre),coalesce(p_descripcion,''),p_icono,nullif(p_imagen,''),stats,p_pasiva,coalesce(p_acepta,false))
  returning id into pid;
 else
  update public.razas_propuestas set estado=case when p_enviar then 'propuesta' else 'borrador' end,nombre=btrim(p_nombre),descripcion=coalesce(p_descripcion,''),
   icono=p_icono,imagen_url=nullif(p_imagen,''),atributos=stats,pasiva_racial=p_pasiva,advertencia_aceptada=coalesce(p_acepta,false),comentarios_kuroi='',updated_at=now()
  where id=p_id and user_id=u and estado in ('borrador','propuesta') returning id into pid;
  if pid is null then raise exception 'Solo puedes editar tus propuestas abiertas.' using errcode='42501';end if;
 end if;
 return pid;
exception when unique_violation then raise exception 'Ya tienes una raza única en borrador o en revisión.';
end;$$;

create or replace function private.raza_propuesta_retirar(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Inicia sesión.' using errcode='42501';end if;
 delete from public.razas_propuestas where id=p_id and user_id=auth.uid() and estado in ('borrador','propuesta','rechazada');
 if not found then raise exception 'No se encontró la propuesta.' using errcode='42501';end if;
end;$$;

create or replace function private.raza_propuesta_resolver(p_id uuid,p_aprobar boolean,p_comentario text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.razas_propuestas%rowtype;raiz uuid;cat uuid;k text;v jsonb;base public.config_estadisticas%rowtype;
begin
 if not private.tienda_es_gm() then raise exception 'Solo el GM resuelve propuestas de raza.' using errcode='42501';end if;
 if length(coalesce(p_comentario,''))>2000 then raise exception 'El comentario es demasiado largo.';end if;
 select * into p from public.razas_propuestas where id=p_id for update;
 if not found then raise exception 'La propuesta ya no existe.';end if;
 if p.estado<>'propuesta' then raise exception 'Esta propuesta ya fue resuelta o sigue en borrador.';end if;
 if not coalesce(p_aprobar,false) then
  -- Rechazo: no queda nada de la raza; solo el comentario del GM para el jugador.
  update public.razas_propuestas set estado='rechazada',descripcion='',icono=null,imagen_url=null,atributos='{}',pasiva_racial=null,
   advertencia_aceptada=false,comentarios_kuroi=coalesce(p_comentario,''),updated_at=now(),resuelta_at=now() where id=p.id;
  return null;
 end if;
 select id into raiz from public.categorias_forja where clave='razas' limit 1;
 if raiz is null then raise exception 'Configura la categoría «razas» antes de aprobar.';end if;
 if exists(select 1 from public.categorias_forja where lower(nombre)=lower(p.nombre)) then raise exception 'Ya existe una categoría llamada «%». Pide al jugador otro nombre.',p.nombre;end if;
 insert into public.categorias_forja(clave,nombre,descripcion,icono,imagen_url,parent_id,pasiva_racial,raza_unica_de)
 values('unica_'||substr(replace(p.id::text,'-',''),1,16),p.nombre,p.descripcion,p.icono,p.imagen_url,raiz,p.pasiva_racial,p.user_id)
 returning id into cat;
 for k,v in select * from jsonb_each(p.atributos) loop
  select * into base from public.config_estadisticas where categoria='razas' and clave=k limit 1;
  insert into public.config_estadisticas(categoria,clave,etiqueta,descripcion,valor_defecto,limite_jugador)
  values('unica_'||substr(replace(p.id::text,'-',''),1,16),k,coalesce(base.etiqueta,k),coalesce(base.descripcion,''),(v->>'valor_defecto')::numeric,(v->>'limite_jugador')::numeric);
 end loop;
 update public.razas_propuestas set estado='aprobada',categoria_id=cat,comentarios_kuroi=coalesce(p_comentario,''),updated_at=now(),resuelta_at=now() where id=p.id;
 return cat;
end;$$;

do $$declare f text;begin
 foreach f in array array['private.raza_propuesta_guardar(uuid,text,text,text,text,jsonb,jsonb,boolean,boolean)','private.raza_propuesta_retirar(uuid)','private.raza_propuesta_resolver(uuid,boolean,text)'] loop
  execute 'revoke all on function '||f||' from public,anon';execute 'grant execute on function '||f||' to authenticated';
 end loop;
end;$$;
create or replace function public.raza_propuesta_guardar(p_id uuid,p_nombre text,p_descripcion text,p_icono text,p_imagen text,p_atributos jsonb,p_pasiva jsonb,p_enviar boolean,p_acepta boolean)
returns uuid language sql security invoker set search_path='' as $$select private.raza_propuesta_guardar(p_id,p_nombre,p_descripcion,p_icono,p_imagen,p_atributos,p_pasiva,p_enviar,p_acepta)$$;
create or replace function public.raza_propuesta_retirar(p_id uuid) returns void language sql security invoker set search_path='' as $$select private.raza_propuesta_retirar(p_id)$$;
create or replace function public.raza_propuesta_resolver(p_id uuid,p_aprobar boolean,p_comentario text default '') returns uuid
language sql security invoker set search_path='' as $$select private.raza_propuesta_resolver(p_id,p_aprobar,p_comentario)$$;
do $$declare f text;begin
 foreach f in array array['public.raza_propuesta_guardar(uuid,text,text,text,text,jsonb,jsonb,boolean,boolean)','public.raza_propuesta_retirar(uuid)','public.raza_propuesta_resolver(uuid,boolean,text)'] loop
  execute 'revoke all on function '||f||' from public,anon';execute 'grant execute on function '||f||' to authenticated';
 end loop;
end;$$;

-- 3. Solicitud de personaje con foto, sin elección de lugar y con razas únicas ---------
drop function if exists public.personaje_solicitar(uuid,text,text,text,text,jsonb,bigint);
drop function if exists private.personaje_solicitar(uuid,text,text,text,text,jsonb,bigint);
create or replace function private.personaje_solicitar(p_categoria uuid,p_nombre text,p_historia text,p_defecto text,p_lugar text,p_atributos jsonb,p_personaje bigint default null,p_imagen text default null)
returns bigint language plpgsql security definer set search_path='' as $$
declare u public.perfiles%rowtype;c public.categorias_forja%rowtype;s public.config_estadisticas%rowtype;v numeric;stats jsonb:='{}';pj bigint;lugar text;
begin
 if auth.uid() is null then raise exception 'Inicia sesión.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into u from public.perfiles where id=auth.uid() and rol='REENCARNADO' and estado='aprobado';
 if not found then raise exception 'Cuenta no disponible.' using errcode='42501';end if;
 if p_personaje is not null then
  perform 1 from public.personajes where id=p_personaje and user_id=u.id and not coalesce(es_companero,false) and estado_vida='vivo' and estado_aprobacion in ('pendiente','editado','rechazado') for update;
  if not found then raise exception 'Solo puedes revisar tus solicitudes pendientes.' using errcode='42501';end if;
 end if;
 if not coalesce(u.mente_colmena,false) and exists(select 1 from public.personajes where user_id=u.id and not coalesce(es_companero,false) and estado_vida<>'muerto' and estado_aprobacion<>'rechazado' and (p_personaje is null or id<>p_personaje)) then raise exception 'Ya tienes un cuerpo o una solicitud pendiente.';end if;
 select * into c from public.categorias_forja where id=p_categoria;
 if not found or not 'razas'=any(public.forja_linaje_claves(c.clave)) then raise exception 'Elige un ser vivo de Reglas y estadísticas.';end if;
 if c.raza_unica_de is not null and c.raza_unica_de<>u.id then raise exception 'Esa raza única pertenece a otro reencarnado.' using errcode='42501';end if;
 if length(btrim(coalesce(p_nombre,''))) not between 1 and 100 or length(coalesce(p_historia,''))>10000 or length(coalesce(p_defecto,''))>2000 then raise exception 'Revisa el nombre y la historia.';end if;
 if not private.imagen_publica_valida(nullif(p_imagen,'')) then raise exception 'Sube la foto del personaje desde la aplicación.';end if;
 -- El lugar de aparición ya no se elige: la raza única lo cede al GM.
 if c.raza_unica_de is not null then lugar:='Lo decide el GM';
 else
  lugar:=coalesce(nullif(p_lugar,''),'Montaña Shiro (Prueba de vida)');
  if not(lugar='Montaña Shiro (Prueba de vida)' or lugar=any(coalesce(u.lugares_conocidos,'{}'))) then raise exception 'Elige un lugar conocido.';end if;
 end if;
 if jsonb_typeof(p_atributos) is distinct from 'object' then raise exception 'Atributos inválidos.';end if;
 for s in select * from public.personaje_atributos_raza(c.id) loop
  if p_atributos ? s.clave and jsonb_typeof(p_atributos->s.clave)<>'number' then raise exception 'Valor inválido para %.',s.etiqueta;end if;
  v:=coalesce((p_atributos->>s.clave)::numeric,s.valor_defecto,0);
  if v<least(0,coalesce(s.valor_defecto,0)) or (s.limite_jugador is not null and v>greatest(s.limite_jugador,coalesce(s.valor_defecto,0))) then raise exception 'El atributo % excede los límites de la raza.',s.etiqueta;end if;
  stats:=stats||jsonb_build_object(s.clave,v);
 end loop;
 if exists(select 1 from jsonb_object_keys(p_atributos) k where not stats ? k) then raise exception 'Solo puedes proponer atributos definidos para tu raza.';end if;
 if coalesce((stats->>'vida')::numeric,(stats->>'hp')::numeric,0)<=0 then raise exception 'El personaje necesita vida mayor que cero.';end if;
 if p_personaje is null then
 insert into public.personajes(user_id,nombre,raza,categoria_id,atributos,historia,defecto,lugar_reencarnacion,estado_vida,estado_aprobacion,imagen_url)
 values(u.id,btrim(p_nombre),c.clave,c.id,stats,p_historia,p_defecto,lugar,'vivo','pendiente',nullif(p_imagen,'')) returning id into pj;
 else
 update public.personajes set nombre=btrim(p_nombre),raza=c.clave,categoria_id=c.id,atributos=stats,historia=p_historia,defecto=p_defecto,lugar_reencarnacion=lugar,imagen_url=nullif(p_imagen,''),estado_aprobacion='pendiente',vida_actual=coalesce((stats->>'vida')::numeric,(stats->>'hp')::numeric),vida_maxima_actual=null,ph_actual=coalesce((stats->>'ph')::numeric,0),fatiga_actual=0 where id=p_personaje returning id into pj;
 end if;
 return pj;
end;$$;
revoke all on function private.personaje_solicitar(uuid,text,text,text,text,jsonb,bigint,text) from public,anon;
grant execute on function private.personaje_solicitar(uuid,text,text,text,text,jsonb,bigint,text) to authenticated;
create or replace function public.personaje_solicitar(p_categoria uuid,p_nombre text,p_historia text,p_defecto text,p_lugar text,p_atributos jsonb,p_personaje bigint default null,p_imagen text default null)
returns bigint language sql security invoker set search_path='' as $$select private.personaje_solicitar(p_categoria,p_nombre,p_historia,p_defecto,p_lugar,p_atributos,p_personaje,p_imagen)$$;
revoke all on function public.personaje_solicitar(uuid,text,text,text,text,jsonb,bigint,text) from public,anon;
grant execute on function public.personaje_solicitar(uuid,text,text,text,text,jsonb,bigint,text) to authenticated;

-- El dueño puede cambiar la foto de su personaje vivo sin tocar el resto de la ficha.
create or replace function private.personaje_cambiar_foto(p_personaje bigint,p_imagen text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Inicia sesión.' using errcode='42501';end if;
 if not private.imagen_publica_valida(nullif(p_imagen,'')) then raise exception 'Sube la foto del personaje desde la aplicación.';end if;
 update public.personajes set imagen_url=nullif(p_imagen,'') where id=p_personaje and estado_vida='vivo' and (user_id=auth.uid() or private.tienda_es_gm());
 if not found then raise exception 'No puedes cambiar la foto de ese personaje.' using errcode='42501';end if;
end;$$;
revoke all on function private.personaje_cambiar_foto(bigint,text) from public,anon;
grant execute on function private.personaje_cambiar_foto(bigint,text) to authenticated;
create or replace function public.personaje_cambiar_foto(p_personaje bigint,p_imagen text) returns void
language sql security invoker set search_path='' as $$select private.personaje_cambiar_foto(p_personaje,p_imagen)$$;
revoke all on function public.personaje_cambiar_foto(bigint,text) from public,anon;
grant execute on function public.personaje_cambiar_foto(bigint,text) to authenticated;

do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='razas_propuestas') then
  alter publication supabase_realtime add table public.razas_propuestas;end if;
end;$$;
notify pgrst,'reload schema';
commit;
