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
 const fuera=structuredClone(base);fuera.fase='finalizado';
 assert.throws(()=>c.actuar(fuera,'a','hab:h:leg','b',dados),/no puede usar acciones legendarias/);
 // Los intentos fallidos no tocan el combate: sigue el turno de b y la acción de a no cambia.
 for(const x of [caido,loco,pausa,fuera]){
  const usada=m(x,'a').accion_usada;
  assert.throws(()=>c.actuar(x,'a','hab:h:leg','b',dados));
  assert.equal(x.actual,'b');assert.equal(m(x,'a').accion_usada,usada);
 }
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

test('principal 0: el motor coincide con presupuestoRestante',()=>{
 const x=campo({stats:{acciones_principal:-1}});
 assert.equal(c.presupuestoRestante(x,m(x,'a')).principal,0);
 assert.throws(()=>c.actuar(x,'a','ataque','b',dados),/No le quedan acciones principales este turno\./);
 assert.throws(()=>c.actuar(x,'a','guardia','a',dados),/No le quedan acciones principales este turno\./);
});

test('una legendaria en el turno de un aliado acredita a su dueño',()=>{
 // a (jugador, legendaria) y c (aliado) contra b (enemigo con poca vida). Turno de c.
 const aliado={...personaje('c'),posicion:{x:1,y:2},stats:{...personaje('c').stats,iniciativa:5}};
 const enemigo=personaje('b',{stats:{vida:3}});
 let x=c.agregar(c.agregar(c.agregar(c.nuevoCombate(),personaje('a',{stats:{acciones_legendaria:1},efectos:[golpe('leg',{presupuesto:'legendaria',cantidad:1,caras:6,modificador:10})]}),'jugador',()=>10),aliado,'jugador',()=>10),enemigo,'enemigo',()=>1);
 x=c.iniciar(x);
 while(x.actual!=='c')x=c.siguiente(x);
 const y=c.actuar(x,'a','hab:h:leg','b',dados);
 assert.ok(m(y,'b').vida<=0);
 assert.equal(y.eventos.find(e=>e.tipo==='enemigo_derrotado').actor,'a');
 assert.ok((m(y,'a').contribucion||0)>0);
 assert.equal(m(y,'c').contribucion||0,0);
 // Con reacciones (resolverGolpe vuelve a llamar a actuar) se acredita igual.
 const z=c.actuarConReacciones(x,'a','hab:h:leg','b',dados);
 assert.equal(z.eventos.find(e=>e.tipo==='enemigo_derrotado').actor,'a');
 assert.ok((m(z,'a').contribucion||0)>0);
});

test('varias fuentes se suman',()=>{
 const regla=(id,bonos)=>({id,nombre:id,evento:'permanente',condicion:'siempre',bonos,curacion:0,recuperar_ph:0,reducir_fatiga:0});
 const x=campo();
 const a=m(x,'a');
 a.configuracion.pasivas=[
  {id:'raza:x',nombre:'Sangre',reglas:[regla('r1',{acciones_adicional:1})],reglas_motor:[]},
  {id:'clan',nombre:'Herencia',requisitos_uso:{razas:['Otra']},reglas:[regla('r2',{acciones_legendaria:2})],reglas_motor:[]}];
 assert.deepEqual({...c.presupuestoDe(a)},{principal:1,adicional:1,legendaria:0},'una pasiva cuyos requisitos no se cumplen no suma');
 a.configuracion.raza='Otra';
 assert.deepEqual({...c.presupuestoDe(a)},{principal:1,adicional:1,legendaria:2});
 a.stats.acciones_legendaria=1;
 assert.deepEqual({...c.presupuestoDe(a)},{principal:1,adicional:1,legendaria:3});
});

test('accionUsableAhora: adicional y legendaria se habilitan por su propio presupuesto, antes o después de la principal',()=>{
 const gastada={accion_usada:true},libre={accion_usada:false};
 const resto={principal:0,adicional:1,legendaria:1};
 assert.equal(c.accionUsableAhora('principal',gastada,resto),false,'la principal gastada sigue bloqueada');
 assert.equal(c.accionUsableAhora(undefined,libre,{principal:1,adicional:0,legendaria:0}),true);
 assert.equal(c.accionUsableAhora('principal',{accion_usada:true,rafaga:{restantes:2}},resto),true,'ráfaga a medias');
 assert.equal(c.accionUsableAhora('adicional',gastada,resto),true,'adicional tras la principal');
 assert.equal(c.accionUsableAhora('adicional',libre,resto),true,'adicional antes de la principal');
 assert.equal(c.accionUsableAhora('legendaria',gastada,resto),true,'legendaria en el propio turno');
 assert.equal(c.accionUsableAhora('adicional',libre,{principal:1,adicional:0,legendaria:0}),false);
 assert.equal(c.accionUsableAhora('legendaria',libre,null),false);
 assert.deepEqual({...c.presupuestoEstimado({acciones_adicional:1},true)},{principal:0,adicional:1,legendaria:0});
});

test('tras la principal el motor sigue admitiendo la adicional y la legendaria del turno, y la ayuda lo refleja',()=>{
 let x=campo({stats:{acciones_adicional:1,acciones_legendaria:1},efectos:[golpe('ad',{presupuesto:'adicional'}),golpe('leg',{presupuesto:'legendaria'})]});
 x=c.actuar(x,'a','ataque','b',dados);
 const a=m(x,'a'),r=c.presupuestoRestante(x,a);
 assert.equal(a.accion_usada,true);
 for(const acc of c.acciones(a).filter(v=>v.id.startsWith('hab:')))assert.equal(c.accionUsableAhora(acc.presupuesto,a,r),true,acc.id);
 assert.equal(c.accionUsableAhora('principal',a,r),false);
});

// Objetos del inventario: siguen el mismo presupuesto que las acciones de la barra.
const pocion=(presupuesto)=>({id:'pocion',nombre:'Poción',stats:{},consumible:true,tipo_creacion:'objeto',slot_tipo:'consumible',efectos:[golpe('beber',{efecto:'curacion',...(presupuesto?{presupuesto}:{})})]});
function conMochila(stats,objeto){
 const x=campo({stats});m(x,'a').configuracion.reserva=[objeto];return x;
}
test('usar un objeto con dos principales deja libre la segunda',()=>{
 let x=conMochila({acciones_principal:1},pocion());
 x=c.usarObjeto(x,'a','pocion','beber','a',()=>3);
 assert.equal(m(x,'a').accion_usada,false);
 assert.equal(c.presupuestoRestante(x,m(x,'a')).principal,1);
 x=c.actuar(x,'a','ataque','b',dados);
 assert.equal(m(x,'a').accion_usada,true);
});
test('un objeto adicional se usa tras la principal sin gastarla de nuevo',()=>{
 let x=conMochila({acciones_adicional:1},pocion('adicional'));
 x=c.actuar(x,'a','ataque','b',dados);
 x=c.usarObjeto(x,'a','pocion','beber','a',()=>3);
 assert.equal(c.presupuestoRestante(x,m(x,'a')).adicional,0);
 assert.match(x.registro.join('\n'),/consume Poción/);
 // Antes de la principal tampoco la gasta.
 let y=conMochila({acciones_adicional:1},pocion('adicional'));
 y=c.usarObjeto(y,'a','pocion','beber','a',()=>3);
 assert.equal(m(y,'a').accion_usada,false);
});
test('un objeto principal sigue exigiendo la principal',()=>{
 let x=conMochila({},pocion());
 x=c.actuar(x,'a','ataque','b',dados);
 assert.throws(()=>c.usarObjeto(x,'a','pocion','beber','a',()=>3),/Ya utilizó su acción/);
});
test('cambiar el equipo con dos principales deja libre la segunda',()=>{
 const capa={id:'capa',nombre:'Capa',slot_tipo:'capa',tipo_creacion:'objeto',stats:{}};
 const conCapa=stats=>{const x=campo({stats});m(x,'a').configuracion.reserva=[capa];return x;};
 let x=c.cambiarEquipo(conCapa({acciones_principal:1}),'a',{capa:'capa'});
 assert.equal(m(x,'a').accion_usada,false);
 assert.equal(c.presupuestoRestante(x,m(x,'a')).principal,1);
 x=c.cambiarEquipo(x,'a',{});
 assert.equal(m(x,'a').accion_usada,true);
 assert.throws(()=>c.cambiarEquipo(x,'a',{capa:'capa'}),/Cambiar equipo requiere/);
 // Con una sola principal, como siempre: la gasta.
 assert.equal(m(c.cambiarEquipo(conCapa({}),'a',{capa:'capa'}),'a').accion_usada,true);
 // Con principal 0 tampoco se puede cambiar en combate.
 assert.throws(()=>c.cambiarEquipo(conCapa({acciones_principal:-1}),'a',{capa:'capa'}),/Cambiar equipo requiere/);
});
