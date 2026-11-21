// Migración de creaciones personales sobre PostgreSQL en memoria (PGlite): Kion y el trigger de validación.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const KION='aa386a13-fec2-59b5-bd77-1fa6424fec28',PUNO='05c9623f-52c9-5a63-a00a-98fabe7fbb73',BOLA='763b4143-53a9-5f64-a1e9-a375e9b4ec04';
const AZUL='00000000-0000-4000-8000-00000000a201',EXTRA='00000000-0000-4000-8000-00000000a202',AJENA='00000000-0000-4000-8000-00000000a203',MAO='00000000-0000-4000-8000-00000000a204';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;
create table public.forja_maestra(id uuid primary key default gen_random_uuid(),nombre text,tipo text,tipo_creacion text,estado text default 'aprobado',
 habilidades jsonb not null default '[]'::jsonb,pasivas jsonb not null default '[]'::jsonb);
insert into public.forja_maestra(id,nombre,tipo_creacion,habilidades,pasivas) values
 ('${KION}','Kion Vaelthorne','personaje','["${PUNO}","${BOLA}","${AZUL}"]','["${EXTRA}"]'),
 ('${MAO}','Mao','personaje','[]','[]');
insert into public.forja_maestra(id,nombre,tipo_creacion) values
 ('${PUNO}','Puño Inercial','habilidad'),('${BOLA}','Bola de Fuego','habilidad'),('${AZUL}','Azul','habilidad'),
 ('${EXTRA}','Pasiva de Kion','pasiva'),('${AJENA}','Espada común','objeto');`);
const migracion=readFileSync(new URL('../supabase/migrations/20261121100000_creaciones_personales.sql',import.meta.url),'utf8');
await db.exec(migracion);
await db.exec(migracion); // idempotente

const dueno=async id=>(await db.query(`select personal_de from public.forja_maestra where id=$1`,[id])).rows[0].personal_de;
assert.equal(await dueno(PUNO),KION,'Puño Inercial es personal de Kion');
assert.equal(await dueno(EXTRA),KION,'sus pasivas también');
assert.equal(await dueno(BOLA),null,'Bola de Fuego queda general');
assert.equal(await dueno(AZUL),null,'Azul queda general');
assert.equal(await dueno(AJENA),null,'lo que no es de Kion no cambia');
assert.equal(await dueno(KION),null,'Kion sigue siendo general');

const rechaza=async(sql,patron)=>{await assert.rejects(db.exec(sql),e=>patron.test(e.message));};
await rechaza(`update public.forja_maestra set personal_de='${KION}' where id='${MAO}'`,/personaje no puede/);
await rechaza(`update public.forja_maestra set personal_de='${PUNO}' where id='${AJENA}'`,/debe pertenecer a un personaje/);
await rechaza(`update public.forja_maestra set personal_de=id where id='${AJENA}'`,/sí misma/);
await db.exec(`update public.forja_maestra set personal_de='${MAO}' where id='${AJENA}'`);
assert.equal(await dueno(AJENA),MAO,'el GM puede marcar otra creación como personal de Mao');
// Borrar un personaje deja sus creaciones como generales en lugar de romperlas.
await db.exec(`delete from public.forja_maestra where id='${MAO}'`);
assert.equal(await dueno(AJENA),null);
console.log('creaciones-personales-database: OK');
