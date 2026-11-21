-- Datos mínimos para revertir el catálogo sin copiar fichas ni sesiones.
create table private.respaldo_balance_v1 (
 origen text not null, clave text not null, valor jsonb not null, primary key(origen,clave)
);
alter table private.respaldo_balance_v1 enable row level security;
revoke all on private.respaldo_balance_v1 from public,anon,authenticated;
insert into private.respaldo_balance_v1
 select 'clase',id::text,jsonb_build_object('clase',clase) from public.forja_maestra
 union all select 'racial',clave,jsonb_build_object('pasiva_racial',pasiva_racial)
 from public.categorias_forja where clave in ('dragones','gigantes','hombres_bestia')
 union all select 'atributo',id::text,jsonb_build_object('categoria',categoria,'clave',clave,'valor_defecto',valor_defecto,'limite_jugador',limite_jugador)
 from public.config_estadisticas where categoria in ('personajes','kuro','elfos','enanos','dragones','gigantes','hombres_bestia','hadas')
 union all select 'funcion',p.oid::regprocedure::text,to_jsonb(pg_get_functiondef(p.oid))
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
 ('forja_validar_carga_y_clase','forja_clase_calculada','forja_puntuacion_calculada')
 union all select 'trigger',tgname,to_jsonb(pg_get_triggerdef(oid))
 from pg_trigger where tgrelid='public.forja_maestra'::regclass and tgname='aa_forja_carga_y_clase';
