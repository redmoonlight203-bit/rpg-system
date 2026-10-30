begin;
alter table public.forja_maestra add column if not exists tipo_creacion text;
alter table public.forja_maestra add column if not exists configuracion_dados jsonb not null default '[]'::jsonb;
alter table public.forja_maestra add column if not exists equipamiento jsonb not null default '{}'::jsonb;
alter table public.inventario_jugador add column if not exists configuracion jsonb not null default '{}'::jsonb;
alter table public.forja_instancias add column if not exists configuracion jsonb not null default '{}'::jsonb;

-- Familias y una subcategoría inicial, sin reemplazar estadísticas existentes.
insert into public.categorias_forja(clave,nombre,descripcion)
values ('habilidades','Habilidades','Técnicas, magias y acciones creadas en el Yunque.'),('pasivas','Pasivas','Efectos permanentes o condicionados.')
on conflict(clave) do nothing;
insert into public.categorias_forja(clave,nombre,parent_id)
select r.clave || '_generales','Generales',r.id from public.categorias_forja r
where r.clave in ('habilidades','pasivas','titulos') and not exists(select 1 from public.categorias_forja c where c.parent_id=r.id)
on conflict(clave) do nothing;
insert into public.config_estadisticas(categoria,clave,etiqueta,descripcion,valor_defecto)
select 'habilidades','enfriamiento','Enfriamiento (turnos)','Turnos de espera entre usos; cero indica sin espera.',0
where not exists(select 1 from public.config_estadisticas where categoria='habilidades' and clave='enfriamiento');

create or replace function public.forja_tipo_inferido(p_clave text) returns text language sql stable set search_path = public,pg_temp as $$
 with recursive ruta as (
  select id,clave,parent_id,array[id] as vistos from public.categorias_forja where clave=p_clave
  union all select c.id,c.clave,c.parent_id,r.vistos||c.id from public.categorias_forja c join ruta r on c.id=r.parent_id where not c.id=any(r.vistos)
 ) select case coalesce((select clave from ruta where parent_id is null limit 1),p_clave)
 when 'razas' then 'personaje' when 'personaje' then 'personaje' when 'personajes' then 'personaje' when 'npc' then 'personaje' when 'monstruo' then 'personaje'
 when 'objetos' then 'objeto' when 'objeto' then 'objeto' when 'arma' then 'objeto' when 'armas' then 'objeto' when 'armadura' then 'objeto' when 'accesorios' then 'objeto'
 when 'habilidades' then 'habilidad' when 'habilidad' then 'habilidad' when 'titulos' then 'titulo' when 'titulo' then 'titulo' when 'pasivas' then 'pasiva' when 'pasiva' then 'pasiva' else 'otro' end;
$$;
update public.forja_maestra set tipo_creacion=public.forja_tipo_inferido(tipo) where tipo_creacion is null;
update public.forja_maestra f set tipo=c.clave from public.categorias_forja c
where f.tipo in ('titulos','habilidades','pasivas') and c.parent_id=(select id from public.categorias_forja r where r.clave=f.tipo)
and c.clave=f.tipo||'_generales';
-- Traduce la configuración antigua del arma a una acción, conservando sus stats.
update public.forja_maestra set configuracion_dados=jsonb_build_array(jsonb_build_object(
 'id',gen_random_uuid()::text,'nombre','Ataque del arma','efecto','dano','cantidad',stats->'dados_dano','caras',stats->'caras_dano','modificador',coalesce(stats->'dano','0'::jsonb),'tipo_dano','','estado','','duracion',0,'coste_ph',0))
where configuracion_dados='[]'::jsonb and tipo_creacion='objeto' and jsonb_typeof(stats->'dados_dano')='number' and jsonb_typeof(stats->'caras_dano')='number'
and (stats->>'dados_dano')::numeric between 1 and 100 and (stats->>'caras_dano')::numeric between 2 and 1000;
alter table public.forja_maestra alter column tipo_creacion set default 'otro';
alter table public.forja_maestra alter column tipo_creacion set not null;
alter table public.forja_maestra drop constraint if exists forja_tipo_creacion_check;
alter table public.forja_maestra add constraint forja_tipo_creacion_check check(tipo_creacion in ('personaje','habilidad','objeto','titulo','pasiva','otro'));

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
  if coalesce(btrim(e->>'nombre'),'')='' or (e->>'efecto') is null or (e->>'efecto') not in ('dano','curacion','recuperar_ph','reducir_fatiga','estado') then raise exception 'Cada acción necesita nombre y efecto válidos.'; end if;
  for par in select * from (values('cantidad',0,100),('caras',2,1000),('modificador',-1000000,1000000),('duracion',0,1000000),('coste_ph',0,1000000)) t(clave,minimo,maximo) loop
   if jsonb_typeof(e->par.clave) is distinct from 'number' then raise exception 'Falta un valor numérico en la acción: %.',par.clave; end if;
   n:=(e->>par.clave)::numeric;
   if trunc(n)<>n or n<par.minimo or n>par.maximo then raise exception 'Valor inválido para %.',par.clave; end if;
  end loop;
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
 return new;
end;
$$;
drop trigger if exists forja_validar_configuracion on public.forja_maestra;
create trigger forja_validar_configuracion before insert or update of tipo,tipo_creacion,slot_tipo,configuracion_dados,habilidades,equipamiento on public.forja_maestra
for each row execute function public.validar_configuracion_creacion();

-- Solo se usa internamente para copiar el equipo y las habilidades de un personaje.
create or replace function public.forja_stats_componente(p_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.forja_maestra%rowtype; resultado jsonb; r record; minimo numeric; maximo numeric; escala numeric;
begin
 select * into f from public.forja_maestra where id=p_id and estado='aprobado';
 if not found then raise exception 'Una habilidad o pieza de equipo ya no está disponible.'; end if;
 resultado:=coalesce(f.stats,'{}'::jsonb);
 if f.es_grupo then
  if coalesce(f.stats_rango,'{}'::jsonb)='{}'::jsonb then raise exception 'Configura los rangos del equipo o habilidad.'; end if;
  for r in select * from jsonb_each(f.stats_rango) loop
   if jsonb_typeof(r.value->'min') is distinct from 'number' or jsonb_typeof(r.value->'max') is distinct from 'number' then raise exception 'Rango de componente inválido.'; end if;
   minimo:=(r.value->>'min')::numeric; maximo:=(r.value->>'max')::numeric;
   if minimo>maximo or abs(minimo)>1000000 or abs(maximo)>1000000 or round(minimo,2)<>minimo or round(maximo,2)<>maximo then raise exception 'Rango de componente inválido.'; end if;
   escala:=case when trunc(minimo)=minimo and trunc(maximo)=maximo then 1 else 100 end;
   resultado:=resultado||jsonb_build_object(r.key,(floor(random()*((maximo-minimo)*escala+1))+minimo*escala)/escala);
  end loop;
 end if;
 return resultado;
end;
$$;
create or replace function public.forja_snapshot_config(p_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.forja_maestra%rowtype; item public.forja_maestra%rowtype; h jsonb; par record; s jsonb; attr record;
 habilidades jsonb:='[]'::jsonb; equipo jsonb:='{}'::jsonb; bonos jsonb:='{}'::jsonb;
begin
 select * into f from public.forja_maestra where id=p_id;
 if not found then return '{}'::jsonb; end if;
 if f.tipo_creacion='personaje' then
  for h in select value from jsonb_array_elements(coalesce(f.habilidades,'[]'::jsonb)) loop
   select * into item from public.forja_maestra where id::text=h#>>'{}' and tipo_creacion='habilidad' and estado='aprobado';
   if not found then raise exception 'Una habilidad del personaje ya no está disponible.'; end if;
   habilidades:=habilidades||jsonb_build_array(jsonb_build_object('id',item.id,'nombre',item.nombre,'stats',public.forja_stats_componente(item.id),'efectos',item.configuracion_dados));
  end loop;
  for par in select * from jsonb_each_text(f.equipamiento) loop
   select * into item from public.forja_maestra where id::text=par.value and tipo_creacion in ('objeto','titulo') and estado='aprobado';
   if not found then raise exception 'Una pieza de equipo ya no está disponible.'; end if;
   s:=public.forja_stats_componente(item.id);
   equipo:=equipo||jsonb_build_object(par.key,jsonb_build_object('id',item.id,'nombre',item.nombre,'slot_tipo',item.slot_tipo,'stats',s,'efectos',item.configuracion_dados));
   for attr in select * from jsonb_each(s) loop
    if jsonb_typeof(attr.value)='number' and attr.key not in ('peso','durabilidad','dados_dano','caras_dano','dano') then
     bonos:=bonos||jsonb_build_object(attr.key,coalesce((bonos->>attr.key)::numeric,0)+(attr.value::text)::numeric);
    end if;
   end loop;
  end loop;
 end if;
 return jsonb_build_object('tipo_creacion',f.tipo_creacion,'efectos',f.configuracion_dados,'habilidades',habilidades,'equipamiento',equipo,'bonos_equipamiento',bonos);
end;
$$;
create or replace function public.forja_guardar_snapshot_config() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare b record; base jsonb;
begin
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
revoke all on function public.forja_stats_componente(uuid),public.forja_snapshot_config(uuid),public.forja_guardar_snapshot_config() from public,anon,authenticated;
drop trigger if exists inventario_snapshot_config on public.inventario_jugador;
create trigger inventario_snapshot_config before insert on public.inventario_jugador for each row execute function public.forja_guardar_snapshot_config();
drop trigger if exists instancias_snapshot_config on public.forja_instancias;
create trigger instancias_snapshot_config before insert on public.forja_instancias for each row execute function public.forja_guardar_snapshot_config();
commit;
