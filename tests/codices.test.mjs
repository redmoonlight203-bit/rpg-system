import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';

const c = cargarDependencia('codices');
const variante = (id, peso = 1, otros = {}) => ({id, nombre:id, peso, bonos:{}, habilidades:[], pasivas:[], equipamiento:{}, ...otros});

test('codiceDe elige la metáfora por tipo', () => {
  for (const [tipo, monstruo, esperado] of [
    ['personaje',true,'bestiario'], ['personaje',false,'expediente'],
    ['habilidad',false,'tarot'], ['habilidad',true,'tarot'], ['objeto',false,'reliquia'],
    ['pasiva',false,'sello'], ['titulo',false,'edicto'], ['otro',false,'pergamino'], ['desconocido',false,'pergamino'],
  ]) assert.equal(c.codiceDe(tipo, monstruo), esperado);
});

test('romano y arcanoDe', () => {
  assert.deepEqual([0,4,9,14,21].map(c.romano), ['0','IV','IX','XIV','XXI']);
  assert.deepEqual(c.arcanoDe('abc'), c.arcanoDe('abc'));
  const numeros = Array.from({length:200}, (_, i) => c.arcanoDe('id'+i).numero);
  assert.ok(numeros.every(n => n >= 0 && n <= 21));
  assert.ok(new Set(numeros).size >= 10);
});

test('paginasBestiario omite láminas vacías', () => {
  const base = {stats:0, habilidades:0, pasivas:0, equipo:0, variantes:[], cronica:false};
  assert.deepEqual(Array.from(c.paginasBestiario(base), p => p.clave), ['lamina','ficha']);
  const paginas = c.paginasBestiario({...base, variantes:[variante('v1'),variante('v2')], cronica:true});
  assert.deepEqual(Array.from(paginas, p => p.clave), ['lamina','variante','variante','cronica','ficha']);
  assert.deepEqual([paginas[1].varianteId,paginas[2].varianteId], ['v1','v2']);
  assert.equal(c.paginasBestiario({...base, habilidades:1})[1].clave, 'anatomia');
});

test('variantesBestiario describe pesos, bonos y equipo', () => {
  const variantes = [variante('v1',1,{bonos:{fuerza:0,defensa:2},equipamiento:{
    mano_der:{modo:'catalogo',opciones:['x','borrada']},
    mano_izq:{modo:'generado',nombre:'Garras',rangos:{dano:{min:1,max:3}}},
  }}), variante('v2',3)];
  const ver = c.variantesBestiario({variantes}, id => id === 'x' ? 'Hacha' : null);
  assert.deepEqual(Array.from(ver, x => x.probabilidad), [25,75]);
  assert.deepEqual(Array.from(ver[0].bonos, x => Array.from(x)), [['defensa',2]]);
  assert.equal(ver[0].equipo[0].espacio, 'Mano derecha');
  assert.equal(ver[0].equipo[0].texto, 'Hacha o Creación no disponible');
  assert.equal(ver[0].equipo[1].texto, 'Generado: Garras (dano 1–3)');
  assert.deepEqual(Array.from(c.variantesBestiario({variantes:[variante('a'),variante('b'),variante('c')]}, () => null), x => x.probabilidad), [33.3,33.3,33.3]);
  assert.equal(c.variantesBestiario(null, () => null).length, 0);
});

test('vinculosDe deduplica y marca las borradas', () => {
  const item = {id:'m',nombre:'M',habilidades:['h1','h1','zz'],pasivas:['p1'],equipamiento:{mano_der:'o1'}};
  const items = ['h1','p1','o1','h2','p2','o2'].map(id => ({id,nombre:id}));
  const enlaces = c.vinculosDe(item, items);
  assert.equal(enlaces.length, 4);
  assert.equal(enlaces.find(x => x.id === 'zz').nombre, null);
  assert.equal(enlaces.find(x => x.id === 'o1').tipo, 'equipo');
  assert.equal(enlaces.find(x => x.id === 'o1').espacio, 'Mano derecha');
  const otros = c.vinculosDe({...item,configuracion_monstruo:{variantes:[variante('v',1,{
    habilidades:['h1','h2'],pasivas:['p1','p2'],equipamiento:{mano_der:{modo:'catalogo',opciones:['o1','o2']}},
  })]}}, items);
  assert.deepEqual(Array.from(otros, x => x.id), ['h1','zz','p1','o1','h2','p2','o2']);
});

test('portadoresDe encuentra a quien la lleva', () => {
  const items = [
    {id:'M',nombre:'Monstruo',configuracion_monstruo:{variantes:[variante('v',1,{habilidades:['h']})]}},
    {id:'A',nombre:'Aradia',habilidades:['h']},{id:'C',nombre:'Otra'},{id:'h',nombre:'H',habilidades:['h']},
  ];
  assert.deepEqual(Array.from(c.portadoresDe('h',items), x => x.id), ['A','M']);
});

test('avanzarRastro no crea ciclos', () => {
  assert.deepEqual(Array.from(c.avanzarRastro(['a','b','c'],'b')), ['a','b']);
  assert.deepEqual(Array.from(c.avanzarRastro(['a'],'b')), ['a','b']);
  assert.deepEqual(Array.from(c.avanzarRastro(['a','b','c','d','e','f','g','h'],'i')), ['b','c','d','e','f','g','h','i']);
  assert.deepEqual(Array.from(c.avanzarRastro([],'a')), ['a']);
});

test('cadenaPasiva conserva los textos y sus efectos', () => {
  const cadena = c.cadenaPasiva({evento:'recibir_dano',condicion:'vida_mitad',reduccion_pct:20,bonos:{armadura:2,fuerza:0}}, k => k.toUpperCase());
  assert.deepEqual(Array.from(cadena, x => ({...x})), [
    {tipo:'evento',texto:'Al recibir daño'},{tipo:'condicion',texto:'Vida a la mitad'},
    {tipo:'efecto',texto:'Reduce 20% de daño'},{tipo:'efecto',texto:'ARMADURA +2'},
  ]);
  assert.equal(c.cadenaPasiva({evento:'permanente',condicion:'siempre'}, String).length, 2);
});

test('espacioDe distingue el tipo de espacio del nombre de una ranura', () => {
  assert.deepEqual(['casco','mano','dos_manos','accesorio','ninguno',''].map(c.espacioDe), ['Cabeza','Mano','Dos manos','Accesorio',null,null]);
});

test('tirarPrueba aplica caras, modificador y el límite de cien dados', () => {
  const e = {cantidad:2,caras:6,modificador:3};
  for (const [rng,dado,total] of [[0.999,6,15],[0,1,5]]) {
    const r = c.tirarPrueba(e, () => rng);
    assert.deepEqual(Array.from(r.dados), [dado,dado]);
    assert.equal(r.total,total);
  }
  const sin = c.tirarPrueba({...e,cantidad:0}, () => 0);
  assert.equal(sin.dados.length,0);
  assert.equal(sin.total,3);
  assert.equal(c.tirarPrueba({...e,cantidad:101}, () => 1).dados.length,100);
});
