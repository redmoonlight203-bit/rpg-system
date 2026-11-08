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

 await db.exec(readFileSync(new URL('../supabase/migrations/20261107205854_alcances_ataques_anteriores_armas_basicas.sql',import.meta.url),'utf8'));
 const {conAlcance}=await import('../supabase/functions/equipo-combate/motor.js');
 const base={id:'e',nombre:'Ataque',efecto:'dano',cantidad:1,caras:6,modificador:0,coste_ph:0,duracion:0,tipo_dano:'físico',estado:''};
 for(const [nombre,e] of [['Espada',base],['Lanza',base],['Arco',base],['Bola de fuego',{...base,nombre:'Bola de fuego',coste_ph:1}],['Rayo',{...base,tipo_dano:'Eléctrico'}],['Especial',{...base,tablero:{alcance:4,forma:'individual',tamano:0,afecta:'enemigos'}}]]){
  const r=(await db.query('select private.completar_alcances($1,$2) as e',[e,nombre])).rows[0].e;
  assert.deepEqual(r,conAlcance(e,nombre));
 }
 for(const [nombre,alcances] of [['Lanza normal',[2]],['Arco normal',[8]],['Bastón normal',[6,1]]]){
  const f=(await db.query('select * from forja_maestra where nombre=$1',[nombre])).rows[0];assert.ok(f);
  assert.deepEqual(f.configuracion_dados.map(e=>e.tablero.alcance),alcances);assert.equal(f.slot_tipo,'dos_manos');assert.equal(f.estado,'aprobado');
 }
 const baston=(await db.query("select configuracion_dados from forja_maestra where nombre='Bastón normal'")).rows[0].configuracion_dados;assert.equal(baston[0].coste_ph,1);assert.equal(baston[1].coste_ph,0);
 console.log('Alcances SQL y motor coinciden; catálogo de lanza, arco y bastón correcto.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
