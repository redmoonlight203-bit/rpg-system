import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
// Migración de invocaciones: config de invocación del jugador y turnos que dirige (invocación o control mental).
const sql=n=>readFileSync(new URL('../supabase/migrations/'+n,import.meta.url),'utf8');
const id='00000000-0000-0000-0000-0000000000c1',u='00000000-0000-0000-0000-0000000000a1';
try{
 await db.exec(`create role anon;create role authenticated;create schema yugen_interno;
 create table public.forja_maestra(id uuid primary key,configuracion_invocacion jsonb);
 create table public.inventario_jugador(id uuid primary key,personaje_id bigint,forja_id uuid,configuracion jsonb);
 create table public.combates_yugen(id uuid primary key,version int default 1,datos jsonb,updated_at timestamptz);
 create function yugen_interno.contexto_jugador(uuid,uuid,text) returns jsonb language sql as $$select jsonb_build_object('actor',jsonb_build_object('vida',10,'bando','jugador'))$$;
 -- Versiones mínimas con el mismo texto que producción alrededor de las marcas.
 create function yugen_interno.preparar_jugador(p_personaje bigint) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $f$
 declare i public.inventario_jugador%rowtype;pieza jsonb;r jsonb:='[]';begin
  for i in select * from public.inventario_jugador where personaje_id=p_personaje order by id loop
   pieza:=jsonb_build_object('requisitos_uso',coalesce(i.configuracion->'requisitos_uso','{}'),'forja_id',i.forja_id,'id',i.id);
   r:=r||jsonb_build_array(pieza);
  end loop;return r;end;$f$;
 create function public.naturalezas_combate_snapshot(p_personaje bigint) returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $f$
 declare f public.forja_maestra%rowtype;pieza jsonb;begin
  select * into f from public.forja_maestra order by id limit 1;
  pieza:=jsonb_build_object('nombre',f.nombre,'stats','{}'::jsonb,'efectos','[]'::jsonb);return pieza;end;$f$;
 alter table public.forja_maestra add column nombre text;`);
 await db.exec(sql('20261125130000_legendarias_jugador.sql'));
 await db.exec(sql('20261125150000_invocaciones_combate.sql'));
 // Repetible: una segunda pasada no duplica nada ni falla.
 await db.exec(sql('20261125150000_invocaciones_combate.sql'));
 const cfg={modo:'existente',claseMaxima:'C',duracionTurnos:3,maxHabilidades:1};
 await db.query("insert into public.forja_maestra values('00000000-0000-0000-0000-00000000000f',$1,'Sol')",[cfg]);
 await db.query("insert into public.inventario_jugador values('00000000-0000-0000-0000-000000000001',1,'00000000-0000-0000-0000-00000000000f',$1)",[{configuracion_invocacion:{...cfg,duracionTurnos:9}}]);
 await db.query("insert into public.inventario_jugador values('00000000-0000-0000-0000-000000000002',1,'00000000-0000-0000-0000-00000000000f','{}')");
 const piezas=(await db.query('select yugen_interno.preparar_jugador(1) r')).rows[0].r;
 assert.equal(piezas[0].configuracion_invocacion.duracionTurnos,9,'la instantánea manda');
 assert.equal(piezas[1].configuracion_invocacion.duracionTurnos,3,'pieza antigua: se toma de la creación');
 assert.equal((await db.query('select public.naturalezas_combate_snapshot(1) r')).rows[0].r.configuracion_invocacion.modo,'existente');
 // Turnos que dirige el jugador.
 const datos=(actual,extra={})=>({fase:'en_curso',actual,ronda:2,miembros:[{id:'a',vida:5},{id:'inv',vida:3,invocacion:{invocador:'a'}},{id:'ajena',vida:3,invocacion:{invocador:'z'}},{id:'dominado',vida:3,estados:[{fuente:'a',nombre:'Dominio'}]}],...extra});
 const intentar=async(antes,despues=antes)=>{
  await db.query('delete from public.combates_yugen');
  await db.query('insert into public.combates_yugen(id,version,datos) values($1,1,$2)',[id,antes]);
  try{await db.query('select yugen_interno.confirmar_jugador($1,$2,$3,1,$4)',[u,id,'a',despues]);return true;}catch(e){assert.match(e.message,/durante su turno/);return false;}
 };
 assert.equal(await intentar(datos('inv')),true,'turno de su invocación');
 assert.equal(await intentar(datos('dominado')),true,'turno de quien controla');
 assert.equal(await intentar(datos('ajena')),false,'invocación de otro');
 assert.equal(await intentar(datos('a')),true,'su propio turno');
 assert.equal((await db.query("select has_function_privilege('authenticated','yugen_interno.dirige_turno(text,jsonb)','EXECUTE') x")).rows[0].x,false);
 console.log('PostgreSQL: invocaciones en combate correctas.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
