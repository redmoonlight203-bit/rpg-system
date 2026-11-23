import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
const gm='00000000-0000-0000-0000-000000000001',user='00000000-0000-0000-0000-000000000002';
const migracion=f=>readFileSync(new URL('../supabase/migrations/'+f,import.meta.url),'utf8');
const funcion=(f,nombre)=>{const s=migracion(f),i=s.indexOf('CREATE OR REPLACE FUNCTION '+nombre);return s.slice(i,s.indexOf('$function$',s.indexOf('$function$',i)+10)+10)+';';};
const como=async(id,rol=true)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);if(rol)await db.exec('set role authenticated');};
const sabe=async(pj)=>(await db.query('select nombre,motivo_entrega from inventario_jugador where personaje_id=$1 order by nombre',[pj])).rows;
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table perfiles(id uuid primary key,rol text);
 create function private.tienda_es_gm() returns boolean language sql stable as $$select exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI')$$;
 create function private.avisar_actualizacion() returns trigger language plpgsql as $$begin return null;end$$;
 create table categorias_forja(id serial primary key,parent_id int,clave text,nombre text);
 create table personajes(id bigserial primary key,user_id uuid,nombre text,raza text,nivel int default 1,atributos jsonb default '{}',estado_vida text default 'vivo',estado_aprobacion text default 'aprobado');
 create table forja_maestra(id uuid primary key default gen_random_uuid(),nombre text,tipo text,tipo_creacion text,estado text default 'aprobado',requisitos_uso jsonb default '{}',descripcion text default '',imagen_url text default '',clase text,stats jsonb default '{}',configuracion_dados jsonb default '[]',reglas jsonb default '[]',reglas_pasivas jsonb default '[]');
 create table inventario_jugador(id uuid primary key default gen_random_uuid(),user_id uuid,personaje_id bigint,forja_id uuid,nombre text,tipo text,descripcion text,imagen_url text,clase text,stats jsonb,ligado_al_alma boolean,es_activo boolean,slot_tipo text,motivo_entrega text,configuracion jsonb);
 grant usage on schema public,private,auth to authenticated;grant select on personajes,perfiles to authenticated;grant select,insert,update,delete on forja_maestra,inventario_jugador to authenticated;`);
 await db.exec(funcion('20261109004623_tecnicas_espaciales.sql','public.forja_validar_requisitos'));
 await db.exec(`create function public.forja_linaje_claves(p_raza text) returns text[] language sql stable as $$
  with recursive camino as (select c.id,c.parent_id,c.clave,c.nombre,array[c.id] as vistos from public.categorias_forja c where c.clave=p_raza or lower(c.nombre)=lower(p_raza)
  union all select c.id,c.parent_id,c.clave,c.nombre,x.vistos||c.id from camino x join public.categorias_forja c on c.id=x.parent_id where not c.id=any(x.vistos))
  select coalesce(array_agg(distinct v),'{}') from camino cross join lateral unnest(array[clave,nombre]) v$$;
 create function public.forja_cumple_requisitos(r jsonb,raza text,stats jsonb) returns boolean language plpgsql stable as $$
 declare p record;v text;claves text[];cumple boolean:=false;s jsonb:=coalesce(stats,'{}'::jsonb);
 begin if r is null then return true;end if;perform public.forja_validar_requisitos(r);
  if r ? 'nivel_minimo' and coalesce((s->>'nivel')::integer,1)<(r->>'nivel_minimo')::integer then return false;end if;
  if jsonb_array_length(coalesce(r->'razas','[]'::jsonb))>0 then claves:=array_append(public.forja_linaje_claves(raza),raza);
   for v in select jsonb_array_elements_text(r->'razas') loop if exists(select 1 from unnest(claves) k where lower(trim(k))=lower(trim(v))) then cumple:=true;end if;end loop;
   if not cumple then return false;end if;end if;
  for p in select * from jsonb_each_text(coalesce(r->'minimos','{}'::jsonb)) loop if coalesce((s->>p.key)::numeric,0)<p.value::numeric then return false;end if;end loop;
  return true;end $$;`);
 await db.exec(migracion('20261122100000_herencia_linajes_clanes.sql'));
 await db.query("insert into perfiles values($1,'KUROI'),($2,'REENCARNADO')",[gm,user]);
 await db.exec("insert into categorias_forja(id,parent_id,clave,nombre) values(1,null,'razas','Razas'),(2,1,'humanos','Humanos'),(3,2,'clan_kairo','Clan Kairo'),(4,1,'elfos','Elfos')");
 await db.query("insert into personajes(id,user_id,nombre,raza,nivel) values(1,$1,'Rin','clan_kairo',3),(2,$1,'Sol','humanos',3),(3,$1,'Lys','elfos',3)",[user]);
 // Linaje: el ojo del clan Kairo llega solo a quien pertenece a esa subraza.
 await db.exec("insert into forja_maestra(nombre,tipo,tipo_creacion,requisitos_uso) values('Ojo de Kairo','habilidades','habilidad','{\"razas\":[\"clan_kairo\"],\"herencia\":true}')");
 assert.deepEqual((await sabe(1)).map(x=>x.nombre),['Ojo de Kairo']);assert.equal((await sabe(2)).length,0);
 assert.equal((await sabe(1))[0].motivo_entrega,'Herencia del linaje');
 // Clan multirracial: el GM crea el clan y añade miembros de cualquier raza.
 await como(gm);
 const clan=(await db.query("insert into clanes(nombre) values('Vigilantes del Alba') returning id")).rows[0].id;
 await db.query("insert into forja_maestra(nombre,tipo,tipo_creacion,requisitos_uso) values('Ojo del Alba','habilidades','habilidad',$1)",[{clanes:[clan],herencia:true}]);
 await db.query('insert into clan_miembros(clan_id,personaje_id) values($1,2),($1,3)',[clan]);
 await como(gm,false);
 assert.deepEqual((await sabe(2)).map(x=>x.nombre),['Ojo del Alba']);assert.deepEqual((await sabe(3)).map(x=>x.nombre),['Ojo del Alba']);
 assert.equal((await sabe(3))[0].motivo_entrega,'Herencia del clan Vigilantes del Alba');
 // Salir del clan retira lo heredado; lo entregado a mano no se toca.
 await db.query("insert into inventario_jugador(user_id,personaje_id,nombre,motivo_entrega,configuracion) values($1,3,'Regalo del GM','Entrega manual','{}')",[user]);
 await db.query('delete from clan_miembros where personaje_id=3');
 assert.deepEqual((await sabe(3)).map(x=>x.nombre),['Regalo del GM']);
 // Requisito de nivel: se hereda al alcanzarlo.
 await db.query("update forja_maestra set requisitos_uso='{\"clanes\":[\"$c\"],\"herencia\":true,\"nivel_minimo\":5}'::jsonb where nombre='Ojo del Alba'".replace('$c',clan));
 assert.equal((await sabe(2)).length,0,'sin nivel se retira');
 await db.query('update personajes set nivel=5 where id=2');assert.deepEqual((await sabe(2)).map(x=>x.nombre),['Ojo del Alba']);
 // Cambiar de linaje, quitar la herencia o borrar el clan también retira.
 await db.query("update personajes set raza='humanos' where id=1");assert.equal((await sabe(1)).length,0);
 await db.query("update personajes set raza='clan_kairo' where id=1");assert.equal((await sabe(1)).length,1);
 await db.query("update forja_maestra set requisitos_uso='{\"razas\":[\"clan_kairo\"]}' where nombre='Ojo de Kairo'");assert.equal((await sabe(1)).length,0);
 await db.query('delete from clanes where id=$1',[clan]);assert.equal((await sabe(2)).length,0);
 // Validación y permisos.
 await assert.rejects(db.query("select public.forja_validar_requisitos('{\"herencia\":true}')"),/linaje.*clan/);
 await assert.rejects(db.query("select public.forja_validar_requisitos('{\"clanes\":[\"x\"]}')"),/Clan inválido/);
 await como(user);await assert.rejects(db.query("insert into clanes(nombre) values('Mío')"),/row-level security|permission/);
 await assert.rejects(db.query('select herencia_recalcular()'),/Solo el GM/);
 await como(gm);assert.equal((await db.query('select herencia_recalcular() n')).rows[0].n,3);
 console.log('Herencia: linaje, clan multirracial, nivel, salida, cambios del GM, validación y permisos correctos.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
