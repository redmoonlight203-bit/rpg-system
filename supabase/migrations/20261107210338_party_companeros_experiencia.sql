begin;
alter table public.personajes add column es_companero boolean not null default false,
 add column party_activo boolean not null default false,
 add column forja_origen_id uuid references public.forja_maestra(id) on delete set null;
create index personajes_forja_origen_idx on public.personajes(forja_origen_id);
create table public.party_companeros(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.perfiles(id),
 personaje_id bigint not null unique references public.personajes(id) on delete cascade,
 activo boolean not null default true,creado_por uuid not null references public.perfiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index party_usuario_idx on public.party_companeros(user_id,activo);
create index party_creador_idx on public.party_companeros(creado_por);
alter table public.party_companeros enable row level security;
revoke all on public.party_companeros from public,anon,authenticated;
grant select on public.party_companeros to authenticated;
create policy party_lectura on public.party_companeros for select to authenticated using((select private.tienda_es_gm()) or (activo and user_id=(select auth.uid()) and exists(select 1 from public.perfiles where id=(select auth.uid()) and estado='aprobado')));

create function private.party_comprobar_gm(p_usuario uuid) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede organizar una party.' using errcode='42501';end if;
 if not exists(select 1 from public.perfiles where id=p_usuario and rol='REENCARNADO' and estado='aprobado') then raise exception 'Elige una cuenta de jugador aprobada.';end if;
end;$$;
revoke all on function private.party_comprobar_gm(uuid) from public,anon,authenticated;

create function private.party_asignar(p_usuario uuid,p_forja uuid,p_personaje bigint,p_nombre text,p_nivel integer)
returns bigint language plpgsql security definer set search_path='' as $$
declare f public.forja_maestra%rowtype;p public.personajes%rowtype;h public.forja_maestra%rowtype;c uuid;s jsonb;r record;componente record;pj bigint;v numeric;n integer;
begin
 perform private.party_comprobar_gm(p_usuario);
 perform pg_advisory_xact_lock(hashtextextended(p_usuario::text,0));
 if (p_forja is null)=(p_personaje is null) then raise exception 'Selecciona una creación o un compañero retirado.';end if;
 if p_personaje is not null then
  select * into p from public.personajes where id=p_personaje and es_companero and not party_activo and estado_vida='vivo' and estado_aprobacion='aprobado' for update;
  if not found then raise exception 'El NPC ya está asignado o no está disponible.';end if;
  if exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=p.id::text) then raise exception 'Retira al compañero del encuentro antes de asignarlo.';end if;
  update public.personajes set user_id=p_usuario,party_activo=true where id=p.id;
  update public.inventario_jugador set user_id=p_usuario where personaje_id=p.id;
  pj:=p.id;
 else
  if p_nivel is null or p_nivel not between 1 and 100 then raise exception 'Elige un nivel entre 1 y 100.';end if;
  select * into f from public.forja_maestra where id=p_forja and tipo_creacion='personaje' and estado='aprobado' for share;
  if not found then raise exception 'Elige un NPC o ser vivo aprobado del Yunque.';end if;
  n:=p_nivel;
  if coalesce(f.es_grupo,false) and n>f.nivel_maximo then raise exception 'Esta especie admite hasta nivel %.',f.nivel_maximo;end if;
  if p_nombre is not null and length(btrim(p_nombre)) not between 1 and 100 then raise exception 'Nombre inválido.';end if;
  select id into c from public.categorias_forja where clave=f.tipo;
  select coalesce(jsonb_object_agg(a.clave,a.valor_defecto),'{}') into s from public.personaje_atributos_raza(c) a;
  s:=s||coalesce(f.stats,'{}');
  if coalesce(f.es_grupo,false) then
   for r in select * from jsonb_each(f.stats_rango) loop
    v:=(r.value->>'min')::numeric+((r.value->>'max')::numeric-(r.value->>'min')::numeric)*case when f.nivel_maximo=1 then 0 else (n-1)::numeric/(f.nivel_maximo-1) end;
    s:=s||jsonb_build_object(r.key,case when trunc((r.value->>'min')::numeric)=(r.value->>'min')::numeric and trunc((r.value->>'max')::numeric)=(r.value->>'max')::numeric then round(v) else round(v,2) end);
   end loop;
  end if;
  if not s ? 'vida' and s ? 'hp' then s:=s||jsonb_build_object('vida',s->'hp');end if;
  if coalesce((s->>'vida')::numeric,0)<=0 then raise exception 'Configura la vida del NPC en el Yunque.';end if;
  insert into public.personajes(user_id,nombre,raza,categoria_id,atributos,historia,estado_aprobacion,estado_vida,es_companero,party_activo,forja_origen_id,nivel,exp_total,puntos_habilidad)
   values(p_usuario,coalesce(nullif(btrim(p_nombre),''),f.nombre),f.tipo,c,s,coalesce(f.historia,f.descripcion,''),'aprobado','vivo',true,true,f.id,n,50::bigint*n*(n-1),3*(n-1)) returning id into pj;
  -- Each NPC receives independent inventory copies; the template is never edited.
  for componente in select value#>>'{}' as id,null::text as slot from jsonb_array_elements(f.habilidades)
   union all select value#>>'{}',null::text from jsonb_array_elements(f.pasivas)
   union all select value#>>'{}',key from jsonb_each(f.equipamiento) loop
   select * into h from public.forja_maestra where id::text=componente.id and estado='aprobado' for share;
   if not found then raise exception 'Una habilidad o pieza del NPC ya no está disponible.';end if;
   insert into public.inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,descripcion,imagen_url,clase,stats,ligado_al_alma,slot_tipo,slot_equipado,es_activo,motivo_entrega)
   values(p_usuario,pj,h.id,h.nombre,h.tipo,coalesce(h.descripcion,''),h.imagen_url,h.clase,public.forja_stats_componente(h.id),coalesce(h.ligado_al_alma,false),h.slot_tipo,componente.slot,true,'Equipo inicial del compañero');
  end loop;
  if f.configuracion_dados<>'[]'::jsonb or f.reglas<>'[]'::jsonb then
   insert into public.inventario_jugador(user_id,personaje_id,nombre,tipo,descripcion,clase,stats,ligado_al_alma,slot_tipo,es_activo,configuracion)
   values(p_usuario,pj,'Técnicas de '||f.nombre,'habilidad',coalesce(f.descripcion,''),f.clase,'{}',false,'ninguno',true,jsonb_build_object('tipo_creacion','habilidad','efectos',f.configuracion_dados,'reglas',f.reglas,'requisitos_uso','{}'::jsonb));
  end if;
  if f.reglas_pasivas<>'[]'::jsonb then
   insert into public.inventario_jugador(user_id,personaje_id,nombre,tipo,descripcion,clase,stats,ligado_al_alma,slot_tipo,es_activo,configuracion)
   values(p_usuario,pj,'Naturaleza de '||f.nombre,'pasiva',coalesce(f.descripcion,''),f.clase,'{}',false,'ninguno',true,jsonb_build_object('tipo_creacion','pasiva','reglas_pasivas',f.reglas_pasivas,'requisitos_uso','{}'::jsonb));
  end if;
 end if;
 insert into public.party_companeros(user_id,personaje_id,creado_por) values(p_usuario,pj,auth.uid())
 on conflict(personaje_id) do update set user_id=excluded.user_id,activo=true,updated_at=now();
 return pj;
end;$$;

create function private.party_retirar(p_personaje bigint) returns void language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;permiso text;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede retirar compañeros.' using errcode='42501';end if;
 select user_id into p.user_id from public.personajes where id=p_personaje;
 perform pg_advisory_xact_lock(hashtextextended(coalesce(p.user_id::text,''),0));
 select * into p from public.personajes where id=p_personaje and es_companero and party_activo and estado_vida='vivo' for update;
 if not found then raise exception 'Selecciona un compañero vivo de la party.';end if;
 if exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=p.id::text) then raise exception 'Retira al NPC del encuentro antes de quitarlo de la party.';end if;
 permiso:=current_setting('yugen.equipo_interno',true);perform set_config('yugen.equipo_interno',p.id::text,true);
 -- Account belongings return to their original owner's soul chest.
 update public.inventario_jugador set personaje_id=null,slot_equipado=null where personaje_id=p.id and ligado_al_alma;
 -- The NPC and its ordinary equipment return to GM control, retaining their history.
 update public.personajes set user_id=auth.uid(),party_activo=false where id=p.id;
 update public.inventario_jugador set user_id=auth.uid() where personaje_id=p.id;
 update public.party_companeros set activo=false,updated_at=now() where personaje_id=p.id;
 perform set_config('yugen.equipo_interno',coalesce(permiso,''),true);
end;$$;

create function private.party_prever_experiencia(p_usuario uuid,p_cantidad integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p record;prev jsonb;resultado jsonb:='[]';
begin
 perform private.party_comprobar_gm(p_usuario);
 if p_cantidad is null or p_cantidad not between 1 and 1000000 then raise exception 'Concede entre 1 y 1000000 XP por integrante.';end if;
 for p in select id from public.personajes where user_id=p_usuario and estado_vida='vivo' and estado_aprobacion='aprobado' and (not es_companero or exists(select 1 from public.party_companeros m where m.personaje_id=personajes.id and m.user_id=p_usuario and m.activo)) order by id loop
  prev:=private.arbol_prever_experiencia(p.id,p_cantidad);resultado:=resultado||jsonb_build_array(prev-'atributos');
 end loop;
 if resultado='[]'::jsonb then raise exception 'Esta party no tiene integrantes vivos y aprobados.';end if;
 return resultado;
end;$$;

create function private.party_dar_experiencia(p_usuario uuid,p_cantidad integer,p_confirmar boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare previsiones jsonb;prev jsonb;resultado jsonb:='[]';
begin
 perform private.party_comprobar_gm(p_usuario);
 perform pg_advisory_xact_lock(hashtextextended(p_usuario::text,0));
 perform 1 from public.personajes where user_id=p_usuario and estado_vida='vivo' order by id for update;
 previsiones:=private.party_prever_experiencia(p_usuario,p_cantidad);
 if not coalesce(p_confirmar,false) and exists(select 1 from jsonb_array_elements(previsiones) x where jsonb_array_length(x->'avisos')>0) then raise exception 'Faltan habilidades en uno o varios árboles de la party. Revisa los avisos antes de conceder XP.';end if;
 for prev in select value from jsonb_array_elements(previsiones) loop
  resultado:=resultado||jsonb_build_array(private.arbol_dar_experiencia((prev->>'personaje')::bigint,p_cantidad,true));
 end loop;
 return resultado;
end;$$;

-- Companions do not consume a player's character-creation slots.
do $$declare d text;begin
 d:=pg_get_functiondef('private.personaje_solicitar(uuid,text,text,text,text,jsonb,bigint)'::regprocedure);
 if position('where user_id=u.id and estado_vida<>''muerto''' in d)=0 then raise exception 'No se reconoce la comprobación de personajes.';end if;
 d:=replace(d,'where user_id=u.id and estado_vida<>''muerto''','where user_id=u.id and not es_companero and estado_vida<>''muerto''');
 d:=replace(d,'where id=p_personaje and user_id=u.id and estado_vida=''vivo''','where id=p_personaje and user_id=u.id and not es_companero and estado_vida=''vivo''');
 execute d;
 -- Central XP preview is also used by single awards and the legacy endpoint.
 d:=pg_get_functiondef('private.arbol_prever_experiencia(bigint,integer)'::regprocedure);
 if position('n:=p.nivel;' in d)=0 then raise exception 'No se reconoce la progresión del árbol.';end if;
 d:=replace(d,'n:=p.nivel;',
 'if not exists(select 1 from public.perfiles where id=p.user_id and rol=''REENCARNADO'' and estado=''aprobado'') or (p.es_companero and not exists(select 1 from public.party_companeros m where m.personaje_id=p.id and m.user_id=p.user_id and m.activo)) then raise exception ''Solo los personajes de jugador y sus compañeros activos reciben experiencia.'';end if; n:=p.nivel;');
 execute d;
end;$$;
-- Unequipped soul skills in the chest have no character whose requirements to test.
do $$declare d text;begin
 d:=pg_get_functiondef('public.inventario_validar_requisitos_uso()'::regprocedure);
 if position('if new.slot_equipado is not null or (coalesce(new.es_activo,true) and t in (''habilidad'',''pasiva'')) then' in d)=0 then raise exception 'No se reconoce la validación del inventario.';end if;
 d:=replace(d,'if new.slot_equipado is not null or (coalesce(new.es_activo,true) and t in (''habilidad'',''pasiva'')) then',
 'if new.personaje_id is not null and (new.slot_equipado is not null or (coalesce(new.es_activo,true) and t in (''habilidad'',''pasiva''))) then');execute d;
end;$$;
-- Creature templates retain configurable levels, but never receive player XP.
create or replace function public.progresion_dar_experiencia_creacion(p_forja uuid,p_cantidad integer) returns jsonb language plpgsql security invoker set search_path='' as $$
begin raise exception 'La experiencia solo se concede a personajes de jugador y compañeros de su party.';end;$$;

create function public.party_asignar(p_usuario uuid,p_forja uuid default null,p_personaje bigint default null,p_nombre text default null,p_nivel integer default 1) returns bigint language sql security invoker set search_path='' as $$select private.party_asignar(p_usuario,p_forja,p_personaje,p_nombre,p_nivel)$$;
create function public.party_retirar(p_personaje bigint) returns void language sql security invoker set search_path='' as $$select private.party_retirar(p_personaje)$$;
create function public.party_prever_experiencia(p_usuario uuid,p_cantidad integer) returns jsonb language sql security invoker set search_path='' as $$select private.party_prever_experiencia(p_usuario,p_cantidad)$$;
create function public.party_dar_experiencia(p_usuario uuid,p_cantidad integer,p_confirmar boolean default false) returns jsonb language sql security invoker set search_path='' as $$select private.party_dar_experiencia(p_usuario,p_cantidad,p_confirmar)$$;
do $$declare f record;begin
 for f in select p.oid::regprocedure::text firma from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('party_asignar','party_retirar','party_prever_experiencia','party_dar_experiencia') loop
 execute 'revoke all on function '||f.firma||' from public,anon';execute 'grant execute on function '||f.firma||' to authenticated';
 end loop;
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='party_companeros') then alter publication supabase_realtime add table public.party_companeros;end if;
end;$$;
notify pgrst,'reload schema';
commit;
