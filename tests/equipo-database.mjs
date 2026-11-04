import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
try{
 for(const path of ['./fixtures/forja_copias_schema.sql','./fixtures/creacion_schema.sql','../supabase/migrations/20261030_forja_copias.sql','../supabase/migrations/20261030_forja_tipos_y_dados.sql','../supabase/migrations/20261030_combate_pasivas.sql','../supabase/migrations/20261030190047_pasivas_reactivas_y_elementos.sql'])await db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
 await db.exec("create role service_role;alter table forja_maestra add column requisitos text,add column defectos text;alter table personajes add column atributos jsonb default '{}',add column estado_vida text default 'vivo';alter table inventario_jugador add column created_at timestamptz default now();");
 for(const path of ['../supabase/migrations/20261103173113_forja_motor_reglas.sql','../supabase/migrations/20261103182719_equipo_en_combate.sql'])await db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
 const gm='00000000-0000-0000-0000-000000000001',jugador='00000000-0000-0000-0000-000000000003',otro='00000000-0000-0000-0000-000000000099',combate='00000000-0000-0000-0000-000000000002';
 await db.query("insert into perfiles values($1,'KUROI'),($2,'JUGADOR')",[gm,jugador]);await db.query("insert into personajes(id,user_id,nombre,estado_aprobacion,atributos) values(1,$1,'Prueba','aprobado','{\"vida\":20}')",[jugador]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[gm]);
 await db.exec("insert into forja_maestra(nombre,tipo,tipo_creacion) values('Phoenix (Sellada)','armas','objeto');");
 await db.exec(readFileSync(new URL('../supabase/seeds/phoenix.sql',import.meta.url),'utf8'));
 const {rows:[p]}=await db.query("select id from forja_maestra where nombre='Phoenix (Sellada)'");
 // Seed preserves identity and generated snapshots expose all newly configured rules.
 assert.equal((await db.query('select forja_snapshot_config($1) as c',[p.id])).rows[0].c.reglas.some(x=>x.evento==='equipar'),true);
 const {rows:[item]}=await db.query("insert into inventario_jugador(user_id,personaje_id,nombre,tipo,slot_tipo,stats,configuracion) values($1,1,'Phoenix','armas','mano','{}',forja_snapshot_config($2)) returning id",[jugador,p.id]);
 let ctx=(await db.query('select equipo_contexto_servidor($1,1,null,null) as c',[jugador])).rows[0].c;
 assert.equal(ctx.fuentes.length,1);assert.equal(ctx.preparado.configuracion.habilidades.length,0);
 await assert.rejects(db.query('select equipo_contexto_servidor($1,1,null,null)',[otro]));
 const equipo={mano_der:item.id};await db.query('select equipo_confirmar_servidor($1,1,null,null,0,$2,$3,null)',[jugador,ctx.firma,JSON.stringify(equipo)]);
 assert.equal((await db.query('select slot_equipado from inventario_jugador where id=$1',[item.id])).rows[0].slot_equipado,'mano_der');
 // Prepare a legitimate player participant and start an encounter.
 const m=(await db.query('select combate_preparar_jugador(1) as m')).rows[0].m;m.vida=20;m.accion_usada=false;
 const datos={fase:'en_curso',actual:m.id,ronda:1,miembros:[m],registro:[]};await db.query('select combate_guardar($1,$2,$3,0)',[combate,'Prueba',JSON.stringify(datos)]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[jugador]);
 await assert.rejects(db.query('update inventario_jugador set slot_equipado=null where id=$1',[item.id]));
 ctx=(await db.query('select equipo_contexto_servidor($1,1,null,null) as c',[jugador])).rows[0].c;
 const next=structuredClone(datos);next.miembros[0].configuracion.equipamiento={};next.miembros[0].accion_usada=true;
 await assert.rejects(db.query('select equipo_confirmar_servidor($1,1,$2,$3,0,$4,$5,$6)',[jugador,combate,m.id,'','{}',JSON.stringify(next)]));
 await db.query('select equipo_confirmar_servidor($1,1,$2,$3,1,$4,$5,$6)',[jugador,combate,m.id,'','{}',JSON.stringify(next)]);
 assert.equal((await db.query('select slot_equipado from inventario_jugador where id=$1',[item.id])).rows[0].slot_equipado,null);
 await assert.rejects(db.query('select equipo_confirmar_servidor($1,1,$2,$3,2,$4,$5,$6)',[jugador,combate,m.id,'','{}',JSON.stringify(next)]));
 // GM undo restores inventory atomically with encounter state.
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[gm]);await db.query('select combate_guardar($1,$2,$3,2)',[combate,'Prueba',JSON.stringify(datos)]);
 assert.equal((await db.query('select slot_equipado from inventario_jugador where id=$1',[item.id])).rows[0].slot_equipado,'mano_der');
 assert.equal((await db.query("select has_function_privilege('authenticated','public.equipo_contexto_servidor(uuid,bigint,uuid,text)','EXECUTE') as permitido")).rows[0].permitido,false);
 await db.exec('set role authenticated');await assert.rejects(db.query('select equipo_contexto_servidor($1,1,null,null)',[jugador]));await db.exec('reset role');
 console.log('PostgreSQL: Phoenix, reservas, autorización, turnos, bloqueo de cambios directos, conflictos y deshacer sincronizado correctos.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
