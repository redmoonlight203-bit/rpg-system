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

const {formasAlcanzables}=cargarDependencia('transformaciones-grafo');
test('la realidad es alcanzable desde cualquier forma, aunque no haya transición', () => {
  const g={formas:[{id:'r',nombre:'R',es_realidad:true,estadisticas:{},poderes:[]},{id:'x',nombre:'X',estadisticas:{},poderes:[]}],transiciones:[]};
  assert.ok(formasAlcanzables(g,'x').includes('r'));
});
test('una forma que toma el control sigue teniendo vuelta a la realidad', () => {
  const g={formas:[{id:'r',nombre:'R',es_realidad:true,estadisticas:{},poderes:[]},{id:'gigante',nombre:'Gigante',control:true,estadisticas:{},poderes:[]}],transiciones:[]};
  assert.ok(formasAlcanzables(g,'gigante').includes('r'));
});
test('cambio libre en ambos sentidos y cadena en un solo sentido', () => {
  const f=(id,extra={})=>({id,nombre:id,estadisticas:{},poderes:[],...extra});
  const g={formas:[f('r',{es_realidad:true}),f('dragon'),f('e1'),f('e2')],transiciones:[
    {id:'1',desde:'r',hasta:'dragon',sentido:'ambos'},{id:'2',desde:'r',hasta:'e1',sentido:'uno'},{id:'3',desde:'e1',hasta:'e2',sentido:'uno'}]};
  assert.deepEqual([...formasAlcanzables(g,'dragon')],['r']);
  assert.deepEqual([...formasAlcanzables(g,'r').sort()],['dragon','e1']);
  assert.deepEqual([...formasAlcanzables(g,'e1').sort()],['e2','r']);
  assert.deepEqual([...formasAlcanzables(g,'e2')],['r']);
});

const {quitarForma,quitarTransicion,actualizarTransicion,disposicion}=cargarDependencia('transformaciones-grafo');
test('quitar una forma quita sus transiciones; la realidad no se puede quitar', () => {
  const f=(id,extra={})=>({id,nombre:id,estadisticas:{},poderes:[],...extra});
  const g={formas:[f('r',{es_realidad:true}),f('a'),f('b')],transiciones:[{id:'1',desde:'r',hasta:'a',sentido:'ambos'},{id:'2',desde:'a',hasta:'b',sentido:'uno'}]};
  const r=quitarForma(g,'a');
  assert.equal(r.ok,true);
  assert.deepEqual(r.grafo.formas.map(x=>x.id),['r','b']);
  assert.equal(r.grafo.transiciones.length,0);
  assert.equal(quitarForma(g,'r').ok,false);
  assert.equal(quitarTransicion(g,'1').grafo.transiciones.length,1);
  const c=actualizarTransicion(g,'2',{sentido:'ambos',coste:{ph:3}});
  assert.equal(c.grafo.transiciones[1].sentido,'ambos');
  assert.equal(c.grafo.transiciones[1].coste.ph,3);
  assert.equal(actualizarTransicion(g,'2',{coste:{}}).grafo.transiciones[1].coste,undefined);
});
test('disposición: columnas por distancia a la realidad, sin celdas repetidas', () => {
  const f=(id,extra={})=>({id,nombre:id,estadisticas:{},poderes:[],...extra});
  const g={formas:[f('r',{es_realidad:true}),f('a'),f('b'),f('c'),f('suelta')],transiciones:[{id:'1',desde:'r',hasta:'a',sentido:'ambos'},{id:'2',desde:'r',hasta:'b',sentido:'uno'},{id:'3',desde:'b',hasta:'c',sentido:'uno'}]};
  const d=disposicion(g);
  assert.deepEqual({...d.r},{columna:0,fila:0});
  assert.equal(d.a.columna,1);assert.equal(d.b.columna,1);assert.equal(d.c.columna,2);
  assert.equal(d.suelta.columna,3);
  const celdas=Object.values(d).map(p=>p.columna+','+p.fila);
  assert.equal(new Set(celdas).size,celdas.length);
});

test('conectar al revés una transición de un solo sentido la convierte en cambio libre', () => {
  const f=(id,extra={})=>({id,nombre:id,estadisticas:{},poderes:[],...extra});
  const g={formas:[f('r',{es_realidad:true}),f('a')],transiciones:[{id:'1',desde:'r',hasta:'a',sentido:'uno',coste:{ph:2}}]};
  const r=conectar(g,'a','r','ambos');
  assert.equal(r.ok,true);
  assert.equal(r.grafo.transiciones.length,1);
  assert.equal(r.grafo.transiciones[0].sentido,'ambos');
  assert.equal(r.grafo.transiciones[0].coste.ph,2);
  assert.equal(r.id,'1');
});

test('quitar un eslabón de una cadena une el anterior con el siguiente', () => {
  const f=(id,extra={})=>({id,nombre:id,estadisticas:{},poderes:[],...extra});
  const g={formas:[f('r',{es_realidad:true}),f('a'),f('b'),f('c')],transiciones:[
    {id:'1',desde:'r',hasta:'a',sentido:'uno'},{id:'2',desde:'a',hasta:'b',sentido:'uno'},{id:'3',desde:'b',hasta:'c',sentido:'uno'}]};
  const r=quitarForma(g,'b');
  assert.deepEqual(r.grafo.transiciones.map(t=>`${t.desde}>${t.hasta}:${t.sentido}`),['r>a:uno','a>c:uno']);
  assert.equal(validarGrafo(r.grafo),null);
});
