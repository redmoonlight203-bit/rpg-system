import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
try{
 for(const path of ['./fixtures/forja_copias_schema.sql','./fixtures/creacion_schema.sql','../supabase/migrations/20261030_forja_copias.sql','../supabase/migrations/20261030_forja_tipos_y_dados.sql','../supabase/migrations/20261030_combate_pasivas.sql','../supabase/migrations/20261030190047_pasivas_reactivas_y_elementos.sql'])await db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
 await db.exec("alter table personajes add column atributos jsonb default '{}', add column estado_vida text default 'vivo'; alter table inventario_jugador add column created_at timestamptz default now();");
 await db.exec(readFileSync(new URL('../supabase/migrations/20261103173113_forja_motor_reglas.sql',import.meta.url),'utf8'));
 await db.exec(`insert into perfiles values('00000000-0000-0000-0000-000000000001','KUROI');select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);`);
 const reglas=[{id:'vida',nombre:'Vida al matar',evento:'matar',condicion:{tipo:'siempre'},efectos:[{tipo:'atributo',destino:'yo',atributo:'vida',operacion:'sumar',valor:1,permanente:true}],coste_ph:0,coste_fatiga:0,enfriamiento:0,usos:0,prioridad:0}];
 const {rows:[pasiva]}=await db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,reglas) values('Crecimiento','pasivas_generales','pasiva',$1) returning id",[JSON.stringify(reglas)]);
 const {rows:[personaje]}=await db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,pasivas,stats) values('Prueba','humanos','personaje',$1,'{\"vida\":20}') returning id",[JSON.stringify([pasiva.id])]);
 const {rows:[snapshot]}=await db.query('select forja_snapshot_config($1) as c',[personaje.id]);assert.equal(snapshot.c.pasivas[0].reglas_motor[0].nombre,'Vida al matar');
 const copia=snapshot.c;await db.query("update forja_maestra set reglas='[]' where id=$1",[pasiva.id]);assert.equal(copia.pasivas[0].reglas_motor.length,1);
 for(const invalid of [[{...reglas[0],evento:'inventado'}],[{...reglas[0],efectos:[{tipo:'salvacion',destino:'yo',cd:-2,atributo:'salvacion'}]}],[{...reglas[0],efectos:[{tipo:'transformar',destino:'yo',clave:'x',cambios:[]}]}]])await assert.rejects(db.query('update forja_maestra set reglas=$1 where id=$2',[JSON.stringify(invalid),pasiva.id]));
 await db.exec(`insert into personajes(id,user_id,nombre,estado_aprobacion,atributos) values(1,'00000000-0000-0000-0000-000000000001','Jugador','aprobado','{"vida":20}');`);
 const datos={fase:'finalizado',miembros:[{id:'a',personaje_id:'1',motor:{progreso:[{id:'g1',atributo:'vida',delta:2,regla:'vida'}]}}]};
 const id='00000000-0000-0000-0000-000000000002';await db.query('select combate_guardar($1,$2,$3,0)',[id,'Prueba',JSON.stringify(datos)]);
 await assert.rejects(db.query('select combate_confirmar_progreso($1,0)',[id]));
 await db.query('select combate_confirmar_progreso($1,1)',[id]);await db.query('select combate_confirmar_progreso($1,1)',[id]);
 assert.equal((await db.query('select atributos from personajes where id=1')).rows[0].atributos.vida,22);
 await assert.rejects(db.query('select combate_guardar($1,$2,$3,2)',[id,'Prueba',JSON.stringify(datos)]));
 await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',false)");await assert.rejects(db.query('select combate_confirmar_progreso($1,2)',[id]));
 console.log('PostgreSQL: validación, snapshots de reglas, progreso idempotente, revisiones y permisos correctos.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
