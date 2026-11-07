import {test} from 'node:test';
import assert from 'node:assert/strict';
import {distribuirArbol,descendientes} from '../lib/arbol.ts';
const nodo=(id,padre_id=null)=>({id,padre_id,nombre:id,personaje_id:1,tipo:'rama',descripcion:'',habilidad_id:null,atributo:null,incremento:null,coste:0,nivel_minimo:1,aprendido_at:null,puntos_gastados:0,bloqueo:null});
test('el árbol vacío conserva una superficie utilizable en móvil',()=>{const m=distribuirArbol([]);assert.equal(m.posiciones.length,0);assert.ok(m.ancho>=500&&m.alto>=300);});
test('centra cada rama sobre sus hijos y separa nodos sin solaparlos',()=>{
 const datos=[nodo('a'),nodo('b','a'),nodo('c','a'),nodo('d','b'),nodo('e','c')],m=distribuirArbol(datos),p=Object.fromEntries(m.posiciones.map(n=>[n.nodo.id,n]));
 assert.equal(p.a.x,(p.b.x+p.c.x)/2);assert.equal(p.b.x,p.d.x);assert.equal(p.c.x,p.e.x);
 for(const n of m.posiciones){assert.ok(n.x-106>=0&&n.x+106<=m.ancho);assert.ok(n.y+142<=m.alto);for(const otro of m.posiciones)if(n.nodo.id!==otro.nodo.id&&n.y===otro.y)assert.ok(Math.abs(n.x-otro.x)>=212);}
});
test('raíces independientes y nodos huérfanos se muestran una sola vez',()=>{const m=distribuirArbol([nodo('a'),nodo('b'),nodo('c','desconocido')]);assert.equal(m.posiciones.length,3);assert.equal(new Set(m.posiciones.map(n=>n.x)).size,3);});
test('los descendientes excluyen padres inválidos del editor sin ocultar otras ramas',()=>{const datos=[nodo('a'),nodo('b','a'),nodo('c','b'),nodo('d')];assert.deepEqual([...descendientes(datos,'a')],['a','b','c']);assert.ok(!descendientes(datos,'b').has('a'));});
test('un ciclo externo no bloquea el dibujo ni el editor',()=>{const datos=[nodo('a','b'),nodo('b','a')];assert.equal(distribuirArbol(datos).posiciones.length,2);assert.equal(descendientes(datos,'a').size,2);});
