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
 await db.exec(readFileSync(new URL('../supabase/migrations/20261108152942_forja_alma_unica_y_restablecer.sql',import.meta.url),'utf8'));
 const gm='00000000-0000-0000-0000-000000000001',a='00000000-0000-0000-0000-000000000002',b='00000000-0000-0000-0000-000000000003';
 const como=async u=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[u]);
 await db.query("insert into perfiles(id,rol) values($1,'KUROI'),($2,'REENCARNADO'),($3,'REENCARNADO')",[gm,a,b]);await como(gm);
 await db.query("insert into personajes(id,user_id,nombre,raza,atributos,estado_aprobacion) values(1,$1,'Axel','humanos','{}','aprobado')",[a]);
 const f=(await db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,ligado_al_alma,stats,slot_tipo) values('Única','armas','objeto',true,'{}','mano') returning id")).rows[0].id;
 const idSolicitud=crypto.randomUUID();
 await assert.rejects(db.query('select alma_entregar($1,$2,2,$3)',[a,f,crypto.randomUUID()]),/copia única/);
 assert.equal((await db.query('select count(*)::int n from inventario_jugador')).rows[0].n,0);
 const entrega=(await db.query('select alma_entregar($1,$2,1,$3) r',[a,f,idSolicitud])).rows[0].r;
 assert.equal((await db.query('select alma_entregar($1,$2,1,$3) r',[a,f,idSolicitud])).rows[0].r.ids[0],entrega.ids[0]);
 await assert.rejects(db.query('select alma_entregar($1,$2,1,$3)',[b,f,crypto.randomUUID()]),/copia única/);
 await assert.rejects(db.query("select forja_crear_copias($1,'batalla',null,1,'QA',$2,null)",[f,crypto.randomUUID()]),/única/);
 await como(a);await db.query('select alma_transferir($1,1,null)',[entrega.ids[0]]);
 await db.exec('set role authenticated');
 assert.equal((await db.query('select * from forja_almas_unicas')).rows.length,0);
 await assert.rejects(db.query('select forja_restablecer_alma($1)',[f]),/Solo Kuroi/);
 await assert.rejects(db.query('delete from forja_almas_unicas'),/permission denied/);
 await db.exec('reset role');await como(gm);
 const bid=crypto.randomUUID();await db.query("insert into combates_yugen(id,nombre,datos,creador_id) values($1,'QA alma','{\"fase\":\"preparacion\",\"miembros\":[{\"id\":\"a\",\"personaje_id\":\"1\"}]}',$2)",[bid,gm]);
 await assert.rejects(db.query('select forja_restablecer_alma($1)',[f]),/encuentro activo/);
 await db.query('delete from combates_yugen where id=$1',[bid]);
 const reinicio=(await db.query('select forja_restablecer_alma($1) r',[f])).rows[0].r;
 assert.equal(reinicio.retiradas,1);assert.equal((await db.query('select count(*)::int n from inventario_jugador')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from forja_almas_unicas')).rows[0].n,0);
 // Una respuesta antigua nunca vuelve a entregar la copia retirada.
 await db.query('select alma_entregar($1,$2,1,$3)',[a,f,idSolicitud]);
 assert.equal((await db.query('select count(*)::int n from inventario_jugador')).rows[0].n,0);
 await db.query('select alma_entregar($1,$2,1,$3)',[b,f,crypto.randomUUID()]);
 assert.equal((await db.query('select user_id,personaje_id from inventario_jugador')).rows[0].user_id,b);
 assert.equal((await db.query('select personaje_id from inventario_jugador')).rows[0].personaje_id,null);
 await assert.rejects(db.query('update forja_maestra set ligado_al_alma=false where id=$1',[f]),/Restablece/);
 const npc=(await db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,equipamiento,stats) values('NPC','humanos','personaje',jsonb_build_object('mano_der',$1::text),'{}') returning id",[f])).rows[0].id;
 await assert.rejects(db.query('select combate_preparar_personaje($1)',[npc]),/no puede copiarse/);
 await assert.rejects(db.query('select combate_preparar_objeto($1)',[f]),/única/);
 // La tienda comparte la reserva: no cobra ni acepta una compra que duplicaría el alma.
 const oferta=crypto.randomUUID();await db.query("insert into tienda_ofertas values($1,'negociando',$2,$3)",[oferta,f,a]);
 await assert.rejects(db.query("update tienda_ofertas set estado='aceptada' where id=$1",[oferta]),/copia única/);
 assert.equal((await db.query('select estado from tienda_ofertas where id=$1',[oferta])).rows[0].estado,'negociando');
 await db.query('select forja_restablecer_alma($1)',[f]);
 assert.equal((await db.query('select estado from tienda_ofertas where id=$1',[oferta])).rows[0].estado,'retirada');
 const ofertaNueva=crypto.randomUUID();await db.query("insert into tienda_ofertas values($1,'negociando',$2,$3)",[ofertaNueva,f,a]);
 await db.query("update tienda_ofertas set estado='aceptada' where id=$1",[ofertaNueva]);
 assert.equal((await db.query('select count(*)::int n from inventario_jugador where forja_id=$1',[f])).rows[0].n,1);
 assert.equal((await db.query('select personaje_id from inventario_jugador where forja_id=$1',[f])).rows[0].personaje_id,null);
 // Marcar una creación normal con varias copias no elimina datos ni permite duplicados.
 const normal=(await db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,stats,slot_tipo) values('Normal','armas','objeto','{}','mano') returning id")).rows[0].id;
 await db.query("select forja_crear_copias($1,'inventario',1,2,'QA',$2,null)",[normal,crypto.randomUUID()]);
 await assert.rejects(db.query('update forja_maestra set ligado_al_alma=true where id=$1',[normal]),/copias adicionales/);
 const singular=(await db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,stats,slot_tipo) values('Singular','armas','objeto','{}','mano') returning id")).rows[0].id;
 await db.query("select forja_crear_copias($1,'inventario',1,1,'QA',$2,null)",[singular,crypto.randomUUID()]);
 await db.query('update forja_maestra set ligado_al_alma=true where id=$1',[singular]);
 assert.equal((await db.query('select personaje_id from inventario_jugador where forja_id=$1',[singular])).rows[0].personaje_id,null);
 assert.equal((await db.query('select user_id from forja_almas_unicas where forja_id=$1',[singular])).rows[0].user_id,a);
 console.log('Alma única: entrega, compra indirecta protegida por trigger, idempotencia, retorno al baúl, restablecimiento GM, bloqueo de combate, protección de NPC y RLS correctos.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
