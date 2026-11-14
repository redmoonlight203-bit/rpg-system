-- No se permite deshacer un cierre: el historial técnico no es parte del resultado.
-- Copia previa privada para recuperar exactamente los registros afectados.
create table private.estabilizacion_copias (
 clave text primary key, creado_at timestamptz not null default now(), contenido jsonb not null
);
alter table private.estabilizacion_copias enable row level security;
revoke all on private.estabilizacion_copias from public,anon,authenticated;
insert into private.estabilizacion_copias(clave,contenido)
select 'guia-v2:combate:'||b.id,to_jsonb(b) from public.combates_yugen b
where b.datos->>'fase'='finalizado' and b.datos ? 'historial';
insert into private.estabilizacion_copias(clave,contenido)
select 'guia-v2:funcion:'||p.oid::regprocedure::text,to_jsonb(pg_get_functiondef(p.oid))
from pg_proc p where p.oid in ('private.encuentro_validar_ciclo()'::regprocedure,'public.combate_guardar_ligero(uuid,text,jsonb,integer,boolean)'::regprocedure,'private.personaje_vitales()'::regprocedure,'private.personaje_preparar(bigint)'::regprocedure);


-- Guía v2: 0 HP conserva la vida; solo la muerte explícita activa alma y cementerio.
-- Acepta la corrección que ya existía en producción, sin reescribir resurrecciones.
do $$declare d text;viejo text:='if new.vida_actual=0 or new.estado_vida=''muerto'' then';nuevo text:='if new.estado_vida=''muerto'' then';begin
 d:=pg_get_functiondef('private.personaje_vitales()'::regprocedure);
 if strpos(d,viejo)>0 then execute replace(d,viejo,nuevo);
 elsif strpos(d,nuevo)=0 then raise exception 'Definición de vitales desconocida';end if;
 d:=pg_get_functiondef('private.personaje_preparar(bigint)'::regprocedure);
 if strpos(d,'vida:=greatest(1,maximo-')=0 then raise exception 'Definición de preparación desconocida';end if;
 -- Un inconsciente no recupera 1 HP simplemente por volver a cargar su ficha.
 d:=replace(d,'vida:=greatest(1,maximo-','vida:=case when p.vida_actual=0 then 0 else greatest(1,maximo-');
 d:=replace(d,'-p.vida_actual));','-p.vida_actual)) end;');
 execute d;
end;$$;


do $$declare d text;viejo text:='and new.datos is distinct from old.datos';begin
 d:=pg_get_functiondef('private.encuentro_validar_ciclo()'::regprocedure);
 if strpos(d,viejo)=0 then raise exception 'Definición de ciclo desconocida';end if;
 d:=replace(d,viejo,'and (new.datos-''historial'') is distinct from (old.datos-''historial'')');
 -- Normalizar ANTES de validar la inmutabilidad; jamás se aceptan nuevos deshacer.
 d:=replace(d,'begin','begin
 if new.datos->>''fase''=''finalizado'' then new.datos:=new.datos-''historial'';end if;');
 execute d;
 d:=pg_get_functiondef('public.combate_guardar_ligero(uuid,text,jsonb,integer,boolean)'::regprocedure);
 if strpos(d,'respuesta:=public.combate_guardar')=0 then raise exception 'Guardado ligero desconocido';end if;
 d:=replace(d,'if p_deshacer then','if p_deshacer and b.datos->>''fase''=''finalizado'' then raise exception ''Un encuentro terminado no se puede deshacer.'';end if;
 if p_deshacer then');
 d:=replace(d,'respuesta:=public.combate_guardar','if datos->>''fase''=''finalizado'' then historial:=''[]''::jsonb;end if;
 respuesta:=public.combate_guardar');
 execute d;
end;$$;
update public.combates_yugen set datos=datos-'historial',version=version+1,updated_at=now()
where datos->>'fase'='finalizado' and datos ? 'historial';
