// Control mental (plan maestro B.5 · revisión final C1): el jugador que controla a una criatura puede confirmar la
// acción hecha con ella en su turno; nadie más puede, y sin control sigue rigiendo «solo tu personaje».
import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
const archivo=new URL('../supabase/migrations/20261123140000_confirmar_control_mental.sql',import.meta.url);
const id='00000000-0000-0000-0000-0000000000c1';
const combate=(actual,estadosE)=>({fase:'en_curso',actual,miembros:[{id:'kuro',bando:'jugador',vida:10,estados:[]},{id:'ogro',bando:'enemigo',vida:20,estados:estadosE}]});
try{
 await db.exec(`create schema yugen_interno;
 create table public.combates_yugen(id uuid primary key,datos jsonb,version int,updated_at timestamptz);
 create function yugen_interno.contexto_jugador(u uuid,c uuid,a text) returns jsonb language sql as $$select jsonb_build_object('actor',jsonb_build_object('bando','jugador','vida',10))$$;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261121220500_reacciones_por_defensor.sql',import.meta.url),'utf8'));
 assert.ok(existsSync(archivo),'falta la migración del control mental');
 const sql=readFileSync(archivo,'utf8');await db.exec(sql);await db.exec(sql);// idempotente
 const probar=async(datos,actor)=>{await db.query('delete from combates_yugen');await db.query('insert into combates_yugen values($1,$2,1,now())',[id,datos]);
  return db.query('select yugen_interno.confirmar_jugador($1,$2,$3,1,$4)',['00000000-0000-0000-0000-000000000001',id,actor,{fase:'en_curso'}]);};
 const control=[{id:'control_mental',tipo:'control_mental',nombre:'Control mental',fuente:'kuro'}];
 await probar(combate('kuro',[]),'kuro');// su propio turno: igual que antes
 await probar(combate('ogro',control),'kuro');// controla al ogro en el turno del ogro
 const propio=[{id:'sopor',tipo:'sopor',nombre:'Sopor',fuente:'kuro',def:{efectos:[{tipo:'cesion_control',controlador:'fuente'}]}}];
 await probar(combate('ogro',propio),'kuro');// estado creado en el Yunque con cesión de control
 await assert.rejects(probar(combate('ogro',[]),'kuro'),/Solo puedes controlar/,'sin control no actúa');
 await assert.rejects(probar(combate('ogro',[{...control[0],fuente:'otro'}]),'kuro'),/Solo puedes controlar/,'controlado por otro');
 await assert.rejects(probar(combate('ogro',[{id:'dominado',tipo:'dominado',nombre:'Dominado',fuente:'kuro'}]),'kuro'),/Solo puedes controlar/,'Dominado lo decide el GM');
 console.log('control-mental-database: correcto');
}finally{await db.close();}
