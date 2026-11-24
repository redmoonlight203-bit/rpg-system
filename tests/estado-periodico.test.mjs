import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,defensas,aplica,campoE,contado} from './helpers/campo-estados.mjs';
const envenenar=aplica('dardo',{estado_tipo:'veneno',duracion:3,cantidad:1,caras:4});
const turno=(victima,r=dados([3]))=>m.siguiente(m.actuar(turnoDe(campoE([{id:'a',bando:'enemigo',x:1,efectos:[envenenar]},victima]),'a'),'a','hab:ha:dardo','k',dados([1])),r);
test('Envenenado causa daño de veneno al inicio de su turno',()=>{
 const n=turno({id:'k',bando:'jugador',x:2});assert.equal(de(n,'k').vida,47);
});
test('inmune al veneno (todo): no recibe el estado ni el daño',()=>{
 const n=turno({id:'k',bando:'jugador',x:2,efectos:[ef('golpe'),defensas({tipo:'dano',valor:'veneno',modo:'bloquear_todo'})]});
 assert.equal(de(n,'k').vida,50);assert.equal(de(n,'k').estados.length,0);
});
test('un estado creado en el Yunque combina perder turno y daño periódico al final del turno',()=>{
 const def={id:'sopor_toxico',nombre:'Sopor tóxico',categoria:'fisico',origen:'veneno',duracion:{tipo:'turnos',turnos:2},efectos:[{tipo:'perder_turno'},{tipo:'dano_periodico',cantidad:2,caras:6,tipo_dano:'veneno',momento:'fin'}]};
 const n0=m.actuar(turnoDe(campoE([{id:'a',bando:'enemigo',x:1,efectos:[aplica('nube',{estado_def:def,duracion:0})]},{id:'k',bando:'jugador',x:2}]),'a'),'a','hab:ha:nube','k',dados([1]));
 const n=m.siguiente(n0,dados([5]));
 assert.equal(de(n,'k').accion_usada,true,'pierde el turno');assert.equal(de(n,'k').vida,50);
 const fin=m.siguiente(n,dados([5]));
 assert.equal(de(fin,'k').vida,40,'2d6 = 10 al final de su turno');
});
