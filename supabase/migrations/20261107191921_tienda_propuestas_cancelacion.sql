begin;
alter table public.tienda_ofertas add column propuesta text
 check (propuesta is null or length(propuesta) <= 2000);

-- Clear private text before a rejected/cancelled offer is visible again,
-- including operations made by clients still using v2.
create function private.tienda_limpiar_propuesta()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.estado in ('disponible','retirada') then new.propuesta := null; end if;
 return new;
end;$$;
revoke all on function private.tienda_limpiar_propuesta() from public,anon,authenticated;
create trigger tienda_limpiar_propuesta before insert or update on public.tienda_ofertas
 for each row execute function private.tienda_limpiar_propuesta();

-- Privileged implementation stays in the private schema. All changes are
-- serialized against acceptance/payment by locking the same offer row.
create function private.tienda_operar_v3(
 p_accion text,p_id uuid,p_forja uuid,p_descripcion text,p_tienda text,
 p_modo text,p_moneda uuid,p_precio bigint,p_propuesta text)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 usuario uuid:=auth.uid();
 oferta public.tienda_ofertas%rowtype;
 resultado uuid;
begin
 if usuario is null then raise exception 'Inicia sesión.' using errcode='42501'; end if;
 if p_accion not in ('negociar','proponer','cancelar') or p_accion is null then
  return private.tienda_operar_v2(p_accion,p_id,p_forja,p_descripcion,p_tienda,p_modo,p_moneda,p_precio);
 end if;
 if not exists(select 1 from public.perfiles where id=usuario and rol='REENCARNADO' and estado='aprobado') then
  raise exception 'Tu cuenta no tiene acceso a esta operación.' using errcode='42501';
 end if;
 if p_tienda is null or p_tienda not in ('general','almas') then raise exception 'Tienda inválida.'; end if;
 if p_tienda='almas' and not exists(select 1 from public.perfiles where id=usuario and mente_colmena) then
  raise exception 'Tienda no disponible.' using errcode='42501';
 end if;
 if length(coalesce(p_propuesta,''))>2000 then raise exception 'La propuesta admite hasta 2000 caracteres.'; end if;
 select * into oferta from public.tienda_ofertas where id=p_id and tienda=p_tienda for update;
 if not found then raise exception 'La oferta ya no está disponible.'; end if;
 if p_accion='negociar' then
  if oferta.estado='negociando' and oferta.negociador_id=usuario then return oferta.id; end if;
  resultado:=private.tienda_operar_v2(p_accion,p_id,p_forja,p_descripcion,p_tienda,p_modo,p_moneda,p_precio);
  update public.tienda_ofertas set propuesta=nullif(trim(p_propuesta),''),updated_at=now() where id=resultado;
  return resultado;
 end if;
 if oferta.negociador_id is distinct from usuario then
  raise exception 'Solo puedes gestionar tu propia negociación.' using errcode='42501';
 end if;
 if oferta.estado<>'negociando' then raise exception 'La negociación ya está resuelta.'; end if;
 if p_accion='cancelar' then
  update public.tienda_ofertas set estado='disponible',negociador_id=null,negociador_nombre=null,propuesta=null,updated_at=now() where id=oferta.id;
 else
  update public.tienda_ofertas set propuesta=nullif(trim(p_propuesta),''),updated_at=now() where id=oferta.id;
 end if;
 return oferta.id;
end;$$;
revoke all on function private.tienda_operar_v3(text,uuid,uuid,text,text,text,uuid,bigint,text) from public,anon;
grant execute on function private.tienda_operar_v3(text,uuid,uuid,text,text,text,uuid,bigint,text) to authenticated;

create function public.tienda_operar_v3(
 p_accion text,p_id uuid default null,p_forja uuid default null,p_descripcion text default null,
 p_tienda text default 'general',p_modo text default 'presencial',p_moneda uuid default null,
 p_precio bigint default null,p_propuesta text default null)
returns uuid language sql security invoker set search_path='' as $$
 select private.tienda_operar_v3(p_accion,p_id,p_forja,p_descripcion,p_tienda,p_modo,p_moneda,p_precio,p_propuesta);
$$;
revoke all on function public.tienda_operar_v3(text,uuid,uuid,text,text,text,uuid,bigint,text) from public,anon;
grant execute on function public.tienda_operar_v3(text,uuid,uuid,text,text,text,uuid,bigint,text) to authenticated;
notify pgrst,'reload schema';
commit;
