import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atributosEfectivos, linaje, padreValido } from '../lib/estadisticas.ts';
const categorias = [
  {id:'r',clave:'razas',nombre:'Razas'},
  {id:'e',clave:'enanos',nombre:'Enanos',parent_id:'r'},
  {id:'h',clave:'humanos',nombre:'Humanos',parent_id:'r'},
  {id:'o',clave:'objetos',nombre:'Objetos'},
  {id:'c',clave:'cascos',nombre:'Cascos',parent_id:'o'},
];
const stat = (categoria,clave,valor_defecto=0) => ({categoria,clave,valor_defecto});
test('razas heredan los cuatro recursos y conservan atributos exclusivos',()=>{
  const stats = ['vida','armadura','ph','fatiga'].map(k=>stat('razas',k));
  stats.push(stat('enanos','resistencia_veneno',3));
  assert.deepEqual(atributosEfectivos(categorias,stats,'enanos').map(s=>s.clave),['vida','armadura','ph','fatiga','resistencia_veneno']);
  assert.equal(atributosEfectivos(categorias,stats,'humanos').length,4);
  assert.equal(atributosEfectivos(categorias,stats,'cascos').length,0);
});
test('valor local sustituye el heredado sin alterar las otras razas, incluso si vale cero',()=>{
  const stats=[stat('razas','vida',15),stat('enanos','vida',0)];
  assert.equal(atributosEfectivos(categorias,stats,'enanos')[0].valor_defecto,0);
  assert.equal(atributosEfectivos(categorias,stats,'humanos')[0].valor_defecto,15);
  assert.equal(stats[0].valor_defecto,15);
});
test('herencia de varios niveles y etiquetas con la misma clave en otro árbol',()=>{
 const cats=[...categorias,{id:'d',clave:'enanos_montana',nombre:'Montaña',parent_id:'e'}];
 const stats=[stat('razas','vida',10),stat('enanos','vida',20),stat('enanos_montana','barba',1),stat('objetos','vida',99)];
 assert.deepEqual(atributosEfectivos(cats,stats,'enanos_montana').map(s=>s.valor_defecto),[20,1]);
 assert.equal(atributosEfectivos(cats,stats,'cascos')[0].valor_defecto,99);
});
test('impide padres propios, descendientes o inexistentes',()=>{
 assert.equal(padreValido(categorias,'r','e'),false);
 assert.equal(padreValido(categorias,'r','r'),false);
 assert.equal(padreValido(categorias,'e','r'),true);
 assert.equal(padreValido(categorias,'e','no-existe'),false);
 assert.equal(padreValido(categorias,'e',''),true);
});
test('categorías antiguas y referencias rotas no bloquean el resolvedor',()=>{
 assert.equal(atributosEfectivos(categorias,[stat('humanos','edad',6)],'humanos')[0].valor_defecto,6);
 assert.deepEqual(linaje(categorias,'inexistente'),[]);
 const ciclo=[{id:'a',clave:'a',nombre:'A',parent_id:'b'},{id:'b',clave:'b',nombre:'B',parent_id:'a'}];
 assert.equal(linaje(ciclo,'a').length,2);
});
