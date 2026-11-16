import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {imagenDeRaza}=cargarDependencia('estadisticas');
const cats=[{id:'r',clave:'razas',nombre:'Razas',parent_id:null,imagen_url:'/arte/razas/raiz.webp'},
 {id:'h',clave:'personajes',nombre:'Humanos',parent_id:'r',imagen_url:'/arte/razas/humanos.webp'},
 {id:'k',clave:'kuro',nombre:'Kuro',parent_id:'h',imagen_url:null},
 {id:'e',clave:'elfos',nombre:'Elfos',parent_id:'r',imagen_url:'/arte/razas/elfos.webp'},
 {id:'s',clave:'silvanos',nombre:'Silvanos',parent_id:'e',imagen_url:'/arte/razas/silvanos.webp'},
 {id:'d',clave:'dragones',nombre:'Dragones',parent_id:'r',imagen_url:null}];
test('la imagen de raza es la propia o la del ancestro más cercano, nunca la de la raíz',()=>{
 assert.equal(imagenDeRaza(cats,'personajes'),'/arte/razas/humanos.webp');
 assert.equal(imagenDeRaza(cats,'kuro'),'/arte/razas/humanos.webp','Kuro hereda de Humanos');
 assert.equal(imagenDeRaza(cats,'silvanos'),'/arte/razas/silvanos.webp','la propia gana a la heredada');
 assert.equal(imagenDeRaza(cats,'dragones'),undefined,'sin imagen y sin heredarla de la raíz: silueta');
 assert.equal(imagenDeRaza(cats,'inexistente'),undefined);
 assert.equal(imagenDeRaza(cats,null),undefined);
});
