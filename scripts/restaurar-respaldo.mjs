import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
// Solo copia aislada: sin URL de conexión y sin imprimir contenido de las filas.
export async function restaurar(documento, db=new PGlite()) {
 const q=s=>'"'+s.replaceAll('"','""')+'"', lit=s=>"'"+s.replaceAll("'","''")+"'", rel=(s,n)=>q(s)+'.'+q(n);
 for(const s of [...documento.schemas,'extensions','vault'])await db.exec(`create schema if not exists ${q(s)}`);
 for(const r of documento.roles)if(!['postgres','public'].includes(r)&&!r.startsWith('pg_'))await db.exec(`create role ${q(r)}`);
 await db.exec('set check_function_bodies=off');
 for(const t of documento.types) {
  assert.equal(t.kind,'e','Tipo no admitido por este restaurador aislado.');
  await db.exec(`create type ${rel(t.schema,t.name)} as enum (${t.enum_values.map(lit).join(',')})`);
 }
 for(const s of documento.sequences)await db.exec(`create sequence ${rel(s.schemaname,s.sequencename)}`);
 for(const t of documento.tables){
  const cols=documento.columns.filter(c=>c.schema===t.schema&&c.table===t.name);
  await db.exec(`create table ${rel(t.schema,t.name)} (${cols.map(c=>q(c.name)+' '+c.type+(c.not_null?' not null':'')).join(',')})`);
  for(const row of t.rows){const keys=Object.keys(row);await db.query(`insert into ${rel(t.schema,t.name)} (${keys.map(q).join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>{
   const col=cols.find(c=>c.name===k),v=row[k];return v!==null&&['json','jsonb'].includes(col.type)?JSON.stringify(v):v;
  }));}
 }
 for(const c of documento.constraints.filter(c=>c.kind!=='f'))await db.exec(`alter table ${rel(c.schema,c.table)} add constraint ${q(c.name)} ${c.definition}`);
 for(const c of documento.constraints.filter(c=>c.kind==='f'))await db.exec(`alter table ${rel(c.schema,c.table)} add constraint ${q(c.name)} ${c.definition}`);
 for(const f of documento.functions)await db.exec(f.definition);
 for(const t of documento.triggers)await db.exec(t.definition);
 for(const c of documento.columns.filter(c=>c.default&&!c.generated&&!c.identity))await db.exec(`alter table ${rel(c.schema,c.table)} alter column ${q(c.name)} set default ${c.default}`);
 for(const s of documento.sequence_state)await db.query(`select setval($1::regclass,$2,$3)`,[rel(s.schema,s.name),s.last_value,s.is_called]);
 for(const t of documento.tables)assert.equal((await db.query(`select count(*)::int n from ${rel(t.schema,t.name)}`)).rows[0].n,t.rows.length);
 // Este ensayo verifica datos/esquema/funciones/triggers; no simula la plataforma
 // Supabase ni acredita restauración de sus extensiones, ACL o servicios externos.
 return db;
}
if(process.argv[1]?.endsWith('/restaurar-respaldo.mjs')){
 const j=JSON.parse(readFileSync(process.argv[2],'utf8')),db=await restaurar(j);
 console.log(JSON.stringify({tablas:j.tables.length,filas:j.tables.reduce((n,t)=>n+t.rows.length,0),funciones:j.functions.length,triggers:j.triggers.length}));await db.close();
}
