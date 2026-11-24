import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,aplica,campoE} from './helpers/campo-estados.mjs';
const con=(estado_tipo,extra={})=>aplica('x',{estado_tipo,duracion:3,...extra});
const tras=(estado_tipo,d=[1],extra)=>m.siguiente(m.actuar(turnoDe(campoE([{id:'a',bando:'enemigo',x:1,efectos:[con(estado_tipo,extra)]},{id:'k',bando:'jugador',x:2,efectos:[ef('golpe'),ef('escudo',{cantidad:0,reaccion:{disparador:'despues_ser_atacado',principal:{reducir:{modo:'todo'}}}})]}]),'a'),'a','hab:ha:x','k',dados([1])),dados(d));
test('Paralizado: movimiento 0, pierde el primer turno siempre y conserva reacciones',()=>{
 const n=tras('paralizado',[20]);const k=de(n,'k');
 assert.equal(m.movimientoRestante(k),0);assert.equal(k.accion_usada,true,'aunque el d20 sea 20, el primer turno se pierde');
 assert.equal(m.reaccionesDe(n,k)[0].lista,true);
});
test('Paralizado: después pierde un turno más hasta superar la salvación',()=>{
 let n=tras('paralizado',[1]);
 n=m.siguiente(m.siguiente(n,dados([1])),dados([1]));assert.equal(n.actual,'k');assert.equal(de(n,'k').accion_usada,true,'falla: pierde otro');
 n=m.siguiente(m.siguiente(n,dados([1])),dados([20]));assert.equal(de(n,'k').accion_usada,false,'supera: actúa');
 assert.equal(de(n,'k').estados.length,0);
});
test('En trance: pierde el turno y no puede reaccionar',()=>{
 const n=tras('en_trance');const k=de(n,'k');
 assert.equal(k.accion_usada,true);assert.equal(m.reaccionesDe(n,k)[0].lista,false);
});
test('Dormido despierta al recibir daño',()=>{
 const n=tras('dormido');assert.equal(de(n,'k').accion_usada,true);
 const golpe=m.actuar(turnoDe(n,'a'),'a','hab:ha:x','k',dados([1]));
 assert.ok(de(golpe,'k').estados.some(e=>e.tipo==='dormido'));
 const c2=campoE([{id:'a',bando:'enemigo',x:1,efectos:[ef('golpe')]},{id:'k',bando:'jugador',x:2}]);de(c2,'k').estados.push({id:'dormido',tipo:'dormido',nombre:'Dormido',restantes:3,creado:0,bonos:{}});
 const desp=m.actuar(turnoDe(c2,'a'),'a','hab:ha:golpe','k',dados([2]));
 assert.equal(de(desp,'k').estados.length,0);assert.match(desp.registro.join('\n'),/despierta/);
});
test('modificador de movimiento a la mitad (estado del Yunque)',()=>{
 const def={id:'lento',nombre:'Lento',categoria:'fisico',duracion:{tipo:'turnos',turnos:2},efectos:[{tipo:'modificador_movimiento',modo:'mitad'}]};
 const n=tras('narrativo',[1],{estado_def:def});assert.equal(m.movimientoRestante(de(n,'k')),3);assert.equal(de(n,'k').accion_usada,false,'no pierde acciones');
});
