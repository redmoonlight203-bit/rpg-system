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
 await db.exec(readFileSync(new URL('../supabase/migrations/20261107210033_actualizaciones_tiempo_real.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20261108013535_combate_sincronizacion_rapida.sql',import.meta.url),'utf8'));
 const gm='00000000-0000-0000-0000-000000000001',a='00000000-0000-0000-0000-000000000002',b='00000000-0000-0000-0000-000000000003',otro='00000000-0000-0000-0000-000000000004',bid='00000000-0000-0000-0000-000000000099';
 await db.query("insert into perfiles(id,rol) values($1,'KUROI'),($2,'REENCARNADO'),($3,'REENCARNADO'),($4,'REENCARNADO')",[gm,a,b,otro]);
 await db.query("insert into personajes(id,user_id,nombre,raza,atributos,estado_aprobacion) values(1,$1,'Axel','humanos','{}','aprobado'),(2,$2,'Rival','humanos','{}','aprobado')",[a,b]);
 const motor=await import('../supabase/functions/equipo-combate/motor.js');
 let c=motor.nuevoCombate();
 for(const [id,pj,bando] of [['a','1','jugador'],['b','2','enemigo']]){c=motor.agregar(c,{id,nombre:id,personaje_id:pj,stats:{vida:20},configuracion:{tipo_creacion:'personaje'}},bando,()=>10);c.miembros.at(-1).personaje_id=pj;}
 c=motor.iniciar(c,()=>10);c.actual='a';
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[gm]);
 await db.query("insert into combates_yugen(id,nombre,datos,creador_id) values($1,'Prueba PvP',$2,$3)",[bid,c,gm]);
 let usuarios=(await db.query('select user_id from combate_actualizaciones order by user_id')).rows.map(x=>x.user_id);assert.deepEqual(usuarios,[gm,a,b]);
 const revisionAjena=(await db.query('select revision from avisos_actualizacion where user_id=$1',[otro])).rows[0].revision;
 const version=(await db.query('select version from combates_yugen where id=$1',[bid])).rows[0].version;
 let ctx=(await db.query('select jugador_consultar_rapido_servidor($1,$2,$3,null) c',[a,bid,'a'])).rows[0].c;
 assert.equal(ctx.combate.historial,undefined);assert.equal(ctx.propios.length,1);
 assert.equal((await db.query('select jugador_consultar_rapido_servidor($1,$2,$3,$4) c',[a,bid,'a',version])).rows[0].c.sin_cambios,true);
 await assert.rejects(db.query('select jugador_consultar_rapido_servidor($1,$2,$3,$4)',[otro,bid,'a',version]),/no te pertenece/);
 const anterior=structuredClone(c);let next=motor.desplazar(ctx.combate,'a',{x:2,y:1});delete next.historial;
 ctx=(await db.query('select jugador_confirmar_rapido_servidor($1,$2,$3,$4,$5) c',[a,bid,'a',version,next])).rows[0].c;
 assert.equal(ctx.version,version+1);assert.equal(ctx.combate.historial,undefined);assert.deepEqual(ctx.combate.miembros[0].posicion,{x:2,y:1});
 const almacenado=(await db.query('select datos from combates_yugen where id=$1',[bid])).rows[0].datos;
 assert.equal(almacenado.historial.length,Math.min(10,anterior.historial.length+1));assert.deepEqual(motor.deshacer(almacenado).miembros[0].posicion,anterior.miembros[0].posicion);
 assert.equal((await db.query('select revision from avisos_actualizacion where user_id=$1',[otro])).rows[0].revision,revisionAjena);
 assert.equal((await db.query("select current_setting('yugen.combate_mutando',true) profundidad")).rows[0].profundidad,'');
 await assert.rejects(db.query('select jugador_confirmar_rapido_servidor($1,$2,$3,$4,$5)',[a,bid,'a',version,next]),/cambió/);
 assert.equal((await db.query('select version from combates_yugen where id=$1',[bid])).rows[0].version,version+1);
 // El cliente de Edge no puede sustituir el historial; se conserva solo el último tramo real.
 for(let i=0;i<12;i++){
  next=structuredClone(ctx.combate);next.historial=[{inventado:true}];
  ctx=(await db.query('select jugador_confirmar_rapido_servidor($1,$2,$3,$4,$5) c',[a,bid,'a',ctx.version,next])).rows[0].c;
 }
 const h=(await db.query("select datos->'historial' h from combates_yugen where id=$1",[bid])).rows[0].h;
 assert.equal(h.length,10);assert.ok(h.every(x=>!x.inventado&&!x.historial));
 next=structuredClone(ctx.combate);next.fase='finalizado';next.actual=null;
 ctx=(await db.query('select jugador_confirmar_rapido_servidor($1,$2,$3,$4,$5) c',[a,bid,'a',ctx.version,next])).rows[0].c;
 assert.equal(ctx.combate.fase,'finalizado');
 await db.exec('set role authenticated');
 await assert.rejects(db.query('select jugador_consultar_rapido_servidor($1,$2,$3,null)',[a,bid,'a']),/permission denied/);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
 assert.equal((await db.query('select * from combate_actualizaciones')).rows.length,1);
 await assert.rejects(db.query('select combate_consultar_revision($1,null)',[bid]),/Solo el GM/);
 await assert.rejects(db.query('delete from combate_actualizaciones'),/permission denied/);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[gm]);
 assert.equal((await db.query('select combate_consultar_revision($1,$2) c',[bid,ctx.version])).rows[0].c.sin_cambios,true);
 assert.equal((await db.query('select combate_consultar_revision($1,null) c',[bid])).rows[0].c.datos.historial.length,10);
 await db.exec('reset role');
 await db.query('delete from combates_yugen where id=$1',[bid]);
 assert.equal((await db.query('select * from combate_actualizaciones')).rows.length,3);
 console.log('PvP SQL: avisos privados y limitados a participantes, historial íntegro de 10 pasos, lectura condicional, autorización, conflictos y finalización correctos.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
