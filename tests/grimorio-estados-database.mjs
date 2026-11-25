import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const sql=readFileSync(new URL('../supabase/migrations/20261125100000_grimorio_estados.sql',import.meta.url),'utf8');
const def=(id,extra={})=>JSON.stringify({id,nombre:'Sopor',categoria:'fisico',duracion:{tipo:'turnos',turnos:2},efectos:[],...extra});
try{
 await db.exec(`create role anon; create role authenticated; create schema private; create schema auth;
  create function auth.uid() returns uuid language sql as $$select null::uuid$$;
  create function private.tienda_es_gm() returns boolean language sql as $$select true$$;
  create function private.avisar_actualizacion() returns trigger language plpgsql as $$begin return null; end$$;`);
 await db.exec(sql.replace("notify pgrst,'reload schema';",''));
 await db.query('insert into public.estados_personalizados(id,definicion,color) values($1,$2,$3)',['sopor',def('sopor'),'#aabbcc']);
 await assert.rejects(db.query('insert into public.estados_personalizados(id,definicion) values($1,$2)',['veneno',def('veneno')]),'no puede pisar el catálogo base');
 await assert.rejects(db.query('insert into public.estados_personalizados(id,definicion) values($1,$2)',['otro',def('distinto')]),'el id de la definición debe coincidir');
 await assert.rejects(db.query('insert into public.estados_personalizados(id,definicion) values($1,$2)',['malo',def('malo',{categoria:'cosmico'})]));
 await assert.rejects(db.query('insert into public.estados_personalizados(id,definicion,color) values($1,$2,$3)',['col',def('col'),'rojo']));
 const antes=(await db.query("select updated_at from public.estados_personalizados where id='sopor'")).rows[0].updated_at;
 await db.query("update public.estados_personalizados set color='#000000' where id='sopor'");
 assert.ok((await db.query("select updated_at from public.estados_personalizados where id='sopor'")).rows[0].updated_at>=antes);
 const pol=(await db.query("select polname from pg_policy where polrelid='public.estados_personalizados'::regclass order by 1")).rows.map(r=>r.polname);
 assert.deepEqual(pol,['estados_personalizados_gm','estados_personalizados_lectura']);
 console.log('grimorio-estados-database: ok');
}finally{await db.close();}
