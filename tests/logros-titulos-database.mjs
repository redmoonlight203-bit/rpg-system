import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.FORJA_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
const gm='00000000-0000-0000-0000-000000000001',user='00000000-0000-0000-0000-000000000002',otro='00000000-0000-0000-0000-000000000003',titulo='00000000-0000-0000-0000-000000000010',objeto='00000000-0000-0000-0000-000000000011';
try{
 // Reutiliza el esquema mínimo del ciclo; las funciones de recompensa que se prueban son las migraciones reales.
 const ciclo=readFileSync(new URL('./ciclo-encuentros-database.mjs',import.meta.url),'utf8');
 await db.exec(ciclo.match(/await db.exec\(`([\s\S]*?)`\);/)[1]);
 for(const file of ['20261108144114_ciclo_encuentros_recompensas.sql','20261108144126_logros_titulos_eventos.sql','20261108144129_arena_entrenamiento_aislada.sql','20261108145840_forja_permisos_recompensas.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 await db.exec(`alter table forja_maestra add column reglas jsonb default '[]',add column reglas_pasivas jsonb default '[]';alter table inventario_jugador add column configuracion jsonb;
 create or replace function public.forja_snapshot_config(p uuid) returns jsonb language sql as $$select jsonb_build_object('tipo_creacion',tipo_creacion,'reglas',reglas,'reglas_pasivas',reglas_pasivas) from public.forja_maestra where id=p$$;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261108153925_logros_titulos_forja_manuales.sql',import.meta.url),'utf8'));
 await db.query("insert into perfiles(id,rol) values($1,'KUROI'),($2,'REENCARNADO'),($3,'REENCARNADO')",[gm,user,otro]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[gm]);
 await db.query("insert into personajes(id,user_id,nombre,nivel) values(1,$1,'Axel',10),(2,$1,'Compañero',10)",[user]);
 const regla={id:'r',nombre:'Protección del título',evento:'permanente',condicion:'siempre',bonos:{armadura:3},curacion:0,recuperar_ph:0,reducir_fatiga:0};
 await db.query("insert into forja_maestra(id,nombre,tipo,tipo_creacion,slot_tipo,stats,reglas_pasivas,descripcion) values($1,'Guardián del barrio','titulos','titulo','titulo','{\"armadura\":2}',$2,'Los vecinos te reconocen como su protector.')",[titulo,[regla]]);
 await db.query("insert into forja_maestra(id,nombre,tipo,tipo_creacion) values($1,'Poción','objetos','objeto')",[objeto]);
 const crear=async(evento='manual',condiciones={},meta=1)=>{const r=await db.query("insert into logros_yugen(nombre,evento,meta,titulo,titulo_forja_id,condiciones,icono,imagen_url) values('Hito narrativo',$1,$2,'Nombre ignorado',$3,$4,'corona','data:image/png;base64,YQ==') returning id,titulo",[evento,meta,titulo,condiciones]);assert.equal(r.rows[0].titulo,'Guardián del barrio');return r.rows[0].id;};
 const logro=await crear('manual',{},3),peticion=crypto.randomUUID();
 const conceder=async(id,solicitud=crypto.randomUUID(),completar=true,cantidad=1)=> (await db.query("select logro_conceder($1,$2,null,$3,$4,'Rescató a los aldeanos en la sesión presencial',$5) r",[id,user,cantidad,completar,solicitud])).rows[0].r;
 let p=await conceder(logro,peticion,false,2);assert.equal(p.cantidad,2);assert.equal(p.desbloqueado,false);assert.equal((await db.query('select * from inventario_jugador')).rows.length,0);
 await conceder(logro,peticion,false,2);assert.equal((await db.query('select cantidad from progreso_logros')).rows[0].cantidad,2);
 await assert.rejects(conceder(logro,peticion,true),/otra entrega/);
 p=await conceder(logro);assert.equal(p.desbloqueado,true);assert.equal(p.titulo_forja_id,titulo);assert.ok(p.titulo_inventario_id);
 const item=(await db.query('select * from inventario_jugador')).rows[0];assert.equal(item.personaje_id,null);assert.equal(item.ligado_al_alma,true);assert.equal(item.slot_tipo,'titulo');assert.equal(item.configuracion.tipo_creacion,'titulo');assert.deepEqual(item.configuracion.reglas_pasivas,[regla]);assert.equal(item.stats.armadura,2);
 await conceder(logro);await conceder(await crear());assert.equal((await db.query('select * from inventario_jugador')).rows.length,1,'dos logros no duplican el mismo título en la cuenta');
 await assert.rejects(db.query("insert into logros_yugen(nombre,evento,titulo,titulo_forja_id) values('Error','manual','Poción',$1)",[objeto]),/título aprobado/);
 await assert.rejects(crear('manual',{codigo:'arbitrario'}),/desconocida/);
 await assert.rejects(db.query("update logros_yugen set imagen_url='javascript:alert(1)' where id=$1",[logro]),/imagen/);
 // Los filtros se evalúan en servidor sobre encuentros oficiales confirmados.
 const avanzado=await crear('enemigo_derrotado',{enemigo_nivel_minimo:5,rondas_maximas:3,nivel_minimo:10,sin_caer:true});
 const sobrevivir=await crear('sobrevivir_encuentro');
 const datos={fase:'finalizado',ronda:2,politica:{modo:'oficial'},cierre:{ganador:'jugador'},miembros:[{id:'a',personaje_id:'1',bando:'jugador',vida:10},{id:'e',bando:'enemigo',vida:0,nivel:4}]};
 async function evento(d,tipo='experiencia_otorgada',payload={}){const id=crypto.randomUUID();await db.query('insert into combates_yugen(id,creador_id,nombre,datos) values($1,$2,\'Prueba\',$3)',[id,gm,d]);await db.query("insert into eventos_dominio(combate_id,clave,tipo,personaje_id,user_id,datos) values($1,'prueba',$2,1,$3,$4)",[id,tipo,user,payload]);}
 await evento(datos);assert.equal((await db.query('select * from progreso_logros where logro_id=$1',[avanzado])).rows.length,0);
 assert.equal((await db.query('select desbloqueado from progreso_logros where logro_id=$1',[sobrevivir])).rows[0].desbloqueado,true);
 datos.miembros[1].nivel=5;datos.eventos=[{tipo:'enemigo_derrotado',objetivo:'a'}];await evento(datos);assert.equal((await db.query('select * from progreso_logros where logro_id=$1',[avanzado])).rows.length,0);
 delete datos.eventos;await evento(datos);assert.equal((await db.query('select desbloqueado from progreso_logros where logro_id=$1',[avanzado])).rows[0].desbloqueado,true);
 const botin=await crear('objeto_adjudicado',{objeto_id:objeto},2);await evento(datos,'objeto_adjudicado',{botin:[{forja_id:objeto,cantidad:2}]});assert.equal((await db.query('select cantidad from progreso_logros where logro_id=$1',[botin])).rows[0].cantidad,2);
 const entrenamiento=await crear('encuentro_finalizado');datos.politica.modo='entrenamiento';await evento(datos);assert.equal((await db.query('select * from progreso_logros where logro_id=$1',[entrenamiento])).rows.length,0);
 // Solo el GM concede y el jugador solo puede reclamar su propio título ya ganado.
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated');
 await assert.rejects(conceder(logro),/Solo el GM/);assert.equal((await db.query('select logro_reclamar_titulo($1) id',[p.id])).rows[0].id,item.id);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[otro]);await assert.rejects(db.query('select logro_reclamar_titulo($1)',[p.id]),/no está desbloqueado/);
 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[gm]);
 await db.query('delete from inventario_jugador where id=$1',[item.id]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated');await assert.rejects(db.query('select logro_reclamar_titulo($1)',[p.id]),/retiró/);
 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[gm]);await conceder(logro);assert.equal((await db.query('select * from inventario_jugador')).rows.length,1,'el GM puede volver a conceder con motivo');
 console.log('Logros: título real con pasivas, concesión presencial idempotente, filtros automáticos, imágenes, RLS y retirada por GM correctos.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();}
