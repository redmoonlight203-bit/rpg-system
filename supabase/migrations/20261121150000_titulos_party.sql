-- Títulos de party y reglas de cambio.
-- * afecta_party: el efecto del título alcanza a toda la party (personaje principal y compañeros activos).
--   - Normal + party: si un miembro lo lleva activo, todos los miembros reciben su efecto.
--   - Especial + party: todos los personajes de la party lo reciben al desbloquearlo.
--   - Especial sin party: solo el personaje principal (no los compañeros).
-- * El título solo se cambia fuera de combate (también desde el equipo).
-- * El GM puede retirar un título en cualquier momento, incluso con combates en curso.
begin;
alter table public.titulos_ajustes add column afecta_party boolean not null default false;

create function private.personaje_en_party(p_personaje bigint) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.personajes x where x.id=p_personaje and x.estado_vida is distinct from 'muerto' and (not coalesce(x.es_companero,false) or coalesce(x.party_activo,false)))
$$;

-- Cambiar el título exige estar fuera de combate; solo el GM (retirar/ajustar) lo limpia en cualquier momento.
create or replace function private.titulo_activo_validar() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.titulo_activo is not distinct from old.titulo_activo and new.user_id is not distinct from old.user_id then return new;end if;
 if new.titulo_activo is not null and not private.titulo_equipable(new.user_id,new.titulo_activo::text) then raise exception 'Ese título no pertenece a la cuenta o es especial (los especiales no se equipan).';end if;
 if tg_op='UPDATE' and new.titulo_activo is distinct from old.titulo_activo and current_setting('yugen.titulo_gm',true) is distinct from '1' and private.personaje_en_combate(new.id) then
  raise exception 'El título solo se puede cambiar fuera de combate.';
 end if;
 return new;
end;$$;

create or replace function private.titulo_activar(p_personaje bigint,p_titulo uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare pj public.personajes%rowtype;
begin
 if auth.uid() is null then raise exception 'Inicia sesión.' using errcode='42501';end if;
 select * into pj from public.personajes where id=p_personaje for update;
 if not found or (pj.user_id is distinct from auth.uid() and not private.tienda_es_gm()) then raise exception 'Este personaje no te pertenece.';end if;
 if private.personaje_en_combate(pj.id) then raise exception 'El título solo se puede cambiar fuera de combate.';end if;
 if p_titulo is not null and not private.titulo_equipable(pj.user_id,p_titulo::text) then raise exception 'Ese título no pertenece a la cuenta o es especial (los especiales ya están siempre activos).';end if;
 update public.personajes set titulo_activo=p_titulo where id=pj.id;
 return jsonb_build_object('personaje_id',pj.id,'titulo_activo',p_titulo);
end;$$;

drop function public.titulo_ajustar(uuid,boolean,text);
drop function private.titulo_ajustar(uuid,boolean,text);
create function private.titulo_ajustar(p_titulo uuid,p_especial boolean,p_efecto text,p_party boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM puede configurar títulos.' using errcode='42501';end if;
 if not exists(select 1 from public.forja_maestra where id=p_titulo and tipo_creacion='titulo') then raise exception 'Selecciona un título de la Forja.';end if;
 if length(coalesce(p_efecto,''))>1000 then raise exception 'El efecto narrativo admite hasta 1000 caracteres.';end if;
 insert into public.titulos_ajustes(titulo_forja_id,especial,efecto_narrativo,afecta_party) values(p_titulo,coalesce(p_especial,false),btrim(coalesce(p_efecto,'')),coalesce(p_party,false))
 on conflict(titulo_forja_id) do update set especial=excluded.especial,efecto_narrativo=excluded.efecto_narrativo,afecta_party=excluded.afecta_party,updated_at=now();
 -- Un título que pasa a ser especial deja de ocupar el espacio de título de los personajes.
 if coalesce(p_especial,false) then
  perform set_config('yugen.titulo_gm','1',true);
  update public.personajes set titulo_activo=null where titulo_activo=p_titulo;
  perform set_config('yugen.titulo_gm','',true);
 end if;
end;$$;
create function public.titulo_ajustar(p_titulo uuid,p_especial boolean default false,p_efecto text default '',p_party boolean default false) returns void language sql security invoker set search_path='' as $$select private.titulo_ajustar(p_titulo,p_especial,p_efecto,p_party)$$;

-- El GM retira un título cuando quiera. Un combate en curso conserva su instantánea hasta terminar.
create or replace function private.titulo_retirar(p_usuario uuid,p_titulo uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM puede retirar títulos.' using errcode='42501';end if;
 if not exists(select 1 from public.titulos_obtenidos where user_id=p_usuario and titulo_forja_id=p_titulo) then raise exception 'La cuenta no tiene ese título.';end if;
 perform set_config('yugen.titulo_gm','1',true);
 update public.personajes set titulo_activo=null where user_id=p_usuario and titulo_activo=p_titulo;
 perform set_config('yugen.titulo_gm','',true);
 delete from public.titulos_obtenidos where user_id=p_usuario and titulo_forja_id=p_titulo;
end;$$;

do $patch$
declare d text;marca text;
begin
 -- preparar_jugador: especiales sin party solo para el principal y auras de títulos de party.
 select pg_get_functiondef('yugen_interno.preparar_jugador(bigint)'::regprocedure) into d;
 marca:='coalesce(aj.especial,false) es_especial from';
 if position(marca in d)=0 then raise exception 'preparar_jugador inesperado: falta el bloque de títulos';end if;
 d:=replace(d,marca,'coalesce(aj.especial,false) es_especial,coalesce(aj.afecta_party,false) es_party from');
 marca:='  if tit.es_especial then'||chr(10);
 if position(marca in d)=0 then raise exception 'preparar_jugador inesperado: falta la rama de especiales';end if;
 d:=replace(d,marca,'  if tit.es_especial and not tit.es_party and coalesce(p.es_companero,false) then null;'||chr(10)||'  elsif tit.es_especial and tit.es_party and not private.personaje_en_party(p.id) then null;'||chr(10)||'  elsif tit.es_especial then'||chr(10));
 marca:=' for a in select * from jsonb_each(bonos) loop s:=s||';
 if position(marca in d)=0 then raise exception 'preparar_jugador inesperado: falta el bucle de bonos';end if;
 d:=replace(d,marca,$blk$ declare aura record;begin
 if private.personaje_en_party(p.id) then
 for aura in select f.id,f.nombre,f.reglas,f.reglas_pasivas from public.forja_maestra f join public.titulos_ajustes aj on aj.titulo_forja_id=f.id and aj.afecta_party and not aj.especial
  where f.estado='aprobado' and f.id is distinct from p.titulo_activo and exists(select 1 from public.personajes o where o.user_id=p.user_id and o.id<>p.id and o.titulo_activo=f.id and private.personaje_en_party(o.id))
  order by f.nombre,f.id loop
  pasivas:=pasivas||jsonb_build_array(jsonb_build_object('id','titulo_party:'||aura.id,'forja_id',aura.id,'nombre','Título de la party: '||aura.nombre,'reglas_motor',coalesce(aura.reglas,'[]'),'reglas',coalesce(aura.reglas_pasivas,'[]')));
  for a in select * from jsonb_each(public.forja_stats_componente(aura.id)) loop
   if jsonb_typeof(a.value)='number' and a.key not in ('peso','durabilidad','dados_dano','caras_dano','dano') then s:=s||jsonb_build_object(a.key,coalesce((s->>a.key)::numeric,0)+(a.value::text)::numeric);end if;
  end loop;
 end loop;
 end if;end;
$blk$||marca);
 execute d;

 -- aplicar_equipo: un título retirado que siga en la instantánea de un combate no rompe la sincronización.
 select pg_get_functiondef('yugen_interno.aplicar_equipo(bigint,jsonb)'::regprocedure) into d;
 marca:='  if par.key=''titulo'' and private.titulo_equipable(p.user_id,par.value) then continue;end if;';
 if position(marca in d)=0 then raise exception 'aplicar_equipo inesperado: falta la rama de títulos';end if;
 d:=replace(d,marca,'  if par.key=''titulo'' and (private.titulo_equipable(p.user_id,par.value) or exists(select 1 from public.forja_maestra t where t.id::text=lower(par.value) and t.tipo_creacion=''titulo'')) then continue;end if;');
 execute d;
end;$patch$;

revoke all on function private.personaje_en_party(bigint) from public,anon,authenticated;
revoke all on function private.titulo_ajustar(uuid,boolean,text,boolean),public.titulo_ajustar(uuid,boolean,text,boolean) from public,anon;
grant execute on function private.titulo_ajustar(uuid,boolean,text,boolean),public.titulo_ajustar(uuid,boolean,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
