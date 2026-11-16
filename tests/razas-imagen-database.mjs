import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
// Cada raza nueva necesita imagen (o heredarla); las existentes sin imagen siguen editables.
const db=new PGlite();
const migracion=readFileSync(new URL('../supabase/migrations/20261116170000_razas_imagen.sql',import.meta.url),'utf8');
const q=async(s,p)=>(await db.query(s,p)).rows;
try{
 await db.exec(`create role anon;create role authenticated;create schema private;
 create table public.categorias_forja(id uuid primary key default gen_random_uuid(),clave text unique,nombre text,parent_id uuid references public.categorias_forja(id));
 insert into categorias_forja(clave,nombre) values('razas','Razas'),('armas','Armas');
 insert into categorias_forja(clave,nombre,parent_id) select x.c,x.n,(select id from categorias_forja where clave='razas') from (values('personajes','Humanos'),('elfos','Elfos'),('enanos','Enanos'),('gigantes','Gigantes'),('hombres_bestia','Hombres Bestia'),('dragones','Dragones'),('hadas','Hadas')) x(c,n);
 insert into categorias_forja(clave,nombre,parent_id) values('kuro','Kuro',(select id from categorias_forja where clave='personajes'));
 insert into categorias_forja(clave,nombre,parent_id) values('espadas','Espadas',(select id from categorias_forja where clave='armas'));`);
 await db.exec(migracion);
 const img=async c=>(await q('select imagen_url from categorias_forja where clave=$1',[c]))[0].imagen_url;
 assert.equal(await img('personajes'),'/arte/razas/humanos.webp');
 assert.equal(await img('hombres_bestia'),'/arte/razas/hombres-bestia.webp');
 assert.equal(await img('dragones'),null,'las razas sin imagen entregada quedan pendientes');
 const raza=(await q("select id from categorias_forja where clave='razas'"))[0].id;
 const humanos=(await q("select id from categorias_forja where clave='personajes'"))[0].id;
 const armas=(await q("select id from categorias_forja where clave='armas'"))[0].id;

 await assert.rejects(db.query("insert into categorias_forja(clave,nombre,parent_id) values('orcos','Orcos',$1)",[raza]),/necesita su imagen/,'raza nueva sin imagen');
 await db.query("insert into categorias_forja(clave,nombre,parent_id,imagen_url) values('orcos','Orcos',$1,'/arte/razas/orcos.webp')",[raza]);
 const url='https://yzvpahcjbuotnqjmbkeu.supabase.co/storage/v1/object/public/imagenes/00000000-0000-4000-8000-0000000000aa/retratos/abc123.webp';
 await db.query("insert into categorias_forja(clave,nombre,parent_id,imagen_url) values('trasgos','Trasgos',$1,$2)",[raza,url]);
 await db.query("insert into categorias_forja(clave,nombre,parent_id) values('nobles','Nobles',$1)",[humanos]);
 assert.equal(await img('nobles'),null,'una subraza hereda la imagen de su raza');
 await db.query("insert into categorias_forja(clave,nombre,parent_id) values('dagas','Dagas',$1)",[armas]);

 // Razas existentes sin imagen: se pueden editar sin bloquear al GM.
 await db.query("update categorias_forja set nombre='Dragones antiguos' where clave='dragones'");
 await db.query("update categorias_forja set imagen_url=imagen_url where clave='hadas'");
 // Quitar la imagen a una raza que la tenía no se permite.
 await assert.rejects(db.query("update categorias_forja set imagen_url=null where clave='elfos'"),/necesita su imagen/);
 // Mover una categoría sin imagen dentro de Razas tampoco.
 await assert.rejects(db.query("update categorias_forja set parent_id=$1 where clave='dagas'",[raza]),/necesita su imagen/);

 for(const malo of ['data:image/webp;base64,AAAA','https://evil.example.com/x.webp','/arte/razas/../../x.webp','javascript:alert(1)','https://x.supabase.co/storage/v1/object/public/otro/x.webp'])
  await assert.rejects(db.query("update categorias_forja set imagen_url=$1 where clave='gigantes'",[malo]),/categorias_imagen_valida/,malo);
 await db.exec(migracion);
 assert.equal(await img('elfos'),'/arte/razas/elfos.webp','repetible sin pisar imágenes');
 console.log('SQL: imagen de raza obligatoria al crear (o heredada), existentes editables, enlaces seguros.');
}finally{await db.close();}
