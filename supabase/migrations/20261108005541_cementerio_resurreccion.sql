begin;
alter table public.cementerio_personajes
 add column resucitado_at timestamptz,add column destino text check(destino in ('dueno','creacion')),
 add column resucitado_por uuid references public.perfiles(id),add column creacion_id uuid references public.forja_maestra(id) on delete set null,
 add column personaje_revivido_id bigint;
alter table public.cementerio_personajes drop constraint cementerio_personajes_personaje_id_key;
create unique index cementerio_muerte_pendiente_idx on public.cementerio_personajes(personaje_id) where resucitado_at is null;
create index cementerio_creacion_idx on public.cementerio_personajes(creacion_id);
create index cementerio_resucitador_idx on public.cementerio_personajes(resucitado_por);
alter table public.forja_maestra add column recuperacion_cementerio jsonb;

-- Each death is preserved, even after the same character dies again.
create or replace function private.personaje_archivar() returns trigger language plpgsql security definer set search_path='' as $$
declare permiso text;
begin
 if new.estado_vida='muerto' then
  insert into public.cementerio_personajes(personaje_id,user_id,nombre,snapshot)
  values(new.id,new.user_id,new.nombre,jsonb_build_object('personaje',to_jsonb(new),
   'inventario',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at,i.id) from public.inventario_jugador i where i.personaje_id=new.id and i.user_id=new.user_id),'[]'),
   'arbol',coalesce((select jsonb_agg(to_jsonb(a)) from public.arbol_nodos a where a.personaje_id=new.id),'[]'),
   'naturalezas',coalesce((select jsonb_agg(to_jsonb(n)) from public.personaje_naturalezas n where n.personaje_id=new.id),'[]'),
   'naturalezas_combate',public.naturalezas_combate_snapshot(new.id)))
  on conflict(personaje_id) where resucitado_at is null do nothing;
  permiso:=current_setting('yugen.equipo_interno',true);perform set_config('yugen.equipo_interno',new.id::text,true);
  update public.inventario_jugador set personaje_id=null,slot_equipado=null where personaje_id=new.id and user_id=new.user_id and ligado_al_alma;
  perform set_config('yugen.equipo_interno',coalesce(permiso,''),true);
 end if;
 return new;
end;$$;
-- The existing guards can only be bypassed for the exact GM-authorized restoration.
do $$declare d text;begin
 d:=pg_get_functiondef('private.personaje_vitales()'::regprocedure);
 if position('if old.estado_vida=''muerto'' then' in d)=0 then raise exception 'No se reconoce el control del cementerio.';end if;
 d:=replace(d,'if old.estado_vida=''muerto'' then',
 'if old.estado_vida=''muerto'' and not (coalesce(current_setting(''yugen.revivir'',true),'''')=new.id::text and private.tienda_es_gm() and new.estado_vida=''vivo'') then');execute d;
 d:=pg_get_functiondef('private.combate_persistir_vitales()'::regprocedure);
 if position('where personaje_id=p.id and combate_id is null' in d)=0 then raise exception 'No se reconoce el historial del combate.';end if;
 d:=replace(d,'where personaje_id=p.id and combate_id is null','where personaje_id=p.id and combate_id is null and resucitado_at is null');execute d;
 d:=pg_get_functiondef('public.sincronizar_naturaleza()'::regprocedure);
 d:=replace(d,'if tg_op=''INSERT'' then','if tg_op=''INSERT'' and coalesce(current_setting(''yugen.revivir'',true),'''')=new.personaje_id::text and private.tienda_es_gm() then return new;end if; if tg_op=''INSERT'' then');
 d:=replace(d,'elsif tg_op=''DELETE'' then','elsif tg_op=''DELETE'' then if not exists(select 1 from public.personajes where id=old.personaje_id) then return old;end if;');execute d;
 d:=pg_get_functiondef('public.forja_guardar_snapshot_config()'::regprocedure);
 d:=replace(d,'if tg_table_name=''inventario_jugador'' then',
 'if tg_table_name=''inventario_jugador'' then if coalesce(current_setting(''yugen.revivir_item'',true),'''')=new.id::text and private.tienda_es_gm() then return new;end if;');execute d;
 -- Recovered cards preserve their independent backpack through the normal combat snapshot.
 d:=pg_get_functiondef('public.forja_snapshot_config(uuid)'::regprocedure);
 if position('''bonos_equipamiento'',bonos)' in d)=0 then raise exception 'No se reconoce la configuración del Yunque.';end if;
 d:=replace(d,'''bonos_equipamiento'',bonos)','''bonos_equipamiento'',bonos,''reserva'',coalesce(f.recuperacion_cementerio->''reserva'',''[]''))');execute d;
end;$$;

create function private.cementerio_prever(p_tumba uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t public.cementerio_personajes%rowtype;u public.perfiles%rowtype;motivo text;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede revivir personajes.' using errcode='42501';end if;
 select * into t from public.cementerio_personajes where id=p_tumba;
 if not found then raise exception 'Recuerdo no encontrado.';end if;
 select * into u from public.perfiles where id=t.user_id;
 if t.resucitado_at is not null then motivo:='Este recuerdo ya fue resucitado.';
 elsif u.id is null or u.rol<>'REENCARNADO' or u.estado<>'aprobado' then motivo:='La cuenta del dueño no está disponible o aprobada.';
 elsif exists(select 1 from public.personajes where id=t.personaje_id and estado_vida<>'muerto') then motivo:='El personaje ya está vivo.';
 elsif exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=t.personaje_id::text) then motivo:='Finaliza el encuentro anterior antes de devolver el personaje.';
 elsif not coalesce(u.mente_colmena,false) and exists(select 1 from public.personajes p where p.user_id=u.id and p.id<>t.personaje_id and p.estado_vida<>'muerto' and p.estado_aprobacion<>'rechazado' and not p.es_companero) then motivo:='El dueño ya tiene otro personaje o una solicitud pendiente. Necesita Mente colmena o liberar ese espacio.';
 end if;
 return jsonb_build_object('puede_devolver',motivo is null,'motivo',motivo,'dueno',u.email,'mente_colmena',coalesce(u.mente_colmena,false),'puede_creacion',t.resucitado_at is null);
end;$$;

create function private.cementerio_clonar_item(i jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare cfg jsonb:=coalesce(i->'configuracion','{}');v_tipo text;categoria text;nuevo uuid;
begin
 v_tipo:=coalesce(nullif(cfg->>'tipo_creacion',''),public.forja_tipo_inferido(i->>'tipo'));
 if v_tipo not in ('habilidad','pasiva','objeto','titulo') then v_tipo:='objeto';end if;
 select c.clave into categoria from public.categorias_forja c where c.clave=i->>'tipo';
 if categoria is null then select f.tipo into categoria from public.forja_maestra f where f.tipo_creacion=v_tipo limit 1;end if;
 categoria:=coalesce(categoria,case v_tipo when 'habilidad' then 'habilidades' when 'pasiva' then 'pasivas' else 'objetos' end);
 insert into public.forja_maestra(nombre,tipo,tipo_creacion,descripcion,imagen_url,stats,creador_id,estado,ligado_al_alma,slot_tipo,consumible,configuracion_dados,reglas,reglas_pasivas,requisitos_uso,configuracion_invocacion)
 values(left(coalesce(i->>'nombre','Pertenencia recuperada'),100),categoria,v_tipo,coalesce(i->>'descripcion',''),i->>'imagen_url',coalesce(i->'stats','{}'),auth.uid(),'aprobado',false,coalesce(i->>'slot_tipo','ninguno'),coalesce((cfg->>'consumible')::boolean,false),coalesce(cfg->'efectos','[]'),coalesce(cfg->'reglas','[]'),coalesce(cfg->'reglas_pasivas','[]'),coalesce(cfg->'requisitos_uso','{}'),cfg->'configuracion_invocacion') returning id into nuevo;
 return nuevo;
end;$$;
revoke all on function private.cementerio_clonar_item(jsonb) from public,anon,authenticated;

create function private.cementerio_revivir(p_tumba uuid,p_destino text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.cementerio_personajes%rowtype;p public.personajes%rowtype;existente public.personajes%rowtype;i jsonb;n public.arbol_nodos%rowtype;v public.personaje_naturalezas%rowtype;r record;
 prevision jsonb;categoria uuid;raza text;id_creacion uuid;id_item uuid;id_fuente uuid;tipo text;slot text;hs jsonb:='[]';ps jsonb:='[]';eq jsonb:='{}';reserva jsonb:='[]';motivo text;prev_permiso text;prev_item text;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede revivir personajes.' using errcode='42501';end if;
 if p_destino is null or p_destino not in ('dueno','creacion') then raise exception 'Elige devolver al dueño o crear una tarjeta.';end if;
 select * into t from public.cementerio_personajes where id=p_tumba for update;
 if not found then raise exception 'Recuerdo no encontrado.';end if;
 if t.resucitado_at is not null then raise exception 'Este recuerdo ya fue resucitado.';end if;
 p:=jsonb_populate_record(null::public.personajes,t.snapshot->'personaje');
 if p.nombre is null or jsonb_typeof(p.atributos) is distinct from 'object' then raise exception 'El recuerdo no contiene una ficha válida.';end if;
 select c.id,c.clave into categoria,raza from public.categorias_forja c where c.id=p.categoria_id or c.clave=p.raza order by (c.id=p.categoria_id) desc nulls last limit 1;
 if raza is null then raza:='personajes';select id into categoria from public.categorias_forja where clave=raza;end if;
 if p_destino='creacion' then
  for i in select value from jsonb_array_elements(coalesce(t.snapshot->'inventario','[]')) loop
   if coalesce((i->>'ligado_al_alma')::boolean,false) then continue;end if;
   id_item:=private.cementerio_clonar_item(i);
   select tipo_creacion into tipo from public.forja_maestra where id=id_item;
   slot:=nullif(i->>'slot_equipado','');
   if slot is not null then eq:=eq||jsonb_build_object(slot,id_item);
   elsif coalesce((i->>'es_activo')::boolean,true) and tipo='habilidad' then hs:=hs||to_jsonb(id_item);
   elsif coalesce((i->>'es_activo')::boolean,true) and tipo='pasiva' then ps:=ps||to_jsonb(id_item);end if;
   reserva:=reserva||jsonb_build_array(public.forja_snapshot_config(id_item)||jsonb_build_object('id',id_item,'nombre',i->>'nombre','descripcion',i->>'descripcion','imagen_url',i->>'imagen_url','slot_tipo',i->>'slot_tipo','stats',coalesce(i->'stats','{}')));
  end loop;
  for i in select value from jsonb_array_elements(coalesce(t.snapshot->'naturalezas_combate'->'habilidades','[]')) loop
   id_item:=private.cementerio_clonar_item(jsonb_build_object('nombre',i->>'nombre','tipo','habilidad','stats',coalesce(i->'stats','{}'),'configuracion',jsonb_build_object('tipo_creacion','habilidad','efectos',coalesce(i->'efectos','[]'),'reglas',coalesce(i->'reglas','[]'),'requisitos_uso',coalesce(i->'requisitos_uso','{}'))));hs:=hs||to_jsonb(id_item);
  end loop;
  for i in select value from jsonb_array_elements(coalesce(t.snapshot->'naturalezas_combate'->'pasivas','[]')) loop
   id_item:=private.cementerio_clonar_item(jsonb_build_object('nombre',i->>'nombre','tipo','pasiva','stats','{}'::jsonb,'configuracion',jsonb_build_object('tipo_creacion','pasiva','reglas',coalesce(i->'reglas_motor','[]'),'reglas_pasivas',coalesce(i->'reglas','[]'),'requisitos_uso',coalesce(i->'requisitos_uso','{}'))));ps:=ps||to_jsonb(id_item);
  end loop;
  insert into public.forja_maestra(nombre,tipo,tipo_creacion,descripcion,historia,defectos,stats,habilidades,pasivas,equipamiento,creador_id,estado,nivel,nivel_maximo,exp_total,recuperacion_cementerio)
   values(p.nombre,raza,'personaje','Resucitado desde el cementerio. '||coalesce(p.historia,''),coalesce(p.historia,''),coalesce(p.defecto,''),p.atributos,hs,ps,eq,auth.uid(),'aprobado',coalesce(p.nivel,1),100,coalesce(p.exp_total,0),jsonb_build_object('reserva',reserva)) returning id into id_creacion;
 else
  -- The same account lock is used by character requests and party assignments.
  perform pg_advisory_xact_lock(hashtextextended(t.user_id::text,0));
  prevision:=private.cementerio_prever(t.id);
  if not (prevision->>'puede_devolver')::boolean then raise exception '%',prevision->>'motivo';end if;
  select * into existente from public.personajes where id=t.personaje_id for update;
  if found and existente.user_id is distinct from t.user_id then raise exception 'La ficha original pertenece a otra cuenta.';end if;
  prev_permiso:=current_setting('yugen.revivir',true);perform set_config('yugen.revivir',t.personaje_id::text,true);
  if existente.id is not null then
   update public.personajes set nombre=p.nombre,raza=p.raza,categoria_id=categoria,atributos=p.atributos,historia=p.historia,defecto=p.defecto,lugar_reencarnacion=p.lugar_reencarnacion,estado_vida='vivo',estado_aprobacion='aprobado',vida_actual=greatest(1,coalesce((p.atributos->>'vida')::numeric,(p.atributos->>'hp')::numeric,1)),vida_maxima_actual=null,ph_actual=greatest(0,coalesce((p.atributos->>'ph')::numeric,0)),fatiga_actual=0,nivel=coalesce(p.nivel,1),exp_total=coalesce(p.exp_total,0),puntos_habilidad=coalesce(p.puntos_habilidad,0),habilidades_elegidas=coalesce(p.habilidades_elegidas,'[]'),es_companero=coalesce(p.es_companero,false),party_activo=coalesce(p.es_companero,false) where id=t.personaje_id;
  else
   insert into public.personajes(id,user_id,nombre,raza,categoria_id,atributos,historia,defecto,lugar_reencarnacion,estado_vida,estado_aprobacion,vida_actual,ph_actual,fatiga_actual,nivel,exp_total,puntos_habilidad,habilidades_elegidas,es_companero,party_activo)
   overriding system value values(t.personaje_id,t.user_id,p.nombre,p.raza,categoria,p.atributos,p.historia,p.defecto,p.lugar_reencarnacion,'vivo','aprobado',greatest(1,coalesce((p.atributos->>'vida')::numeric,(p.atributos->>'hp')::numeric,1)),greatest(0,coalesce((p.atributos->>'ph')::numeric,0)),0,coalesce(p.nivel,1),coalesce(p.exp_total,0),coalesce(p.puntos_habilidad,0),coalesce(p.habilidades_elegidas,'[]'),coalesce(p.es_companero,false),coalesce(p.es_companero,false));
  end if;
  -- Existing possessions stay where they are: never steal loot or soul belongings back.
  for i in select value from jsonb_array_elements(coalesce(t.snapshot->'inventario','[]')) loop
   if coalesce((i->>'ligado_al_alma')::boolean,false) or exists(select 1 from public.inventario_jugador where id::text=i->>'id') then continue;end if;
   id_item:=(i->>'id')::uuid;
   select id into id_fuente from public.forja_maestra where id::text=i->>'forja_id';
   prev_item:=current_setting('yugen.revivir_item',true);perform set_config('yugen.revivir_item',id_item::text,true);
   insert into public.inventario_jugador(id,user_id,personaje_id,forja_id,nombre,tipo,descripcion,imagen_url,clase,stats,ligado_al_alma,slot_tipo,slot_equipado,es_activo,configuracion,motivo_entrega)
    values(id_item,t.user_id,t.personaje_id,id_fuente,i->>'nombre',i->>'tipo',coalesce(i->>'descripcion',''),i->>'imagen_url',coalesce(i->>'clase','D'),coalesce(i->'stats','{}'),false,coalesce(i->>'slot_tipo','ninguno'),nullif(i->>'slot_equipado',''),coalesce((i->>'es_activo')::boolean,true),coalesce(i->'configuracion','{}'),'Resurrección desde el cementerio');
   perform set_config('yugen.revivir_item',coalesce(prev_item,''),true);
  end loop;
  if not exists(select 1 from public.arbol_nodos where personaje_id=t.personaje_id) then
   for r in with recursive nodos as (select value dato from jsonb_array_elements(coalesce(t.snapshot->'arbol','[]'))), camino as (
    select dato,0 prof from nodos where dato->>'padre_id' is null union all select jn.dato,wk.prof+1 from nodos jn join camino wk on jn.dato->>'padre_id'=wk.dato->>'id'
   ) select dato as v from camino order by prof loop
    n:=jsonb_populate_record(null::public.arbol_nodos,r.v);
    insert into public.arbol_nodos(id,personaje_id,padre_id,nombre,descripcion,tipo,habilidad_id,atributo,incremento,coste,nivel_minimo,aprendido_at,puntos_gastados)
    values(n.id,t.personaje_id,n.padre_id,n.nombre,n.descripcion,n.tipo,n.habilidad_id,n.atributo,n.incremento,n.coste,n.nivel_minimo,n.aprendido_at,n.puntos_gastados);
   end loop;
  end if;
  for r in select value v from jsonb_array_elements(coalesce(t.snapshot->'naturalezas','[]')) loop
   v:=jsonb_populate_record(null::public.personaje_naturalezas,r.v);
   if not exists(select 1 from public.personaje_naturalezas where personaje_id=t.personaje_id and naturaleza_id=v.naturaleza_id) then
    insert into public.personaje_naturalezas(id,personaje_id,naturaleza_id,origen,modificadores_aplicados,metadata,activa,adquirida_at)
    values(v.id,t.personaje_id,v.naturaleza_id,v.origen,v.modificadores_aplicados,v.metadata,v.activa,v.adquirida_at);
   end if;
  end loop;
  if coalesce(p.es_companero,false) then
   insert into public.party_companeros(user_id,personaje_id,creado_por) values(t.user_id,t.personaje_id,auth.uid()) on conflict(personaje_id) do update set user_id=excluded.user_id,activo=true,updated_at=now();
  end if;
  perform set_config('yugen.revivir',coalesce(prev_permiso,''),true);
 end if;
 update public.cementerio_personajes set resucitado_at=now(),destino=p_destino,resucitado_por=auth.uid(),creacion_id=id_creacion,personaje_revivido_id=case when p_destino='dueno' then t.personaje_id end where id=t.id;
 return jsonb_build_object('destino',p_destino,'nombre',p.nombre,'creacion_id',id_creacion,'personaje_id',case when p_destino='dueno' then t.personaje_id end);
end;$$;

create function public.cementerio_prever(p_tumba uuid) returns jsonb language sql security invoker set search_path='' as $$select private.cementerio_prever(p_tumba)$$;
create function public.cementerio_revivir(p_tumba uuid,p_destino text) returns jsonb language sql security invoker set search_path='' as $$select private.cementerio_revivir(p_tumba,p_destino)$$;
do $$declare f record;begin
 for f in select p.oid::regprocedure::text firma from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('cementerio_prever','cementerio_revivir') loop
 execute 'revoke all on function '||f.firma||' from public,anon';execute 'grant execute on function '||f.firma||' to authenticated';end loop;
end;$$;
notify pgrst,'reload schema';
commit;
