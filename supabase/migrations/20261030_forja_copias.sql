begin;
-- Una creación es una plantilla; cada entrega o aparición conserva su copia.
create table if not exists public.forja_operaciones (
  id uuid primary key,
  creador_id uuid not null,
  parametros jsonb not null,
  resultado jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.forja_instancias (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references public.forja_operaciones(id),
  forja_id uuid references public.forja_maestra(id) on delete set null,
  nombre text not null,
  tipo text not null,
  stats jsonb not null,
  recursos jsonb not null default '{}'::jsonb,
  estado text not null default 'pendiente' check (estado in ('pendiente','en_batalla','finalizado')),
  creador_id uuid not null,
  created_at timestamptz not null default now()
);
alter table public.inventario_jugador add column if not exists operacion_id uuid references public.forja_operaciones(id);
alter table public.inventario_jugador add column if not exists motivo_entrega text;
create index if not exists forja_instancias_operacion_idx on public.forja_instancias(operacion_id);
create index if not exists inventario_operacion_idx on public.inventario_jugador(operacion_id);
alter table public.forja_operaciones enable row level security;
alter table public.forja_instancias enable row level security;
drop policy if exists forja_operaciones_kuroi on public.forja_operaciones;
create policy forja_operaciones_kuroi on public.forja_operaciones for select to authenticated
using (exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI'));
drop policy if exists forja_instancias_kuroi_lectura on public.forja_instancias;
create policy forja_instancias_kuroi_lectura on public.forja_instancias for select to authenticated
using (exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI'));
drop policy if exists forja_instancias_kuroi_estado on public.forja_instancias;
create policy forja_instancias_kuroi_estado on public.forja_instancias for update to authenticated
using (exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI'))
with check (exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI'));
revoke all on public.forja_operaciones,public.forja_instancias from anon,authenticated;
grant select on public.forja_operaciones,public.forja_instancias to authenticated;
grant update(estado) on public.forja_instancias to authenticated;

create or replace function public.forja_crear_copias(
  p_forja uuid, p_modo text, p_personaje bigint, p_cantidad integer,
  p_motivo text, p_solicitud uuid, p_negociacion uuid default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  plantilla public.forja_maestra%rowtype; personaje public.personajes%rowtype;
  anterior public.forja_operaciones%rowtype; negociacion public.negociaciones_tienda%rowtype;
  parametros jsonb; valores jsonb; rango record; entrada record;
  minimo numeric; maximo numeric; escala numeric; nuevo_id uuid;
  ids jsonb := '[]'::jsonb; respuesta jsonb; n integer;
begin
  if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then
    raise exception 'Solo Kuroi puede crear copias o entregar creaciones.' using errcode='42501';
  end if;
  if p_solicitud is null or p_cantidad is null or p_cantidad < 1 or p_cantidad > 50
     or p_modo is null or p_modo not in ('inventario','batalla') then
    raise exception 'Selecciona una operación válida y una cantidad entre 1 y 50.';
  end if;
  if length(coalesce(p_motivo,'')) > 500 then raise exception 'El motivo admite hasta 500 caracteres.'; end if;
  parametros := jsonb_build_object('forja',p_forja,'modo',p_modo,'personaje',p_personaje,'cantidad',p_cantidad,'motivo',coalesce(p_motivo,''),'negociacion',p_negociacion);
  perform pg_advisory_xact_lock(hashtextextended(p_solicitud::text,0));
  select * into anterior from public.forja_operaciones where id=p_solicitud;
  if found then
    if anterior.creador_id <> auth.uid() or anterior.parametros <> parametros then raise exception 'Esta solicitud ya se utilizó para otra operación.'; end if;
    return anterior.resultado;
  end if;
  select * into plantilla from public.forja_maestra where id=p_forja for share;
  if not found or plantilla.estado is distinct from 'aprobado' then raise exception 'La creación no está disponible.'; end if;
  if p_modo='inventario' then
    select * into personaje from public.personajes where id=p_personaje for share;
    if not found or personaje.user_id is null or personaje.estado_aprobacion is distinct from 'aprobado' then
      raise exception 'Elige un personaje aprobado que pertenezca a un jugador.';
    end if;
  end if;
  if p_negociacion is not null then
    select * into negociacion from public.negociaciones_tienda where id=p_negociacion for update;
    if not found or p_modo <> 'inventario' or negociacion.estado <> 'pendiente'
       or negociacion.item_id <> p_forja or negociacion.user_id <> personaje.user_id or p_cantidad <> 1 then
      raise exception 'La negociación no corresponde al personaje y a la creación elegidos.';
    end if;
  end if;
  if jsonb_typeof(coalesce(plantilla.stats,'{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(plantilla.stats_rango,'{}'::jsonb)) <> 'object' then raise exception 'Las estadísticas deben ser un objeto de valores numéricos.'; end if;
  for entrada in select * from jsonb_each(coalesce(plantilla.stats,'{}'::jsonb)) loop
    if jsonb_typeof(entrada.value) <> 'number' then raise exception 'El atributo % no es numérico.',entrada.key; end if;
    if entrada.key in ('dados_dano','caras_dano') and ((entrada.value::text)::numeric<1 or trunc((entrada.value::text)::numeric)<>(entrada.value::text)::numeric) then raise exception 'Los dados necesitan cantidades enteras positivas.'; end if;
  end loop;
  if plantilla.es_grupo and coalesce(plantilla.stats_rango,'{}'::jsonb) = '{}'::jsonb then raise exception 'Configura al menos un rango para esta malla.'; end if;
  insert into public.forja_operaciones(id,creador_id,parametros) values(p_solicitud,auth.uid(),parametros);
  for n in 1..p_cantidad loop
    valores := coalesce(plantilla.stats,'{}'::jsonb);
    if plantilla.es_grupo then
      for rango in select * from jsonb_each(coalesce(plantilla.stats_rango,'{}'::jsonb)) loop
        if jsonb_typeof(rango.value->'min') is distinct from 'number' or jsonb_typeof(rango.value->'max') is distinct from 'number' then
          raise exception 'El rango de % necesita mínimo y máximo numéricos.',rango.key;
        end if;
        minimo := (rango.value->>'min')::numeric; maximo := (rango.value->>'max')::numeric;
        if minimo > maximo or abs(minimo)>1000000 or abs(maximo)>1000000
           or round(minimo,2) <> minimo or round(maximo,2) <> maximo then raise exception 'Rango inválido para %: usa hasta dos decimales y mínimo ≤ máximo.',rango.key; end if;
        if rango.key in ('dados_dano','caras_dano') and (trunc(minimo)<>minimo or trunc(maximo)<>maximo or minimo<1) then raise exception 'Los dados necesitan cantidades enteras positivas.'; end if;
        escala := case when trunc(minimo)=minimo and trunc(maximo)=maximo then 1 else 100 end;
        valores := valores || jsonb_build_object(rango.key,(floor(random()*((maximo-minimo)*escala+1))+minimo*escala)/escala);
      end loop;
    end if;
    if p_modo='inventario' then
      insert into public.inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,descripcion,imagen_url,clase,stats,ligado_al_alma,slot_tipo,slot_equipado,es_activo,operacion_id,motivo_entrega)
      values(personaje.user_id,personaje.id,plantilla.id,plantilla.nombre,plantilla.tipo,plantilla.descripcion,plantilla.imagen_url,plantilla.clase,valores,coalesce(plantilla.ligado_al_alma,false),coalesce(plantilla.slot_tipo,'ninguno'),null,false,p_solicitud,coalesce(p_motivo,'')) returning id into nuevo_id;
    else
      insert into public.forja_instancias(operacion_id,forja_id,nombre,tipo,stats,recursos,creador_id)
      values(p_solicitud,plantilla.id,plantilla.nombre,plantilla.tipo,valores,
        jsonb_strip_nulls(jsonb_build_object('vida',coalesce(valores->'vida',valores->'hp'),'ph',valores->'ph','fatiga',0)),auth.uid()) returning id into nuevo_id;
    end if;
    ids := ids || to_jsonb(nuevo_id);
  end loop;
  if p_negociacion is not null then update public.negociaciones_tienda set estado='aprobada' where id=p_negociacion; end if;
  respuesta := jsonb_build_object('cantidad',p_cantidad,'modo',p_modo,'ids',ids,'operacion_id',p_solicitud);
  update public.forja_operaciones set resultado=respuesta where id=p_solicitud;
  return respuesta;
end;
$$;
revoke all on function public.forja_crear_copias(uuid,text,bigint,integer,text,uuid,uuid) from public,anon;
grant execute on function public.forja_crear_copias(uuid,text,bigint,integer,text,uuid,uuid) to authenticated;
commit;
