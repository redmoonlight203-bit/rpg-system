begin;
create table public.logros_yugen(
 id uuid primary key default gen_random_uuid(),nombre text not null check(length(btrim(nombre)) between 1 and 100),descripcion text not null default '',icono text not null default 'trophy',
 evento text not null check(evento in ('enemigo_derrotado','encuentro_finalizado','nivel_alcanzado','objeto_adjudicado')),objetivo uuid references public.forja_maestra(id) on delete restrict,
 meta integer not null default 1 check(meta between 1 and 1000000),alcance text not null default 'cuenta' check(alcance in ('cuenta','personaje','campana')),campana text not null default 'ambrosia',secreto boolean not null default false,
 titulo text not null check(length(btrim(titulo)) between 1 and 100),color text not null default '#fbbf24' check(color ~ '^#[0-9a-fA-F]{6}$'),activo boolean not null default true
);
create index logros_objetivo_idx on public.logros_yugen(objetivo);
create table public.progreso_logros(
 id uuid primary key default gen_random_uuid(),logro_id uuid not null references public.logros_yugen(id) on delete restrict,user_id uuid not null references public.perfiles(id),personaje_id bigint,
 ambito text not null,cantidad integer not null default 0 check(cantidad>=0),desbloqueado boolean not null default false,titulo text not null,color text not null,icono text not null,descripcion text not null default '',mostrado boolean not null default false,
 updated_at timestamptz not null default now(),unique(logro_id,user_id,ambito)
);
create index progreso_logros_usuario_idx on public.progreso_logros(user_id);
create table public.logros_auditoria(
 id uuid primary key default gen_random_uuid(),progreso_id uuid not null references public.progreso_logros(id),evento_id uuid references public.eventos_dominio(id),autor uuid references public.perfiles(id),antes jsonb not null,despues jsonb not null,motivo text not null,clave text not null default gen_random_uuid()::text,created_at timestamptz not null default now(),unique(progreso_id,evento_id),unique(progreso_id,clave)
);
create index logros_auditoria_evento_idx on public.logros_auditoria(evento_id);
create index logros_auditoria_autor_idx on public.logros_auditoria(autor);
create index logros_auditoria_progreso_idx on public.logros_auditoria(progreso_id);
do $$declare t text;begin
 foreach t in array array['logros_yugen','progreso_logros','logros_auditoria'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant select on public.%I to authenticated',t);
 execute format('create trigger avisar_actualizacion after insert or update or delete on public.%I for each statement execute function private.avisar_actualizacion()',t);
 end loop;end;$$;
create policy logros_catalogo on public.logros_yugen for select to authenticated using((select private.tienda_es_gm()) or (activo and not secreto));
create policy logros_editar on public.logros_yugen for all to authenticated using((select private.tienda_es_gm())) with check((select private.tienda_es_gm()));
grant insert,update,delete on public.logros_yugen to authenticated;
create policy logros_propios on public.progreso_logros for select to authenticated using((select private.tienda_es_gm()) or (user_id=(select auth.uid()) and (desbloqueado or exists(select 1 from public.logros_yugen l where l.id=logro_id and not secreto))));
create policy logros_auditoria_gm on public.logros_auditoria for select to authenticated using((select private.tienda_es_gm()));
create function private.logros_evento() returns trigger language plpgsql security definer set search_path='' as $$
declare l public.logros_yugen%rowtype;p public.progreso_logros%rowtype;antes jsonb;v_ambito text;v_clave text;incremento int;combate jsonb;
begin
 if new.user_id is null or new.personaje_id is null then return new;end if;
 select datos into combate from public.resultados_encuentro where combate_id=new.combate_id;
 if combate->'politica'->>'modo'='entrenamiento' then return new;end if;
 for l in select * from public.logros_yugen where activo order by id loop
 if l.alcance='campana' and l.campana<>coalesce(combate->'politica'->>'campana','ambrosia') then continue;end if;
 incremento:=0;
 if new.tipo='experiencia_otorgada' then
 if l.evento='encuentro_finalizado' then incremento:=1;
 elsif l.evento='enemigo_derrotado' then
 select count(*) into incremento from jsonb_array_elements(combate->'miembros') m where (m->>'vida')::numeric<=0 and not m ? 'invocacion' and not coalesce((m->>'neutral')::boolean,false) and m->>'bando'<>combate->'cierre'->>'ganador' and (l.objetivo is null or m->>'forja_id'=l.objetivo::text);
 end if;
 elsif new.tipo=l.evento then incremento:=case when new.tipo='nivel_alcanzado' then greatest(1,coalesce((new.datos->>'nivel')::int-(new.datos->>'nivel_anterior')::int,1)) else 1 end;
 end if;
 if incremento=0 then continue;end if;
 v_ambito:=case l.alcance when 'personaje' then 'personaje:'||new.personaje_id when 'campana' then 'campana:'||l.campana else 'cuenta' end;
 insert into public.progreso_logros(logro_id,user_id,personaje_id,ambito,titulo,color,icono,descripcion) values(l.id,new.user_id,new.personaje_id,v_ambito,l.titulo,l.color,l.icono,l.descripcion) on conflict do nothing;
 select * into p from public.progreso_logros where logro_id=l.id and user_id=new.user_id and progreso_logros.ambito=v_ambito for update;
 v_clave:=case when new.tipo='experiencia_otorgada' and l.alcance<>'personaje' then new.combate_id::text||':'||l.evento else new.id::text end;
 if p.desbloqueado or exists(select 1 from public.logros_auditoria where progreso_id=p.id and clave=v_clave) then continue;end if;
 antes:=to_jsonb(p);
 update public.progreso_logros set cantidad=least(l.meta,cantidad+incremento),desbloqueado=cantidad+incremento>=l.meta,updated_at=now() where id=p.id returning * into p;
 insert into public.logros_auditoria(progreso_id,evento_id,antes,despues,motivo,clave) values(p.id,new.id,antes,to_jsonb(p),new.tipo,v_clave);
 end loop;return new;
end;$$;
create trigger logros_evento after insert on public.eventos_dominio for each row execute function private.logros_evento();
create function private.titulo_mostrar(p_progreso uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Inicia sesión.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 if p_progreso is not null and not exists(select 1 from public.progreso_logros where id=p_progreso and user_id=auth.uid() and desbloqueado) then raise exception 'Este título no está desbloqueado.';end if;
 update public.progreso_logros set mostrado=false where user_id=auth.uid() and mostrado;
 update public.progreso_logros set mostrado=true where id=p_progreso and user_id=auth.uid();
end;$$;
create function public.titulo_mostrar(p_progreso uuid default null) returns void language sql security invoker set search_path='' as $$select private.titulo_mostrar(p_progreso)$$;
create function private.logro_ajustar(p_progreso uuid,p_cantidad int,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
declare p public.progreso_logros%rowtype;antes jsonb;meta int;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM puede corregir logros.';end if;
 if p_cantidad is null or p_cantidad not between 0 and 1000000 or length(btrim(coalesce(p_motivo,''))) not between 1 and 500 then raise exception 'Indica progreso y motivo válidos.';end if;
 select * into p from public.progreso_logros where id=p_progreso for update;
 if not found then raise exception 'Progreso no disponible.';end if;antes:=to_jsonb(p);
 select l.meta into meta from public.logros_yugen l where l.id=p.logro_id;
 update public.progreso_logros set cantidad=least(p_cantidad,meta),desbloqueado=p_cantidad>=meta,mostrado=mostrado and p_cantidad>=meta,updated_at=now() where id=p.id returning * into p;
 insert into public.logros_auditoria(progreso_id,autor,antes,despues,motivo) values(p.id,auth.uid(),antes,to_jsonb(p),p_motivo);
end;$$;
create function public.logro_ajustar(p_progreso uuid,p_cantidad int,p_motivo text) returns void language sql security invoker set search_path='' as $$select private.logro_ajustar(p_progreso,p_cantidad,p_motivo)$$;
revoke all on function private.logros_evento() from public,anon,authenticated;
revoke all on function private.logro_ajustar(uuid,int,text),public.logro_ajustar(uuid,int,text),private.titulo_mostrar(uuid),public.titulo_mostrar(uuid) from public,anon;
grant execute on function private.logro_ajustar(uuid,int,text),public.logro_ajustar(uuid,int,text),private.titulo_mostrar(uuid),public.titulo_mostrar(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
