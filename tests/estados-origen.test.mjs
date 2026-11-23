import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,defensas,campoE,contado} from './helpers/campo-estados.mjs';
// Paso 4.2: los estados y el daño periódico conservan su origen; la inmunidad se comprueba antes de aplicarlos.
const fuego=ef('llama',{elemento:'fuego',caras:6});
const dragon=(...extra)=>({id:'d',bando:'jugador',x:2,efectos:[ef('golpe'),defensas({tipo:'dano',valor:'fuego',modo:'bloquear_dano'},...extra)]});
test('inmune al fuego: no recibe el daño, pero sí la Quemadura si falla la salvación',()=>{
 const c=campoE([{id:'a',bando:'enemigo',x:1,efectos:[fuego]},dragon()]);
 const n=m.actuar(turnoDe(c,'a'),'a','hab:ha:llama','d',dados([5]));
 assert.equal(de(n,'d').vida,50);
 assert.ok(de(n,'d').estados.some(e=>e.tipo==='quemadura'),'no es inmune a Quemadura');
 assert.match(n.registro.join('\n'),/inmune al fuego/);
});
test('inmune al fuego y a Quemadura: el estado se bloquea sin tirar salvación',()=>{
 const c=campoE([{id:'a',bando:'enemigo',x:1,efectos:[fuego]},dragon({tipo:'estado',valor:'quemadura',modo:'bloquear_aplicacion'})]);
 const r=contado([5]);const n=m.actuar(turnoDe(c,'a'),'a','hab:ha:llama','d',r);
 assert.equal(de(n,'d').estados.length,0);
 assert.equal(r.n,2,'solo 1d6 y el 1d4 elemental: no hay d20 de salvación');
});
test('el daño periódico de Quemadura es daño de fuego: la inmunidad lo bloquea y la resistencia lo reduce',()=>{
 const quemar=(c)=>{const n=structuredClone(c);de(n,'d').estados.push({id:'quemadura',tipo:'quemadura',nombre:'Quemadura',restantes:0,creado:0,bonos:{},cantidad:1,caras:4,cd:30,atributo:'salvacion'});n.actual='a';return n;};
 const inmune=m.siguiente(quemar(campoE([{id:'a',bando:'enemigo',x:1},dragon()])),dados([4]));
 assert.equal(de(inmune,'d').vida,50);
 const resiste=m.siguiente(quemar(campoE([{id:'a',bando:'enemigo',x:1},{id:'d',bando:'jugador',x:2,efectos:[ef('golpe'),defensas({tipo:'dano',valor:'fuego',modo:'resistir'})]}])),dados([4]));
 assert.equal(de(resiste,'d').vida,48,'1d4=4 a la mitad');
 const normal=m.siguiente(quemar(campoE([{id:'a',bando:'enemigo',x:1},{id:'d',bando:'jugador',x:2}])),dados([4]));
 assert.equal(de(normal,'d').vida,46,'sin inmunidad sigue igual (regresión)');
});
