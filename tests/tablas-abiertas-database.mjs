import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
// Las tablas con «Permitir todo» dejan de ser accesibles sin sesión; con sesión siguen igual.
const db=new PGlite();
const migracion=readFileSync(new URL('../supabase/migrations/20261116160000_tablas_abiertas_sin_anon.sql',import.meta.url),'utf8');
try{
 await db.exec(`create role anon;create role authenticated;
 create table categorias_forja(id int primary key,clave text);create table config_estadisticas(id int primary key);create table perfiles(id int primary key);
 insert into categorias_forja values(1,'razas');insert into config_estadisticas values(1);insert into perfiles values(1);
 alter table categorias_forja enable row level security;alter table config_estadisticas enable row level security;alter table perfiles enable row level security;
 create policy "Permitir todo categorias_forja" on categorias_forja for all to public using(true) with check(true);
 create policy "Permitir todo config_estadisticas" on config_estadisticas for all to public using(true) with check(true);
 create policy perfiles_lectura on perfiles for select to anon,authenticated using(true);
 grant all on categorias_forja,config_estadisticas,perfiles to anon,authenticated;`);
 await db.exec('set role anon');
 assert.equal((await db.query('select count(*)::int n from categorias_forja')).rows[0].n,1,'reproduce el acceso anónimo previo');
 await db.exec('reset role');
 await db.exec(migracion);
 await db.exec('set role anon');
 for(const t of ['categorias_forja','config_estadisticas']){
  await assert.rejects(db.query(`select * from ${t}`),/permission denied/);
  await assert.rejects(db.query(`delete from ${t}`),/permission denied/);
 }
 assert.equal((await db.query('select count(*)::int n from perfiles')).rows[0].n,1,'las tablas fuera de la lista no cambian');
 await db.exec('reset role');await db.exec('set role authenticated');
 assert.equal((await db.query('select count(*)::int n from categorias_forja')).rows[0].n,1,'con sesión, igual que antes');
 await db.query("update categorias_forja set clave='razas' where id=1");
 await db.exec('reset role');
 await db.exec(migracion);
 console.log('SQL: tablas con «Permitir todo» sin acceso anónimo; con sesión no cambia nada; repetible.');
}finally{await db.close();}
