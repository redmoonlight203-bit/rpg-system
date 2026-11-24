import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
try{
 for(const path of ['./fixtures/forja_copias_schema.sql','./fixtures/creacion_schema.sql','../supabase/migrations/20261030_forja_copias.sql','../supabase/migrations/20261030_forja_tipos_y_dados.sql','../supabase/migrations/20261030_combate_pasivas.sql','../supabase/migrations/20261030190047_pasivas_reactivas_y_elementos.sql'])await db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
 await db.exec("create role service_role;alter table forja_maestra add column requisitos text,add column defectos text;alter table personajes add column atributos jsonb default '{}',add column estado_vida text default 'vivo';alter table inventario_jugador add column created_at timestamptz default now();");
 for(const path of ['../supabase/migrations/20261103173113_forja_motor_reglas.sql','../supabase/migrations/20261103182719_equipo_en_combate.sql','../supabase/migrations/20261104005416_inventario_visual_consumibles.sql'])await db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
 const gm='00000000-0000-0000-0000-000000000001';
 await db.query("insert into perfiles values($1,'KUROI')",[gm]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[gm]);
 const accion='[{"id":"z","nombre":"Zarpazo","efecto":"dano","cantidad":1,"caras":6,"modificador":0,"coste_ph":0,"coste_fatiga":0,"enfriamiento":0,"duracion":0}]';
 const {rows:[pj]}=await db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,configuracion_dados) values('Aldric','humanos','personaje',$1) returning id",[accion]);
 const {rows:[ob]}=await db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,configuracion_dados) values('Lanza','armas','objeto',$1) returning id",[accion]);
 const antes={pj:(await db.query('select forja_snapshot_config($1) as c',[pj.id])).rows[0].c,ob:(await db.query('select forja_snapshot_config($1) as c',[ob.id])).rows[0].c};
 await db.exec(readFileSync(new URL('../supabase/migrations/20261124120000_acciones_personaje.sql',import.meta.url),'utf8'));
 const snap=async id=>(await db.query('select forja_snapshot_config($1) as c',[id])).rows[0].c;
 const p=await snap(pj.id),o=await snap(ob.id);
 assert.equal(p.acciones_personaje[0].nombre,'Zarpazo');
 assert.deepEqual(o.acciones_personaje,[]);
 const sin=({acciones_personaje,...r})=>r;
 assert.deepEqual(sin(p),sin(antes.pj));assert.deepEqual(sin(o),sin(antes.ob));
 assert.equal((await db.query("select has_function_privilege('authenticated','public.forja_snapshot_config(uuid)','EXECUTE') as x")).rows[0].x,false);
 assert.equal((await db.query("select has_function_privilege('authenticated','private.forja_snapshot_config_base(uuid)','EXECUTE') as x")).rows[0].x,false);
 console.log('PostgreSQL: snapshot de personajes con acciones propias correcto.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
