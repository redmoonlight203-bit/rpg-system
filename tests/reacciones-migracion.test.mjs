import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
import * as motor from '../supabase/functions/equipo-combate/motor.js';
const {normalizarReaccion,PLANTILLAS_REACCION}=cargarDependencia('reacciones');
const {reaccionDe}=cargarDependencia('combate');
const json=x=>JSON.parse(JSON.stringify(x));
const antigua={id:'def',nombre:'Absorción',efecto:'dano',cantidad:0,caras:4,modificador:0,coste_ph:2,defensa:'absorcion'};

test('normalizarReaccion convierte defensa en reaccion con la plantilla, sin tocar el original',()=>{
 const copia=json(antigua);
 const n=normalizarReaccion(antigua);
 assert.deepEqual(json(n.reaccion),json(PLANTILLAS_REACCION.absorcion));
 assert.equal('defensa' in n,false);
 assert.deepEqual(json(antigua),copia,'el efecto cargado no se reescribe');
 n.reaccion.principal.reducir.valor=99;
 assert.equal(PLANTILLAS_REACCION.absorcion.principal.reducir.valor,6,'la plantilla no se comparte por referencia');
});
test('una reacción propia gana a la defensa; sin defensa o con clave desconocida no cambia',()=>{
 const propia={...antigua,reaccion:{principal:{reducir:{modo:'todo'}}}};
 assert.deepEqual(json(normalizarReaccion(propia).reaccion),{principal:{reducir:{modo:'todo'}}});
 const sin={id:'x',nombre:'x',efecto:'dano'};assert.equal(normalizarReaccion(sin),sin);
 const rara={...antigua,defensa:'inventada'};assert.equal(normalizarReaccion(rara).reaccion,undefined);
});
test('reaccionDe solo lee reaccion',()=>{
 assert.equal(reaccionDe(antigua),undefined);
 assert.deepEqual(json(reaccionDe(normalizarReaccion(antigua))),json(PLANTILLAS_REACCION.absorcion));
});
test('un combate en curso con defensa reacciona igual y no se reescribe',()=>{
 const atacante={id:'a',nombre:'A',stats:{vida:40,ph:0,armadura:0},posicion:{x:1,y:1},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'h',stats:{},efectos:[{id:'rayo',nombre:'Rayo',efecto:'dano',cantidad:2,caras:8,modificador:0,coste_ph:0,naturaleza:'magica'}]}]}};
 const k={id:'k',nombre:'K',stats:{vida:60,ph:10,armadura:0},posicion:{x:2,y:1},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'d',nombre:'d',stats:{},efectos:[antigua]}]}};
 let c=motor.iniciar(motor.agregar(motor.agregar(motor.nuevoCombate(),atacante,'enemigo',()=>20),k,'jugador',()=>1));c.regla='directo';
 // Simula un combate guardado antes de la migración: la configuración guarda `defensa`.
 const guardado=json(c);guardado.miembros.find(m=>m.id==='k').configuracion.habilidades[0].efectos=[json(antigua)];
 const n=motor.actuar(guardado,'a','hab:h:rayo','k',()=>6);
 const kn=n.miembros.find(m=>m.id==='k');
 assert.equal(kn.vida,60-(12-6),'absorción detiene 6');
 assert.equal(kn.recursos_especiales['Energía absorbida'],3);
 assert.equal(kn.configuracion.habilidades[0].efectos[0].defensa,'absorcion','el estado sigue tal cual');
 assert.equal(kn.configuracion.habilidades[0].efectos[0].reaccion,undefined);
});
