import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';

const {tipoAnimacionArma,geometriaAtaque}=cargarDependencia('./animaciones-armas');

test('el arco dispara desde su origen aunque el arma tenga una descripción extensa',()=>{
  assert.equal(tipoAnimacionArma({accionId:'ataque',nombreAccion:'Atacar con Arco largo de roble'}),'arco');
  assert.equal(tipoAnimacionArma({accionId:'ataque',nombreAccion:'Atacar con Ballesta'}),'arco');
});
test('espadas tradicionales y armas legendarias usan un barrido',()=>{
  assert.equal(tipoAnimacionArma({accionId:'ataque',nombreAccion:'Atacar con Espada de acero'}),'espada');
  assert.equal(tipoAnimacionArma({accionId:'ataque',nombreAccion:'Atacar con Mao',nombreArma:'Mao'}),'espada');
  assert.equal(tipoAnimacionArma({accionId:'ataque',nombreAccion:'Atacar con Katana'}),'espada');
});
test('golpes desarmados y una mano libre se reconocen sin confundir magia con flechas',()=>{
  assert.equal(tipoAnimacionArma({accionId:'ataque',nombreAccion:'Ataque desarmado'}),'punos');
  assert.equal(tipoAnimacionArma({accionId:'desarmado',nombreAccion:'Ataque desarmado · mano libre'}),'punos');
  assert.equal(tipoAnimacionArma({accionId:'hab:magia',nombreAccion:'Disparo de hielo',naturaleza:'magica',costePh:4}),undefined);
});
test('la dirección cubre los cuatro lados y diagonales, con velocidad acotada',()=>{
  assert.equal(geometriaAtaque({x:0,y:0},{x:3,y:0}).angulo,0);
  assert.equal(geometriaAtaque({x:3,y:0},{x:0,y:0}).angulo,180);
  assert.equal(geometriaAtaque({x:0,y:0},{x:0,y:3}).angulo,90);
  assert.equal(geometriaAtaque({x:0,y:0},{x:3,y:3}).angulo,45);
  assert.ok(geometriaAtaque({x:0,y:0},{x:0,y:25}).duracionFlecha<=950);
});
