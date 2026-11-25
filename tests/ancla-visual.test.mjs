import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';

const {anclarAlLanzador}=cargarDependencia('ancla-visual',{CSS:{escape:id=>id},getComputedStyle:()=>({translate:'0px -20%'})});
const rect=(left,top,width,height)=>({getBoundingClientRect:()=>({left,top,width,height})});
test('el proyectil nace en el retrato elevado de una ficha 2×2, aunque el tablero esté desplazado',()=>{
 const retrato=rect(140,145,90,90);
 const ficha={querySelector:()=>retrato};
 const tablero={...rect(100,80,500,400),querySelector:s=>s.startsWith('[data-ficha')?ficha:rect(150,180,50,50)};
 const evento={emisor:'a',desde:{x:1,y:2},hasta:{x:8,y:6}};
 const v=anclarAlLanzador(evento,tablero,10,8);
 assert.equal((v.desde.x+.5)*50+100,185);
 assert.equal((v.desde.y+.5)*50+80,190);
 assert.deepEqual(v.hasta,evento.hasta);
 assert.deepEqual(evento.desde,{x:1,y:2});
});
test('el dash usa la casilla inicial y el tamaño del lanzador, incluso con la ficha ya en destino',()=>{
 const ficha={offsetLeft:3,offsetTop:3,offsetWidth:94,offsetHeight:94};
 const tablero={...rect(0,0,500,400),querySelector:s=>s.startsWith('[data-ficha')?ficha:rect(100,150,50,50)};
 const desde={x:2,y:3},hasta={x:6,y:3};
 const v=anclarAlLanzador({emisor:'a',desde,hasta:desde,movimientos:[{id:'a',desde,hasta,tipo:'dash'}]},tablero,10,8);
 assert.equal((v.desde.x+.5)*50,150);
 assert.equal((v.desde.y+.5)*50,181.2);
 assert.equal(v.movimientos[0].desde,v.desde);
 assert.equal(v.hasta,v.desde);
 assert.equal(v.movimientos[0].hasta,hasta);
});
