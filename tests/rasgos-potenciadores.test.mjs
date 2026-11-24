import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,campoE} from './helpers/campo-estados.mjs';
import {BIO,rasgoEf,bola} from './helpers/kuro.mjs';
const kuro=()=>campoE([{id:'k',bando:'jugador',x:1,efectos:[bola,rasgoEf(BIO)]},{id:'o',bando:'enemigo',x:3}]);
const lanzar=(c,d,unidades=2)=>m.actuar(turnoDe(c,'k'),'k','hab:hk:bola','o',dados(d),false,undefined,[{rasgo:'bioelectricidad',potenciador:'carga',unidades}]);
test('la acción ofrece el potenciador con su coste y saldo',()=>{
 const a=m.acciones(de(kuro(),'k')).find(x=>x.id==='hab:hk:bola');
 assert.equal(a.potenciadores.length,1);assert.equal(a.potenciadores[0].recurso.saldo,3,'2 iniciales + 1 al empezar su turno');assert.equal(a.potenciadores[0].recurso.max,3);
});
test('Bola de fuego 2d6 + 2 CB: dos componentes; el coste se descuenta una vez; el enfriamiento no cambia',()=>{
 const n=lanzar(kuro(),[3]);
 assert.equal(de(n,'o').vida,50-9-9,'fuego 2d6+1d4 y rayo 2d6+1d4');
 assert.equal(de(n,'k').recursos_especiales.carga_bioelectrica,1);assert.equal(de(n,'k').ph,18,'2 PH de la Bola, nada más');
 assert.match(n.registro.join('\n'),/Técnica potenciada: Bola de fuego 2d6 fuego \+ 2d6 electricidad por 2 CB\./);
});
test('Mojado activa Superconducción solo sobre el componente eléctrico',()=>{
 const c=kuro();de(c,'o').estados.push({id:'mojado',tipo:'mojado',nombre:'Mojado',restantes:0,creado:0,bonos:{}});
 const n=lanzar(c,[3]);
 assert.equal(de(n,'o').vida,50-9-18,'fuego 9 + rayo 9 × 2');
 assert.match(n.registro.join('\n'),/electricidad 18 \(Superconducción ×2\)/);
 assert.equal(de(n,'o').estados.some(e=>e.tipo==='mojado'),false,'Mojado se consume una vez');
});
test('sin potenciadores el combate no cambia (regresión)',()=>{
 const n=m.actuar(turnoDe(kuro(),'k'),'k','hab:hk:bola','o',dados([3]));
 assert.equal(de(n,'o').vida,41);assert.equal(de(n,'k').recursos_especiales.carga_bioelectrica,3);
});
test('el recurso se genera al iniciar turno y topa',()=>{
 let c=kuro();for(let i=0;i<12;i++)c=m.siguiente(c,dados([1]));
 assert.equal(de(c,'k').recursos_especiales.carga_bioelectrica,6);
});
