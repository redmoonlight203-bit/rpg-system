import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,defensas,aplica,campoE} from './helpers/campo-estados.mjs';
// Paso 2.1: una habilidad puede atravesar inmunidades por categoría, estado o tipo de daño.
const inmune={id:'k',bando:'jugador',x:2,efectos:[ef('golpe'),defensas({tipo:'categoria',valor:'mental:control',modo:'bloquear_aplicacion'},{tipo:'dano',valor:'fuego',modo:'bloquear_dano'})]};
const comun=aplica('control',{estado_tipo:'control_mental',duracion:2});
const atraviesa=aplica('control_supremo',{estado_tipo:'control_mental',duracion:2,ignora:['categoria:mental']});
const llama=ef('llama',{elemento:'fuego'}),llamaPura=ef('llama_pura',{elemento:'fuego',ignora:['dano:fuego']});
const c=()=>campoE([{id:'a',bando:'enemigo',x:1,efectos:[comun,atraviesa,llama,llamaPura]},inmune]);
test('el control común se bloquea; el que ignora la inmunidad mental se aplica',()=>{
 assert.equal(de(m.actuar(turnoDe(c(),'a'),'a','hab:ha:control','k',dados([1])),'k').estados.length,0);
 assert.ok(de(m.actuar(turnoDe(c(),'a'),'a','hab:ha:control_supremo','k',dados([1])),'k').estados.some(e=>e.tipo==='control_mental'));
});
test('ignorar un tipo de daño solo vale para ese efecto',()=>{
 assert.equal(de(m.actuar(turnoDe(c(),'a'),'a','hab:ha:llama','k',dados([3,30])),'k').vida,50);
 assert.equal(de(m.actuar(turnoDe(c(),'a'),'a','hab:ha:llama_pura','k',dados([3,30])),'k').vida,43);
});
test('la lista vacía no cambia nada',()=>{
 const vacia=ef('llama_vacia',{elemento:'fuego',ignora:[]});
 const n=m.actuar(turnoDe(campoE([{id:'a',bando:'enemigo',x:1,efectos:[vacia]},inmune]),'a'),'a','hab:ha:llama_vacia','k',dados([3,30]));
 assert.equal(de(n,'k').vida,50);
});
