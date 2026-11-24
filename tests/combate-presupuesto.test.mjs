import {cargarDependencia} from './helpers/cargar-ts.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const c=cargarDependencia('combate');
const {validarEfectos,nuevoEfecto}=cargarDependencia('creacion');
const golpe=(id,extra={})=>({...nuevoEfecto(),id,nombre:id==='golpe'?'Golpe':id,efecto:'dano',cantidad:1,caras:6,modificador:0,coste_ph:0,coste_fatiga:0,...extra});
function personaje(id,{stats={},efectos=[],propias}={}){
 return {id,posicion:{x:id==='a'?1:2,y:1},forja_id:id,nombre:id,stats:{vida:100,armadura:0,ph:10,fatiga:10,iniciativa:id==='a'?10:0,bono_impacto:5,...stats},
  configuracion:{tipo_creacion:'personaje',habilidades:efectos.length?[{id:'h',nombre:'Técnica',stats:{},efectos}]:[],...(propias?{acciones_personaje:propias}:{})}};
}
function campo(a={},b={}){return c.iniciar(c.agregar(c.agregar(c.nuevoCombate(),personaje('a',a),'jugador',()=>10),personaje('b',b),'enemigo',()=>1));}
const m=(x,id)=>x.miembros.find(v=>v.id===id);
const dados=()=>10;

test('sin claves de presupuesto todo es como antes',()=>{
 const x=campo();
 assert.equal(x.actual,'a');
 assert.deepEqual({...c.presupuestoDe(m(x,'a'))},{principal:1,adicional:0,legendaria:0});
 assert.equal(m(x,'a').gasto_acciones,undefined);
 assert.deepEqual({...c.presupuestoRestante(x,m(x,'a'))},{principal:1,adicional:0,legendaria:0});
 const y=c.actuar(x,'a','ataque','b',dados);
 assert.ok(m(y,'b').vida<100);
 assert.equal(m(y,'a').accion_usada,true);
 assert.equal(m(y,'a').gasto_acciones,undefined,'los datos antiguos no ganan campos nuevos');
 assert.throws(()=>c.actuar(y,'a','ataque','b',dados),/Ya utilizó su acción/);
 assert.ok(c.acciones(m(x,'a')).every(a=>a.presupuesto==='principal'));
});

test('acciones del personaje aparecen y se ejecutan',()=>{
 const g=golpe('golpe');
 const x=campo({propias:[g,golpe('escudo',{cantidad:0,reaccion:{disparador:'despues_ser_atacado',principal:{reducir:{modo:'todo'}}}})]});
 const a=m(x,'a');
 assert.equal(c.habilidadesDe(a)[0].id,c.FUENTE_PROPIAS);
 assert.equal(c.habilidadesDe(a)[0].nombre,'Acciones del personaje');
 const propia=c.acciones(a).find(v=>v.id==='hab:propias:golpe');
 assert.ok(propia);assert.equal(propia.nombre,'Golpe');assert.equal(propia.presupuesto,'principal');
 const y=c.actuar(x,'a','hab:propias:golpe','b',dados);
 assert.ok(m(y,'b').vida<100);
 assert.ok(c.reaccionesDe(x,a).some(r=>r.id==='escudo'));
 // Un personaje antiguo, sin acciones propias, no gana fuente nueva.
 assert.equal(c.habilidadesDe(m(campo(),'b')).length,0);
});

test('adicional: una extra en el propio turno',()=>{
 const x=campo({stats:{acciones_adicional:1},efectos:[golpe('extra',{presupuesto:'adicional'})]});
 assert.deepEqual({...c.presupuestoDe(m(x,'a'))},{principal:1,adicional:1,legendaria:0});
 assert.equal(c.acciones(m(x,'a')).find(v=>v.id==='hab:h:extra').presupuesto,'adicional');
 let y=c.actuar(x,'a','ataque','b',dados);
 y=c.actuar(y,'a','hab:h:extra','b',dados);
 assert.equal(m(y,'a').accion_usada,true);
 assert.match(y.registro.join('\n'),/a usa una acción adicional \(quedan 0\)\./);
 assert.throws(()=>c.actuar(y,'a','hab:h:extra','b',dados),/acciones adicionales/);
 // Antes de la principal tampoco la gasta.
 const antes=c.actuar(x,'a','hab:h:extra','b',dados);
 assert.equal(m(antes,'a').accion_usada,false);
 assert.ok(c.actuar(antes,'a','ataque','b',dados));
 y=c.siguiente(y);
 assert.equal(y.actual,'b');
 assert.throws(()=>c.actuar(y,'a','hab:h:extra','b',dados),/Solo puede actuar el personaje de turno/);
 y=c.siguiente(y);
 assert.equal(y.actual,'a');
 assert.equal(c.presupuestoRestante(y,m(y,'a')).adicional,1);
 assert.ok(c.actuar(y,'a','hab:h:extra','b',dados));
});

test('legendaria fuera de turno y recarga por ronda',()=>{
 let y=c.siguiente(campo({stats:{acciones_legendaria:2},efectos:[golpe('leg',{presupuesto:'legendaria'})]}));
 assert.equal(y.actual,'b');
 const usada=m(y,'a').accion_usada;
 const v0=m(y,'b').vida;
 y=c.actuar(y,'a','hab:h:leg','b',dados);
 const v1=m(y,'b').vida;assert.ok(v1<v0);
 y=c.actuar(y,'a','hab:h:leg','b',dados);
 assert.ok(m(y,'b').vida<v1);
 assert.match(y.registro.join('\n'),/a usa una acción legendaria \(quedan 0\)\./);
 assert.throws(()=>c.actuar(y,'a','hab:h:leg','b',dados),/acciones legendarias/);
 assert.equal(y.actual,'b');
 assert.equal(m(y,'a').accion_usada,usada);
 assert.equal(c.presupuestoRestante(y,m(y,'a')).legendaria,0);
 const ronda=y.ronda;
 y=c.siguiente(y);
 assert.equal(y.ronda,ronda+1);
 assert.equal(c.presupuestoRestante(y,m(y,'a')).legendaria,2);
});

test('legendaria imposible',()=>{
 const base=c.siguiente(campo({stats:{acciones_legendaria:1},efectos:[golpe('leg',{presupuesto:'legendaria'})]}));
 const caido=structuredClone(base);m(caido,'a').vida=0;
 assert.throws(()=>c.actuar(caido,'a','hab:h:leg','b',dados),/no puede usar acciones legendarias/);
 const loco=structuredClone(base);m(loco,'a').transformacion={definicion_id:'x',etapa_id:'y',descontrolada:true,stats_originales:{}};
 assert.throws(()=>c.actuar(loco,'a','hab:h:leg','b',dados),/fuera de control/);
 const pausa=structuredClone(base);pausa.reaccion_pendiente={oferta:{defensor:'b'},orden:{turno:'siguiente'},tiradas:[],respuestas:[]};
 assert.throws(()=>c.actuar(pausa,'a','hab:h:leg','b',dados),/reacción pendiente/);
 for(const x of [caido,loco,pausa])assert.equal(m(x,'a').gasto_acciones,undefined);
 const fuera=structuredClone(base);fuera.fase='finalizado';
 assert.throws(()=>c.actuar(fuera,'a','hab:h:leg','b',dados),/no puede usar acciones legendarias/);
});

test('principal 2',()=>{
 const x=campo({stats:{acciones_principal:1}});
 assert.equal(c.presupuestoDe(m(x,'a')).principal,2);
 let y=c.actuar(x,'a','ataque','b',dados);
 assert.equal(m(y,'a').accion_usada,false);
 assert.equal(c.presupuestoRestante(y,m(y,'a')).principal,1);
 y=c.actuar(y,'a','ataque','b',dados);
 assert.equal(m(y,'a').accion_usada,true);
 assert.throws(()=>c.actuar(y,'a','ataque','b',dados),/Ya utilizó su acción/);
 // El turno siguiente recarga sin código de reinicio.
 y=c.siguiente(c.siguiente(y));
 assert.equal(c.presupuestoRestante(y,m(y,'a')).principal,2);
});

test('presupuestoDeStats redondea hacia abajo y nunca baja de cero',()=>{
 assert.deepEqual({...c.presupuestoDeStats({acciones_principal:-3,acciones_adicional:1.7,acciones_legendaria:-1})},{principal:0,adicional:1,legendaria:0});
 assert.equal(c.tipoPresupuesto({}),'principal');
 assert.deepEqual({...c.CLAVE_PRESUPUESTO},{principal:'acciones_principal',adicional:'acciones_adicional',legendaria:'acciones_legendaria'});
});

test('validarEfectos rechaza un ataque múltiple adicional',()=>{
 const rafaga={...golpe('r'),nombre:'Ráfaga',cantidad:3,rafaga:true};
 assert.equal(validarEfectos([rafaga]),null);
 assert.equal(validarEfectos([{...rafaga,presupuesto:'principal'}]),null);
 assert.match(validarEfectos([{...rafaga,presupuesto:'adicional'}]),/Ráfaga: el ataque múltiple usa la acción principal\./);
 assert.equal(validarEfectos([{...golpe('x'),presupuesto:'legendaria'}]),null);
 assert.ok(validarEfectos([{...golpe('x'),presupuesto:'extra'}]));
});

test('las acciones propias repetidas en configuracion.efectos no duplican un ojo permanente',()=>{
 const ojo=golpe('ojo',{cantidad:0,vision:{nombre:'Ojo',modo:'permanente',duracion:0,alcance:0,apariencia:{color:'#aa2233',patron:'anillos',marcas:2,velo:1},revelar:{vida:true}}});
 const x=campo({propias:[ojo]});
 const a=m(x,'a');a.configuracion.efectos=[ojo];
 assert.equal(c.visionesActivas(a).length,1);
});
