import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,aplica,campoE} from './helpers/campo-estados.mjs';
const asustar=aplica('rugido',{estado_tipo:'asustado',duracion:3});
const turnoVictima=(c)=>{const n=m.actuar(turnoDe(c,'a'),'a','hab:ha:rugido','k',dados([1]));return m.siguiente(n,dados([1]));};
test('se aleja hasta 2 casillas de su fuente al iniciar su turno',()=>{
 const n=turnoVictima(campoE([{id:'a',bando:'enemigo',x:1,y:4,efectos:[asustar,ef('golpe')]},{id:'k',bando:'jugador',x:2,y:4}]));
 assert.equal(n.actual,'k');
 const p=m.posicionesTablero(n);assert.equal(Math.abs(p.k.x-p.a.x)+Math.abs(p.k.y-p.a.y),3);
 assert.ok(n.evento_visual.movimientos.some(v=>v.id==='k'&&v.tipo==='forzado'));
});
test('no atraviesa muros y sin casilla libre no se mueve',()=>{
 const n=turnoVictima(campoE([{id:'a',bando:'enemigo',x:1,y:0,efectos:[asustar,ef('golpe')]},{id:'k',bando:'jugador',x:0,y:0}],{muros:['0,1']}));
 assert.deepEqual({...m.posicionesTablero(n).k},{x:0,y:0});
 assert.match(n.registro.join('\n'),/no tiene casilla libre/);
});
test('no puede atacar a su fuente, pero sí a otros',()=>{
 const c=campoE([{id:'a',bando:'enemigo',x:1,y:4,efectos:[asustar,ef('golpe')]},{id:'b',bando:'enemigo',x:4,y:5},{id:'k',bando:'jugador',x:2,y:4}]);
 const n=turnoVictima(c);const k=turnoDe(n,'k');
 const p=m.posicionesTablero(k);
 de(k,'a').posicion={x:p.k.x+1,y:p.k.y};de(k,'b').posicion={x:p.k.x,y:p.k.y+1};
 assert.throws(()=>m.actuar(k,'k','hab:hk:golpe','a',dados([3])),/asustado/);
 assert.equal(de(m.actuar(k,'k','hab:hk:golpe','b',dados([3])),'b').vida,47);
});
