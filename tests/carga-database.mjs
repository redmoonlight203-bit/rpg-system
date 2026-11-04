import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
try{
 for(const path of ['./fixtures/forja_copias_schema.sql','./fixtures/creacion_schema.sql','../supabase/migrations/20261030_forja_copias.sql','../supabase/migrations/20261030_forja_tipos_y_dados.sql','../supabase/migrations/20261030_combate_pasivas.sql','../supabase/migrations/20261030190047_pasivas_reactivas_y_elementos.sql'])await db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
 await db.exec("create role service_role;alter table forja_maestra add column requisitos text,add column defectos text;alter table personajes add column atributos jsonb default '{}',add column estado_vida text default 'vivo',add column raza text;alter table inventario_jugador add column created_at timestamptz default now();");
 for(const path of ['../supabase/migrations/20261103173113_forja_motor_reglas.sql','../supabase/migrations/20261103182719_equipo_en_combate.sql','../supabase/migrations/20261104005416_inventario_visual_consumibles.sql'])await db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
 await db.exec("create function public.pasivas_raciales_snapshot(text) returns jsonb language sql as $$select '[]'::jsonb$$");
 await db.exec(readFileSync(new URL('../supabase/migrations/20261104134600_yunque_requisitos_y_clases.sql',import.meta.url),'utf8'));
 await db.exec("insert into perfiles values('00000000-0000-0000-0000-000000000001','KUROI');select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);");
 const req={razas:['humanos'],minimos:{fuerza:10}};
 assert.equal((await db.query("select forja_cumple_requisitos($1,'Humanos','{\"fuerza\":10}') as ok",[JSON.stringify(req)])).rows[0].ok,true);
 assert.equal((await db.query("select forja_cumple_requisitos($1,'elfos','{\"fuerza\":10}') as ok",[JSON.stringify(req)])).rows[0].ok,false);
 const item=(await db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,slot_tipo,stats,requisitos_uso) values('Espada','armas','objeto','mano','{\"fuerza\":50}',$1) returning id,clase",[JSON.stringify(req)])).rows[0];assert.equal(item.clase,'B');
 await assert.rejects(db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,stats,equipamiento) values('Niño','humanos','personaje','{\"fuerza\":5}',$1)",[JSON.stringify({mano_der:item.id})]));
 const pj=(await db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,stats,equipamiento) values('Adulto','humanos','personaje','{\"fuerza\":10}',$1) returning id",[JSON.stringify({mano_der:item.id})])).rows[0];
 const snap=(await db.query('select forja_snapshot_config($1) c',[pj.id])).rows[0].c;assert.equal(snap.equipamiento.mano_der.requisitos_uso.minimos.fuerza,10);assert.equal(snap.raza,'humanos');assert.ok(snap.linaje_raza.includes('razas'));
 await db.exec("insert into personajes(id,user_id,nombre,raza,estado_aprobacion,atributos) values(1,'00000000-0000-0000-0000-000000000001','Jugador','Humanos','aprobado','{\"vida\":20,\"fuerza\":5}')");
 const copia=(await db.query("insert into inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,slot_tipo,stats) values('00000000-0000-0000-0000-000000000001',1,$1,'Espada','armas','mano','{\"fuerza\":50}') returning id",[item.id])).rows[0];
 await assert.rejects(db.query('select yugen_interno.aplicar_equipo(1,$1)',[JSON.stringify({mano_der:copia.id})]));
 await db.exec("update personajes set atributos='{\"vida\":20,\"fuerza\":10}' where id=1");await db.query('select yugen_interno.aplicar_equipo(1,$1)',[JSON.stringify({mano_der:copia.id})]);
 const preparado=(await db.query('select yugen_interno.preparar_jugador(1) c')).rows[0].c;assert.equal(preparado.configuracion.equipamiento.mano_der.requisitos_uso.minimos.fuerza,10);assert.ok(preparado.configuracion.linaje_raza.includes('humanos'));
 for(const [n,clase] of [[0,'F'],[10,'D'],[25,'C'],[50,'B'],[100,'A'],[200,'S'],[500,'Z'],[1000,'KUROI']])assert.equal((await db.query("select forja_clase_calculada($1,'[]','[]','[]') c",[JSON.stringify({fuerza:n})])).rows[0].c,clase);
 await assert.rejects(db.query("select forja_validar_requisitos('{\"minimos\":{\"fuerza\":-1}}')"));
 console.log('PostgreSQL: requisitos, validación del servidor, snapshots y clases verificados.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
