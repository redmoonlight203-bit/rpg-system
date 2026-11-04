begin;
alter table public.categorias_forja add column pasiva_racial jsonb;
create or replace function public.validar_pasiva_racial() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare r jsonb;e jsonb;k text;ids text[]:='{}';par record;n numeric;
begin

 if tg_op='UPDATE' and new.pasiva_racial is not distinct from old.pasiva_racial then return new;end if;
 if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then raise exception 'Solo Kuroi puede configurar pasivas raciales.' using errcode='42501';end if;
 if new.pasiva_racial is null then return new;end if;
 if jsonb_typeof(new.pasiva_racial) is distinct from 'object' or length(btrim(coalesce(new.pasiva_racial->>'nombre',''))) not between 1 and 120 or length(coalesce(new.pasiva_racial->>'descripcion',''))>2000 then raise exception 'Nombre o descripción racial inválidos.';end if;
 if jsonb_typeof(new.pasiva_racial->'reglas') is distinct from 'array' or jsonb_typeof(new.pasiva_racial->'reglas_pasivas') is distinct from 'array' then raise exception 'Reglas raciales inválidas.';end if;
 if jsonb_array_length(new.pasiva_racial->'reglas_pasivas')>20 or jsonb_array_length(new.pasiva_racial->'reglas')+jsonb_array_length(new.pasiva_racial->'reglas_pasivas')=0 then raise exception 'Añade al menos una regla y como máximo 20 efectos pasivos.';end if;
 if jsonb_typeof((new.pasiva_racial->'reglas'))<>'array' or jsonb_array_length((new.pasiva_racial->'reglas'))>40 or octet_length((new.pasiva_racial->'reglas')::text)>200000 then raise exception 'Máximo 40 reglas y 200 KB por creación.';end if;
 for r in select value from jsonb_array_elements((new.pasiva_racial->'reglas')) loop
  if jsonb_typeof(r)<>'object' or length(btrim(coalesce(r->>'id','')))=0 or r->>'id'=any(ids) or length(btrim(coalesce(r->>'nombre',''))) not between 1 and 120 or coalesce(r->>'evento','') not in ('usar','inicio_combate','inicio_turno','fin_turno','atacar','impactar','fallar','recibir_dano','causar_dano','matar','morir','fin_combate') then raise exception 'Regla inválida.';end if;
  ids:=array_append(ids,r->>'id');
  for k in select unnest(array['coste_ph','coste_fatiga','enfriamiento','usos','prioridad']) loop
   if jsonb_typeof(r->k) is distinct from 'number' or (r->>k)::numeric<>trunc((r->>k)::numeric) or (r->>k)::numeric not between (case when k='prioridad' then -1000 else 0 end) and (case when k='prioridad' then 1000 else 1000000 end) then raise exception 'Costes o límites inválidos.';end if;
  end loop;
  perform public.forja_validar_bloque_motor(r->'condicion','condicion');
  if jsonb_typeof(r->'efectos') is distinct from 'array' or jsonb_array_length(r->'efectos') not between 1 and 50 then raise exception 'Configura los efectos.';end if;
  for e in select value from jsonb_array_elements(r->'efectos') loop perform public.forja_validar_bloque_motor(e,'efecto');end loop;
 end loop; for e in select value from jsonb_array_elements((new.pasiva_racial->'reglas_pasivas')) loop
  if e->>'condicion' in ('ataque_magico','ataque_natural','ataque_elemental') and e->>'evento' in ('permanente','inicio_turno') then raise exception 'Una condición de ataque necesita evento reactivo.';end if;
  if e ? 'elemento' and e->>'elemento' not in ('cualquiera','fuego','agua','electricidad','hielo','luz_sagrada') then raise exception 'Elemento reactivo inválido.';end if;
  if e ? 'reduccion_pct' then if jsonb_typeof(e->'reduccion_pct')<>'number' or (e->>'reduccion_pct')::numeric<0 or (e->>'reduccion_pct')::numeric>100 then raise exception 'Reducción inválida.';end if;end if;
  if e ? 'represalia_dados' then n:=(e->>'represalia_dados')::numeric;if n<>trunc(n) or n<0 or n>100 then raise exception 'Dados de represalia inválidos.';end if;end if;
  if e ? 'represalia_caras' then n:=(e->>'represalia_caras')::numeric;if n<>trunc(n) or n<2 or n>1000 then raise exception 'Caras de represalia inválidas.';end if;end if;
  if coalesce(btrim(e->>'nombre'),'')='' or e->>'condicion' is null or e->>'condicion' not in ('siempre','vida_mitad','sin_arma','ataque_magico','ataque_natural','ataque_elemental') or e->>'evento' is null or e->>'evento' not in ('permanente','inicio_turno','recibir_ataque','recibir_impacto','recibir_dano') or jsonb_typeof(e->'bonos') is distinct from 'object' then raise exception 'Configura la condición y el momento de cada pasiva.';end if;
  for par in select * from jsonb_each(e->'bonos') loop if jsonb_typeof(par.value)<>'number' or abs((par.value::text)::numeric)>1000000 then raise exception 'Bono pasivo inválido.';end if;end loop;
  for par in select * from (values('curacion'),('recuperar_ph'),('reducir_fatiga')) t(clave) loop if jsonb_typeof(e->par.clave) is distinct from 'number' or (e->>par.clave)::numeric<0 or (e->>par.clave)::numeric>1000000 then raise exception 'Recuperación pasiva inválida.';end if;end loop;
 end loop;
return new;
end;$$;
create trigger validar_pasiva_racial before insert or update of pasiva_racial on public.categorias_forja for each row execute function public.validar_pasiva_racial();

create or replace function public.pasivas_raciales_snapshot(p_raza text) returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
 with recursive camino as (
  select c.*,array[c.id] as vistos,0 as nivel from public.categorias_forja c
  where c.id=(select x.id from public.categorias_forja x where x.clave=p_raza or lower(x.nombre)=lower(p_raza) order by (x.clave=p_raza) desc,x.id limit 1)
  union all
  select p.*,h.vistos||p.id,h.nivel+1 from public.categorias_forja p join camino h on p.id=h.parent_id where not p.id=any(h.vistos)
 )
 select coalesce(jsonb_agg(jsonb_build_object('id','raza:'||id,'nombre',pasiva_racial->>'nombre','descripcion',pasiva_racial->>'descripcion','reglas',pasiva_racial->'reglas_pasivas','reglas_motor',pasiva_racial->'reglas') order by nivel desc),'[]'::jsonb)
 from camino where pasiva_racial is not null and exists(select 1 from camino where clave='razas');
$$;
revoke all on function public.pasivas_raciales_snapshot(text) from public,anon;
grant execute on function public.pasivas_raciales_snapshot(text) to authenticated;
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
$function$;

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
 pasivas:=pasivas||public.pasivas_raciales_snapshot(p.raza);
 config:=jsonb_build_object('reserva',reserva,'tipo_creacion','personaje','stats_base',base,'equipamiento',equipo,'bonos_equipamiento',bonos,'habilidades',habilidades,'pasivas',pasivas,'reglas_pasivas','[]'::jsonb);
 return jsonb_build_object('id',gen_random_uuid(),'forja_id',null,'personaje_id',p.id::text,'nombre',p.nombre,'stats',s,'configuracion',config,'requiere_configuracion',not base ? 'vida');
end;$function$;


commit;
