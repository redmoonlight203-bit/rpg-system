import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
// Pactos y deudas: el flujo de siempre (promesa → Kuroi aprueba o rechaza → Kuroi cobra → el jugador
// confirma o impugna, con autoaprobación a 5 días y autoconfirmación a 2) con permisos en el servidor.
const db=new PGlite();
const migracion=readFileSync(new URL('../supabase/migrations/20261116150000_deudas_permisos.sql',import.meta.url),'utf8');
const gm='00000000-0000-0000-0000-00000000000a',ana='00000000-0000-0000-0000-00000000000b',beto='00000000-0000-0000-0000-00000000000c';
const como=async(u)=>{await db.exec('reset role');await db.exec(`set request.jwt.claim.sub='${u||''}'`);await db.exec(u?'set role authenticated':'set role anon');};
const q=async(sql,p)=>(await db.query(sql,p)).rows;
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema private;
 create table auth.users(id uuid primary key);insert into auth.users values('${gm}'),('${ana}'),('${beto}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,private to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table public.perfiles(id uuid primary key,rol text);insert into perfiles values('${gm}','KUROI'),('${ana}','REENCARNADO'),('${beto}','REENCARNADO');
 create function private.tienda_es_gm() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI')$$;
 grant execute on function private.tienda_es_gm() to authenticated;
 -- Estado observado en producción el 16-11: política abierta y todos los permisos para anon.
 create table public.deudas_kuroi(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,mensaje text not null,estado text default 'pendiente_aprobacion',fecha_pago_solicitado timestamptz,
  created_at timestamptz not null default timezone('utc'::text,now()));
 alter table deudas_kuroi enable row level security;
 create policy "Permitir todo deudas_kuroi" on deudas_kuroi for all to public using(true) with check(true);
 grant all on deudas_kuroi to anon,authenticated;
 insert into deudas_kuroi(user_id,titulo,mensaje,estado) values('${ana}','Antigua','Ya saldada','completada');`);
 // Antes: sin sesión se leía y borraba todo.
 await como(null);assert.equal((await q('select count(*)::int n from deudas_kuroi'))[0].n,1,'el estado inicial reproduce el agujero');
 await db.exec('reset role');
 await db.exec(migracion);

 // Sin sesión: nada.
 await como(null);
 await assert.rejects(db.query('select * from deudas_kuroi'),/permission denied/);
 await assert.rejects(db.query(`insert into deudas_kuroi(user_id,titulo,mensaje) values('${ana}','x','y')`),/permission denied/);

 // Ana registra una promesa: siempre nace pendiente aunque intente otra cosa.
 await como(ana);
 const [p]=await q(`insert into deudas_kuroi(user_id,titulo,mensaje,estado,fecha_pago_solicitado) values($1,' Espada ','Me prometiste una espada','completada',now()) returning *`,[ana]);
 assert.equal(p.estado,'pendiente_aprobacion');assert.equal(p.fecha_pago_solicitado,null);assert.equal(p.titulo,'Espada');
 await assert.rejects(db.query(`insert into deudas_kuroi(user_id,titulo,mensaje) values($1,'x','y')`,[beto]),/row-level security/,'no puede crear a nombre de otro');
 await assert.rejects(db.query(`insert into deudas_kuroi(user_id,titulo,mensaje) values($1,'  ','y')`,[ana]),/título/);
 assert.equal((await q('select count(*)::int n from deudas_kuroi'))[0].n,2,'ve las suyas (antigua y nueva)');
 // No puede aprobarla antes de 5 días, ni saldarla, ni reescribirla, ni borrarla.
 await assert.rejects(db.query(`update deudas_kuroi set estado='aprobada' where id=$1`,[p.id]),/Solo Kuroi/);
 await assert.rejects(db.query(`update deudas_kuroi set estado='completada' where id=$1`,[p.id]),/Solo Kuroi/);
 await assert.rejects(db.query(`update deudas_kuroi set titulo='Dos espadas' where id=$1`,[p.id]),/no se puede modificar/);
 await assert.rejects(db.query(`delete from deudas_kuroi where id=$1`,[p.id]),/permission denied/);

 // Beto no ve ni toca lo de Ana.
 await como(beto);
 assert.equal((await q('select count(*)::int n from deudas_kuroi'))[0].n,0);
 assert.equal((await db.query(`update deudas_kuroi set estado='completada' where id=$1`,[p.id])).affectedRows,0);

 // Autoaprobación: pasados 5 días, la pantalla del jugador la aprueba.
 await db.exec('reset role');await db.exec('alter table deudas_kuroi disable trigger deudas_validar');await db.query(`update deudas_kuroi set created_at=now()-interval '6 days' where id=$1`,[p.id]);await db.exec('alter table deudas_kuroi enable trigger deudas_validar');
 await como(ana);
 assert.equal((await q(`update deudas_kuroi set estado='aprobada' where id=$1 returning estado`,[p.id]))[0].estado,'aprobada');
 await assert.rejects(db.query(`update deudas_kuroi set estado='pendiente_pago_confirmacion' where id=$1`,[p.id]),/Solo Kuroi/,'cobrar es de Kuroi');

 // Kuroi ve todas y cobra: la fecha la pone el servidor.
 await como(gm);
 assert.equal((await q('select count(*)::int n from deudas_kuroi'))[0].n,2);
 const [c]=await q(`update deudas_kuroi set estado='pendiente_pago_confirmacion',fecha_pago_solicitado=null where id=$1 returning *`,[p.id]);
 assert.ok(c.fecha_pago_solicitado,'el cobro siempre registra fecha');
 // Ana impugna: vuelve a activa y se borra la fecha.
 await como(ana);
 const [i]=await q(`update deudas_kuroi set estado='aprobada',fecha_pago_solicitado=null where id=$1 returning *`,[p.id]);
 assert.equal(i.estado,'aprobada');assert.equal(i.fecha_pago_solicitado,null);
 await assert.rejects(db.query(`update deudas_kuroi set estado='aprobada',fecha_pago_solicitado=now() where id=$1`,[p.id]),/Solo Kuroi/);
 // Kuroi cobra otra vez y Ana confirma.
 await como(gm);await db.query(`update deudas_kuroi set estado='pendiente_pago_confirmacion' where id=$1`,[p.id]);
 await como(ana);
 assert.equal((await q(`update deudas_kuroi set estado='completada' where id=$1 returning estado`,[p.id]))[0].estado,'completada');
 await assert.rejects(db.query(`update deudas_kuroi set estado='aprobada' where id=$1`,[p.id]),/Solo Kuroi/,'una saldada no se reabre');

 // Kuroi rechaza una promesa nueva; estados inventados se rechazan.
 const [r]=await q(`insert into deudas_kuroi(user_id,titulo,mensaje) values($1,'Capa','Una capa') returning id`,[ana]);
 await como(gm);
 assert.equal((await q(`update deudas_kuroi set estado='rechazada' where id=$1 returning estado`,[r.id]))[0].estado,'rechazada');
 await assert.rejects(db.query(`update deudas_kuroi set estado='perdonada' where id=$1`,[r.id]),/check constraint|Estado/);
 await assert.rejects(db.query(`update deudas_kuroi set mensaje='otra cosa' where id=$1`,[r.id]),/no se puede modificar/);

 // El registro antiguo sigue intacto.
 await db.exec('reset role');
 assert.equal((await q(`select estado from deudas_kuroi where titulo='Antigua'`))[0].estado,'completada');
 console.log('SQL: pactos y deudas sin acceso anónimo; jugador limitado a sus promesas y a las transiciones de siempre; Kuroi aprueba, rechaza y cobra.');
}finally{await db.close();}
