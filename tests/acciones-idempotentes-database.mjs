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
 await db.exec(readFileSync(new URL('../supabase/migrations/20261108193445_combate_guardado_ligero.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20261108195811_combate_acciones_idempotentes.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20261110125629_historial_sin_imagenes.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20261110132345_acciones_descartables.sql',import.meta.url),'utf8'));
 const gm='00000000-0000-0000-0000-000000000001',a='00000000-0000-0000-0000-000000000002',b='00000000-0000-0000-0000-000000000003',bid='00000000-0000-0000-0000-000000000099';
 await db.query("insert into perfiles(id,rol) values($1,'KUROI'),($2,'REENCARNADO'),($3,'REENCARNADO')",[gm,a,b]);
 await db.query("insert into personajes(id,user_id,nombre,raza,atributos,estado_aprobacion) values(1,$1,'A','humanos','{}','aprobado'),(2,$2,'B','humanos','{}','aprobado')",[a,b]);
 const motor=await import('../supabase/functions/equipo-combate/motor.js');
 const {cargarDependencia}=await import('./helpers/cargar-ts.mjs'),{cambiosCombate}=cargarDependencia('combate-transferencia');
 let c=motor.nuevoCombate();
 for(const [id,pj,bando] of [['a','1','jugador'],['b','2','enemigo']]){c=motor.agregar(c,{id,nombre:id,personaje_id:pj,posicion:{x:id==='a'?1:2,y:1},stats:{vida:2000,ph:10,fatiga:5,movimiento:20},configuracion:{tipo_creacion:'personaje'}},bando,()=>10);c.miembros.at(-1).personaje_id=pj;}
 c=motor.iniciar(c,()=>10);c.actual='a';c.regla='directo';
 const retrato='data:image/webp;base64,'+'A'.repeat(4000);
 c.miembros[0].configuracion.imagen_url=retrato;
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[gm]);
 const inicial=crypto.randomUUID(),patch=cambiosCombate(undefined,c);
 let r=(await db.query('select combate_guardar_accion($1,$2,$3,0,false,$4) r',[bid,'QA acciones',patch,inicial])).rows[0].r;
 for(let i=0;i<10;i++){const repetida=(await db.query('select combate_guardar_accion($1,$2,$3,0,false,$4) r',[bid,'QA acciones',patch,inicial])).rows[0].r;assert.equal(repetida.version,r.version);assert.equal(repetida.repetida,true);}
 assert.equal((await db.query('select count(*)::int n from private.combate_acciones')).rows[0].n,1);
 await assert.rejects(db.query('select combate_guardar_accion($1,$2,$3,0,false,$4)',[bid,'Otro nombre',patch,inicial]),/comando diferente/);
 // Un ataque calculado en el servidor, repetido tras perder la respuesta, no gasta PH dos veces.
 let ctx=(await db.query('select jugador_consultar_rapido_servidor($1,$2,$3,null) r',[a,bid,'a'])).rows[0].r;
 let siguiente=motor.actuar(ctx.combate,'a','ataque','b',()=>20);delete siguiente.historial;
 siguiente.miembros[0].ph=8;
 const action=crypto.randomUUID(),comando={operacion:'actuar',accion_id:'ataque',objetivo_id:'b',version:ctx.version};
 let confirmado=(await db.query('select jugador_confirmar_accion_servidor($1,$2,$3,$4,$5,$6,$7) r',[a,bid,'a',action,comando,ctx.version,siguiente])).rows[0].r;
 const vida=confirmado.combate.miembros[1].vida,version=confirmado.version;
 const otraTirada=structuredClone(siguiente);otraTirada.miembros[1].vida=1;otraTirada.miembros[0].ph=6;
 for(let i=0;i<5;i++){
  const repetida=(await db.query('select jugador_confirmar_accion_servidor($1,$2,$3,$4,$5,$6,$7) r',[a,bid,'a',action,comando,ctx.version,otraTirada])).rows[0].r;
  assert.equal(repetida.version,version);assert.equal(repetida.combate.miembros[1].vida,vida);assert.equal(repetida.combate.miembros[0].ph,8);assert.equal(repetida.recibo.repetida,true);
 }
 assert.equal((await db.query('select jugador_accion_estado_servidor($1,$2,$3,$4) r',[a,bid,'a',action])).rows[0].r.confirmada,true);
 await assert.rejects(db.query('select jugador_accion_estado_servidor($1,$2,$3,$4)',[b,bid,'a',action]),/otro participante/);
 const rechazada=crypto.randomUUID();await assert.rejects(db.query('select jugador_confirmar_accion_servidor($1,$2,$3,$4,$5,$6,$7)',[a,bid,'a',rechazada,{operacion:'mover'},0,siguiente]),/cambió/);
 assert.equal((await db.query('select count(*)::int n from private.combate_acciones where action_id=$1',[rechazada])).rows[0].n,0);
 // Cien cambios de turno alternados entre dos identidades, con doble envío de cada comando.
 for(let i=0;i<100;i++){
  const actor=confirmado.combate.actual,usuario=actor==='a'?a:b;
  const previo=confirmado.version,id=crypto.randomUUID(),cmd={operacion:'pasar',version:previo};
  const next=motor.siguiente(confirmado.combate,()=>10);delete next.historial;
  confirmado=(await db.query('select jugador_confirmar_accion_servidor($1,$2,$3,$4,$5,$6,$7) r',[usuario,bid,actor,id,cmd,previo,next])).rows[0].r;
  const duplicado=(await db.query('select jugador_confirmar_accion_servidor($1,$2,$3,$4,$5,$6,$7) r',[usuario,bid,actor,id,cmd,previo,next])).rows[0].r;
  assert.equal(duplicado.version,confirmado.version);assert.equal(confirmado.version,previo+1);assert.deepEqual(duplicado.combate,confirmado.combate);
 }
 assert.equal((await db.query('select count(*)::int n from private.combate_acciones')).rows[0].n,102);
 assert.equal((await db.query('select datos from combates_yugen where id=$1',[bid])).rows[0].datos.historial.length,10);
 const persistido=(await db.query('select datos from combates_yugen where id=$1',[bid])).rows[0].datos;
 assert.equal(JSON.stringify(persistido.historial).includes('data:image/'),false,'el historial de GM y jugador no duplica retratos');
 const restaurado=(await db.query("select combate_guardar_ligero($1,'QA acciones','{}',$2,true) r",[bid,confirmado.version])).rows[0].r;
 assert.equal(restaurado.datos.miembros[0].configuracion.imagen_url,retrato,'deshacer restaura el retrato exacto');
 // Descartar serializa y veta cualquier petición tardía con el mismo identificador.
 const cancelada=crypto.randomUUID();
 assert.equal((await db.query('select combate_descartar_accion($1,$2) r',[bid,cancelada])).rows[0].r.descartada,true);
 await assert.rejects(db.query('select combate_guardar_accion($1,$2,$3,$4,false,$5)',[bid,'QA acciones',{},restaurado.version,cancelada]),/descartada/);
 assert.equal((await db.query('select combate_descartar_accion($1,$2) r',[bid,inicial])).rows[0].r.confirmada,true);
 assert.equal((await db.query('select version from combates_yugen where id=$1',[bid])).rows[0].version,restaurado.version);
 // Las funciones del servidor y los recibos no son accesibles para jugadores por la Data API.
 await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
 await assert.rejects(db.query('select * from private.combate_acciones'),/permission denied/);
 await assert.rejects(db.query('select jugador_accion_estado_servidor($1,$2,$3,$4)',[a,bid,'a',action]),/permission denied/);
 await assert.rejects(db.query('select combate_descartar_accion($1,$2)',[bid,cancelada]),/Solo Kuroi/);
 await assert.rejects(db.query('select combate_accion_estado($1,$2)',[bid,inicial]),/Solo el GM/);
 await db.exec('reset role');
 console.log('SQL: 100 turnos entre dos identidades con doble envío, recibos atómicos, PH/daño únicos, conflictos, historial y permisos correctos.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
