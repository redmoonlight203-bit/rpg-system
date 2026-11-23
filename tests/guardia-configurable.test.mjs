import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,campoE} from './helpers/campo-estados.mjs';
const conGuardia=(g)=>campoE([{id:'k',bando:'jugador',x:1,efectos:[ef('golpe'),...(g?[ef('caparazon',{efecto:'estado',estado:'Caparazón',cantidad:0,solo_pasivo:true,concepto:g})]:[])]},{id:'o',bando:'enemigo',x:2}]);
test('la guardia por defecto da armadura 2 como antes',()=>{
 const n=m.actuar(turnoDe(conGuardia(),'k'),'k','guardia','k',dados([1]));
 const g=de(n,'k').estados.find(e=>e.tipo==='guardia');
 assert.equal(JSON.stringify({b:g.bonos,r:g.restantes,i:g.inicio,n:g.nombre}),JSON.stringify({b:{armadura:2},r:1,i:true,n:'Guardia'}));
 assert.equal(m.estadisticas(de(n,'k')).armadura,2);
});
test('una guardia configurada da otros bonos, dura turnos y deja inmóvil',()=>{
 const g={id:'guardia',nombre:'Caparazón',bonos:{armadura:4},duracion:{tipo:'turnos',turnos:2},coste:{ph:1,fatiga:0},condiciones:{inmovil:true}};
 const n=m.actuar(turnoDe(conGuardia(g),'k'),'k','guardia','k',dados([1]));
 const k=de(n,'k');assert.equal(m.estadisticas(k).armadura,4);assert.equal(m.movimientoRestante(k),0);assert.equal(k.ph,19);
 assert.equal(k.estados.find(e=>e.tipo==='guardia').restantes,2);
});
test('una guardia de salvación en lugar de armadura; requiere escudo',()=>{
 const g={id:'guardia',nombre:'Mente serena',bonos:{salvacion:3},duracion:{tipo:'hasta_su_turno'},coste:{ph:0,fatiga:0},condiciones:{requiere_escudo:true}};
 assert.throws(()=>m.actuar(turnoDe(conGuardia(g),'k'),'k','guardia','k',dados([1])),/requiere un escudo/);
 const libre={...g,condiciones:{}};const n=m.actuar(turnoDe(conGuardia(libre),'k'),'k','guardia','k',dados([1]));
 assert.equal(m.estadisticas(de(n,'k')).salvacion,3);assert.equal(m.estadisticas(de(n,'k')).armadura,0);
});
