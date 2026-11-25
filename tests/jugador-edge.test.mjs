import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as motor from '../supabase/functions/equipo-combate/motor.js';
const entrada=readFileSync(new URL('../supabase/functions/combate-jugador/index.ts',import.meta.url),'utf8').replace(/^import (\{[^}]+\}) from '\.\.\/equipo-combate\/motor.js';/m,'const $1=motor;');
const jugador='00000000-0000-0000-0000-000000000001', combate='00000000-0000-0000-0000-000000000002';
function servidor({auth=true,turno=true,usada=false,area=false,sinPH=false,sinCambios=false,timeoutCommit=false,ojo=null,legendaria=false,invoca=false,invocada=null,pendiente=false}={}){
 let handler,versionActual=3;const escrituras=[],lecturas=[],recibos=new Map();let c=motor.agregar(motor.nuevoCombate(),{id:'a',nombre:'Axel',stats:{vida:20,ph:10,fatiga:5},configuracion:{tipo_creacion:"personaje"}},'jugador',()=>10);c=motor.agregar(c,{id:'b',nombre:'Secreto enemigo',stats:{vida:100,ph:500},configuracion:{tipo_creacion:"personaje",habilidades:[{nombre:'Ataque secreto',stats:{}}]}},'enemigo',()=>1);if(ojo)c.miembros[0].configuracion.habilidades=[{id:'h',nombre:'Linaje',stats:{},efectos:[{id:'ojo',nombre:'Ojo',efecto:'estado',estado:'Ojo',cantidad:0,caras:4,modificador:0,tipo_dano:'',duracion:0,coste_ph:0,vision:ojo}]}];if(legendaria){c.miembros[0].stats.acciones_legendaria=1;c.miembros[0].configuracion.habilidades=[{id:'h',nombre:'Linaje',stats:{},efectos:[{id:'leg',nombre:'Zarpa',efecto:'dano',cantidad:1,caras:6,modificador:0,tipo_dano:'físico',estado:'',duracion:0,coste_ph:0,presupuesto:'legendaria'},{id:'nor',nombre:'Tajo',efecto:'dano',cantidad:1,caras:6,modificador:0,tipo_dano:'físico',estado:'',duracion:0,coste_ph:0}]}];c.miembros[0].posicion={x:1,y:1};c.miembros[1].posicion={x:2,y:1};}if(invoca){c.miembros[0].configuracion.habilidades=[{id:'sol',nombre:'Sol sagrado',stats:{},efectos:[],configuracion_invocacion:{modo:'jugador_en_combate',claseMaxima:'C',duracionTurnos:3,maxHabilidades:1,costePh:2}}];}c=motor.iniciar(c,()=>10);c.actual=turno?'a':'b';if(pendiente)c.solicitud_invocacion={id:'s1',actor:'a',habilidad:'sol',ronda:c.ronda};if(invocada){c.miembros.push({...structuredClone(c.miembros[1]),id:'inv',nombre:'Lobo',personaje_id:undefined,bando:'jugador',vida:8,stats:{vida:8,movimiento:4},configuracion:{tipo_creacion:'personaje'},invocacion:{invocador:invocada,habilidad:'sol',restantes:3},posicion:{x:3,y:3},estados:[]});c.actual='inv';}c.miembros[0].personaje_id='1';c.miembros[0].accion_usada=usada;
 if(area){c.miembros[0].configuracion.habilidades=[{id:'h',nombre:'Azul',stats:{},efectos:[{id:'azul',nombre:'Azul',efecto:'dano',cantidad:2,caras:6,modificador:0,tipo_dano:'energia',estado:'',duracion:0,coste_ph:2,salvacion:{cd:12,atributo:'salvacion',exito:'mitad'},tablero:{alcance:6,forma:'circulo',tamano:2,afecta:'enemigos',desplazamiento:{tipo:'atraer',casillas:2,cuando:'siempre'},derribo:'fallo_salvacion'}}]}];c.miembros[0].posicion={x:1,y:1};c.miembros[1].posicion={x:6,y:1};}

 if(sinPH){c.miembros[0].stats.ph=0;c.miembros[0].ph=99;}
 const mock=async(url,options)=>{if(url.endsWith('/jugador_accion_estado_servidor')){const q=JSON.parse(options.body);return Response.json(recibos.get(q.p_action_id)||{confirmada:false});}
 if(url.endsWith('/jugador_preparar_accion_servidor')){const q=JSON.parse(options.body);lecturas.push(q);return Response.json({id:combate,nombre:'Prueba',version:versionActual,combate:c,actor:c.miembros[0],recibo:recibos.get(q.p_action_id)||{confirmada:false}});}
 if(url.endsWith('/jugador_confirmar_accion_servidor')){if(timeoutCommit)return Response.json({message:'canceling statement due to statement timeout',code:'57014'},{status:500});const q=JSON.parse(options.body);if(!recibos.has(q.p_action_id)){escrituras.push(q);c=q.p_datos;versionActual++;recibos.set(q.p_action_id,{confirmada:true,repetida:true,action_id:q.p_action_id,version_aplicada:versionActual,evento:c.evento_visual});}return Response.json({id:combate,nombre:'Prueba',version:versionActual,combate:c,actor:c.miembros[0],recibo:recibos.get(q.p_action_id)});}
 if(url.endsWith('/auth/v1/user'))return Response.json(auth?{id:jugador}:{error:'no'},{status:auth?200:401});if(url.endsWith('/jugador_consultar_rapido_servidor')){lecturas.push(JSON.parse(options.body));return Response.json(sinCambios?{sin_cambios:true,id:combate,version:3}:{id:combate,nombre:'Prueba',version:3,combate:c,actor:c.miembros[0]});}if(url.endsWith('/jugador_confirmar_rapido_servidor')){escrituras.push(JSON.parse(options.body));c=escrituras.at(-1).p_datos;return Response.json({id:combate,nombre:'Prueba',version:4,combate:c,actor:c.miembros[0]});}throw Error(url);};
 new Function('Deno','fetch','Response','motor',entrada)({env:{get:k=>k==='SUPABASE_URL'?'https://test':'secreto-servidor'},serve:f=>handler=f},mock,Response,motor);return {handler,escrituras,lecturas};
}
const req=body=>new Request('https://test',{method:'POST',headers:{Authorization:'Bearer token'},body:JSON.stringify({combate_id:combate,actor_id:'a',...body})});
test('rechaza sesión inválida',async()=>{const s=servidor({auth:false});assert.equal((await s.handler(req({}))).status,401);assert.equal(s.escrituras.length,0);});
test('consulta oculta estadísticas, habilidades e historial de enemigos',async()=>{const s=servidor();const r=await s.handler(req({}));assert.equal(r.status,200);const data=await r.json();assert.equal(data.combate,undefined);assert.equal(data.objetivos[1].stats,undefined);assert.equal(JSON.stringify(data).includes('Ataque secreto'),false);});
test('no acepta actuar fuera de turno, versión obsoleta o acción ya consumida',async()=>{for(const [options,version] of [[{turno:false},3],[{},2],[{usada:true},3]]){const s=servidor(options);assert.equal((await s.handler(req({operacion:'actuar',version,accion_id:'guardia',objetivo_id:'a'}))).status,400);assert.equal(s.escrituras.length,0);}});
test('calcula acción en servidor e ignora resultado inventado por cliente',async()=>{const s=servidor();assert.equal((await s.handler(req({operacion:'actuar',version:3,accion_id:'guardia',objetivo_id:'a',p_datos:{vida:9999}}))).status,200);assert.equal(s.escrituras.length,1);assert.equal(s.escrituras[0].p_usuario,jugador);assert.equal(s.escrituras[0].p_datos.miembros[0].accion_usada,true);assert.equal(s.escrituras[0].p_datos.miembros[0].vida,20);});
test('pasar turno se calcula con el motor compartido',async()=>{const s=servidor();assert.equal((await s.handler(req({operacion:'pasar',version:3}))).status,200);assert.equal(s.escrituras[0].p_datos.actual,'b');});

test('el tablero comparte posiciones pero mantiene privados los recursos y habilidades enemigos',async()=>{const s=servidor();const data=await (await s.handler(req({}))).json();assert.ok(data.objetivos.every(o=>Number.isInteger(o.posicion.x)));assert.equal(data.objetivos[1].ph,undefined);assert.equal(data.objetivos[1].configuracion,undefined);assert.equal(data.tablero.columnas,12);});
test('mover en servidor cobra distancia real e ignora movimiento inventado',async()=>{const s=servidor();const r=await s.handler(req({operacion:'mover',version:3,destino:{x:2,y:1},movimiento:999}));assert.equal(r.status,200);const a=s.escrituras[0].p_datos.miembros[0];assert.equal(a.movimiento.gastado,1);assert.equal(a.accion_usada,false);});
test('movimiento rechaza turno ajeno, revisión vieja y destino ocupado sin guardar',async()=>{for(const [op,version,destino] of [[{turno:false},3,{x:2,y:1}],[{},2,{x:2,y:1}],[{},3,{x:10,y:1}]]){const s=servidor(op);assert.equal((await s.handler(req({operacion:'mover',version,destino}))).status,400);assert.equal(s.escrituras.length,0);}});

test('el jugador puede lanzar un área sobre una casilla vacía y el servidor calcula sus víctimas',async()=>{const s=servidor({area:true}),r=await s.handler(req({operacion:'actuar',version:3,accion_id:'hab:h:azul',objetivo_id:'',centro:{x:5,y:1}}));assert.equal(r.status,200);const n=s.escrituras[0].p_datos;assert.equal(n.miembros[0].ph,8);assert.ok(n.miembros[1].vida<100);assert.deepEqual(n.miembros[1].posicion,{x:5,y:1});});
test('el servidor rechaza un centro fuera de alcance sin guardar',async()=>{const s=servidor({area:true});assert.equal((await s.handler(req({operacion:'actuar',version:3,accion_id:'hab:h:azul',objetivo_id:'',centro:{x:11,y:7}}))).status,400);assert.equal(s.escrituras.length,0);});

test('el servidor bloquea PH residuales cuando el máximo real es cero',async()=>{const s=servidor({area:true,sinPH:true}),r=await s.handler(req({operacion:'actuar',version:3,accion_id:'hab:h:azul',objetivo_id:'',centro:{x:5,y:1}}));assert.equal(r.status,400);assert.match((await r.json()).error,/PH insuficientes/);assert.equal(s.escrituras.length,0);});

test('la revisión sin cambios evita transferir y reconstruir el tablero',async()=>{const s=servidor({sinCambios:true});const data=await(await s.handler(req({version:3}))).json();assert.deepEqual(data,{sin_cambios:true,id:combate,version:3});assert.equal(s.lecturas[0].p_version,3);assert.ok(JSON.stringify(data).length<120);});
test('una acción confirma y devuelve el estado en una sola escritura sin reenviar historial',async()=>{const s=servidor();const data=await(await s.handler(req({operacion:'pasar',version:3}))).json();assert.equal(data.version,4);assert.equal(s.lecturas.length,1);assert.equal(s.lecturas[0].p_version,null);assert.equal(s.escrituras.length,1);assert.equal(s.escrituras[0].p_datos.historial,undefined);});

test('repetir action_id después de confirmar devuelve estado sin ejecutar otra vez el motor',async()=>{
 const s=servidor(),action_id=crypto.randomUUID(),body={operacion:'actuar',version:3,accion_id:'guardia',objetivo_id:'a',action_id};
 assert.equal((await s.handler(req(body))).status,200);const r=await s.handler(req(body)),data=await r.json();assert.equal(r.status,200);assert.equal(s.escrituras.length,1);assert.equal(data.recibo.version_aplicada,4);assert.equal(data.actor.accion_usada,true);assert.ok(data.mediciones.total_ms>=0);
 const estado=await (await s.handler(req({operacion:'consultar_accion',action_id}))).json();assert.equal(estado.confirmada,true);assert.equal(s.escrituras.length,1);
});
test('un timeout SQL se devuelve como resultado incierto, para consultar antes de reintentar',async()=>{
 const s=servidor({timeoutCommit:true});const r=await s.handler(req({operacion:'actuar',version:3,accion_id:'guardia',objetivo_id:'a',action_id:crypto.randomUUID()}));const data=await r.json();assert.equal(data.code,'57014');assert.equal(data.incierta,true);
});

test('la visión ocular solo viaja al jugador con el ojo abierto y con lo que ve',async()=>{
 let data=await (await servidor().handler(req({}))).json();assert.equal(data.ocular,null);
 const ojo={nombre:'Ojo de prueba',modo:'permanente',duracion:0,alcance:0,apariencia:{color:'#aa2233',patron:'anillos',marcas:2,velo:1},revelar:{vida:true,acciones:true},puntos_debiles:{cantidad:1,cambia:'ronda',recompensa:{ventaja:true}}};
 data=await (await servidor({ojo}).handler(req({}))).json();
 assert.equal(data.ocular.visiones[0].nombre,'Ojo de prueba');
 const visto=data.ocular.objetivos.b;assert.equal(visto.detalle.vida.max,100);assert.ok(visto.detalle.acciones.length>0);assert.equal(visto.puntos.length,1);
 assert.equal(data.ocular.objetivos.a,undefined,'no se analiza a sí mismo');
 assert.equal(visto.detalle.atributos,undefined,'solo revela lo configurado');
});

test('fuera de turno solo se acepta una acción legendaria propia',async()=>{
 const s=servidor({turno:false,legendaria:true});
 let data=await (await s.handler(req({}))).json();
 assert.equal(data.es_turno,false);assert.equal(data.puede_legendaria,true);assert.equal(data.actor.presupuesto.legendaria,1);
 // Una acción normal sigue esperando al turno.
 assert.equal((await s.handler(req({operacion:'actuar',version:3,accion_id:'hab:h:nor',objetivo_id:'b'}))).status,400);
 for(const operacion of ['pasar','mover'])assert.equal((await s.handler(req({operacion,version:3,destino:{x:1,y:2}}))).status,400);
 assert.equal(s.escrituras.length,0);
 const r=await s.handler(req({operacion:"actuar",version:3,accion_id:"hab:h:leg",objetivo_id:"b"}));
 assert.equal(r.status,200);assert.equal(s.escrituras.length,1);
 const datos=s.escrituras[0].p_datos,a=datos.miembros.find(m=>m.id==='a');
 assert.equal(datos.actual,'b');assert.equal(a.gasto_acciones.legendaria,1);assert.ok(datos.miembros.find(m=>m.id==='b').vida<100);
 // Sin acciones legendarias no se ofrecen fuera de turno.
 const t=servidor({turno:false,legendaria:false});
 data=await (await t.handler(req({}))).json();assert.equal(data.puede_legendaria,false);
});

test('invocar deja la solicitud para el GM sin pagar, bloquea el turno y se puede cancelar',async()=>{
 const s=servidor({invoca:true});
 const data=await (await s.handler(req({}))).json();
 const acc=data.acciones.find(a=>a.id==='invocar:sol');
 assert.ok(acc,'la acción de invocar viaja a la barra');assert.equal(acc.efecto.efecto,'invocar');assert.equal(acc.invocacion,undefined,'sin la habilidad completa');
 assert.equal(data.invocaciones[0].config.modo,'jugador_en_combate');
 assert.equal(data.acciones.filter(a=>a.id==='invocar:sol').length,1);
 assert.equal((await s.handler(req({operacion:'invocar',version:3,habilidad_id:'sol'}))).status,400,'sin diseño no se pide');
 const r=await s.handler(req({operacion:'invocar',version:3,habilidad_id:'sol',propuesta:{nombre:'Lobo',stats:{vida:6},habilidades:[],pasivas:[]}}));
 assert.equal(r.status,200);
 const d=s.escrituras[0].p_datos;
 assert.equal(d.solicitud_invocacion.actor,'a');assert.equal(d.solicitud_invocacion.propuesta.nombre,'Lobo');
 assert.equal(d.miembros.find(m=>m.id==='a').ph,10,'no paga hasta que el GM la valide');
 assert.equal(d.miembros.length,2);
});
test('con una invocación pendiente solo se puede esperar o cancelar',async()=>{
 let s=servidor({invoca:true,pendiente:true});
 const data=await (await s.handler(req({}))).json();
 assert.equal(data.solicitud_invocacion.id,'s1');
 for(const body of [{operacion:'actuar',accion_id:'guardia',objetivo_id:'a'},{operacion:'pasar'},{operacion:'mover',destino:{x:1,y:2}}])
  assert.equal((await s.handler(req({version:3,...body}))).status,400,body.operacion);
 assert.equal(s.escrituras.length,0);
 assert.equal((await s.handler(req({version:3,operacion:'cancelar_invocacion'}))).status,200);
 assert.equal(s.escrituras[0].p_datos.solicitud_invocacion,undefined);
 // La de otro jugador no se puede cancelar.
 s=servidor({invoca:true});
 assert.equal((await s.handler(req({version:3,operacion:'cancelar_invocacion'}))).status,400);
});
test('el jugador maneja su invocación en el turno de esta: mover y terminar turno',async()=>{
 const s=servidor({invocada:'a',turno:false});
 const data=await (await s.handler(req({}))).json();
 const x=data.actor.controlados.find(v=>v.id==='inv');
 assert.ok(x&&x.turno&&x.invocada,'aparece como controlada y es su turno');
 assert.ok(Object.keys(x.alcanzables).length>0,'tiene casillas a las que moverse');
 const destino=Object.keys(x.alcanzables)[0].split(',').map(Number);
 assert.equal((await s.handler(req({operacion:'mover',version:3,controlado_id:'inv',destino:{x:destino[0],y:destino[1]}}))).status,200);
 assert.deepEqual(s.escrituras[0].p_datos.miembros.find(m=>m.id==='inv').posicion,{x:destino[0],y:destino[1]});
 const p=servidor({invocada:'a',turno:false});
 assert.equal((await p.handler(req({operacion:'pasar',version:3,controlado_id:'inv'}))).status,200);
 assert.notEqual(p.escrituras[0].p_datos.actual,'inv');
 // Sin indicar la criatura no puede mover a su personaje fuera de turno.
 assert.equal((await servidor({invocada:'a',turno:false}).handler(req({operacion:'mover',version:3,destino:{x:1,y:2}}))).status,400);
});
test('no se puede manejar la invocación de otro',async()=>{
 const s=servidor({invocada:'b',turno:false});
 assert.equal((await s.handler(req({operacion:'pasar',version:3,controlado_id:'inv'}))).status,400);
 assert.equal(s.escrituras.length,0);
});
