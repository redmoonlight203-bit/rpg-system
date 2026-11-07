begin;
create or replace function public.naturalezas_combate_snapshot(p_personaje bigint) returns jsonb
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare n record;x jsonb;f public.forja_maestra%rowtype;ps jsonb:='[]';hs jsonb:='[]';rs jsonb:='[]';ns jsonb:='[]';pieza jsonb;idx integer;
begin
 for n in select v.id as vinculo,cat.* from public.personaje_naturalezas v join public.naturalezas cat on cat.id=v.naturaleza_id where v.personaje_id=p_personaje and v.activa order by v.adquirida_at,v.id loop
  ns:=ns||jsonb_build_array(jsonb_build_object('id',n.id,'nombre',n.nombre,'descripcion',n.descripcion));
  for x in select value from jsonb_array_elements(n.pasivas) loop
   if jsonb_typeof(x)='string' then
    select * into f from public.forja_maestra where id::text=x#>>'{}' and estado='aprobado' and tipo_creacion='pasiva';
    if not found then raise exception 'Pasiva de naturaleza no disponible';end if;
    pieza:=jsonb_build_object('nombre',f.nombre,'reglas',f.reglas_pasivas,'reglas_motor',f.reglas,'requisitos_uso',f.requisitos_uso);
   else pieza:=x;end if;
   ps:=ps||jsonb_build_array(pieza||jsonb_build_object('id','naturaleza:'||n.vinculo||':pasiva:'||jsonb_array_length(ps)));
  end loop;
  for x in select value from jsonb_array_elements(n.habilidades) loop
   if jsonb_typeof(x)='string' then
    select * into f from public.forja_maestra where id::text=x#>>'{}' and estado='aprobado' and tipo_creacion='habilidad';
    if not found then raise exception 'Habilidad de naturaleza no disponible';end if;
    pieza:=jsonb_build_object('nombre',f.nombre,'stats','{}'::jsonb,'efectos',f.configuracion_dados,'reglas',f.reglas,'requisitos_uso',f.requisitos_uso);
   else pieza:=x;end if;
   hs:=hs||jsonb_build_array(pieza||jsonb_build_object('id','naturaleza:'||n.vinculo||':habilidad:'||jsonb_array_length(hs)));
  end loop;
  if jsonb_array_length(coalesce(n.reglas->'motor','[]'))>0 then
   ps:=ps||jsonb_build_array(jsonb_build_object('id','naturaleza:'||n.vinculo||':motor','nombre',n.nombre,'reglas','[]'::jsonb,'reglas_motor',n.reglas->'motor'));
  end if;
 end loop;
 return jsonb_build_object('pasivas',ps,'habilidades',hs,'naturalezas',ns);
end;$$;
revoke all on function public.naturalezas_combate_snapshot(bigint) from public,anon;
grant execute on function public.naturalezas_combate_snapshot(bigint) to authenticated;
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
 naturalezas_config:=public.naturalezas_combate_snapshot(p.id);
 pasivas:=pasivas||(naturalezas_config->'pasivas');
 habilidades:=habilidades||(naturalezas_config->'habilidades');
 config:=jsonb_build_object('naturalezas',naturalezas_config->'naturalezas','raza',p.raza,'linaje_raza',public.forja_linaje_claves(p.raza),'reserva',reserva,'tipo_creacion','personaje','stats_base',base,'equipamiento',equipo,'bonos_equipamiento',bonos,'habilidades',habilidades,'pasivas',pasivas,'reglas_pasivas','[]'::jsonb);
 return jsonb_build_object('id',gen_random_uuid(),'forja_id',null,'personaje_id',p.id::text,'nombre',p.nombre,'stats',s,'configuracion',config,'requiere_configuracion',not base ? 'vida');
end;$function$;


create or replace function public.naturaleza_validar_pasiva(v jsonb) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare r jsonb;e jsonb;k text;ids text[]:='{}';par record;n numeric;
begin
 if jsonb_typeof(v) is distinct from 'object' or length(btrim(coalesce(v->>'nombre',''))) not between 1 and 120 or length(coalesce(v->>'descripcion',''))>2000 then raise exception 'Nombre o descripción racial inválidos.';end if;
 if jsonb_typeof(v->'reglas') is distinct from 'array' or jsonb_typeof(v->'reglas_pasivas') is distinct from 'array' then raise exception 'Reglas raciales inválidas.';end if;
 if jsonb_array_length(v->'reglas_pasivas')>20 or jsonb_array_length(v->'reglas')+jsonb_array_length(v->'reglas_pasivas')=0 then raise exception 'Añade al menos una regla y como máximo 20 efectos pasivos.';end if;
 if jsonb_typeof((v->'reglas'))<>'array' or jsonb_array_length((v->'reglas'))>40 or octet_length((v->'reglas')::text)>200000 then raise exception 'Máximo 40 reglas y 200 KB por creación.';end if;
 for r in select value from jsonb_array_elements((v->'reglas')) loop
  if jsonb_typeof(r)<>'object' or length(btrim(coalesce(r->>'id','')))=0 or r->>'id'=any(ids) or length(btrim(coalesce(r->>'nombre',''))) not between 1 and 120 or coalesce(r->>'evento','') not in ('equipar','desequipar','fin_efecto','usar','inicio_combate','inicio_turno','fin_turno','atacar','impactar','fallar','recibir_dano','causar_dano','matar','morir','fin_combate') then raise exception 'Regla inválida.';end if;
  ids:=array_append(ids,r->>'id');
  for k in select unnest(array['coste_ph','coste_fatiga','enfriamiento','usos','prioridad']) loop
   if jsonb_typeof(r->k) is distinct from 'number' or (r->>k)::numeric<>trunc((r->>k)::numeric) or (r->>k)::numeric not between (case when k='prioridad' then -1000 else 0 end) and (case when k='prioridad' then 1000 else 1000000 end) then raise exception 'Costes o límites inválidos.';end if;
  end loop;
  perform public.forja_validar_bloque_motor(r->'condicion','condicion');
  if jsonb_typeof(r->'efectos') is distinct from 'array' or jsonb_array_length(r->'efectos') not between 1 and 50 then raise exception 'Configura los efectos.';end if;
  for e in select value from jsonb_array_elements(r->'efectos') loop perform public.forja_validar_bloque_motor(e,'efecto');end loop;
 end loop; for e in select value from jsonb_array_elements((v->'reglas_pasivas')) loop
  if e->>'condicion' in ('ataque_magico','ataque_natural','ataque_elemental') and e->>'evento' in ('permanente','inicio_turno') then raise exception 'Una condición de ataque necesita evento reactivo.';end if;
  if e ? 'elemento' and e->>'elemento' not in ('cualquiera','fuego','agua','electricidad','hielo','luz_sagrada') then raise exception 'Elemento reactivo inválido.';end if;
  if e ? 'reduccion_pct' then if jsonb_typeof(e->'reduccion_pct')<>'number' or (e->>'reduccion_pct')::numeric<0 or (e->>'reduccion_pct')::numeric>100 then raise exception 'Reducción inválida.';end if;end if;
  if e ? 'represalia_dados' then n:=(e->>'represalia_dados')::numeric;if n<>trunc(n) or n<0 or n>100 then raise exception 'Dados de represalia inválidos.';end if;end if;
  if e ? 'represalia_caras' then n:=(e->>'represalia_caras')::numeric;if n<>trunc(n) or n<2 or n>1000 then raise exception 'Caras de represalia inválidas.';end if;end if;
  if coalesce(btrim(e->>'nombre'),'')='' or e->>'condicion' is null or e->>'condicion' not in ('siempre','vida_mitad','sin_arma','ataque_magico','ataque_natural','ataque_elemental') or e->>'evento' is null or e->>'evento' not in ('permanente','inicio_turno','recibir_ataque','recibir_impacto','recibir_dano') or jsonb_typeof(e->'bonos') is distinct from 'object' then raise exception 'Configura la condición y el momento de cada pasiva.';end if;
  for par in select * from jsonb_each(e->'bonos') loop if jsonb_typeof(par.value)<>'number' or abs((par.value::text)::numeric)>1000000 then raise exception 'Bono pasivo inválido.';end if;end loop;
  for par in select * from (values('curacion'),('recuperar_ph'),('reducir_fatiga')) t(clave) loop if jsonb_typeof(e->par.clave) is distinct from 'number' or (e->>par.clave)::numeric<0 or (e->>par.clave)::numeric>1000000 then raise exception 'Recuperación pasiva inválida.';end if;end loop;
 end loop;
end;$$;
revoke all on function public.naturaleza_validar_pasiva(jsonb) from public,anon;
grant execute on function public.naturaleza_validar_pasiva(jsonb) to authenticated;
create or replace function public.naturaleza_validar_efectos(v jsonb) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare e jsonb;par record;n numeric;
begin
 if jsonb_typeof(v)<>'array' or jsonb_array_length(v)>20 then raise exception 'Configura hasta veinte acciones.'; end if;
 for e in select value from jsonb_array_elements(v) loop
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
end;$$;
revoke all on function public.naturaleza_validar_efectos(jsonb) from public,anon;
grant execute on function public.naturaleza_validar_efectos(jsonb) to authenticated;
create or replace function public.naturaleza_validar_motor() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare x jsonb;rs jsonb;
begin
 if not public.es_gm_naturalezas() then raise exception 'Solo Kuroi puede editar naturalezas.' using errcode='42501';end if;
 if jsonb_typeof(new.pasivas) is distinct from 'array' or jsonb_typeof(new.habilidades) is distinct from 'array' or jsonb_typeof(new.reglas) is distinct from 'object' then raise exception 'Definición de naturaleza inválida';end if;
 if octet_length(new.pasivas::text||new.habilidades::text||new.reglas::text)>200000 then raise exception 'Máximo 200 KB por naturaleza';end if;
 for x in select value from jsonb_array_elements(new.pasivas) loop
  if jsonb_typeof(x)='string' then
   if not exists(select 1 from public.forja_maestra where id::text=x#>>'{}' and tipo_creacion='pasiva' and estado='aprobado') then raise exception 'Selecciona una pasiva aprobada';end if;
  else
   perform public.naturaleza_validar_pasiva(jsonb_build_object('nombre',x->>'nombre','reglas',coalesce(x->'reglas_motor','[]'),'reglas_pasivas',coalesce(x->'reglas','[]')));
  end if;
 end loop;
 for x in select value from jsonb_array_elements(new.habilidades) loop
  if jsonb_typeof(x)='string' then
   if not exists(select 1 from public.forja_maestra where id::text=x#>>'{}' and tipo_creacion='habilidad' and estado='aprobado') then raise exception 'Selecciona una habilidad aprobada';end if;
  else
   if jsonb_typeof(x) is distinct from 'object' or coalesce(x->>'nombre','')='' or jsonb_typeof(x->'efectos') is distinct from 'array' then raise exception 'Habilidad inválida';end if;
   perform public.naturaleza_validar_efectos(x->'efectos');
   rs:=coalesce(x->'reglas','[]');
   if rs<>'[]'::jsonb then perform public.naturaleza_validar_pasiva(jsonb_build_object('nombre',x->>'nombre','reglas',rs,'reglas_pasivas','[]'::jsonb));end if;
  end if;
 end loop;
 rs:=coalesce(new.reglas->'motor','[]');
 if rs<>'[]'::jsonb then perform public.naturaleza_validar_pasiva(jsonb_build_object('nombre',new.nombre,'reglas',rs,'reglas_pasivas','[]'::jsonb));end if;
 return new;
end;$$;
create or replace trigger naturaleza_validar_motor before insert or update on public.naturalezas for each row execute function public.naturaleza_validar_motor();

commit;
