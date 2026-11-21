import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
const gm='00000000-0000-0000-0000-000000000001',user='00000000-0000-0000-0000-000000000002',otro='00000000-0000-0000-0000-000000000003';
const guardian='00000000-0000-0000-0000-000000000010',negociador='00000000-0000-0000-0000-000000000011',heroe='00000000-0000-0000-0000-000000000012',tienda='00000000-0000-0000-0000-000000000013';
const migracion=f=>readFileSync(new URL('../supabase/migrations/'+f,import.meta.url),'utf8');
const funcion=(f,nombre)=>{const s=migracion(f),i=s.indexOf('CREATE OR REPLACE FUNCTION '+nombre);return s.slice(i,s.indexOf('$function$',s.indexOf('$function$',i)+10)+10)+';';};
const como=async(id,rol=true)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);if(rol)await db.exec('set role authenticated');};
try{
 const ciclo=readFileSync(new URL('./ciclo-encuentros-database.mjs',import.meta.url),'utf8');
 await db.exec(ciclo.match(/await db.exec\(`([\s\S]*?)`\);/)[1]);
 for(const f of ['20261108144114_ciclo_encuentros_recompensas.sql','20261108144126_logros_titulos_eventos.sql','20261108144129_arena_entrenamiento_aislada.sql','20261108145840_forja_permisos_recompensas.sql'])await db.exec(migracion(f));
 await db.exec(`alter table forja_maestra add column reglas jsonb default '[]',add column reglas_pasivas jsonb default '[]',add column configuracion_dados jsonb default '[]',add column requisitos_uso jsonb default '{}';
 alter table inventario_jugador add column configuracion jsonb,add column slot_equipado text,add column created_at timestamptz default now();alter table personajes add column raza text;
 create or replace function public.forja_snapshot_config(p uuid) returns jsonb language sql as $$select jsonb_build_object('tipo_creacion',tipo_creacion,'reglas',reglas,'reglas_pasivas',reglas_pasivas) from public.forja_maestra where id=p$$;
 create function public.forja_tipo_inferido(text) returns text language sql as $$select 'objeto'$$;
 create function public.forja_cumple_requisitos(jsonb,text,jsonb) returns boolean language sql as $$select true$$;
 create function public.pasivas_raciales_snapshot(text) returns jsonb language sql as $$select '[]'::jsonb$$;
 create function public.naturalezas_combate_snapshot(bigint) returns jsonb language sql as $$select '{"pasivas":[],"habilidades":[],"naturalezas":[]}'::jsonb$$;
 create function public.forja_linaje_claves(text) returns jsonb language sql as $$select '[]'::jsonb$$;
 create function yugen_interno.proteger_equipo_activo() returns trigger language plpgsql as $$begin if tg_op='DELETE' then return old;end if;return new;end$$;
 create trigger inventario_proteger_equipo before insert or update of slot_equipado,personaje_id or delete on public.inventario_jugador for each row execute function yugen_interno.proteger_equipo_activo();`);
 await db.exec(migracion('20261108153925_logros_titulos_forja_manuales.sql'));
 await db.exec('drop function yugen_interno.preparar_jugador(bigint)');await db.exec(funcion('20261109004623_tecnicas_espaciales.sql','yugen_interno.preparar_jugador'));
 await db.exec(funcion('20261104134600_yunque_requisitos_y_clases.sql','yugen_interno.aplicar_equipo'));
 await db.query("insert into perfiles(id,rol) values($1,'KUROI'),($2,'REENCARNADO'),($3,'REENCARNADO')",[gm,user,otro]);
 await como(gm,false);
 await db.query("insert into personajes(id,user_id,nombre,nivel,atributos) values(1,$1,'Axel',10,'{\"vida\":20,\"armadura\":1}'),(2,$1,'Compañera',10,'{\"vida\":15}'),(3,$2,'Ajeno',1,'{\"vida\":10}')",[user,otro]);
 const regla={id:'r',nombre:'Protección',evento:'permanente',condicion:'siempre',bonos:{armadura:3}};
 await db.query(`insert into forja_maestra(id,nombre,tipo,tipo_creacion,slot_tipo,stats,reglas_pasivas,descripcion) values
  ($1,'Guardián del barrio','titulos','titulo','titulo','{"armadura":2}',$5,'Los vecinos te protegen.'),
  ($2,'Lengua de plata','titulos','titulo','titulo','{}','[]','Habla con soltura.'),
  ($3,'Héroe de Ambrosía','titulos','titulo','titulo','{"vida":5}','[]','Leyenda viva.'),
  ($4,'Corona de mercader','titulos','titulo','titulo','{}','[]','Comprada en la tienda.')`,[guardian,negociador,heroe,tienda,JSON.stringify([regla])]);
 // Estado heredado: una copia del título en el inventario, equipada en Axel.
 await db.query("insert into inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,slot_tipo,slot_equipado,ligado_al_alma,es_activo,motivo_entrega,stats) values($1,1,$2,'Guardián del barrio','titulos','titulo','titulo',true,false,'Título obtenido por logro','{\"armadura\":2}')",[user,guardian]);
 await db.exec(migracion('20261121140000_titulos_cuenta.sql'));
 await db.exec('alter table personajes add column party_activo boolean not null default false');
 await db.exec(migracion('20261121150000_titulos_party.sql'));
 assert.equal((await db.query('select * from inventario_jugador')).rows.length,0,'las copias antiguas desaparecen del inventario');
 assert.equal((await db.query('select count(*)::int n from titulos_obtenidos where user_id=$1 and titulo_forja_id=$2',[user,guardian])).rows[0].n,1);
 assert.equal((await db.query('select titulo_activo from personajes where id=1')).rows[0].titulo_activo,guardian,'el título equipado sigue activo');

 // Un logro concede el título a la cuenta, sin copias en el inventario.
 const logro=(await db.query("insert into logros_yugen(nombre,evento,meta,titulo,titulo_forja_id) values('Diplomático','manual',1,'x',$1) returning id",[negociador])).rows[0].id;
 const p=(await db.query("select logro_conceder($1,$2,null,1,true,'Cerró el tratado',$3) r",[logro,user,crypto.randomUUID()])).rows[0].r;
 assert.equal(p.desbloqueado,true);assert.equal(p.titulo_inventario_id,null);
 assert.equal((await db.query('select count(*)::int n from titulos_obtenidos where user_id=$1',[user])).rows[0].n,2);
 assert.equal((await db.query("select count(*)::int n from eventos_dominio where tipo='titulo_obtenido' and user_id=$1",[user])).rows[0].n,1);
 await db.query("select logro_conceder($1,$2,null,1,true,'Otra vez',$3)",[logro,user,crypto.randomUUID()]);
 assert.equal((await db.query("select count(*)::int n from eventos_dominio where tipo='titulo_obtenido'")).rows[0].n,1,'volver a conceder no duplica el aviso');

 // Cualquier otra entrega (tienda, GM) también va a la cuenta.
 await db.query("insert into inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,slot_tipo,motivo_entrega) values($1,2,$2,'Corona','titulos','titulo','Compra en la tienda')",[user,tienda]);
 assert.equal((await db.query('select count(*)::int n from inventario_jugador')).rows[0].n,0);
 assert.equal((await db.query('select origen from titulos_obtenidos where titulo_forja_id=$1',[tienda])).rows[0].origen,'Compra en la tienda');

 // El jugador puede llevar el mismo título en varios personajes, uno activo por personaje.
 await como(user);
 assert.equal((await db.query('select logro_reclamar_titulo($1) id',[p.id])).rows[0].id,negociador);
 await db.query('select titulo_activar(2,$1)',[guardian]);
 await db.query('select titulo_activar(1,$1)',[negociador]);
 let filas=(await db.query('select id,titulo_activo from personajes where user_id=$1 order by id',[user])).rows;
 assert.deepEqual(filas.map(f=>f.titulo_activo),[negociador,guardian]);
 await assert.rejects(db.query('select titulo_activar(3,$1)',[guardian]),/no te pertenece/);
 await como(otro);await assert.rejects(db.query('select titulo_activar(3,$1)',[guardian]),/no pertenece a la cuenta/);
 await como(gm,false);

 // El combate recibe el título activo como equipo y el resto en la reserva.
 let prep=(await db.query('select yugen_interno.preparar_jugador(2) r')).rows[0].r;
 assert.equal(prep.configuracion.equipamiento.titulo.id,guardian);assert.equal(prep.stats.armadura,2);
 assert.deepEqual(prep.configuracion.equipamiento.titulo.reglas_pasivas,[regla]);
 assert.equal(prep.configuracion.reserva.filter(x=>x.tipo_creacion==='titulo').length,3);

 // Cambiar el título desde el editor de equipo usa el mismo espacio.
 await db.query('select yugen_interno.aplicar_equipo(1,$1)',[{titulo:guardian}]);
 assert.equal((await db.query('select titulo_activo from personajes where id=1')).rows[0].titulo_activo,guardian);
 await db.query("select yugen_interno.aplicar_equipo(1,'{}')");
 assert.equal((await db.query('select titulo_activo from personajes where id=1')).rows[0].titulo_activo,null);

 // Un título especial se aplica a todos los personajes sin equiparse.
 await como(user);await assert.rejects(db.query("select titulo_ajustar($1,true,'')",[heroe]),/Solo el GM/);
 await como(gm);
 await db.query("insert into logros_yugen(nombre,evento,meta,titulo,titulo_forja_id) values('Leyenda','manual',1,'x',$1)",[heroe]);
 await db.query("select logro_conceder((select id from logros_yugen where titulo_forja_id=$1),$2,null,1,true,'Salvó la ciudad',$3)",[heroe,user,crypto.randomUUID()]);
 await db.query("select titulo_ajustar($1,true,'Los guardias le abren las puertas.')",[heroe]);
 await db.query("select titulo_ajustar($1,false,'Ventaja en negociaciones con comerciantes.')",[negociador]);
 await como(gm,false);
 for(const id of [1,2]){
  prep=(await db.query('select yugen_interno.preparar_jugador($1) r',[id])).rows[0].r;
  assert.ok(prep.configuracion.pasivas.some(x=>x.nombre==='Título especial: Héroe de Ambrosía'),'pasiva especial en '+id);
  assert.equal(prep.stats.vida,(id===1?20:15)+5);
  assert.ok(!prep.configuracion.reserva.some(x=>x.id===heroe),'el especial no ocupa la reserva');
 }
 await como(user);await assert.rejects(db.query('select titulo_activar(1,$1)',[heroe]),/especial/);

 // En combate el título solo cambia desde el equipo (gastando acción).
 await como(gm,false);
 await db.query("insert into combates_yugen(id,creador_id,nombre,datos) values($1,$2,'Duelo',$3)",[crypto.randomUUID(),gm,{fase:'en_curso',miembros:[{id:'a',personaje_id:'2',vida:10}]}]);
 await como(user);await assert.rejects(db.query('select titulo_activar(2,null)'),/fuera de combate/);
 await como(gm,false);await assert.rejects(db.query('update personajes set titulo_activo=$1 where id=2',[negociador]),/fuera de combate/);
 await db.query("delete from combates_yugen");

 // El GM puede retirar un título de una cuenta; los personajes que lo llevaban quedan sin título.
 await como(gm);await db.query('select titulo_retirar($1,$2)',[user,guardian]);await como(gm,false);
 assert.equal((await db.query('select titulo_activo from personajes where id=2')).rows[0].titulo_activo,null);
 await assert.rejects(db.query('update personajes set titulo_activo=$1 where id=2',[guardian]),/no pertenece a la cuenta/);

 // Títulos de party: especiales y normales.
 const pasivas=async id=>(await db.query('select yugen_interno.preparar_jugador($1) r',[id])).rows[0].r.configuracion.pasivas.map(x=>x.nombre);
 await db.query('update personajes set es_companero=true,party_activo=true where id=2');
 assert.ok((await pasivas(1)).includes('Título especial: Héroe de Ambrosía'));
 assert.ok(!(await pasivas(2)).includes('Título especial: Héroe de Ambrosía'),'especial sin party: solo el principal');
 await como(gm);await db.query("select titulo_ajustar($1,true,'',true)",[heroe]);
 await db.query("select titulo_ajustar($1,false,'Ventaja en negociaciones.',true)",[negociador]);await como(gm,false);
 assert.ok((await pasivas(2)).includes('Título especial: Héroe de Ambrosía'),'especial de party llega al compañero activo');
 await db.query('update personajes set party_activo=false where id=2');
 assert.ok(!(await pasivas(2)).includes('Título especial: Héroe de Ambrosía'),'compañero fuera de la party no lo recibe');
 await db.query('update personajes set party_activo=true where id=2');
 await como(user);await db.query('select titulo_activar(1,$1)',[negociador]);await como(gm,false);
 assert.ok((await pasivas(2)).includes('Título de la party: Lengua de plata'),'un título normal de party alcanza al resto');
 assert.ok(!(await pasivas(1)).includes('Título de la party: Lengua de plata'),'el portador no lo recibe dos veces');
 // En combate no se cambia el título, ni siquiera desde el equipo; el GM sí puede retirarlo.
 await db.query("insert into combates_yugen(id,creador_id,nombre,datos) values($1,$2,'Asalto',$3)",[crypto.randomUUID(),gm,{fase:'en_curso',miembros:[{id:'a',personaje_id:'1',vida:10}]}]);
 await assert.rejects(db.query("select yugen_interno.aplicar_equipo(1,'{}')"),/fuera de combate/);
 await como(gm);await db.query('select titulo_retirar($1,$2)',[user,negociador]);await como(gm,false);
 assert.equal((await db.query('select titulo_activo from personajes where id=1')).rows[0].titulo_activo,null);
 await db.query('select yugen_interno.aplicar_equipo(1,$1)',[{titulo:negociador}]);
 console.log('Títulos de party, bloqueo en combate y retirada del GM en cualquier momento correctos.');
 console.log('Títulos de cuenta: migración, entregas, uno activo por personaje, especiales siempre activos, combate y retirada correctos.');
}catch(e){console.error(e.message,e.where||'',e.stack);process.exitCode=1;}finally{await db.close();}
