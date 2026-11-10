-- Reconciliación de cambios ya presentes en RealYugen, observados el 2026-11-10.
-- No ejecuta limpieza ni actualiza encuentros existentes.
create schema if not exists private;
create table if not exists private.combate_imagenes (
 hash text primary key, data text not null, creado_at timestamptz not null default now()
);
alter table private.combate_imagenes enable row level security;
revoke all on private.combate_imagenes from public, anon, authenticated;
CREATE OR REPLACE FUNCTION private.imagenes_extraer(j jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r jsonb;s text;h text;
begin
 if j is null then return null;end if;
 case jsonb_typeof(j)
  when 'string' then
   s:=j#>>'{}';
   if length(s)>2000 and s like 'data:image/%' then
    h:=md5(s);
    insert into private.combate_imagenes(hash,data) values(h,s) on conflict(hash) do nothing;
    return to_jsonb('@img:'||h);
   end if;
   return j;
  when 'object' then
   select coalesce(jsonb_object_agg(e.key,private.imagenes_extraer(e.value)),'{}'::jsonb) into r from jsonb_each(j) e;
   return r;
  when 'array' then
   select coalesce(jsonb_agg(private.imagenes_extraer(a.value) order by a.n),'[]'::jsonb) into r from jsonb_array_elements(j) with ordinality a(value,n);
   return r;
  else
   return j;
 end case;
end;$function$;


CREATE OR REPLACE FUNCTION private.imagenes_restaurar(j jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r jsonb;s text;d text;
begin
 if j is null then return null;end if;
 case jsonb_typeof(j)
  when 'string' then
   s:=j#>>'{}';
   if s like '@img:%' then
    select i.data into d from private.combate_imagenes i where i.hash=substr(s,6);
    if found then return to_jsonb(d);end if;
    return 'null'::jsonb;
   end if;
   return j;
  when 'object' then
   select coalesce(jsonb_object_agg(e.key,private.imagenes_restaurar(e.value)),'{}'::jsonb) into r from jsonb_each(j) e;
   return r;
  when 'array' then
   select coalesce(jsonb_agg(private.imagenes_restaurar(a.value) order by a.n),'[]'::jsonb) into r from jsonb_array_elements(j) with ordinality a(value,n);
   return r;
  else
   return j;
 end case;
end;$function$;


CREATE OR REPLACE FUNCTION public.combate_guardar_ligero(p_id uuid, p_nombre text, p_cambios jsonb, p_version integer, p_deshacer boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET lock_timeout TO '1500ms'
AS $function$
declare b public.combates_yugen%rowtype;datos jsonb;historial jsonb;respuesta jsonb;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede dirigir combates.' using errcode='42501';end if;
 if p_id is null or p_version is null or p_version<0 then raise exception 'Revisión inválida.';end if;
 if not pg_try_advisory_xact_lock(hashtextextended(p_id::text,0)) then raise exception 'Otra acción está confirmándose. Actualiza antes de volver a actuar.' using errcode='55P03';end if;
 select * into b from public.combates_yugen where id=p_id for update;
 if found then
  if b.creador_id<>auth.uid() then raise exception 'Este combate pertenece a otro director.' using errcode='42501';end if;
  if b.version<>p_version then raise exception 'El combate cambió en otra sesión. Recárgalo antes de continuar.';end if;
 elsif p_version<>0 then raise exception 'El combate ya no está disponible.';end if;
 historial:=coalesce(b.datos->'historial','[]');
 if p_deshacer then
  if coalesce((b.datos->>'progreso_confirmado')::boolean,false) then raise exception 'El progreso ya fue aplicado a las fichas.';end if;
  if jsonb_array_length(historial)=0 then raise exception 'No hay una acción anterior.';end if;
  datos:=private.imagenes_restaurar(historial->-1);historial:=historial-(jsonb_array_length(historial)-1);
  datos:=datos||jsonb_build_object('evento_visual',jsonb_build_object('id',gen_random_uuid(),'nombre','Deshacer','dados','[]'::jsonb,'creado_en',floor(extract(epoch from clock_timestamp())*1000)));
 else
  datos:=private.combate_aplicar_cambios(b.datos,p_cambios);
  if b.id is not null then
   select coalesce(jsonb_agg(v order by n),'[]') into historial from (
    select v,n from jsonb_array_elements(historial||jsonb_build_array(private.imagenes_extraer(b.datos-'historial'-'pasos_deshacer'))) with ordinality a(v,n) order by n desc limit 10
   ) ultimos;
  end if;
 end if;
 respuesta:=public.combate_guardar(p_id,p_nombre,datos||jsonb_build_object('historial',historial),p_version);
 return respuesta||jsonb_build_object('pasos_deshacer',jsonb_array_length(historial))||case when p_deshacer then jsonb_build_object('datos',datos-'historial') else '{}'::jsonb end;
end;$function$;


CREATE OR REPLACE FUNCTION yugen_interno.confirmar_jugador_rapido(p_usuario uuid, p_combate uuid, p_actor text, p_version integer, p_datos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET lock_timeout TO '1500ms'
AS $function$
declare anterior jsonb; historial jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_combate::text,0));
 select datos into anterior from public.combates_yugen where id=p_combate for update;
 select coalesce(jsonb_agg(valor order by n),'[]'::jsonb) into historial from (
  select valor,n from jsonb_array_elements(coalesce(anterior->'historial','[]'::jsonb)||jsonb_build_array(private.imagenes_extraer(anterior-'historial'))) with ordinality a(valor,n) order by n desc limit 10
 ) ultimos;
 perform yugen_interno.confirmar_jugador(p_usuario,p_combate,p_actor,p_version,(p_datos-'historial')||jsonb_build_object('historial',historial));
 return yugen_interno.consultar_jugador_rapido(p_usuario,p_combate,p_actor,null);
end;$function$;

revoke all on function private.imagenes_extraer(jsonb), private.imagenes_restaurar(jsonb) from public, anon, authenticated;
