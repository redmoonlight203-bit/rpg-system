import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
try{
 for(const path of ['./fixtures/forja_copias_schema.sql','./fixtures/creacion_schema.sql','../supabase/migrations/20261030_forja_copias.sql','../supabase/migrations/20261030_forja_tipos_y_dados.sql','../supabase/migrations/20261030_combate_pasivas.sql','../supabase/migrations/20261030190047_pasivas_reactivas_y_elementos.sql'])await db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
 await db.exec("create role service_role;alter table forja_maestra add column requisitos text,add column defectos text;alter table personajes add column atributos jsonb default '{}',add column estado_vida text default 'vivo';alter table inventario_jugador add column created_at timestamptz default now();");
 for(const path of ['../supabase/migrations/20261103173113_forja_motor_reglas.sql','../supabase/migrations/20261103182719_equipo_en_combate.sql'])await db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));

 await db.exec(`create schema private;grant usage on schema private to authenticated;create function private.tienda_es_gm() returns boolean language sql stable security definer as $$select exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI')$$;
 alter table perfiles add column estado text default 'aprobado';alter table personajes add column historia text,add column raza text;
 alter table forja_maestra add column historia text;create schema if not exists auth;create table public.tienda_ofertas(id uuid primary key,estado text,forja_id uuid,negociador_id uuid);
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;grant select,insert,update,delete on inventario_jugador,personajes to authenticated;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261104004039_reencarnados_combate_alma.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20261104005416_inventario_visual_consumibles.sql',import.meta.url),'utf8'));

 await db.exec(`alter table perfiles add column mente_colmena boolean default false,add column lugares_conocidos text[];
 alter table config_estadisticas add column limite_jugador numeric;
 alter table personajes add column defecto text,add column lugar_reencarnacion text,add column nivel int default 1,add column exp_total bigint default 0;
 create function public.forja_linaje_claves(p text) returns text[] language sql stable set search_path=public as $$with recursive c as (select * from public.categorias_forja where clave=p union all select x.* from public.categorias_forja x join c on c.parent_id=x.id) select array_agg(clave) from c$$;`);
 for(const p of ['20261107192533_personajes_vida_cementerio.sql','20261107193447_personajes_alma_al_morir.sql','20261107201357_alma_cuenta_baul.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+p,import.meta.url),'utf8'));

 await db.exec(`alter table personajes add column es_companero boolean default false,add column party_activo boolean default false;
 create table party_companeros(user_id uuid,personaje_id bigint unique,activo boolean default true);`);
 const partySql=readFileSync(new URL('../supabase/migrations/20261107210338_party_companeros_experiencia.sql',import.meta.url),'utf8');
 await db.exec(partySql.slice(partySql.indexOf('create function private.party_comprobar_gm'),partySql.indexOf('create function private.party_asignar')));
 await db.exec(readFileSync(new URL('../supabase/migrations/20261108004325_party_entrada_automatica_combate.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20261108004806_party_equipo_preparacion.sql',import.meta.url),'utf8'));
 const gm='00000000-0000-0000-0000-000000000001',a='00000000-0000-0000-0000-000000000002',b='00000000-0000-0000-0000-000000000003';
 await db.query("insert into perfiles(id,rol) values($1,'KUROI'),($2,'REENCARNADO'),($3,'REENCARNADO')",[gm,a,b]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[gm]);
 for(const [id,user,npc,activo,vida] of [[1,a,false,false,'vivo'],[2,a,false,false,'vivo'],[3,a,true,true,'vivo'],[4,a,true,false,'vivo'],[5,a,true,true,'muerto'],[6,b,true,true,'vivo'],[7,a,true,true,'vivo']])await db.query("insert into personajes(id,user_id,nombre,raza,atributos,estado_aprobacion,es_companero,party_activo,estado_vida) values($1,$2,$3,'humanos','{\"vida\":20,\"ph\":5}','aprobado',$4,$5,$6)",[id,user,'Pj '+id,npc,activo,vida]);
 await db.query('insert into party_companeros values($1,3,true),($1,4,false),($1,5,true),($2,6,true),($2,7,true)',[a,b]);
 await db.query("update personajes set vida_actual=7,ph_actual=2,fatiga_actual=3 where id=3");
 const item=(await db.query("insert into inventario_jugador(user_id,personaje_id,nombre,tipo,stats,ligado_al_alma,slot_tipo,slot_equipado,configuracion) values($1,3,'Espada NPC','objeto','{}',false,'mano','mano_der','{\"tipo_creacion\":\"objeto\"}') returning id",[a])).rows[0].id;
 let party=(await db.query('select combate_preparar_party(1) as p')).rows[0].p;
 assert.deepEqual(party.map(p=>p.personaje_id),['1','3']);
 assert.equal(party[1].vida_actual,7);assert.equal(party[1].ph_actual,2);assert.equal(party[1].fatiga_actual,3);assert.equal(party[1].configuracion.equipamiento.mano_der.id,item);
 assert.deepEqual((await db.query('select combate_preparar_party(3) as p')).rows[0].p.map(p=>p.personaje_id),['3']);
 await assert.rejects(db.query('select combate_preparar_party(4)'),/party activa/);
 const motor=await import('../supabase/functions/equipo-combate/motor.js');
 const combate=motor.agregarParty(motor.nuevoCombate(),party,'jugador',()=>10),bid='00000000-0000-0000-0000-000000000081';
 await db.query("insert into combates_yugen(id,nombre,datos,creador_id) values($1,'Party preparada',$2,$3)",[bid,combate,gm]);
 let ctx=(await db.query('select yugen_interno.contexto_equipo($1,3,null,null) as c',[a])).rows[0].c;assert.equal(ctx.combate_id,bid);
 const nuevo=motor.cambiarEquipo(ctx.combate,ctx.actor.id,{});
 await db.query('select yugen_interno.confirmar_equipo($1,3,$2,$3,$4,$5,$6,$7)',[a,bid,ctx.actor.id,ctx.version,ctx.firma,{},nuevo]);
 assert.equal((await db.query('select slot_equipado from inventario_jugador where id=$1',[item])).rows[0].slot_equipado,null);
 assert.deepEqual((await db.query('select datos from combates_yugen where id=$1',[bid])).rows[0].datos.miembros[1].configuracion.equipamiento,{});
 await assert.rejects(db.query('select yugen_interno.contexto_equipo($1,3,null,null)',[b]),/no te pertenece/);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);await assert.rejects(db.query('select combate_preparar_party(1)'),/Solo Kuroi/);
 console.log('Equipo sincronizado en preparación sin acción; permisos de propietario correctos.');
 console.log('Party SQL: incluye solo líder y NPC activos de la cuenta, excluye cuerpos alternos y ajenos, conserva equipo y recursos y exige rol GM.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
