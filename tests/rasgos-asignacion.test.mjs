import test from 'node:test';
import assert from 'node:assert/strict';
import {m,de,campoE} from './helpers/campo-estados.mjs';
import {BIO,rasgoEf} from './helpers/kuro.mjs';
test('un rasgo que llega por dos vías (habilidad heredada y objeto) no se duplica',()=>{
 let c=m.nuevoCombate();
 c=m.agregar(c,{id:'k',nombre:'Kuro',stats:{vida:30},configuracion:{tipo_creacion:'personaje',raza:'kuro',habilidades:[{id:'bio',nombre:'Bioelectricidad',stats:{},requisitos_uso:{razas:['kuro'],herencia:true},efectos:[rasgoEf(BIO)]}],equipamiento:{acc_1:{id:'amuleto',nombre:'Amuleto',slot_tipo:'accesorio',stats:{},efectos:[rasgoEf(BIO)]}}}},'jugador',()=>1);
 assert.equal(m.rasgosDe(de(c,'k')).length,1);assert.equal(m.recursosDe(de(c,'k')).length,1);
});
test('sin cumplir el linaje, el rasgo heredado no aplica',()=>{
 let c=m.nuevoCombate();
 c=m.agregar(c,{id:'h',nombre:'Humano',stats:{vida:30},configuracion:{tipo_creacion:'personaje',raza:'humano',habilidades:[{id:'bio',nombre:'Bioelectricidad',stats:{},requisitos_uso:{razas:['kuro'],herencia:true},efectos:[rasgoEf(BIO)]}]}},'jugador',()=>1);
 assert.equal(m.rasgosDe(de(c,'h')).length,0);
});
test('rasgo o concepto en una acción normal (no «siempre activa») no se aplica (revisión I3)',()=>{
 let c=m.nuevoCombate();
 const oculto={...rasgoEf(BIO),solo_pasivo:undefined,concepto:{id:'guardia',nombre:'Fantasma',bonos:{armadura:9},duracion:{tipo:'hasta_su_turno'},coste:{ph:0,fatiga:0},condiciones:{}}};
 c=m.agregar(c,{id:'k',nombre:'k',stats:{vida:30},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'H',stats:{},efectos:[oculto]}]}},'jugador',()=>1);
 assert.equal(m.rasgosDe(de(c,'k')).length,0);assert.equal(m.conceptosDe(de(c,'k')).guardia.nombre,'Guardia');
});
