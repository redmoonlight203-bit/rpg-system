// Pendiente 4 (plan «Yunque · una más»): forma única por artefacto y solo artefactos en artefacto_portar.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
const gm='00000000-0000-0000-0000-000000000001';
const migracion=f=>readFileSync(new URL('../supabase/migrations/'+f,import.meta.url),'utf8');
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table perfiles(id uuid primary key,rol text);
 create function private.tienda_es_gm() returns boolean language sql stable as $$select exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI')$$;
 create table personajes(id bigserial primary key,user_id uuid,nombre text);
 create table forja_maestra(id uuid primary key default gen_random_uuid(),nombre text,tipo_creacion text);
 grant usage on schema public,private,auth to authenticated;grant select on personajes,perfiles,forja_maestra to authenticated;`);
 await db.query("insert into perfiles values($1,'KUROI')",[gm]);
 await db.query("insert into personajes(id,nombre) values(1,'Aiko'),(2,'Bram')");
 const sql=migracion('20261123100000_artefactos_con_nivel.sql')+migracion('20261123100100_portadores_artefacto.sql')+migracion('20261124090000_portadores_unicos.sql');
 await db.exec(sql);await db.exec(migracion('20261124090000_portadores_unicos.sql'));// idempotente
 const mao=(await db.query("insert into forja_maestra(nombre,tipo_creacion,configuracion_artefacto) values('Mao','objeto','{}') returning id")).rows[0].id;
 const palo=(await db.query("insert into forja_maestra(nombre,tipo_creacion) values('Palo','objeto') returning id")).rows[0].id;
 await db.query("insert into portadores_artefacto(artefacto_id,personaje_id,forma_tirada) values($1,1,7)",[mao]);
 await assert.rejects(db.query("insert into portadores_artefacto(artefacto_id,personaje_id,forma_tirada) values($1,2,7)",[mao]),/duplicate|unique/i,'dos portadores con la misma forma');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[gm]);await db.exec('set role authenticated');
 await assert.rejects(db.query('select artefacto_portar($1,2)',[palo]),/no es un artefacto/);
 assert.ok((await db.query('select artefacto_portar($1,2) r',[mao])).rows[0].r.forma_tirada!==7);
 console.log('portadores-unicos-database: correcto');
}finally{await db.close();}
