import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderizar} from './helpers/render-tsx.mjs';

const f=(id,extra={})=>({id,nombre:id[0].toUpperCase()+id.slice(1),estadisticas:{},poderes:[],...extra});
const grafo={formas:[f('_realidad',{nombre:'Forma base',es_realidad:true}),f('dragon'),f('bestia'),f('humo')],
 transiciones:[{id:'a',desde:'_realidad',hasta:'dragon',sentido:'ambos'},{id:'b',desde:'dragon',hasta:'bestia',sentido:'uno'}]};

test('el editor de formas dibuja un nodo por forma y un cable por transición', () => {
  const html=renderizar('components/yunque/editores/EditorFormas.tsx','EditorFormas',{grafo,onCambiar(){}});
  for(const n of ['Forma base','Dragon','Bestia','Humo'])assert.match(html,new RegExp(n));
  assert.equal((html.match(/data-lienzo-nodo=/g)||[]).length,4);
  assert.equal((html.match(/data-lienzo-cable=/g)||[]).length,2);
  assert.match(html,/Nueva forma/);
  // Humo no tiene transición de llegada: se avisa.
  assert.match(html,/Humo: no hay ninguna transición/);
});

test('los nodos no se superponen', () => {
  const html=renderizar('components/yunque/editores/EditorFormas.tsx','EditorFormas',{grafo,onCambiar(){}});
  const pos=[...html.matchAll(/data-lienzo-nodo="[^"]+"[^>]*style="left:(\d+)px;top:(\d+)px/g)].map(m=>m[1]+','+m[2]);
  assert.equal(pos.length,4);
  assert.equal(new Set(pos).size,4);
});

test('el editor de transformación monta el lienzo de formas en lugar de la lista', () => {
  const efecto={id:'t',nombre:'T',efecto:'transformacion',transformacion:{id:'d',nombre:'D',tipo:'poder',etapas:[{id:'dragon',nombre:'Dragón',stats:{armadura:15}}]}};
  const html=renderizar('components/EditorTransformacion.tsx','EditorTransformacion',{efecto,acciones:[efecto],onChange(){}});
  assert.match(html,/data-lienzo-nodo="_realidad"/);
  assert.match(html,/data-lienzo-nodo="dragon"/);
});

test('M6: el aviso marca solo las formas huérfanas, aunque compartan nombre', () => {
  const g={formas:[f('_realidad',{nombre:'Forma base',es_realidad:true}),f('a',{nombre:'Igual'}),f('b',{nombre:'Igual'})],
   transiciones:[{id:'1',desde:'_realidad',hasta:'a',sentido:'ambos'}]};
  const html=renderizar('components/yunque/editores/EditorFormas.tsx','EditorFormas',{grafo:g,onCambiar(){}});
  assert.doesNotMatch(html,/data-lienzo-nodo="a"[^>]*>\s*<button[^>]*is-error/);
  assert.match(html,/data-lienzo-nodo="b"[^>]*>\s*<button[^>]*is-error/);
});

test('M8: una forma antigua con id repetido se puede seleccionar y editar', () => {
  const efecto={id:'t',nombre:'T',efecto:'transformacion',transformacion:{id:'d',nombre:'D',tipo:'poder',etapas:[
   {id:'x',nombre:'Primera',stats:{armadura:7}},{id:'x',nombre:'Segunda',stats:{armadura:9}}]}};
  const html=renderizar('components/EditorTransformacion.tsx','EditorTransformacion',{efecto,acciones:[efecto],onChange(){}});
  assert.match(html,/data-lienzo-nodo="x_2"/);
  assert.match(html,/value="Primera"/,'abre la primera forma');
});
