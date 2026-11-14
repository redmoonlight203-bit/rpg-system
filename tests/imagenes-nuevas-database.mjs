import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create schema private;');
 const tablas=['forja_maestra','inventario_jugador','combates_yugen','resultados_encuentro'];
 for(const tabla of tablas)await db.exec(`create table ${tabla}(id int primary key,datos jsonb,imagen_url text)`);
 const sql=readFileSync(new URL('../supabase/migrations/20261114153555_imagenes_storage_guia_v2.sql',import.meta.url),'utf8');await db.exec(sql.slice(sql.indexOf('-- GATE_IMAGENES_NUEVAS:')));
 for(const tabla of tablas){
  await db.query(`insert into ${tabla} values(1,$1,'https://example.com/image.webp')`,[{etapas:[{imagen_url:'/imagen.webp'}]}]);
  await assert.rejects(db.query(`update ${tabla} set datos=$1 where id=1`,[{etapas:[{imagen_url:'data:image/webp;base64,AAAA'}]}]),e=>e.code==='22023');
  await assert.rejects(db.query(`insert into ${tabla} values(2,'{}','data:image/png;base64,AAAA')`),e=>e.code==='22023');
  assert.equal((await db.query(`select count(*)::int n from ${tabla}`)).rows[0].n,1);
 }
 console.log('SQL: portadas, etapas anidadas, inventario, combates y resultados rechazan base64 sin alterar filas.');
}finally{await db.close();}
