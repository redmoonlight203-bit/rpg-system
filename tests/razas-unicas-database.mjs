import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
// Raza única: propuesta temporal; rechazo sin rastro en el catálogo, aprobación una sola vez,
// permisos por dueño y foto/lugar en la solicitud de personaje.
const db=new PGlite();
const q=async(s,p)=>(await db.query(s,p)).rows;
const uid=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const como=async n=>db.exec(`set request.jwt.claim.sub='${uid(n)}';`);
const FOTO=`https://abc123.supabase.co/storage/v1/object/public/imagenes/${uid(2)}/retratos/0a1b2c.webp`;
try{
 await db.exec(`
 create role anon;create role authenticated;
 create schema auth;create schema private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table perfiles(id uuid primary key,rol text,estado text,mente_colmena boolean default false,lugares_conocidos text[]);
 create function private.tienda_es_gm() returns boolean language sql stable security definer as $$select exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI')$$;
 create table categorias_forja(id uuid primary key default gen_random_uuid(),clave text unique,nombre text,descripcion text,icono text,imagen_url text,parent_id uuid references categorias_forja(id),pasiva_racial jsonb,created_at timestamptz default now());
 create table config_estadisticas(id uuid default gen_random_uuid(),categoria text,clave text,etiqueta text,descripcion text default '',valor_defecto numeric,limite_jugador numeric,created_at timestamptz default now());
 create function public.forja_linaje_claves(p text) returns text[] language sql stable as $$with recursive c as (select * from public.categorias_forja where clave=p union all select x.* from public.categorias_forja x join c on c.parent_id=x.id) select array_agg(clave) from c$$;
 create function public.personaje_atributos_raza(p_categoria uuid) returns setof public.config_estadisticas language sql stable as $$
  with recursive camino as (select c.id,c.clave,c.parent_id,0 as profundidad from public.categorias_forja c where id=p_categoria
  union all select c.id,c.clave,c.parent_id,x.profundidad+1 from public.categorias_forja c join camino x on x.parent_id=c.id)
  select distinct on (s.clave) s.* from camino x join public.config_estadisticas s on s.categoria=x.clave order by s.clave,x.profundidad$$;
 create table personajes(id bigserial primary key,user_id uuid,nombre text,raza text,categoria_id uuid,atributos jsonb default '{}',historia text,defecto text,lugar_reencarnacion text,
  estado_vida text default 'vivo',estado_aprobacion text default 'pendiente',es_companero boolean default false,comentarios_kuroi text default '',
  vida_actual numeric,vida_maxima_actual numeric,ph_actual numeric,fatiga_actual numeric default 0);
 grant usage on schema auth,private,public to authenticated;
 grant select on perfiles,categorias_forja,config_estadisticas,personajes to authenticated;
 insert into perfiles(id,rol,estado,lugares_conocidos) values('${uid(1)}','KUROI','aprobado',null),('${uid(2)}','REENCARNADO','aprobado','{}'),('${uid(3)}','REENCARNADO','aprobado','{}'),('${uid(4)}','REENCARNADO','aprobado','{}');
 update perfiles set mente_colmena=true where id in ('${uid(2)}','${uid(3)}');
 insert into categorias_forja(id,clave,nombre) values('${uid(11)}','razas','Seres vivos');
 insert into categorias_forja(id,clave,nombre,parent_id) values('${uid(12)}','humanos','Humanos','${uid(11)}');
 insert into config_estadisticas(categoria,clave,etiqueta,valor_defecto,limite_jugador) values('razas','vida','Vida',20,30),('razas','ph','PH',5,10);
 insert into personajes(user_id,nombre,raza,categoria_id,estado_aprobacion,atributos) values('${uid(2)}','Axel','humanos','${uid(12)}','aprobado','{"vida":20}'),('${uid(3)}','Bea','humanos','${uid(12)}','aprobado','{"vida":20}');
 `);
 const migracion=readFileSync(new URL('../supabase/migrations/20261120120000_razas_unicas_y_fotos.sql',import.meta.url),'utf8');
 await db.exec(migracion);
 await db.exec('set role authenticated;');
 const catalogo=async()=>({c:(await q('select count(*)::int n from categorias_forja'))[0].n,s:(await q('select count(*)::int n from config_estadisticas'))[0].n});
 const inicial=await catalogo();
 const guardar=(id,{enviar=true,acepta=true,imagen=FOTO,atributos={vida:{valor_defecto:40,limite_jugador:50},ph:{valor_defecto:3,limite_jugador:null}},nombre='Sombras'}={})=>
  q('select public.raza_propuesta_guardar($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9) id',[id,nombre,'Nacidos de la penumbra','alma',imagen,atributos,{nombre:'Velo',descripcion:'Se oculta',reglas:[],reglas_pasivas:[{id:'r1'}]},enviar,acepta]);

 // Acceso: sin personaje aprobado no se puede proponer.
 await como(4);await assert.rejects(guardar(null),/personaje aprobado/);
 await como(2);
 await assert.rejects(guardar(null,{acepta:false}),/advertencia/,'requiere aceptar la advertencia');
 await assert.rejects(guardar(null,{atributos:{fisico:{valor_defecto:1}}}),/no existe/,'solo atributos de razas');
 await assert.rejects(guardar(null,{atributos:{vida:{valor_defecto:10,limite_jugador:5}}}),/límite/);
 await assert.rejects(guardar(null,{imagen:'https://evil.example.com/x.webp'}),/imagen/);
 const borrador=(await guardar(null,{enviar:false,acepta:false,imagen:''}))[0].id;
 assert.equal((await q('select estado from razas_propuestas where id=$1',[borrador]))[0].estado,'borrador');
 await assert.rejects(guardar(null,{enviar:false,acepta:false,imagen:''}),/Ya tienes/,'una propuesta abierta a la vez');
 await guardar(borrador);
 assert.equal((await q('select estado from razas_propuestas where id=$1',[borrador]))[0].estado,'propuesta');

 // Permisos: otro reencarnado no ve ni resuelve propuestas ajenas, y el dueño no se aprueba.
 await como(3);
 assert.equal((await q('select count(*)::int n from razas_propuestas'))[0].n,0,'propuestas ajenas invisibles');
 await assert.rejects(q('select public.raza_propuesta_resolver($1,true)',[borrador]),/Solo el GM/);
 await como(2);await assert.rejects(q('select public.raza_propuesta_resolver($1,true)',[borrador]),/Solo el GM/);
 await assert.rejects(q("insert into razas_propuestas(user_id,estado) values($1,'aprobada')",[uid(2)]),/permission denied/);

 // Rechazo: sin rastro en el catálogo, solo el comentario del GM.
 await como(1);
 await q('select public.raza_propuesta_resolver($1,false,$2)',[borrador,'Demasiado poderosa']);
 assert.deepEqual(await catalogo(),inicial,'el rechazo no publica nada');
 const rechazada=(await q('select * from razas_propuestas where id=$1',[borrador]))[0];
 assert.equal(rechazada.estado,'rechazada');assert.equal(rechazada.comentarios_kuroi,'Demasiado poderosa');
 assert.deepEqual(rechazada.atributos,{});assert.equal(rechazada.imagen_url,null);assert.equal(rechazada.pasiva_racial,null);
 await assert.rejects(q('select public.raza_propuesta_resolver($1,true)',[borrador]),/resuelta/);
 await como(2);await q('select public.raza_propuesta_retirar($1)',[borrador]);
 assert.equal((await q('select count(*)::int n from razas_propuestas'))[0].n,0,'el jugador descarta el aviso sin dejar filas');

 // Aprobación: se publica una sola vez como raza bajo «razas».
 const otra=(await guardar(null))[0].id;
 await como(1);
 const cat=(await q('select public.raza_propuesta_resolver($1,true,$2) id',[otra,'Bienvenidos']))[0].id;
 await assert.rejects(q('select public.raza_propuesta_resolver($1,true)',[otra]),/resuelta/,'no se publica dos veces');
 const raza=(await q('select * from categorias_forja where id=$1',[cat]))[0];
 assert.equal(raza.parent_id,uid(11));assert.equal(raza.raza_unica_de,uid(2));assert.equal(raza.imagen_url,FOTO);assert.equal(raza.pasiva_racial.nombre,'Velo');
 const stats=await q('select clave,valor_defecto,limite_jugador from config_estadisticas where categoria=$1 order by clave',[raza.clave]);
 assert.deepEqual(stats,[{clave:'ph',valor_defecto:'3',limite_jugador:null},{clave:'vida',valor_defecto:'40',limite_jugador:'50'}]);
 assert.equal((await catalogo()).c,inicial.c+1);

 // Solicitud de personaje: raza única solo para su dueño y sin elegir lugar; foto validada.
 await como(3);
 await assert.rejects(q('select public.personaje_solicitar($1,$2,$3,$4,$5,$6::jsonb,null,null)',[cat,'Intruso','','',null,{vida:40}]),/pertenece a otro/);
 await como(2);
 await assert.rejects(q('select public.personaje_solicitar($1,$2,$3,$4,$5,$6::jsonb,null,$7)',[cat,'Nox','','',null,{vida:40},'javascript:alert(1)']),/foto/);
 const pj=(await q('select public.personaje_solicitar($1,$2,$3,$4,$5,$6::jsonb,null,$7) id',[cat,'Nox','','','Montaña Shiro (Prueba de vida)',{vida:45},FOTO]))[0].id;
 const ficha=(await q('select lugar_reencarnacion,imagen_url,atributos from personajes where id=$1',[pj]))[0];
 assert.equal(ficha.lugar_reencarnacion,'Lo decide el GM');assert.equal(ficha.imagen_url,FOTO);assert.equal(ficha.atributos.vida,45);
 const normal=(await q('select public.personaje_solicitar($1,$2,$3,$4,$5,$6::jsonb) id',[uid(12),'Ilia','','',null,{vida:20}]))[0].id;
 assert.equal((await q('select lugar_reencarnacion from personajes where id=$1',[normal]))[0].lugar_reencarnacion,'Montaña Shiro (Prueba de vida)');
 await q('select public.personaje_cambiar_foto($1,$2)',[normal,FOTO]);
 await como(3);await assert.rejects(q('select public.personaje_cambiar_foto($1,null)',[normal]),/No puedes/);
 await db.exec('reset role;');
 await db.exec(migracion);
 console.log('SQL: raza única propuesta/rechazo/aprobación, permisos y foto del personaje.');
}finally{await db.close();}
