-- Spatial techniques and learned-skill combinations. Existing Azul identity is retained.
begin;
CREATE OR REPLACE FUNCTION public.forja_validar_requisitos(r jsonb)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare p record;v jsonb;
begin
 if jsonb_typeof(r) is distinct from 'object' then raise exception 'Requisitos inválidos.'; end if;
 if r ? 'razas' then
   if jsonb_typeof(r->'razas') is distinct from 'array' or jsonb_array_length(r->'razas')>50 then raise exception 'Razas inválidas.'; end if;
   for v in select value from jsonb_array_elements(r->'razas') loop
     if jsonb_typeof(v) is distinct from 'string' or length(btrim(v#>>'{}')) not between 1 and 100 then raise exception 'Raza inválida.';end if;
   end loop;
 end if;
 if r ? 'habilidades' then
  if jsonb_typeof(r->'habilidades') is distinct from 'array' or jsonb_array_length(r->'habilidades')>20 then raise exception 'Selecciona hasta 20 habilidades previas.';end if;
  for v in select value from jsonb_array_elements(r->'habilidades') loop
   if jsonb_typeof(v) is distinct from 'string' or (v#>>'{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Habilidad previa inválida.';end if;
  end loop;
 end if;
 if r ? 'desbloqueo_automatico' and jsonb_typeof(r->'desbloqueo_automatico') is distinct from 'boolean' then raise exception 'Desbloqueo automático inválido.';end if;
 if r->>'desbloqueo_automatico'='true' and jsonb_array_length(coalesce(r->'habilidades','[]'))=0 then raise exception 'Elige habilidades previas para el desbloqueo automático.';end if;
 if r ? 'minimos' then
   if jsonb_typeof(r->'minimos') is distinct from 'object' or (select count(*) from jsonb_object_keys(r->'minimos'))>50 then raise exception 'Mínimos inválidos.';end if;
   for p in select * from jsonb_each(r->'minimos') loop
     if p.key!~'^[a-z_][a-z0-9_]{0,63}$' or jsonb_typeof(p.value) is distinct from 'number' or (p.value::text)::numeric not between 0 and 1000000 then raise exception 'Atributo o mínimo inválido.';end if;
   end loop;
 end if;
 if r ? 'nivel_minimo' then
   if jsonb_typeof(r->'nivel_minimo') is distinct from 'number' then raise exception 'Nivel mínimo inválido.';end if;
   if (r->>'nivel_minimo')::numeric<>trunc((r->>'nivel_minimo')::numeric)
      or (r->>'nivel_minimo')::numeric not between 1 and 100 then raise exception 'Nivel mínimo inválido.';end if;
 end if;
end $function$
;
create or replace function private.combinacion_cumple(r jsonb,conocidas jsonb) returns boolean
language sql immutable security invoker set search_path='' as $$
 select not exists(select 1 from jsonb_array_elements_text(coalesce(r->'habilidades','[]')) h where not coalesce(conocidas,'[]') ? h);
$$;
revoke all on function private.combinacion_cumple(jsonb,jsonb) from public,anon,authenticated;

create or replace function private.combinaciones_aprender(p_personaje bigint) returns void
language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;f public.forja_maestra%rowtype;conocidas jsonb;paso integer;agregadas integer;
begin
 select * into p from public.personajes where id=p_personaje for update;
 if not found or p.estado_vida<>'vivo' or p.estado_aprobacion<>'aprobado' then return;end if;
 -- Row lock serializes simultaneous deliveries. Repeated grants never create duplicates.
 for paso in 1..20 loop
  agregadas:=0;
  select coalesce(jsonb_agg(distinct forja_id::text),'[]') into conocidas from public.inventario_jugador where personaje_id=p.id and user_id=p.user_id and forja_id is not null;
  for f in select * from public.forja_maestra where tipo_creacion='habilidad' and estado='aprobado' and not ligado_al_alma
   and requisitos_uso->>'desbloqueo_automatico'='true' and jsonb_array_length(coalesce(requisitos_uso->'habilidades','[]'))>0
   and private.combinacion_cumple(requisitos_uso,conocidas)
   and public.forja_cumple_requisitos(requisitos_uso,p.raza,p.atributos||jsonb_build_object('nivel',p.nivel))
   and not exists(select 1 from public.inventario_jugador i where i.personaje_id=p.id and i.forja_id=forja_maestra.id)
  loop
   insert into public.inventario_jugador(user_id,forja_id,personaje_id,nombre,tipo,descripcion,imagen_url,clase,stats,ligado_al_alma,es_activo,slot_tipo,motivo_entrega,configuracion)
   values(p.user_id,f.id,p.id,f.nombre,'habilidad',f.descripcion,f.imagen_url,f.clase,f.stats,false,true,'ninguno','Desbloqueo automático por habilidades previas',
    jsonb_build_object('tipo_creacion','habilidad','efectos',f.configuracion_dados,'reglas',f.reglas,'reglas_pasivas',f.reglas_pasivas,'requisitos_uso',f.requisitos_uso));
   agregadas:=agregadas+1;
  end loop;
  exit when agregadas=0;
 end loop;
end;$$;
revoke all on function private.combinaciones_aprender(bigint) from public,anon,authenticated;

create or replace function private.combinaciones_inventario() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if pg_trigger_depth()>1 then return null;end if;
 if tg_op<>'DELETE' and new.personaje_id is not null then
  perform private.combinaciones_aprender(new.personaje_id);
  perform private.habilidades_sincronizar(new.personaje_id);
 end if;
 if tg_op<>'INSERT' and old.personaje_id is not null and (tg_op='DELETE' or old.personaje_id is distinct from new.personaje_id) then
  perform private.combinaciones_aprender(old.personaje_id);
  perform private.habilidades_sincronizar(old.personaje_id);
 end if;
 return null;
end;$$;
revoke all on function private.combinaciones_inventario() from public,anon,authenticated;
create trigger zz_combinaciones_inventario after insert or update of personaje_id,forja_id or delete on public.inventario_jugador for each row execute function private.combinaciones_inventario();

-- NPC templates learn the same combinations; no per-character name matching.
create or replace function private.combinaciones_plantilla() returns trigger
language plpgsql security definer set search_path='' as $$
declare h public.forja_maestra%rowtype;paso integer;agregadas integer;
begin
 if new.tipo_creacion<>'personaje' then return new;end if;
 for paso in 1..20 loop
  agregadas:=0;
  for h in select * from public.forja_maestra f where f.tipo_creacion='habilidad' and f.estado='aprobado' and not f.ligado_al_alma
   and f.requisitos_uso->>'desbloqueo_automatico'='true' and jsonb_array_length(coalesce(f.requisitos_uso->'habilidades','[]'))>0
   and private.combinacion_cumple(f.requisitos_uso,new.habilidades) and not new.habilidades ? f.id::text
   and public.forja_cumple_requisitos(f.requisitos_uso,new.tipo,new.stats||jsonb_build_object('nivel',coalesce(new.nivel,1)))
  loop new.habilidades:=new.habilidades||jsonb_build_array(h.id::text);agregadas:=agregadas+1;end loop;
  exit when agregadas=0;
 end loop;
 return new;
end;$$;
revoke all on function private.combinaciones_plantilla() from public,anon,authenticated;
create trigger a_combinaciones_plantilla before insert or update of habilidades on public.forja_maestra for each row execute function private.combinaciones_plantilla();
CREATE OR REPLACE FUNCTION yugen_interno.preparar_jugador(p_personaje bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare p public.personajes%rowtype; i public.inventario_jugador%rowtype; s jsonb; base jsonb; config jsonb; naturalezas_config jsonb; equipo jsonb:='{}'; bonos jsonb:='{}'; habilidades jsonb:='[]'; pasivas jsonb:='[]'; a record; t text; efectos jsonb; pieza jsonb;reserva jsonb:='[]';
begin

 select * into p from public.personajes where id=p_personaje;
 if not found then raise exception 'Selecciona un personaje aprobado y vivo.';end if;
 s:=coalesce(p.atributos,'{}')||jsonb_build_object('nivel',p.nivel); if not s ? 'vida' and s ? 'hp' then s:=s||jsonb_build_object('vida',s->'hp');end if;base:=s;
 for i in select * from public.inventario_jugador where personaje_id=p.id and user_id=p.user_id order by created_at,id loop
  t:=coalesce(nullif(i.configuracion->>'tipo_creacion',''),public.forja_tipo_inferido(i.tipo));
  efectos:=coalesce(i.configuracion->'efectos','[]');
  if efectos='[]'::jsonb and not coalesce(i.configuracion,'{}') ? 'efectos' and coalesce((i.stats->>'dados_dano')::int,0)>0 and coalesce((i.stats->>'caras_dano')::int,0)>=2 then
   efectos:=jsonb_build_array(jsonb_build_object('id',i.id::text,'nombre','Ataque','efecto','dano','cantidad',(i.stats->>'dados_dano')::int,'caras',(i.stats->>'caras_dano')::int,'modificador',coalesce((i.stats->>'dano')::numeric,0),'duracion',0,'coste_ph',0,'estado','','tipo_dano','físico'));
  end if;
  pieza:=jsonb_build_object('requisitos_uso',coalesce(i.configuracion->'requisitos_uso','{}'),'forja_id',i.forja_id,'id',i.id,'nombre',i.nombre,'stats',coalesce(i.stats,'{}'),'efectos',efectos,'slot_tipo',i.slot_tipo,'tipo_creacion',t,'descripcion',i.descripcion,'imagen_url',i.imagen_url,'consumible',coalesce((i.configuracion->>'consumible')::boolean,false),'reglas',coalesce(i.configuracion->'reglas','[]'),'reglas_pasivas',coalesce(i.configuracion->'reglas_pasivas','[]'));
  reserva:=reserva||jsonb_build_array(pieza);
  if i.slot_equipado is not null and i.slot_equipado<>'' then
   if equipo ? i.slot_equipado then raise exception 'Hay dos piezas en el mismo espacio. Revisa el equipamiento.';end if;
   equipo:=equipo||jsonb_build_object(i.slot_equipado,pieza);
   for a in select * from jsonb_each(coalesce(i.stats,'{}')) loop
    if jsonb_typeof(a.value)='number' and a.key not in ('peso','durabilidad','dados_dano','caras_dano','dano') then bonos:=bonos||jsonb_build_object(a.key,coalesce((bonos->>a.key)::numeric,0)+(a.value::text)::numeric);end if;
   end loop;
  elsif coalesce(i.es_activo,true) and public.forja_cumple_requisitos(i.configuracion->'requisitos_uso',p.raza,base) then
   if t='habilidad' then habilidades:=habilidades||jsonb_build_array(pieza);end if;
   if t='pasiva' then pasivas:=pasivas||jsonb_build_array(jsonb_build_object('requisitos_uso',coalesce(i.configuracion->'requisitos_uso','{}'),'forja_id',i.forja_id,'id',i.id,'nombre',i.nombre,'reglas_motor',coalesce(i.configuracion->'reglas','[]'),'reglas',coalesce(i.configuracion->'reglas_pasivas','[]')));end if;
  end if;
 end loop;
 for a in select * from jsonb_each(bonos) loop s:=s||jsonb_build_object(a.key,coalesce((s->>a.key)::numeric,0)+(a.value::text)::numeric);end loop;
 pasivas:=pasivas||public.pasivas_raciales_snapshot(p.raza);
 naturalezas_config:=public.naturalezas_combate_snapshot(p.id);
 pasivas:=pasivas||(naturalezas_config->'pasivas');
 habilidades:=habilidades||(naturalezas_config->'habilidades');
 config:=jsonb_build_object('habilidades_conocidas',(select coalesce(jsonb_agg(distinct j.forja_id::text),'[]') from public.inventario_jugador j where j.personaje_id=p.id and j.user_id=p.user_id and j.forja_id is not null),'naturalezas',naturalezas_config->'naturalezas','raza',p.raza,'linaje_raza',public.forja_linaje_claves(p.raza),'reserva',reserva,'tipo_creacion','personaje','stats_base',base,'equipamiento',equipo,'bonos_equipamiento',bonos,'habilidades',habilidades,'pasivas',pasivas,'reglas_pasivas','[]'::jsonb);
 return jsonb_build_object('id',gen_random_uuid(),'forja_id',null,'personaje_id',p.id::text,'nombre',p.nombre,'stats',s,'configuracion',config,'requiere_configuracion',not base ? 'vida');
end;$function$

;
do $patch$
declare d text;
begin
 select pg_get_functiondef('private.habilidades_sincronizar(bigint)'::regprocedure) into d;
 if position('config:=config||jsonb_build_object(' in d)=0 then raise exception 'Unexpected skill synchronizer';end if;
 d:=replace(d,'config:=config||jsonb_build_object(', 'config:=config||jsonb_build_object(''habilidades_conocidas'',preparado->''configuracion''->''habilidades_conocidas'',');
 execute d;
end;$patch$;
do $seed$
declare azul uuid;rojo uuid;morado uuid;gm uuid;
begin
 select id into gm from public.perfiles where rol='KUROI' limit 1;
 if gm is null then raise exception 'No GM profile available';end if;
 perform set_config('request.jwt.claim.sub',gm::text,true);
select id into azul from public.forja_maestra where tipo_creacion='habilidad' and nombre='Azul' order by created_at limit 1;
if azul is null then insert into public.forja_maestra(nombre,tipo,tipo_creacion,creador_id,estado,slot_tipo,descripcion,stats,configuracion_dados,imagen_url) values('Azul','habilidades_generales','habilidad',gm,'aprobado','ninguno','Crea un vacío espacial. Atrae hasta 2 casillas a todas las criaturas del área. 2d6 de daño; CD 12 para recibir la mitad y evitar el derribo. También puede afectar al lanzador. Coste: 2 PH y una acción.',jsonb_build_object('enfriamiento',0),'[{"id": "azul_atraccion", "nombre": "Rotación Avante: Azul", "efecto": "dano", "cantidad": 2, "caras": 6, "modificador": 0, "coste_ph": 2, "coste_fatiga": 0, "duracion": 0, "estado": "", "tipo_dano": "colapso espacial", "naturaleza": "magica", "elemento": "ninguno", "animacion": "impacto", "salvacion": {"cd": 12, "atributo": "salvacion", "exito": "mitad"}, "tablero": {"alcance": 6, "forma": "circulo", "tamano": 2, "afecta": "todos", "color": "azul", "afecta_lanzador": true, "desplazamiento": {"tipo": "atraer", "cuando": "siempre", "casillas": 2}, "derribo": "fallo_salvacion"}, "vfx": {"impacto": "espacial-azul", "escala": 4}, "descripcion": "Crea un vacío espacial. Atrae hasta 2 casillas a todas las criaturas del área. 2d6 de daño; CD 12 para recibir la mitad y evitar el derribo. También puede afectar al lanzador."}]'::jsonb,'/vfx/espacial/azul-preview.png') returning id into azul;
else update public.forja_maestra set descripcion='Crea un vacío espacial. Atrae hasta 2 casillas a todas las criaturas del área. 2d6 de daño; CD 12 para recibir la mitad y evitar el derribo. También puede afectar al lanzador. Coste: 2 PH y una acción.',stats=stats||jsonb_build_object('enfriamiento',0),configuracion_dados='[{"id": "azul_atraccion", "nombre": "Rotación Avante: Azul", "efecto": "dano", "cantidad": 2, "caras": 6, "modificador": 0, "coste_ph": 2, "coste_fatiga": 0, "duracion": 0, "estado": "", "tipo_dano": "colapso espacial", "naturaleza": "magica", "elemento": "ninguno", "animacion": "impacto", "salvacion": {"cd": 12, "atributo": "salvacion", "exito": "mitad"}, "tablero": {"alcance": 6, "forma": "circulo", "tamano": 2, "afecta": "todos", "color": "azul", "afecta_lanzador": true, "desplazamiento": {"tipo": "atraer", "cuando": "siempre", "casillas": 2}, "derribo": "fallo_salvacion"}, "vfx": {"impacto": "espacial-azul", "escala": 4}, "descripcion": "Crea un vacío espacial. Atrae hasta 2 casillas a todas las criaturas del área. 2d6 de daño; CD 12 para recibir la mitad y evitar el derribo. También puede afectar al lanzador."}]'::jsonb,imagen_url='/vfx/espacial/azul-preview.png' where id=azul;end if;
select id into rojo from public.forja_maestra where tipo_creacion='habilidad' and nombre='Rojo' order by created_at limit 1;
if rojo is null then insert into public.forja_maestra(nombre,tipo,tipo_creacion,creador_id,estado,slot_tipo,descripcion,stats,configuracion_dados,imagen_url) values('Rojo','habilidades_generales','habilidad',gm,'aprobado','ninguno','Libera una explosión de repulsión. 3d6 de daño, empuja hasta 3 casillas desde el centro y derriba al fallar CD 13; superar reduce el daño a la mitad y evita empuje y derribo. Coste: 3 PH y una acción. Enfriamiento: 1 turnos.',jsonb_build_object('enfriamiento',1),'[{"id": "rojo_repulsion", "nombre": "Rotación Inversa: Resplandor Rojo", "efecto": "dano", "cantidad": 3, "caras": 6, "modificador": 0, "coste_ph": 3, "coste_fatiga": 0, "duracion": 0, "estado": "", "tipo_dano": "repulsión espacial", "naturaleza": "magica", "elemento": "ninguno", "animacion": "impacto", "salvacion": {"cd": 13, "atributo": "salvacion", "exito": "mitad"}, "tablero": {"alcance": 6, "forma": "circulo", "tamano": 2, "afecta": "todos", "color": "rojo", "afecta_lanzador": true, "desplazamiento": {"tipo": "empujar", "cuando": "fallo_salvacion", "casillas": 3}, "derribo": "fallo_salvacion"}, "vfx": {"impacto": "espacial-rojo", "escala": 4}, "descripcion": "Libera una explosión de repulsión. 3d6 de daño, empuja hasta 3 casillas desde el centro y derriba al fallar CD 13; superar reduce el daño a la mitad y evita empuje y derribo."}]'::jsonb,'/vfx/espacial/rojo-preview.png') returning id into rojo;
else update public.forja_maestra set descripcion='Libera una explosión de repulsión. 3d6 de daño, empuja hasta 3 casillas desde el centro y derriba al fallar CD 13; superar reduce el daño a la mitad y evita empuje y derribo. Coste: 3 PH y una acción. Enfriamiento: 1 turnos.',stats=stats||jsonb_build_object('enfriamiento',1),configuracion_dados='[{"id": "rojo_repulsion", "nombre": "Rotación Inversa: Resplandor Rojo", "efecto": "dano", "cantidad": 3, "caras": 6, "modificador": 0, "coste_ph": 3, "coste_fatiga": 0, "duracion": 0, "estado": "", "tipo_dano": "repulsión espacial", "naturaleza": "magica", "elemento": "ninguno", "animacion": "impacto", "salvacion": {"cd": 13, "atributo": "salvacion", "exito": "mitad"}, "tablero": {"alcance": 6, "forma": "circulo", "tamano": 2, "afecta": "todos", "color": "rojo", "afecta_lanzador": true, "desplazamiento": {"tipo": "empujar", "cuando": "fallo_salvacion", "casillas": 3}, "derribo": "fallo_salvacion"}, "vfx": {"impacto": "espacial-rojo", "escala": 4}, "descripcion": "Libera una explosión de repulsión. 3d6 de daño, empuja hasta 3 casillas desde el centro y derriba al fallar CD 13; superar reduce el daño a la mitad y evita empuje y derribo."}]'::jsonb,imagen_url='/vfx/espacial/rojo-preview.png' where id=rojo;end if;
select id into morado from public.forja_maestra where tipo_creacion='habilidad' and nombre='Morado' order by created_at limit 1;
if morado is null then insert into public.forja_maestra(nombre,tipo,tipo_creacion,creador_id,estado,slot_tipo,descripcion,stats,configuracion_dados,imagen_url) values('Morado','habilidades_generales','habilidad',gm,'aprobado','ninguno','Fusiona Azul y Rojo en un proyectil de colapso espacial: 6d6 de daño en una línea de 8 casillas. CD 15 para recibir la mitad. Afecta a aliados y enemigos del recorrido, sin muerte automática. Coste: 6 PH y una acción. Enfriamiento: 3 turnos.',jsonb_build_object('enfriamiento',3),'[{"id": "morado_imaginario", "nombre": "Técnica Imaginaria: Púrpura", "efecto": "dano", "cantidad": 6, "caras": 6, "modificador": 0, "coste_ph": 6, "coste_fatiga": 0, "duracion": 0, "estado": "", "tipo_dano": "desintegración espacial", "naturaleza": "magica", "elemento": "ninguno", "animacion": "impacto", "salvacion": {"cd": 15, "atributo": "salvacion", "exito": "mitad"}, "tablero": {"alcance": 8, "forma": "linea", "tamano": 8, "afecta": "todos", "color": "violeta", "afecta_lanzador": false}, "vfx": {"impacto": "espacial-morado", "escala": 4}, "descripcion": "Fusiona Azul y Rojo en un proyectil de colapso espacial: 6d6 de daño en una línea de 8 casillas. CD 15 para recibir la mitad. Afecta a aliados y enemigos del recorrido, sin muerte automática."}]'::jsonb,'/vfx/espacial/morado-preview.png') returning id into morado;
else update public.forja_maestra set descripcion='Fusiona Azul y Rojo en un proyectil de colapso espacial: 6d6 de daño en una línea de 8 casillas. CD 15 para recibir la mitad. Afecta a aliados y enemigos del recorrido, sin muerte automática. Coste: 6 PH y una acción. Enfriamiento: 3 turnos.',stats=stats||jsonb_build_object('enfriamiento',3),configuracion_dados='[{"id": "morado_imaginario", "nombre": "Técnica Imaginaria: Púrpura", "efecto": "dano", "cantidad": 6, "caras": 6, "modificador": 0, "coste_ph": 6, "coste_fatiga": 0, "duracion": 0, "estado": "", "tipo_dano": "desintegración espacial", "naturaleza": "magica", "elemento": "ninguno", "animacion": "impacto", "salvacion": {"cd": 15, "atributo": "salvacion", "exito": "mitad"}, "tablero": {"alcance": 8, "forma": "linea", "tamano": 8, "afecta": "todos", "color": "violeta", "afecta_lanzador": false}, "vfx": {"impacto": "espacial-morado", "escala": 4}, "descripcion": "Fusiona Azul y Rojo en un proyectil de colapso espacial: 6d6 de daño en una línea de 8 casillas. CD 15 para recibir la mitad. Afecta a aliados y enemigos del recorrido, sin muerte automática."}]'::jsonb,imagen_url='/vfx/espacial/morado-preview.png' where id=morado;end if;
update public.forja_maestra set requisitos_uso=requisitos_uso||jsonb_build_object('habilidades',jsonb_build_array(azul::text,rojo::text),'desbloqueo_automatico',true),requisitos='Conocer Azul y Rojo en el mismo personaje. Se desbloquea automáticamente.' where id=morado;
-- Existing inventory snapshots keep ownership, activity and equipment; only these techniques refresh.
update public.inventario_jugador i set descripcion=f.descripcion,imagen_url=f.imagen_url,stats=f.stats,configuracion=i.configuracion||jsonb_build_object('tipo_creacion','habilidad','efectos',f.configuracion_dados,'requisitos_uso',f.requisitos_uso)
 from public.forja_maestra f where i.forja_id=f.id and f.id in (azul,rojo,morado);
perform private.combinaciones_aprender(p.id) from public.personajes p where p.estado_vida='vivo' and p.estado_aprobacion='aprobado';
update public.forja_maestra set habilidades=habilidades where tipo_creacion='personaje' and habilidades ? azul::text and habilidades ? rojo::text;
perform private.habilidades_sincronizar(p.id) from public.personajes p where p.estado_vida='vivo' and p.estado_aprobacion='aprobado';
end;$seed$;
commit;
