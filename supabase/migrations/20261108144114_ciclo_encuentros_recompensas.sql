begin;
-- El estado de vida definitivo requiere una decisión explícita del GM.
do $$declare d text;begin
 d:=pg_get_functiondef('private.personaje_vitales()'::regprocedure);
 if position('new.vida_actual=0 or new.estado_vida' in d)=0 then raise exception 'Revisar validador de vida antes de migrar.';end if;
 execute replace(d,'new.vida_actual=0 or new.estado_vida','new.estado_vida');
end;$$;
create table public.tablas_botin(
 id uuid primary key default gen_random_uuid(),nombre text not null check(length(btrim(nombre)) between 1 and 120),
 entradas jsonb not null default '[]',updated_at timestamptz not null default now(),check(jsonb_typeof(entradas)='array' and jsonb_array_length(entradas)<=100)
);
create table public.reglas_saqueo(
 id boolean primary key default true check(id),bandas jsonb not null default '[{"min":1,"max":4,"nombre":"Muy pobre"},{"min":5,"max":9,"nombre":"Pobre"},{"min":10,"max":14,"nombre":"Normal"},{"min":15,"max":19,"nombre":"Bueno"},{"min":20,"max":20,"nombre":"Excepcional"}]'
);
insert into public.reglas_saqueo(id) values(true);
alter table public.forja_maestra add column tabla_botin_id uuid references public.tablas_botin(id) on delete set null,add column exp_recompensa integer not null default 0 check(exp_recompensa between 0 and 1000000),add column equipo_saqueable boolean not null default false;
-- La recompensa propia se captura con la entidad, igual que su equipo y habilidades.
do $$declare d text;begin
 d:=pg_get_functiondef('public.forja_snapshot_config(uuid)'::regprocedure);
 d:=replace(d,'''tipo_creacion'',f.tipo_creacion','''tabla_botin_id'',f.tabla_botin_id,''exp_recompensa'',nullif(f.exp_recompensa,0),''equipo_saqueable'',f.equipo_saqueable,''tipo_creacion'',f.tipo_creacion');execute d;
end;$$;
create index forja_tabla_botin_idx on public.forja_maestra(tabla_botin_id);
create table public.resultados_encuentro(
 combate_id uuid primary key references public.combates_yugen(id) on delete restrict,datos jsonb not null,
 aprobado boolean not null default false,recompensas jsonb not null default '[]',aprobado_por uuid references public.perfiles(id),created_at timestamptz not null default now()
);
create index resultados_aprobador_idx on public.resultados_encuentro(aprobado_por);
create table public.eventos_dominio(
 id uuid primary key default gen_random_uuid(),combate_id uuid references public.resultados_encuentro(combate_id),clave text not null,tipo text not null,personaje_id bigint,user_id uuid,datos jsonb not null default '{}',created_at timestamptz not null default now(),unique(combate_id,clave)
);
create index eventos_destino_idx on public.eventos_dominio(user_id,created_at desc);
create table public.registro_experiencia(
 combate_id uuid not null references public.resultados_encuentro(combate_id),personaje_id bigint not null,user_id uuid not null,cantidad integer not null check(cantidad>=0),motivo text not null,resultado jsonb not null,created_at timestamptz not null default now(),primary key(combate_id,personaje_id)
);
create index experiencia_usuario_idx on public.registro_experiencia(user_id,created_at desc);
create table public.saqueos_encuentro(
 id uuid primary key default gen_random_uuid(),combate_id uuid not null references public.resultados_encuentro(combate_id),fuente text not null,nombre text not null,
 tirada integer not null check(tirada between 1 and 20),banda integer not null,tabla jsonb not null,botin jsonb not null default '[]',
 adjudicado_a bigint,adjudicado_por uuid,entrega jsonb,created_at timestamptz not null default now(),unique(combate_id,fuente)
);
create index saqueos_combate_idx on public.saqueos_encuentro(combate_id);
create function private.resultado_acceso(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (private.tienda_es_gm() or exists(select 1 from public.resultados_encuentro r cross join lateral jsonb_array_elements(r.datos->'miembros') m join public.personajes p on p.id::text=m->>'personaje_id' where r.combate_id=p_id and p.user_id=auth.uid()))
$$;
revoke all on function private.resultado_acceso(uuid) from public,anon;grant execute on function private.resultado_acceso(uuid) to authenticated;
do $$declare t text;begin
 foreach t in array array['tablas_botin','reglas_saqueo','resultados_encuentro','eventos_dominio','registro_experiencia','saqueos_encuentro'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create trigger avisar_actualizacion after insert or update or delete on public.%I for each statement execute function private.avisar_actualizacion()',t);
 end loop;
end;$$;
create policy tablas_botin_gm on public.tablas_botin for all to authenticated using((select private.tienda_es_gm())) with check((select private.tienda_es_gm()));
create policy reglas_saqueo_gm on public.reglas_saqueo for all to authenticated using((select private.tienda_es_gm())) with check((select private.tienda_es_gm()));
grant insert,update,delete on public.tablas_botin to authenticated;grant update on public.reglas_saqueo to authenticated;
create policy resultado_lectura on public.resultados_encuentro for select to authenticated using(private.resultado_acceso(combate_id));
create policy saqueos_lectura on public.saqueos_encuentro for select to authenticated using(private.resultado_acceso(combate_id));
create policy experiencia_lectura on public.registro_experiencia for select to authenticated using(user_id=(select auth.uid()) or (select private.tienda_es_gm()));
create policy eventos_lectura on public.eventos_dominio for select to authenticated using(user_id=(select auth.uid()) or (select private.tienda_es_gm()));

create function private.validar_tabla_botin() returns trigger language plpgsql set search_path='' as $$
declare e jsonb;ids text[]:='{}';
begin
 for e in select value from jsonb_array_elements(new.entradas) loop
 if jsonb_typeof(e)<>'object' or coalesce(e->>'id','')='' or e->>'id'=any(ids) or coalesce(e->>'tipo','') not in ('objeto','moneda','recurso') then raise exception 'Entrada de botín inválida o repetida.';end if;
 ids:=array_append(ids,e->>'id');
 if (e->>'cantidad')::int not between 1 and 50 or (e->>'peso')::numeric not between 0.001 and 1000000 or (e->>'calidad_min')::int not between 0 and 4 or (e->>'calidad_max')::int not between (e->>'calidad_min')::int and 4 or not(e ?& array['cantidad','peso','calidad_min','calidad_max']) then raise exception 'Configura cantidad, peso y banda de calidad.';end if;
 if coalesce((e->>'probabilidad')::numeric,100) not between 0 and 100 or coalesce((e->>'nivel_minimo')::integer,1) not between 1 and 100 then raise exception 'Requisitos de botín inválidos.';end if;
 if e->>'tipo' in ('objeto','recurso') and not exists(select 1 from public.forja_maestra where id=(e->>'forja_id')::uuid and tipo_creacion='objeto' and estado='aprobado') then raise exception 'Selecciona un objeto o recurso existente en La Creación.';end if;
 if e->>'tipo'='moneda' and not exists(select 1 from public.monedas where id=(e->>'moneda_id')::uuid) then raise exception 'Selecciona una moneda existente.';end if;
 end loop;new.updated_at:=now();return new;
end;$$;
create trigger validar_tabla_botin before insert or update on public.tablas_botin for each row execute function private.validar_tabla_botin();
create function private.validar_bandas_saqueo() returns trigger language plpgsql set search_path='' as $$
declare b jsonb;anterior int:=0;
begin
 if jsonb_typeof(new.bandas)<>'array' or jsonb_array_length(new.bandas)<>5 then raise exception 'Configura cinco bandas de calidad.';end if;
 for b in select value from jsonb_array_elements(new.bandas) loop
 if (b->>'min')::int is distinct from anterior+1 or (b->>'max')::int not between (b->>'min')::int and 20 or coalesce(length(b->>'nombre'),0)=0 then raise exception 'Las bandas deben cubrir 1 a 20 sin huecos ni solapamientos.';end if;anterior:=(b->>'max')::int;
 end loop;
 if anterior<>20 then raise exception 'Las bandas deben llegar hasta 20.';end if;return new;
end;$$;
create trigger validar_bandas_saqueo before update on public.reglas_saqueo for each row execute function private.validar_bandas_saqueo();

-- Blindar política en servidor, incluso con un cliente antiguo; entrenamiento nunca se convierte a campaña.
create function private.encuentro_validar_ciclo() returns trigger language plpgsql security definer set search_path='' as $$
declare pol jsonb:=coalesce(new.datos->'politica','{}');m jsonb;v numeric;mapa jsonb:=new.datos->'mapa';celda record;xy text[];
begin
 if tg_op='UPDATE' then
 if old.datos->>'fase'<>'preparacion' and (new.datos->'mapa' is distinct from old.datos->'mapa' or new.datos->'fuentes_botin' is distinct from old.datos->'fuentes_botin') then raise exception 'El mapa y las fuentes de botín se configuran antes de iniciar.';end if;
 if old.datos->>'fase'<>'preparacion' and pol is distinct from coalesce(old.datos->'politica','{}') then raise exception 'Configura las reglas antes de iniciar.';end if;
 if exists(select 1 from public.resultados_encuentro where combate_id=new.id and aprobado) and new.datos is distinct from old.datos then raise exception 'Las recompensas ya fueron aprobadas; el encuentro es inmutable.';end if;
 end if;
 if new.datos ? 'fuentes_botin' then
 if jsonb_typeof(new.datos->'fuentes_botin')<>'array' or jsonb_array_length(new.datos->'fuentes_botin')>50 then raise exception 'Fuentes de botín inválidas.';end if;
 for m in select value from jsonb_array_elements(new.datos->'fuentes_botin') loop if coalesce(m->>'id','')='' or coalesce(m->>'nombre','')='' or not exists(select 1 from public.tablas_botin where id=(m->>'tabla_botin_id')::uuid) then raise exception 'Fuente de botín inválida.';end if;end loop;
 end if;
 if mapa is not null then
 if jsonb_typeof(mapa)<>'object' or (mapa->>'columnas')::int not between 8 and 24 or (mapa->>'filas')::int not between 8 and 24 or jsonb_typeof(mapa->'celdas') is distinct from 'object' then raise exception 'Mapa de combate inválido.';end if;
 for celda in select * from jsonb_each_text(mapa->'celdas') loop
 xy:=string_to_array(celda.key,',');if celda.key!~'^\d+,\d+$' or celda.value not in ('muro','dificil','cobertura','peligro') or xy[1]::int not between 0 and (mapa->>'columnas')::int-1 or xy[2]::int not between 0 and (mapa->>'filas')::int-1 then raise exception 'Casilla de terreno inválida.';end if;
 end loop;
 end if;
 if coalesce(pol->>'modo','oficial') not in ('oficial','entrenamiento') or coalesce(pol->>'reparto','replicar') not in ('replicar','repartir','participacion') then raise exception 'Política de encuentro inválida.';end if;
 if coalesce((pol->>'exp_base')::numeric,0) not between 0 and 1000000 or coalesce((pol->>'exp_objetivo')::numeric,0) not between 0 and 1000000 or coalesce((pol->>'dificultad')::numeric,1) not between 0 and 10 or coalesce((pol->>'limite_rondas')::int,0) not between 0 and 1000 then raise exception 'Recompensas o límite de rondas fuera de rango.';end if;
 for m in select value from jsonb_array_elements(new.datos->'miembros') loop
 if coalesce(m->>'situacion','activo') not in ('activo','inconsciente','muerto','retirado','rendido','capturado') then raise exception 'Situación de combatiente inválida.';end if;
 if (m->>'situacion'='muerto' or coalesce((m->>'neutral')::boolean,false)) and auth.uid() is not null and not private.tienda_es_gm() then raise exception 'Solo el GM puede decidir muertes o neutralidad.';end if;
 end loop;return new;
end;$$;
create trigger aaa_encuentro_validar_ciclo before insert or update on public.combates_yugen for each row execute function private.encuentro_validar_ciclo();
-- Saltar todos los cambios persistentes de vitales, equipo y consumibles en las instantáneas de entrenamiento.
do $$declare d text;f text;begin
 foreach f in array array['private.combate_persistir_vitales()','yugen_interno.sincronizar_equipo()'] loop
 d:=pg_get_functiondef(f::regprocedure);
 d:=regexp_replace(d,'begin',E'begin\n if new.datos->''politica''->>''modo''=''entrenamiento'' then return new;end if;','i');execute d;
 end loop;
 d:=pg_get_functiondef('private.combate_persistir_vitales()'::regprocedure);
 d:=replace(d,'update public.personajes set vida_actual=v,','update public.personajes set estado_vida=case when m->>''situacion''=''muerto'' then ''muerto'' else estado_vida end,vida_actual=v,');execute d;
end;$$;
create function private.encuentro_registrar_resultado() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.datos->>'fase'='finalizado' then
 insert into public.resultados_encuentro(combate_id,datos) values(new.id,new.datos-'historial') on conflict(combate_id) do nothing;
 insert into public.eventos_dominio(combate_id,clave,tipo,datos) values(new.id,'fin','encuentro_finalizado',coalesce(new.datos->'cierre','{}')) on conflict do nothing;
 end if;return new;
end;$$;
create trigger encuentro_registrar_resultado after insert or update on public.combates_yugen for each row execute function private.encuentro_registrar_resultado();

-- Tabla usada y resultado de cada tirada quedan congelados; nunca se vuelve a tirar al reconectar.
create function private.encuentro_generar_botin(p_id uuid,p_datos jsonb) returns void language plpgsql security definer set search_path='' as $$
declare m jsonb;tabla public.tablas_botin%rowtype;tid uuid;tirada int;banda int;botin jsonb;e jsonb;equipo jsonb;maxnivel int;ganador text:=p_datos->'cierre'->>'ganador';
begin
 for m in select value from jsonb_array_elements(coalesce(p_datos->'miembros','[]')||coalesce((select jsonb_agg(jsonb_build_object('id',f->>'id','nombre',f->>'nombre','vida',0,'bando',case when ganador='jugador' then 'enemigo' else 'jugador' end,'configuracion',jsonb_build_object('tabla_botin_id',f->>'tabla_botin_id'))) from jsonb_array_elements(coalesce(p_datos->'fuentes_botin','[]')) f),'[]')) loop
 if coalesce((m->>'neutral')::boolean,false) or m ? 'invocacion' or (m->>'vida')::numeric>0 or m->>'bando'=ganador or ganador is null then continue;end if;
 tid:=nullif(m->'configuracion'->>'tabla_botin_id','')::uuid;
 if tid is null then select tabla_botin_id into tid from public.forja_maestra where id=nullif(m->>'forja_id','')::uuid;end if;
 select * into tabla from public.tablas_botin where id=tid;
 if not found and not coalesce((m->'configuracion'->>'equipo_saqueable')::boolean,false) then continue;end if;
 tirada:=floor(random()*20)::int+1;
 select n::int-1 into banda from public.reglas_saqueo r cross join lateral jsonb_array_elements(r.bandas) with ordinality b(v,n) where tirada between (v->>'min')::int and (v->>'max')::int;
 botin:='[]';maxnivel:=coalesce((m->>'nivel')::int,1);
 for e in select value from jsonb_array_elements(coalesce(tabla.entradas,'[]')) where coalesce((value->>'garantizado')::boolean,false) or (banda between (value->>'calidad_min')::int and (value->>'calidad_max')::int and coalesce((value->>'nivel_minimo')::int,1)<=maxnivel and random()*100<coalesce((value->>'probabilidad')::numeric,100)) order by coalesce((value->>'garantizado')::boolean,false) desc,-ln(greatest(random(),0.000001))/(value->>'peso')::numeric loop
 if coalesce((e->>'garantizado')::boolean,false) or not exists(select 1 from jsonb_array_elements(botin) b where not coalesce((b->>'garantizado')::boolean,false)) then botin:=botin||jsonb_build_array(e);end if;
 end loop;
 if coalesce((m->'configuracion'->>'equipo_saqueable')::boolean,false) then
 for equipo in select value from jsonb_each(coalesce(m->'configuracion'->'equipamiento','{}')) loop
 if exists(select 1 from public.forja_maestra f where f.id=nullif(equipo->>'id','')::uuid and f.tipo_creacion='objeto' and not f.ligado_al_alma) then botin:=botin||jsonb_build_array(jsonb_build_object('id',equipo->>'id','tipo','objeto','forja_id',equipo->>'id','cantidad',1,'garantizado',true,'snapshot',equipo));end if;
 end loop;end if;
 insert into public.saqueos_encuentro(combate_id,fuente,nombre,tirada,banda,tabla,botin) values(p_id,m->>'id',m->>'nombre',tirada,banda,jsonb_build_object('id',tid,'nombre',tabla.nombre,'entradas',coalesce(tabla.entradas,'[]')),botin) on conflict do nothing;
 end loop;
end;$$;

create function private.encuentro_aprobar(p_id uuid,p_version int,p_ajuste int default 0,p_motivo text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.combates_yugen%rowtype;r public.resultados_encuentro%rowtype;m jsonb;p public.personajes%rowtype;exp int:=0;valor int;total int;premios jsonb:='[]';res jsonb;n int;pesos numeric;politica jsonb;ganador text;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM puede aprobar recompensas.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into b from public.combates_yugen where id=p_id and creador_id=auth.uid() for update;
 if not found then raise exception 'Encuentro no disponible.';end if;
 select * into r from public.resultados_encuentro where combate_id=p_id for update;
 if r.aprobado then return to_jsonb(r);end if;
 if r.combate_id is null or b.datos->>'fase'<>'finalizado' or b.version<>p_version then raise exception 'Termina y recarga el encuentro antes de aprobar.';end if;
 politica:=coalesce(r.datos->'politica','{}');ganador:=r.datos->'cierre'->>'ganador';
 if politica->>'modo'='entrenamiento' then update public.resultados_encuentro set aprobado=true,aprobado_por=auth.uid() where combate_id=p_id returning * into r;return to_jsonb(r);end if;
 if not coalesce((b.datos->>'progreso_confirmado')::boolean,false) and exists(select 1 from jsonb_array_elements(b.datos->'miembros') elemento(value) where coalesce(elemento.value->>'personaje_id','')<>'' and jsonb_array_length(coalesce(elemento.value->'motor'->'progreso','[]'))>0) then perform public.combate_confirmar_progreso(p_id,b.version);end if;
 if p_ajuste is null or p_ajuste not between -1000000 and 1000000 or (p_ajuste<>0 and length(btrim(coalesce(p_motivo,''))) not between 1 and 500) then raise exception 'El ajuste requiere una cantidad válida y un motivo.';end if;
 for m in select value from jsonb_array_elements(r.datos->'miembros') loop
 if ganador is not null and m->>'bando'<>ganador and not coalesce((m->>'neutral')::boolean,false) and not m ? 'invocacion' and (m->>'vida')::numeric<=0 then
 valor:=coalesce((m->'configuracion'->>'exp_recompensa')::int,(select nullif(f.exp_recompensa,0) from public.forja_maestra f where f.id=nullif(m->>'forja_id','')::uuid),(politica->>'exp_base')::int,0);exp:=exp+valor;
 insert into public.eventos_dominio(combate_id,clave,tipo,datos) values(p_id,'derrota:'||(m->>'id'),'enemigo_derrotado',m-'configuracion') on conflict do nothing;
 end if;end loop;
 exp:=greatest(0,least(1000000,floor((exp+coalesce((politica->>'exp_objetivo')::int,0))*coalesce((politica->>'dificultad')::numeric,1))+p_ajuste))::int;
 select count(*),sum(greatest(1,coalesce((miembro.value->>'contribucion')::numeric,0))) into n,pesos from jsonb_array_elements(r.datos->'miembros') miembro(value) join public.personajes pj on pj.id::text=miembro.value->>'personaje_id' join public.perfiles u on u.id=pj.user_id
 where miembro.value->>'bando'=ganador and not miembro.value ? 'invocacion' and pj.estado_vida='vivo' and pj.estado_aprobacion='aprobado' and u.rol='REENCARNADO' and u.estado='aprobado' and (coalesce((politica->>'premiar_retirados')::boolean,false) or coalesce(miembro.value->>'situacion','activo') not in ('retirado','rendido','capturado')) and (not pj.es_companero or exists(select 1 from public.party_companeros pc where pc.personaje_id=pj.id and pc.user_id=pj.user_id and pc.activo));
 for m in select value from jsonb_array_elements(r.datos->'miembros') order by value->>'personaje_id' loop
 select pj.* into p from public.personajes pj join public.perfiles u on u.id=pj.user_id where pj.id::text=m->>'personaje_id' and pj.estado_vida='vivo' and pj.estado_aprobacion='aprobado' and u.rol='REENCARNADO' and u.estado='aprobado' and (not pj.es_companero or exists(select 1 from public.party_companeros pc where pc.personaje_id=pj.id and pc.user_id=pj.user_id and pc.activo)) for update of pj;
 if not found or m->>'bando' is distinct from ganador or m ? 'invocacion' or (not coalesce((politica->>'premiar_retirados')::boolean,false) and coalesce(m->>'situacion','activo') in ('retirado','rendido','capturado')) then continue;end if;
 valor:=case politica->>'reparto' when 'repartir' then floor(exp/greatest(n,1)) when 'participacion' then floor(exp*greatest(1,coalesce((m->>'contribucion')::numeric,0))/greatest(pesos,1)) else exp end;
 if valor>0 then res:=private.arbol_dar_experiencia(p.id,valor,true);else res:=jsonb_build_object('nivel',p.nivel,'puntos_anadidos',0);end if;
 insert into public.registro_experiencia(combate_id,personaje_id,user_id,cantidad,motivo,resultado) values(p_id,p.id,p.user_id,valor,coalesce(nullif(p_motivo,''),'Resultado del encuentro'),res);
 premios:=premios||jsonb_build_array(jsonb_build_object('personaje_id',p.id,'nombre',p.nombre,'cantidad',valor,'resultado',res));
 insert into public.eventos_dominio(combate_id,clave,tipo,personaje_id,user_id,datos) values(p_id,'exp:'||p.id,'experiencia_otorgada',p.id,p.user_id,jsonb_build_object('cantidad',valor,'motivo',p_motivo,'resultado',res));
 if coalesce((res->>'puntos_anadidos')::int,0)>0 then insert into public.eventos_dominio(combate_id,clave,tipo,personaje_id,user_id,datos) values(p_id,'nivel:'||p.id,'nivel_alcanzado',p.id,p.user_id,res);end if;
 end loop;
 perform private.encuentro_generar_botin(p_id,r.datos);
 update public.resultados_encuentro set aprobado=true,aprobado_por=auth.uid(),recompensas=premios where combate_id=p_id returning * into r;
 return to_jsonb(r);
end;$$;
create function private.encuentro_adjudicar(p_saqueo uuid,p_personaje bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.saqueos_encuentro%rowtype;p public.personajes%rowtype;r public.resultados_encuentro%rowtype;f public.forja_maestra%rowtype;e jsonb;i int;nuevo uuid;ids jsonb:='[]';limite int;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'El GM decide el reparto del botín.' using errcode='42501';end if;
 select * into s from public.saqueos_encuentro where id=p_saqueo for update;
 if not found then raise exception 'Fuente no disponible.';end if;
 if s.entrega is not null then
 if s.adjudicado_a is distinct from p_personaje then raise exception 'Esta fuente ya fue reclamada.';end if;return s.entrega;end if;
 select * into r from public.resultados_encuentro where combate_id=s.combate_id;
 if not r.aprobado or r.datos->'politica'->>'modo'='entrenamiento' then raise exception 'Aprueba primero las recompensas oficiales.';end if;
 select pj.* into p from public.personajes pj join public.perfiles u on u.id=pj.user_id where pj.id=p_personaje and pj.estado_vida='vivo' and pj.estado_aprobacion='aprobado' and u.rol='REENCARNADO' and u.estado='aprobado' for update of pj;
 if not found or not exists(select 1 from jsonb_array_elements(r.datos->'miembros') m where m->>'personaje_id'=p.id::text and m->>'bando'=r.datos->'cierre'->>'ganador') then raise exception 'Selecciona un participante elegible del bando ganador.';end if;
 for e in select value from jsonb_array_elements(s.botin) loop
 if e->>'tipo'='moneda' then
 perform private.monedas_gestionar('ajustar',p.user_id,(e->>'moneda_id')::uuid,(e->>'cantidad')::bigint,null,null,'Saqueo: '||s.nombre,gen_random_uuid());
 else
 select * into f from public.forja_maestra where id=(e->>'forja_id')::uuid and tipo_creacion='objeto' and estado='aprobado';
 if not found then raise exception 'Un objeto de esta tabla ya no está disponible; revisa el botín.';end if;
 limite:=nullif(p.atributos->>'capacidad_inventario','')::int;
 if not coalesce(f.ligado_al_alma,false) and limite is not null and (select count(*) from public.inventario_jugador where personaje_id=p.id)+(e->>'cantidad')::int>limite then raise exception 'Inventario lleno: libera espacio antes de reclamar.';end if;
 for i in 1..(e->>'cantidad')::int loop
 insert into public.inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,descripcion,imagen_url,clase,stats,ligado_al_alma,slot_tipo,es_activo,motivo_entrega)
 values(p.user_id,case when f.ligado_al_alma then null else p.id end,f.id,f.nombre,f.tipo,f.descripcion,f.imagen_url,f.clase,coalesce(e->'snapshot'->'stats',public.forja_stats_componente(f.id)),f.ligado_al_alma,f.slot_tipo,false,'Saqueo de '||s.nombre) returning id into nuevo;
 ids:=ids||to_jsonb(nuevo);
 end loop;
 end if;end loop;
 update public.saqueos_encuentro set adjudicado_a=p.id,adjudicado_por=auth.uid(),entrega=jsonb_build_object('personaje',p.nombre,'ids',ids,'botin',s.botin) where id=s.id returning * into s;
 insert into public.eventos_dominio(combate_id,clave,tipo,personaje_id,user_id,datos) values(s.combate_id,'saqueo:'||s.id,'objeto_adjudicado',p.id,p.user_id,s.entrega);
 return s.entrega;
end;$$;
create function public.encuentro_aprobar(p_id uuid,p_version int,p_ajuste int default 0,p_motivo text default '') returns jsonb language sql security invoker set search_path='' as $$select private.encuentro_aprobar(p_id,p_version,p_ajuste,p_motivo)$$;
create function public.encuentro_adjudicar(p_saqueo uuid,p_personaje bigint) returns jsonb language sql security invoker set search_path='' as $$select private.encuentro_adjudicar(p_saqueo,p_personaje)$$;
-- Las instantáneas completas son exclusivas del GM. Los jugadores reciben su historial por RLS.
drop policy resultado_lectura on public.resultados_encuentro;
create policy resultado_lectura on public.resultados_encuentro for select to authenticated using((select private.tienda_es_gm()));
-- El motor ya bloquea las acciones; bloquear también aplicar crecimiento permanente en entrenamientos.
do $$declare d text;begin
 d:=pg_get_functiondef('public.combate_confirmar_progreso(uuid,integer)'::regprocedure);
 d:=replace(d,'if coalesce((fila.datos->>''progreso_confirmado'')','if fila.datos->''politica''->>''modo''=''entrenamiento'' then raise exception ''El entrenamiento no cambia las fichas.'';end if;'||chr(10)||' if coalesce((fila.datos->>''progreso_confirmado'')');execute d;
end;$$;
-- Nuevos RPC privados siguen el patrón de autorización existente, sin exponer SECURITY DEFINER en public.
do $$declare f record;begin
 for f in select n.nspname,p.oid::regprocedure::text firma,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','public') and p.proname in ('encuentro_aprobar','encuentro_adjudicar') loop
 execute format('revoke all on function %s from public,anon',f.firma);execute format('grant execute on function %s to authenticated',f.firma);
 end loop;
end;$$;
revoke all on function private.encuentro_generar_botin(uuid,jsonb),private.encuentro_validar_ciclo(),private.encuentro_registrar_resultado(),private.validar_tabla_botin(),private.validar_bandas_saqueo() from public,anon,authenticated;
-- Un uso de objeto puede resolver el último enemigo y finalizar en la misma operación.
do $$declare d text;begin
 d:=pg_get_functiondef('yugen_interno.confirmar_equipo(uuid,bigint,uuid,text,integer,text,jsonb,jsonb)'::regprocedure);
 d:=replace(d,$old$if p_datos->>'fase'<>b.datos->>'fase' or p_datos->>'actual'<>b.datos->>'actual' or jsonb_array_length(p_datos->'miembros')<>jsonb_array_length(b.datos->'miembros') then$old$,$new$if (not(p_datos->>'fase'='finalizado' and b.datos->>'fase'='en_curso') and (p_datos->>'fase'<>b.datos->>'fase' or p_datos->>'actual'<>b.datos->>'actual')) or jsonb_array_length(p_datos->'miembros')<>jsonb_array_length(b.datos->'miembros') then$new$);execute d;
end;$$;
create function private.encuentro_revisar(p_id uuid,p_version int,p_ganador text,p_motivo text) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.combates_yugen%rowtype;r public.resultados_encuentro%rowtype;cierre jsonb;
begin
 if auth.uid() is null or not private.tienda_es_gm() then raise exception 'Solo el GM revisa resultados.';end if;
 if (p_ganador is not null and p_ganador not in ('jugador','enemigo')) or length(btrim(coalesce(p_motivo,''))) not between 1 and 500 then raise exception 'Indica bando y motivo válidos.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into b from public.combates_yugen where id=p_id and creador_id=auth.uid() for update;
 select * into r from public.resultados_encuentro where combate_id=p_id for update;
 if b.id is null or b.version<>p_version or b.datos->>'fase'<>'finalizado' or r.aprobado or coalesce((b.datos->>'progreso_confirmado')::boolean,false) then raise exception 'No se puede revisar este resultado; recarga o comprueba si ya está confirmado.';end if;
 cierre:=coalesce(b.datos->'cierre','{}')||jsonb_build_object('ganador',p_ganador,'motivo',p_motivo);
 update public.combates_yugen set datos=jsonb_set(datos,'{cierre}',cierre),version=version+1,updated_at=now() where id=p_id returning * into b;
 update public.resultados_encuentro set datos=b.datos-'historial' where combate_id=p_id;
 insert into public.eventos_dominio(combate_id,clave,tipo,datos) values(p_id,'revision:'||gen_random_uuid(),'resultado_revisado',jsonb_build_object('antes',r.datos->'cierre','despues',cierre,'autor',auth.uid()));
 return jsonb_build_object('datos',b.datos,'version',b.version);
end;$$;
create function public.encuentro_revisar(p_id uuid,p_version int,p_ganador text,p_motivo text) returns jsonb language sql security invoker set search_path='' as $$select private.encuentro_revisar(p_id,p_version,p_ganador,p_motivo)$$;
revoke all on function private.encuentro_revisar(uuid,int,text,text),public.encuentro_revisar(uuid,int,text,text) from public,anon;
grant execute on function private.encuentro_revisar(uuid,int,text,text),public.encuentro_revisar(uuid,int,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
