import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,campoE} from './helpers/campo-estados.mjs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';

// Metralleta de fuego: 3d6, cada dado es un disparo con su propia tirada para impactar (regla «impacto», ARM 10).
const metralleta=ef('metralleta',{cantidad:3,caras:6,rafaga:true,coste_ph:2});
const campo=()=>turnoDe(campoE([
 {id:'a',bando:'jugador',x:1,efectos:[metralleta]},
 {id:'k',bando:'enemigo',x:2,stats:{armadura:10}},
 {id:'j',bando:'enemigo',x:3,stats:{armadura:10}},
],{regla:'impacto'}),'a');
const disparo=(c,objetivo,tiradas)=>m.actuar(c,'a','hab:ha:metralleta',objetivo,dados(tiradas));

test('cada disparo tira para impactar y hace un dado de daño; el coste se paga una vez',()=>{
 let c=disparo(campo(),'k',[15,4]);
 assert.equal(de(c,'k').vida,46,'1.er disparo: d20 15 ≥ ARM 10, 1d6 = 4');
 assert.equal(de(c,'a').ph,18,'2 PH una sola vez');
 assert.deepEqual(de(c,'a').rafaga,{accion:'hab:ha:metralleta',nombre:'H · metralleta',total:3,restantes:2});
 assert.equal(de(c,'a').accion_usada,true);
 c=disparo(c,'j',[1]);
 assert.equal(de(c,'j').vida,50,'2.º disparo a otro enemigo: d20 1 falla');
 assert.equal(de(c,'a').rafaga.restantes,1);
 c=disparo(c,'k',[12,2]);
 assert.equal(de(c,'k').vida,44,'3.er disparo al primero otra vez');
 assert.equal(de(c,'a').ph,18,'los disparos siguientes no cuestan');
 assert.equal(de(c,'a').rafaga,undefined,'la ráfaga termina con el último dado');
 assert.match([...c.registro].reverse().join('\n'),/disparo 1 de 3 contra k[\s\S]*disparo 2 de 3 contra j[\s\S]*disparo 3 de 3 contra k/,'el registro guarda lo último primero');
 assert.throws(()=>disparo(c,'k',[20,6]),/Ya utilizó su acción/);
});

test('durante la ráfaga solo se puede seguir disparando',()=>{
 const c=disparo(campo(),'k',[15,4]);
 assert.throws(()=>m.actuar(c,'a','guardia','a',dados([1])),/Ráfaga en curso/);
 assert.equal(m.accionDisponible(de(c,'a')),true,'aún le quedan disparos');
});

test('los disparos que quedan se pierden al empezar su siguiente turno',()=>{
 const c=disparo(campo(),'k',[15,4]);
 const n=m.siguiente(m.siguiente(m.siguiente(c,()=>1),()=>1),()=>1);
 assert.equal(n.actual,'a');
 assert.equal(de(n,'a').rafaga,undefined);
 assert.equal(de(n,'a').accion_usada,false);
});

test('validación del ataque múltiple en la Forja',()=>{
 const c=cargarDependencia('./creacion',{});
 const base={...c.nuevoEfecto(),nombre:'Metralleta',efecto:'dano',cantidad:3,caras:6,rafaga:true};
 assert.equal(c.validarEfectos([base]),null);
 assert.match(c.validarEfectos([{...base,cantidad:1}]),/entre 2 y 20 dados/);
 assert.match(c.validarEfectos([{...base,efecto:'curacion'}]),/solo es para acciones de daño/);
 assert.match(c.validarEfectos([{...base,tablero:{alcance:3,forma:'circulo',tamano:1,afecta:'enemigos'}}]),/alcance individual/);
});
