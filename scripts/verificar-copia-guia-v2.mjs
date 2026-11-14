import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {restaurar} from './restaurar-respaldo.mjs';
// Solo snapshot local descifrado, jamás una conexión a producción.
const db=await restaurar(JSON.parse(readFileSync(process.argv[2],'utf8')));
try{
 const tamaños=async()=> (await db.query("select id,pg_column_size(datos) bytes,pg_column_size(datos->'historial') historial_bytes from combates_yugen order by id")).rows;
 const antes=await tamaños(),resultados=(await db.query('select * from resultados_encuentro order by combate_id')).rows;
 await db.exec(readFileSync(new URL('../supabase/migrations/20261114144211_estabilizacion_guia_v2.sql',import.meta.url),'utf8'));
 const despues=await tamaños();assert.deepEqual((await db.query('select * from resultados_encuentro order by combate_id')).rows,resultados);
 assert.equal((await db.query("select count(*)::int n from combates_yugen where datos->>'fase'='finalizado' and datos ? 'historial'")).rows[0].n,0);
 const mediciones=[];
 const id=(await db.query("select id from combates_yugen where datos->>'fase'='preparacion' limit 1")).rows[0]?.id;
 if(id)for(let i=0;i<3;i++){
  await db.exec('begin');
  const r=await db.query('explain (analyze,format json) update combates_yugen set datos=datos where id=$1',[id]);
  mediciones.push(r.rows[0]['QUERY PLAN'][0]);await db.exec('rollback');
 }
 await db.exec(readFileSync(new URL('./revertir-guia-v2.sql',import.meta.url),'utf8'));
 for(const t of JSON.parse(readFileSync(process.argv[2],'utf8')).tables.filter(t=>t.schema==='public'&&t.name==='combates_yugen'))for(const r of t.rows){assert.deepEqual((await db.query('select datos from combates_yugen where id=$1',[r.id])).rows[0].datos,r.datos);}
 console.log(JSON.stringify({reversion:'funciones e historiales recuperados en copia, con igualdad exacta de datos',entorno:'PGlite aislado con snapshot real; no HTTP ni usuarios reales',antes,despues,resultados_preservados:resultados.length,explain:mediciones},null,2));
}finally{await db.close();}
