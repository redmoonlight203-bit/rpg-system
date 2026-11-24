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
