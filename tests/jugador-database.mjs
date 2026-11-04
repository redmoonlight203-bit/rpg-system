import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
try{
 for(const path of ['./fixtures/forja_copias_schema.sql','./fixtures/creacion_schema.sql','../supabase/migrations/20261030_forja_copias.sql','../supabase/migrations/20261030_forja_tipos_y_dados.sql','../supabase/migrations/20261030_combate_pasivas.sql','../supabase/migrations/20261030190047_pasivas_reactivas_y_elementos.sql'])await db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
 await db.exec("create role service_role;alter table forja_maestra add column requisitos text,add column defectos text;alter table personajes add column atributos jsonb default '{}',add column estado_vida text default 'vivo';alter table inventario_jugador add column created_at timestamptz default now();");
 for(const path of ['../supabase/migrations/20261103173113_forja_motor_reglas.sql','../supabase/migrations/20261103182719_equipo_en_combate.sql'])await db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));

 await db.exec(`create schema private;grant usage on schema private to authenticated;create function private.tienda_es_gm() returns boolean language sql stable security definer as $$select exists(select 1 from perfiles where id=auth.uid() and rol='KUROI')$$;
 alter table perfiles add column estado text default 'aprobado';alter table personajes add column historia text,add column raza text;
 alter table forja_maestra add column historia text;create schema if not exists auth;create table public.tienda_ofertas(id uuid primary key,estado text,forja_id uuid,negociador_id uuid);
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;grant select,insert,update,delete on inventario_jugador,personajes to authenticated;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261104004039_reencarnados_combate_alma.sql',import.meta.url),'utf8'));
 const gm='00000000-0000-0000-0000-000000000001',a='00000000-0000-0000-0000-000000000002',b='00000000-0000-0000-0000-000000000003';
 await db.query("insert into perfiles(id,rol) values($1,'KUROI'),($2,'REENCARNADO'),($3,'REENCARNADO')",[gm,a,b]);
 await db.query("insert into personajes(id,user_id,nombre,estado_aprobacion) values(1,$1,'Axel','aprobado'),(2,$1,'Otro','aprobado'),(3,$2,'Ajeno','aprobado')",[a,b]);
 const {rows:[i]}=await db.query("insert into inventario_jugador(user_id,nombre,ligado_al_alma,personaje_id) values($1,'Reliquia',true,null) returning id",[a]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
 await db.query('select alma_transferir($1,1,null)',[i.id]);
 await assert.rejects(db.query('select alma_transferir($1,2,null)',[i.id]));
 await assert.rejects(db.query('select alma_transferir($1,3,1)',[i.id]));
 await db.query('select alma_transferir($1,null,1)',[i.id]);
 await db.query('select alma_transferir($1,2,null)',[i.id]);
 assert.equal((await db.query('select personaje_id from inventario_jugador where id=$1',[i.id])).rows[0].personaje_id,2);
 await db.exec('set role authenticated');
 assert.equal((await db.query('select * from personajes')).rows.length,2);
 assert.equal((await db.query("update inventario_jugador set stats='{\"vida\":9999}' where id=$1 returning id",[i.id])).rows.length,0);
 assert.equal((await db.query("update personajes set atributos='{\"vida\":9999}' where id=1 returning id")).rows.length,0);
 await assert.rejects(db.query("select jugador_contexto_servidor($1,null,null)",[a]));
 await db.exec('reset role');
 const bid='00000000-0000-0000-0000-000000000099';
 const datos={fase:'en_curso',actual:'actor',miembros:[{id:'actor',personaje_id:'2',nombre:'Otro',vida:20,configuracion:{equipamiento:{}}}]};
 await db.query('insert into combates_yugen(id,nombre,datos,creador_id) values($1,$2,$3,$4)',[bid,'Encuentro',JSON.stringify(datos),gm]);
 await assert.rejects(db.query('select alma_transferir($1,null,2)',[i.id]));
 const ctx=(await db.query('select jugador_contexto_servidor($1,$2,$3) as c',[a,bid,'actor'])).rows[0].c;assert.equal(ctx.actor.personaje_id,'2');
 await assert.rejects(db.query('select jugador_contexto_servidor($1,$2,$3)',[b,bid,'actor']));
 await assert.rejects(db.query('select jugador_confirmar_servidor($1,$2,$3,0,$4)',[a,bid,'actor',JSON.stringify(datos)]));
 assert.equal((await db.query('select jugador_contexto_servidor($1,null,null) as c',[b])).rows[0].c.length,0);

 // Compra aceptada: una copia ligada va al alma, una normal al personaje y un cuerpo se convierte en personaje.
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[gm]);
 await db.exec("create sequence personajes_test_seq start 100;alter table personajes alter column id set default nextval('personajes_test_seq');");
 const {rows:[plantilla]}=await db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,ligado_al_alma,stats) values('Reliquia comprada','armas','objeto',true,'{\"vida\":2}') returning id");
 const oferta='00000000-0000-0000-0000-000000000088';
 await db.query("insert into tienda_ofertas values($1,'negociando',$2,$3)",[oferta,plantilla.id,a]);
 await db.query("update tienda_ofertas set estado='aceptada' where id=$1",[oferta]);
 let compra=(await db.query('select * from inventario_jugador where compra_oferta_id=$1',[oferta])).rows;
 assert.equal(compra.length,1);assert.equal(compra[0].personaje_id,null);assert.equal(compra[0].ligado_al_alma,true);assert.equal(compra[0].configuracion.tipo_creacion,'objeto');
 await db.query("update tienda_ofertas set estado='aceptada' where id=$1",[oferta]);
 assert.equal((await db.query('select * from inventario_jugador where compra_oferta_id=$1',[oferta])).rows.length,1);
 await db.exec("insert into forja_maestra(nombre,tipo,tipo_creacion,ligado_al_alma,stats) values('Cuerpo comprado','humanos','personaje',true,'{\"vida\":20}');");
 const cuerpo=(await db.query("select id from forja_maestra where nombre='Cuerpo comprado'")).rows[0].id;
 const oferta2='00000000-0000-0000-0000-000000000087';
 await db.query("insert into tienda_ofertas values($1,'negociando',$2,$3)",[oferta2,cuerpo,a]);
 await db.query("update tienda_ofertas set estado='aceptada' where id=$1",[oferta2]);
 assert.equal((await db.query('select nombre from personajes where compra_oferta_id=$1',[oferta2])).rows[0].nombre,'Cuerpo comprado');
 console.log('PostgreSQL: traspasos sin duplicación, propiedad, RLS, turnos, conflictos y entregas de compras correctos.');

}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
