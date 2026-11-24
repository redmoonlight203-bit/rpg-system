-- Evolución y legado: etapas de vida y evoluciones permanentes sobre el sistema de formas existente.
-- No borra ni reescribe datos: `formas_historia` queda intacta y se lee como línea evolutiva cuando no hay otra.
--  * Plantilla de creación ........ forja_maestra.linea_evolutiva (etapas futuras configuradas)
--  * Instancia individual ......... personaje_evolucion (copia propia de la línea + etapa actual + hitos)
--  * Historial de etapas .......... personaje_etapas_historial (instantáneas inmutables, action_id único)
--  * Solicitudes del jugador ...... evolucion_solicitudes
--  * Transformación temporal ...... sigue en el combate (combatiente.transformacion), sin cambios.
begin;
create schema if not exists private;

alter table public.forja_maestra add column if not exists linea_evolutiva jsonb;

-- Validación estructural de una línea: referencias, tamaños y ausencia de ciclos (algoritmo de Kahn).
create or replace function private.evolucion_validar_linea(p jsonb) returns text language plpgsql immutable set search_path='' as $$
declare ids text[];t jsonb;pendientes int;cambio boolean;restantes jsonb;
begin
 if p is null then return null;end if;
 if jsonb_typeof(p)<>'object' or coalesce(p->>'version','')<>'1' or jsonb_typeof(p->'etapas')<>'array' or jsonb_typeof(p->'transiciones')<>'array' then return 'Línea evolutiva con formato desconocido.';end if;
 if octet_length(p::text)>600000 then return 'La línea evolutiva es demasiado grande.';end if;
 if jsonb_array_length(p->'etapas') not between 1 and 64 then return 'La línea necesita entre 1 y 64 etapas.';end if;
 if jsonb_array_length(p->'transiciones')>128 then return 'Máximo 128 conexiones.';end if;
 select array_agg(e->>'id') into ids from jsonb_array_elements(p->'etapas') e;
 if exists(select 1 from unnest(ids) x where x is null or btrim(x)='') or (select count(distinct x) from unnest(ids) x)<>cardinality(ids) then return 'Cada etapa necesita un identificador único.';end if;
 if exists(select 1 from jsonb_array_elements(p->'etapas') e where btrim(coalesce(e->>'nombre',''))='' or length(e->>'nombre')>120 or coalesce(e->>'tipo','') not in ('etapa_vida','evolucion') or jsonb_typeof(e->'stats') is distinct from 'object') then return 'Cada etapa necesita nombre, tipo y estadísticas.';end if;
 if exists(select 1 from jsonb_array_elements(p->'etapas') e cross join lateral jsonb_each(e->'stats') s where jsonb_typeof(s.value)<>'number' or abs((s.value)::numeric)>1000000) then return 'Estadísticas de etapa inválidas.';end if;
 if not (p->>'inicial')=any(ids) then return 'La etapa inicial no existe.';end if;
 for t in select * from jsonb_array_elements(p->'transiciones') loop
  if not (t->>'desde')=any(ids) or not (t->>'hasta')=any(ids) or coalesce(t->>'id','')='' then return 'Hay una conexión rota: apunta a una etapa que ya no existe.';end if;
  if t->>'desde'=t->>'hasta' or t->>'hasta'=p->>'inicial' then return 'Una etapa no puede volver sobre sí misma ni a la inicial.';end if;
  if coalesce(t->>'modo','') not in ('manual_gm','automatica','solicitud_jugador','evento_combate','habilidad_objeto') then return 'Modo de activación desconocido.';end if;
  if jsonb_typeof(t->'requisito') is distinct from 'object' then return 'Cada conexión necesita requisitos (aunque sean «sin requisitos»).';end if;
 end loop;
 if (select count(distinct x->>'id') from jsonb_array_elements(p->'transiciones') x)<>jsonb_array_length(p->'transiciones') then return 'Conexiones con identificador repetido.';end if;
 -- Kahn: se eliminan nodos sin entradas; si sobra alguna conexión, hay un ciclo.
 restantes:=p->'transiciones';
 loop
  cambio:=false;
  select coalesce(jsonb_agg(x),'[]') into t from jsonb_array_elements(restantes) x
   where exists(select 1 from jsonb_array_elements(restantes) y where y->>'hasta'=x->>'desde');
  if jsonb_array_length(t)<jsonb_array_length(restantes) then restantes:=t;cambio:=true;end if;
  exit when not cambio;
 end loop;
 pendientes:=jsonb_array_length(restantes);
 if pendientes>0 then return 'La línea tiene un ciclo: una etapa acabaría evolucionando en sí misma.';end if;
 return null;
end;$$;
revoke all on function private.evolucion_validar_linea(jsonb) from public,anon,authenticated;

create or replace function private.forja_validar_linea_evolutiva() returns trigger language plpgsql set search_path='' as $$
declare e text;
begin
 if new.linea_evolutiva is not distinct from (case when tg_op='UPDATE' then old.linea_evolutiva else null end) then return new;end if;
 e:=private.evolucion_validar_linea(new.linea_evolutiva);
 if e is not null then raise exception '%',e using errcode='22023';end if;
 return new;
end;$$;
revoke all on function private.forja_validar_linea_evolutiva() from public,anon,authenticated;
drop trigger if exists forja_validar_linea_evolutiva on public.forja_maestra;
create trigger forja_validar_linea_evolutiva before insert or update of linea_evolutiva on public.forja_maestra for each row execute function private.forja_validar_linea_evolutiva();

-- Línea de una plantilla. Las formas antiguas se leen como etapas de vida en cadena (sin escribir nada).
create or replace function private.evolucion_linea_plantilla(p_forja uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare f record;etapas jsonb:='[]';trans jsonb:='[]';i int:=0;anterior text;actual text;x jsonb;
begin
 select linea_evolutiva,formas_historia,stats into f from public.forja_maestra where id=p_forja;
 if not found then return null;end if;
 if f.linea_evolutiva is not null then return f.linea_evolutiva;end if;
 if jsonb_typeof(f.formas_historia)<>'array' or jsonb_array_length(f.formas_historia)=0 then return null;end if;
 for x in select * from jsonb_array_elements(f.formas_historia) loop
  i:=i+1;actual:=md5(p_forja::text||':forma:'||i);
  etapas:=etapas||jsonb_build_object('id',actual,'tipo','etapa_vida','nombre',coalesce(nullif(btrim(x->>'nombre'),''),'Forma '||i),'historia',coalesce(x->>'historia',''),'retrato',nullif(x->>'imagen',''),'stats',coalesce(f.stats,'{}'::jsonb),'habilidades','[]'::jsonb,'pasivas','[]'::jsonb);
  if anterior is not null then trans:=trans||jsonb_build_object('id',md5(anterior||'>'||actual),'desde',anterior,'hasta',actual,'requisito',jsonb_build_object('tipo','autorizacion_gm'),'modo','manual_gm');end if;
  anterior:=actual;
 end loop;
 return jsonb_build_object('version',1,'inicial',md5(p_forja::text||':forma:1'),'etapas',etapas,'transiciones',trans);
end;$$;
revoke all on function private.evolucion_linea_plantilla(uuid) from public,anon,authenticated;

create table if not exists public.personaje_evolucion(
 personaje_id bigint primary key references public.personajes(id) on delete cascade,
 linea jsonb not null,
 etapa_actual text not null,
 hitos jsonb not null default '{}'::jsonb,
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 constraint personaje_evolucion_hitos check (jsonb_typeof(hitos)='object')
);
alter table public.personaje_evolucion enable row level security;
revoke all on public.personaje_evolucion from anon,authenticated;
grant select on public.personaje_evolucion to authenticated;
-- La línea completa (con etapas futuras y secretas) solo la ve el GM. El jugador usa evolucion_vista().
drop policy if exists personaje_evolucion_gm on public.personaje_evolucion;
create policy personaje_evolucion_gm on public.personaje_evolucion for select to authenticated using((select private.tienda_es_gm()));

create table if not exists public.personaje_etapas_historial(
 id uuid primary key default gen_random_uuid(),
 personaje_id bigint not null references public.personajes(id) on delete cascade,
 etapa_id text not null,
 desde_etapa text,
 transicion_id text,
 snapshot jsonb not null,
 ficha jsonb not null,
 autorizado_por uuid,
 origen text not null check (origen in ('inicial','gm','jugador','automatica','combate')),
 condiciones jsonb not null default '[]'::jsonb,
 combate_id uuid,
 action_id uuid unique,
 created_at timestamptz not null default now()
);
create index if not exists personaje_etapas_historial_personaje on public.personaje_etapas_historial(personaje_id,created_at);
alter table public.personaje_etapas_historial enable row level security;
revoke all on public.personaje_etapas_historial from anon,authenticated;
grant select on public.personaje_etapas_historial to authenticated;
drop policy if exists personaje_etapas_historial_lectura on public.personaje_etapas_historial;
create policy personaje_etapas_historial_lectura on public.personaje_etapas_historial for select to authenticated using(
 (select private.tienda_es_gm()) or exists(select 1 from public.personajes p where p.id=personaje_id and p.user_id=(select auth.uid())));

-- El historial es un registro: nunca se reescribe.
create or replace function private.evolucion_historial_inmutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'El historial de etapas no se modifica.' using errcode='42501';end;$$;
revoke all on function private.evolucion_historial_inmutable() from public,anon,authenticated;
drop trigger if exists evolucion_historial_inmutable on public.personaje_etapas_historial;
create trigger evolucion_historial_inmutable before update on public.personaje_etapas_historial for each row execute function private.evolucion_historial_inmutable();

create table if not exists public.evolucion_solicitudes(
 id uuid primary key default gen_random_uuid(),
 personaje_id bigint not null references public.personajes(id) on delete cascade,
 transicion_id text not null,
 user_id uuid not null,
 estado text not null default 'pendiente' check (estado in ('pendiente','aprobada','rechazada')),
 action_id uuid not null unique,
 resuelta_por uuid,
 resuelta_at timestamptz,
 created_at timestamptz not null default now()
);
create unique index if not exists evolucion_solicitudes_pendiente on public.evolucion_solicitudes(personaje_id,transicion_id) where estado='pendiente';
alter table public.evolucion_solicitudes enable row level security;
revoke all on public.evolucion_solicitudes from anon,authenticated;
grant select on public.evolucion_solicitudes to authenticated;
drop policy if exists evolucion_solicitudes_lectura on public.evolucion_solicitudes;
create policy evolucion_solicitudes_lectura on public.evolucion_solicitudes for select to authenticated using((select private.tienda_es_gm()) or user_id=(select auth.uid()));

-- Contexto de requisitos calculado en el servidor (nunca se confía en el del cliente).
create or replace function private.evolucion_contexto(p_personaje bigint,p_hitos jsonb) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('nivel',coalesce(p.nivel,1),'exp_total',coalesce(p.exp_total,0),'stats',coalesce(p.atributos,'{}'::jsonb),'hitos',coalesce(p_hitos,'{}'::jsonb),
  'objetos',coalesce((select jsonb_agg(distinct i.forja_id::text) from public.inventario_jugador i where i.personaje_id=p.id and i.user_id=p.user_id and i.forja_id is not null),'[]'::jsonb))
 from public.personajes p where p.id=p_personaje;
$$;
revoke all on function private.evolucion_contexto(bigint,jsonb) from public,anon,authenticated;

-- Evaluador Y/O/NO con las mismas primitivas que lib/evolucion.ts. Devuelve {cumple, consumir[], faltantes[]}.
create or replace function private.evolucion_cumple(r jsonb,ctx jsonb,gm boolean,profundidad int default 0) returns jsonb language plpgsql stable set search_path='' as $$
declare x jsonb;hijo jsonb;consumir jsonb:='[]';faltan jsonb:='[]';h jsonb:=coalesce(ctx->'hitos','{}');v numeric;ok boolean;
begin
 if profundidad>12 then return jsonb_build_object('cumple',false,'consumir','[]'::jsonb,'faltantes',jsonb_build_array('Condiciones demasiado anidadas'));end if;
 case r->>'tipo'
  when 'siempre' then ok:=true;
  when 'todas' then
   ok:=true;
   for x in select * from jsonb_array_elements(coalesce(r->'condiciones','[]')) loop
    hijo:=private.evolucion_cumple(x,ctx,gm,profundidad+1);
    if (hijo->>'cumple')::boolean then consumir:=consumir||(hijo->'consumir');else ok:=false;faltan:=faltan||(hijo->'faltantes');end if;
   end loop;
   if jsonb_array_length(coalesce(r->'condiciones','[]'))=0 then ok:=false;end if;
   return jsonb_build_object('cumple',ok,'consumir',case when ok then consumir else '[]'::jsonb end,'faltantes',faltan);
  when 'alguna' then
   for x in select * from jsonb_array_elements(coalesce(r->'condiciones','[]')) loop
    hijo:=private.evolucion_cumple(x,ctx,gm,profundidad+1);
    if (hijo->>'cumple')::boolean then return hijo;end if;
    faltan:=faltan||(hijo->'faltantes');
   end loop;
   return jsonb_build_object('cumple',false,'consumir','[]'::jsonb,'faltantes',faltan);
  when 'no' then ok:=not (private.evolucion_cumple(r->'condicion',ctx,gm,profundidad+1)->>'cumple')::boolean;
  when 'edad' then ok:=coalesce((h->>'edad')::numeric,0)>=(r->>'minimo')::numeric;
  when 'nivel' then ok:=(ctx->>'nivel')::numeric>=(r->>'minimo')::numeric;
  when 'experiencia' then ok:=(ctx->>'exp_total')::numeric>=(r->>'minimo')::numeric;
  when 'comparar' then
   v:=coalesce((ctx->'stats'->>(r->>'atributo'))::numeric,0);
   ok:=case r->>'operador' when '<' then v<(r->>'valor')::numeric when '<=' then v<=(r->>'valor')::numeric when '=' then v=(r->>'valor')::numeric when '>=' then v>=(r->>'valor')::numeric when '>' then v>(r->>'valor')::numeric else false end;
  when 'objeto' then ok:=(ctx->'objetos')?(r->>'forja_id');if ok and coalesce((r->>'consumir')::boolean,false) then consumir:=jsonb_build_array(r->>'forja_id');end if;
  when 'habilidad' then ok:=(ctx->'objetos')?(r->>'forja_id');
  when 'derrotar' then ok:=coalesce((h->'derrotados'->>(r->>'forja_id'))::numeric,0)>=(r->>'cantidad')::numeric;
  when 'mision' then ok:=coalesce(h->'misiones','[]')?(r->>'clave');
  when 'evento' then ok:=coalesce(h->'eventos','[]')?(r->>'clave');
  when 'energia' then ok:=coalesce((h->'energias'->>(r->>'clave'))::numeric,0)>=(r->>'minimo')::numeric;
  when 'nucleo' then ok:=coalesce((h->'nucleo'->>(r->>'clave'))::numeric,(ctx->'stats'->>(r->>'clave'))::numeric,0)>=(r->>'minimo')::numeric;
  when 'salvacion' then ok:=coalesce((h->'salvaciones'->>((r->>'atributo')||':'||(r->>'cd')))::numeric,-1)>=(r->>'cd')::numeric;
  when 'autorizacion_gm' then ok:=gm;
  else ok:=false;
 end case;
 return jsonb_build_object('cumple',ok,'consumir',case when ok then consumir else '[]'::jsonb end,'faltantes',case when ok then '[]'::jsonb else jsonb_build_array(coalesce(r->>'tipo','requisito')) end);
end;$$;
revoke all on function private.evolucion_cumple(jsonb,jsonb,boolean,int) from public,anon,authenticated;

create or replace function private.evolucion_en_combate_activo(p_personaje bigint) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m where b.datos->>'fase' in ('preparacion','en_curso') and m->>'personaje_id'=p_personaje::text);
$$;
revoke all on function private.evolucion_en_combate_activo(bigint) from public,anon,authenticated;

-- Inicializa la instancia copiando la línea de su plantilla (o la indicada por el GM). Idempotente.
create or replace function private.evolucion_inicializar(p_personaje bigint,p_linea jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;l jsonb;e jsonb;err text;r public.personaje_evolucion%rowtype;
begin
 if not private.tienda_es_gm() then raise exception 'Solo el GM configura la evolución de un personaje.' using errcode='42501';end if;
 select * into p from public.personajes where id=p_personaje for update;
 if not found then raise exception 'Personaje no encontrado.';end if;
 select * into r from public.personaje_evolucion where personaje_id=p.id;
 if found then return to_jsonb(r);end if;
 l:=coalesce(p_linea,case when p.forja_origen_id is not null then private.evolucion_linea_plantilla(p.forja_origen_id) end);
 if l is null then
  -- Sin plantilla: la ficha actual es su primera etapa de vida.
  l:=jsonb_build_object('version',1,'inicial','origen','etapas',jsonb_build_array(jsonb_build_object('id','origen','tipo','etapa_vida','nombre',p.nombre,'stats',coalesce(p.atributos,'{}'::jsonb),'habilidades','[]'::jsonb,'pasivas','[]'::jsonb,'retrato',p.imagen_url)),'transiciones','[]'::jsonb);
 end if;
 err:=private.evolucion_validar_linea(l);if err is not null then raise exception '%',err using errcode='22023';end if;
 insert into public.personaje_evolucion(personaje_id,linea,etapa_actual) values(p.id,l,l->>'inicial') returning * into r;
 select x into e from jsonb_array_elements(l->'etapas') x where x->>'id'=l->>'inicial';
 insert into public.personaje_etapas_historial(personaje_id,etapa_id,snapshot,ficha,autorizado_por,origen)
  values(p.id,l->>'inicial',e,jsonb_build_object('nivel',p.nivel,'exp_total',p.exp_total,'stats',p.atributos),auth.uid(),'inicial');
 return to_jsonb(r);
end;$$;
revoke all on function private.evolucion_inicializar(bigint,jsonb) from public,anon;
grant execute on function private.evolucion_inicializar(bigint,jsonb) to authenticated;

-- El GM edita la copia de la instancia (etapas futuras). Nunca toca la plantilla ni el historial.
create or replace function private.evolucion_guardar_linea(p_personaje bigint,p_linea jsonb,p_version int) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.personaje_evolucion%rowtype;err text;
begin
 if not private.tienda_es_gm() then raise exception 'Solo el GM edita la línea evolutiva.' using errcode='42501';end if;
 select * into r from public.personaje_evolucion where personaje_id=p_personaje for update;
 if not found then raise exception 'Inicializa primero la evolución del personaje.';end if;
 if r.version<>p_version then raise exception 'Otra persona cambió esta línea. Recarga antes de guardar.' using errcode='40001';end if;
 err:=private.evolucion_validar_linea(p_linea);if err is not null then raise exception '%',err using errcode='22023';end if;
 if not exists(select 1 from jsonb_array_elements(p_linea->'etapas') e where e->>'id'=r.etapa_actual) then raise exception 'No puedes eliminar la etapa actual del personaje.';end if;
 update public.personaje_evolucion set linea=p_linea,version=version+1,updated_at=now() where personaje_id=p_personaje returning * into r;
 return to_jsonb(r);
end;$$;
revoke all on function private.evolucion_guardar_linea(bigint,jsonb,int) from public,anon;
grant execute on function private.evolucion_guardar_linea(bigint,jsonb,int) to authenticated;

/*
 Transición permanente atómica:
  - el cierre de un encuentro real la invoca internamente (yugen.evolucion_interna) con la autoridad del GM que la ordenó;
  - bloquea personaje y evolución (serializa clics repetidos y solicitudes simultáneas);
  - el mismo action_id devuelve el resultado anterior sin aplicar nada (idempotencia);
  - valida que la transición parta de la etapa actual y que la ruta siga abierta;
  - comprueba los requisitos con datos del servidor; solo el GM puede forzar;
  - reconcilia recursos sin curación gratuita (salvo recuperación configurada);
  - consume objetos requeridos (nunca ligados al alma) y no duplica ninguno;
  - conserva id, dueño, nivel, EXP, inventario, monedas, relaciones, logros y grupos.
*/
create or replace function private.evolucion_aplicar_interno(p_personaje bigint,p_transicion text,p_action_id uuid,p_origen text,p_forzar boolean,p_combate uuid,p_etapa text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;ev public.personaje_evolucion%rowtype;t jsonb;destino jsonb;eval jsonb;gm boolean:=private.tienda_es_gm();
 nuevos jsonb;base_antes numeric;base_despues numeric;bono numeric;maximo numeric;ph_max numeric;vida numeric;ph numeric;rec jsonb;previa public.personaje_etapas_historial%rowtype;reg public.personaje_etapas_historial%rowtype;
 cerradas jsonb;x text;obj uuid;
begin
 if p_action_id is null then raise exception 'Falta el identificador de la acción.';end if;
 if p_origen='combate' and coalesce(current_setting('yugen.evolucion_interna',true),'')='1' then gm:=true;end if;
 select * into p from public.personajes where id=p_personaje for update;
 if not found then raise exception 'Personaje no encontrado.';end if;
 select * into ev from public.personaje_evolucion where personaje_id=p.id for update;
 if not found then raise exception 'Este personaje aún no tiene línea evolutiva.';end if;
 select * into previa from public.personaje_etapas_historial where action_id=p_action_id;
 if found then
  if previa.personaje_id<>p.id then raise exception 'Identificador de acción ya usado.';end if;
  return jsonb_build_object('repetida',true,'etapa_actual',ev.etapa_actual,'registro',to_jsonb(previa));
 end if;
 if p_transicion is not null then
  select x2 into t from jsonb_array_elements(ev.linea->'transiciones') x2 where x2->>'id'=p_transicion;
  if t is null then raise exception 'Esa evolución no existe en esta línea.';end if;
 elsif p_origen in ('combate','gm') and p_etapa is not null then
  -- El GM puede llevar al personaje a una etapa conectada sin elegir la conexión.
  select x2 into t from jsonb_array_elements(ev.linea->'transiciones') x2 where x2->>'desde'=ev.etapa_actual and x2->>'hasta'=p_etapa limit 1;
  if t is null then raise exception 'No hay una conexión desde la etapa actual hacia esa etapa.';end if;
 else raise exception 'Indica la evolución.';end if;
 if t->>'desde'<>ev.etapa_actual then raise exception 'La evolución no parte de la etapa actual.';end if;
 if coalesce(ev.hitos->'rutas_cerradas','[]')?(t->>'id') then raise exception 'Esa ruta quedó cerrada por una evolución exclusiva.';end if;
 if p_origen='automatica' and t->>'modo'<>'automatica' then raise exception 'Esta evolución no es automática.' using errcode='42501';end if;
 if p_origen='gm' and not gm then raise exception 'Solo el GM puede autorizar esta evolución.' using errcode='42501';end if;
 if p_origen='combate' and not gm then raise exception 'Solo el GM registra evoluciones de combate.' using errcode='42501';end if;
 eval:=private.evolucion_cumple(t->'requisito',private.evolucion_contexto(p.id,ev.hitos),gm);
 if not (eval->>'cumple')::boolean and not (gm and p_forzar) then raise exception 'Faltan requisitos: %',(select string_agg(v,', ') from jsonb_array_elements_text(eval->'faltantes') v) using errcode='P0001';end if;
 select x2 into destino from jsonb_array_elements(ev.linea->'etapas') x2 where x2->>'id'=t->>'hasta';
 if p.estado_vida<>'muerto' then
  if p.estado_aprobacion<>'aprobado' then raise exception 'El personaje no está disponible.';end if;
  if p_origen<>'combate' and private.evolucion_en_combate_activo(p.id) then raise exception 'Evoluciona durante el encuentro o al terminarlo.';end if;
  -- Consumo exacto de los objetos requeridos: una copia por requisito, nunca ligada al alma.
  if (eval->>'cumple')::boolean then
   for x in select * from jsonb_array_elements_text(eval->'consumir') loop
    select i.id into obj from public.inventario_jugador i where i.personaje_id=p.id and i.user_id=p.user_id and i.forja_id::text=x and not coalesce(i.ligado_al_alma,false) order by i.created_at,i.id limit 1 for update;
    if obj is null then raise exception 'No se puede consumir un objeto ligado al alma.';end if;
    delete from public.inventario_jugador where id=obj;
   end loop;
  end if;
  nuevos:=coalesce(p.atributos,'{}'::jsonb)||coalesce(destino->'stats','{}'::jsonb);
  if p_origen='combate' then
   -- El combate ya reconcilió vida y PH al evolucionar; solo se guardan las estadísticas permanentes.
   vida:=p.vida_actual;ph:=p.ph_actual;maximo:=p.vida_maxima_actual;
  else
   base_antes:=greatest(1,coalesce((p.atributos->>'vida')::numeric,(p.atributos->>'hp')::numeric,1));
   bono:=greatest(0,coalesce(p.vida_maxima_actual,base_antes)-base_antes);
   base_despues:=greatest(1,coalesce((nuevos->>'vida')::numeric,(nuevos->>'hp')::numeric,1));
   maximo:=base_despues+bono;ph_max:=greatest(0,coalesce((nuevos->>'ph')::numeric,0));
   vida:=least(coalesce(p.vida_actual,maximo),maximo);ph:=least(coalesce(p.ph_actual,0),ph_max);
   rec:=coalesce(t->'recuperacion','{"modo":"ninguna"}');
   if rec->>'modo'='completa' then vida:=maximo;ph:=ph_max;
   elsif rec->>'modo'='proporcional' then vida:=greatest(1,least(maximo,round(coalesce(p.vida_actual,0)/greatest(1,coalesce(p.vida_maxima_actual,base_antes))*maximo)));ph:=least(ph_max,round(coalesce(p.ph_actual,0)/greatest(1,coalesce((p.atributos->>'ph')::numeric,1))*ph_max));
   elsif rec->>'modo'='fija' then vida:=least(maximo,vida+coalesce((rec->>'vida')::numeric,0));ph:=least(ph_max,ph+coalesce((rec->>'ph')::numeric,0));
   end if;
   if bono=0 then maximo:=null;end if;
  end if;
  update public.personajes set atributos=nuevos,vida_actual=vida,vida_maxima_actual=maximo,ph_actual=ph,raza=coalesce(nullif(destino->>'raza',''),raza) where id=p.id;
  if nullif(destino->>'retrato','') is not null then
   begin update public.personajes set imagen_url=destino->>'retrato' where id=p.id;
   exception when check_violation or undefined_column then null;end;
  end if;
 end if;
 cerradas:=case when coalesce((t->>'exclusiva')::boolean,false) then (select coalesce(jsonb_agg(y->>'id'),'[]') from jsonb_array_elements(ev.linea->'transiciones') y where y->>'desde'=t->>'desde' and y->>'id'<>t->>'id') else '[]'::jsonb end;
 update public.personaje_evolucion set etapa_actual=t->>'hasta',version=version+1,updated_at=now(),
  hitos=jsonb_set(hitos,'{rutas_cerradas}',coalesce(hitos->'rutas_cerradas','[]')||cerradas) where personaje_id=p.id;
 insert into public.personaje_etapas_historial(personaje_id,etapa_id,desde_etapa,transicion_id,snapshot,ficha,autorizado_por,origen,condiciones,combate_id,action_id)
  values(p.id,t->>'hasta',t->>'desde',t->>'id',destino,
   jsonb_build_object('nivel',p.nivel,'exp_total',p.exp_total,'stats',case when p.estado_vida='muerto' then p.atributos else nuevos end),
   auth.uid(),p_origen,case when (eval->>'cumple')::boolean then jsonb_build_array('Requisitos cumplidos') else jsonb_build_array('Forzada por el GM')||(eval->'faltantes') end,p_combate,p_action_id)
  returning * into reg;
 -- Si ya está en el cementerio, su registro conserva la etapa en la que terminó.
 update public.cementerio_personajes set snapshot=snapshot||jsonb_build_object('evolucion',private.evolucion_resumen(p.id)) where personaje_id=p.id;
 return jsonb_build_object('repetida',false,'etapa_actual',t->>'hasta','registro',to_jsonb(reg));
end;$$;
revoke all on function private.evolucion_aplicar_interno(bigint,text,uuid,text,boolean,uuid,text) from public,anon,authenticated;

create or replace function private.evolucion_resumen(p_personaje bigint) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('etapa_actual',e.etapa_actual,
  'etapa',(select x from jsonb_array_elements(e.linea->'etapas') x where x->>'id'=e.etapa_actual),
  'historial',coalesce((select jsonb_agg(jsonb_build_object('etapa_id',h.etapa_id,'nombre',h.snapshot->>'nombre','snapshot',h.snapshot,'ficha',h.ficha,'origen',h.origen,'autorizado_por',h.autorizado_por,'created_at',h.created_at) order by h.created_at,h.id) from public.personaje_etapas_historial h where h.personaje_id=e.personaje_id),'[]'::jsonb))
 from public.personaje_evolucion e where e.personaje_id=p_personaje;
$$;
revoke all on function private.evolucion_resumen(bigint) from public,anon,authenticated;

create or replace function private.evolucion_aplicar(p_personaje bigint,p_transicion text,p_action_id uuid,p_forzar boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare dueno uuid;
begin
 if auth.uid() is null then raise exception 'Inicia sesión.' using errcode='42501';end if;
 if private.tienda_es_gm() then return private.evolucion_aplicar_interno(p_personaje,p_transicion,p_action_id,'gm',p_forzar,null);end if;
 select user_id into dueno from public.personajes where id=p_personaje;
 if dueno is distinct from auth.uid() then raise exception 'Este personaje no es tuyo.' using errcode='42501';end if;
 -- El jugador solo dispara las automáticas; el resto pasa por solicitud y aprobación del GM.
 return private.evolucion_aplicar_interno(p_personaje,p_transicion,p_action_id,'automatica',false,null);
end;$$;
revoke all on function private.evolucion_aplicar(bigint,text,uuid,boolean) from public,anon;
grant execute on function private.evolucion_aplicar(bigint,text,uuid,boolean) to authenticated;

create or replace function private.evolucion_solicitar(p_personaje bigint,p_transicion text,p_action_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.personajes%rowtype;ev public.personaje_evolucion%rowtype;t jsonb;dest jsonb;s public.evolucion_solicitudes%rowtype;eval jsonb;
begin
 select * into s from public.evolucion_solicitudes where action_id=p_action_id;
 if found then if s.user_id<>auth.uid() then raise exception 'Identificador de acción ya usado.';end if;return to_jsonb(s);end if;
 select * into p from public.personajes where id=p_personaje for update;
 if not found or p.user_id is distinct from auth.uid() then raise exception 'Este personaje no es tuyo.' using errcode='42501';end if;
 if p.estado_vida<>'vivo' or p.estado_aprobacion<>'aprobado' then raise exception 'El personaje no está disponible.';end if;
 select * into ev from public.personaje_evolucion where personaje_id=p.id;
 select x into t from jsonb_array_elements(ev.linea->'transiciones') x where x->>'id'=p_transicion and x->>'desde'=ev.etapa_actual;
 select x into dest from jsonb_array_elements(ev.linea->'etapas') x where x->>'id'=t->>'hasta';
 -- Una evolución secreta o hacia una etapa secreta no existe para el jugador.
 if t is null or coalesce((t->>'secreta')::boolean,false) or coalesce((dest->>'secreta')::boolean,false) or coalesce(ev.hitos->'rutas_cerradas','[]')?(t->>'id') then raise exception 'Esa evolución no está disponible.';end if;
 if t->>'modo'<>'solicitud_jugador' then raise exception 'Esta evolución no se solicita: la activa el GM o el propio juego.' using errcode='42501';end if;
 eval:=private.evolucion_cumple(t->'requisito',private.evolucion_contexto(p.id,ev.hitos),true);
 if not (eval->>'cumple')::boolean then raise exception 'Todavía no cumples los requisitos.';end if;
 insert into public.evolucion_solicitudes(personaje_id,transicion_id,user_id,action_id) values(p.id,p_transicion,p.user_id,p_action_id)
  on conflict (personaje_id,transicion_id) where estado='pendiente' do nothing returning * into s;
 if s.id is null then select * into s from public.evolucion_solicitudes where personaje_id=p.id and transicion_id=p_transicion and estado='pendiente';end if;
 return to_jsonb(s);
end;$$;
revoke all on function private.evolucion_solicitar(bigint,text,uuid) from public,anon;
grant execute on function private.evolucion_solicitar(bigint,text,uuid) to authenticated;

create or replace function private.evolucion_resolver_solicitud(p_solicitud uuid,p_aprobar boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.evolucion_solicitudes%rowtype;r jsonb:='{}';
begin
 if not private.tienda_es_gm() then raise exception 'Solo el GM resuelve solicitudes.' using errcode='42501';end if;
 select * into s from public.evolucion_solicitudes where id=p_solicitud for update;
 if not found then raise exception 'Solicitud no encontrada.';end if;
 if s.estado<>'pendiente' then return to_jsonb(s);end if;
 if p_aprobar then r:=private.evolucion_aplicar_interno(s.personaje_id,s.transicion_id,s.action_id,'jugador',false,null);end if;
 update public.evolucion_solicitudes set estado=case when p_aprobar then 'aprobada' else 'rechazada' end,resuelta_por=auth.uid(),resuelta_at=now() where id=s.id returning * into s;
 return to_jsonb(s)||jsonb_build_object('resultado',r);
end;$$;
revoke all on function private.evolucion_resolver_solicitud(uuid,boolean) from public,anon;
grant execute on function private.evolucion_resolver_solicitud(uuid,boolean) to authenticated;

-- Hitos que el motor no deduce de la ficha. Tras anotarlos, aplica las evoluciones automáticas que ya se cumplan.
create or replace function private.evolucion_registrar_hito(p_personaje bigint,p_tipo text,p_clave text,p_valor numeric default 1) returns jsonb language plpgsql security definer set search_path='' as $$
declare h jsonb;
begin
 if not private.tienda_es_gm() then raise exception 'Solo el GM registra hitos de campaña.' using errcode='42501';end if;
 select hitos into h from public.personaje_evolucion where personaje_id=p_personaje for update;
 if not found then raise exception 'Este personaje aún no tiene línea evolutiva.';end if;
 if length(coalesce(p_clave,''))>200 or (p_tipo<>'edad' and btrim(coalesce(p_clave,''))='') then raise exception 'Hito inválido.';end if;
 h:=case p_tipo
  when 'mision' then jsonb_set(h,'{misiones}',(select coalesce(jsonb_agg(distinct v),'[]') from jsonb_array_elements(coalesce(h->'misiones','[]')||to_jsonb(p_clave)) v))
  when 'evento' then jsonb_set(h,'{eventos}',(select coalesce(jsonb_agg(distinct v),'[]') from jsonb_array_elements(coalesce(h->'eventos','[]')||to_jsonb(p_clave)) v))
  when 'derrotar' then jsonb_set(h,'{derrotados}',coalesce(h->'derrotados','{}')||jsonb_build_object(p_clave,coalesce((h->'derrotados'->>p_clave)::numeric,0)+greatest(1,p_valor)))
  when 'energia' then jsonb_set(h,'{energias}',coalesce(h->'energias','{}')||jsonb_build_object(p_clave,coalesce((h->'energias'->>p_clave)::numeric,0)+p_valor))
  when 'nucleo' then jsonb_set(h,'{nucleo}',coalesce(h->'nucleo','{}')||jsonb_build_object(p_clave,p_valor))
  when 'salvacion' then jsonb_set(h,'{salvaciones}',coalesce(h->'salvaciones','{}')||jsonb_build_object(p_clave,p_valor))
  when 'edad' then jsonb_set(h,'{edad}',to_jsonb(p_valor))
  else null end;
 if h is null then raise exception 'Tipo de hito desconocido.';end if;
 update public.personaje_evolucion set hitos=h,updated_at=now() where personaje_id=p_personaje;
 return jsonb_build_object('hitos',h,'automaticas',private.evolucion_automaticas(p_personaje));
end;$$;
revoke all on function private.evolucion_registrar_hito(bigint,text,text,numeric) from public,anon;
grant execute on function private.evolucion_registrar_hito(bigint,text,text,numeric) to authenticated;

-- Aplica, como máximo una vez por etapa, la primera evolución automática cumplida. El action_id es determinista
-- (personaje + conexión + etapa de origen): repetir la comprobación nunca evoluciona dos veces.
create or replace function private.evolucion_automaticas(p_personaje bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare ev public.personaje_evolucion%rowtype;t jsonb;aplicadas jsonb:='[]';vueltas int:=0;
begin
 loop
  vueltas:=vueltas+1;exit when vueltas>8;
  select * into ev from public.personaje_evolucion where personaje_id=p_personaje;
  exit when not found;
  select x into t from jsonb_array_elements(ev.linea->'transiciones') x
   where x->>'desde'=ev.etapa_actual and x->>'modo'='automatica' and not coalesce(ev.hitos->'rutas_cerradas','[]')?(x->>'id')
     and (private.evolucion_cumple(x->'requisito',private.evolucion_contexto(p_personaje,ev.hitos),false)->>'cumple')::boolean limit 1;
  exit when t is null;
  perform private.evolucion_aplicar_interno(p_personaje,t->>'id',md5(p_personaje||':'||(t->>'id')||':'||ev.etapa_actual)::uuid,'automatica',false,null);
  aplicadas:=aplicadas||to_jsonb(t->>'hasta');
 end loop;
 return aplicadas;
end;$$;
revoke all on function private.evolucion_automaticas(bigint) from public,anon,authenticated;

create or replace function private.evolucion_comprobar(p_personaje bigint) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.tienda_es_gm() and not exists(select 1 from public.personajes where id=p_personaje and user_id=auth.uid()) then raise exception 'Este personaje no es tuyo.' using errcode='42501';end if;
 if private.evolucion_en_combate_activo(p_personaje) then return '[]'::jsonb;end if;
 return private.evolucion_automaticas(p_personaje);
end;$$;
revoke all on function private.evolucion_comprobar(bigint) from public,anon;
grant execute on function private.evolucion_comprobar(bigint) to authenticated;

-- Lectura segura: el GM ve todo; el dueño ve lo vivido, la etapa actual y solo los siguientes pasos no secretos.
create or replace function private.evolucion_vista(p_personaje bigint) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ev public.personaje_evolucion%rowtype;dueno uuid;historial jsonb;siguientes jsonb;actual jsonb;
begin
 select user_id into dueno from public.personajes where id=p_personaje;
 if not private.tienda_es_gm() and dueno is distinct from auth.uid() then raise exception 'Este personaje no es tuyo.' using errcode='42501';end if;
 select * into ev from public.personaje_evolucion where personaje_id=p_personaje;
 if not found then return null;end if;
 select coalesce(jsonb_agg(to_jsonb(h) order by h.created_at,h.id),'[]') into historial from public.personaje_etapas_historial h where h.personaje_id=p_personaje;
 if private.tienda_es_gm() then
  return jsonb_build_object('gm',true,'linea',ev.linea,'etapa_actual',ev.etapa_actual,'hitos',ev.hitos,'version',ev.version,'historial',historial,
   'solicitudes',(select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at),'[]') from public.evolucion_solicitudes s where s.personaje_id=p_personaje and s.estado='pendiente'));
 end if;
 select x into actual from jsonb_array_elements(ev.linea->'etapas') x where x->>'id'=ev.etapa_actual;
 select coalesce(jsonb_agg(jsonb_build_object('transicion_id',t->>'id','modo',t->>'modo','requisito',t->'requisito',
   'etapa',jsonb_build_object('id',d->>'id','nombre',d->>'nombre','tipo',d->>'tipo','retrato',d->'retrato','edad',d->'edad','descripcion',d->'descripcion'),
   'cumple',(private.evolucion_cumple(t->'requisito',private.evolucion_contexto(p_personaje,ev.hitos),t->>'modo'='solicitud_jugador')->>'cumple')::boolean)),'[]')
  into siguientes
  from jsonb_array_elements(ev.linea->'transiciones') t join lateral (select x from jsonb_array_elements(ev.linea->'etapas') x where x->>'id'=t->>'hasta') e(d) on true
  where t->>'desde'=ev.etapa_actual and not coalesce((t->>'secreta')::boolean,false) and not coalesce((d->>'secreta')::boolean,false)
    and not coalesce(ev.hitos->'rutas_cerradas','[]')?(t->>'id');
 return jsonb_build_object('gm',false,'etapa_actual',ev.etapa_actual,'actual',actual,'historial',historial,'siguientes',siguientes,
  'solicitudes',(select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at),'[]') from public.evolucion_solicitudes s where s.personaje_id=p_personaje));
end;$$;
revoke all on function private.evolucion_vista(bigint) from public,anon;
grant execute on function private.evolucion_vista(bigint) to authenticated;

-- Al cerrar un encuentro real, las evoluciones ocurridas en combate pasan a la ficha. En práctica, nunca.
create or replace function private.combate_persistir_evoluciones() returns trigger language plpgsql security definer set search_path='' as $$
declare m jsonb;
begin
 if new.datos->>'fase'<>'finalizado' or (tg_op='UPDATE' and old.datos->>'fase'='finalizado') then return new;end if;
 if coalesce(new.datos->'politica'->>'modo','oficial')='entrenamiento' then return new;end if;
 for m in select z from jsonb_array_elements(new.datos->'miembros') z
  where coalesce((z->'evolucion'->>'persistir')::boolean,false) and z->>'personaje_id' ~ '^[0-9]+$' and z->'etapa_historica' is null loop
  if exists(select 1 from public.personaje_evolucion where personaje_id=(m->>'personaje_id')::bigint) then
   -- Un fallo de evolución nunca impide cerrar el encuentro: se avisa y la ficha conserva su etapa anterior.
   begin
    perform set_config('yugen.evolucion_interna','1',true);
    perform private.evolucion_aplicar_interno((m->>'personaje_id')::bigint,nullif(m->'evolucion'->>'transicion_id',''),(m->'evolucion'->>'action_id')::uuid,'combate',true,new.id,m->'evolucion'->>'etapa_id');
    perform set_config('yugen.evolucion_interna','',true);
   exception when others then
    perform set_config('yugen.evolucion_interna','',true);
    raise warning 'Evolución de combate no guardada para %: %',m->>'nombre',sqlerrm;
   end;
  end if;
 end loop;
 return new;
end;$$;
revoke all on function private.combate_persistir_evoluciones() from public,anon,authenticated;
drop trigger if exists zz_combate_persistir_evoluciones on public.combates_yugen;
create trigger zz_combate_persistir_evoluciones after insert or update of datos on public.combates_yugen for each row execute function private.combate_persistir_evoluciones();

-- El cementerio conserva la etapa en la que murió y todo su historial de evolución.
create or replace function private.cementerio_evolucion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.personaje_evolucion where personaje_id=new.personaje_id) then
  new.snapshot:=coalesce(new.snapshot,'{}'::jsonb)||jsonb_build_object('evolucion',private.evolucion_resumen(new.personaje_id));
 end if;
 return new;
end;$$;
revoke all on function private.cementerio_evolucion() from public,anon,authenticated;
drop trigger if exists cementerio_evolucion on public.cementerio_personajes;
create trigger cementerio_evolucion before insert on public.cementerio_personajes for each row execute function private.cementerio_evolucion();

-- Envoltorios públicos (security invoker), como el resto de RPC de YUGEN.
create or replace function public.evolucion_inicializar(p_personaje bigint,p_linea jsonb default null) returns jsonb language sql security invoker set search_path='' as $$select private.evolucion_inicializar(p_personaje,p_linea)$$;
create or replace function public.evolucion_guardar_linea(p_personaje bigint,p_linea jsonb,p_version int) returns jsonb language sql security invoker set search_path='' as $$select private.evolucion_guardar_linea(p_personaje,p_linea,p_version)$$;
create or replace function public.evolucion_aplicar(p_personaje bigint,p_transicion text,p_action_id uuid,p_forzar boolean default false) returns jsonb language sql security invoker set search_path='' as $$select private.evolucion_aplicar(p_personaje,p_transicion,p_action_id,p_forzar)$$;
create or replace function public.evolucion_solicitar(p_personaje bigint,p_transicion text,p_action_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.evolucion_solicitar(p_personaje,p_transicion,p_action_id)$$;
create or replace function public.evolucion_resolver_solicitud(p_solicitud uuid,p_aprobar boolean) returns jsonb language sql security invoker set search_path='' as $$select private.evolucion_resolver_solicitud(p_solicitud,p_aprobar)$$;
create or replace function public.evolucion_registrar_hito(p_personaje bigint,p_tipo text,p_clave text,p_valor numeric default 1) returns jsonb language sql security invoker set search_path='' as $$select private.evolucion_registrar_hito(p_personaje,p_tipo,p_clave,p_valor)$$;
create or replace function public.evolucion_comprobar(p_personaje bigint) returns jsonb language sql security invoker set search_path='' as $$select private.evolucion_comprobar(p_personaje)$$;
create or replace function public.evolucion_vista(p_personaje bigint) returns jsonb language sql security invoker set search_path='' as $$select private.evolucion_vista(p_personaje)$$;
revoke all on function public.evolucion_inicializar(bigint,jsonb),public.evolucion_guardar_linea(bigint,jsonb,int),public.evolucion_aplicar(bigint,text,uuid,boolean),public.evolucion_solicitar(bigint,text,uuid),public.evolucion_resolver_solicitud(uuid,boolean),public.evolucion_registrar_hito(bigint,text,text,numeric),public.evolucion_comprobar(bigint),public.evolucion_vista(bigint) from public,anon;
grant execute on function public.evolucion_inicializar(bigint,jsonb),public.evolucion_guardar_linea(bigint,jsonb,int),public.evolucion_aplicar(bigint,text,uuid,boolean),public.evolucion_solicitar(bigint,text,uuid),public.evolucion_resolver_solicitud(uuid,boolean),public.evolucion_registrar_hito(bigint,text,text,numeric),public.evolucion_comprobar(bigint),public.evolucion_vista(bigint) to authenticated;
commit;
