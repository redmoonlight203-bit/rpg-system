import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
// Paso 2.2: la definición consolidada debe ser idéntica a la que resulta de aplicar la cadena real
// de migraciones (definiciones completas del 10-11 + reemplazos del 14-11), y abortar si no lo es.
const db=new PGlite();
const sql=n=>readFileSync(new URL('../supabase/migrations/'+n,import.meta.url),'utf8');
const CONSOLIDACION='20261116130000_consolidar_funciones_combate.sql';
const firmas=['public.combate_guardar_ligero(uuid,text,jsonb,integer,boolean)','yugen_interno.confirmar_jugador_rapido(uuid,uuid,text,integer,jsonb)','public.combate_eliminar(uuid,integer)'];
const estado=async()=>(await db.query(`select p.oid::regprocedure::text f,p.prosrc,p.proconfig,p.prosecdef from pg_proc p
 where p.oid = any($1::regprocedure[]) order by 1`,[firmas])).rows;
try{
 await db.exec(`create role anon;create role authenticated;create schema private;create schema auth;create schema yugen_interno;
 create function auth.uid() returns uuid language sql as $$select null::uuid$$;
 create function private.tienda_es_gm() returns boolean language sql as $$select true$$;
 create table public.perfiles(id uuid primary key,rol text);
 create table public.combates_yugen(id uuid primary key,creador_id uuid,version int default 1,nombre text,datos jsonb,updated_at timestamptz default now());
 create table public.resultados_encuentro(combate_id uuid,aprobado boolean,datos jsonb);
 create table public.tablas_botin(id uuid);
 create function private.personaje_vitales() returns trigger language plpgsql as $$begin if new.vida_actual=0 or new.estado_vida='muerto' then new.estado_vida:='muerto';end if;return new;end$$;
 create function private.personaje_preparar(bigint) returns jsonb language plpgsql as $$declare vida numeric;maximo numeric;p record;begin vida:=greatest(1,maximo-greatest(0,1-p.vida_actual));return '{}'::jsonb;end$$;`);
 // Cadena real, en orden de aplicación.
 await db.exec(sql('20261110125629_historial_sin_imagenes.sql'));
 await db.exec(sql('20261110125639_borrar_encuentros_terminados.sql'));
 await db.exec(sql('20261110132400_trigger_ciclo_selectivo.sql'));
 await db.exec(sql('20261114144211_estabilizacion_guia_v2.sql'));
 const antes=await estado();
 assert.equal(antes.length,3);
 assert.match(antes.find(x=>x.f.includes('guardar_ligero')).prosrc,/Un encuentro terminado no se puede deshacer/,'la cadena incluye el parche del 14-11');

 // 1. Aplicada sobre la cadena real: pasa y no cambia nada.
 await db.exec(sql(CONSOLIDACION));
 assert.deepEqual(await estado(),antes,'cuerpo, configuración y SECURITY DEFINER idénticos');
 const copias=(await db.query("select count(*)::int n from private.estabilizacion_copias where clave like 'consolidacion-2.2:%'")).rows[0].n;
 assert.equal(copias,3,'guarda la definición previa de las tres funciones');
 // El script de verificación previa para producción reconoce esta cadena.
 const verificacion=(await db.query(readFileSync(new URL('../scripts/verificar-consolidacion-2.2.sql',import.meta.url),'utf8'))).rows;
 assert.equal(verificacion.length,3);
 for(const v of verificacion){assert.equal(v.cuerpo,'coincide',v.funcion);assert.equal(v.configuracion,'coincide',v.funcion);assert.equal(v.security_definer,true);}
 // Repetible.
 await db.exec(sql(CONSOLIDACION));
 assert.deepEqual(await estado(),antes);

 // 1b. Producción tenía parte de combate_eliminar con saltos CRLF y un espacio en una línea vacía: se acepta y se normaliza.
 const elim=(await db.query("select pg_get_functiondef('public.combate_eliminar(uuid,integer)'::regprocedure) d")).rows[0].d;
 const conCrlf=elim.replace("borrarlo.';end if;\n\n","borrarlo.';end if;\n \r\n").replace(/;\n (if exists|raise|end if;\n delete|delete)/g,';\r\n $1');
 assert.notEqual(conCrlf,elim);await db.exec(conCrlf);
 assert.match((await db.query("select prosrc from pg_proc where oid='public.combate_eliminar(uuid,integer)'::regprocedure")).rows[0].prosrc,/\r\n/);
 await db.exec(sql(CONSOLIDACION));
 assert.deepEqual(await estado(),antes,'tras aplicar, el cuerpo queda normalizado a LF');
 // 2. Si la base tiene otra versión de una función, aborta y no aplica nada.
 await db.exec(`create or replace function public.combate_eliminar(p_id uuid,p_version integer) returns void language plpgsql security definer set search_path to 'public','pg_temp' as $$begin null;end;$$`);
 const distinta=await estado();
 await assert.rejects(db.exec(sql(CONSOLIDACION)),/combate_eliminar.*no coincide/);
 await db.exec('rollback');
 assert.deepEqual(await estado(),distinta,'la transacción fallida no deja cambios');
 await db.exec(sql('20261110125639_borrar_encuentros_terminados.sql'));

 // 3. También aborta si cambia la configuración (por ejemplo, se pierde lock_timeout).
 await db.exec("alter function public.combate_guardar_ligero(uuid,text,jsonb,integer,boolean) reset lock_timeout");
 await assert.rejects(db.exec(sql(CONSOLIDACION)),/configuración de (public\.)?combate_guardar_ligero/);
 await db.exec('rollback');

 // Permisos: el cliente no lee las copias privadas.
 await db.exec('set role authenticated');
 await assert.rejects(db.query('select * from private.estabilizacion_copias'),/permission denied/);
 console.log('SQL: consolidación 2.2 idéntica a la cadena real de migraciones; aborta sin cambios si producción difiere.');
}finally{await db.close();}
