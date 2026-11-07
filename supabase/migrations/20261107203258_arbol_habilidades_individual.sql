begin;
alter table public.personajes add column puntos_habilidad integer not null default 0 check(puntos_habilidad>=0);
-- Preserve unspent choices; learned powers and inventories stay intact.
update public.personajes set puntos_habilidad=elecciones_pendientes,elecciones_pendientes=0 where estado_vida<>'muerto';
create table public.arbol_nodos(
 id uuid primary key default gen_random_uuid(),personaje_id bigint not null references public.personajes(id) on delete cascade,
 padre_id uuid,nombre text not null check(length(btrim(nombre)) between 1 and 100),descripcion text not null default '' check(length(descripcion)<=5000),
 tipo text not null check(tipo in ('rama','habilidad','estadistica')),
 habilidad_id uuid references public.forja_maestra(id) on delete restrict,atributo text,incremento numeric,
 coste integer not null default 1 check(coste between 0 and 1000000),nivel_minimo integer not null default 1 check(nivel_minimo between 1 and 100),
 aprendido_at timestamptz,puntos_gastados integer not null default 0 check(puntos_gastados>=0),created_at timestamptz not null default now(),
 unique(id,personaje_id),foreign key(padre_id,personaje_id) references public.arbol_nodos(id,personaje_id) on delete restrict,
 check(padre_id is distinct from id),
 check((tipo='rama' and coste=0 and habilidad_id is null and atributo is null and incremento is null and aprendido_at is null)
 or (tipo='habilidad' and coste>=1 and (habilidad_id is not null or aprendido_at is not null) and atributo is null and incremento is null)
 or (tipo='estadistica' and coste>=1 and habilidad_id is null and atributo ~ '^[a-z_][a-z0-9_]{0,63}$' and atributo is not null and incremento is not null and incremento between 0.01 and 1000000))
);
create index arbol_personaje_idx on public.arbol_nodos(personaje_id);
create index arbol_padre_idx on public.arbol_nodos(padre_id);
create index arbol_habilidad_idx on public.arbol_nodos(habilidad_id);
alter table public.arbol_nodos enable row level security;
revoke all on public.arbol_nodos from public,anon,authenticated;
grant select on public.arbol_nodos to authenticated;
create policy arbol_lectura on public.arbol_nodos for select to authenticated using(
 (select private.tienda_es_gm()) or exists(select 1 from public.personajes p join public.perfiles u on u.id=p.user_id
 where p.id=personaje_id and p.user_id=(select auth.uid()) and p.estado_vida='vivo' and p.estado_aprobacion='aprobado' and u.estado='aprobado'));
-- Historical choices become learned roots so existing progress is visible.
insert into public.arbol_nodos(personaje_id,nombre,tipo,habilidad_id,coste,nivel_minimo,aprendido_at,puntos_gastados,descripcion)
select p.id,left(coalesce(h->>'nombre','Habilidad aprendida'),100),'habilidad',f.id,1,
 greatest(1,least(100,coalesce((h->>'nivel')::integer,1))),now(),1,'Aprendida antes del árbol individual.'
from public.personajes p cross join lateral jsonb_array_elements(p.habilidades_elegidas) h
left join public.forja_maestra f on f.id::text=h->>'id';

create function private.arbol_acceso(p_personaje bigint,p_gm boolean default false)
returns void language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Inicia sesión.' using errcode='42501';end if;
 if private.tienda_es_gm() then return;end if;
 if p_gm or not exists(select 1 from public.personajes p join public.perfiles u on u.id=p.user_id where p.id=p_personaje and p.user_id=auth.uid() and p.estado_vida='vivo' and p.estado_aprobacion='aprobado' and u.estado='aprobado') then
 raise exception 'No tienes acceso a este árbol.' using errcode='42501';end if;
end;$$;
revoke all on function private.arbol_acceso(bigint,boolean) from public,anon,authenticated;

create function private.arbol_bloqueo(p public.personajes,n public.arbol_nodos)
returns text language plpgsql stable security definer set search_path='' as $$
declare f public.forja_maestra%rowtype;
begin
 if n.aprendido_at is not null then return 'Ya aprendido';end if;
 if p.estado_vida<>'vivo' or p.estado_aprobacion<>'aprobado' then return 'Personaje no disponible';end if;
 if p.nivel<n.nivel_minimo then return 'Requiere nivel '||n.nivel_minimo;end if;
 if exists(with recursive padres as (
 select a.* from public.arbol_nodos a where a.id=n.padre_id and a.personaje_id=p.id
 union all select a.* from public.arbol_nodos a join padres b on a.id=b.padre_id and a.personaje_id=p.id
 ) select 1 from padres where nivel_minimo>p.nivel or (tipo<>'rama' and aprendido_at is null)) then return 'Desbloquea primero la rama anterior';end if;
 if n.tipo='rama' then return null;end if;
 if n.tipo='habilidad' then
  select * into f from public.forja_maestra where id=n.habilidad_id and estado='aprobado' and tipo_creacion in ('habilidad','pasiva');
  if not found then return 'Habilidad no disponible en el Yunque';end if;
  if exists(select 1 from public.inventario_jugador i where i.personaje_id=p.id and i.forja_id=f.id) then return 'Este personaje ya conoce esta habilidad';end if;
  if not public.forja_cumple_requisitos(f.requisitos_uso,p.raza,p.atributos||jsonb_build_object('nivel',p.nivel)) then return 'No cumples los requisitos de la habilidad';end if;
 end if;
 if n.coste>p.puntos_habilidad then return 'Necesitas '||n.coste||' puntos';end if;
 return null;
end;$$;
revoke all on function private.arbol_bloqueo(public.personajes,public.arbol_nodos) from public,anon,authenticated;

create function private.arbol_leer(p_personaje bigint)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.personajes%rowtype; resultado jsonb;
begin
 perform private.arbol_acceso(p_personaje);
 select * into p from public.personajes where id=p_personaje;
 if not found then raise exception 'Personaje no encontrado.';end if;
 select coalesce(jsonb_agg(to_jsonb(n)||jsonb_build_object('bloqueo',private.arbol_bloqueo(p,n)) order by n.created_at,n.id),'[]') into resultado from public.arbol_nodos n where n.personaje_id=p.id;
 return jsonb_build_object('personaje',to_jsonb(p),'nodos',resultado,'atributos',coalesce((select jsonb_agg(to_jsonb(a)) from public.personaje_atributos_raza(p.categoria_id) a),'[]'));
end;$$;

create function private.arbol_guardar(p_personaje bigint,p_nodo uuid,p_padre uuid,p_tipo text,p_nombre text,p_descripcion text,p_habilidad uuid,p_atributo text,p_incremento numeric,p_coste integer,p_nivel integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;n public.arbol_nodos%rowtype;resultado uuid;
begin
 perform private.arbol_acceso(p_personaje,true);
 select * into p from public.personajes where id=p_personaje for update;
 if not found or p.estado_vida<>'vivo' or p.estado_aprobacion<>'aprobado' then raise exception 'Elige un personaje vivo y aprobado.';end if;
 if p_nodo is not null then
  select * into n from public.arbol_nodos where id=p_nodo and personaje_id=p.id;
  if not found then raise exception 'Nodo no encontrado en este personaje.';end if;
  if n.aprendido_at is not null then raise exception 'Los nodos aprendidos se conservan como historial.';end if;
  if exists(with recursive hijos as (select id from public.arbol_nodos where padre_id=n.id union all select a.id from public.arbol_nodos a join hijos b on a.padre_id=b.id) select 1 from public.arbol_nodos a join hijos h on h.id=a.id where a.aprendido_at is not null) then raise exception 'Esta rama contiene aprendizajes y no se puede modificar.';end if;
 end if;
 if p_padre is not null then
  if not exists(select 1 from public.arbol_nodos where id=p_padre and personaje_id=p.id) then raise exception 'La rama debe pertenecer al mismo personaje.';end if;
  if exists(with recursive padres as (select id,padre_id from public.arbol_nodos where id=p_padre union all select a.id,a.padre_id from public.arbol_nodos a join padres b on a.id=b.padre_id) select 1 from padres where id=p_nodo) then raise exception 'Una rama no puede depender de sí misma.';end if;
 end if;
 if p_tipo='habilidad' and not exists(select 1 from public.forja_maestra where id=p_habilidad and tipo_creacion in ('habilidad','pasiva') and estado='aprobado') then raise exception 'Selecciona una habilidad o pasiva aprobada del Yunque.';end if;
 if p_tipo='estadistica' and (p_atributo is null or p_atributo='nivel' or not (p.atributos ? p_atributo or exists(select 1 from public.personaje_atributos_raza(p.categoria_id) a where a.clave=p_atributo))) then raise exception 'El atributo debe estar definido en las reglas de este personaje.';end if;
 if p_nodo is null then
  if (select count(*) from public.arbol_nodos where personaje_id=p.id)>=1000 then raise exception 'El árbol admite hasta 1000 nodos.';end if;
  insert into public.arbol_nodos(personaje_id,padre_id,tipo,nombre,descripcion,habilidad_id,atributo,incremento,coste,nivel_minimo)
  values(p.id,p_padre,p_tipo,btrim(p_nombre),coalesce(p_descripcion,''),case when p_tipo='habilidad' then p_habilidad end,case when p_tipo='estadistica' then p_atributo end,case when p_tipo='estadistica' then p_incremento end,case when p_tipo='rama' then 0 else p_coste end,p_nivel) returning id into resultado;
 else
  update public.arbol_nodos set padre_id=p_padre,tipo=p_tipo,nombre=btrim(p_nombre),descripcion=coalesce(p_descripcion,''),habilidad_id=case when p_tipo='habilidad' then p_habilidad end,atributo=case when p_tipo='estadistica' then p_atributo end,incremento=case when p_tipo='estadistica' then p_incremento end,coste=case when p_tipo='rama' then 0 else p_coste end,nivel_minimo=p_nivel where id=p_nodo returning id into resultado;
 end if;
 return resultado;
end;$$;

create function private.arbol_eliminar(p_personaje bigint,p_nodo uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.arbol_acceso(p_personaje,true);
 perform 1 from public.personajes where id=p_personaje for update;
 if not exists(select 1 from public.arbol_nodos where id=p_nodo and personaje_id=p_personaje and aprendido_at is null) then raise exception 'Solo puedes quitar nodos sin aprender de este personaje.';end if;
 if exists(select 1 from public.arbol_nodos where padre_id=p_nodo) then raise exception 'Quita primero las ramas hijas.';end if;
 delete from public.arbol_nodos where id=p_nodo and personaje_id=p_personaje;
end;$$;

create function private.arbol_comprar(p_personaje bigint,p_nodo uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;n public.arbol_nodos%rowtype;f public.forja_maestra%rowtype;motivo text;attrs jsonb;
begin
 perform private.arbol_acceso(p_personaje);
 select * into p from public.personajes where id=p_personaje for update;
 select * into n from public.arbol_nodos where id=p_nodo and personaje_id=p.id for update;
 if not found then raise exception 'El nodo no pertenece a este personaje.';end if;
 motivo:=private.arbol_bloqueo(p,n);
 if motivo is not null then raise exception '%',motivo;end if;
 if n.tipo='rama' then raise exception 'Las ramas organizan el árbol y no consumen puntos.';end if;
 if exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=p.id::text) then raise exception 'Aprende fuera del encuentro activo.';end if;
 attrs:=p.atributos;
 if n.tipo='habilidad' then
  select * into f from public.forja_maestra where id=n.habilidad_id for share;
  insert into public.inventario_jugador(user_id,forja_id,personaje_id,nombre,tipo,descripcion,imagen_url,clase,stats,ligado_al_alma,es_activo,slot_tipo,motivo_entrega,configuracion)
  values(p.user_id,f.id,p.id,f.nombre,f.tipo_creacion,f.descripcion,f.imagen_url,f.clase,public.forja_stats_componente(f.id),false,true,'ninguno','Árbol individual · nivel '||p.nivel,
  jsonb_build_object('tipo_creacion',f.tipo_creacion,'efectos',coalesce(f.configuracion_dados,'[]'),'reglas',coalesce(f.reglas,'[]'),'reglas_pasivas',coalesce(f.reglas_pasivas,'[]'),'requisitos_uso',coalesce(f.requisitos_uso,'{}')));
 else
  attrs:=jsonb_set(attrs,array[n.atributo],to_jsonb(coalesce((attrs->>n.atributo)::numeric,0)+n.incremento),true);
 end if;
 update public.personajes set puntos_habilidad=puntos_habilidad-n.coste,atributos=attrs,
 vida_maxima_actual=case when n.tipo='estadistica' and n.atributo in ('vida','hp') and vida_maxima_actual is not null then vida_maxima_actual+n.incremento else vida_maxima_actual end,
 habilidades_elegidas=case when n.tipo='habilidad' then habilidades_elegidas||jsonb_build_array(jsonb_build_object('id',f.id,'nombre',f.nombre,'nivel',p.nivel,'nodo',n.id,'coste',n.coste)) else habilidades_elegidas end where id=p.id;
 update public.arbol_nodos set aprendido_at=now(),puntos_gastados=coste where id=n.id;
 return jsonb_build_object('nombre',n.nombre,'puntos',p.puntos_habilidad-n.coste);
end;$$;

-- Preview exactly the same growth that will be committed, without consuming XP.
create function private.arbol_prever_experiencia(p_personaje bigint,p_cantidad integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.personajes%rowtype;n integer;total bigint;attrs jsonb;foco text;secundario text;v numeric;mejor numeric;k text;disponibles integer;avisos jsonb:='[]';
 claves text[]:=array['fisico','magico','resistencia','inteligencia','agilidad'];
begin
 perform private.arbol_acceso(p_personaje,true);
 if p_cantidad is null or p_cantidad not between 1 and 1000000 then raise exception 'Concede entre 1 y 1000000 XP.';end if;
 select * into p from public.personajes where id=p_personaje;
 if not found or p.estado_vida<>'vivo' or p.estado_aprobacion<>'aprobado' then raise exception 'Elige un personaje vivo y aprobado.';end if;
 n:=p.nivel;total:=p.exp_total+p_cantidad;attrs:=p.atributos;
 while n<100 and total>=50*n*(n+1) loop
  n:=n+1;foco:=claves[1];mejor:=-999999999;
  foreach k in array claves loop
   v:=case when jsonb_typeof(attrs->k)='number' then (attrs->>k)::numeric else 0 end;
   if v>mejor then mejor:=v;foco:=k;end if;
  end loop;
  secundario:=claves[((n-1)%5)+1];
  attrs:=jsonb_set(attrs,array[foco],to_jsonb(coalesce((attrs->>foco)::numeric,0)+1),true);
  if secundario<>foco then attrs:=jsonb_set(attrs,array[secundario],to_jsonb(coalesce((attrs->>secundario)::numeric,0)+1),true);end if;
  attrs:=jsonb_set(attrs,'{vida}',to_jsonb(coalesce((attrs->>'vida')::numeric,10+coalesce((attrs->>'resistencia')::numeric,0))+2),true);
  if attrs ? 'ph' then attrs:=jsonb_set(attrs,'{ph}',to_jsonb(coalesce((attrs->>'ph')::numeric,0)+1),true);end if;
  select count(*) into disponibles from public.arbol_nodos a join public.forja_maestra f on f.id=a.habilidad_id
  where a.personaje_id=p.id and a.tipo='habilidad' and a.aprendido_at is null and a.nivel_minimo<=n and f.estado='aprobado' and f.tipo_creacion in ('habilidad','pasiva')
   and public.forja_cumple_requisitos(f.requisitos_uso,p.raza,attrs||jsonb_build_object('nivel',n))
   and not exists(select 1 from public.inventario_jugador i where i.personaje_id=p.id and i.forja_id=f.id)
   and not exists(with recursive padres as (select id,padre_id,nivel_minimo from public.arbol_nodos where id=a.padre_id union all select b.id,b.padre_id,b.nivel_minimo from public.arbol_nodos b join padres c on b.id=c.padre_id) select 1 from padres where nivel_minimo>n);
  if disponibles=0 then avisos:=avisos||jsonb_build_array(jsonb_build_object('nivel',n,'mensaje','No hay habilidades nuevas preparadas en el árbol de '||p.nombre));end if;
 end loop;
 return jsonb_build_object('personaje',p.id,'nombre',p.nombre,'nivel_anterior',p.nivel,'nivel',n,'exp_total',total,'puntos_anadidos',(n-p.nivel)*3,'atributos',attrs,'avisos',avisos);
end;$$;

create function private.arbol_dar_experiencia(p_personaje bigint,p_cantidad integer,p_confirmar_sin_habilidades boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;prev jsonb;
begin
 perform private.arbol_acceso(p_personaje,true);
 select * into p from public.personajes where id=p_personaje for update;
 prev:=private.arbol_prever_experiencia(p_personaje,p_cantidad);
 if jsonb_array_length(prev->'avisos')>0 and not coalesce(p_confirmar_sin_habilidades,false) then
  raise exception 'No hay habilidades nuevas preparadas en el árbol de %. Revisa el árbol antes de subir de nivel o confirma continuar sin habilidades.',p.nombre using errcode='P0001',detail=(prev->'avisos')::text;
 end if;
 update public.personajes set nivel=(prev->>'nivel')::integer,exp_total=(prev->>'exp_total')::bigint,atributos=prev->'atributos',
 puntos_habilidad=puntos_habilidad+(prev->>'puntos_anadidos')::integer,
 vida_maxima_actual=case when vida_maxima_actual is not null then vida_maxima_actual+coalesce((prev->'atributos'->>'vida')::numeric,0)-coalesce((p.atributos->>'vida')::numeric,0) else null end where id=p.id;
 return prev-'atributos';
end;$$;

-- The inventory validator must see the character's actual level too.
create or replace function public.inventario_validar_requisitos_uso()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare p public.personajes%rowtype;t text;
begin
 t:=new.configuracion->>'tipo_creacion';
 if new.slot_equipado is not null or (coalesce(new.es_activo,true) and t in ('habilidad','pasiva')) then
  select * into p from public.personajes where id=new.personaje_id;
  if not public.forja_cumple_requisitos(new.configuracion->'requisitos_uso',p.raza,coalesce(p.atributos,'{}')||jsonb_build_object('nivel',coalesce(p.nivel,1))) then raise exception '%: no cumple los requisitos de raza, nivel o atributos base.',new.nombre;end if;
 end if;
 return new;
end;$$;

-- Replace random-choice endpoints too, so an old client cannot spend points elsewhere.
create or replace function public.progresion_dar_experiencia(p_personaje bigint,p_cantidad integer)
returns jsonb language sql security invoker set search_path='' as $$select private.arbol_dar_experiencia(p_personaje,p_cantidad,false)$$;
create or replace function public.progresion_opciones(p_personaje bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$begin raise exception 'Abre el árbol individual de este personaje.';end;$$;
create or replace function public.progresion_escoger_habilidad(p_personaje bigint,p_habilidad uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$begin raise exception 'Aprende desde un nodo del árbol individual.';end;$$;

create function public.arbol_leer(p_personaje bigint) returns jsonb language sql security invoker set search_path='' as $$select private.arbol_leer(p_personaje)$$;
create function public.arbol_guardar(p_personaje bigint,p_nodo uuid default null,p_padre uuid default null,p_tipo text default 'rama',p_nombre text default '',p_descripcion text default '',p_habilidad uuid default null,p_atributo text default null,p_incremento numeric default null,p_coste integer default 1,p_nivel integer default 1)
returns uuid language sql security invoker set search_path='' as $$select private.arbol_guardar(p_personaje,p_nodo,p_padre,p_tipo,p_nombre,p_descripcion,p_habilidad,p_atributo,p_incremento,p_coste,p_nivel)$$;
create function public.arbol_eliminar(p_personaje bigint,p_nodo uuid) returns void language sql security invoker set search_path='' as $$select private.arbol_eliminar(p_personaje,p_nodo)$$;
create function public.arbol_comprar(p_personaje bigint,p_nodo uuid) returns jsonb language sql security invoker set search_path='' as $$select private.arbol_comprar(p_personaje,p_nodo)$$;
create function public.arbol_prever_experiencia(p_personaje bigint,p_cantidad integer) returns jsonb language sql security invoker set search_path='' as $$select private.arbol_prever_experiencia(p_personaje,p_cantidad)$$;
create function public.arbol_dar_experiencia(p_personaje bigint,p_cantidad integer,p_confirmar_sin_habilidades boolean default false) returns jsonb language sql security invoker set search_path='' as $$select private.arbol_dar_experiencia(p_personaje,p_cantidad,p_confirmar_sin_habilidades)$$;
do $$declare f record;begin
 for f in select n.nspname,p.oid::regprocedure::text as firma from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('arbol_leer','arbol_guardar','arbol_eliminar','arbol_comprar','arbol_prever_experiencia','arbol_dar_experiencia') loop
 execute 'revoke all on function '||f.firma||' from public,anon';
 execute 'grant execute on function '||f.firma||' to authenticated';
 end loop;
end;$$;
-- RLS also applies to subscriptions; only character owners and the GM receive rows.
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='arbol_nodos') then alter publication supabase_realtime add table public.arbol_nodos;end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='personajes') then alter publication supabase_realtime add table public.personajes;end if;
 end if;
end;$$;
notify pgrst,'reload schema';
commit;
