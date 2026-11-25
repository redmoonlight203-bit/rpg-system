import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
// La base acepta una acción fuera de turno solo si el resultado demuestra una legendaria propia.
const id='00000000-0000-0000-0000-0000000000c1',u='00000000-0000-0000-0000-0000000000a1';
const miembro=(mid,gasto)=>({id:mid,vida:10,bando:'jugador',...(gasto?{gasto_acciones:gasto}:{})});
const datos=(extra={},a)=>({fase:'en_curso',actual:'b',ronda:3,miembros:[miembro('a',a),miembro('b')],...extra});
try{
 await db.exec(`create role anon;create role authenticated;create schema yugen_interno;
 create table public.combates_yugen(id uuid primary key,version int default 1,datos jsonb,updated_at timestamptz);
 create function yugen_interno.contexto_jugador(uuid,uuid,text) returns jsonb language sql as $$select jsonb_build_object('actor',jsonb_build_object('vida',10,'bando','jugador'))$$;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261125130000_legendarias_jugador.sql',import.meta.url),'utf8'));
 const intentar=async(antes,despues)=>{
  await db.query('delete from public.combates_yugen');
  await db.query('insert into public.combates_yugen(id,version,datos) values($1,1,$2)',[id,antes]);
  try{await db.query('select yugen_interno.confirmar_jugador($1,$2,$3,1,$4)',[u,id,'a',despues]);return true;}catch(e){assert.match(e.message,/durante su turno/);return false;}
 };
 const g=(ronda,legendaria)=>({turno:0,principal:0,adicional:0,ronda,legendaria});
 assert.equal(await intentar(datos(),datos({},g(3,1))),true,'primera legendaria de la ronda');
 assert.equal(await intentar(datos({},g(3,1)),datos({},g(3,2))),true,'segunda legendaria');
 assert.equal(await intentar(datos({},g(2,2)),datos({},g(3,1))),true,'lo de la ronda anterior no cuenta');
 assert.equal(await intentar(datos(),datos()),false,'sin gasto legendario no se puede actuar fuera de turno');
 assert.equal(await intentar(datos({},g(3,1)),datos({},g(3,3))),false,'solo una legendaria por guardado');
 assert.equal(await intentar(datos(),datos({actual:'a'},g(3,1))),false,'no puede cambiar el turno');
 assert.equal(await intentar(datos(),datos({ronda:4},g(4,1))),false,'no puede cambiar la ronda');
 assert.equal(await intentar(datos(),{...datos({},g(3,1)),reaccion_pendiente:{oferta:{defensor:'b'}}}),false,'no deja una reacción pendiente');
 assert.equal(await intentar(datos({reaccion_pendiente:{oferta:{defensor:'b'}}}),datos({},g(3,1))),false,'con reacción pendiente de otro no');
 assert.equal(await intentar(datos({actual:'a'}),datos({actual:'a'})),true,'en su turno, como siempre');
 const pausa=(orden)=>({...datos(),evento_visual:{id:'x'},reaccion_pendiente:{oferta:{defensor:'b'},orden,tiradas:[],respuestas:[]}});
 assert.equal(await intentar(datos(),pausa({actor:'a',accion:'hab:h:leg',objetivo:'b'})),true,'pausa por reacción de su legendaria');
 assert.equal(await intentar(datos(),pausa({actor:'b',accion:'ataque',objetivo:'a'})),false,'la orden debe ser suya');
 assert.equal(await intentar(datos(),pausa({turno:'siguiente'})),false,'no puede pasar el turno de otro');
 assert.equal(await intentar(datos(),{...pausa({actor:'a',accion:'x',objetivo:'b'}),ronda:9}),false,'la pausa no cambia nada más');
 assert.equal((await db.query("select has_function_privilege('authenticated','yugen_interno.legendaria_valida(text,jsonb,jsonb)','EXECUTE') x")).rows[0].x,false);
 console.log('PostgreSQL: legendarias de jugador fuera de turno correctas.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
