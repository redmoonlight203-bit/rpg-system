import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const leer=n=>readFileSync(new URL('../supabase/migrations/'+n,import.meta.url),'utf8').replace("notify pgrst,'reload schema';",'');
const def=(id,extra={})=>JSON.stringify({id,nombre:'Fuego infernal',base:'fuego',...extra});
try{
 await db.exec(`create role anon; create role authenticated; create schema private; create schema auth;
  create function auth.uid() returns uuid language sql as $$select null::uuid$$;
  create function private.tienda_es_gm() returns boolean language sql as $$select true$$;
  create function private.avisar_actualizacion() returns trigger language plpgsql as $$begin return null; end$$;`);
 await db.exec(leer('20261125100000_grimorio_estados.sql'));
 await db.exec(leer('20261125110000_grimorio_elementos.sql'));
 await db.query('insert into public.elementos_personalizados(id,definicion,color) values($1,$2,$3)',['fuego_infernal',def('fuego_infernal'),'#ff3300']);
 for(const [id,d] of [['fuego',def('fuego')],['ninguno',def('ninguno')],['x',def('y')],['z',def('z',{base:'oscuridad'})]])
  await assert.rejects(db.query('insert into public.elementos_personalizados(id,definicion) values($1,$2)',[id,d]),id);
 const pol=(await db.query("select polname from pg_policy where polrelid='public.elementos_personalizados'::regclass order by 1")).rows.map(r=>r.polname);
 assert.deepEqual(pol,['elementos_personalizados_gm','elementos_personalizados_lectura']);
 console.log('grimorio-elementos-database: ok');
}finally{await db.close();}
