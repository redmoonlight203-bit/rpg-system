alter table public.forja_maestra add column if not exists requisitos_uso jsonb not null default '{}';

create or replace function public.forja_linaje_claves(p_raza text) returns text[] language sql stable security invoker set search_path=public,pg_temp as $$
 with recursive camino as (
 select c.id,c.parent_id,c.clave,c.nombre,array[c.id] as vistos from public.categorias_forja c where c.clave=p_raza or lower(c.nombre)=lower(p_raza)
 union all select c.id,c.parent_id,c.clave,c.nombre,x.vistos||c.id from camino x join public.categorias_forja c on c.id=x.parent_id where not c.id=any(x.vistos)
 ) select coalesce(array_agg(distinct v),'{}') from camino cross join lateral unnest(array[clave,nombre]) v;
$$;
create or replace function public.forja_validar_requisitos(r jsonb) returns void language plpgsql immutable set search_path=public,pg_temp as $$
declare p record;v jsonb;
begin
 if jsonb_typeof(r) is distinct from 'object' then raise exception 'Requisitos inválidos.';end if;
 if r ? 'razas' then
  if jsonb_typeof(r->'razas') is distinct from 'array' or jsonb_array_length(r->'razas')>50 then raise exception 'Razas inválidas.';end if;
  for v in select value from jsonb_array_elements(r->'razas') loop if jsonb_typeof(v) is distinct from 'string' or length(btrim(v#>>'{}')) not between 1 and 100 then raise exception 'Raza inválida.';end if;end loop;
 end if;
 if r ? 'minimos' then
  if jsonb_typeof(r->'minimos') is distinct from 'object' or (select count(*) from jsonb_object_keys(r->'minimos'))>50 then raise exception 'Mínimos inválidos.';end if;
  for p in select * from jsonb_each(r->'minimos') loop
   if p.key!~'^[a-z_][a-z0-9_]{0,63}$' or jsonb_typeof(p.value) is distinct from 'number' or (p.value::text)::numeric not between 0 and 1000000 then raise exception 'Atributo o mínimo inválido.';end if;
  end loop;
 end if;
end;$$;
create or replace function public.forja_cumple_requisitos(r jsonb,raza text,stats jsonb) returns boolean language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare p record;v text;claves text[];cumple boolean:=false;s jsonb:=coalesce(stats,'{}');
begin
 if r is null then return true;end if;perform public.forja_validar_requisitos(r);
 if not s ? 'vida' and s ? 'hp' then s:=s||jsonb_build_object('vida',s->'hp');end if;
 if jsonb_array_length(coalesce(r->'razas','[]'))>0 then
  claves:=array_append(public.forja_linaje_claves(raza),raza);
  for v in select jsonb_array_elements_text(r->'razas') loop if exists(select 1 from unnest(claves) k where lower(trim(k))=lower(trim(v))) then cumple:=true;end if;end loop;
  if not cumple then return false;end if;
 end if;
 for p in select * from jsonb_each_text(coalesce(r->'minimos','{}')) loop if coalesce((s->>p.key)::numeric,0)<p.value::numeric then return false;end if;end loop;
 return true;
end;$$;

-- Numerical estimate for this app, not numerical thresholds from the Diario.
create or replace function public.forja_clase_calculada(s jsonb,efectos jsonb,pasivas jsonb,reglas jsonb) returns text language plpgsql immutable set search_path=public,pg_temp as $$
declare p record;e jsonb;r jsonb;v jsonb;n numeric:=0;a numeric:=0;b numeric:=0;w numeric;x numeric;clases text[]:=array['F','D','C','B','A','S','Z','KUROI'];umbrales numeric[]:=array[0,10,25,50,100,200,500,1000];resultado text:='F';i integer;
begin
 for p in select * from jsonb_each_text(coalesce(s,'{}')) loop
  w:=case when p.key in ('peso','durabilidad','dados_dano','caras_dano','enfriamiento','cooldown') then 0 when p.key='hp' and s ? 'vida' then 0 when p.key in ('vida','hp') then .1 when p.key='ph' then .2 when p.key in ('energia','resistencia') then .01 else 1 end;
  n:=n+greatest(0,p.value::numeric)*w;
 end loop;
 for e in select value from jsonb_array_elements(coalesce(efectos,'[]')) loop
  for r in select value from jsonb_array_elements(coalesce(e->'tabla_armas'->'resultados',jsonb_build_array(e))) loop
   x:=greatest(0,coalesce((r->>'cantidad')::numeric,0)*(coalesce((r->>'caras')::numeric,6)+1)/2+coalesce((r->>'modificador')::numeric,0));a:=greatest(a,x);
  end loop;
 end loop;
 for e in select value from jsonb_array_elements(coalesce(pasivas,'[]')) loop for p in select * from jsonb_each_text(coalesce(e->'bonos','{}')) loop b:=b+greatest(0,p.value::numeric);end loop;end loop;
 n:=n+a+b;
 for e in select value from jsonb_array_elements(coalesce(reglas,'[]')) loop n:=n+jsonb_array_length(coalesce(e->'efectos','[]'))*2;end loop;
 n:=round(n,2);
 for i in 1..8 loop if n>=umbrales[i] then resultado:=clases[i];end if;end loop;
 return resultado;
end;$$;
create or replace function public.forja_validar_carga_y_clase() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare refid text;item public.forja_maestra%rowtype;base jsonb;s jsonb;
begin
 perform public.forja_validar_requisitos(new.requisitos_uso);
 base:=new.stats;
 if new.es_grupo then select coalesce(jsonb_object_agg(key,value->'min'),'{}') into base from jsonb_each(new.stats_rango);end if;
 if new.tipo_creacion='personaje' then
  for refid in select jsonb_array_elements_text(coalesce(new.habilidades,'[]')||coalesce(new.pasivas,'[]')) union all select value from jsonb_each_text(new.equipamiento) loop
   select * into item from public.forja_maestra where forja_maestra.id::text=refid;
   if found and not public.forja_cumple_requisitos(item.requisitos_uso,new.tipo,base) then raise exception '%: el personaje no cumple los requisitos de raza o atributos base.',item.nombre;end if;
  end loop;
 end if;
 s:=new.stats;
 if new.es_grupo then select coalesce(jsonb_object_agg(key,to_jsonb(((value->>'min')::numeric+(value->>'max')::numeric)/2)),'{}') into s from jsonb_each(new.stats_rango);end if;
 new.clase:=public.forja_clase_calculada(s,new.configuracion_dados,new.reglas_pasivas,new.reglas);
 return new;
end;$$;
create trigger aa_forja_carga_y_clase before insert or update of clase,stats,stats_rango,es_grupo,configuracion_dados,reglas,reglas_pasivas,requisitos_uso,habilidades,pasivas,equipamiento,tipo
on public.forja_maestra for each row execute function public.forja_validar_carga_y_clase();

create or replace function public.inventario_validar_requisitos_uso() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare p public.personajes%rowtype;t text;
begin
 t:=new.configuracion->>'tipo_creacion';
 if new.slot_equipado is not null or (coalesce(new.es_activo,true) and t in ('habilidad','pasiva')) then
  select * into p from public.personajes where id=new.personaje_id;
  if not public.forja_cumple_requisitos(new.configuracion->'requisitos_uso',p.raza,p.atributos) then raise exception '%: no cumple los requisitos de raza o atributos base.',new.nombre;end if;
 end if;
 return new;
end;$$;
create trigger zz_inventario_requisitos_uso before insert or update of slot_equipado,es_activo,configuracion,personaje_id on public.inventario_jugador for each row execute function public.inventario_validar_requisitos_uso();
CREATE OR REPLACE FUNCTION public.forja_snapshot_config(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare f public.forja_maestra%rowtype; item public.forja_maestra%rowtype; h jsonb; par record; s jsonb; attr record;
 pasivas jsonb:='[]'::jsonb; habilidades jsonb:='[]'::jsonb; equipo jsonb:='{}'::jsonb; bonos jsonb:='{}'::jsonb;
begin
 if auth.uid() is null then raise exception 'Inicia sesión.' using errcode='42501';end if;
 select * into f from public.forja_maestra where id=p_id;
 if not found then return '{}'::jsonb; end if;
 if f.tipo_creacion='personaje' then
  pasivas:=public.pasivas_raciales_snapshot(f.tipo);
  for h in select value from jsonb_array_elements(f.pasivas) loop
   select * into item from public.forja_maestra where id::text=h#>>'{}' and tipo_creacion='pasiva' and estado='aprobado';
   if not found then raise exception 'Una pasiva ya no está disponible.';end if;
   pasivas:=pasivas||jsonb_build_array(jsonb_build_object('requisitos_uso',item.requisitos_uso,'id',item.id,'nombre',item.nombre,'reglas',item.reglas_pasivas,'reglas_motor',item.reglas));
  end loop;
  for h in select value from jsonb_array_elements(coalesce(f.habilidades,'[]'::jsonb)) loop
   select * into item from public.forja_maestra where id::text=h#>>'{}' and tipo_creacion='habilidad' and estado='aprobado';
   if not found then raise exception 'Una habilidad del personaje ya no está disponible.'; end if;
   habilidades:=habilidades||jsonb_build_array(jsonb_build_object('requisitos_uso',item.requisitos_uso,'id',item.id,'nombre',item.nombre,'stats',public.forja_stats_componente(item.id),'efectos',item.configuracion_dados,'reglas',item.reglas));
  end loop;
  for par in select * from jsonb_each_text(f.equipamiento) loop
   select * into item from public.forja_maestra where id::text=par.value and tipo_creacion in ('objeto','titulo') and estado='aprobado';
   if not found then raise exception 'Una pieza de equipo ya no está disponible.'; end if;
   s:=public.forja_stats_componente(item.id);
   equipo:=equipo||jsonb_build_object(par.key,jsonb_build_object('requisitos_uso',item.requisitos_uso,'id',item.id,'nombre',item.nombre,'slot_tipo',item.slot_tipo,'tipo_creacion',item.tipo_creacion,'descripcion',item.descripcion,'imagen_url',item.imagen_url,'consumible',item.consumible,'stats',s,'efectos',item.configuracion_dados,'reglas',item.reglas,'reglas_pasivas',item.reglas_pasivas));
   for attr in select * from jsonb_each(s) loop
    if jsonb_typeof(attr.value)='number' and attr.key not in ('peso','durabilidad','dados_dano','caras_dano','dano') then
     bonos:=bonos||jsonb_build_object(attr.key,coalesce((bonos->>attr.key)::numeric,0)+(attr.value::text)::numeric);
    end if;
   end loop;
  end loop;
 end if;
 return jsonb_build_object('requisitos_uso',f.requisitos_uso,'raza',f.tipo,'linaje_raza',public.forja_linaje_claves(f.tipo),'consumible',f.consumible,'reglas',f.reglas,'pasivas',pasivas,'reglas_pasivas',f.reglas_pasivas,'tipo_creacion',f.tipo_creacion,'efectos',f.configuracion_dados,'habilidades',habilidades,'equipamiento',equipo,'bonos_equipamiento',bonos);
end;
$function$
;
CREATE OR REPLACE FUNCTION yugen_interno.preparar_jugador(p_personaje bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  pieza:=jsonb_build_object('requisitos_uso',coalesce(i.configuracion->'requisitos_uso','{}'),'id',i.id,'nombre',i.nombre,'stats',coalesce(i.stats,'{}'),'efectos',efectos,'slot_tipo',i.slot_tipo,'tipo_creacion',t,'descripcion',i.descripcion,'imagen_url',i.imagen_url,'consumible',coalesce((i.configuracion->>'consumible')::boolean,false),'reglas',coalesce(i.configuracion->'reglas','[]'),'reglas_pasivas',coalesce(i.configuracion->'reglas_pasivas','[]'));
  reserva:=reserva||jsonb_build_array(pieza);
  if i.slot_equipado is not null and i.slot_equipado<>'' then
   if equipo ? i.slot_equipado then raise exception 'Hay dos piezas en el mismo espacio. Revisa el equipamiento.';end if;
   equipo:=equipo||jsonb_build_object(i.slot_equipado,pieza);
   for a in select * from jsonb_each(coalesce(i.stats,'{}')) loop
    if jsonb_typeof(a.value)='number' and a.key not in ('peso','durabilidad','dados_dano','caras_dano','dano') then bonos:=bonos||jsonb_build_object(a.key,coalesce((bonos->>a.key)::numeric,0)+(a.value::text)::numeric);end if;
   end loop;
  elsif coalesce(i.es_activo,true) and public.forja_cumple_requisitos(i.configuracion->'requisitos_uso',p.raza,base) then
   if t='habilidad' then habilidades:=habilidades||jsonb_build_array(pieza);end if;
   if t='pasiva' then pasivas:=pasivas||jsonb_build_array(jsonb_build_object('requisitos_uso',coalesce(i.configuracion->'requisitos_uso','{}'),'id',i.id,'nombre',i.nombre,'reglas_motor',coalesce(i.configuracion->'reglas','[]'),'reglas',coalesce(i.configuracion->'reglas_pasivas','[]')));end if;
  end if;
 end loop;
 for a in select * from jsonb_each(bonos) loop s:=s||jsonb_build_object(a.key,coalesce((s->>a.key)::numeric,0)+(a.value::text)::numeric);end loop;
 pasivas:=pasivas||public.pasivas_raciales_snapshot(p.raza);
 config:=jsonb_build_object('raza',p.raza,'linaje_raza',public.forja_linaje_claves(p.raza),'reserva',reserva,'tipo_creacion','personaje','stats_base',base,'equipamiento',equipo,'bonos_equipamiento',bonos,'habilidades',habilidades,'pasivas',pasivas,'reglas_pasivas','[]'::jsonb);
 return jsonb_build_object('id',gen_random_uuid(),'forja_id',null,'personaje_id',p.id::text,'nombre',p.nombre,'stats',s,'configuracion',config,'requiere_configuracion',not base ? 'vida');
end;$function$
;
CREATE OR REPLACE FUNCTION yugen_interno.aplicar_equipo(p_personaje bigint, p_equipo jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare p public.personajes%rowtype;i public.inventario_jugador%rowtype;par record;vistos text[]:='{}';tipo text;der text;izq text;
begin
 select * into p from public.personajes where id=p_personaje for update;
 if not found or jsonb_typeof(p_equipo) is distinct from 'object' then raise exception 'Equipamiento inválido.';end if;
 for par in select * from jsonb_each_text(p_equipo) loop
  select * into i from public.inventario_jugador where id::text=par.value and personaje_id=p.id and user_id=p.user_id for update;
  if not found or par.value=any(vistos) then raise exception 'La pieza no pertenece a este inventario o está duplicada.';end if;
  if not public.forja_cumple_requisitos(i.configuracion->'requisitos_uso',p.raza,p.atributos) then raise exception '%: requisitos no cumplidos.',i.nombre;end if;
  vistos:=array_append(vistos,par.value);
  tipo:=i.slot_tipo;
  if not ((par.key in ('mano_der','mano_izq') and tipo in ('mano','dos_manos')) or (par.key~'^acc_[1-6]$' and tipo='accesorio') or (par.key in ('casco','pechera','pantalones','zapatos','capa','titulo') and tipo=par.key)) then raise exception 'Espacio incompatible.';end if;
  if tipo='dos_manos' and ((par.key='mano_der' and p_equipo ? 'mano_izq') or (par.key='mano_izq' and p_equipo ? 'mano_der')) then raise exception 'Un arma de dos manos ocupa ambas manos.';end if;
 end loop;
 perform set_config('yugen.equipo_interno',p.id::text,true);
 update public.inventario_jugador set slot_equipado=null where personaje_id=p.id and user_id=p.user_id and slot_equipado is not null;
 for par in select * from jsonb_each_text(p_equipo) loop update public.inventario_jugador set slot_equipado=par.key where id::text=par.value and personaje_id=p.id and user_id=p.user_id;end loop;
end;$function$

;

-- Refresh template labels only. Existing copies keep their stored statistics and configuration.
update public.forja_maestra set clase=public.forja_clase_calculada(
 case when es_grupo then (select coalesce(jsonb_object_agg(key,to_jsonb(((value->>'min')::numeric+(value->>'max')::numeric)/2)),'{}') from jsonb_each(stats_rango)) else stats end,
 configuracion_dados,reglas_pasivas,reglas);
