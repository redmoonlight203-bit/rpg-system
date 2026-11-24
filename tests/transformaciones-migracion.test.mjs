import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {migrarTransformacion,grafoADefinicion}=cargarDependencia('transformaciones-migracion');
const {validarGrafo}=cargarDependencia('transformaciones-grafo');
const plano=v=>JSON.parse(JSON.stringify(v));

// Caso de control: Orin, «Liberar el sello» (tests/movimiento-posesion.test.mjs:13).
const orin={
 id:'gorveth',nombre:'Gor’Veth',tipo:'poder',
 posesion:{umbral_pct:50,cd:12,etapa_id:'gigante'},
 etapas:[
  {id:'primera',nombre:'Manifestación parcial',stats:{armadura:8}},
  {id:'segunda',nombre:'Fusión',stats:{armadura:12}},
  {id:'gigante',nombre:'Rana gigante',stats:{armadura:15},descontrolada:true,vida_maxima_posesion:40,curacion_entrada:20,habilidades:['mordida']}
 ]
};

test('Orin migra a una cadena con realidad, control y posesión intactos', () => {
  const g=plano(migrarTransformacion(orin));
  assert.equal(g.formas.filter(f=>f.es_realidad).length,1);
  const base=g.formas.find(f=>f.es_realidad);
  const gigante=g.formas.find(f=>f.id==='gigante');
  assert.equal(gigante.control,true);
  assert.deepEqual(g.posesion,orin.posesion);
  assert.ok(g.transiciones.some(t=>t.sentido==='uno'&&t.desde===base.id&&t.hasta==='primera'));
  assert.ok(g.transiciones.some(t=>t.sentido==='uno'&&t.desde==='segunda'&&t.hasta==='gigante'));
  assert.equal(g.transiciones.every(t=>t.sentido==='uno'),true);
  assert.deepEqual(gigante.estadisticas,{armadura:15});
  assert.deepEqual(gigante.poderes,['mordida']);
  assert.equal(validarGrafo(g),null);
});

test('la vuelta conserva todos los datos de la definición antigua', () => {
  const vuelta=plano(grafoADefinicion(migrarTransformacion(orin),orin));
  assert.deepEqual(vuelta.etapas,orin.etapas);
  assert.deepEqual(vuelta.posesion,orin.posesion);
  assert.equal(vuelta.tipo,orin.tipo);
});

test('sin etapas no falla y deja solo la realidad', () => {
  const g=plano(migrarTransformacion({id:'x',nombre:'X',tipo:'forma',etapas:[]}));
  assert.equal(g.formas.length,1);
  assert.equal(g.formas[0].es_realidad,true);
  assert.equal(g.transiciones.length,0);
});

test('etapas con id duplicado se conservan con sufijo sin perder datos', () => {
  const d={id:'x',nombre:'X',tipo:'forma',etapas:[
   {id:'gigante',nombre:'Gigante',stats:{hp:10}},{id:'gigante',nombre:'Gigante mayor',stats:{hp:20}}]};
  const g=plano(migrarTransformacion(d));
  const ids=g.formas.filter(f=>!f.es_realidad).map(f=>f.id);
  assert.deepEqual(ids,['gigante','gigante_2']);
  assert.deepEqual(g.formas.find(f=>f.id==='gigante_2').estadisticas,{hp:20});
  assert.equal(validarGrafo(g),null);
});

test('la realidad no choca con una etapa llamada «realidad»', () => {
  const g=plano(migrarTransformacion({id:'x',nombre:'X',tipo:'forma',etapas:[{id:'realidad',nombre:'R',stats:{hp:5}}]}));
  assert.equal(new Set(g.formas.map(f=>f.id)).size,2);
  assert.equal(g.formas.find(f=>!f.es_realidad).id,'realidad');
});
