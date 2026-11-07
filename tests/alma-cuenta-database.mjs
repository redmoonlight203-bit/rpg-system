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
 const gm='00000000-0000-0000-0000-000000000001',a='00000000-0000-0000-0000-000000000002',b='00000000-0000-0000-0000-000000000003';
 const como=async(u)=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[u]);
 await db.query("insert into perfiles(id,rol) values($1,'KUROI'),($2,'REENCARNADO'),($3,'REENCARNADO')",[gm,a,b]);
 await como(gm);
 await db.query("insert into personajes(id,user_id,nombre,raza,atributos,estado_aprobacion) values(1,$1,'Axel','humanos','{\"vida\":20,\"ph\":5}','aprobado'),(2,$1,'Otro','humanos','{\"vida\":20}','aprobado'),(3,$2,'Ajeno','humanos','{\"vida\":20}','aprobado')",[a,b]);
 const f=(await db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,ligado_al_alma,stats) values('Compañero del alma','humanos','personaje',true,'{\"vida\":30}') returning id")).rows[0].id;
 const sinCuerpo='00000000-0000-0000-0000-000000000004';
 await db.query("insert into perfiles(id,rol) values($1,'REENCARNADO')",[sinCuerpo]);
 await db.query('select alma_entregar($1,$2,1,$3)',[sinCuerpo,f,'00000000-0000-0000-0000-000000000050']);
 assert.equal((await db.query('select count(*)::int as n from personajes where user_id=$1',[sinCuerpo])).rows[0].n,0);
 assert.equal((await db.query('select personaje_id from inventario_jugador where user_id=$1',[sinCuerpo])).rows[0].personaje_id,null);
 const op='00000000-0000-0000-0000-000000000051';
 const entrega=await db.query('select alma_entregar($1,$2,1,$3) as r',[a,f,op]);
 const item=entrega.rows[0].r.ids[0];
 assert.equal((await db.query('select personaje_id from inventario_jugador where id=$1',[item])).rows[0].personaje_id,null);
 assert.equal((await db.query('select count(*)::int as n from personajes')).rows[0].n,3,'a bound character is an account asset, not a new playable body');
 assert.equal((await db.query('select configuracion from inventario_jugador where id=$1',[item])).rows[0].configuracion.tipo_creacion,'personaje');
 await db.query('select alma_entregar($1,$2,1,$3)',[a,f,op]);assert.equal((await db.query('select count(*)::int as n from inventario_jugador where operacion_id=$1',[op])).rows[0].n,1);
 await como(a);await db.query('select alma_transferir($1,1,null)',[item]);
 await assert.rejects(db.query('select alma_transferir($1,3,1)',[item]));
 await assert.rejects(db.query('select alma_eliminar($1)',[item]),/Solo Kuroi/);
 await assert.rejects(db.query('delete from inventario_jugador where id=$1',[item]),/Solo Kuroi/);
 await assert.rejects(db.query('update inventario_jugador set ligado_al_alma=false where id=$1',[item]),/Kuroi/);
 await assert.rejects(db.query('select alma_entregar($1,$2,1,$3)',[a,f,'00000000-0000-0000-0000-000000000052']),/Solo Kuroi/);
 await como(b);await assert.rejects(db.query('select alma_transferir($1,3,1)',[item]));
 await como(gm);
 const bid='00000000-0000-0000-0000-000000000061';
 await db.query("insert into combates_yugen(id,nombre,datos,creador_id) values($1,'Muerte',$2,$3)",[bid,{fase:'en_curso',miembros:[{id:'axel',nombre:'Axel',personaje_id:'1',stats:{vida:20,ph:5},vida:0,ph:0,fatiga:0}]},gm]);
 assert.equal((await db.query('select personaje_id from inventario_jugador where id=$1',[item])).rows[0].personaje_id,null);
 assert.equal((await db.query('select user_id from inventario_jugador where id=$1',[item])).rows[0].user_id,a);
 assert.equal((await db.query('select jsonb_array_length(snapshot->\'inventario\') as n from cementerio_personajes where personaje_id=1')).rows[0].n,1);
 await como(a);await db.query('select alma_transferir($1,2,null)',[item]);await db.query('select alma_transferir($1,null,2)',[item]);
 await como(gm);await db.query('select alma_eliminar($1)',[item]);assert.equal((await db.query('select count(*)::int as n from inventario_jugador where id=$1',[item])).rows[0].n,0);
 // A purchase of a bound character also lands in the account vault.
 const oferta='00000000-0000-0000-0000-000000000071';await db.query("insert into tienda_ofertas values($1,'negociando',$2,$3)",[oferta,f,a]);await db.query("update tienda_ofertas set estado='aceptada' where id=$1",[oferta]);
 assert.equal((await db.query('select count(*)::int as n from personajes')).rows[0].n,3);
 assert.equal((await db.query('select personaje_id from inventario_jugador where compra_oferta_id=$1',[oferta])).rows[0].personaje_id,null);
 console.log('Alma: entrega por cuenta sin cuerpo, snapshot de personaje, idempotencia, préstamos, propiedad, muerte, devolución, permisos de eliminación y compras correctos.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
