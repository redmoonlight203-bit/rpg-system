import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
import {m,ef,campo,dados,de,turnoDe} from './helpers/campo-reacciones.mjs';
const E=cargarDependencia('espejo-mental');
const json=x=>JSON.parse(JSON.stringify(x));
const dims={columnas:10,filas:6};
const vista=()=>({tablero:dims,objetivos:[
 {id:'p',nombre:'Aiko',bando:'jugador',posicion:{x:1,y:2},imagen_url:'a.png'},
 {id:'aliado',nombre:'Bram',bando:'jugador',posicion:{x:2,y:2},imagen_url:'b.png'},
 {id:'malo',nombre:'Goblin',bando:'enemigo',posicion:{x:7,y:3},imagen_url:'g.png'}],
 alcanzables:{'2,1':1,'0,2':1},mapa:{columnas:10,filas:6,celdas:{'3,3':'muro'}},
 evento_visual:{id:'v',desde:{x:1,y:2},hasta:{x:7,y:3},area:[{x:7,y:3}]}});

test('la proyección no altera el estado original',()=>{
 const v=vista(),antes=json(v);
 E.proyectarVista(v,'p',{espejar:true,intercambiar:true,ocultar:true});
 assert.deepEqual(json(v),antes);
});
test('espejar refleja posiciones, casillas, mapa y animaciones',()=>{
 const p=E.proyectarVista(vista(),'p',{espejar:true,intercambiar:false,ocultar:false});
 assert.deepEqual(json(p.objetivos.map(o=>o.posicion)),[{x:8,y:2},{x:7,y:2},{x:2,y:3}]);
 assert.deepEqual(Object.keys(p.alcanzables).sort(),['7,1','9,2']);
 assert.equal(p.mapa.celdas['6,3'],'muro');
 assert.deepEqual(json(p.evento_visual.hasta),{x:2,y:3});
});
test('intercambiar bandos: aliados y enemigos se ven al revés; uno mismo no cambia',()=>{
 const p=E.proyectarVista(vista(),'p',{espejar:false,intercambiar:true,ocultar:false});
 assert.deepEqual(json(p.objetivos.map(o=>o.bando)),['jugador','enemigo','jugador']);
});
test('ocultar nombres y retratos de los demás; los ids siguen siendo los reales',()=>{
 const p=E.proyectarVista(vista(),'p',{espejar:false,intercambiar:false,ocultar:true});
 assert.deepEqual(json(p.objetivos.map(o=>o.nombre)),['Aiko','???','???']);
 assert.deepEqual(json(p.objetivos.map(o=>o.id)),['p','aliado','malo']);
 assert.equal(p.objetivos[1].imagen_url,undefined);
});
test('desproyectar devuelve la casilla real de un clic en la vista reflejada',()=>{
 assert.deepEqual(json(E.desproyectar({x:8,y:2},{espejar:true,intercambiar:false,ocultar:false},dims)),{x:1,y:2});
 assert.deepEqual(json(E.desproyectar({x:8,y:2},{espejar:false,intercambiar:true,ocultar:true},dims)),{x:8,y:2});
});
test('motor: el GM lanza el espejo; el jugador ataca a un aliado disfrazado y el registro muestra al aliado real',()=>{
 const c=campo([{id:'p',bando:'jugador',x:1,stats:{voluntad:0}},{id:'aliado',bando:'jugador',x:2},{id:'malo',bando:'enemigo',x:7}]);
 const n=m.lanzarEspejo(c,'p',{espejar:true,intercambiar:true,ocultar:true,cd:15,atributo:'voluntad'});
 assert.equal(de(n,'p').espejo_mental.intercambiar,true);assert.equal(de(n,'p').espejo_mental.aviso,true);
 const golpe=m.actuar(turnoDe(n,'p'),'p','hab:hp:golpe','aliado',dados([4]));
 assert.equal(de(golpe,'aliado').vida,46);
 assert.ok(golpe.registro.some(l=>/aliado recibe 4/.test(l)),golpe.registro.slice(0,6).join(' | '));
});
test('salvación al inicio de cada turno para cortar el efecto',()=>{
 const c=campo([{id:'malo',bando:'enemigo',x:7},{id:'p',bando:'jugador',x:1,stats:{voluntad:0}}]);
 let n=m.lanzarEspejo(c,'p',{espejar:true,intercambiar:false,ocultar:false,cd:15,atributo:'voluntad'});
 const sigue=m.siguiente(turnoDe(n,'malo'),dados([3]));
 assert.equal(sigue.actual,'p');assert.ok(de(sigue,'p').espejo_mental,'falla: sigue confundido');assert.equal(de(sigue,'p').espejo_mental.aviso,false,'el aviso solo al empezar');
 const corta=m.siguiente(turnoDe(n,'malo'),dados([18]));
 assert.equal(de(corta,'p').espejo_mental,undefined);assert.ok(corta.registro.some(l=>/mente se aclara/.test(l)));
});

test('espejo: refleja la huella completa y los destinos por ancla, pero el área por casilla',()=>{
 const v=vista(),o={espejar:true,intercambiar:false,ocultar:false};
 v.objetivos[0].huella={ancho:3,alto:2};
 v.alcanzables={'2,1':1};
 v.evento_visual.movimientos=[{id:'p',desde:{x:1,y:2},hasta:{x:2,y:1}}];
 const p=E.proyectarVista(v,'p',o);
 assert.deepEqual(json(p.objetivos[0].posicion),{x:6,y:2});
 assert.deepEqual(json(p.alcanzables),{'5,1':1});
 assert.deepEqual(json(p.evento_visual.movimientos[0].hasta),{x:5,y:1});
 assert.deepEqual(json(p.evento_visual.area),[{x:2,y:3}]);
 assert.deepEqual(json(E.desproyectar({x:5,y:1},o,dims,3)),{x:2,y:1});
});
