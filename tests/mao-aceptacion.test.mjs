// Partida de prueba de Mao (plan «Yunque · una más», paso 3.6). Mao es el borrador que el Yunque produjo
// (scripts/comprobar-mao.mjs → tests/fixtures/mao.json); aquí no se añade lógica, solo se juega con él.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
import {m,campo,dados,de,turnoDe} from './helpers/campo-reacciones.mjs';
const A=cargarDependencia('artefactos');
const mao=JSON.parse(readFileSync(new URL('./fixtures/mao.json',import.meta.url),'utf8')).configuracion_artefacto;
const hacha={nombre:'Hacha del norte',stats:{filo:3,peso:2,durabilidad:5},habilidades:[{id:'h1',nombre:'Tajo'},{id:'h2',nombre:'Rugido'}],pasivas:[{id:'p1',nombre:'Sed de sangre'}]};

test('Mao creado en el Yunque es válido',()=>{assert.equal(A.validarArtefacto(mao),null);assert.equal(mao.niveles.length,2);});
test('dos portadores con formas distintas (la tabla de Mao nombra la forma)',()=>{
 // La base reparte tiradas sin repetir (tests/portadores-artefacto-database.mjs); aquí, lo que ve la mesa.
 assert.equal(A.formaDe(mao,1),'Colmillo de obsidiana');assert.equal(A.formaDe(mao,2),'Hoja de cien ojos');
 assert.notEqual(A.formaDe(mao,1),A.formaDe(mao,2));
});
test('los seis tramos al devorar armas y la subida de nivel',()=>{
 let p={nivel:1,absorbidas:[]};
 const tramos=[];
 for(const t of [12,40,50,70,80,99]){let i=0;p=A.devorar(mao,p,hacha,c=>i++===0?t:1);tramos.push(p.absorbidas.at(-1).tramo);}
 assert.equal(new Set(tramos).size,6,tramos.join(' | '));
 assert.equal(p.nivel,2,'cuatro armas devoradas despiertan a Mao saciado');
});
test('una voz que falla: el GM asigna la voz y el jugador responde',()=>{
 const c=campo([{id:'p',bando:'jugador',x:1,stats:{voluntad:0}},{id:'e',bando:'enemigo',x:2}]);
 const tomado=m.tomarArtefacto(c,'p',mao.voces,dados([2]));
 assert.equal(de(tomado,'p').voz_artefacto.estado,'pendiente');
 const voz=mao.voces.voces.find(v=>v.tipo==='pregunta');
 const r=m.responderVoz(m.asignarVoz(tomado,'p',voz.id),'p',voz.opciones[0]);
 assert.equal(de(r,'p').voz_artefacto.respuesta,voz.opciones[0]);
});
test('espejo mental: el portador ataca a un aliado disfrazado y el registro lo muestra',()=>{
 const c=campo([{id:'p',bando:'jugador',x:1},{id:'aliado',bando:'jugador',x:2},{id:'e',bando:'enemigo',x:6}]);
 const confundido=m.lanzarEspejo(c,'p',{espejar:true,intercambiar:true,ocultar:true,cd:15,atributo:'voluntad'});
 const vista=m.proyectarVista({tablero:m.dimensionesTablero(confundido),objetivos:confundido.miembros.map(x=>({id:x.id,nombre:x.nombre,bando:x.bando,posicion:m.posicionesTablero(confundido)[x.id]}))},'p',de(confundido,'p').espejo_mental);
 const disfrazado=vista.objetivos.find(o=>o.id==='aliado');
 assert.equal(disfrazado.bando,'enemigo');assert.equal(disfrazado.nombre,'???');
 const n=m.actuar(turnoDe(confundido,'p'),'p','hab:hp:golpe',disfrazado.id,dados([5]));
 assert.ok(n.registro.some(l=>/^aliado recibe 5/.test(l)),n.registro.slice(0,5).join(' | '));
});
