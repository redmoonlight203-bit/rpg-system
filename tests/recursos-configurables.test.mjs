import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
import {m,ef,dados,de,turnoDe,campoE} from './helpers/campo-estados.mjs';
import {CB,BIO,rasgoEf} from './helpers/kuro.mjs';
const {validarRecurso,generarRecurso,gastarRecurso,topeRecurso}=cargarDependencia('./recursos');
// Un recurso que NO es CB, creado como dato: «Furia» se genera al recibir daño y topa por atributo.
const FURIA={id:'furia',nombre:'Furia',tope:{tipo:'atributo',atributo:'fuerza',multiplicador:2},inicial:0,generacion:[{evento:'recibir_dano',cantidad:2}],recuperacion:'vaciar',visible:'todos'};
const RABIA={id:'rabia',nombre:'Rabia',origen:'adquirido',recursos:[FURIA],potenciadores:[{id:'golpe_furioso',nombre:'Golpe furioso',acepta:['cuerpo_a_cuerpo'],coste:{recurso:{id:'furia',min:1,max:4}},componentes_anadidos:[{elemento:'ninguno',cantidad:1,caras:8,por_unidad:true}],limite_por_uso:1}]};
test('validación y tope',()=>{
 assert.equal(validarRecurso(CB),null);assert.equal(validarRecurso(FURIA),null);
 assert.match(validarRecurso({...FURIA,tope:{tipo:'fijo',valor:0}}),/tope/);
 assert.equal(topeRecurso(FURIA,{fuerza:3}),6);
 assert.equal(generarRecurso(FURIA,5,'recibir_dano',{fuerza:3}),6,'nunca supera el tope');
 assert.throws(()=>gastarRecurso(FURIA,1,2),/insuficiente/);
});
test('dos recursos distintos en el mismo personaje no se mezclan',()=>{
 const c=campoE([{id:'a',bando:'enemigo',x:1,efectos:[ef('golpe')]},{id:'k',bando:'jugador',x:2,stats:{fuerza:3},efectos:[ef('golpe'),rasgoEf(BIO,'bio'),rasgoEf(RABIA,'rabia')]}]);
 assert.equal(de(c,'k').recursos_especiales.carga_bioelectrica,2);assert.equal(de(c,'k').recursos_especiales.furia,0);
 const n=m.actuar(turnoDe(c,'a'),'a','hab:ha:golpe','k',dados([3]));
 assert.equal(de(n,'k').recursos_especiales.furia,2,'Furia sube al recibir daño');assert.equal(de(n,'k').recursos_especiales.carga_bioelectrica,2,'CB no cambia');
 const golpe=m.actuar(turnoDe(n,'k'),'k','hab:hk:golpe','a',dados([5]),false,undefined,[{rasgo:'rabia',potenciador:'golpe_furioso',unidades:2}]);
 assert.equal(de(golpe,'k').recursos_especiales.furia,0);assert.equal(de(golpe,'a').vida,50-5-10,'1d6 + 2d8 físicos');
 assert.throws(()=>m.actuar(turnoDe(golpe,'k'),'k','hab:hk:golpe','a',dados([5]),false,undefined,[{rasgo:'rabia',potenciador:'golpe_furioso',unidades:1}]),/insuficiente/);
});
test('el recurso se vacía o vuelve a su inicial al terminar el combate',()=>{
 const c=campoE([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2,stats:{fuerza:3},efectos:[ef('golpe'),rasgoEf(BIO,'bio'),rasgoEf(RABIA,'rabia')]}]);
 const fin=m.finalizar(m.actuar(turnoDe(c,'a'),'a','hab:ha:golpe','k',dados([3])));
 assert.equal(de(fin,'k').recursos_especiales.furia,0);assert.equal(de(fin,'k').recursos_especiales.carga_bioelectrica,undefined);
});
