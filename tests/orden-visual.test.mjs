import {test} from 'node:test';
import assert from 'node:assert/strict';
import {moverElemento,leerOrden} from '../lib/orden-visual.ts';
test('ordenar conserva los identificadores, los campos desconocidos y las condiciones anidadas',()=>{
 const reglas=[{id:'a',condicion:{tipo:'todas',condiciones:[{tipo:'estado',estado:'furia'}]},extra:{versionFutura:2}},{id:'b',efectos:[{tipo:'salvacion',fallo:[{tipo:'dano',valor:4}]}]},{id:'c'}];
 const copia=structuredClone(reglas),r=moverElemento(reglas,0,2);
 assert.deepEqual(r.map(x=>x.id),['b','c','a']);assert.strictEqual(r[2],reglas[0]);assert.deepEqual(reglas,copia);assert.deepEqual(moverElemento(r,2,0),reglas);
});
test('un arrastre de otra lista o de datos inválidos no cambia la configuración',()=>{
 const reglas=[{id:'a'},{id:'b'}];
 for(const texto of ['', '{}', '{"grupo":"otra","indice":0}', '{"grupo":"reglas","indice":-1}', '{"grupo":"reglas","indice":2}', '{"grupo":"reglas","indice":0.5}'])assert.equal(leerOrden(texto,'reglas',2),null);
 assert.equal(leerOrden('{"grupo":"reglas","indice":1}','reglas',2),1);
 assert.strictEqual(moverElemento(reglas,0,20),reglas);assert.strictEqual(moverElemento(reglas,0,0),reglas);
});
