begin;
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

insert into public.config_estadisticas(categoria,clave,etiqueta,descripcion,valor_defecto)
select r.clave,v.clave,v.etiqueta,v.descripcion,0 from public.categorias_forja r cross join (values
 ('salvacion','Bono de salvación','Se suma al d20 de las salvaciones. CD elemental base 12.'),
 ('corrupto','Oscuridad / corrupción','1 si pertenece a la oscuridad o está corrompido; 0 en otro caso.')) v(clave,etiqueta,descripcion)
where r.clave='razas' and not exists(select 1 from public.config_estadisticas s where s.categoria=r.clave and s.clave=v.clave);
insert into public.forja_maestra(nombre,tipo,tipo_creacion,descripcion,clase,estado,stats,reglas_pasivas)
select 'Escamas de dragón',c.clave,'pasiva','Contra ataques que consumen PH: +5 ARM solo contra ese ataque; si impacta, mitad del daño redondeada hacia abajo.','S','aprobado','{}'::jsonb,
'[ {"id":"escamas-dragon-magicas","nombre":"Escamas de dragón","evento":"recibir_ataque","condicion":"ataque_magico","bonos":{"armadura":5},"reduccion_pct":50,"curacion":0,"recuperar_ph":0,"reducir_fatiga":0} ]'::jsonb
from public.categorias_forja c where c.clave='pasivas_generales' and not exists(select 1 from public.forja_maestra where lower(nombre)='escamas de dragón') limit 1;
commit;
