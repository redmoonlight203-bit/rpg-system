import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as motor from '../supabase/functions/equipo-combate/motor.js';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
// Primitiva «Reacción» con mecánicas inventadas (no de Kion): prueba que el Yunque la generaliza.
const golpe={id:'golpe',nombre:'Golpe',efecto:'dano',cantidad:2,caras:8,modificador:0,coste_ph:0};
const hechizo={id:'hechizo',nombre:'Hechizo',efecto:'dano',cantidad:2,caras:8,modificador:0,coste_ph:0,naturaleza:'magica'};
function lance(reacciones,{ataque=golpe,ph=20,salva=10,dado=6,forma}={}){
 const atacante={id:'a',nombre:'Atacante',stats:{vida:40,ph:0,armadura:0,salvacion:0},posicion:{x:1,y:1},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'Ataques',stats:{},efectos:[golpe,hechizo]}]}};
 const defensor={id:'d',nombre:'Defensor',stats:{vida:50,ph:20,armadura:0,salvacion:0},posicion:{x:2,y:1},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'r',nombre:'Reacciones',stats:{},efectos:reacciones.map((reaccion,i)=>({id:'r'+i,nombre:'Reacción '+i,efecto:'dano',cantidad:1,caras:4,modificador:0,coste_ph:reaccion.coste??1,reaccion:reaccion.r}))}]}};
 let c=motor.iniciar(motor.agregar(motor.agregar(motor.nuevoCombate(),atacante,'enemigo',()=>20),defensor,'jugador',()=>1));c.regla='directo';
 const d0=c.miembros.find(m=>m.id==='d');d0.ph=ph;if(forma)d0.transformacion={definicion_id:forma};
 const n=motor.actuar(c,'a','hab:h:'+ataque.id,'d',caras=>caras===20?salva:dado);
 return {d:n.miembros.find(m=>m.id==='d'),a:n.miembros.find(m=>m.id==='a')};
}
test('Escudo de espinas: reduce una cantidad fija y devuelve lo detenido al atacante',()=>{
 const {d,a}=lance([{r:{principal:{reducir:{modo:'fijo',valor:3},devolver:{},animacion:'espinas'}}}]);
 assert.equal(d.vida,50-12+3);assert.equal(a.vida,40-3);assert.equal(d.ph,19);assert.equal(d.ultima_defensa.animacion,'espinas');
});
test('Piel de piedra solo para golpes físicos; un hechizo la atraviesa',()=>{
 const piel={r:{naturaleza:'fisica',principal:{reducir:{modo:'fijo',valor:5}}}};
 assert.equal(lance([piel]).d.vida,50-12+5);
 assert.equal(lance([piel],{ataque:hechizo}).d.vida,50-12);
});
test('Cáliz: guarda la mitad de lo detenido en una reserva con tope, y solo si supera la salvación',()=>{
 const caliz={r:{principal:{salvacion:{cd:12,atributo:'salvacion'},reducir:{modo:'mitad'},reservar:{recurso:'Sangre guardada',proporcion:0.5,maximo:4}}}};
 const exito=lance([caliz],{salva:15});assert.equal(exito.d.vida,50-6);assert.equal(exito.d.recursos_especiales['Sangre guardada'],3);
 const fallo=lance([caliz],{salva:5});assert.equal(fallo.d.vida,50-12);assert.equal(fallo.d.recursos_especiales?.['Sangre guardada']??0,0);
});
test('Principal con seguimiento: la segunda reacción usa lo que detuvo la primera',()=>{
 const {d,a}=lance([{r:{prioridad:5,principal:{reducir:{modo:'mitad'},permite_seguimiento:true}}},{r:{seguimiento:{devolver:{maximo:2}}}}]);
 assert.equal(d.vida,50-6);assert.equal(a.vida,40-2);assert.equal(d.ph,18,'paga principal y seguimiento');
});
test('Sin PH la reacción no se activa; una forma concreta puede exigirse',()=>{
 const r={r:{principal:{reducir:{modo:'fijo',valor:5}}},coste:5};
 assert.equal(lance([r],{ph:2}).d.vida,50-12);
 const enForma={r:{forma:'furia',principal:{reducir:{modo:'fijo',valor:5}}}};
 assert.equal(lance([enForma]).d.vida,50-12);assert.equal(lance([enForma],{forma:'furia'}).d.vida,50-7);
});
test('validarReaccion acepta reacciones completas y explica las mal configuradas',()=>{
 const {validarReaccion}=cargarDependencia('creacion');
 assert.equal(validarReaccion({principal:{reducir:{modo:'mitad'},reservar:{recurso:'Energía',proporcion:0.5,maximo:10}}}),null);
 assert.equal(validarReaccion({seguimiento:{devolver:{maximo:6}}}),null);
 assert.match(validarReaccion({}),/principal o un seguimiento/);
 assert.match(validarReaccion({principal:{reducir:{modo:'fijo'}}}),/Reducción fija/);
 assert.match(validarReaccion({principal:{reducir:{modo:'mitad'},reservar:{recurso:'',proporcion:1,maximo:1}}}),/recurso/);
 assert.match(validarReaccion({naturaleza:'sagrada',principal:{reducir:{modo:'mitad'}}}),/mágicos o físicos/);
});
