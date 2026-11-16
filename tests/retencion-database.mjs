import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const sql=n=>readFileSync(new URL('../supabase/migrations/'+n,import.meta.url),'utf8');
try{
 await db.exec(`create role anon;create role authenticated;create schema private;create schema auth;
 create table auth.sesion(uid uuid);insert into auth.sesion values(null);
 create function auth.uid() returns uuid language sql as $$select uid from auth.sesion$$;
 create function private.tienda_es_gm() returns boolean language sql as $$select true$$;
 create table public.combates_yugen(id uuid primary key,nombre text,datos jsonb,updated_at timestamptz default now());
 create table public.resultados_encuentro(combate_id uuid primary key,aprobado boolean not null default false,created_at timestamptz not null default now());
 create table private.combate_acciones(combate_id uuid,action_id uuid,creado_at timestamptz not null default now(),primary key(combate_id,action_id));
 create table private.combate_acciones_descartadas(combate_id uuid,action_id uuid,creado_at timestamptz not null default now(),primary key(combate_id,action_id));
 create table public.combate_actualizaciones(user_id uuid,combate_id uuid,primary key(user_id,combate_id));`);
 await db.exec(sql('20261116120000_retencion_semanal.sql'));
 const id=n=>`00000000-0000-0000-0000-00000000000${n}`;
 const [activo,viejo,reciente,borrado,pendiente]=[1,2,3,4,5].map(id);
 await db.query(`insert into combates_yugen values
  ($1,'Activo','{"fase":"en_curso"}',now()-interval '40 days'),
  ($2,'Terminado viejo','{"fase":"finalizado"}',now()-interval '10 days'),
  ($3,'Terminado reciente','{"fase":"finalizado"}',now()-interval '2 days'),
  ($4,'Sin aprobar','{"fase":"finalizado"}',now()-interval '40 days')`,[activo,viejo,reciente,pendiente]);
 await db.query(`insert into private.combate_acciones values($1,$2,now()-interval '8 days'),($1,$3,now()-interval '1 day')`,[activo,id(6),id(7)]);
 await db.query(`insert into private.combate_acciones_descartadas values($1,$2,now()-interval '9 days'),($1,$3,now())`,[activo,id(6),id(8)]);
 const u=id(9);
 await db.query(`insert into combate_actualizaciones values($1,$2),($1,$3),($1,$4),($1,$5)`,[u,activo,viejo,reciente,borrado]);
 await db.query(`insert into resultados_encuentro values($1,false,now()-interval '35 days'),($2,true,now()-interval '35 days'),($3,false,now()-interval '3 days')`,[pendiente,viejo,reciente]);

 const r=(await db.query('select private.retencion_ejecutar() r')).rows[0].r;
 assert.equal(r.recibos_borrados,1);assert.equal(r.descartes_borrados,1);assert.equal(r.avisos_combate_borrados,2);
 assert.deepEqual(r.sin_aprobar.map(x=>x.nombre),['Sin aprobar'],'solo avisa de terminados sin aprobar con más de 30 días');
 assert.deepEqual((await db.query('select action_id from private.combate_acciones')).rows.map(x=>x.action_id),[id(7)],'conserva recibos recientes');
 assert.deepEqual((await db.query('select combate_id from combate_actualizaciones order by 1')).rows.map(x=>x.combate_id),[activo,reciente],'conserva avisos de encuentros activos y recientes');
 assert.equal((await db.query('select count(*)::int n from combates_yugen')).rows[0].n,4,'nunca borra encuentros');
 assert.equal((await db.query('select count(*)::int n from resultados_encuentro')).rows[0].n,3,'nunca borra resultados');
 await assert.rejects(db.query('select private.retencion_ejecutar(0)'),/al menos un día/);

 // Idempotente: una segunda pasada no borra nada más.
 const r2=(await db.query('select private.retencion_ejecutar() r')).rows[0].r;
 assert.equal(r2.recibos_borrados+r2.descartes_borrados+r2.avisos_combate_borrados,0);
 // Historial acotado a 52 registros.
 for(let i=0;i<60;i++)await db.query('select private.retencion_ejecutar()');
 assert.equal((await db.query('select count(*)::int n from private.retencion_registro')).rows[0].n,52);

 // Lectura del GM: exige sesión; el cliente no lee la tabla privada.
 await assert.rejects(db.query('select public.retencion_estado()'),/Solo el GM/);
 await db.query('update auth.sesion set uid=$1',[u]);
 assert.equal((await db.query('select public.retencion_estado() e')).rows[0].e.sin_aprobar.length,1);
 await db.exec('set role authenticated');
 await assert.rejects(db.query('select * from private.retencion_registro'),/permission denied/);
 await assert.rejects(db.query('select private.retencion_ejecutar()'),/permission denied/);
 console.log('SQL: retención semanal de recibos, descartes y avisos; avisa sin borrar resultados pendientes.');
}finally{await db.close();}
