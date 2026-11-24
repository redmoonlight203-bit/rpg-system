import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,campo,dados,de,turnoDe} from './helpers/campo-reacciones.mjs';
const reaccion=(id,r)=>ef(id,{cantidad:0,reaccion:r});
test('pendiente 5: la reducción pagada por un aliado viaja con el golpe al que se interpone',()=>{
 const c=campo([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2},
  {id:'r',bando:'jugador',x:3,y:1,efectos:[ef('golpe'),reaccion('frena',{disparador:'aliado_atacado',alcance:2,coste:1,principal:{reducir:{modo:'fijo',valor:3}}})]},
  {id:'w',bando:'jugador',x:2,y:2,efectos:[ef('golpe'),reaccion('escudo',{disparador:'aliado_atacado',alcance:1,principal:{interponerse:{}}})]}]);
 const n=m.actuar(turnoDe(c,'a'),'a','hab:ha:golpe','k',dados([5]));
 assert.equal(de(n,'k').vida,50);assert.equal(de(n,'w').vida,48,'5 − 3 de la reducción ya pagada');
});
test('pendiente 7: la animación apunta a quien se interpuso',()=>{
 const c=campo([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2},{id:'w',bando:'jugador',x:2,y:2,efectos:[ef('golpe'),reaccion('escudo',{disparador:'aliado_atacado',alcance:1,principal:{interponerse:{}}})]}]);
 const n=m.actuar(turnoDe(c,'a'),'a','hab:ha:golpe','k',dados([4]));
 assert.deepEqual(n.evento_visual.hasta,m.posicionesTablero(n).w);assert.equal(n.objetivo_final,undefined);
});
