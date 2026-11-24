// Evolución y legado en PostgreSQL real (PGlite en memoria). Datos ficticios; nunca toca producción.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
const GM='00000000-0000-0000-0000-000000000001',J1='00000000-0000-0000-0000-000000000002',J2='00000000-0000-0000-0000-000000000003';
const como=async u=>db.exec(`set request.jwt.claim.sub='${u}';set role authenticated;`);
// Escrituras del propio servidor (ficha, inventario, combate) fuera de las RPC.
const sistema=async(sql,args)=>{await db.exec('reset role');try{return await db.query(sql,args);}finally{await db.exec('set role authenticated');}};
const uuid=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const q=async(sql,args)=>(await db.query(sql,args)).rows;
try{
 await db.exec(`
 create role anon;create role authenticated;
 create schema auth;create schema private;create schema yugen_interno;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table perfiles(id uuid primary key,rol text,estado text,mente_colmena boolean default false,lugares_conocidos text[]);
 create function private.tienda_es_gm() returns boolean language sql stable security definer as $$select exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI')$$;
 create table categorias_forja(id uuid primary key,clave text,nombre text,parent_id uuid);
 create table config_estadisticas(id uuid default gen_random_uuid(),categoria text,clave text,etiqueta text,valor_defecto numeric,limite_jugador numeric);
 create function public.forja_linaje_claves(p text) returns text[] language sql stable as $$select array[p]$$;
 create table forja_maestra(id uuid primary key default gen_random_uuid(),nombre text,stats jsonb default '{}',formas_historia jsonb not null default '[]');
 create table personajes(id bigserial primary key,user_id uuid,nombre text,raza text,atributos jsonb default '{}',historia text,defecto text,lugar_reencarnacion text,estado_vida text default 'vivo',estado_aprobacion text default 'aprobado',nivel int default 1,exp_total bigint default 0,forja_origen_id uuid,imagen_url text);
 create table inventario_jugador(id uuid primary key default gen_random_uuid(),user_id uuid,personaje_id bigint,forja_id uuid,nombre text,ligado_al_alma boolean default false,slot_equipado text,configuracion jsonb,created_at timestamptz default now());
 create table combates_yugen(id uuid primary key,nombre text,datos jsonb);
 create function yugen_interno.preparar_jugador(p bigint) returns jsonb language sql as $$select jsonb_build_object('stats',atributos) from public.personajes where id=p$$;
 grant usage on schema auth,private,public to authenticated;
 grant select on perfiles,personajes to authenticated;
 insert into perfiles(id,rol,estado) values('${GM}','KUROI','aprobado'),('${J1}','REENCARNADO','aprobado'),('${J2}','REENCARNADO','aprobado');
 `);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261107192533_personajes_vida_cementerio.sql',import.meta.url),'utf8'));
 // Personaje existente ANTES de la migración (compatibilidad) y una plantilla con formas antiguas.
 await db.exec(`insert into forja_maestra(id,nombre,stats,formas_historia) values('${uuid(900)}','Plantilla ficticia','{"vida":20,"ph":4}','[{"nombre":"Niñez","historia":"Primeros pasos","imagen":""},{"nombre":"Madurez","historia":"","imagen":""}]');
  insert into personajes(user_id,nombre,raza,atributos,forja_origen_id) values('${J1}','Pj de prueba','humanos','{"vida":20,"ph":4,"fuerza":2}','${uuid(900)}');`);
 const antesFormas=(await q('select formas_historia from forja_maestra'))[0].formas_historia;
 await db.exec(readFileSync(new URL('../supabase/migrations/20261124200000_evolucion_legado.sql',import.meta.url),'utf8'));
 assert.deepEqual((await q('select formas_historia from forja_maestra'))[0].formas_historia,antesFormas,'18: las formas antiguas no se reescriben');
 assert.equal((await q('select linea_evolutiva from forja_maestra'))[0].linea_evolutiva,null);
 const pj=(await q('select id from personajes'))[0].id;

 // 15: permisos — un jugador no inicializa ni lee la línea completa.
 await como(J1);
 await assert.rejects(q('select public.evolucion_inicializar($1)',[pj]),/Solo el GM/);
 await como(GM);
 const ini=(await q('select public.evolucion_inicializar($1) as r',[pj]))[0].r;
 assert.equal(ini.linea.etapas.length,2,'18: formas antiguas convertidas en etapas de vida');
 assert.equal((await q('select public.evolucion_inicializar($1) as r',[pj]))[0].r.version,1,'inicializar es idempotente');

 // 1, 6: línea con etapas de vida y ramas; incluida una secreta y otra exclusiva.
 const etapa=(id,nombre,stats,extra={})=>({id,tipo:'etapa_vida',nombre,stats,habilidades:[],pasivas:[],...extra});
 const linea={version:1,inicial:'nino',etapas:[
  etapa('nino','Infancia · 6 años',{vida:20,ph:4,fuerza:2},{edad:6}),
  etapa('joven','Juventud · 18 años',{vida:40,ph:8,fuerza:6},{edad:18,retrato:'https://example.com/joven.webp'}),
  etapa('guerrero','Ruta de guerra',{vida:70,ph:6,fuerza:12},{tipo:'evolucion'}),
  etapa('espiritu','Ruta espiritual',{vida:50,ph:20,fuerza:6},{tipo:'evolucion',secreta:true}),
 ],transiciones:[
  {id:'crecer',desde:'nino',hasta:'joven',modo:'automatica',requisito:{tipo:'todas',condiciones:[{tipo:'nivel',minimo:3},{tipo:'edad',minimo:18}]}},
  {id:'guerra',desde:'joven',hasta:'guerrero',modo:'solicitud_jugador',exclusiva:true,requisito:{tipo:'alguna',condiciones:[{tipo:'mision',clave:'Torneo'},{tipo:'objeto',forja_id:uuid(700),consumir:true}]}},
  {id:'alma',desde:'joven',hasta:'espiritu',modo:'manual_gm',requisito:{tipo:'no',condicion:{tipo:'mision',clave:'Torneo'}}},
 ]};
 await assert.rejects(q('select public.evolucion_guardar_linea($1,$2,$3)',[pj,{...linea,transiciones:[...linea.transiciones,{id:'ciclo',desde:'guerrero',hasta:'joven',modo:'manual_gm',requisito:{tipo:'siempre'}}]},1]),/ciclo/,'7: impide ciclos');
 await assert.rejects(q('select public.evolucion_guardar_linea($1,$2,$3)',[pj,{...linea,transiciones:[{id:'x',desde:'nino',hasta:'nadie',modo:'manual_gm',requisito:{tipo:'siempre'}}]},1]),/rota/,'7: impide conexiones rotas');
 // La etapa actual (de la plantilla antigua) debe seguir existiendo: se conserva y se añaden las nuevas.
 const actualAntigua=ini.linea.inicial;
 await assert.rejects(q('select public.evolucion_guardar_linea($1,$2,$3)',[pj,linea,1]),/etapa actual/);
 const lineaCompat={...linea,inicial:actualAntigua,etapas:[{...ini.linea.etapas[0]},...linea.etapas],transiciones:[{id:'origen',desde:actualAntigua,hasta:'nino',modo:'manual_gm',requisito:{tipo:'siempre'}},...linea.transiciones]};
 await q('select public.evolucion_guardar_linea($1,$2,$3)',[pj,lineaCompat,1]);
 await assert.rejects(q('select public.evolucion_guardar_linea($1,$2,$3)',[pj,lineaCompat,1]),/Otra persona/,'20: control de versión entre usuarios');
 await q('select public.evolucion_aplicar($1,$2,$3)',[pj,'origen',uuid(1)]);

 // 7: requisitos combinados (Y) evaluados en el servidor; 2: la automática conserva identidad.
 await sistema("update personajes set nivel=3,exp_total=300,vida_actual=12 where id=$1",[pj]);
 assert.deepEqual((await q('select public.evolucion_comprobar($1) as r',[pj]))[0].r,[],'falta la edad');
 const auto=(await q("select public.evolucion_registrar_hito($1,'edad','',18) as r",[pj]))[0].r;
 assert.deepEqual(auto.automaticas,['joven'],'automática al cumplir requisitos');
 assert.deepEqual((await q('select public.evolucion_comprobar($1) as r',[pj]))[0].r,[],'14: no evoluciona dos veces');
 let p=(await sistema('select * from personajes where id=$1',[pj])).rows[0];
 assert.equal(p.id,pj);assert.equal(p.user_id,J1);assert.equal(p.nivel,3);assert.equal(String(p.exp_total),'300');
 assert.equal(p.atributos.vida,40);assert.equal(p.atributos.fuerza,6);
 assert.equal(Number(p.vida_actual),12,'13: sin curación gratuita al crecer');
 assert.equal(p.imagen_url,'https://example.com/joven.webp','retrato de la etapa');

 // 16: el jugador ve lo vivido y la siguiente no secreta, nunca la secreta ni sus estadísticas.
 await como(J1);
 const vista=(await q('select public.evolucion_vista($1) as v',[pj]))[0].v;
 assert.equal(vista.gm,false);assert.equal(vista.linea,undefined);
 assert.deepEqual(vista.siguientes.map(s=>s.etapa.nombre),['Ruta de guerra']);
 assert.equal(JSON.stringify(vista).includes('Ruta espiritual'),false);
 assert.equal(JSON.stringify(vista.siguientes).includes('"fuerza"'),false);
 assert.equal((await q('select count(*)::int as n from personaje_evolucion'))[0].n,0,'RLS: la línea completa no es legible para el jugador');
 assert.equal((await q('select count(*)::int as n from personaje_etapas_historial'))[0].n,3,'su historial sí');
 await como(J2);
 await assert.rejects(q('select public.evolucion_vista($1)',[pj]),/no es tuyo/);
 await assert.rejects(q('select public.evolucion_solicitar($1,$2,$3)',[pj,'guerra',uuid(10)]),/no es tuyo/);
 await como(J1);
 // 15: el jugador no aplica una evolución que no es automática ni pide una secreta.
 await assert.rejects(q('select public.evolucion_aplicar($1,$2,$3)',[pj,'guerra',uuid(11)]),/no es automática/);
 await assert.rejects(q('select public.evolucion_solicitar($1,$2,$3)',[pj,'alma',uuid(12)]),/no está disponible/);
 await assert.rejects(q('select public.evolucion_solicitar($1,$2,$3)',[pj,'guerra',uuid(13)]),/requisitos/);

 // 12: consumir objeto: se borra exactamente una copia (no ligada al alma) y nada se duplica.
 await como(GM);
 await sistema("insert into inventario_jugador(user_id,personaje_id,forja_id,nombre) values($1,$2,$3,'Fragmento'),($1,$2,$3,'Fragmento')",[J1,pj,uuid(700)]);
 await sistema("insert into inventario_jugador(user_id,personaje_id,forja_id,nombre,ligado_al_alma) values($1,$2,$3,'Reliquia',true)",[J1,pj,uuid(701)]);
 await como(J1);
 const sol=(await q('select public.evolucion_solicitar($1,$2,$3) as s',[pj,'guerra',uuid(14)]))[0].s;
 const sol2=(await q('select public.evolucion_solicitar($1,$2,$3) as s',[pj,'guerra',uuid(14)]))[0].s;
 assert.equal(sol.id,sol2.id,'solicitud idempotente');
 await como(GM);
 const [a,b]=await Promise.all([
  q('select public.evolucion_resolver_solicitud($1,true) as r',[sol.id]),
  q('select public.evolucion_aplicar($1,$2,$3) as r',[pj,'guerra',sol.action_id]),
 ]);
 assert.ok(a&&b);
 assert.equal((await q('select count(*)::int as n from personaje_etapas_historial where action_id=$1',[sol.action_id]))[0].n,1,'14: doble clic o petición simultánea, una sola evolución');
 assert.equal((await sistema("select count(*)::int as n from inventario_jugador where forja_id=$1",[uuid(700)])).rows[0].n,1,'12: consume solo una copia');
 assert.equal((await sistema("select count(*)::int as n from inventario_jugador where forja_id=$1",[uuid(701)])).rows[0].n,1,'el alma no se toca');
 const ev=(await q('select * from personaje_evolucion where personaje_id=$1',[pj]))[0];
 assert.equal(ev.etapa_actual,'guerrero');
 assert.deepEqual(ev.hitos.rutas_cerradas,['alma'],'6: la ruta exclusiva cierra la alternativa');

 // 3, 4: el historial guarda su propia instantánea; editar la línea después no la altera.
 const hist=await q("select * from personaje_etapas_historial where personaje_id=$1 order by created_at,id",[pj]);
 assert.deepEqual(hist.map(h=>h.origen),['inicial','gm','automatica','jugador']);
 const joven=hist.find(h=>h.etapa_id==='joven');
 assert.equal(joven.snapshot.stats.fuerza,6);assert.equal(joven.autorizado_por,GM);
 const nueva=JSON.parse(JSON.stringify(lineaCompat));nueva.etapas.find(e=>e.id==='joven').stats.fuerza=999;
 await q('select public.evolucion_guardar_linea($1,$2,$3)',[pj,nueva,ev.version]);
 assert.equal((await q("select snapshot from personaje_etapas_historial where id=$1",[joven.id]))[0].snapshot.stats.fuerza,6,'4: historial independiente');
 await assert.rejects(sistema("update personaje_etapas_historial set origen='gm' where id=$1",[joven.id]),/no se modifica/);

 // 8, 9: evolución en un encuentro real se guarda al finalizar; en práctica nunca.
 const lineaB={...nueva,etapas:[...nueva.etapas,etapa('titan','Titán',{vida:120,ph:6,fuerza:20},{tipo:'evolucion'})],transiciones:[...nueva.transiciones,{id:'titan',desde:'guerrero',hasta:'titan',modo:'evento_combate',requisito:{tipo:'autorizacion_gm'}}]};
 await q('select public.evolucion_guardar_linea($1,$2,$3)',[pj,lineaB,ev.version+1]);
 const miembro=(extra)=>({id:'pj',personaje_id:String(pj),nombre:'Pj de prueba',stats:{vida:120,ph:6},vida:30,ph:3,fatiga:0,...extra});
 const evolucion={etapa_id:'titan',nombre:'Titán',transicion_id:'titan',action_id:uuid(50),persistir:true,habilidades:[],pasivas:[]};
 await sistema("insert into combates_yugen values($1,'Práctica',$2)",[uuid(60),{fase:'en_curso',politica:{modo:'entrenamiento'},miembros:[miembro({evolucion})]}]);
 await sistema("update combates_yugen set datos=$2 where id=$1",[uuid(60),{fase:'finalizado',politica:{modo:'entrenamiento'},miembros:[miembro({evolucion})]}]);
 assert.equal((await q('select etapa_actual from personaje_evolucion where personaje_id=$1',[pj]))[0].etapa_actual,'guerrero','17: la práctica no modifica al personaje real');
 await sistema("insert into combates_yugen values($1,'Real',$2)",[uuid(61),{fase:'en_curso',politica:{modo:'oficial'},miembros:[miembro({evolucion:{...evolucion,action_id:uuid(51)}})]}]);
 await assert.rejects(q('select public.evolucion_aplicar($1,$2,$3)',[pj,'titan',uuid(52)]),/encuentro/,'no evoluciona fuera del encuentro mientras está en uno');
 await como(J1);
 // El cierre lo puede confirmar el servidor con la identidad del jugador: la evolución se guarda igual.
 await sistema("update combates_yugen set datos=$2 where id=$1",[uuid(61),{fase:'finalizado',politica:{modo:'oficial'},miembros:[miembro({evolucion:{...evolucion,action_id:uuid(51)}})]}]);
 await como(GM);
 p=(await sistema('select * from personajes where id=$1',[pj])).rows[0];
 assert.equal((await q('select etapa_actual from personaje_evolucion where personaje_id=$1',[pj]))[0].etapa_actual,'titan','9: persiste tras el encuentro real');
 assert.equal(p.atributos.fuerza,20);assert.equal(Number(p.vida_actual),30,'conserva la vida del combate');
 assert.equal((await q("select combate_id from personaje_etapas_historial where etapa_id='titan'"))[0].combate_id,uuid(61));

 // 19: el cementerio conserva la etapa en la que murió y el historial.
 await sistema("update personajes set vida_actual=0 where id=$1",[pj]);
 await db.exec('reset role');
 const cem=(await q('select snapshot from cementerio_personajes where personaje_id=$1',[pj]))[0].snapshot;
 assert.equal(cem.evolucion.etapa_actual,'titan');
 assert.equal(cem.evolucion.historial.length,5);
 assert.equal(cem.evolucion.historial[1].snapshot.nombre,'Infancia · 6 años');
 console.log('PostgreSQL: evolución y legado correctos (identidad, requisitos, permisos, idempotencia, combate y cementerio).');
}catch(e){console.error(e);process.exitCode=1;}finally{await db.close();}
