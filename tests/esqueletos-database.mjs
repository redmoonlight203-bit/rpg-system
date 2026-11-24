// Esqueletos del GM (plan maestro, Apéndice D · C.6): migración idempotente y escritura solo para el GM.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
const gm='00000000-0000-0000-0000-000000000001',ana='00000000-0000-0000-0000-000000000002';
const como=async(id)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
const guadana={id:'guadana',nombre:'Guadaña',base:'hacha',familia_gesto:'golpe_pesado',longitud_relativa:1.8,fases:{preparacion:220,impacto:100,recuperacion:260},anclas:[{id:'mango',x:10,y:50},{id:'centro',x:50,y:48},{id:'punta',x:90,y:30}]};
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table perfiles(id uuid primary key,rol text);
 create function private.tienda_es_gm() returns boolean language sql stable as $$select exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI')$$;
 grant usage on schema public,private,auth to authenticated;grant select on perfiles to authenticated;`);
 await db.query("insert into perfiles values($1,'KUROI'),($2,'REENCARNADO')",[gm,ana]);
 const sql=readFileSync(new URL('../supabase/migrations/20261123130000_esqueletos.sql',import.meta.url),'utf8');
 await db.exec(sql);await db.exec(sql);// idempotente
 await como(gm);
 await db.query('insert into esqueletos(id,nombre,definicion) values($1,$2,$3)',['guadana','Guadaña',guadana]);
 assert.equal((await db.query('select creado_por from esqueletos')).rows[0].creado_por,gm);
 await assert.rejects(db.query('insert into esqueletos(id,nombre,definicion) values($1,$2,$3)',['espada','Otra espada',{...guadana,id:'espada'}]),/check/i,'no se pisan los esqueletos base');
 await assert.rejects(db.query('insert into esqueletos(id,nombre,definicion) values($1,$2,$3)',['otro','Otro',guadana]),/check/i,'el id de la definición coincide');
 await como(ana);
 assert.equal((await db.query('select id from esqueletos')).rows.length,1,'el jugador lo lee para animar');
 await assert.rejects(db.query('insert into esqueletos(id,nombre,definicion) values($1,$2,$3)',['latigo','Látigo',{...guadana,id:'latigo'}]),/row-level security/);
 assert.equal((await db.query("update esqueletos set nombre='X'")).affectedRows,0,'el jugador no escribe');
 assert.equal((await db.query('delete from esqueletos')).affectedRows,0);
 console.log('esqueletos-database: correcto');
}finally{await db.close();}
