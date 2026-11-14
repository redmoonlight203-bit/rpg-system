import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {restaurar} from './restaurar-respaldo.mjs';
// Ensayo de autorización interna sobre definiciones reales en una copia sin red.
const j=JSON.parse(readFileSync(process.argv[2],'utf8')),db=await restaurar(j);
const nombres=['combate_accion_estado','combate_confirmar_progreso','combate_consultar_ligero','combate_descartar_accion','combate_eliminar','combate_estado_jugador','combate_guardar','combate_guardar_accion','combate_guardar_ligero','forja_crear_copias','forja_eliminar','navy_reservar_cupo'];
try{
 const usuario=(await db.query("select id from perfiles where rol='REENCARNADO' limit 1")).rows[0]?.id;
 assert.ok(usuario,'La copia necesita un perfil de jugador para ensayar las guardas');
 await db.exec('grant usage on schema public,auth,private to authenticated');
 const funciones=(await db.query("select p.proname,p.pronargs from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any($1)",[nombres])).rows;
 assert.equal(funciones.length,12);const evidencia=[];
 for(const sub of ['',usuario]){
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[sub]);
  await db.exec('set role authenticated');
  for(const f of funciones){
   await assert.rejects(db.query(`select public.${f.proname}(${Array(f.pronargs).fill('null').join(',')})`),e=>e.code==='42501',f.proname+' debe rechazar antes de consultar o escribir');
   evidencia.push({funcion:f.proname,contexto:sub?'jugador':'sin_sesion',resultado:'rechazado 42501'});
  }
  await db.exec('reset role');
 }
 console.log(JSON.stringify({fecha:new Date().toISOString(),entorno:'PGlite aislado con funciones reales; ACL en producción se auditan por separado',pruebas:evidencia},null,2));
}finally{await db.close();}
