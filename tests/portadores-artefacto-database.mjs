// Portadores de artefacto (plan «Yunque · una más», paso 3.2): forma d100 por portador, RLS por identidad.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
const gm='00000000-0000-0000-0000-000000000001',ana='00000000-0000-0000-0000-000000000002',bea='00000000-0000-0000-0000-000000000003';
const migracion=f=>readFileSync(new URL('../supabase/migrations/'+f,import.meta.url),'utf8');
const como=async(id,rol=true)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);if(rol)await db.exec('set role authenticated');};
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table perfiles(id uuid primary key,rol text);
 create function private.tienda_es_gm() returns boolean language sql stable as $$select exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI')$$;
 create table personajes(id bigserial primary key,user_id uuid,nombre text);
 create table forja_maestra(id uuid primary key default gen_random_uuid(),nombre text,tipo_creacion text);
 grant usage on schema public,private,auth to authenticated;grant select on personajes,perfiles,forja_maestra to authenticated;`);
 await db.query("insert into perfiles values($1,'KUROI'),($2,'REENCARNADO'),($3,'REENCARNADO')",[gm,ana,bea]);
 await db.query("insert into personajes(id,user_id,nombre) values(1,$1,'Aiko'),(2,$2,'Bram'),(3,$1,'Ciro')",[ana,bea]);
 const mao=(await db.query("insert into forja_maestra(nombre,tipo_creacion) values('Mao','objeto') returning id")).rows[0].id;
 const sql=migracion('20261123100000_artefactos_con_nivel.sql')+migracion('20261123100100_portadores_artefacto.sql');
 await db.exec(sql);await db.exec(sql);// idempotente
 // El GM da el arma al primer portador: tira d100 y lo guarda.
 await como(gm);
 const primera=(await db.query('select artefacto_portar($1,1) r',[mao])).rows[0].r;
 assert.ok(primera.forma_tirada>=1&&primera.forma_tirada<=100&&primera.nueva===true,JSON.stringify(primera));
 // El mismo portador recupera su forma.
 const otraVez=(await db.query('select artefacto_portar($1,1) r',[mao])).rows[0].r;
 assert.equal(otraVez.forma_tirada,primera.forma_tirada);assert.equal(otraVez.nueva,false);
 // Un portador distinto tira de nuevo y recibe otra forma.
 const segunda=(await db.query('select artefacto_portar($1,2) r',[mao])).rows[0].r;
 assert.notEqual(segunda.forma_tirada,primera.forma_tirada);
 // Clave única (artefacto, personaje).
 await db.exec('reset role');
 await assert.rejects(db.query('insert into portadores_artefacto(artefacto_id,personaje_id,forma_tirada) values($1,1,50)',[mao]),/duplicate|único|unique/i);
 // RLS: el jugador solo lee su propio personaje; no escribe ni porta.
 await como(ana);
 const vistas=(await db.query('select personaje_id from portadores_artefacto order by personaje_id')).rows.map(r=>Number(r.personaje_id));
 assert.deepEqual(vistas,[1]);
 assert.equal((await db.query('update portadores_artefacto set nivel=9')).affectedRows,0,'el jugador no puede escribir');
 await assert.rejects(db.query('insert into portadores_artefacto(artefacto_id,personaje_id,forma_tirada) values($1,3,7)',[mao]),/row-level security/);
 await assert.rejects(db.query('select artefacto_portar($1,3)',[mao]),/Solo el GM/);
 await como(bea);assert.deepEqual((await db.query('select personaje_id from portadores_artefacto')).rows.map(r=>Number(r.personaje_id)),[2]);
 // El GM lee y escribe (nivel y absorbidas).
 await como(gm);
 await db.query("update portadores_artefacto set nivel=2,absorbidas=absorbidas||'[{\"arma\":\"Hacha\"}]' where personaje_id=1");
 assert.equal((await db.query('select nivel from portadores_artefacto where personaje_id=1')).rows[0].nivel,2);
 // Con las 100 formas ocupadas no se puede asignar otra.
 await db.exec('reset role');
 await db.query("insert into personajes(id,user_id,nombre) select g,$1,'Extra '||g from generate_series(10,109) g",[ana]);
 await db.query('insert into portadores_artefacto(artefacto_id,personaje_id,forma_tirada) select $1,g+0,t from (select row_number() over () + 9 g,t from generate_series(1,100) t where t not in (select forma_tirada from portadores_artefacto)) x',[mao]);
 await como(gm);await assert.rejects(db.query('select artefacto_portar($1,109)',[mao]),/formas/);
 console.log('portadores-artefacto-database: OK');
}finally{await db.close();}
