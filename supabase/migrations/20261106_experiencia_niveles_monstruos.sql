-- Progresión universal de Yugen. Nivel (cantidad) != clase/rango (calidad).
alter table public.personajes
  add column if not exists nivel integer not null default 1,
  add column if not exists exp_total bigint not null default 0,
  add column if not exists elecciones_pendientes integer not null default 0,
  add column if not exists nivel_eleccion integer not null default 2,
  add column if not exists habilidades_elegidas jsonb not null default '[]'::jsonb;
alter table public.forja_maestra
  add column if not exists nivel integer not null default 1,
  add column if not exists exp_total bigint not null default 0,
  add column if not exists nivel_maximo integer not null default 20;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='personajes_nivel_valido_yugen') then
    alter table public.personajes add constraint personajes_nivel_valido_yugen check (nivel between 1 and 100 and exp_total>=0 and elecciones_pendientes>=0 and nivel_eleccion between 2 and 101 and jsonb_typeof(habilidades_elegidas)='array');
  end if;
  if not exists (select 1 from pg_constraint where conname='forja_nivel_valido_yugen') then
    alter table public.forja_maestra add constraint forja_nivel_valido_yugen check (nivel between 1 and 100 and nivel_maximo between 1 and 100 and exp_total>=0);
  end if;
end $$;
insert into public.categorias_forja (clave,nombre,descripcion,icono)
select 'monstruos','Monstruos','Criaturas que siempre se crean como mallas; cada aparición escala por nivel.','skull'
where not exists(select 1 from public.categorias_forja where clave='monstruos');
insert into public.categorias_forja(clave,nombre,descripcion,parent_id,icono)
select 'monstruos_generales','Generales','Especies y enemigos configurados mediante rangos de estadísticas.',c.id,'skull'
from public.categorias_forja c where c.clave='monstruos'
and not exists(select 1 from public.categorias_forja where clave='monstruos_generales');
-- Respeta las creaciones previas; las nuevas criaturas son mallas desde la interfaz.
create or replace function public.progresion_dar_experiencia(p_personaje bigint, p_cantidad integer)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare p public.personajes%rowtype; n integer; anterior integer; total bigint; attrs jsonb;
  foco text; secundario text; v numeric; mejor numeric; key text;
  atributos_clase text[]:=array['fisico','magico','resistencia','inteligencia','agilidad'];
begin
  if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then
    raise exception 'Solo Kuroi puede conceder experiencia.' using errcode='42501';
  end if;
  if p_cantidad is null or p_cantidad < 1 or p_cantidad > 1000000 then
    raise exception 'Concede entre 1 y 1000000 de experiencia.';
  end if;
  select * into p from public.personajes where id=p_personaje for update;
  if not found then raise exception 'Personaje no encontrado.';end if;
  total:=p.exp_total+p_cantidad; n:=p.nivel; anterior:=n;attrs:=coalesce(p.atributos,'{}'::jsonb);
  if jsonb_typeof(attrs)<>'object' then attrs:='{}'::jsonb; end if;
  while n<100 and total>=50*n*(n+1) loop
    n:=n+1;foco:=atributos_clase[1];mejor:=-999999999;
    foreach key in array atributos_clase loop
      v:=case when jsonb_typeof(attrs->key)='number' then (attrs->>key)::numeric else 0 end;
      if v>mejor then mejor:=v;foco:=key;end if;
    end loop;
    secundario:=atributos_clase[((n-1)%5)+1];
    attrs:=jsonb_set(attrs,array[foco],to_jsonb(coalesce((attrs->>foco)::numeric,0)+1),true);
    if secundario<>foco then
      attrs:=jsonb_set(attrs,array[secundario],to_jsonb(coalesce((attrs->>secundario)::numeric,0)+1),true);
    end if;
    attrs:=jsonb_set(attrs,'{vida}',to_jsonb(coalesce((attrs->>'vida')::numeric,10+coalesce((attrs->>'resistencia')::numeric,0))+2),true);
    if attrs ? 'ph' then attrs:=jsonb_set(attrs,'{ph}',to_jsonb(coalesce((attrs->>'ph')::numeric,0)+1),true);end if;
  end loop;
  update public.personajes set nivel=n,exp_total=total,atributos=attrs,
     elecciones_pendientes=elecciones_pendientes+(n-anterior)*3
   where id=p.id;
  return jsonb_build_object('nivel',n,'nivel_anterior',anterior,'exp_total',total,
      'exp_siguiente',case when n>=100 then null else 50*n*(n+1) end,
      'elecciones_anadidas',(n-anterior)*3);
end $$;

create or replace function public.progresion_opciones(p_personaje bigint)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare p public.personajes%rowtype; resultado jsonb;
begin
 select * into p from public.personajes where id=p_personaje;
 if not found then raise exception 'Personaje no encontrado.'; end if;
 if auth.uid() is null or (p.user_id is distinct from auth.uid() and
      not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI')) then
   raise exception 'No tienes acceso a este personaje.' using errcode='42501';
 end if;
 if p.elecciones_pendientes=0 then return '[]'::jsonb;end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'nombre',s.nombre,'descripcion',s.descripcion,'clase',s.clase,'requisitos',s.requisitos_uso) order by s.orden),'[]'::jsonb)
 into resultado from (
   select f.id,f.nombre,f.descripcion,f.clase,f.requisitos_uso,
   md5(p.id::text||':'||p.nivel_eleccion::text||':'||f.id::text) orden
   from public.forja_maestra f
   where f.estado='aprobado' and f.tipo_creacion='habilidad'
     and (f.requisitos_uso->>'nivel_minimo' is null
        or (f.requisitos_uso->>'nivel_minimo') ~ '^[0-9]{1,3}$'
           and (f.requisitos_uso->>'nivel_minimo')::integer<=p.nivel_eleccion)
     and public.forja_cumple_requisitos(f.requisitos_uso,p.raza,p.atributos)
     and not exists(select 1 from public.inventario_jugador i where i.personaje_id=p.id and i.forja_id=f.id)
   order by orden limit 20
 ) s;
 return resultado;
end $$;

create or replace function public.progresion_escoger_habilidad(p_personaje bigint,p_habilidad uuid)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare p public.personajes%rowtype; f public.forja_maestra%rowtype; opciones jsonb; restantes integer; nivel_siguiente integer;
begin
 select * into p from public.personajes where id=p_personaje for update;
 if not found then raise exception 'Personaje no encontrado.';end if;
 if auth.uid() is null or (p.user_id is distinct from auth.uid() and
      not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI')) then
   raise exception 'No tienes acceso a este personaje.' using errcode='42501';
 end if;
 if p.elecciones_pendientes<=0 then raise exception 'Este personaje no tiene elecciones pendientes.';end if;
 opciones:=public.progresion_opciones(p_personaje);
 if not exists(select 1 from jsonb_array_elements(opciones) o where o->>'id'=p_habilidad::text) then
   raise exception 'La habilidad no forma parte de las veinte opciones válidas de este nivel.';
 end if;
 select * into f from public.forja_maestra where id=p_habilidad and tipo_creacion='habilidad' and estado='aprobado';
 if not found then raise exception 'Habilidad no disponible.';end if;
 insert into public.inventario_jugador
 (user_id,forja_id,personaje_id,nombre,tipo,descripcion,imagen_url,clase,stats,ligado_al_alma,es_activo,slot_tipo,motivo_entrega,configuracion)
 values (p.user_id,f.id,p.id,f.nombre,'habilidad',f.descripcion,f.imagen_url,f.clase,
    public.forja_stats_componente(f.id),true,true,'ninguno','Experiencia · nivel '||p.nivel_eleccion,
    jsonb_build_object('tipo_creacion','habilidad','efectos',coalesce(f.configuracion_dados,'[]'::jsonb),
    'reglas',coalesce(f.reglas,'[]'::jsonb),'reglas_pasivas',coalesce(f.reglas_pasivas,'[]'::jsonb),
    'requisitos_uso',coalesce(f.requisitos_uso,'{}'::jsonb)));
 restantes:=p.elecciones_pendientes-1;
 nivel_siguiente:=p.nivel_eleccion+case when restantes>0 and restantes%3=0 then 1 else 0 end;
 update public.personajes set elecciones_pendientes=restantes,nivel_eleccion=nivel_siguiente,
    habilidades_elegidas=coalesce(habilidades_elegidas,'[]'::jsonb)||
       jsonb_build_array(jsonb_build_object('id',f.id,'nombre',f.nombre,'nivel',p.nivel_eleccion))
 where id=p.id;
 return jsonb_build_object('habilidad',f.nombre,'pendientes',restantes,'nivel_eleccion',nivel_siguiente);
end $$;
revoke all on function public.progresion_dar_experiencia(bigint,integer) from public,anon;
revoke all on function public.progresion_opciones(bigint) from public,anon;
revoke all on function public.progresion_escoger_habilidad(bigint,uuid) from public,anon;
grant execute on function public.progresion_dar_experiencia(bigint,integer) to authenticated;
grant execute on function public.progresion_opciones(bigint) to authenticated;
grant execute on function public.progresion_escoger_habilidad(bigint,uuid) to authenticated;

-- Plantillas y monstruos también acumulan experiencia. El jugador decide el nivel en el encuentro.
create or replace function public.progresion_dar_experiencia_creacion(p_forja uuid,p_cantidad integer)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare f public.forja_maestra%rowtype; n integer; total bigint;
begin
 if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then
   raise exception 'Solo Kuroi puede conceder experiencia.' using errcode='42501';
 end if;
 if p_cantidad is null or p_cantidad<1 or p_cantidad>1000000 then
   raise exception 'Concede entre 1 y 1000000 de experiencia.';
 end if;
 select * into f from public.forja_maestra where id=p_forja and tipo_creacion='personaje' and estado='aprobado' for update;
 if not found then raise exception 'Ser de La Creación no encontrado.'; end if;
 n:=f.nivel;total:=f.exp_total+p_cantidad;
 while n<least(f.nivel_maximo,100) and total>=50*n*(n+1) loop n:=n+1;end loop;
 update public.forja_maestra set exp_total=total,nivel=n where id=f.id;
 return jsonb_build_object('nivel',n,'exp_total',total,'elecciones_anadidas',0);
end $$;
revoke all on function public.progresion_dar_experiencia_creacion(uuid,integer) from public,anon;
grant execute on function public.progresion_dar_experiencia_creacion(uuid,integer) to authenticated;
