begin;
alter table public.personajes add column categoria_id uuid references public.categorias_forja(id) on delete set null,
 add column vida_actual numeric, add column vida_maxima_actual numeric, add column ph_actual numeric, add column fatiga_actual numeric not null default 0;
update public.personajes p set categoria_id=c.id from public.categorias_forja c where c.clave=p.raza or lower(c.nombre)=lower(p.raza);
update public.personajes set vida_actual=case when estado_vida='muerto' then 0 else greatest(1,coalesce((atributos->>'vida')::numeric,(atributos->>'hp')::numeric,1)) end,ph_actual=greatest(0,coalesce((atributos->>'ph')::numeric,0));
create table public.cementerio_personajes(
 id uuid primary key default gen_random_uuid(),personaje_id bigint not null unique,user_id uuid not null,nombre text not null,
 fallecido_at timestamptz not null default now(),combate_id uuid,snapshot jsonb not null);
alter table public.cementerio_personajes enable row level security;
grant select on public.cementerio_personajes to authenticated;
create policy cementerio_solo_gm on public.cementerio_personajes for select to authenticated using((select private.tienda_es_gm()));

-- All inherited definitions, nearest definition wins for each key.
create function public.personaje_atributos_raza(p_categoria uuid) returns setof public.config_estadisticas language sql stable security invoker set search_path='' as $$
 with recursive camino as (
 select c.id,c.clave,c.parent_id,0 as profundidad,array[c.id] as vistos from public.categorias_forja c where id=p_categoria
 union all select c.id,c.clave,c.parent_id,x.profundidad+1,x.vistos||c.id from public.categorias_forja c join camino x on x.parent_id=c.id where not c.id=any(x.vistos)
 ) select distinct on (s.clave) s.* from camino x join public.config_estadisticas s on s.categoria=x.clave order by s.clave,x.profundidad;
$$;
revoke all on function public.personaje_atributos_raza(uuid) from public,anon;
grant execute on function public.personaje_atributos_raza(uuid) to authenticated;

create function private.personaje_solicitar(p_categoria uuid,p_nombre text,p_historia text,p_defecto text,p_lugar text,p_atributos jsonb,p_personaje bigint default null) returns bigint language plpgsql security definer set search_path='' as $$
declare u public.perfiles%rowtype;c public.categorias_forja%rowtype;s public.config_estadisticas%rowtype;v numeric;stats jsonb:='{}';pj bigint;
begin
 if auth.uid() is null then raise exception 'Inicia sesión.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into u from public.perfiles where id=auth.uid() and rol='REENCARNADO' and estado='aprobado';
 if not found then raise exception 'Cuenta no disponible.' using errcode='42501';end if;
 if p_personaje is not null then
  perform 1 from public.personajes where id=p_personaje and user_id=u.id and estado_vida='vivo' and estado_aprobacion in ('pendiente','editado','rechazado') for update;
  if not found then raise exception 'Solo puedes revisar tus solicitudes pendientes.' using errcode='42501';end if;
 end if;
 if not coalesce(u.mente_colmena,false) and exists(select 1 from public.personajes where user_id=u.id and estado_vida<>'muerto' and estado_aprobacion<>'rechazado' and (p_personaje is null or id<>p_personaje)) then raise exception 'Ya tienes un cuerpo o una solicitud pendiente.';end if;
 select * into c from public.categorias_forja where id=p_categoria;
 if not found or not 'razas'=any(public.forja_linaje_claves(c.clave)) then raise exception 'Elige un ser vivo de Reglas y estadísticas.';end if;
 if length(btrim(coalesce(p_nombre,''))) not between 1 and 100 or length(coalesce(p_historia,''))>10000 or length(coalesce(p_defecto,''))>2000 then raise exception 'Revisa el nombre y la historia.';end if;
 if p_lugar is null or not(p_lugar='Montaña Shiro (Prueba de vida)' or p_lugar=any(coalesce(u.lugares_conocidos,'{}'))) then raise exception 'Elige un lugar conocido.';end if;
 if jsonb_typeof(p_atributos) is distinct from 'object' then raise exception 'Atributos inválidos.';end if;
 for s in select * from public.personaje_atributos_raza(c.id) loop
  if p_atributos ? s.clave and jsonb_typeof(p_atributos->s.clave)<>'number' then raise exception 'Valor inválido para %.',s.etiqueta;end if;
  v:=coalesce((p_atributos->>s.clave)::numeric,s.valor_defecto,0);
  if v<least(0,coalesce(s.valor_defecto,0)) or (s.limite_jugador is not null and v>greatest(s.limite_jugador,coalesce(s.valor_defecto,0))) then raise exception 'El atributo % excede los límites de la raza.',s.etiqueta;end if;
  stats:=stats||jsonb_build_object(s.clave,v);
 end loop;
 if exists(select 1 from jsonb_object_keys(p_atributos) k where not stats ? k) then raise exception 'Solo puedes proponer atributos definidos para tu raza.';end if;
 if coalesce((stats->>'vida')::numeric,(stats->>'hp')::numeric,0)<=0 then raise exception 'El personaje necesita vida mayor que cero.';end if;
 if p_personaje is null then
 insert into public.personajes(user_id,nombre,raza,categoria_id,atributos,historia,defecto,lugar_reencarnacion,estado_vida,estado_aprobacion)
 values(u.id,btrim(p_nombre),c.clave,c.id,stats,p_historia,p_defecto,p_lugar,'vivo','pendiente') returning id into pj;
 else
 update public.personajes set nombre=btrim(p_nombre),raza=c.clave,categoria_id=c.id,atributos=stats,historia=p_historia,defecto=p_defecto,lugar_reencarnacion=p_lugar,estado_aprobacion='pendiente',vida_actual=coalesce((stats->>'vida')::numeric,(stats->>'hp')::numeric),vida_maxima_actual=null,ph_actual=coalesce((stats->>'ph')::numeric,0),fatiga_actual=0 where id=p_personaje returning id into pj;
 end if;
 return pj;
end;$$;
revoke all on function private.personaje_solicitar(uuid,text,text,text,text,jsonb,bigint) from public,anon;
grant execute on function private.personaje_solicitar(uuid,text,text,text,text,jsonb,bigint) to authenticated;
create function public.personaje_solicitar(p_categoria uuid,p_nombre text,p_historia text,p_defecto text,p_lugar text,p_atributos jsonb,p_personaje bigint default null) returns bigint language sql security invoker set search_path='' as $$select private.personaje_solicitar(p_categoria,p_nombre,p_historia,p_defecto,p_lugar,p_atributos,p_personaje)$$;
revoke all on function public.personaje_solicitar(uuid,text,text,text,text,jsonb,bigint) from public,anon;
grant execute on function public.personaje_solicitar(uuid,text,text,text,text,jsonb,bigint) to authenticated;
drop policy if exists reencarnado_personajes_peticion on public.personajes;
drop policy if exists reencarnado_personajes_lectura on public.personajes;
create policy reencarnado_personajes_lectura on public.personajes for select to authenticated using((user_id=(select auth.uid()) and estado_vida<>'muerto') or (select private.tienda_es_gm()));
drop policy if exists reencarnado_inventario_lectura on public.inventario_jugador;
create policy reencarnado_inventario_lectura on public.inventario_jugador for select to authenticated using((select private.tienda_es_gm()) or (user_id=(select auth.uid()) and (personaje_id is null or exists(select 1 from public.personajes p where p.id=personaje_id and p.estado_vida<>'muerto'))));

create function private.personaje_vitales() returns trigger language plpgsql security definer set search_path='' as $$
declare maximo numeric;
begin
 maximo:=greatest(1,coalesce(new.vida_maxima_actual,(new.atributos->>'vida')::numeric,(new.atributos->>'hp')::numeric,1));
 if tg_op='UPDATE' then
  if old.estado_vida='muerto' then raise exception 'El personaje permanece en el cementerio.';end if;
  if new.atributos is distinct from old.atributos or new.categoria_id is distinct from old.categoria_id or new.estado_aprobacion is distinct from old.estado_aprobacion then
   if exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=new.id::text) then raise exception 'Edita la ficha fuera del encuentro activo.';end if;
  end if;
 end if;
 new.vida_actual:=greatest(0,least(coalesce(new.vida_actual,maximo),maximo));
 new.ph_actual:=greatest(0,least(coalesce(new.ph_actual,(new.atributos->>'ph')::numeric,0),coalesce((new.atributos->>'ph')::numeric,0)));
 new.fatiga_actual:=greatest(0,new.fatiga_actual);
 if new.vida_actual=0 or new.estado_vida='muerto' then new.estado_vida:='muerto';new.vida_actual:=0;end if;
 return new;
end;$$;
revoke all on function private.personaje_vitales() from public,anon,authenticated;
create trigger personaje_vitales before insert or update on public.personajes for each row execute function private.personaje_vitales();

create function private.personaje_archivar() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.estado_vida='muerto' then
  insert into public.cementerio_personajes(personaje_id,user_id,nombre,snapshot) values(new.id,new.user_id,new.nombre,jsonb_build_object('personaje',to_jsonb(new),'inventario',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at,i.id) from public.inventario_jugador i where i.personaje_id=new.id and i.user_id=new.user_id),'[]'::jsonb))) on conflict(personaje_id) do nothing;
  -- Snapshot first, then return soul-bound belongings to the account exactly once.
  update public.inventario_jugador set personaje_id=null,slot_equipado=null where personaje_id=new.id and user_id=new.user_id and ligado_al_alma;
 end if;
 return new;
end;$$;
revoke all on function private.personaje_archivar() from public,anon,authenticated;
create trigger personaje_archivar after insert or update on public.personajes for each row execute function private.personaje_archivar();
-- Preserve existing deceased characters without inventing their historical battle state.
insert into public.cementerio_personajes(personaje_id,user_id,nombre,snapshot)
 select p.id,p.user_id,p.nombre,jsonb_build_object('personaje',to_jsonb(p),'inventario',coalesce((select jsonb_agg(to_jsonb(i)) from public.inventario_jugador i where i.personaje_id=p.id and i.user_id=p.user_id),'[]'::jsonb),'origen','registro previo') from public.personajes p where p.estado_vida='muerto';
update public.inventario_jugador i set personaje_id=null,slot_equipado=null where ligado_al_alma and exists(select 1 from public.personajes p where p.id=i.personaje_id and p.estado_vida='muerto');

create function private.personaje_recuperar(p_personaje bigint,p_tipo text,p_cantidad numeric) returns void language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;
begin
 if not private.tienda_es_gm() then raise exception 'Solo el GM puede recuperar personajes.' using errcode='42501';end if;
 select * into p from public.personajes where id=p_personaje for update;
 if not found or p.estado_vida<>'vivo' or p.estado_aprobacion<>'aprobado' then raise exception 'Selecciona un personaje vivo y aprobado.';end if;
 if exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=p.id::text) then raise exception 'Termina o retira al personaje del encuentro antes de recuperarlo.';end if;
 if p_tipo='descanso' then update public.personajes set vida_actual=greatest(1,coalesce(vida_maxima_actual,(atributos->>'vida')::numeric,(atributos->>'hp')::numeric,1)),ph_actual=greatest(0,coalesce((atributos->>'ph')::numeric,0)),fatiga_actual=0 where id=p.id;
 elsif p_tipo='curar' and p_cantidad>0 and p_cantidad<1000000000 then update public.personajes set vida_actual=vida_actual+p_cantidad where id=p.id;
 else raise exception 'Recuperación inválida.';end if;
end;$$;
revoke all on function private.personaje_recuperar(bigint,text,numeric) from public,anon;
grant execute on function private.personaje_recuperar(bigint,text,numeric) to authenticated;
create function public.personaje_recuperar(p_personaje bigint,p_tipo text,p_cantidad numeric default 0) returns void language sql security invoker set search_path='' as $$select private.personaje_recuperar(p_personaje,p_tipo,p_cantidad)$$;
revoke all on function public.personaje_recuperar(bigint,text,numeric) from public,anon;
grant execute on function public.personaje_recuperar(bigint,text,numeric) to authenticated;

create function private.personaje_preparar(p_personaje bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;r jsonb;maximo numeric;vida numeric;
begin
 if not private.tienda_es_gm() then raise exception 'Solo Kuroi puede preparar jugadores.' using errcode='42501';end if;
 select * into p from public.personajes where id=p_personaje and estado_aprobacion='aprobado' and estado_vida='vivo';
 if not found then raise exception 'Selecciona un personaje aprobado y vivo.';end if;
 r:=yugen_interno.preparar_jugador(p.id);maximo:=greatest(1,coalesce((r->'stats'->>'vida')::numeric,(r->'stats'->>'hp')::numeric,1));
 vida:=greatest(1,maximo-greatest(0,coalesce(p.vida_maxima_actual,(p.atributos->>'vida')::numeric,(p.atributos->>'hp')::numeric,1)-p.vida_actual));
 return r||jsonb_build_object('vida_actual',least(vida,maximo),'ph_actual',p.ph_actual,'fatiga_actual',p.fatiga_actual);
end;$$;

revoke all on function private.personaje_preparar(bigint) from public,anon;
grant execute on function private.personaje_preparar(bigint) to authenticated;
create or replace function public.combate_preparar_jugador(p_personaje bigint) returns jsonb language sql security invoker set search_path='' as $$select private.personaje_preparar(p_personaje)$$;

-- Runs for GM saves and server-confirmed player actions, in the same transaction.
create function private.combate_persistir_vitales() returns trigger language plpgsql security definer set search_path='' as $$
declare m jsonb;p public.personajes%rowtype;v numeric;anterior jsonb;
begin
 if tg_op='UPDATE' then
  if old.datos->>'fase'='finalizado' then
   if new.datos->>'fase'<>'finalizado' then raise exception 'Un encuentro terminado no se puede reabrir. Crea uno nuevo.';end if;
   return new;
  end if;
 end if;
 -- Lock in a deterministic order; a character cannot belong to two active encounters.
 for p in select x.* from public.personajes x where exists(select 1 from jsonb_array_elements(new.datos->'miembros') z where z->>'personaje_id'=x.id::text) order by x.id for update loop
  select z into m from jsonb_array_elements(new.datos->'miembros') z where z->>'personaje_id'=p.id::text limit 1;
  if (select count(*) from jsonb_array_elements(new.datos->'miembros') z where z->>'personaje_id'=p.id::text)>1 then raise exception 'Un personaje no puede aparecer dos veces en el encuentro.';end if;
  if new.datos->>'fase' in ('preparacion','en_curso') and exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') z where b.id<>new.id and b.datos->>'fase' in ('preparacion','en_curso') and z->>'personaje_id'=p.id::text) then raise exception '% ya está en otro encuentro activo.',p.nombre;end if;
  anterior:=null;
  if tg_op='UPDATE' then select z into anterior from jsonb_array_elements(old.datos->'miembros') z where z->>'personaje_id'=p.id::text limit 1;end if;
  if p.estado_vida='muerto' then
   if anterior is null or new.datos->>'fase'='preparacion' or (m->>'vida')::numeric>0 then raise exception '% permanece en el cementerio.',p.nombre;end if;
   continue;
  end if;
  if p.estado_vida<>'vivo' or p.estado_aprobacion<>'aprobado' then raise exception '% no está disponible.',p.nombre;end if;
  if new.datos->>'fase' not in ('en_curso','finalizado') then continue;end if;
  if jsonb_typeof(m->'vida') is distinct from 'number' or jsonb_typeof(m->'ph') is distinct from 'number' or jsonb_typeof(m->'fatiga') is distinct from 'number' then raise exception 'Recursos inválidos para %.',p.nombre;end if;
  -- Store current resources separately; base statistics never become remaining HP.
  v:=greatest(0,(m->>'vida')::numeric);
  update public.personajes set vida_actual=v,vida_maxima_actual=greatest(1,coalesce((m->'stats'->>'vida')::numeric,(m->'stats'->>'hp')::numeric,1)),ph_actual=(m->>'ph')::numeric,fatiga_actual=(m->>'fatiga')::numeric where id=p.id;
  if v=0 then update public.cementerio_personajes set combate_id=new.id,snapshot=snapshot||jsonb_build_object('combatiente',m,'encuentro',jsonb_build_object('nombre',new.nombre,'ronda',new.datos->'ronda')) where personaje_id=p.id and combate_id is null;end if;
 end loop;
 return new;
end;$$;
revoke all on function private.combate_persistir_vitales() from public,anon,authenticated;
create trigger combate_persistir_vitales after insert or update of datos on public.combates_yugen for each row execute function private.combate_persistir_vitales();
commit;
