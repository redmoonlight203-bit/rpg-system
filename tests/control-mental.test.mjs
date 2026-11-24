import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,aplica,campoE} from './helpers/campo-estados.mjs';
const control=aplica('posesion',{estado_tipo:'control_mental',duracion:2});
const base=()=>m.actuar(turnoDe(campoE([{id:'r',bando:'enemigo',x:1,efectos:[control,ef('golpe')]},{id:'k',bando:'jugador',x:2},{id:'j',bando:'jugador',x:3}]),'r'),'r','hab:hr:posesion','k',dados([1]));
test('el rival controla al afectado y puede ordenar daño a sus aliados',()=>{
 const n=base();const k=de(n,'k');
 assert.deepEqual({...m.controlDe(k)},{controlador:'fuente',fuente:'r',estado:'Control mental'});
 assert.equal(m.estaDominado(k),true);assert.equal(m.reaccionLaDecideGM(k),true);
 assert.deepEqual(m.controladosPor(n,'r').map(x=>x.id),['k']);
 const golpe=m.actuar(turnoDe(n,'k'),'k','hab:hk:golpe','j',dados([4]));
 assert.equal(de(golpe,'j').vida,46,'golpea a su propio aliado');assert.equal(de(golpe,'k').bando,'jugador','el bando real no cambia');
});
test('al terminar, el control vuelve; el GM puede cortarlo',()=>{
 const n=base();
 assert.equal(m.controladosPor(m.cortarControl(n,'k'),'r').length,0);
 let t=n;for(let i=0;i<8;i++)t=m.siguiente(t,dados([1]));
 assert.equal(m.estaDominado(de(t,'k')),false);
});
test('Dominado clásico sigue igual: el GM decide',()=>{
 const n=m.dominar(campoE([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2}]),'k',true);
 assert.equal(m.controlDe(de(n,'k')).controlador,'gm');
});
