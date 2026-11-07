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
 for(const p of ['20261107192533_personajes_vida_cementerio.sql','20261107193447_personajes_alma_al_morir.sql','20261107201357_alma_cuenta_baul.sql','20261107204543_gm_borrar_personajes.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+p,import.meta.url),'utf8'));

 const gm='00000000-0000-0000-0000-000000000001',a='00000000-0000-0000-0000-000000000002',b='00000000-0000-0000-0000-000000000003';
 const como=async(u)=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[u]);
 await db.query("insert into perfiles(id,rol) values($1,'KUROI'),($2,'REENCARNADO'),($3,'REENCARNADO')",[gm,a,b]);
 await como(gm);
 await db.query("insert into personajes(id,user_id,nombre,raza,atributos,estado_aprobacion) values(1,$1,'Borrable','humanos','{\"vida\":20}','aprobado')",[a]);
 await db.exec('create table arbol_nodos(id int,personaje_id bigint references personajes(id) on delete cascade);create table personaje_naturalezas(id int,personaje_id bigint references personajes(id) on delete cascade);insert into arbol_nodos values(1,1);insert into personaje_naturalezas values(1,1)');
 const item=(await db.query("insert into inventario_jugador(user_id,nombre,ligado_al_alma) values($1,'Reliquia',true) returning id",[a])).rows[0].id;
 await db.query("insert into inventario_jugador(user_id,personaje_id,nombre,ligado_al_alma) values($1,1,'Espada mortal',false)",[a]);
 await como(a);await db.query('select alma_transferir($1,1,null)',[item]);
 await assert.rejects(db.query('select personaje_borrar(1,$1)',[a]),/Solo Kuroi/);
 await como(gm);await assert.rejects(db.query('select personaje_borrar(1,$1)',[b]),/no pertenece/);
 const bid='00000000-0000-0000-0000-000000000061';
 await db.query("insert into combates_yugen(id,nombre,datos,creador_id) values($1,'Activo',$2,$3)",[bid,{fase:'preparacion',miembros:[{id:'pj',personaje_id:'1'}]},gm]);
 await assert.rejects(db.query('select personaje_borrar(1,$1)',[a]),/encuentro/);
 assert.equal((await db.query('select count(*)::int as n from inventario_jugador')).rows[0].n,2);
 await db.query("update combates_yugen set datos='{\"fase\":\"finalizado\",\"miembros\":[]}' where id=$1",[bid]);
 await db.query('select personaje_borrar(1,$1)',[a]);
 assert.equal((await db.query('select count(*)::int as n from personajes')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int as n from inventario_jugador')).rows[0].n,1);
 const reliquia=(await db.query('select * from inventario_jugador where id=$1',[item])).rows[0];assert.equal(reliquia.personaje_id,null);assert.equal(reliquia.slot_equipado,null);assert.equal(reliquia.user_id,a);
 assert.equal((await db.query('select count(*)::int as n from arbol_nodos')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int as n from personaje_naturalezas')).rows[0].n,0);
 await assert.rejects(db.query('select personaje_borrar(1,$1)',[a]),/ya no existe/);
 console.log('Borrado GM: permisos, pertenencia a cuenta, bloqueo de encuentros, devolución al alma y limpieza de ficha, inventario exclusivo, árbol y naturalezas correctos.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
