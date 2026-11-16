import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
// Las cuatro políticas reescritas con (select auth.uid()) deben dar exactamente los mismos accesos.
const db=new PGlite();
const migracion=readFileSync(new URL('../supabase/migrations/20261116140000_rls_auth_initplan.sql',import.meta.url),'utf8');
const gm='00000000-0000-0000-0000-00000000000a',gm2='00000000-0000-0000-0000-00000000000b',jug='00000000-0000-0000-0000-00000000000c';
try{
 await db.exec(`create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create table perfiles(id uuid primary key,rol text);grant select on perfiles to authenticated;
 insert into perfiles values('${gm}','KUROI'),('${gm2}','KUROI'),('${jug}','REENCARNADO');
 create table forja_operaciones(id int);create table forja_instancias(id int,estado text);create table combates_yugen(id int,creador_id uuid);
 insert into forja_operaciones values(1);insert into forja_instancias values(1,'a');insert into combates_yugen values(1,'${gm}'),(2,'${gm2}');
 grant select on forja_operaciones,combates_yugen to authenticated;grant select,update on forja_instancias to authenticated;
 alter table forja_operaciones enable row level security;alter table forja_instancias enable row level security;alter table combates_yugen enable row level security;
 create policy forja_operaciones_kuroi on forja_operaciones for select to authenticated using(exists(select 1 from perfiles where id=auth.uid() and rol='KUROI'));
 create policy forja_instancias_kuroi_lectura on forja_instancias for select to authenticated using(exists(select 1 from perfiles where id=auth.uid() and rol='KUROI'));
 create policy forja_instancias_kuroi_estado on forja_instancias for update to authenticated using(exists(select 1 from perfiles where id=auth.uid() and rol='KUROI')) with check(exists(select 1 from perfiles where id=auth.uid() and rol='KUROI'));
 create policy combates_kuroi on combates_yugen for select to authenticated using(creador_id=auth.uid() and exists(select 1 from perfiles where id=auth.uid() and rol='KUROI'));`);
 const accesos=async()=>{
  const r={};
  for(const [n,u] of [['gm',gm],['gm2',gm2],['jugador',jug],['anonimo','']]){
   await db.exec(`set request.jwt.claim.sub='${u}';set role authenticated`);
   r[n]={op:(await db.query('select count(*)::int n from forja_operaciones')).rows[0].n,
    inst:(await db.query('select count(*)::int n from forja_instancias')).rows[0].n,
    upd:(await db.query("update forja_instancias set estado=estado")).affectedRows,
    combates:(await db.query('select array_agg(id order by id) a from combates_yugen')).rows[0].a};
   await db.exec('reset role');
  }
  return r;
 };
 const antes=await accesos();
 assert.deepEqual(antes.gm,{op:1,inst:1,upd:1,combates:[1]});
 assert.deepEqual(antes.jugador,{op:0,inst:0,upd:0,combates:null});
 await db.exec(migracion);
 assert.deepEqual(await accesos(),antes,'mismos accesos para GM, otro GM, jugador y sin sesión');
 const q=(await db.query("select string_agg(coalesce(qual,'')||coalesce(with_check,''),' ') t from pg_policies")).rows[0].t;
 assert.doesNotMatch(q.replaceAll('( SELECT auth.uid() AS uid)',''),/auth\.uid\(\)/,'ya no queda auth.uid() sin envolver');
 // Repetirla aborta: las políticas ya no son las originales.
 await assert.rejects(db.exec(migracion),/difiere de la observada/);
 await db.exec('rollback');
 console.log('SQL: políticas RLS con (select auth.uid()): accesos idénticos para GM, otro GM, jugador y sin sesión.');
}finally{await db.close();}
