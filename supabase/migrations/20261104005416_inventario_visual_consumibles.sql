begin;

alter table public.forja_maestra add column if not exists consumible boolean not null default false;

create or replace function public.validar_configuracion_creacion() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare e jsonb; h jsonb; par record; item public.forja_maestra%rowtype; mano_d text; mano_i text; n numeric;
begin
 if not exists(select 1 from public.categorias_forja where clave=new.tipo and parent_id is not null) then raise exception 'Selecciona una subcategoría de Estadísticas.'; end if;
 if new.tipo_creacion<>'otro' and public.forja_tipo_inferido(new.tipo) not in ('otro',new.tipo_creacion) then raise exception 'La clasificación no corresponde al tipo de creación.'; end if;
 if new.tipo_creacion not in ('objeto','titulo') then new.slot_tipo:='ninguno'; end if;
 if new.tipo_creacion='titulo' then new.slot_tipo:='titulo'; end if;
 if new.tipo_creacion='objeto' and coalesce(new.slot_tipo,'ninguno') not in ('ninguno','casco','pechera','pantalones','zapatos','capa','mano','dos_manos','accesorio') then raise exception 'Espacio de objeto inválido.'; end if;
 if jsonb_typeof(new.configuracion_dados)<>'array' or jsonb_array_length(new.configuracion_dados)>20 then raise exception 'Configura hasta veinte acciones.'; end if;
 for e in select value from jsonb_array_elements(new.configuracion_dados) loop
  if e ? 'elemento' and e->>'elemento' not in ('ninguno','fuego','agua','electricidad','hielo','luz_sagrada') then raise exception 'Elemento inválido.';end if;
  if e ? 'naturaleza' and e->>'naturaleza' not in ('automatica','fisica','magica','natural') then raise exception 'Naturaleza inválida.';end if;
  if e->>'naturaleza'='magica' and coalesce((e->>'coste_ph')::numeric,0)<=0 then raise exception 'Una habilidad mágica necesita coste PH.';end if;
  if e->>'naturaleza' in ('natural','fisica') and coalesce((e->>'coste_ph')::numeric,0)>0 then raise exception 'Una habilidad que consume PH es mágica.';end if;
  if e ? 'estado_tipo' and e->>'estado_tipo' not in ('narrativo','veneno','regeneracion','aturdido','quemadura') then raise exception 'Estado inválido.';end if;
  if e ? 'salvacion' then
   if jsonb_typeof(e->'salvacion')<>'object' or jsonb_typeof(e->'salvacion'->'cd') is distinct from 'number' or coalesce(e->'salvacion'->>'atributo','')!~'^[a-z_][a-z0-9_]*$' or coalesce(e->'salvacion'->>'exito','') not in ('mitad','anula','solo_estado') then raise exception 'Salvación inválida.';end if;
   n:=(e->'salvacion'->>'cd')::numeric;if n<>trunc(n) or n<1 or n>1000 then raise exception 'CD inválida.';end if;
  end if;
  if coalesce(btrim(e->>'nombre'),'')='' or (e->>'efecto') is null or (e->>'efecto') not in ('dano','curacion','recuperar_ph','reducir_fatiga','estado','crear_arma') then raise exception 'Cada acción necesita nombre y efecto válidos.'; end if;
  for par in select * from (values('cantidad',0,100),('caras',2,1000),('modificador',-1000000,1000000),('duracion',0,1000000),('coste_ph',0,1000000)) t(clave,minimo,maximo) loop
   if jsonb_typeof(e->par.clave) is distinct from 'number' then raise exception 'Falta un valor numérico en la acción: %.',par.clave; end if;
   n:=(e->>par.clave)::numeric;
   if trunc(n)<>n or n<par.minimo or n>par.maximo then raise exception 'Valor inválido para %.',par.clave; end if;
  end loop;
  if coalesce((e->>'coste_fatiga')::numeric,0)<0 or trunc(coalesce((e->>'coste_fatiga')::numeric,0))<>coalesce((e->>'coste_fatiga')::numeric,0) then raise exception 'Coste de Fatiga inválido.'; end if;
  if e->>'efecto'='crear_arma' and (coalesce(btrim(e->>'arma_nombre'),'')='' or (e->>'duracion')::numeric<1 or (e->>'cantidad')::numeric<1 or coalesce(e->>'arma_slot','mano_der') not in ('mano_der','mano_izq','dos_manos')) then raise exception 'Configura nombre, mano, duración y dados del arma temporal.'; end if;
  if jsonb_typeof(coalesce(e->'bonos_estado','{}'::jsonb))<>'object' then raise exception 'Bonos de estado inválidos.'; end if;
  for par in select * from jsonb_each(coalesce(e->'bonos_estado','{}'::jsonb)) loop if jsonb_typeof(par.value)<>'number' then raise exception 'Los bonos deben ser numéricos.';end if;end loop;
  if e->>'efecto'='estado' and coalesce(btrim(e->>'estado'),'')='' then raise exception 'Describe el estado de la acción.'; end if;
 end loop;
 if jsonb_typeof(coalesce(new.habilidades,'[]'::jsonb))<>'array' or jsonb_typeof(new.equipamiento)<>'object' then raise exception 'Habilidades y equipamiento inválidos.'; end if;
 if new.tipo_creacion<>'personaje' then
  new.habilidades:='[]'::jsonb; new.equipamiento:='{}'::jsonb;
 else
  for h in select value from jsonb_array_elements(coalesce(new.habilidades,'[]'::jsonb)) loop
   if jsonb_typeof(h)<>'string' or not exists(select 1 from public.forja_maestra f where f.id::text=h#>>'{}' and f.tipo_creacion='habilidad' and f.estado='aprobado') then raise exception 'Selecciona habilidades existentes y aprobadas.'; end if;
  end loop;
  for par in select * from jsonb_each_text(new.equipamiento) loop
   select * into item from public.forja_maestra where id::text=par.value and estado='aprobado';
   if not found or item.tipo_creacion not in ('objeto','titulo') then raise exception 'El equipo seleccionado ya no está disponible.'; end if;
   if not ((par.key in ('casco','pechera','pantalones','zapatos','capa') and item.slot_tipo=par.key)
      or (par.key in ('mano_der','mano_izq') and item.slot_tipo in ('mano','dos_manos'))
      or (par.key in ('acc_1','acc_2','acc_3','acc_4','acc_5','acc_6') and item.slot_tipo='accesorio')
      or (par.key='titulo' and item.slot_tipo='titulo')) then raise exception 'El objeto no corresponde al espacio %.',par.key; end if;
  end loop;
  select slot_tipo into mano_d from public.forja_maestra where id::text=new.equipamiento->>'mano_der';
  select slot_tipo into mano_i from public.forja_maestra where id::text=new.equipamiento->>'mano_izq';
  if (mano_d='dos_manos' and new.equipamiento ? 'mano_izq') or (mano_i='dos_manos' and new.equipamiento ? 'mano_der') then raise exception 'Un arma de dos manos necesita la otra mano libre.'; end if;
 end if;
 if jsonb_typeof(new.reglas_pasivas)<>'array' or jsonb_array_length(new.reglas_pasivas)>20 or jsonb_typeof(new.pasivas)<>'array' then raise exception 'Configuración de pasivas inválida.'; end if;
 for e in select value from jsonb_array_elements(new.reglas_pasivas) loop
  if e->>'condicion' in ('ataque_magico','ataque_natural','ataque_elemental') and e->>'evento' in ('permanente','inicio_turno') then raise exception 'Una condición de ataque necesita evento reactivo.';end if;
  if e ? 'elemento' and e->>'elemento' not in ('cualquiera','fuego','agua','electricidad','hielo','luz_sagrada') then raise exception 'Elemento reactivo inválido.';end if;
  if e ? 'reduccion_pct' then if jsonb_typeof(e->'reduccion_pct')<>'number' or (e->>'reduccion_pct')::numeric<0 or (e->>'reduccion_pct')::numeric>100 then raise exception 'Reducción inválida.';end if;end if;
  if e ? 'represalia_dados' then n:=(e->>'represalia_dados')::numeric;if n<>trunc(n) or n<0 or n>100 then raise exception 'Dados de represalia inválidos.';end if;end if;
  if e ? 'represalia_caras' then n:=(e->>'represalia_caras')::numeric;if n<>trunc(n) or n<2 or n>1000 then raise exception 'Caras de represalia inválidas.';end if;end if;
  if coalesce(btrim(e->>'nombre'),'')='' or e->>'condicion' is null or e->>'condicion' not in ('siempre','vida_mitad','sin_arma','ataque_magico','ataque_natural','ataque_elemental') or e->>'evento' is null or e->>'evento' not in ('permanente','inicio_turno','recibir_ataque','recibir_impacto','recibir_dano') or jsonb_typeof(e->'bonos') is distinct from 'object' then raise exception 'Configura la condición y el momento de cada pasiva.';end if;
  for par in select * from jsonb_each(e->'bonos') loop if jsonb_typeof(par.value)<>'number' or abs((par.value::text)::numeric)>1000000 then raise exception 'Bono pasivo inválido.';end if;end loop;
  for par in select * from (values('curacion'),('recuperar_ph'),('reducir_fatiga')) t(clave) loop if jsonb_typeof(e->par.clave) is distinct from 'number' or (e->>par.clave)::numeric<0 or (e->>par.clave)::numeric>1000000 then raise exception 'Recuperación pasiva inválida.';end if;end loop;
 end loop;
 if new.tipo_creacion='personaje' then
  for h in select value from jsonb_array_elements(new.pasivas) loop if jsonb_typeof(h)<>'string' or not exists(select 1 from public.forja_maestra f where f.id::text=h#>>'{}' and f.tipo_creacion='pasiva' and f.estado='aprobado') then raise exception 'Selecciona pasivas existentes.';end if;end loop;
 else new.pasivas:='[]'::jsonb;
 end if;
 return new;
end;
$$;

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
   equipo:=equipo||jsonb_build_object(par.key,jsonb_build_object('id',item.id,'nombre',item.nombre,'slot_tipo',item.slot_tipo,'tipo_creacion',item.tipo_creacion,'descripcion',item.descripcion,'imagen_url',item.imagen_url,'consumible',item.consumible,'stats',s,'efectos',item.configuracion_dados,'reglas',item.reglas,'reglas_pasivas',item.reglas_pasivas));
   for attr in select * from jsonb_each(s) loop
    if jsonb_typeof(attr.value)='number' and attr.key not in ('peso','durabilidad','dados_dano','caras_dano','dano') then
     bonos:=bonos||jsonb_build_object(attr.key,coalesce((bonos->>attr.key)::numeric,0)+(attr.value::text)::numeric);
    end if;
   end loop;
  end loop;
 end if;
 return jsonb_build_object('consumible',f.consumible,'reglas',f.reglas,'pasivas',pasivas,'reglas_pasivas',f.reglas_pasivas,'tipo_creacion',f.tipo_creacion,'efectos',f.configuracion_dados,'habilidades',habilidades,'equipamiento',equipo,'bonos_equipamiento',bonos);
end;
$$;

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
  pieza:=jsonb_build_object('id',i.id,'nombre',i.nombre,'stats',coalesce(i.stats,'{}'),'efectos',efectos,'slot_tipo',i.slot_tipo,'tipo_creacion',t,'descripcion',i.descripcion,'imagen_url',i.imagen_url,'consumible',coalesce((i.configuracion->>'consumible')::boolean,false),'reglas',coalesce(i.configuracion->'reglas','[]'),'reglas_pasivas',coalesce(i.configuracion->'reglas_pasivas','[]'));
  reserva:=reserva||jsonb_build_array(pieza);
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
  if not ((par.key in ('mano_der','mano_izq') and tipo in ('mano','dos_manos')) or (par.key~'^acc_[1-6]$' and tipo='accesorio') or (par.key in ('casco','pechera','pantalones','zapatos','capa','titulo') and tipo=par.key)) then raise exception 'Espacio incompatible.';end if;
  if tipo='dos_manos' and ((par.key='mano_der' and p_equipo ? 'mano_izq') or (par.key='mano_izq' and p_equipo ? 'mano_der')) then raise exception 'Un arma de dos manos ocupa ambas manos.';end if;
 end loop;
 perform set_config('yugen.equipo_interno',p.id::text,true);
 update public.inventario_jugador set slot_equipado=null where personaje_id=p.id and user_id=p.user_id and slot_equipado is not null;
 for par in select * from jsonb_each_text(p_equipo) loop update public.inventario_jugador set slot_equipado=par.key where id::text=par.value and personaje_id=p.id and user_id=p.user_id;end loop;
end;$$;

-- Retain exact consumed copies so undo can restore identity and configuration.
create table yugen_interno.combate_consumos (
 combate_id uuid not null references public.combates_yugen(id) on delete cascade,
 item_id uuid not null, personaje_id bigint not null, copia jsonb not null,
 primary key(combate_id,item_id)
);
alter table yugen_interno.combate_consumos enable row level security;
revoke all on yugen_interno.combate_consumos from public,anon,authenticated;
grant all on yugen_interno.combate_consumos to service_role;
create or replace function yugen_interno.sincronizar_consumos(p_combate uuid,p_personaje bigint,p_antes jsonb,p_despues jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare x text; i public.inventario_jugador%rowtype; copia_guardada jsonb;dueno uuid;
begin
 select user_id into dueno from public.personajes where id=p_personaje for update;
 if not found then raise exception 'Personaje inexistente.';end if;
 for x in select value from jsonb_array_elements_text(coalesce(p_despues,'[]')) except select value from jsonb_array_elements_text(coalesce(p_antes,'[]')) loop
  select * into i from public.inventario_jugador where id=x::uuid and personaje_id=p_personaje and user_id=dueno for update;
  if not found or not coalesce((i.configuracion->>'consumible')::boolean,false) or i.slot_equipado is not null then raise exception 'No puedes consumir esta copia del inventario.';end if;
  insert into yugen_interno.combate_consumos values(p_combate,i.id,p_personaje,to_jsonb(i));
  delete from public.inventario_jugador where id=i.id;
 end loop;
 for x in select value from jsonb_array_elements_text(coalesce(p_antes,'[]')) except select value from jsonb_array_elements_text(coalesce(p_despues,'[]')) loop
  select copia into copia_guardada from yugen_interno.combate_consumos where combate_id=p_combate and item_id=x::uuid and personaje_id=p_personaje for update;
  if not found then raise exception 'No se puede restaurar un consumo sin su copia original.';end if;
  perform set_config('yugen.restaurar_consumo',x,true);
  insert into public.inventario_jugador select (jsonb_populate_record(null::public.inventario_jugador,copia_guardada)).*;
  delete from yugen_interno.combate_consumos where combate_id=p_combate and item_id=x::uuid;
 end loop;
end;$$;
create or replace function yugen_interno.sincronizar_equipo() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare m jsonb;equipo jsonb;antes jsonb;
begin
 for m in select value from jsonb_array_elements(new.datos->'miembros') loop
  if coalesce(m->>'personaje_id','')='' then continue;end if;
  antes:=null;
  if tg_op='UPDATE' then select value into antes from jsonb_array_elements(old.datos->'miembros') where value->>'id'=m->>'id';end if;
  perform yugen_interno.sincronizar_consumos(new.id,(m->>'personaje_id')::bigint,antes->'configuracion'->'consumidos',m->'configuracion'->'consumidos');
  if m->'configuracion'->'equipamiento' is not distinct from antes->'configuracion'->'equipamiento' then continue;end if;
  select coalesce(jsonb_object_agg(key,value->>'id'),'{}') into equipo from jsonb_each(coalesce(m->'configuracion'->'equipamiento','{}'));
  perform yugen_interno.aplicar_equipo((m->>'personaje_id')::bigint,equipo);
 end loop;return new;
end;$$;
revoke all on function yugen_interno.sincronizar_consumos(uuid,bigint,jsonb,jsonb) from public,anon,authenticated;
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
 if b.datos->>'fase'='preparacion' then
  if not coalesce((ctx->>'gm')::boolean,false) then raise exception 'Solo el GM prepara el encuentro.';end if;
 elsif b.datos->>'fase'<>'en_curso' or b.datos->>'actual'<>m->>'id' or coalesce((m->>'accion_usada')::boolean,false) or coalesce((m->>'vida')::numeric,0)<=0 then raise exception 'Cambiar equipo requiere tu turno y una acción disponible.';end if;
 if p_datos->>'fase'<>b.datos->>'fase' or p_datos->>'actual'<>b.datos->>'actual' or jsonb_array_length(p_datos->'miembros')<>jsonb_array_length(b.datos->'miembros') then raise exception 'Resultado de equipo inválido.';end if;
 update public.combates_yugen set datos=p_datos,version=version+1,updated_at=now() where id=b.id returning * into b;
 return jsonb_build_object('ok',true,'version',b.version);
end;$$;
create or replace function public.forja_guardar_snapshot_config() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare b record; base jsonb;
begin
 if tg_table_name='inventario_jugador' then
 if current_setting('yugen.restaurar_consumo',true)=new.id::text and exists(select 1 from yugen_interno.combate_consumos c where c.item_id=new.id and c.copia->>'user_id'=new.user_id::text) then return new;end if;
 end if;
 if new.forja_id is null then return new; end if;
 new.configuracion:=public.forja_snapshot_config(new.forja_id);
 base:=new.stats;
 if new.configuracion->>'tipo_creacion'='personaje' then
  new.configuracion:=new.configuracion||jsonb_build_object('stats_base',base);
  for b in select * from jsonb_each(new.configuracion->'bonos_equipamiento') loop
   if jsonb_typeof(base->b.key)='number' then new.stats:=new.stats||jsonb_build_object(b.key,(base->>b.key)::numeric+(b.value::text)::numeric); end if;
  end loop;
  if tg_table_name='forja_instancias' then new.recursos:=new.recursos||jsonb_strip_nulls(jsonb_build_object('vida',coalesce(new.stats->'vida',new.stats->'hp'),'ph',new.stats->'ph')); end if;
 end if;
 return new;
end;
$$;
create schema if not exists private;
grant usage on schema private to authenticated;
create or replace function private.combate_preparar_objeto(p_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.forja_maestra%rowtype;cfg jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then raise exception 'Solo el GM prepara objetos.' using errcode='42501';end if;
 select * into f from public.forja_maestra where id=p_id and tipo_creacion='objeto' and estado='aprobado';
 if not found then raise exception 'Selecciona un objeto aprobado.';end if;
 cfg:=public.forja_snapshot_config(f.id);
 return jsonb_build_object('id',gen_random_uuid(),'nombre',f.nombre,'tipo_creacion',f.tipo_creacion,'slot_tipo',f.slot_tipo,'descripcion',f.descripcion,'imagen_url',f.imagen_url,'consumible',f.consumible,'stats',public.forja_stats_componente(f.id),'efectos',cfg->'efectos','reglas',cfg->'reglas','reglas_pasivas',cfg->'reglas_pasivas');
end;$$;
revoke all on function private.combate_preparar_objeto(uuid) from public,anon;
grant execute on function private.combate_preparar_objeto(uuid) to authenticated;
create or replace function public.combate_preparar_objeto(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.combate_preparar_objeto(p_id)$$;
revoke all on function public.combate_preparar_objeto(uuid) from public,anon;
grant execute on function public.combate_preparar_objeto(uuid) to authenticated;
commit;
