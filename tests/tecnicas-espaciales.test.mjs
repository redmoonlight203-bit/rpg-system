import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as motor from '../supabase/functions/equipo-combate/motor.js';
const azul='11111111-1111-4111-8111-111111111111',rojo='22222222-2222-4222-8222-222222222222';
const requisito={habilidades:[azul,rojo],desbloqueo_automatico:true};
const efecto={id:'morado',nombre:'Morado',efecto:'dano',cantidad:6,caras:6,modificador:0,coste_ph:6,coste_fatiga:0,duracion:0,estado:'',tipo_dano:'espacial',naturaleza:'magica',elemento:'ninguno',salvacion:{cd:15,atributo:'salvacion',exito:'mitad'},tablero:{alcance:8,forma:'linea',tamano:8,afecta:'todos',color:'violeta',afecta_lanzador:false}};
function campo(conocidas,ph=12){let c=motor.nuevoCombate();c=motor.agregar(c,{id:'a',forja_id:null,nombre:'A',posicion:{x:1,y:1},stats:{vida:60,ph},configuracion:{tipo_creacion:'personaje',habilidades_conocidas:conocidas,habilidades:[{id:'m',nombre:'Morado',stats:{},requisitos_uso:requisito,efectos:[efecto]}]}},'jugador',()=>20);c=motor.agregar(c,{id:'b',forja_id:null,nombre:'B',posicion:{x:4,y:1},stats:{vida:100,ph:0},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);return motor.iniciar(c,()=>10);}
test('Morado exige conocer Azul y Rojo en el mismo personaje, aunque estén inactivos',()=>{
 assert.equal(motor.validarRequisitos(requisito),null);
 for(const conocidas of [[],[azul],[rojo]])assert.ok(!motor.acciones(campo(conocidas).miembros[0]).some(a=>a.id==='hab:m:morado'));
 assert.ok(motor.acciones(campo([azul,rojo]).miembros[0]).some(a=>a.id==='hab:m:morado'));
 assert.ok(motor.validarRequisitos({habilidades:['nombre-no-id']}));
});
test('el motor autoritativo rechaza Morado sin previas o PH, sin mutar el combate',()=>{
 for(const c of [campo([azul]),campo([azul,rojo],5)]){const antes=JSON.stringify(c);assert.throws(()=>motor.actuar(c,'a','hab:m:morado','b',()=>6,false,{x:4,y:1}));assert.equal(JSON.stringify(c),antes);}
 const c=campo([azul,rojo]),n=motor.actuar(c,'a','hab:m:morado','b',()=>6,false,{x:4,y:1});assert.equal(n.miembros[0].ph,6);assert.equal(n.miembros[0].accion_usada,true);assert.equal(n.miembros[0].vida,60);assert.ok(n.miembros[1].vida<100);
});
