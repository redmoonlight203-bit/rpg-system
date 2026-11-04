begin;
-- Lectura propia y escritura del GM: un jugador no puede inventarse objetos o estadísticas.
drop policy if exists "Permitir todo inventario_jugador" on public.inventario_jugador;
drop policy if exists "Acceso total a personajes" on public.personajes;
drop policy if exists "Permitir todo en personajes" on public.personajes;
alter table public.inventario_jugador enable row level security;
alter table public.personajes enable row level security;
create policy reencarnado_inventario_lectura on public.inventario_jugador for select to authenticated using(user_id=(select auth.uid()) or (select private.tienda_es_gm()));
create policy reencarnado_inventario_gm on public.inventario_jugador for all to authenticated using((select private.tienda_es_gm())) with check((select private.tienda_es_gm()));
create policy reencarnado_personajes_lectura on public.personajes for select to authenticated using(user_id=(select auth.uid()) or (select private.tienda_es_gm()));
create policy reencarnado_personajes_gm on public.personajes for all to authenticated using((select private.tienda_es_gm())) with check((select private.tienda_es_gm()));
create policy reencarnado_personajes_peticion on public.personajes for insert to authenticated with check(user_id=(select auth.uid()) and estado_aprobacion='pendiente' and estado_vida='vivo');

create function private.alma_transferir(p_item uuid,p_destino bigint,p_origen bigint) returns void language plpgsql security definer set search_path='' as $$
declare i public.inventario_jugador%rowtype;pj bigint;
begin
 if not exists(select 1 from public.perfiles where id=auth.uid() and rol='REENCARNADO' and estado='aprobado') then raise exception 'Cuenta no disponible.' using errcode='42501';end if;
 -- Serializa los traspasos de la cuenta y bloquea el objeto antes de comprobar el origen.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into i from public.inventario_jugador where id=p_item and user_id=auth.uid() for update;
 if not found or not coalesce(i.ligado_al_alma,false) then raise exception 'Solo puedes trasladar tus compras asociadas al alma.';end if;
 if i.personaje_id is distinct from p_origen then raise exception 'El objeto ya cambió de inventario. Recarga.';end if;
 if p_destino is not null and i.personaje_id is not null then raise exception 'Devuelve primero el objeto al alma.';end if;
 if i.slot_equipado is not null then raise exception 'Desequipa el objeto antes de devolverlo al alma.';end if;
 if p_destino is not null and not exists(select 1 from public.personajes where id=p_destino and user_id=auth.uid() and estado_aprobacion='aprobado' and estado_vida='vivo') then raise exception 'Selecciona uno de tus personajes vivos y aprobados.';end if;
 for pj in select id from public.personajes where id in (i.personaje_id,p_destino) order by id for update loop
  if exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=pj::text) then raise exception 'No puedes transferir pertenencias de un personaje que está en un encuentro activo.';end if;
 end loop;
 update public.inventario_jugador set personaje_id=p_destino,slot_equipado=null where id=i.id;
end;$$;
revoke all on function private.alma_transferir(uuid,bigint,bigint) from public,anon;
grant execute on function private.alma_transferir(uuid,bigint,bigint) to authenticated;
create function public.alma_transferir(p_item uuid,p_destino bigint,p_origen bigint) returns void language sql security invoker set search_path='' as $$select private.alma_transferir(p_item,p_destino,p_origen)$$;
revoke all on function public.alma_transferir(uuid,bigint,bigint) from public,anon;
grant execute on function public.alma_transferir(uuid,bigint,bigint) to authenticated;

-- Los clientes solo envían intención; los dados y el resultado se calculan en Edge.
create function yugen_interno.contexto_jugador(p_usuario uuid,p_combate uuid default null,p_actor text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.combates_yugen%rowtype;m jsonb;
begin
 if not exists(select 1 from public.perfiles where id=p_usuario and rol='REENCARNADO' and estado='aprobado') then raise exception 'Cuenta no disponible.' using errcode='42501';end if;
 if p_combate is null then
  return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'nombre',c.nombre,'fase',c.datos->>'fase','ronda',c.datos->'ronda','personajes',(select jsonb_agg(jsonb_build_object('id',x->>'id','personaje_id',x->>'personaje_id','nombre',x->>'nombre','es_turno',c.datos->>'actual'=x->>'id')) from jsonb_array_elements(c.datos->'miembros') x where exists(select 1 from public.personajes p where p.id::text=x->>'personaje_id' and p.user_id=p_usuario)))) from public.combates_yugen c where c.datos->>'fase' in ('preparacion','en_curso') and exists(select 1 from jsonb_array_elements(c.datos->'miembros') x join public.personajes p on p.id::text=x->>'personaje_id' where p.user_id=p_usuario)),'[]'::jsonb);
 end if;
 select * into b from public.combates_yugen where id=p_combate and datos->>'fase' in ('preparacion','en_curso');
 if not found then raise exception 'El encuentro terminó o ya no está disponible.';end if;
 select x into m from jsonb_array_elements(b.datos->'miembros') x join public.personajes p on p.id::text=x->>'personaje_id' where x->>'id'=p_actor and p.user_id=p_usuario;
 if m is null then raise exception 'Este participante no te pertenece.' using errcode='42501';end if;
 return jsonb_build_object('id',b.id,'nombre',b.nombre,'version',b.version,'combate',b.datos,'actor',m);
end;$$;
create function public.jugador_contexto_servidor(p_usuario uuid,p_combate uuid default null,p_actor text default null) returns jsonb language sql security invoker set search_path='' as $$select yugen_interno.contexto_jugador(p_usuario,p_combate,p_actor)$$;
revoke all on function public.jugador_contexto_servidor(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.jugador_contexto_servidor(uuid,uuid,text) to service_role;

create function yugen_interno.confirmar_jugador(p_usuario uuid,p_combate uuid,p_actor text,p_version integer,p_datos jsonb) returns void language plpgsql security definer set search_path='' as $$
declare b public.combates_yugen%rowtype;ctx jsonb;m jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_combate::text,0));
 select * into b from public.combates_yugen where id=p_combate for update;
 ctx:=yugen_interno.contexto_jugador(p_usuario,p_combate,p_actor);m:=ctx->'actor';
 if b.version is distinct from p_version then raise exception 'El combate cambió. Recarga antes de actuar.';end if;
 if b.datos->>'fase'<>'en_curso' or b.datos->>'actual'<>p_actor or coalesce((m->>'vida')::numeric,0)<=0 then raise exception 'Solo puedes controlar tu personaje durante su turno.';end if;
 update public.combates_yugen set datos=p_datos,version=version+1,updated_at=now() where id=p_combate;
end;$$;
create function public.jugador_confirmar_servidor(p_usuario uuid,p_combate uuid,p_actor text,p_version integer,p_datos jsonb) returns void language sql security invoker set search_path='' as $$select yugen_interno.confirmar_jugador(p_usuario,p_combate,p_actor,p_version,p_datos)$$;
revoke all on function public.jugador_confirmar_servidor(uuid,uuid,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.jugador_confirmar_servidor(uuid,uuid,text,integer,jsonb) to service_role;
revoke all on function yugen_interno.contexto_jugador(uuid,uuid,text),yugen_interno.confirmar_jugador(uuid,uuid,text,integer,jsonb) from public,anon,authenticated;
grant execute on function yugen_interno.contexto_jugador(uuid,uuid,text),yugen_interno.confirmar_jugador(uuid,uuid,text,integer,jsonb) to service_role;

-- Una oferta aceptada entrega una sola copia y el cobro se revierte si falla la entrega.
alter table public.inventario_jugador add column compra_oferta_id uuid unique references public.tienda_ofertas(id);
alter table public.personajes add column compra_oferta_id uuid unique references public.tienda_ofertas(id);
create function private.tienda_entregar_compra() returns trigger language plpgsql security definer set search_path='' as $$
declare f public.forja_maestra%rowtype;pj bigint;componente record;h public.forja_maestra%rowtype;
begin
 if new.estado<>'aceptada' or old.estado='aceptada' then return new;end if;
 select * into f from public.forja_maestra where id=new.forja_id;
 if not found then raise exception 'La plantilla ya no existe. No se ha cobrado la compra.';end if;
 if f.tipo_creacion='personaje' then
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
revoke all on function private.tienda_entregar_compra() from public,anon,authenticated;
create trigger tienda_entregar_compra after update of estado on public.tienda_ofertas for each row execute function private.tienda_entregar_compra();
commit;
