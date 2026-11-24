import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {crearEstado,renombrarEstado,buscarEstado,slugDe}=cargarDependencia('registro-estados');

test('crear genera un id desde el nombre y no lo cambia al renombrar', () => {
  const c = crearEstado([], {nombre:'Furia'});
  assert.equal(c.ok, true);
  assert.equal(c.id, 'furia');
  const r = renombrarEstado(c.lista, 'furia', 'Rabia');
  assert.equal(r.ok, true);
  assert.equal(buscarEstado(r.lista, 'furia').nombre, 'Rabia');
});

test('no duplica un nombre existente', () => {
  const c = crearEstado([{id:'furia', nombre:'Furia'}], {nombre:'furia'});
  assert.equal(c.ok, false);
});

test('rechaza nombre vacío', () => {
  assert.equal(crearEstado([], {nombre:'   '}).ok, false);
});

test('slugDe quita acentos y espacios', () => {
  assert.equal(slugDe('Ánimo Férreo'), 'animo_ferreo');
});

test('un id ocupado por un estado renombrado no se reutiliza', () => {
  const c = crearEstado([{id:'furia', nombre:'Rabia'}], {nombre:'Furia'});
  assert.equal(c.ok, true);
  assert.notEqual(c.id, 'furia');
  assert.equal(c.lista.length, 2);
});

test('renombrar rechaza vacío, id desconocido y nombre de otro estado', () => {
  const lista=[{id:'furia',nombre:'Furia'},{id:'veneno',nombre:'Veneno'}];
  assert.equal(renombrarEstado(lista,'furia','  ').ok,false);
  assert.equal(renombrarEstado(lista,'nada','Algo').ok,false);
  assert.equal(renombrarEstado(lista,'furia','veneno').ok,false);
  assert.equal(renombrarEstado(lista,'furia','furia').ok,true);
});

test('crear no modifica la lista original', () => {
  const lista=[];
  crearEstado(lista,{nombre:'Furia'});
  assert.equal(lista.length,0);
});

const {registrarClavesExistentes}=cargarDependencia('registro-estados');
test('registra claves antiguas con su id exacto', () => {
  const reglas=[{efectos:[{tipo:'transformar',clave:'Furia '}]},{condicion:{tipo:'estado_terminado',clave:'veneno'}}];
  const lista=registrarClavesExistentes([], reglas);
  assert.deepEqual([...lista.map(e=>e.id)].sort(), ['Furia ','veneno'].sort());
});
test('no duplica claves ya registradas', () => {
  const lista=registrarClavesExistentes([{id:'furia',nombre:'Furia'}], [{efectos:[{tipo:'transformar',clave:'furia'}]}]);
  assert.equal(lista.length, 1);
});
test('recorre condiciones anidadas, ramas y efectos de estado', () => {
  const reglas=[{
    condicion:{tipo:'todas',condiciones:[{tipo:'no',condicion:{tipo:'estado',sujeto:'yo',estado:'sangrado'}}]},
    efectos:[
      {tipo:'estado',clave:'aturdido',nombre:'Aturdido'},
      {tipo:'quitar_estado',clave:'quemado'},
      {tipo:'salvacion',exito:[],fallo:[{tipo:'condicional',condicion:{tipo:'estado',sujeto:'objetivo',estado:'marca'},exito:[{tipo:'estado',clave:'miedo'}]}]},
    ],
  }];
  const lista=registrarClavesExistentes([], reglas);
  assert.deepEqual([...lista.map(e=>e.id)].sort(), ['aturdido','marca','miedo','quemado','sangrado']);
  assert.equal(buscarEstado(lista,'aturdido').nombre,'Aturdido');
  assert.equal(buscarEstado(lista,'quemado').nombre,'quemado');
});
test('no modifica las reglas e ignora datos dañados', () => {
  const reglas=[{efectos:[{tipo:'estado',clave:'veneno'}]},null,'x',{efectos:'no'},{condicion:{tipo:'estado',estado:'   '}},{efectos:[{tipo:'estado',clave:''}]}];
  const copia=JSON.stringify(reglas);
  const lista=registrarClavesExistentes([], reglas);
  assert.deepEqual([...lista.map(e=>e.id)], ['veneno']);
  assert.equal(JSON.stringify(reglas), copia);
});

const {opcionesSelector}=cargarDependencia('registro-estados');
test('añade la clave huérfana como Sin registrar', () => {
  const o=opcionesSelector([{id:'furia',nombre:'Furia'}], 'veneno');
  assert.ok(o.some(x=>x.valor==='veneno'&&x.huerfano===true&&x.nombre==='Sin registrar'));
});
test('sin valor no añade huérfanos', () => {
  assert.equal(opcionesSelector([{id:'furia',nombre:'Furia'}], undefined).length, 1);
});
test('un valor registrado no se duplica y conserva su nombre', () => {
  const o=opcionesSelector([{id:'furia',nombre:'Rabia'}], 'furia');
  assert.equal(o.length,1);
  assert.equal(o[0].nombre,'Rabia');
  assert.equal(o[0].huerfano,false);
});
test('valor vacío no añade huérfanos', () => {
  assert.equal(opcionesSelector([], '').length, 0);
});

const {validarReglas}=cargarDependencia('reglas');
const regla=(p)=>({id:'x',nombre:'x',evento:'usar',condicion:{tipo:'siempre'},efectos:[{tipo:'mensaje',destino:'yo'}],coste_ph:0,coste_fatiga:0,enfriamiento:0,usos:0,prioridad:0,...p});
test('una condición de estado terminado sin clave pide elegir un estado', () => {
  const r = validarReglas([regla({condicion:{tipo:'estado_terminado',clave:''}})]);
  assert.match(r ?? '', /Elige un estado/);
});
test('una condición «tiene estado» vacía pide elegir un estado', () => {
  assert.match(validarReglas([regla({condicion:{tipo:'estado',sujeto:'yo',estado:''}})]) ?? '', /Elige un estado/);
});
test('un efecto de estado sin clave pide elegir un estado', () => {
  assert.match(validarReglas([regla({efectos:[{tipo:'estado',destino:'yo'}]})]) ?? '', /Elige un estado/);
});
test('una clave antigua con mayúsculas y espacios sigue siendo válida', () => {
  assert.equal(validarReglas([regla({condicion:{tipo:'estado',sujeto:'yo',estado:'Furia '},efectos:[{tipo:'transformar',destino:'yo',clave:'Furia ',cambios:[{atributo:'dano',operacion:'sumar',valor:1}]}]})]), null);
});

const {renombrarEnReglas}=cargarDependencia('registro-estados');
test('renombrar propaga el nombre a los efectos con esa clave sin tocar la clave', () => {
  const reglas=[{id:'a',condicion:{tipo:'estado',sujeto:'yo',estado:'furia'},efectos:[
    {tipo:'transformar',clave:'furia',nombre:'Furia'},
    {tipo:'estado',clave:'veneno',nombre:'Veneno'},
    {tipo:'salvacion',exito:[],fallo:[{tipo:'quitar_estado',clave:'furia'}]},
  ]}];
  const copia=JSON.stringify(reglas);
  const r=renombrarEnReglas(reglas,'furia','Rabia');
  assert.equal(r[0].efectos[0].nombre,'Rabia');
  assert.equal(r[0].efectos[0].clave,'furia');
  assert.equal(r[0].efectos[1].nombre,'Veneno');
  assert.equal(r[0].efectos[2].fallo[0].nombre,'Rabia');
  assert.equal(r[0].condicion.estado,'furia');
  assert.equal(JSON.stringify(reglas),copia);
  const lista=registrarClavesExistentes([],r);
  assert.equal(buscarEstado(lista,'furia').nombre,'Rabia');
});
