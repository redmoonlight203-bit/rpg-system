import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {AccionSegura,ErrorAccion}=cargarDependencia('accion-segura');
const diferida=()=>{let resolver,rechazar;const prom=new Promise((r,j)=>{resolver=r;rechazar=j;});return {prom,resolver,rechazar};};
test('doble clic comparte petición y congela comando e identificador',async()=>{
 const espera=diferida(),comandos=[];const c=new AccionSegura({enviar:s=>{comandos.push(s);return espera.prom;},consultar:async()=>({confirmada:false}),recuperar:async()=>({version:1})});
 const comando={destino:{x:2,y:1}},p=c.ejecutar(comando,'movimiento'),q=c.ejecutar(comando,'movimiento');assert.equal(p,q);comando.destino.x=8;await Promise.resolve();assert.equal(comandos[0].destino.x,2);assert.ok(comandos[0].action_id);espera.resolver({version:1});await p;assert.equal(c.estado.fase,'reposo');
});
test('respuesta perdida después del commit recupera snapshot sin volver a ejecutar',async()=>{
 let envios=0,recuperaciones=0;const c=new AccionSegura({enviar:async()=>{envios++;throw new Error('Red perdida');},consultar:async()=>({confirmada:true}),recuperar:async()=>{recuperaciones++;return {version:9};}});
 assert.equal((await c.ejecutar({accion:'golpe'})).version,9);assert.equal(envios,1);assert.equal(recuperaciones,1);assert.equal(c.estado.fase,'reposo');
});
test('timeout pendiente sobrevive a recarga y el reintento reutiliza action_id',async()=>{
 let guardado,peticiones=[],exito=false;
 const opciones={guardar:s=>guardado=s,cargar:()=>guardado,enviar:async s=>{peticiones.push(s);if(!exito)throw new Error('Timeout');return {version:2};},consultar:async()=>({confirmada:false}),recuperar:async()=>({version:2})};
 const c=new AccionSegura(opciones);await assert.rejects(c.ejecutar({accion:'mover'}));const id=guardado.action_id;assert.equal(c.estado.fase,'incierta');
 const nuevo=new AccionSegura(opciones);nuevo.restaurar();assert.equal(nuevo.estado.solicitud.action_id,id);await assert.rejects(nuevo.ejecutar({accion:'atacar'}));exito=true;
 await nuevo.reintentar();assert.equal(peticiones.length,2);assert.equal(peticiones[0].action_id,peticiones[1].action_id);assert.equal(guardado,null);
});
test('rechazo de reglas no deja una acción pendiente ni inventa resultado',async()=>{
 const c=new AccionSegura({enviar:async()=>{throw new ErrorAccion('PH insuficiente',false);},consultar:async()=>({confirmada:false}),recuperar:async()=>assert.fail('No se debe recuperar un éxito inexistente')});
 await assert.rejects(c.ejecutar({accion:'azul'}),/PH insuficiente/);assert.equal(c.estado.fase,'reposo');
});
test('respuesta antigua no borra otra acción que ya está procesándose',async()=>{
 const a=diferida(),b=diferida();let cantidad=0,confirmada=false;
 const c=new AccionSegura({enviar:()=>++cantidad===1?a.prom:b.prom,consultar:async()=>({confirmada}),recuperar:async()=>({version:1})});
 const inicial=c.ejecutar({accion:'primera'});await Promise.resolve();confirmada=true;await c.comprobar();const segunda=c.ejecutar({accion:'segunda'});await Promise.resolve();const id=c.estado.solicitud.action_id;a.resolver({version:1});await inicial;assert.equal(c.estado.solicitud.action_id,id);b.resolver({version:2});await segunda;
});
test('descartar exige veto del servidor y recupera el estado confirmado',async()=>{
 let veto=false,guardado;
 const c=new AccionSegura({enviar:async()=>{throw Error('timeout');},consultar:async()=>({confirmada:false}),descartar:async()=>({descartada:veto}),recuperar:async()=>({version:7}),guardar:s=>guardado=s});
 await assert.rejects(c.ejecutar({accion:'mover'}));
 await assert.rejects(c.descartar(),/resolver/);assert.ok(guardado);assert.equal(c.estado.fase,'incierta');
 veto=true;assert.equal((await c.descartar()).version,7);assert.equal(guardado,null);assert.equal(c.estado.fase,'reposo');
});
test('descartar una acción ya confirmada recupera sin repetirla',async()=>{
 let enviado=0;
 const c=new AccionSegura({enviar:async()=>{enviado++;throw Error('timeout');},consultar:async()=>({confirmada:false}),descartar:async()=>({confirmada:true}),recuperar:async()=>({version:8})});
 await assert.rejects(c.ejecutar({accion:'atacar'}));assert.equal((await c.descartar()).version,8);assert.equal(enviado,1);
});
