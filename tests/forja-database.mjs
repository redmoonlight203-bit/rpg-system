// Prueba exclusivamente en un PostgreSQL aislado en memoria; no acepta URL de conexión.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite} = await import(process.env.FORJA_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
try {
 await db.exec(readFileSync(new URL('./fixtures/forja_copias_schema.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20261030_forja_copias.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('./fixtures/forja_copias_regresion.sql',import.meta.url),'utf8'));
 const r = await db.query('select count(*)::int as n from forja_operaciones');
 assert.equal(r.rows[0].n,0,'Los datos de prueba deben revertirse');
 console.log('Pruebas SQL correctas: copias, rangos, destinatario, solicitudes repetidas, negociación, rollback y autorización.');
} finally {await db.close();}
