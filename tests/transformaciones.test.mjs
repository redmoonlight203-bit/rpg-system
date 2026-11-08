import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../supabase/functions/equipo-combate/motor.js';
const ataque={id:'garra',nombre:'Garra',efecto:'dano',cantidad:0,caras:6,modificador:5,tipo_dano:'fisico',estado:'',duracion:0,coste_ph:0};
const forma=(tipo='forma',duracion=0)=>({...ataque,id:'forma',nombre:'Transformarse',efecto:'transformacion',coste_ph:2,coste_fatiga:1,duracion,transformacion:{id:'bestia',nombre:'Bestia',tipo,etapas:[{id:'uno',nombre:'Manto',stats:{vida:10,ph:10,fatiga:10,dano:3},habilidades:['garra']},{id:'dos',nombre:'Completa',stats:{vida:20,ph:10,fatiga:10,dano:6},habilidades:[]}]}});
function campo(tipo='forma',duracion=0){let b=c.nuevoCombate();b=c.agregar(b,{id:'a',posicion:{x:1,y:1},nombre:'A',forja_id:null,stats:{vida:30,ph:10,fatiga:10},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'Bestia',stats:{},efectos:[forma(tipo,duracion),ataque]}]}},'jugador',()=>20);b=c.agregar(b,{id:'b',posicion:{x:2,y:1},nombre:'B',forja_id:null,stats:{vida:40,ph:0,dano:50},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);b=c.iniciar(b,()=>10);b.regla='directo';b.miembros[0].vida=17;return b;}
const actor=b=>b.miembros[0];
const activar=b=>c.actuar(b,'a','hab:h:forma','a',()=>20);
const vuelta=b=>c.siguiente(c.siguiente(b,()=>20),()=>20);
test('forma usa HP separados, paga una vez y las etapas no curan ni repiten coste',()=>{
 let b=campo();assert.ok(!c.acciones(actor(b)).some(x=>x.efecto.id==='garra'));b=activar(b);assert.equal(actor(b).vida,10);assert.equal(actor(b).ph,8);assert.equal(actor(b).fatiga,1);assert.equal(actor(b).accion_usada,true);assert.ok(c.acciones(actor(b)).some(x=>x.efecto.id==='garra'));
 actor(b).vida=4;b=vuelta(b);const antes=actor(b).ph;b=activar(b);assert.equal(actor(b).vida,4);assert.equal(actor(b).ph,antes);assert.equal(actor(b).transformaciones_usadas.length,1);assert.ok(!c.acciones(actor(b)).some(x=>x.efecto.id==='garra'));
 b=vuelta(b);b=c.actuar(b,'a','volver_forma','a');assert.equal(actor(b).vida,17);assert.equal(c.maxVida(actor(b)),30);b=vuelta(b);assert.throws(()=>activar(b),/utilizada/);
});
test('romper la forma vuelve al cuerpo sin morir y poder sí puede morir',()=>{
 for(const tipo of ['forma','poder']){let b=activar(campo(tipo));assert.equal(actor(b).vida,tipo==='forma'?10:17);b=c.siguiente(b,()=>20);b=c.actuar(b,'b','ataque','a',()=>20);assert.equal(actor(b).vida,tipo==='forma'?17:0);if(tipo==='forma')assert.equal(actor(b).transformacion,null);}
});
test('duración respeta turnos completos posteriores a activación',()=>{
 let b=activar(campo('forma',1));b=c.siguiente(b,()=>20);assert.ok(actor(b).transformacion);b=c.siguiente(b,()=>20);assert.ok(actor(b).transformacion);b=c.siguiente(b,()=>20);assert.equal(actor(b).transformacion,null);assert.equal(actor(b).vida,17);
});
test('poder no recorta vida real al cambiar etapa o salir; finalizar restaura la ficha',()=>{
 let b=activar(campo('poder'));assert.equal(c.maxVida(actor(b)),30);assert.equal(actor(b).vida,17);b=vuelta(b);b=activar(b);assert.equal(actor(b).vida,17);b=c.finalizar(b);assert.equal(actor(b).vida,17);assert.equal(actor(b).stats.vida,30);assert.equal(actor(b).transformacion,null);assert.equal(actor(b).transformaciones_usadas.length,0);
});
test('transformación con Fatiga insuficiente no altera el encuentro',()=>{
 const b=campo();actor(b).fatiga=10;const antes=JSON.stringify(b);assert.throws(()=>activar(b),/Fatiga/);assert.equal(JSON.stringify(b),antes);
});

test('las imágenes se activan por etapa y la original no se reemplaza',()=>{
 const normal='https://ejemplo.com/original.webp',primera='https://ejemplo.com/uno.webp',segunda='https://ejemplo.com/dos.webp';
 let b=campo('poder');actor(b).configuracion.imagen_url=normal;
 const habilidad=actor(b).configuracion.habilidades[0].efectos.find(e=>e.efecto==='transformacion');
 habilidad.transformacion.etapas[0].imagen_url=primera;
 habilidad.transformacion.etapas[1].imagen_url=segunda;
 b=activar(b);assert.equal(actor(b).transformacion.imagen_etapa,primera);
 assert.equal(actor(b).configuracion.imagen_url,normal);
 b=vuelta(b);b=activar(b);
 assert.equal(actor(b).transformacion.imagen_etapa,segunda);
 assert.equal(actor(b).configuracion.imagen_url,normal);
 b=vuelta(b);b=c.actuar(b,'a','volver_forma','a');
 assert.equal(actor(b).transformacion,null);
 assert.equal(actor(b).configuracion.imagen_url,normal);
});
