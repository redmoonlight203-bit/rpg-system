import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,aplica,campoE} from './helpers/campo-estados.mjs';
const hipno=aplica('hipnosis',{estado_tipo:'hipnotizado',duracion:3});
const turno=(d100)=>{const n=m.actuar(turnoDe(campoE([{id:'a',bando:'enemigo',x:1,efectos:[hipno,ef('golpe')]},{id:'k',bando:'jugador',x:2},{id:'j',bando:'jugador',x:3}]),'a'),'a','hab:ha:hipnosis','k',dados([1]));return m.siguiente(n,dados([d100]));};
test('la probabilidad se respeta con semilla fija',()=>{
 assert.equal(de(turno(50),'k').percepcion_alterada?.intercambiar,true,'50 ≤ 50 %');
 assert.equal(de(turno(51),'k').percepcion_alterada,undefined,'51 > 50 %');
});
test('solo cambia la vista: el objetivo real queda en el registro',()=>{
 const n=turno(10);const golpe=m.actuar(n,'k','hab:hk:golpe','j',dados([3]));
 assert.equal(de(golpe,'j').vida,47);assert.match(golpe.registro.join('\n'),/j recibe 3 daño/);
});
