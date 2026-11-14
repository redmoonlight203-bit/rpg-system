import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {restaurar} from './restaurar-respaldo.mjs';
const j=JSON.parse(readFileSync(process.argv[2],'utf8')),db=await restaurar(j);
try{
 await db.exec(readFileSync(new URL('../supabase/migrations/20261114144211_estabilizacion_guia_v2.sql',import.meta.url),'utf8'));
 const funciones=(await db.query("select pg_get_functiondef('private.encuentro_validar_ciclo()'::regprocedure) ciclo,pg_get_functiondef('public.combate_proteger_progreso()'::regprocedure) progreso")).rows[0];
 await db.exec('begin');
 await db.exec(readFileSync(new URL('../supabase/migrations/20261114153555_imagenes_storage_guia_v2.sql',import.meta.url),'utf8'));await db.exec('commit');
 assert.deepEqual((await db.query("select pg_get_functiondef('private.encuentro_validar_ciclo()'::regprocedure) ciclo,pg_get_functiondef('public.combate_proteger_progreso()'::regprocedure) progreso")).rows[0],funciones);
 const auditoria=[];
 for(const tabla of ['forja_maestra','inventario_jugador','combates_yugen','resultados_encuentro']){
  const n=(await db.query(`select count(*)::int n from public.${tabla} t where strpos(to_jsonb(t)::text,'data:image/')>0`)).rows[0].n;assert.equal(n,0,tabla);auditoria.push({tabla,filas_base64:n});
 }
 const tamaños=(await db.query('select id,pg_column_size(datos) bytes from combates_yugen order by id')).rows;
 const id=(await db.query('select combate_id from resultados_encuentro where aprobado limit 1')).rows[0].combate_id;
 await assert.rejects(db.query("update combates_yugen set datos=datos||'{\"ronda\":999}' where id=$1",[id]),/inmutable|confirmado/);
 await db.exec(readFileSync(new URL('./revertir-imagenes-guia-v2.sql',import.meta.url),'utf8'));
 for(const tabla of ['forja_maestra','inventario_jugador','resultados_encuentro']){
  const original=j.tables.find(t=>t.schema==='public'&&t.name===tabla).rows;
  const filas=(await db.query(`select * from ${tabla}`)).rows;
  // Normalizar los timestamps que PGlite entrega como Date, sin cambiar datos.
  assert.deepEqual(JSON.parse(JSON.stringify(filas)).sort((a,b)=>String(a.id||a.combate_id).localeCompare(String(b.id||b.combate_id))),JSON.parse(JSON.stringify(original)).map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='string'&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*[+]00:00$/.test(v)?new Date(v).toISOString():v]))).sort((a,b)=>String(a.id||a.combate_id).localeCompare(String(b.id||b.combate_id))));
 }
 console.log(JSON.stringify({reversion_probada:true,entorno:'PGlite aislado con snapshot real',auditoria,tamaños,protecciones_restauradas:true,equivalencia_de_todas_las_filas:true},null,2));
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
