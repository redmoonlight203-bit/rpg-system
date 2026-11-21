import {cargarDependencia} from './helpers/cargar-ts.mjs';
import {test} from 'node:test';import assert from 'node:assert/strict';
const c=cargarDependencia('./combate'),v=cargarDependencia('./vision'),ui=cargarDependencia('./combate-interfaz');
const ojoBase=(p={})=>({...v.nuevaVision(),revelar:{vida:true,acciones:true,estados:true},puntos_debiles:{cantidad:1,cambia:'combate',recompensa:{dano:50}},...p});
const habilidad=(vision,extra={})=>({id:'h',nombre:'Linaje',stats:{},efectos:[{id:'ojo',nombre:'Abrir el ojo',efecto:'estado',cantidad:0,caras:4,modificador:0,tipo_dano:'',estado:'',duracion:0,coste_ph:3,vision,...extra}]});
function personaje(id,pos,extra={}){return {id,forja_id:null,nombre:id,posicion:pos,stats:{vida:100,armadura:12,ph:20,fatiga:5,bono_impacto:0,dano:0,iniciativa:0,movimiento:4},configuracion:{tipo_creacion:'personaje',...extra}};}
/** a (jugador) en (2,2), b (enemigo) en (5,2), z (enemigo lejano) en (11,7). `a` actúa primero. */
function campo(vision,{enemigo={},a={}}={}){
 let x=c.nuevoCombate();
 x=c.agregar(x,personaje('a',{x:2,y:2},{habilidades:vision?[habilidad(vision)]:[],...a}),'jugador',()=>20);
 x=c.agregar(x,personaje('b',{x:5,y:2},enemigo),'enemigo',()=>2);
 x=c.agregar(x,personaje('z',{x:11,y:7}),'enemigo',()=>1);
 return c.iniciar(x,()=>10);
}
const yo=x=>x.miembros.find(m=>m.id==='a'),el=x=>x.miembros.find(m=>m.id==='b');
const conPos=(x,id,pos)=>({...x,miembros:x.miembros.map(m=>m.id===id?{...m,posicion:pos}:m)});

test('validación del ojo: acepta la base y rechaza datos imposibles',()=>{
 assert.equal(v.validarVision(v.nuevaVision()),null);
 assert.match(v.validarVision({...v.nuevaVision(),apariencia:{...v.nuevaVision().apariencia,color:'rojo'}}),/#rrggbb/);
 assert.match(v.validarVision({...v.nuevaVision(),puntos_debiles:{cantidad:5,cambia:'ronda',recompensa:{}}}),/1 a 4/);
 assert.match(v.validarVision({...v.nuevaVision(),modo:'mirar'}),/activa/);
});
test('puntos débiles: deterministas, distintos y en la cantidad pedida',()=>{
 const p=v.puntosDebiles('semilla',3);assert.equal(p.length,3);assert.equal(new Set(p).size,3);
 assert.deepEqual(v.puntosDebiles('semilla',3),p);
 assert.equal(v.direccionAtaque({x:5,y:2},{x:4,y:2}),'o');assert.equal(v.direccionAtaque({x:5,y:2},{x:6,y:1}),'ne');
});
test('abrir el ojo cobra PH y la acción; usarlo otra vez lo cierra gratis',()=>{
 let x=c.actuar(campo(ojoBase()),'a','hab:h:ojo','a',()=>10);
 assert.ok(yo(x).estados.some(e=>e.id==='vision:ojo'));assert.equal(yo(x).ph,17);assert.equal(yo(x).accion_usada,true);
 x=c.actuar(x,'a','hab:h:ojo','a',()=>10);
 assert.ok(!yo(x).estados.some(e=>e.id==='vision:ojo'),'se cierra');assert.equal(yo(x).ph,17);
 assert.equal(ui.esAccionPropia('hab:h:ojo',habilidad(ojoBase()).efectos[0]),true);
});
test('un ojo sin acción no gasta el turno: se puede atacar después',()=>{
 let x=c.actuar(campo(ojoBase({sin_accion:true})),'a','hab:h:ojo','a',()=>10);
 assert.equal(yo(x).accion_usada,false);
 x=c.actuar(conPos(x,'a',{x:4,y:2}),'a','ataque','b',()=>18);assert.equal(yo(x).accion_usada,true);
});
test('mantenimiento: cobra PH cada turno propio y cierra el ojo cuando no alcanza',()=>{
 let x=c.actuar(campo(ojoBase({duracion:0,mantenimiento_ph:8})),'a','hab:h:ojo','a',()=>10);// 20-3=17
 const vuelta=y=>c.siguiente(c.siguiente(c.siguiente(y,()=>10),()=>10),()=>10);
 x=vuelta(x);assert.equal(yo(x).ph,9);assert.ok(yo(x).estados.some(e=>e.vision));
 x=vuelta(x);assert.equal(yo(x).ph,1);
 x=vuelta(x);assert.ok(!yo(x).estados.some(e=>e.vision),'sin PH se cierra');
});
test('duración: el ojo dura los turnos indicados',()=>{
 let x=c.actuar(campo(ojoBase({duracion:1})),'a','hab:h:ojo','a',()=>10);
 const vuelta=y=>c.siguiente(c.siguiente(c.siguiente(y,()=>10),()=>10),()=>10);
 x=vuelta(x);assert.ok(yo(x).estados.some(e=>e.vision),'sigue abierto el turno siguiente');
 x=vuelta(x);assert.ok(!yo(x).estados.some(e=>e.vision),'se cierra al terminar');
});
test('atacar desde el punto débil aplica la recompensa; desde otro lado no',()=>{
 let x=c.actuar(campo(ojoBase({sin_accion:true})),'a','hab:h:ojo','a',()=>10);
 const vista=c.vistaOcular(x,'a'),dir=vista.objetivos.b.puntos[0],vec=v.VECTOR_DIRECCION[dir];
 assert.equal(vista.objetivos.b.recompensa,'+50 de daño');
 const debil=conPos(x,'a',{x:5+vec.x,y:2+vec.y});
 const con=c.actuar(debil,'a','ataque','b',()=>15);
 const otraDir=v.DIRECCIONES_OCULARES.find(d=>d!==dir),o=v.VECTOR_DIRECCION[otraDir];
 const sin=c.actuar(conPos(x,'a',{x:5+o.x,y:2+o.y}),'a','ataque','b',()=>15);
 assert.equal((100-el(sin).vida)+50,100-el(con).vida);
 assert.ok(con.registro.some(l=>l.includes('punto débil')));
});
test('ventaja y crítico seguro del punto débil',()=>{
 const preparar=recompensa=>{const x=c.actuar(campo(ojoBase({sin_accion:true,puntos_debiles:{cantidad:1,cambia:'combate',recompensa}})),'a','hab:h:ojo','a',()=>10);const d=v.VECTOR_DIRECCION[c.vistaOcular(x,'a').objetivos.b.puntos[0]];return conPos(x,'a',{x:5+d.x,y:2+d.y});};
 const tiradas=lista=>{let i=0;return ()=>lista[i++]??3;};
 assert.equal(c.actuar(preparar({ventaja:true}),'a','ataque','b',tiradas([2,19])).resultado,'Impacto');
 assert.equal(c.actuar(preparar({}),'a','ataque','b',tiradas([2,19])).resultado,'Fallo');
 assert.equal(c.actuar(preparar({critico:true}),'a','ataque','b',tiradas([5])).resultado,'Critico');
});
test('anticipación: el ojo del defensor suma armadura contra quien ve',()=>{
 const permanente=ojoBase({modo:'permanente',puntos_debiles:undefined,anticipar:{armadura:10}});
 const x=campo(null,{enemigo:{habilidades:[habilidad(permanente)]}});
 assert.ok(el(x).estados.some(e=>e.vision),'el ojo permanente se abre al empezar');
 assert.equal(c.actuar(conPos(x,'a',{x:4,y:2}),'a','ataque','b',()=>15).resultado,'Fallo');// 15 < 12+10
 assert.equal(c.actuar(conPos(campo(null),'a',{x:4,y:2}),'a','ataque','b',()=>15).resultado,'Impacto');
});
test('la vista ocular solo muestra enemigos dentro del alcance y sin muros',()=>{
 let x=c.actuar(campo(ojoBase({alcance:5})),'a','hab:h:ojo','a',()=>10);
 let vista=c.vistaOcular(x,'a');
 assert.deepEqual(Object.keys(vista.objetivos),['b'],'z queda fuera y los aliados no se analizan');
 assert.equal(vista.objetivos.b.detalle.vida.actual,100);assert.ok(vista.objetivos.b.detalle.acciones.length>0);
 assert.equal(vista.visiones[0].nombre,'Ojo despierto');
 const muro={...x,mapa:{id:'m',version:1,nombre:'M',columnas:12,filas:8,celdas:{'3,2':'muro','4,2':'muro'}}};
 assert.equal(c.vistaOcular(muro,'a').objetivos.b,undefined);
 x=c.actuar(campo(ojoBase({alcance:5,atraviesa_muros:true})),'a','hab:h:ojo','a',()=>10);
 assert.ok(c.vistaOcular({...x,mapa:muro.mapa},'a').objetivos.b);
 assert.equal(c.vistaOcular(campo(null),'a'),null,'sin ojo no hay vista');
});
test('lo oculto bajo tierra solo se ve con «revelar ocultos»',()=>{
 const enterrar=x=>({...x,miembros:x.miembros.map(m=>m.id==='b'?{...m,estados:[...m.estados,{id:'bajo',tipo:'bajo',nombre:'Bajo tierra',restantes:0,creado:0,bonos:{}}]}:m)});
 let x=enterrar(c.actuar(campo(ojoBase()),'a','hab:h:ojo','a',()=>10));
 assert.equal(c.vistaOcular(x,'a').objetivos.b,undefined);
 x=enterrar(c.actuar(campo(ojoBase({revelar:{ocultos:true}})),'a','hab:h:ojo','a',()=>10));
 assert.equal(c.vistaOcular(x,'a').objetivos.b.revela_oculto,true);
});
test('bonos mientras está abierto y amenazas de movimiento',()=>{
 const x=c.actuar(campo(ojoBase({bonos:{salvacion:3},amenazas:true})),'a','hab:h:ojo','a',()=>10);
 assert.equal(c.estadisticas(yo(x)).salvacion,3);
 const amenaza=new Set(c.vistaOcular(x,'a').amenaza);
 assert.ok(amenaza.has('4,2')&&amenaza.has('6,2'),'casillas junto al enemigo');assert.ok(!amenaza.has('11,0'));
});
test('con_accion: el ojo se abre al usar la acción además de su efecto',()=>{
 const vision=ojoBase({modo:'con_accion'});
 const x0=campo(null,{a:{habilidades:[{id:'h',nombre:'Mirada',stats:{},efectos:[{id:'golpe',nombre:'Mirada cortante',efecto:'dano',cantidad:1,caras:4,modificador:0,tipo_dano:'',estado:'',duracion:0,coste_ph:0,vision}]}]}});
 const x=c.actuar(conPos(x0,'a',{x:4,y:2}),'a','hab:h:golpe','b',()=>15);
 assert.ok(yo(x).estados.some(e=>e.id==='vision:golpe'));assert.ok(el(x).vida<100);
});
test('un ojo permanente sin dados no ocupa la barra de acciones',()=>{
 const x=campo(ojoBase({modo:'permanente'}));
 assert.ok(!c.acciones(yo(x)).some(a=>a.id==='hab:h:ojo'));assert.ok(c.vistaOcular(x,'a'));
});
test('plantillas oculares del Yunque son válidas',()=>{
 const cr=cargarDependencia('./creacion'),pl=cargarDependencia('./yunque-plantillas');
 const ojos=pl.PLANTILLAS.filter(p=>p.fragmentos.some(f=>f.datos.vision));
 assert.ok(ojos.length>=3);
 for(const p of ojos)assert.equal(cr.validarEfectos(p.fragmentos.map(f=>f.datos)),null,p.nombre);
});
