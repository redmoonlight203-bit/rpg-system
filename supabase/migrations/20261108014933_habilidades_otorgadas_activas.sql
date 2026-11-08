begin;
-- Snapshot first, then infer whether this learned power can be used by its recipient.
create function private.habilidad_preparar_entrega() returns trigger
language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;t text;
begin
 t:=coalesce(new.configuracion->>'tipo_creacion',public.forja_tipo_inferido(new.tipo));
 if t not in ('habilidad','pasiva') or new.personaje_id is null then return new;end if;
 if tg_op='UPDATE' and new.personaje_id is not distinct from old.personaje_id then return new;end if;
 select * into p from public.personajes where id=new.personaje_id;
 if p.estado_vida='vivo' and p.estado_aprobacion='aprobado' then
  new.es_activo:=public.forja_cumple_requisitos(new.configuracion->'requisitos_uso',p.raza,coalesce(p.atributos,'{}')||jsonb_build_object('nivel',p.nivel));
 end if;
 return new;
end;$$;
create trigger zy_habilidad_preparar_entrega before insert or update of personaje_id on public.inventario_jugador for each row execute function private.habilidad_preparar_entrega();

create function private.habilidades_sincronizar(p_personaje bigint) returns void
language plpgsql security definer set search_path='' as $$
declare b public.combates_yugen%rowtype;preparado jsonb;miembros jsonb;m jsonb;config jsonb;
begin
 for b in select * from public.combates_yugen c where c.datos->>'fase' in ('preparacion','en_curso') and exists(select 1 from jsonb_array_elements(c.datos->'miembros') x where x->>'personaje_id'=p_personaje::text) order by c.id for update loop
  preparado:=yugen_interno.preparar_jugador(p_personaje);miembros:='[]';
  for m in select value from jsonb_array_elements(b.datos->'miembros') loop
   if m->>'personaje_id'=p_personaje::text then
    config:=m->'configuracion';
    -- Equipment and vitals remain those of the encounter. Only learned powers change.
    config:=config||jsonb_build_object('habilidades',preparado->'configuracion'->'habilidades','pasivas',preparado->'configuracion'->'pasivas');
    m:=jsonb_set(m,'{configuracion}',config);
    if jsonb_typeof(m->'motor')='object' then
     m:=jsonb_set(m,'{motor,modificadores}',coalesce((select jsonb_agg(x) from jsonb_array_elements(coalesce(m->'motor'->'modificadores','[]')) x where (coalesce(x->>'origen','') not like 'hab:%' and coalesce(x->>'origen','') not like 'pasiva:%') or exists(select 1 from jsonb_array_elements(config->'habilidades') h where 'hab:'||(h->>'id')=x->>'origen') or exists(select 1 from jsonb_array_elements(config->'pasivas') h where 'pasiva:'||(h->>'id')=x->>'origen')),'[]'));
     m:=jsonb_set(m,'{motor,habilidades}',coalesce((select jsonb_agg(x) from jsonb_array_elements(coalesce(m->'motor'->'habilidades','[]')) x where (coalesce(x->>'origen','') not like 'hab:%' and coalesce(x->>'origen','') not like 'pasiva:%') or exists(select 1 from jsonb_array_elements(config->'habilidades') h where 'hab:'||(h->>'id')=x->>'origen') or exists(select 1 from jsonb_array_elements(config->'pasivas') h where 'pasiva:'||(h->>'id')=x->>'origen')),'[]'));
    end if;
   end if;
   miembros:=miembros||jsonb_build_array(m);
  end loop;
  if miembros is distinct from b.datos->'miembros' then update public.combates_yugen set datos=jsonb_set(b.datos,'{miembros}',miembros),version=version+1,updated_at=now() where id=b.id;end if;
 end loop;
end;$$;
create function private.habilidad_sincronizar_entrega() returns trigger
language plpgsql security definer set search_path='' as $$
declare t text;pj bigint;
begin
 t:=coalesce(new.configuracion->>'tipo_creacion',public.forja_tipo_inferido(new.tipo));
 if t in ('habilidad','pasiva') and new.personaje_id is not null then perform private.habilidades_sincronizar(new.personaje_id);end if;
 if tg_op='UPDATE' and old.personaje_id is not null and old.personaje_id is distinct from new.personaje_id then perform private.habilidades_sincronizar(old.personaje_id);end if;
 return new;
end;$$;
create trigger habilidad_sincronizar_entrega after insert or update of es_activo,personaje_id on public.inventario_jugador for each row execute function private.habilidad_sincronizar_entrega();

create function private.habilidad_activar(p_item uuid,p_activa boolean) returns void
language plpgsql security definer set search_path='' as $$
declare i public.inventario_jugador%rowtype;p public.personajes%rowtype;gm boolean;b public.combates_yugen%rowtype;m jsonb;indice integer;
begin
 if auth.uid() is null or p_activa is null then raise exception 'Inicia sesión.' using errcode='42501';end if;
 gm:=private.tienda_es_gm();
 select * into i from public.inventario_jugador where id=p_item;
 if not found or (i.user_id<>auth.uid() and not gm) then raise exception 'Habilidad no disponible.' using errcode='42501';end if;
 if coalesce(i.configuracion->>'tipo_creacion',public.forja_tipo_inferido(i.tipo)) not in ('habilidad','pasiva') or i.personaje_id is null then raise exception 'Asigna este poder a un personaje primero.';end if;
 select * into p from public.personajes where id=i.personaje_id;
 if p.estado_vida<>'vivo' or p.estado_aprobacion<>'aprobado' then raise exception 'El personaje no está disponible.';end if;
 if i.es_activo is not distinct from p_activa then return;end if;
 select * into b from public.combates_yugen c where c.datos->>'fase'='en_curso' and exists(select 1 from jsonb_array_elements(c.datos->'miembros') x where x->>'personaje_id'=p.id::text) for update;
 if found and not gm then
  select value,ordinality::int-1 into m,indice from jsonb_array_elements(b.datos->'miembros') with ordinality where value->>'personaje_id'=p.id::text;
  if b.datos->>'actual'<>m->>'id' or coalesce((m->>'accion_usada')::boolean,false) or (m->>'vida')::numeric<=0 then raise exception 'En combate necesitas tu turno y una acción disponible para cambiar tus poderes.';end if;
  if m->'transformacion' is not null and m->'transformacion'<>'null'::jsonb and exists(select 1 from jsonb_array_elements(coalesce(i.configuracion->'efectos','[]')) e where e->'transformacion'->>'id'=m->'transformacion'->>'definicion_id') then raise exception 'Vuelve a tu forma original antes de desactivar esta transformación.';end if;
 end if;
 update public.inventario_jugador set es_activo=p_activa where id=i.id;
 if b.id is not null and not gm then update public.combates_yugen set datos=jsonb_set(datos,array['miembros',indice::text,'accion_usada'],'true'::jsonb),version=version+1,updated_at=now() where id=b.id;end if;
end;$$;
create function public.habilidad_activar(p_item uuid,p_activa boolean) returns void language sql security invoker set search_path='' as $$select private.habilidad_activar(p_item,p_activa)$$;
revoke all on function private.habilidad_preparar_entrega(),private.habilidades_sincronizar(bigint),private.habilidad_sincronizar_entrega(),private.habilidad_activar(uuid,boolean),public.habilidad_activar(uuid,boolean) from public,anon,authenticated;
grant execute on function private.habilidad_activar(uuid,boolean),public.habilidad_activar(uuid,boolean) to authenticated;
-- Repair only inactive powers delivered through the old copy operation.
update public.inventario_jugador i set es_activo=true from public.personajes p where i.personaje_id=p.id and i.operacion_id is not null and not i.es_activo and coalesce(i.configuracion->>'tipo_creacion',public.forja_tipo_inferido(i.tipo)) in ('habilidad','pasiva') and p.estado_vida='vivo' and p.estado_aprobacion='aprobado' and public.forja_cumple_requisitos(i.configuracion->'requisitos_uso',p.raza,coalesce(p.atributos,'{}')||jsonb_build_object('nivel',p.nivel));
commit;
