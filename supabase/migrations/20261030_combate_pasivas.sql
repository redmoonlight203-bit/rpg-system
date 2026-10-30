begin;
alter table public.forja_maestra add column if not exists pasivas jsonb not null default '[]'::jsonb;
alter table public.forja_maestra add column if not exists reglas_pasivas jsonb not null default '[]'::jsonb;
create or replace function public.validar_configuracion_creacion() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare e jsonb; h jsonb; par record; item public.forja_maestra%rowtype; mano_d text; mano_i text; n numeric;
begin
 if not exists(select 1 from public.categorias_forja where clave=new.tipo and parent_id is not null) then raise exception 'Selecciona una subcategoría de Estadísticas.'; end if;
 if new.tipo_creacion<>'otro' and public.forja_tipo_inferido(new.tipo) not in ('otro',new.tipo_creacion) then raise exception 'La clasificación no corresponde al tipo de creación.'; end if;
 if new.tipo_creacion not in ('objeto','titulo') then new.slot_tipo:='ninguno'; end if;
 if new.tipo_creacion='titulo' then new.slot_tipo:='titulo'; end if;
 if new.tipo_creacion='objeto' and coalesce(new.slot_tipo,'ninguno') not in ('ninguno','casco','pechera','pantalones','zapatos','mano','dos_manos','accesorio') then raise exception 'Espacio de objeto inválido.'; end if;
 if jsonb_typeof(new.configuracion_dados)<>'array' or jsonb_array_length(new.configuracion_dados)>20 then raise exception 'Configura hasta veinte acciones.'; end if;
 for e in select value from jsonb_array_elements(new.configuracion_dados) loop
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
   if not ((par.key in ('casco','pechera','pantalones','zapatos') and item.slot_tipo=par.key)
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
  if coalesce(btrim(e->>'nombre'),'')='' or e->>'condicion' is null or e->>'condicion' not in ('siempre','vida_mitad','sin_arma') or e->>'evento' is null or e->>'evento' not in ('permanente','inicio_turno') or jsonb_typeof(e->'bonos') is distinct from 'object' then raise exception 'Configura la condición y el momento de cada pasiva.';end if;
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
drop trigger if exists forja_validar_configuracion on public.forja_maestra;
create trigger forja_validar_configuracion before insert or update of tipo,tipo_creacion,slot_tipo,configuracion_dados,habilidades,equipamiento,pasivas,reglas_pasivas on public.forja_maestra for each row execute function public.validar_configuracion_creacion();
create or replace function public.forja_snapshot_config(p_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.forja_maestra%rowtype; item public.forja_maestra%rowtype; h jsonb; par record; s jsonb; attr record;
 pasivas jsonb:='[]'::jsonb; habilidades jsonb:='[]'::jsonb; equipo jsonb:='{}'::jsonb; bonos jsonb:='{}'::jsonb;
begin
 select * into f from public.forja_maestra where id=p_id;
 if not found then return '{}'::jsonb; end if;
 if f.tipo_creacion='personaje' then
  for h in select value from jsonb_array_elements(f.pasivas) loop
   select * into item from public.forja_maestra where id::text=h#>>'{}' and tipo_creacion='pasiva' and estado='aprobado';
   if not found then raise exception 'Una pasiva ya no está disponible.';end if;
   pasivas:=pasivas||jsonb_build_array(jsonb_build_object('id',item.id,'nombre',item.nombre,'reglas',item.reglas_pasivas));
  end loop;
  for h in select value from jsonb_array_elements(coalesce(f.habilidades,'[]'::jsonb)) loop
   select * into item from public.forja_maestra where id::text=h#>>'{}' and tipo_creacion='habilidad' and estado='aprobado';
   if not found then raise exception 'Una habilidad del personaje ya no está disponible.'; end if;
   habilidades:=habilidades||jsonb_build_array(jsonb_build_object('id',item.id,'nombre',item.nombre,'stats',public.forja_stats_componente(item.id),'efectos',item.configuracion_dados));
  end loop;
  for par in select * from jsonb_each_text(f.equipamiento) loop
   select * into item from public.forja_maestra where id::text=par.value and tipo_creacion in ('objeto','titulo') and estado='aprobado';
   if not found then raise exception 'Una pieza de equipo ya no está disponible.'; end if;
   s:=public.forja_stats_componente(item.id);
   equipo:=equipo||jsonb_build_object(par.key,jsonb_build_object('id',item.id,'nombre',item.nombre,'slot_tipo',item.slot_tipo,'stats',s,'efectos',item.configuracion_dados,'reglas_pasivas',item.reglas_pasivas));
   for attr in select * from jsonb_each(s) loop
    if jsonb_typeof(attr.value)='number' and attr.key not in ('peso','durabilidad','dados_dano','caras_dano','dano') then
     bonos:=bonos||jsonb_build_object(attr.key,coalesce((bonos->>attr.key)::numeric,0)+(attr.value::text)::numeric);
    end if;
   end loop;
  end loop;
 end if;
 return jsonb_build_object('pasivas',pasivas,'reglas_pasivas',f.reglas_pasivas,'tipo_creacion',f.tipo_creacion,'efectos',f.configuracion_dados,'habilidades',habilidades,'equipamiento',equipo,'bonos_equipamiento',bonos);
end;
$$;
create table if not exists public.combates_yugen (
 id uuid primary key,
 nombre text not null default 'Combate de Yugen',
 datos jsonb not null,
 version integer not null default 1,
 creador_id uuid not null default auth.uid(),
 updated_at timestamptz not null default now()
);
alter table public.combates_yugen enable row level security;
drop policy if exists combates_kuroi on public.combates_yugen;
create policy combates_kuroi on public.combates_yugen for select to authenticated using(creador_id=auth.uid() and exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI'));
revoke all on public.combates_yugen from anon,authenticated;
grant select on public.combates_yugen to authenticated;

create or replace function public.combate_guardar(p_id uuid,p_nombre text,p_datos jsonb,p_version integer) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare fila public.combates_yugen%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then raise exception 'Solo Kuroi puede dirigir combates.' using errcode='42501';end if;
 if p_id is null or p_version is null or p_version<0 or jsonb_typeof(p_datos->'miembros') is distinct from 'array' or jsonb_array_length(p_datos->'miembros')>100 or p_datos->>'fase' is null or p_datos->>'fase' not in ('preparacion','en_curso','finalizado') then raise exception 'Estado de combate inválido.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into fila from public.combates_yugen where id=p_id for update;
 if found then
  if fila.creador_id<>auth.uid() then raise exception 'Este combate pertenece a otro director.';end if;
  if fila.version<>p_version then raise exception 'El combate cambió en otra sesión. Recárgalo antes de continuar.';end if;
  update public.combates_yugen set datos=p_datos,nombre=left(coalesce(nullif(btrim(p_nombre),''),'Combate de Yugen'),120),version=version+1,updated_at=now() where id=p_id returning * into fila;
 else
  if p_version<>0 then raise exception 'El combate ya no está disponible.';end if;
  insert into public.combates_yugen(id,nombre,datos,creador_id) values(p_id,left(coalesce(nullif(btrim(p_nombre),''),'Combate de Yugen'),120),p_datos,auth.uid()) returning * into fila;
 end if;
 return jsonb_build_object('id',fila.id,'version',fila.version);
end;$$;

create or replace function public.combate_preparar_personaje(p_forja uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.forja_maestra%rowtype; s jsonb; base jsonb; config jsonb; b record;
begin
 if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then raise exception 'Solo Kuroi puede preparar personajes.' using errcode='42501';end if;
 select * into f from public.forja_maestra where id=p_forja and tipo_creacion='personaje' and estado='aprobado' for share;
 if not found then raise exception 'Solo se pueden arrastrar personajes de La creación.';end if;
 s:=public.forja_stats_componente(f.id);base:=s;config:=public.forja_snapshot_config(f.id)||jsonb_build_object('stats_base',base);
 for b in select * from jsonb_each(config->'bonos_equipamiento') loop if jsonb_typeof(s->b.key)='number' then s:=s||jsonb_build_object(b.key,(s->>b.key)::numeric+(b.value::text)::numeric);end if;end loop;
 return jsonb_build_object('id',gen_random_uuid(),'forja_id',f.id,'nombre',f.nombre,'stats',s,'configuracion',config);
end;$$;

create or replace function public.forja_eliminar(p_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then raise exception 'Solo Kuroi puede eliminar creaciones.' using errcode='42501';end if;
 -- Las copias y sus snapshots permanecen independientes del catálogo.
 update public.forja_maestra f set
 habilidades=coalesce((select jsonb_agg(h) from jsonb_array_elements(coalesce(f.habilidades,'[]'::jsonb)) h where h#>>'{}'<>p_id::text),'[]'::jsonb),
 pasivas=coalesce((select jsonb_agg(h) from jsonb_array_elements(f.pasivas) h where h#>>'{}'<>p_id::text),'[]'::jsonb),
 equipamiento=coalesce((select jsonb_object_agg(e.key,e.value) from jsonb_each(f.equipamiento) e where e.value#>>'{}'<>p_id::text),'{}'::jsonb)
 where f.id<>p_id and (f.habilidades @> jsonb_build_array(p_id::text) or f.pasivas @> jsonb_build_array(p_id::text) or exists(select 1 from jsonb_each_text(f.equipamiento)e where e.value=p_id::text));
 update public.negociaciones_tienda set estado='rechazada' where item_id=p_id and estado='pendiente';
 delete from public.forja_maestra where id=p_id;
 if not found then raise exception 'La creación ya no existe.';end if;
end;$$;
revoke all on function public.combate_guardar(uuid,text,jsonb,integer),public.combate_preparar_personaje(uuid),public.forja_eliminar(uuid) from public,anon;
grant execute on function public.combate_guardar(uuid,text,jsonb,integer),public.combate_preparar_personaje(uuid),public.forja_eliminar(uuid) to authenticated;
commit;
