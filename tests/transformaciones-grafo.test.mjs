import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {crearForma,renombrarForma,conectar}=cargarDependencia('transformaciones-grafo');

test('renombrar no cambia el id ni las transiciones', () => {
  let g={formas:[],transiciones:[]};
  const a=crearForma(g,{nombre:'Humano'}); g=a.grafo;
  const b=crearForma(g,{nombre:'Dragón'}); g=b.grafo;
  g=conectar(g,a.id,b.id,'ambos').grafo;
  const r=renombrarForma(g,a.id,'Persona');
  assert.equal(r.ok,true);
  assert.equal(r.grafo.formas.find(f=>f.id===a.id).nombre,'Persona');
  assert.equal(r.grafo.transiciones.length,1);
  assert.equal(r.grafo.transiciones[0].desde,a.id);
});

test('no conecta una forma consigo misma', () => {
  let g={formas:[],transiciones:[]};
  const a=crearForma(g,{nombre:'Humano'}); g=a.grafo;
  assert.equal(conectar(g,a.id,a.id,'ambos').ok,false);
});

test('ids de forma: slug del nombre con sufijo si se repite', () => {
  let g={formas:[],transiciones:[]};
  const a=crearForma(g,{nombre:'Dragón Rojo'}); g=a.grafo;
  const b=crearForma(g,{nombre:'Dragón Rojo'});
  assert.equal(a.id,'dragon_rojo');
  assert.equal(b.id,'dragon_rojo_2');
});

const {validarGrafo}=cargarDependencia('transformaciones-grafo');
test('exige exactamente una realidad', () => {
  const g={formas:[{id:'a',nombre:'A',estadisticas:{},poderes:[]}],transiciones:[]};
  assert.match(validarGrafo(g), /realidad/);
  const dos={formas:[{id:'a',nombre:'A',es_realidad:true,estadisticas:{},poderes:[]},{id:'b',nombre:'B',es_realidad:true,estadisticas:{},poderes:[]}],transiciones:[]};
  assert.match(validarGrafo(dos), /realidad/);
});
test('rechaza una transición a una forma que no existe', () => {
  const g={formas:[{id:'a',nombre:'A',es_realidad:true,estadisticas:{},poderes:[]}],transiciones:[{id:'t',desde:'a',hasta:'x',sentido:'ambos'}]};
  assert.notEqual(validarGrafo(g), null);
});
test('rechaza una forma huérfana a la que no se puede llegar desde la realidad', () => {
  const g={formas:[{id:'a',nombre:'A',es_realidad:true,estadisticas:{},poderes:[]},{id:'b',nombre:'B',estadisticas:{},poderes:[]}],transiciones:[]};
  assert.match(validarGrafo(g), /B/);
});
test('rechaza ids de forma repetidos', () => {
  const g={formas:[{id:'a',nombre:'A',es_realidad:true,estadisticas:{},poderes:[]},{id:'a',nombre:'A2',estadisticas:{},poderes:[]}],transiciones:[]};
  assert.notEqual(validarGrafo(g), null);
});
test('un grafo válido devuelve null', () => {
  const g={formas:[{id:'a',nombre:'A',es_realidad:true,estadisticas:{},poderes:[]},{id:'b',nombre:'B',estadisticas:{},poderes:[]}],transiciones:[{id:'t',desde:'a',hasta:'b',sentido:'ambos'}]};
  assert.equal(validarGrafo(g), null);
});
