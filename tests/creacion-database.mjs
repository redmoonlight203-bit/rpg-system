import{readFileSync}from'node:fs';import assert from'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
try{
 for(const path of ['./fixtures/forja_copias_schema.sql','./fixtures/creacion_schema.sql','../supabase/migrations/20261030_forja_copias.sql','../supabase/migrations/20261030_forja_tipos_y_dados.sql','./fixtures/creacion_regresion.sql'])await db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
 const r=await db.query('select count(*)::int as n from forja_operaciones');assert.equal(r.rows[0].n,0);console.log('Tipos, dados, habilidades, equipo, bonos y snapshots: correctos en PostgreSQL aislado.');
}finally{await db.close();}
