import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
    create table auth.users(id uuid primary key default gen_random_uuid(),email text);
    create table perfiles(id uuid primary key,rol text,estado text);
    create function private.tienda_es_gm() returns boolean language sql as $$select current_setting('test.gm',true)='si'$$;
    create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;
    insert into auth.users(email) values('jugador@example.test'),('gm@example.test'),('pendiente@example.test');
    insert into perfiles select id,case when email like 'gm%' then 'KUROI' else 'REENCARNADO' end,
      case when email like 'pendiente%' then 'pendiente' else 'aprobado' end from auth.users;`);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261121000200_solicitudes_recuperacion.sql',import.meta.url),'utf8'));
  await db.exec('set role anon');
  for(const email of ['GM@example.test','desconocido@example.test','pendiente@example.test',' Jugador@example.test ','jugador@example.test']){
    await db.query('select solicitar_recuperacion($1)',[email]);
  }
  await assert.rejects(db.query('select * from recuperaciones_pendientes()'));
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select * from recuperaciones_pendientes()'));
  await db.exec("set test.gm='si'");
  const lista=(await db.query('select * from recuperaciones_pendientes()')).rows;
  assert.equal(lista.length,1);assert.equal(lista[0].correo,'jugador@example.test');
  const reservar=()=>db.query('select reservar_recuperacion($1) correo',[lista[0].solicitud]);
  assert.equal((await reservar()).rows[0].correo,lista[0].correo);
  assert.equal((await reservar()).rows[0].correo,null);
  await db.query('select confirmar_envio_recuperacion($1)',[lista[0].solicitud]);
  assert.equal((await db.query('select * from recuperaciones_pendientes()')).rows.length,0);
}finally{await db.close();}
