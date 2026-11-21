import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const c=cargarDependencia('cartas');

test('cada tipo de creación tiene un marco que existe en public/arte/marcos',()=>{
 for(const tipo of ['personaje','habilidad','pasiva','objeto','titulo','otro']){
  const ruta=c.marcoDe(tipo);assert.ok(existsSync(new URL('../public'+ruta,import.meta.url)),ruta);
 }
 assert.equal(c.marcoDe('personaje',true),'/arte/marcos/monstruo.webp');
 assert.equal(c.marcoDe('desconocido'),c.MARCOS.otro);
});

test('el rango decide el color de la carta (F–KUROI); lo desconocido es D',()=>{
 assert.deepEqual({...c.rangoDe('S')},{clave:'S',nombre:'Oro',css:'cg-rango-s'});
 assert.equal(c.rangoDe('kuroi').css,'cg-rango-kuroi');
 assert.equal(c.rangoDe(' a ').clave,'A');
 assert.equal(c.rangoDe('').clave,'D');
 assert.equal(c.rangoDe('X').clave,'D');
 assert.equal(Object.keys(c.RANGOS).length,8);
});
