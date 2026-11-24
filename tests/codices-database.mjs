// Prueba aislada (PGlite en memoria) de la tabla de configuración de los códices.
// Ejecutar: node tests/codices-database.mjs — no usa credenciales ni toca la base real.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
const GM='00000000-0000-0000-0000-000000000001',JUGADOR='00000000-0000-0000-0000-000000000002';
const como=uid=>db.exec(`select set_config('request.jwt.claim.sub','${uid}',false)`);
try{
 await db.exec(`
  create role anon;create role authenticated;create schema private;create schema auth;
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table public.perfiles(id uuid primary key,rol text);
  insert into public.perfiles values('${GM}','KUROI'),('${JUGADOR}','JUGADOR');
  create function private.tienda_es_gm() returns boolean language sql stable as $$select auth.uid() is not null and exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI')$$;
  create function private.avisar_actualizacion() returns trigger language plpgsql as $$begin return null;end;$$;
 `);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261124100000_forja_codices.sql',import.meta.url),'utf8'));
 const leer=async()=>(await db.query('select config from public.forja_codices where id=1')).rows[0]?.config;
 assert.equal(await leer(),undefined,'sin fila hasta que el GM guarda');

 await como(JUGADOR);
 await assert.rejects(db.query(`select public.codices_guardar('{"version":1}')`),e=>e.code==='42501');
 await como('');
 await assert.rejects(db.query(`select public.codices_guardar('{"version":1}')`),e=>e.code==='42501');

 await como(GM);
 await db.query(`select public.codices_guardar($1)`,[{version:1,rastro:{max:5}}]);
 assert.deepEqual(await leer(),{version:1,rastro:{max:5}});
 await db.query(`select public.codices_guardar($1)`,[{version:1,rastro:{max:9}}]);
 assert.deepEqual(await leer(),{version:1,rastro:{max:9}});
 assert.equal((await db.query('select count(*)::int n from public.forja_codices')).rows[0].n,1);
 await assert.rejects(db.query(`select public.codices_guardar('[1,2]')`),e=>e.code==='22023');
 await assert.rejects(db.query(`select public.codices_guardar($1)`,[{relleno:'x'.repeat(210000)}]),e=>e.code==='22023');
 assert.deepEqual(await leer(),{version:1,rastro:{max:9}},'un rechazo no altera la fila');

 const permisos=(await db.query(`select has_table_privilege('authenticated','public.forja_codices','select') l,has_table_privilege('authenticated','public.forja_codices','update') e,has_table_privilege('anon','public.forja_codices','select') a`)).rows[0];
 assert.deepEqual(permisos,{l:true,e:false,a:false});
 console.log('PostgreSQL: configuración de códices — solo el GM guarda, una fila, JSON objeto acotado y lectura autenticada.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
