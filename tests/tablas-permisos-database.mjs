import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
// Las 17 tablas con «Permitir todo»: tras la migración, los jugadores leen catálogos y lo suyo,
// solo Kuroi escribe, salvo pedir creaciones, abrir negociaciones y la lista de deseos.
const db=new PGlite();
const leer=n=>readFileSync(new URL(`../supabase/migrations/${n}`,import.meta.url),'utf8');
const sinAnon=leer('20261116160000_tablas_abiertas_sin_anon.sql'),migracion=leer('20261121120000_tablas_abiertas_permisos.sql');
const gm='00000000-0000-0000-0000-00000000000a',ana='00000000-0000-0000-0000-00000000000b',beto='00000000-0000-0000-0000-00000000000c';
const como=async(u)=>{await db.exec('reset role');await db.exec(`set request.jwt.claim.sub='${u||''}'`);await db.exec(u?'set role authenticated':'set role anon');};
const q=async(sql,p)=>(await db.query(sql,p)).rows;
const n=async(t)=>(await q(`select count(*)::int n from ${t}`))[0].n;
const cambia=async(sql)=>(await db.query(sql)).affectedRows;
const catalogos=['articulos_alma','categorias_forja','codex_entradas','config_estadisticas','linea_tiempo_eras','mapas','mercado_objetos','tablero_tokens','tableros','tiempo_juego','tienda_items'];
const propias=['codex_descubrimientos','creaciones_forja','jugador_mapas','jugador_vinculos','lista_deseos','negociaciones_tienda'];
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,private to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table public.perfiles(id uuid primary key,rol text);insert into perfiles values('${gm}','KUROI'),('${ana}','REENCARNADO'),('${beto}','REENCARNADO');
 create function private.tienda_es_gm() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI')$$;
 grant execute on function private.tienda_es_gm() to authenticated;`);
 // Forma mínima de producción (21-11) con la política heredada.
 for(const t of catalogos){
  const extra=t==='tablero_tokens'?',visible_jugadores boolean default true':'';
  await db.exec(`create table public.${t}(id uuid primary key default gen_random_uuid(),nombre text${extra});insert into ${t}(nombre) values('a');`);
 }
 await db.exec(`update tablero_tokens set visible_jugadores=false;insert into tablero_tokens(nombre) values('visible');`);
 for(const t of propias){
  const extra=t==='creaciones_forja'?",estado text default 'pendiente',comentarios_kuroi text":t==='negociaciones_tienda'?",estado text default 'pendiente'":'';
  await db.exec(`create table public.${t}(id uuid primary key default gen_random_uuid(),user_id uuid not null${extra});insert into ${t}(user_id) values('${ana}'),('${beto}');`);
 }
 for(const t of [...catalogos,...propias]) await db.exec(`alter table ${t} enable row level security;
  create policy "Permitir todo ${t}" on ${t} for all to public using(true) with check(true);grant all on ${t} to anon,authenticated;`);
 await db.exec(sinAnon);
 // Reproduce el agujero: un jugador con sesión borra razas.
 await como(ana);assert.equal(await cambia(`update categorias_forja set nombre='x'`),1,'antes un jugador podía reescribir razas');
 await db.exec('reset role');
 await db.exec(migracion);await db.exec(migracion); // repetible

 await como(null);
 for(const t of [...catalogos,...propias]) await assert.rejects(db.query(`select * from ${t}`),/permission denied/,`${t}: sin sesión no hay acceso`);

 await como(ana);
 for(const t of catalogos){
  assert.equal(await n(t),1,`${t}: el jugador lee`);
  assert.equal(await cambia(`update ${t} set nombre='hack'`),0,`${t}: el jugador no cambia`);
  assert.equal(await cambia(`delete from ${t}`),0,`${t}: el jugador no borra`);
  await assert.rejects(db.query(`insert into ${t}(nombre) values('hack')`),/row-level security/,`${t}: el jugador no crea`);
 }
 assert.deepEqual((await q('select nombre from tablero_tokens')).map(r=>r.nombre),['visible'],'solo fichas visibles');
 for(const t of propias){
  assert.equal(await n(t),1,`${t}: el jugador solo ve lo suyo`);
  assert.equal(await cambia(`update ${t} set user_id='${ana}'`),0,`${t}: el jugador no cambia`);
 }
 // Lo que sí puede hacer el jugador.
 await db.query(`insert into creaciones_forja(user_id) values('${ana}')`);
 await db.query(`insert into negociaciones_tienda(user_id) values('${ana}')`);
 await db.query(`insert into lista_deseos(user_id) values('${ana}')`);
 assert.equal(await cambia(`delete from lista_deseos where user_id='${ana}'`),2,'gestiona su lista de deseos');
 await assert.rejects(db.query(`insert into creaciones_forja(user_id,estado) values('${ana}','aprobada')`),/row-level security/,'no se autoaprueba');
 await assert.rejects(db.query(`insert into creaciones_forja(user_id,comentarios_kuroi) values('${ana}','ok')`),/row-level security/,'no escribe comentarios de Kuroi');
 await assert.rejects(db.query(`insert into negociaciones_tienda(user_id,estado) values('${ana}','aprobada')`),/row-level security/,'negociación siempre pendiente');
 await assert.rejects(db.query(`insert into creaciones_forja(user_id) values('${beto}')`),/row-level security/,'no crea a nombre de otro');
 for(const t of ['codex_descubrimientos','jugador_mapas','jugador_vinculos']) await assert.rejects(db.query(`insert into ${t}(user_id) values('${ana}')`),/row-level security/,`${t}: solo Kuroi lo concede`);

 await como(gm);
 for(const t of catalogos){
  assert.equal(await cambia(`update ${t} set nombre=nombre`),await n(t),`${t}: Kuroi edita`);
  await db.query(`insert into ${t}(nombre) values('nuevo')`);
  assert.equal(await cambia(`delete from ${t} where nombre='nuevo'`),1,`${t}: Kuroi borra`);
 }
 assert.equal(await n('tablero_tokens'),2,'Kuroi ve todas las fichas');
 assert.equal(await cambia(`update creaciones_forja set estado='aprobada' where user_id='${ana}'`),2,'Kuroi aprueba peticiones');
 assert.equal(await n('negociaciones_tienda'),3,'Kuroi ve todo');
 await db.query(`insert into jugador_mapas(user_id) values('${beto}')`);

 await db.exec('reset role');
 const politicas=await q(`select tablename,cmd,count(*)::int n from pg_policies where schemaname='public' group by 1,2 having count(*)>1`);
 assert.deepEqual(politicas,[],'sin políticas permisivas duplicadas');
 assert.equal((await q(`select count(*)::int n from pg_policies where policyname like 'Permitir todo%'`))[0].n,0);
 console.log('SQL: 17 tablas sin «Permitir todo»; jugadores leen, Kuroi escribe; repetible.');
}finally{await db.close();}
