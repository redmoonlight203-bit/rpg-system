begin;
-- An inventory assignment is a loan; ownership always remains with user_id.
create function private.alma_proteger_propiedad() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  if old.ligado_al_alma and not private.tienda_es_gm() then raise exception 'Solo Kuroi puede eliminar una pertenencia ligada al alma.' using errcode='42501';end if;
  return old;
 end if;
 if tg_op='INSERT' then
  if new.ligado_al_alma and current_setting('yugen.restaurar_consumo',true) is distinct from new.id::text then new.personaje_id:=null;new.slot_equipado:=null;end if;
 else
  if old.ligado_al_alma and (new.user_id is distinct from old.user_id or not coalesce(new.ligado_al_alma,false)) and not private.tienda_es_gm() then raise exception 'La propiedad del alma solo puede modificarla Kuroi.' using errcode='42501';end if;
 end if;
 if new.ligado_al_alma and new.personaje_id is not null and not exists(select 1 from public.personajes p where p.id=new.personaje_id and p.user_id=new.user_id and p.estado_vida='vivo' and p.estado_aprobacion='aprobado') then raise exception 'Solo puedes prestar pertenencias a un personaje vivo de la misma cuenta.';end if;
 return new;
end;$$;
revoke all on function private.alma_proteger_propiedad() from public,anon,authenticated;
create trigger aaa_alma_propiedad before insert or update or delete on public.inventario_jugador for each row execute function private.alma_proteger_propiedad();

create function private.alma_eliminar(p_item uuid) returns void language plpgsql security definer set search_path='' as $$
declare i public.inventario_jugador%rowtype;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede eliminar pertenencias del alma.' using errcode='42501';end if;
 select * into i from public.inventario_jugador where id=p_item and ligado_al_alma for update;
 if not found then raise exception 'La pertenencia ya no está disponible.';end if;
 if exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=i.personaje_id::text) then raise exception 'Retira la pertenencia del encuentro antes de eliminarla.';end if;
 delete from public.inventario_jugador where id=i.id;
end;$$;
revoke all on function private.alma_eliminar(uuid) from public,anon;
grant execute on function private.alma_eliminar(uuid) to authenticated;
create function public.alma_eliminar(p_item uuid) returns void language sql security invoker set search_path='' as $$select private.alma_eliminar(p_item)$$;
revoke all on function public.alma_eliminar(uuid) from public,anon;
grant execute on function public.alma_eliminar(uuid) to authenticated;

create function private.alma_entregar(p_usuario uuid,p_forja uuid,p_cantidad integer,p_solicitud uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.forja_maestra%rowtype;op public.forja_operaciones%rowtype;params jsonb;ids jsonb:='[]';nuevo uuid;s jsonb;par record;minimo numeric;maximo numeric;escala numeric;n integer;respuesta_alma jsonb;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo Kuroi puede entregar al alma.' using errcode='42501';end if;
 if p_solicitud is null or p_cantidad is null or p_cantidad not between 1 and 50 then raise exception 'Selecciona entre 1 y 50 copias.';end if;
 if not exists(select 1 from public.perfiles where id=p_usuario and rol='REENCARNADO' and estado='aprobado') then raise exception 'Selecciona una cuenta de jugador aprobada.';end if;
 params:=jsonb_build_object('modo','alma','usuario',p_usuario,'forja',p_forja,'cantidad',p_cantidad);
 perform pg_advisory_xact_lock(hashtextextended(p_solicitud::text,0));
 select * into op from public.forja_operaciones where id=p_solicitud;
 if found then
  if op.creador_id is distinct from auth.uid() or op.parametros is distinct from params then raise exception 'La solicitud corresponde a otra entrega.';end if;
  return op.resultado;
 end if;
 select * into f from public.forja_maestra where id=p_forja and estado='aprobado' and ligado_al_alma for share;
 if not found then raise exception 'Elige una creación aprobada y ligada al alma.';end if;
 insert into public.forja_operaciones(id,creador_id,parametros) values(p_solicitud,auth.uid(),params);
 for n in 1..p_cantidad loop
  s:=public.forja_stats_componente(f.id);
  if f.es_grupo then
   for par in select * from jsonb_each(coalesce(f.stats_rango,'{}')) loop
    minimo:=(par.value->>'min')::numeric;maximo:=(par.value->>'max')::numeric;
    if minimo is null or maximo is null or minimo>maximo or abs(minimo)>1000000 or abs(maximo)>1000000 then raise exception 'Rango inválido para %.',par.key;end if;
    escala:=case when trunc(minimo)=minimo and trunc(maximo)=maximo then 1 else 100 end;
    s:=s||jsonb_build_object(par.key,(floor(random()*((maximo-minimo)*escala+1))+minimo*escala)/escala);
   end loop;
  end if;
  insert into public.inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,descripcion,imagen_url,clase,stats,ligado_al_alma,slot_tipo,es_activo,operacion_id,motivo_entrega)
  values(p_usuario,null,f.id,f.nombre,f.tipo,f.descripcion,f.imagen_url,f.clase,s,true,f.slot_tipo,true,p_solicitud,'Entrega al baúl del alma') returning id into nuevo;
  ids:=ids||to_jsonb(nuevo);
 end loop;
 respuesta_alma:=jsonb_build_object('cantidad',p_cantidad,'modo','alma','ids',ids,'operacion_id',p_solicitud);
 update public.forja_operaciones set resultado=respuesta_alma where id=p_solicitud;
 return respuesta_alma;
end;$$;
revoke all on function private.alma_entregar(uuid,uuid,integer,uuid) from public,anon;
grant execute on function private.alma_entregar(uuid,uuid,integer,uuid) to authenticated;
create function public.alma_entregar(p_usuario uuid,p_forja uuid,p_cantidad integer,p_solicitud uuid) returns jsonb language sql security invoker set search_path='' as $$select private.alma_entregar(p_usuario,p_forja,p_cantidad,p_solicitud)$$;
revoke all on function public.alma_entregar(uuid,uuid,integer,uuid) from public,anon;
grant execute on function public.alma_entregar(uuid,uuid,integer,uuid) to authenticated;

-- A bound character is an account asset, not an automatically created playable body.
create or replace function private.tienda_entregar_compra() returns trigger language plpgsql security definer set search_path='' as $$
declare f public.forja_maestra%rowtype;pj bigint;componente record;h public.forja_maestra%rowtype;
begin
 if new.estado<>'aceptada' or old.estado='aceptada' then return new;end if;
 select * into f from public.forja_maestra where id=new.forja_id;
 if not found then raise exception 'La plantilla ya no existe. No se ha cobrado la compra.';end if;
 if f.tipo_creacion='personaje' and not coalesce(f.ligado_al_alma,false) then
  insert into public.personajes(user_id,nombre,raza,atributos,historia,estado_aprobacion,estado_vida,compra_oferta_id)
   values(new.negociador_id,f.nombre,'Sin especificar',public.forja_stats_componente(f.id),coalesce(f.historia,f.descripcion,''),'aprobado','vivo',new.id) returning id into pj;
  for componente in select value#>>'{}' as id, null::text as slot from jsonb_array_elements(coalesce(f.habilidades,'[]')) union all select value#>>'{}',null::text from jsonb_array_elements(coalesce(f.pasivas,'[]')) union all select value#>>'{}',key from jsonb_each(coalesce(f.equipamiento,'{}')) loop
   select * into h from public.forja_maestra where id::text=componente.id;
   if found then insert into public.inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,descripcion,clase,stats,ligado_al_alma,slot_tipo,slot_equipado,es_activo,imagen_url) values(new.negociador_id,pj,h.id,h.nombre,h.tipo,h.descripcion,h.clase,public.forja_stats_componente(h.id),h.ligado_al_alma,h.slot_tipo,componente.slot,true,h.imagen_url);end if;
  end loop;
 else
  if not coalesce(f.ligado_al_alma,false) then
   select id into pj from public.personajes where user_id=new.negociador_id and estado_aprobacion='aprobado' and estado_vida='vivo' order by id limit 1;
   if pj is null then raise exception 'Este comprador necesita un personaje vivo para recibir el objeto.';end if;
   if exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=pj::text) then raise exception 'Entrega la compra cuando el personaje salga del combate.';end if;
  end if;
  insert into public.inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,descripcion,imagen_url,clase,stats,ligado_al_alma,slot_tipo,es_activo,compra_oferta_id)
   values(new.negociador_id,pj,f.id,f.nombre,f.tipo,f.descripcion,f.imagen_url,f.clase,public.forja_stats_componente(f.id),f.ligado_al_alma,f.slot_tipo,true,new.id);
 end if;
 return new;
end;$$;
commit;
