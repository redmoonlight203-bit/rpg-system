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
   habilidades:=habilidades||jsonb_build_array(jsonb_build_object('configuracion_invocacion',item.configuracion_invocacion,'requisitos_uso',item.requisitos_uso,'id',item.id,'nombre',item.nombre,'stats',public.forja_stats_componente(item.id),'efectos',item.configuracion_dados,'reglas',item.reglas));
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
 return jsonb_build_object('configuracion_invocacion',f.configuracion_invocacion,'requisitos_uso',f.requisitos_uso,'raza',f.tipo,'linaje_raza',public.forja_linaje_claves(f.tipo),'consumible',f.consumible,'reglas',f.reglas,'pasivas',pasivas,'reglas_pasivas',f.reglas_pasivas,'tipo_creacion',f.tipo_creacion,'efectos',f.configuracion_dados,'habilidades',habilidades,'equipamiento',equipo,'bonos_equipamiento',bonos);
end;
$function$;
alter table public.categorias_forja add column if not exists rangos_criatura jsonb not null default '{}';
-- Monstruos tiene recursos propios y no depende de una raza concreta.
insert into public.config_estadisticas(categoria,clave,etiqueta,descripcion,valor_defecto)
select 'monstruos',s.clave,s.etiqueta,s.descripcion,s.valor_defecto
from public.config_estadisticas s where s.categoria='razas'
and not exists(select 1 from public.config_estadisticas x where x.categoria='monstruos' and x.clave=s.clave);
create or replace function public.forja_monstruos_malla() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare es_monstruo boolean; p record; c jsonb;
begin
 select exists(with recursive familia as (
  select id,parent_id,clave,array[id] vistos from public.categorias_forja where clave=new.tipo
  union all select c.id,c.parent_id,c.clave,f.vistos||c.id from public.categorias_forja c join familia f on c.id=f.parent_id where not c.id=any(f.vistos)
 )select 1 from familia where clave='monstruos') into es_monstruo;
 if es_monstruo then
  new.tipo_creacion:='personaje';
  if not new.es_grupo then raise exception 'Los monstruos siempre son mallas. Define sus rangos.';end if;
  if new.stats_rango='{}'::jsonb then raise exception 'Define al menos un rango para el monstruo.';end if;
 end if;
 c:=new.configuracion_invocacion;
 if c is not null and c<>'null'::jsonb then
  if new.tipo_creacion<>'habilidad' or jsonb_typeof(c)<>'object' then raise exception 'Solo las habilidades pueden configurar invocaciones.';end if;
  if coalesce(c->>'modo','') not in ('existente','plantilla_temporal','jugador_en_combate','gm_en_combate') or coalesce(c->>'claseMaxima','') not in ('F','D','C','B','A','S','Z','KUROI') then raise exception 'Modo o clase de invocación inválidos.';end if;
  if coalesce(c->>'duracionTurnos','') !~ '^[0-9]+$' or (c->>'duracionTurnos')::numeric not between 1 and 1000 or coalesce(c->>'maxHabilidades','') !~ '^[0-9]+$' or (c->>'maxHabilidades')::numeric not between 0 and 20 then raise exception 'Duración o límite de habilidades inválidos.';end if;
  for p in select * from jsonb_each(coalesce(c->'rangos','{}')) loop
   if jsonb_typeof(p.value->'min') is distinct from 'number' or jsonb_typeof(p.value->'max') is distinct from 'number' or (p.value->>'min')::numeric<0 or (p.value->>'min')::numeric>(p.value->>'max')::numeric then raise exception 'Rango de invocación inválido.';end if;
  end loop;
 end if;
 return new;
end;$$;
drop trigger if exists a_monstruos_malla on public.forja_maestra;
create trigger a_monstruos_malla before insert or update on public.forja_maestra for each row execute function public.forja_monstruos_malla();
revoke all on function public.forja_monstruos_malla() from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.forja_puntuacion_calculada(s jsonb, efectos jsonb, pasivas jsonb, reglas jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
 
 return n;
end;$function$;
-- La clase del personaje incluye también la potencia de sus habilidades y pasivas.
create or replace function public.forja_validar_carga_y_clase() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare refid text;item public.forja_maestra%rowtype;base jsonb;s jsonb;extra numeric:=0;
clases text[]:=array['F','D','C','B','A','S','Z','KUROI'];umbrales numeric[]:=array[0,10,25,50,100,200,500,1000];i integer;
begin
 perform public.forja_validar_requisitos(new.requisitos_uso);
 base:=new.stats;
 if new.es_grupo then select coalesce(jsonb_object_agg(key,value->'min'),'{}') into base from jsonb_each(new.stats_rango);end if;
 if new.tipo_creacion='personaje' then
  for refid in select jsonb_array_elements_text(coalesce(new.habilidades,'[]')||coalesce(new.pasivas,'[]')) union all select value from jsonb_each_text(new.equipamiento) loop
   select * into item from public.forja_maestra where forja_maestra.id::text=refid;
   if found and not public.forja_cumple_requisitos(item.requisitos_uso,new.tipo,base) then raise exception '%: el personaje no cumple los requisitos de raza o atributos base.',item.nombre;end if;
   if found and item.tipo_creacion in ('habilidad','pasiva') then i:=array_position(clases,item.clase);extra:=extra+greatest(coalesce(umbrales[i],0),public.forja_puntuacion_calculada(item.stats,item.configuracion_dados,item.reglas_pasivas,item.reglas));end if;
  end loop;
 end if;
 s:=new.stats;
 if new.es_grupo then select coalesce(jsonb_object_agg(key,to_jsonb(((value->>'min')::numeric+(value->>'max')::numeric)/2)),'{}') into s from jsonb_each(new.stats_rango);end if;
 s:=s||jsonb_build_object('poder_vinculado',extra);
 new.clase:=public.forja_clase_calculada(s-'nivel'-'exp_total'-'experiencia',new.configuracion_dados,new.reglas_pasivas,new.reglas);
 return new;
end;$$;

revoke all on function public.forja_puntuacion_calculada(jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.forja_puntuacion_calculada(jsonb,jsonb,jsonb,jsonb) to authenticated;
