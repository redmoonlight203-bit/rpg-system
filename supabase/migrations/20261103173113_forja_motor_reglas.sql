begin;
alter table public.forja_maestra add column if not exists reglas jsonb not null default '[]'::jsonb;
-- JSON is declarative data, never SQL or executable JavaScript.
create or replace function public.forja_validar_bloque_motor(v jsonb, clase text, profundidad integer default 0) returns void language plpgsql set search_path=public,pg_temp as $$
declare x jsonb;k text;t text;
begin
 if profundidad>8 or jsonb_typeof(v) is distinct from 'object' then raise exception 'Bloque de regla inválido o demasiado profundo.';end if;
 t:=v->>'tipo';
 if clase='valor' then
  for k in select jsonb_object_keys(v) loop
   if k not in ('dados','caras','bono','atributo','desde','escala','evento') then raise exception 'Campo de fórmula desconocido: %',k;end if;
  end loop;
  for k in select unnest(array['dados','caras','bono','escala']) loop
   if v ? k and (jsonb_typeof(v->k)<>'number' or abs((v->>k)::numeric)>1000000) then raise exception 'Fórmula inválida.';end if;
  end loop;
  if v ? 'dados' and ((v->>'dados')::numeric not between 0 and 100 or (v->>'dados')::numeric<>trunc((v->>'dados')::numeric)) then raise exception 'Dados inválidos.';end if;
  if coalesce((v->>'dados')::numeric,0)>0 and (not v ? 'caras' or (v->>'caras')::numeric not between 2 and 1000 or (v->>'caras')::numeric<>trunc((v->>'caras')::numeric)) then raise exception 'Caras inválidas.';end if;
  if v ? 'desde' and v->>'desde' not in ('yo','actor','objetivo') then raise exception 'Sujeto inválido.';end if;
  if v ? 'atributo' and v->>'atributo' !~ '^[a-z_][a-z0-9_]{0,63}$' then raise exception 'Atributo inválido.';end if;
  return;
 end if;
 if clase='condicion' then
  if t is null or t not in ('siempre','todas','alguna','no','estado','comparar','elemento','probabilidad') then raise exception 'Condición desconocida.';end if;
  if t in ('todas','alguna') then
   if jsonb_typeof(v->'condiciones') is distinct from 'array' or jsonb_array_length(v->'condiciones') not between 1 and 50 then raise exception 'Grupo inválido.';end if;
   for x in select value from jsonb_array_elements(v->'condiciones') loop perform public.forja_validar_bloque_motor(x,'condicion',profundidad+1);end loop;
  elsif t='no' then perform public.forja_validar_bloque_motor(v->'condicion','condicion',profundidad+1);
  elsif t in ('estado','comparar') then
   if coalesce(v->>'sujeto','') not in ('yo','actor','objetivo') then raise exception 'Sujeto inválido.';end if;
   if t='estado' and (length(btrim(coalesce(v->>'estado',''))) not between 1 and 100) then raise exception 'Estado inválido.';end if;
   if t='comparar' and (coalesce(v->>'atributo','') !~ '^[a-z_][a-z0-9_]{0,63}$' or coalesce(v->>'operador','') not in ('<','<=','=','>=','>') or jsonb_typeof(v->'valor') is distinct from 'number' or abs((v->>'valor')::numeric)>1000000) then raise exception 'Comparación inválida.';end if;
  elsif t='elemento' and coalesce(v->>'elemento','') not in ('ninguno','fuego','agua','hielo','electricidad','luz_sagrada') then raise exception 'Elemento inválido.';
  elsif t='probabilidad' and (jsonb_typeof(v->'porcentaje') is distinct from 'number' or (v->>'porcentaje')::numeric not between 0 and 100) then raise exception 'Probabilidad inválida.';end if;
  return;
 end if;
 if t is null or t not in ('atributo','transformar','estado','quitar_estado','dano','curar','ph','fatiga','perder_accion','salvacion','condicional','habilidad','mensaje') or coalesce(v->>'destino','') not in ('yo','actor','objetivo','aliados','enemigos','todos') then raise exception 'Efecto inválido.';end if;
 for k in select unnest(array['duracion','limite']) loop
  if v ? k and (jsonb_typeof(v->k)<>'number' or (v->>k)::numeric not between 0 and 1000000 or (v->>k)::numeric<>trunc((v->>k)::numeric)) then raise exception 'Duración o límite inválido.';end if;
 end loop;
 if v ? 'valor' then
  if jsonb_typeof(v->'valor')='object' then perform public.forja_validar_bloque_motor(v->'valor','valor',profundidad+1);
  elsif jsonb_typeof(v->'valor')<>'number' or abs((v->>'valor')::numeric)>1000000 then raise exception 'Valor inválido.';end if;
 end if;
 if t='atributo' and (coalesce(v->>'atributo','') !~ '^[a-z_][a-z0-9_]{0,63}$' or coalesce(v->>'operacion','') not in ('sumar','multiplicar','fijar') or not v ? 'valor') then raise exception 'Cambio de atributo inválido.';end if;
 if coalesce((v->>'permanente')::boolean,false) and (t<>'atributo' or v->>'operacion'<>'sumar') then raise exception 'Los cambios permanentes deben sumar un atributo.';end if;
 if t in ('estado','quitar_estado','transformar') and length(btrim(coalesce(v->>'clave',''))) not between 1 and 100 then raise exception 'Falta clave de estado o forma.';end if;
 if t='transformar' then
  if jsonb_typeof(v->'cambios') is distinct from 'array' or jsonb_array_length(v->'cambios') not between 1 and 30 then raise exception 'Transformación inválida.';end if;
  for x in select value from jsonb_array_elements(v->'cambios') loop perform public.forja_validar_bloque_motor(x||'{"tipo":"atributo","destino":"yo"}'::jsonb,'efecto',profundidad+1);end loop;
 end if;
 if t in ('salvacion','condicional') then
  if t='salvacion' and (coalesce(v->>'atributo','') !~ '^[a-z_][a-z0-9_]{0,63}$' or jsonb_typeof(v->'cd') is distinct from 'number' or (v->>'cd')::numeric not between 1 and 1000) then raise exception 'Salvación inválida.';end if;
  if t='condicional' then perform public.forja_validar_bloque_motor(v->'condicion','condicion',profundidad+1);end if;
  for k in select unnest(array['exito','fallo']) loop
   if jsonb_typeof(coalesce(v->k,'[]'))<>'array' or jsonb_array_length(coalesce(v->k,'[]'))>50 then raise exception 'Rama inválida.';end if;
   for x in select value from jsonb_array_elements(coalesce(v->k,'[]')) loop perform public.forja_validar_bloque_motor(x,'efecto',profundidad+1);end loop;
  end loop;
 end if;
 if t='habilidad' and (jsonb_typeof(v->'accion') is distinct from 'object' or coalesce(v->'accion'->>'efecto','') not in ('dano','curacion','recuperar_ph','reducir_fatiga','estado','crear_arma') or length(btrim(coalesce(v->'accion'->>'nombre','')))=0 or jsonb_typeof(v->'accion'->'cantidad') is distinct from 'number' or (v->'accion'->>'cantidad')::numeric not between 0 and 100 or jsonb_typeof(v->'accion'->'caras') is distinct from 'number' or (v->'accion'->>'caras')::numeric not between 2 and 1000) then raise exception 'Acción temporal inválida.';end if;
end;$$;
create or replace function public.forja_validar_motor() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare r jsonb;e jsonb;k text;ids text[]:='{}';
begin
 if jsonb_typeof(new.reglas)<>'array' or jsonb_array_length(new.reglas)>40 or octet_length(new.reglas::text)>200000 then raise exception 'Máximo 40 reglas y 200 KB por creación.';end if;
 for r in select value from jsonb_array_elements(new.reglas) loop
  if jsonb_typeof(r)<>'object' or length(btrim(coalesce(r->>'id','')))=0 or r->>'id'=any(ids) or length(btrim(coalesce(r->>'nombre',''))) not between 1 and 120 or coalesce(r->>'evento','') not in ('usar','inicio_combate','inicio_turno','fin_turno','atacar','impactar','fallar','recibir_dano','causar_dano','matar','morir','fin_combate') then raise exception 'Regla inválida.';end if;
  ids:=array_append(ids,r->>'id');
  for k in select unnest(array['coste_ph','coste_fatiga','enfriamiento','usos','prioridad']) loop
   if jsonb_typeof(r->k) is distinct from 'number' or (r->>k)::numeric<>trunc((r->>k)::numeric) or (r->>k)::numeric not between (case when k='prioridad' then -1000 else 0 end) and (case when k='prioridad' then 1000 else 1000000 end) then raise exception 'Costes o límites inválidos.';end if;
  end loop;
  perform public.forja_validar_bloque_motor(r->'condicion','condicion');
  if jsonb_typeof(r->'efectos') is distinct from 'array' or jsonb_array_length(r->'efectos') not between 1 and 50 then raise exception 'Configura los efectos.';end if;
  for e in select value from jsonb_array_elements(r->'efectos') loop perform public.forja_validar_bloque_motor(e,'efecto');end loop;
 end loop;return new;
end;$$;
create trigger forja_validar_motor before insert or update of reglas on public.forja_maestra for each row execute function public.forja_validar_motor();

create or replace function public.forja_snapshot_config(p_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.forja_maestra%rowtype; item public.forja_maestra%rowtype; h jsonb; par record; s jsonb; attr record;
 pasivas jsonb:='[]'::jsonb; habilidades jsonb:='[]'::jsonb; equipo jsonb:='{}'::jsonb; bonos jsonb:='{}'::jsonb;
begin
 if auth.uid() is null then raise exception 'Inicia sesión.' using errcode='42501';end if;
 select * into f from public.forja_maestra where id=p_id;
 if not found then return '{}'::jsonb; end if;
 if f.tipo_creacion='personaje' then
  for h in select value from jsonb_array_elements(f.pasivas) loop
   select * into item from public.forja_maestra where id::text=h#>>'{}' and tipo_creacion='pasiva' and estado='aprobado';
   if not found then raise exception 'Una pasiva ya no está disponible.';end if;
   pasivas:=pasivas||jsonb_build_array(jsonb_build_object('id',item.id,'nombre',item.nombre,'reglas',item.reglas_pasivas,'reglas_motor',item.reglas));
  end loop;
  for h in select value from jsonb_array_elements(coalesce(f.habilidades,'[]'::jsonb)) loop
   select * into item from public.forja_maestra where id::text=h#>>'{}' and tipo_creacion='habilidad' and estado='aprobado';
   if not found then raise exception 'Una habilidad del personaje ya no está disponible.'; end if;
   habilidades:=habilidades||jsonb_build_array(jsonb_build_object('id',item.id,'nombre',item.nombre,'stats',public.forja_stats_componente(item.id),'efectos',item.configuracion_dados,'reglas',item.reglas));
  end loop;
  for par in select * from jsonb_each_text(f.equipamiento) loop
   select * into item from public.forja_maestra where id::text=par.value and tipo_creacion in ('objeto','titulo') and estado='aprobado';
   if not found then raise exception 'Una pieza de equipo ya no está disponible.'; end if;
   s:=public.forja_stats_componente(item.id);
   equipo:=equipo||jsonb_build_object(par.key,jsonb_build_object('id',item.id,'nombre',item.nombre,'slot_tipo',item.slot_tipo,'stats',s,'efectos',item.configuracion_dados,'reglas',item.reglas,'reglas_pasivas',item.reglas_pasivas));
   for attr in select * from jsonb_each(s) loop
    if jsonb_typeof(attr.value)='number' and attr.key not in ('peso','durabilidad','dados_dano','caras_dano','dano') then
     bonos:=bonos||jsonb_build_object(attr.key,coalesce((bonos->>attr.key)::numeric,0)+(attr.value::text)::numeric);
    end if;
   end loop;
  end loop;
 end if;
 return jsonb_build_object('reglas',f.reglas,'pasivas',pasivas,'reglas_pasivas',f.reglas_pasivas,'tipo_creacion',f.tipo_creacion,'efectos',f.configuracion_dados,'habilidades',habilidades,'equipamiento',equipo,'bonos_equipamiento',bonos);
end;
$$;

create or replace function public.combate_preparar_jugador(p_personaje bigint) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.personajes%rowtype; i public.inventario_jugador%rowtype; s jsonb; base jsonb; config jsonb; equipo jsonb:='{}'; bonos jsonb:='{}'; habilidades jsonb:='[]'; pasivas jsonb:='[]'; a record; t text; efectos jsonb; pieza jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then raise exception 'Solo Kuroi puede preparar jugadores.' using errcode='42501'; end if;
 select * into p from public.personajes where id=p_personaje and estado_aprobacion='aprobado' and estado_vida='vivo';
 if not found then raise exception 'Selecciona un personaje aprobado y vivo.';end if;
 s:=coalesce(p.atributos,'{}'); if not s ? 'vida' and s ? 'hp' then s:=s||jsonb_build_object('vida',s->'hp');end if;base:=s;
 for i in select * from public.inventario_jugador where personaje_id=p.id and user_id=p.user_id order by created_at,id loop
  t:=coalesce(nullif(i.configuracion->>'tipo_creacion',''),public.forja_tipo_inferido(i.tipo));
  efectos:=coalesce(i.configuracion->'efectos','[]');
  if efectos='[]'::jsonb and not coalesce(i.configuracion,'{}') ? 'efectos' and coalesce((i.stats->>'dados_dano')::int,0)>0 and coalesce((i.stats->>'caras_dano')::int,0)>=2 then
   efectos:=jsonb_build_array(jsonb_build_object('id',i.id::text,'nombre','Ataque','efecto','dano','cantidad',(i.stats->>'dados_dano')::int,'caras',(i.stats->>'caras_dano')::int,'modificador',coalesce((i.stats->>'dano')::numeric,0),'duracion',0,'coste_ph',0,'estado','','tipo_dano','físico'));
  end if;
  pieza:=jsonb_build_object('id',i.id,'nombre',i.nombre,'stats',coalesce(i.stats,'{}'),'efectos',efectos,'slot_tipo',i.slot_tipo,'reglas',coalesce(i.configuracion->'reglas','[]'),'reglas_pasivas',coalesce(i.configuracion->'reglas_pasivas','[]'));
  if i.slot_equipado is not null and i.slot_equipado<>'' then
   if equipo ? i.slot_equipado then raise exception 'Hay dos piezas en el mismo espacio. Revisa el equipamiento.';end if;
   equipo:=equipo||jsonb_build_object(i.slot_equipado,pieza);
   for a in select * from jsonb_each(coalesce(i.stats,'{}')) loop
    if jsonb_typeof(a.value)='number' and a.key not in ('peso','durabilidad','dados_dano','caras_dano','dano') then bonos:=bonos||jsonb_build_object(a.key,coalesce((bonos->>a.key)::numeric,0)+(a.value::text)::numeric);end if;
   end loop;
  elsif coalesce(i.es_activo,true) then
   if t in ('habilidad','objeto','titulo') then habilidades:=habilidades||jsonb_build_array(pieza);end if;
   if t='pasiva' then pasivas:=pasivas||jsonb_build_array(jsonb_build_object('id',i.id,'nombre',i.nombre,'reglas_motor',coalesce(i.configuracion->'reglas','[]'),'reglas',coalesce(i.configuracion->'reglas_pasivas','[]')));end if;
  end if;
 end loop;
 for a in select * from jsonb_each(bonos) loop s:=s||jsonb_build_object(a.key,coalesce((s->>a.key)::numeric,0)+(a.value::text)::numeric);end loop;
 config:=jsonb_build_object('tipo_creacion','personaje','stats_base',base,'equipamiento',equipo,'bonos_equipamiento',bonos,'habilidades',habilidades,'pasivas',pasivas,'reglas_pasivas','[]'::jsonb);
 return jsonb_build_object('id',gen_random_uuid(),'forja_id',null,'personaje_id',p.id::text,'nombre',p.nombre,'stats',s,'configuracion',config,'requiere_configuracion',not base ? 'vida');
end;$$;
-- Applies only to real player sheets; forged templates remain reusable templates.
create or replace function public.combate_confirmar_progreso(p_id uuid,p_version integer) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare fila public.combates_yugen%rowtype;m jsonb;g jsonb;p public.personajes%rowtype;a jsonb;k text;delta numeric;ident bigint;vistos text[]:='{}';
begin
 if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then raise exception 'Solo Kuroi puede aplicar progreso.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into fila from public.combates_yugen where id=p_id and creador_id=auth.uid() for update;
 if not found then raise exception 'Encuentro no disponible.';end if;
 if coalesce((fila.datos->>'progreso_confirmado')::boolean,false) then return jsonb_build_object('version',fila.version,'datos',fila.datos);end if;
 if fila.version<>p_version or fila.datos->>'fase'<>'finalizado' then raise exception 'Termina y recarga el encuentro antes de aplicar progreso.';end if;
 for m in select value from jsonb_array_elements(fila.datos->'miembros') order by value->>'personaje_id' loop
  if coalesce(m->>'personaje_id','')='' then continue;end if;
  if m->>'personaje_id'=any(vistos) then raise exception 'Jugador duplicado en el encuentro.';end if;vistos:=array_append(vistos,m->>'personaje_id');
  ident:=(m->>'personaje_id')::bigint;
  select * into p from public.personajes where id=ident for update;
  if not found then raise exception 'Una ficha de jugador ya no existe.';end if;
  a:=coalesce(p.atributos,'{}');
  for g in select value from jsonb_array_elements(coalesce(m->'motor'->'progreso','[]')) loop
   k:=g->>'atributo';
   if k is null or k !~ '^[a-z_][a-z0-9_]{0,63}$' or jsonb_typeof(g->'delta') is distinct from 'number' then raise exception 'Progreso inválido.';end if;
   delta:=(g->>'delta')::numeric;if abs(delta)>1000000 then raise exception 'Progreso fuera de rango.';end if;
   if k='vida' and not a ? 'vida' and a ? 'hp' then a:=a||jsonb_build_object('vida',a->'hp');end if;
   a:=a||jsonb_build_object(k,coalesce((a->>k)::numeric,0)+delta);
   if k='vida' and a ? 'hp' then a:=a||jsonb_build_object('hp',a->'vida');end if;
  end loop;
  update public.personajes set atributos=a where id=ident;
 end loop;
 update public.combates_yugen set datos=(datos||'{"progreso_confirmado":true}'::jsonb)-'historial',version=version+1,updated_at=now() where id=p_id returning * into fila;
 return jsonb_build_object('version',fila.version,'datos',fila.datos);
end;$$;
revoke all on function public.combate_confirmar_progreso(uuid,integer) from public,anon;
grant execute on function public.combate_confirmar_progreso(uuid,integer) to authenticated;
-- A confirmed encounter is immutable, including stale clients and custom API calls.
create or replace function public.combate_proteger_progreso() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if coalesce((old.datos->>'progreso_confirmado')::boolean,false) and new.datos is distinct from old.datos then raise exception 'El progreso de este encuentro ya está confirmado.';end if;
 return new;
end;$$;
create trigger combate_proteger_progreso before update on public.combates_yugen for each row execute function public.combate_proteger_progreso();
commit;
