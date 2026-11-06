alter table public.forja_maestra add column if not exists configuracion_monstruo jsonb;
create or replace function public.forja_validar_variantes_monstruo() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare c jsonb;v jsonb;e record;r record;ids text[]:='{}';slot text;ref text;
begin
 c:=new.configuracion_monstruo;
 if c is null or c='null'::jsonb then return new;end if;
 if new.tipo_creacion<>'personaje' or not ('monstruos'=any(public.forja_linaje_claves(new.tipo))) then raise exception 'Las variantes pertenecen a la rama Monstruos.';end if;
 if jsonb_typeof(c) is distinct from 'object' or jsonb_typeof(c->'variantes') is distinct from 'array' then raise exception 'Configuración de variantes inválida.';end if;
 if jsonb_array_length(c->'variantes')>30 then raise exception 'Máximo 30 variantes por especie.';end if;
 for v in select value from jsonb_array_elements(c->'variantes') loop
  if coalesce(v->>'id','')='' or v->>'id'=any(ids) or length(btrim(coalesce(v->>'nombre',''))) not between 1 and 100 then raise exception 'Variante sin nombre o identificador repetido.';end if;
  ids:=array_append(ids,v->>'id');
  if jsonb_typeof(v->'peso') is distinct from 'number' or (v->>'peso')::numeric not between 1 and 1000 then raise exception 'Peso de aparición inválido.';end if;
  if jsonb_typeof(v->'bonos') is distinct from 'object' or jsonb_typeof(v->'equipamiento') is distinct from 'object' then raise exception 'Ajustes o equipo inválidos.';end if;
  for r in select * from jsonb_each(v->'bonos') loop
   if jsonb_typeof(r.value) is distinct from 'number' or abs((r.value::text)::numeric)>1000000 or r.key in ('nivel','exp_total','experiencia') then raise exception 'Ajuste de atributo inválido.';end if;
  end loop;
  foreach slot in array array['habilidades','pasivas'] loop
   if jsonb_typeof(v->slot) is distinct from 'array' or jsonb_array_length(v->slot)>20 then raise exception 'Lista de poderes inválida.';end if;
   for ref in select jsonb_array_elements_text(v->slot) loop
    if not exists(select 1 from public.forja_maestra f where f.id::text=ref and f.estado='aprobado' and f.tipo_creacion=case when slot='habilidades' then 'habilidad' else 'pasiva' end) then raise exception 'Poder no disponible en La Creación.';end if;
   end loop;
  end loop;
  for e in select * from jsonb_each(v->'equipamiento') loop
   if e.key not in ('casco','pechera','pantalones','zapatos','capa','mano_der','mano_izq','acc_1','acc_2','acc_3','acc_4','acc_5','acc_6') then raise exception 'Espacio de equipo inválido.';end if;
   if e.value->>'modo'='catalogo' then
    if jsonb_typeof(e.value->'opciones') is distinct from 'array' or jsonb_array_length(e.value->'opciones') not between 1 and 100 then raise exception 'Selecciona opciones para el equipo.';end if;
    for ref in select jsonb_array_elements_text(e.value->'opciones') loop
     if not exists(select 1 from public.forja_maestra f where f.id::text=ref and f.estado='aprobado' and f.tipo_creacion='objeto' and f.slot_tipo=any(case when e.key in ('mano_der','mano_izq') then array['mano','dos_manos'] when e.key like 'acc_%' then array['accesorio'] else array[e.key] end)) then raise exception 'Objeto no disponible o incompatible con el espacio.';end if;
    end loop;
   elsif e.value->>'modo'='generado' then
    if length(btrim(coalesce(e.value->>'nombre','')))=0 or jsonb_typeof(e.value->'rangos') is distinct from 'object' or e.value->'rangos'='{}'::jsonb then raise exception 'Equipo generado sin nombre o rangos.';end if;
    for r in select * from jsonb_each(e.value->'rangos') loop
     if jsonb_typeof(r.value->'min') is distinct from 'number' or jsonb_typeof(r.value->'max') is distinct from 'number' or (r.value->>'min')::numeric<0 or (r.value->>'max')::numeric<(r.value->>'min')::numeric or (r.value->>'max')::numeric>1000000 then raise exception 'Rango de equipo inválido.';end if;
    end loop;
    if e.key in ('mano_der','mano_izq') and (coalesce(e.value->>'dados','') !~ '^[0-9]+$' or coalesce(e.value->>'caras','') !~ '^[0-9]+$' or (e.value->>'dados')::numeric not between 1 and 100 or (e.value->>'caras')::numeric not between 2 and 1000) then raise exception 'Dados de arma inválidos.';end if;
   else raise exception 'Origen del equipo inválido.';end if;
  end loop;
 end loop;
 return new;
end;$$;
revoke all on function public.forja_validar_variantes_monstruo() from public,anon,authenticated;
create trigger a_monstruos_variantes before insert or update of configuracion_monstruo,tipo,tipo_creacion on public.forja_maestra for each row execute function public.forja_validar_variantes_monstruo();
