begin;
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
  if t is null or t not in ('estado_terminado','siempre','todas','alguna','no','estado','comparar','elemento','probabilidad') then raise exception 'Condición desconocida.';end if;
  if t='estado_terminado' then if length(btrim(coalesce(v->>'clave',''))) not between 1 and 100 then raise exception 'Falta clave de estado terminado.';end if;return;end if;
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
  if jsonb_typeof(r)<>'object' or length(btrim(coalesce(r->>'id','')))=0 or r->>'id'=any(ids) or length(btrim(coalesce(r->>'nombre',''))) not between 1 and 120 or coalesce(r->>'evento','') not in ('equipar','desequipar','fin_efecto','usar','inicio_combate','inicio_turno','fin_turno','atacar','impactar','fallar','recibir_dano','causar_dano','matar','morir','fin_combate') then raise exception 'Regla inválida.';end if;
  ids:=array_append(ids,r->>'id');
  for k in select unnest(array['coste_ph','coste_fatiga','enfriamiento','usos','prioridad']) loop
   if jsonb_typeof(r->k) is distinct from 'number' or (r->>k)::numeric<>trunc((r->>k)::numeric) or (r->>k)::numeric not between (case when k='prioridad' then -1000 else 0 end) and (case when k='prioridad' then 1000 else 1000000 end) then raise exception 'Costes o límites inválidos.';end if;
  end loop;
  perform public.forja_validar_bloque_motor(r->'condicion','condicion');
  if jsonb_typeof(r->'efectos') is distinct from 'array' or jsonb_array_length(r->'efectos') not between 1 and 50 then raise exception 'Configura los efectos.';end if;
  for e in select value from jsonb_array_elements(r->'efectos') loop perform public.forja_validar_bloque_motor(e,'efecto');end loop;
 end loop;
 for e in select value from jsonb_array_elements(new.configuracion_dados) loop
  if e ? 'requisito_forma' and (coalesce(e->'requisito_forma'->>'atributo','') !~ '^[a-z_][a-z0-9_]{0,63}$' or jsonb_typeof(e->'requisito_forma'->'minimo') is distinct from 'number') then raise exception 'Requisito de forma inválido.';end if;
 end loop;return new;
end;$$;

drop trigger if exists forja_validar_motor on public.forja_maestra;
create trigger forja_validar_motor before insert or update of reglas,configuracion_dados on public.forja_maestra for each row execute function public.forja_validar_motor();
create schema if not exists yugen_interno;
revoke all on schema yugen_interno from public,anon,authenticated;
grant usage on schema yugen_interno to service_role;
create or replace function yugen_interno.preparar_jugador(p_personaje bigint) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.personajes%rowtype; i public.inventario_jugador%rowtype; s jsonb; base jsonb; config jsonb; equipo jsonb:='{}'; bonos jsonb:='{}'; habilidades jsonb:='[]'; pasivas jsonb:='[]'; a record; t text; efectos jsonb; pieza jsonb;reserva jsonb:='[]';
begin

 select * into p from public.personajes where id=p_personaje;
 if not found then raise exception 'Selecciona un personaje aprobado y vivo.';end if;
 s:=coalesce(p.atributos,'{}'); if not s ? 'vida' and s ? 'hp' then s:=s||jsonb_build_object('vida',s->'hp');end if;base:=s;
 for i in select * from public.inventario_jugador where personaje_id=p.id and user_id=p.user_id order by created_at,id loop
  t:=coalesce(nullif(i.configuracion->>'tipo_creacion',''),public.forja_tipo_inferido(i.tipo));
  efectos:=coalesce(i.configuracion->'efectos','[]');
  if efectos='[]'::jsonb and not coalesce(i.configuracion,'{}') ? 'efectos' and coalesce((i.stats->>'dados_dano')::int,0)>0 and coalesce((i.stats->>'caras_dano')::int,0)>=2 then
   efectos:=jsonb_build_array(jsonb_build_object('id',i.id::text,'nombre','Ataque','efecto','dano','cantidad',(i.stats->>'dados_dano')::int,'caras',(i.stats->>'caras_dano')::int,'modificador',coalesce((i.stats->>'dano')::numeric,0),'duracion',0,'coste_ph',0,'estado','','tipo_dano','físico'));
  end if;
  pieza:=jsonb_build_object('id',i.id,'nombre',i.nombre,'stats',coalesce(i.stats,'{}'),'efectos',efectos,'slot_tipo',i.slot_tipo,'reglas',coalesce(i.configuracion->'reglas','[]'),'reglas_pasivas',coalesce(i.configuracion->'reglas_pasivas','[]'));
  if t in ('objeto','titulo') then reserva:=reserva||jsonb_build_array(pieza);end if;
  if i.slot_equipado is not null and i.slot_equipado<>'' then
   if equipo ? i.slot_equipado then raise exception 'Hay dos piezas en el mismo espacio. Revisa el equipamiento.';end if;
   equipo:=equipo||jsonb_build_object(i.slot_equipado,pieza);
   for a in select * from jsonb_each(coalesce(i.stats,'{}')) loop
    if jsonb_typeof(a.value)='number' and a.key not in ('peso','durabilidad','dados_dano','caras_dano','dano') then bonos:=bonos||jsonb_build_object(a.key,coalesce((bonos->>a.key)::numeric,0)+(a.value::text)::numeric);end if;
   end loop;
  elsif coalesce(i.es_activo,true) then
   if t='habilidad' then habilidades:=habilidades||jsonb_build_array(pieza);end if;
   if t='pasiva' then pasivas:=pasivas||jsonb_build_array(jsonb_build_object('id',i.id,'nombre',i.nombre,'reglas_motor',coalesce(i.configuracion->'reglas','[]'),'reglas',coalesce(i.configuracion->'reglas_pasivas','[]')));end if;
  end if;
 end loop;
 for a in select * from jsonb_each(bonos) loop s:=s||jsonb_build_object(a.key,coalesce((s->>a.key)::numeric,0)+(a.value::text)::numeric);end loop;
 config:=jsonb_build_object('reserva',reserva,'tipo_creacion','personaje','stats_base',base,'equipamiento',equipo,'bonos_equipamiento',bonos,'habilidades',habilidades,'pasivas',pasivas,'reglas_pasivas','[]'::jsonb);
 return jsonb_build_object('id',gen_random_uuid(),'forja_id',null,'personaje_id',p.id::text,'nombre',p.nombre,'stats',s,'configuracion',config,'requiere_configuracion',not base ? 'vida');
end;$$;
create or replace function public.combate_preparar_jugador(p_personaje bigint) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then raise exception 'Solo Kuroi puede preparar jugadores.' using errcode='42501';end if;
 if not exists(select 1 from public.personajes where id=p_personaje and estado_aprobacion='aprobado' and estado_vida='vivo') then raise exception 'Selecciona un personaje aprobado y vivo.';end if;
 return yugen_interno.preparar_jugador(p_personaje);
end;$$;
-- Only the authenticated Edge handler can invoke these wrappers using its server key.
create or replace function yugen_interno.contexto_equipo(p_usuario uuid,p_personaje bigint,p_combate uuid,p_actor text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.personajes%rowtype;b public.combates_yugen%rowtype;m jsonb;preparado jsonb;gm boolean;cuenta integer;
begin
 select exists(select 1 from public.perfiles where id=p_usuario and rol='KUROI') into gm;
 if p_usuario is null then raise exception 'Inicia sesión.';end if;
 if p_personaje is not null then
  select * into p from public.personajes where id=p_personaje;
  if not found or (not gm and p.user_id is distinct from p_usuario) then raise exception 'Este personaje no te pertenece.';end if;
  select count(*) into cuenta from public.combates_yugen c where c.datos->>'fase'='en_curso' and exists(select 1 from jsonb_array_elements(c.datos->'miembros') x where x->>'personaje_id'=p.id::text);
  if cuenta>1 then raise exception 'El personaje está en varios encuentros activos. El GM debe cerrar los duplicados.';end if;
  if cuenta=1 then select c.* into b from public.combates_yugen c where c.datos->>'fase'='en_curso' and exists(select 1 from jsonb_array_elements(c.datos->'miembros') x where x->>'personaje_id'=p.id::text);end if;
 elsif p_combate is not null and gm then
  select * into b from public.combates_yugen where id=p_combate and creador_id=p_usuario;
  if not found then raise exception 'Encuentro no disponible.';end if;
 else raise exception 'Selecciona un personaje.';end if;
 if b.id is not null then
  select value into m from jsonb_array_elements(b.datos->'miembros') where (p.id is not null and value->>'personaje_id'=p.id::text) or (p.id is null and value->>'id'=p_actor);
  if m is null then raise exception 'Participante inexistente.';end if;
  if m ? 'personaje_id' then select * into p from public.personajes where id=(m->>'personaje_id')::bigint;end if;
  if p.id is not null then preparado:=yugen_interno.preparar_jugador(p.id);end if;
  return jsonb_build_object('combate_id',b.id,'version',b.version,'combate',b.datos,'actor',m,'fuentes',coalesce(preparado->'configuracion'->'reserva',m->'configuracion'->'reserva','[]'),'personaje_id',p.id,'firma',md5(coalesce(preparado::text,'')),'gm',gm);
 end if;
 preparado:=yugen_interno.preparar_jugador(p.id);
 return jsonb_build_object('personaje_id',p.id,'preparado',preparado,'fuentes',preparado->'configuracion'->'reserva','firma',md5((preparado-'id')::text),'gm',gm);
end;$$;
create or replace function public.equipo_contexto_servidor(p_usuario uuid,p_personaje bigint default null,p_combate uuid default null,p_actor text default null) returns jsonb language sql security invoker set search_path=public,pg_temp as $$select yugen_interno.contexto_equipo(p_usuario,p_personaje,p_combate,p_actor)$$;
revoke all on function public.equipo_contexto_servidor(uuid,bigint,uuid,text) from public,anon,authenticated;
grant execute on function public.equipo_contexto_servidor(uuid,bigint,uuid,text) to service_role;
-- Canonical inventory slot assignments. A hand switch is one atomic set change.
create or replace function yugen_interno.aplicar_equipo(p_personaje bigint,p_equipo jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.personajes%rowtype;i public.inventario_jugador%rowtype;par record;vistos text[]:='{}';tipo text;der text;izq text;
begin
 select * into p from public.personajes where id=p_personaje for update;
 if not found or jsonb_typeof(p_equipo) is distinct from 'object' then raise exception 'Equipamiento inválido.';end if;
 for par in select * from jsonb_each_text(p_equipo) loop
  select * into i from public.inventario_jugador where id::text=par.value and personaje_id=p.id and user_id=p.user_id for update;
  if not found or par.value=any(vistos) then raise exception 'La pieza no pertenece a este inventario o está duplicada.';end if;
  vistos:=array_append(vistos,par.value);
  tipo:=i.slot_tipo;
  if not ((par.key in ('mano_der','mano_izq') and tipo in ('mano','dos_manos')) or (par.key~'^acc_[1-6]$' and tipo='accesorio') or (par.key in ('casco','pechera','pantalones','zapatos','titulo') and tipo=par.key)) then raise exception 'Espacio incompatible.';end if;
  if tipo='dos_manos' and ((par.key='mano_der' and p_equipo ? 'mano_izq') or (par.key='mano_izq' and p_equipo ? 'mano_der')) then raise exception 'Un arma de dos manos ocupa ambas manos.';end if;
 end loop;
 perform set_config('yugen.equipo_interno',p.id::text,true);
 update public.inventario_jugador set slot_equipado=null where personaje_id=p.id and user_id=p.user_id and slot_equipado is not null;
 for par in select * from jsonb_each_text(p_equipo) loop update public.inventario_jugador set slot_equipado=par.key where id::text=par.value and personaje_id=p.id and user_id=p.user_id;end loop;
end;$$;
create or replace function yugen_interno.confirmar_equipo(p_usuario uuid,p_personaje bigint,p_combate uuid,p_actor text,p_version integer,p_firma text,p_equipo jsonb,p_datos jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare ctx jsonb;b public.combates_yugen%rowtype;m jsonb;
begin
 if p_combate is not null then perform pg_advisory_xact_lock(hashtextextended(p_combate::text,0));select * into b from public.combates_yugen where id=p_combate for update;end if;
 if p_personaje is not null then perform 1 from public.personajes where id=p_personaje for update;end if;
 ctx:=yugen_interno.contexto_equipo(p_usuario,p_personaje,p_combate,p_actor);
 if p_combate is null then
  if ctx ? 'combate_id' then raise exception 'El personaje acaba de entrar en combate. Recarga.';end if;
  if ctx->>'firma' is distinct from p_firma then raise exception 'El inventario cambió. Recarga.';end if;
  perform yugen_interno.aplicar_equipo(p_personaje,p_equipo);
  return jsonb_build_object('ok',true);
 end if;
 if b.id is null or b.version<>p_version or ctx->>'combate_id'<>p_combate::text then raise exception 'El combate cambió. Recarga antes de confirmar.';end if;
 m:=ctx->'actor';
 if b.datos->>'fase'<>'en_curso' or b.datos->>'actual'<>m->>'id' or coalesce((m->>'accion_usada')::boolean,false) or coalesce((m->>'vida')::numeric,0)<=0 then raise exception 'Cambiar equipo requiere tu turno y una acción disponible.';end if;
 if p_datos->>'fase'<>b.datos->>'fase' or p_datos->>'actual'<>b.datos->>'actual' or jsonb_array_length(p_datos->'miembros')<>jsonb_array_length(b.datos->'miembros') then raise exception 'Resultado de equipo inválido.';end if;
 update public.combates_yugen set datos=p_datos,version=version+1,updated_at=now() where id=b.id returning * into b;
 return jsonb_build_object('ok',true,'version',b.version);
end;$$;
create or replace function public.equipo_confirmar_servidor(p_usuario uuid,p_personaje bigint,p_combate uuid,p_actor text,p_version integer,p_firma text,p_equipo jsonb,p_datos jsonb) returns jsonb language sql security invoker set search_path=public,pg_temp as $$select yugen_interno.confirmar_equipo(p_usuario,p_personaje,p_combate,p_actor,p_version,p_firma,p_equipo,p_datos)$$;
revoke all on function public.equipo_confirmar_servidor(uuid,bigint,uuid,text,integer,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.equipo_confirmar_servidor(uuid,bigint,uuid,text,integer,text,jsonb,jsonb) to service_role;
-- GM undo and equipment changes update persistent slots in the same transaction.
create or replace function yugen_interno.sincronizar_equipo() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare m jsonb;equipo jsonb;antes jsonb;
begin
 for m in select value from jsonb_array_elements(new.datos->'miembros') loop
  if coalesce(m->>'personaje_id','')='' then continue;end if;
  if tg_op='UPDATE' then select value->'configuracion'->'equipamiento' into antes from jsonb_array_elements(old.datos->'miembros') where value->>'id'=m->>'id';else antes:=null;end if;
  if m->'configuracion'->'equipamiento' is not distinct from antes then continue;end if;
  select coalesce(jsonb_object_agg(key,value->>'id'),'{}') into equipo from jsonb_each(coalesce(m->'configuracion'->'equipamiento','{}'));
  perform yugen_interno.aplicar_equipo((m->>'personaje_id')::bigint,equipo);
 end loop;return new;
end;$$;
create trigger combate_sincronizar_equipo after insert or update of datos on public.combates_yugen for each row execute function yugen_interno.sincronizar_equipo();
create or replace function yugen_interno.proteger_equipo_activo() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare pj bigint;pjs bigint[];
begin
 if tg_op='INSERT' then if new.slot_equipado is null then return new;end if;pjs:=array[new.personaje_id];
 elsif tg_op='DELETE' then if old.slot_equipado is null then return old;end if;pjs:=array[old.personaje_id];
 else if new.slot_equipado is not distinct from old.slot_equipado and new.personaje_id is not distinct from old.personaje_id then return new;end if;pjs:=array[old.personaje_id,new.personaje_id];end if;
 foreach pj in array pjs loop
 if current_setting('yugen.equipo_interno',true) is distinct from pj::text and exists(select 1 from public.combates_yugen b where b.datos->>'fase'='en_curso' and exists(select 1 from jsonb_array_elements(b.datos->'miembros') m where m->>'personaje_id'=pj::text)) then raise exception 'En combate debes confirmar el equipo gastando una acción en tu turno.';end if;
 end loop;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
create trigger inventario_proteger_equipo before insert or update of slot_equipado,personaje_id or delete on public.inventario_jugador for each row execute function yugen_interno.proteger_equipo_activo();
revoke all on all functions in schema yugen_interno from public,anon,authenticated;
grant execute on function yugen_interno.contexto_equipo(uuid,bigint,uuid,text),yugen_interno.confirmar_equipo(uuid,bigint,uuid,text,integer,text,jsonb,jsonb) to service_role;
commit;
