import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {rutaVisual,intensidadHerida}=cargarDependencia('movimiento-visual');
test('ruta visual ortogonal evita muros y fichas y termina en el destino confirmado',()=>{
 const desde={x:0,y:1},hasta={x:4,y:1},mapa={celdas:{'2,1':'muro'}};
 const ruta=rutaVisual(desde,hasta,5,4,[{x:1,y:1}],mapa);
 assert.deepEqual(ruta[0],desde);assert.deepEqual(ruta.at(-1),hasta);
 for(let i=1;i<ruta.length;i++){assert.equal(Math.abs(ruta[i].x-ruta[i-1].x)+Math.abs(ruta[i].y-ruta[i-1].y),1);assert.ok(!(ruta[i].x===2&&ruta[i].y===1));assert.ok(!(ruta[i].x===1&&ruta[i].y===1));}
});
test('ruta prefiere menor coste de terreno y no inventa rutas imposibles',()=>{
 const ruta=rutaVisual({x:0,y:0},{x:4,y:0},5,2,[],{celdas:{'1,0':'dificil','2,0':'dificil','3,0':'dificil'}});
 assert.ok(ruta.some(p=>p.y===1));assert.equal(rutaVisual({x:0,y:0},{x:2,y:0},3,1,[],{celdas:{'1,0':'muro'}}).length,0);
});
test('borde de peligro aumenta al perder vida y desaparece al recuperar la mitad',()=>{
 assert.equal(intensidadHerida(100,100),0);assert.equal(intensidadHerida(50,100),0);assert.equal(intensidadHerida(25,100),.5);assert.equal(intensidadHerida(0,100),1);assert.equal(intensidadHerida(1,0),0);
});
