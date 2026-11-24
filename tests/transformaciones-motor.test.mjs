import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../supabase/functions/equipo-combate/motor.js';

const ataque=(id,nombre,extra={})=>({id,nombre,efecto:'dano',cantidad:1,caras:6,modificador:2,
 tipo_dano:'fisico',estado:'',duracion:0,coste_ph:0,coste_fatiga:0,...extra});
// Un dragón que cambia libremente entre su cuerpo humano (realidad) y dos formas.
const dragon={id:'dragon',nombre:'Sangre de dragón',tipo:'poder',
 etapas:[
  {id:'dragon',nombre:'Dragón',stats:{armadura:15,fuerza:9},habilidades:['aliento']},
  {id:'bestia',nombre:'Bestia',stats:{armadura:10,velocidad:4}},
 ],
 transiciones:[
  {id:'t1',desde:'_realidad',hasta:'dragon',sentido:'ambos'},
  {id:'t2',desde:'dragon',hasta:'bestia',sentido:'ambos',coste:{ph:2}},
 ]};
const cambiar={...ataque('cambiar','Cambiar de forma'),efecto:'transformacion',cantidad:0,modificador:0,transformacion:dragon};
const aliento=ataque('aliento','Aliento de fuego');
function campo(){
 let b=c.nuevoCombate();
 b=c.agregar(b,{id:'a',nombre:'Vyr',forja_id:null,posicion:{x:1,y:1},
  stats:{vida:30,ph:8,fatiga:10,armadura:6,movimiento:6},
  configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'Sangre',stats:{},efectos:[cambiar,aliento]}]}},'jugador',()=>20);
 b=c.agregar(b,{id:'e',nombre:'Enemigo',forja_id:null,posicion:{x:8,y:6},stats:{vida:25,ph:0,fatiga:3},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);
 b.regla='directo';
 return c.iniciar(b,()=>1);
}
const actor=b=>b.miembros.find(m=>m.id==='a');
const ids=b=>c.acciones(actor(b)).map(a=>a.id);
const turno=b=>c.siguiente(c.siguiente(b,()=>20),()=>20);

test('humano → dragón → humano: el ataque de dragón solo existe en dragón', () => {
 let b=campo();
 assert.ok(!ids(b).includes('hab:h:aliento'));
 assert.ok(ids(b).includes('hab:h:cambiar>dragon'));
 b=c.actuar(b,'a','hab:h:cambiar>dragon','a',()=>20);
 assert.equal(actor(b).transformacion.etapa_id,'dragon');
 assert.equal(c.estadisticas(actor(b)).fuerza,9);
 assert.ok(ids(b).includes('hab:h:aliento'));
 b=turno(b);
 b=c.actuar(b,'a','volver_forma','a',()=>20);
 assert.equal(actor(b).transformacion,null);
 assert.ok(!ids(b).includes('hab:h:aliento'));
 assert.equal(c.estadisticas(actor(b)).fuerza??0,0);
});

test('cambio libre: no quedan estadísticas ni poderes de la forma anterior', () => {
 let b=campo();
 b=c.actuar(b,'a','hab:h:cambiar>dragon','a',()=>20);
 b=turno(b);
 b=c.actuar(b,'a','hab:h:cambiar>bestia','a',()=>20);
 const s=c.estadisticas(actor(b));
 assert.equal(actor(b).transformacion.etapa_id,'bestia');
 assert.equal(s.velocidad,4);
 assert.equal(s.fuerza??0,0);
 assert.equal(s.armadura,10);
 assert.ok(!ids(b).includes('hab:h:aliento'));
 assert.equal(actor(b).ph,6,'la transición dragón↔bestia cuesta 2 PH');
 b=turno(b);
 b=c.actuar(b,'a','hab:h:cambiar>dragon','a',()=>20);
 assert.equal(actor(b).transformacion.etapa_id,'dragon');
 assert.ok(ids(b).includes('hab:h:aliento'));
});

test('volver a la realidad desde una forma sin transición directa', () => {
 let b=campo();
 b=c.actuar(b,'a','hab:h:cambiar>dragon','a',()=>20);
 b=turno(b);
 b=c.actuar(b,'a','hab:h:cambiar>bestia','a',()=>20);
 b=turno(b);
 assert.ok(ids(b).includes('volver_forma'));
 b=c.actuar(b,'a','volver_forma','a',()=>20);
 assert.equal(actor(b).transformacion,null);
});

test('el cambio libre se puede repetir en el mismo encuentro', () => {
 let b=campo();
 b=c.actuar(b,'a','hab:h:cambiar>dragon','a',()=>20);
 b=turno(b); b=c.actuar(b,'a','volver_forma','a',()=>20);
 b=turno(b);
 const otra=c.acciones(actor(b)).find(a=>a.id==='hab:h:cambiar>dragon');
 assert.equal(otra.bloqueada,undefined);
 b=c.actuar(b,'a','hab:h:cambiar>dragon','a',()=>20);
 assert.equal(actor(b).transformacion.etapa_id,'dragon');
});

test('una cadena en un solo sentido no se salta pasos y no se repite', () => {
 const cadena={...dragon,id:'cadena',transiciones:[
  {id:'a',desde:'_realidad',hasta:'dragon',sentido:'uno'},{id:'b',desde:'dragon',hasta:'bestia',sentido:'uno'}]};
 let b=c.nuevoCombate();
 b=c.agregar(b,{id:'a',nombre:'Vyr',forja_id:null,posicion:{x:1,y:1},stats:{vida:30,ph:8,fatiga:10},
  configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'S',stats:{},efectos:[{...cambiar,transformacion:cadena},aliento]}]}},'jugador',()=>20);
 b=c.agregar(b,{id:'e',nombre:'E',forja_id:null,posicion:{x:8,y:6},stats:{vida:25,ph:0,fatiga:3},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);
 b.regla='directo'; b=c.iniciar(b,()=>1);
 assert.ok(!ids(b).includes('hab:h:cambiar>bestia'));
 b=c.actuar(b,'a','hab:h:cambiar>dragon','a',()=>20);
 b=turno(b);
 assert.ok(!ids(b).includes('hab:h:cambiar>_realidad'));
 b=c.actuar(b,'a','hab:h:cambiar>bestia','a',()=>20);
 b=turno(b);
 b=c.actuar(b,'a','volver_forma','a',()=>20);
 b=turno(b);
 assert.match(c.acciones(actor(b)).find(a=>a.id==='hab:h:cambiar>dragon').bloqueada||'',/utilizada/);
});

// Caso de control: Orin igual que tests/movimiento-posesion.test.mjs:58-69.
test('Orin: «Liberar el sello» sigue dando gigante y descontrolada', () => {
 const definicion={id:'gorveth',nombre:'Gor’Veth',tipo:'poder',posesion:{umbral_pct:50,cd:12,etapa_id:'gigante'},
  etapas:[{id:'primera',nombre:'Manifestación parcial',stats:{armadura:8}},{id:'segunda',nombre:'Fusión',stats:{armadura:12}},
   {id:'gigante',nombre:'Rana gigante',stats:{armadura:15},descontrolada:true,vida_maxima_posesion:40,curacion_entrada:20,habilidades:['mordida']}]};
 const transformar={...ataque('transformar','Liberar el sello'),efecto:'transformacion',cantidad:0,modificador:0,transformacion:definicion};
 let b=c.nuevoCombate();
 b=c.agregar(b,{id:'a',nombre:'Orin',forja_id:null,vida_actual:8,posicion:{x:1,y:1},stats:{vida:26,ph:8,fatiga:10,armadura:6,movimiento:6},
  configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'Despertar',stats:{},efectos:[transformar,ataque('mordida','Mandíbula colosal')]}]}},'jugador',()=>20);
 b=c.agregar(b,{id:'e',nombre:'Enemigo',forja_id:null,posicion:{x:4,y:1},stats:{vida:25,ph:0,fatiga:3},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);
 b.regla='directo'; b=c.iniciar(b,()=>1);
 const o=actor(b);
 assert.equal(o.transformacion?.etapa_id,'gigante');
 assert.equal(o.transformacion?.descontrolada,true);
 assert.throws(()=>c.actuar(b,'a','volver_forma','a',()=>20),/fuera de control/i);
 // Sin transiciones guardadas, el menú es el de siempre: «Liberar el sello» con id sin destino.
 let l=c.nuevoCombate();
 l=c.agregar(l,{id:'a',nombre:'Orin',forja_id:null,posicion:{x:1,y:1},stats:{vida:26,ph:8,fatiga:10},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'Despertar',stats:{},efectos:[transformar]}]}},'jugador',()=>20);
 l=c.agregar(l,{id:'e',nombre:'E',forja_id:null,posicion:{x:8,y:6},stats:{vida:25,ph:0,fatiga:3},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);
 l.regla='directo'; l=c.iniciar(l,()=>20);
 assert.ok(ids(l).includes('hab:h:transformar'));
 assert.ok(!ids(l).some(id=>id.includes('>')));
});

test('el GM puede devolver a la realidad una forma que toma el control', () => {
 const definicion={id:'gorveth',nombre:'G',tipo:'poder',posesion:{umbral_pct:50,cd:12,etapa_id:'gigante'},
  etapas:[{id:'gigante',nombre:'Rana gigante',stats:{armadura:15},descontrolada:true,vida_maxima_posesion:40}]};
 const t={...ataque('t','Liberar'),efecto:'transformacion',cantidad:0,modificador:0,transformacion:definicion};
 let b=c.nuevoCombate();
 b=c.agregar(b,{id:'a',nombre:'Orin',forja_id:null,vida_actual:8,posicion:{x:1,y:1},stats:{vida:26,ph:8,fatiga:10,armadura:6},
  configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'D',stats:{},efectos:[t]}]}},'jugador',()=>20);
 b=c.agregar(b,{id:'e',nombre:'E',forja_id:null,posicion:{x:4,y:1},stats:{vida:25,ph:0,fatiga:3},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);
 b.regla='directo'; b=c.iniciar(b,()=>1);
 assert.equal(actor(b).transformacion?.descontrolada,true);
 b=c.volverALaRealidadGM(b,'a');
 assert.equal(actor(b).transformacion,null);
 assert.equal(c.estadisticas(actor(b)).armadura,6);
});

// Revisión final · I1: la vida de cada forma se conserva durante el encuentro.
function campoForma(extra={}){
 const def={id:'sangre',nombre:'Sangre',tipo:'forma',etapas:[{id:'dragon',nombre:'Dragón',stats:{vida:100}},{id:'humano',nombre:'Humano',stats:{vida:20}}],
  transiciones:[{id:'a',desde:'_realidad',hasta:'dragon',sentido:'ambos'},{id:'b',desde:'dragon',hasta:'humano',sentido:'ambos'}]};
 const t={...cambiar,coste_ph:3,transformacion:def,...extra};
 let b=c.nuevoCombate();
 b=c.agregar(b,{id:'a',nombre:'Vyr',forja_id:null,posicion:{x:1,y:1},stats:{vida:30,ph:20,fatiga:10},
  configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'S',stats:extra.enfriamiento?{enfriamiento:extra.enfriamiento}:{},efectos:[t]}]}},'jugador',()=>20);
 b=c.agregar(b,{id:'e',nombre:'E',forja_id:null,posicion:{x:8,y:6},stats:{vida:25,ph:0,fatiga:3},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);
 b.regla='directo'; return c.iniciar(b,()=>1);
}
test('cambiar de forma y volver conserva la vida que le quedaba a cada forma', () => {
 let b=campoForma();
 b=c.actuar(b,'a','hab:h:cambiar>dragon','a',()=>20);
 assert.equal(actor(b).vida,100);
 actor(b).vida=40;
 b=turno(b); b=c.actuar(b,'a','hab:h:cambiar>humano','a',()=>20);
 assert.equal(actor(b).vida,20);
 b=turno(b); b=c.actuar(b,'a','hab:h:cambiar>dragon','a',()=>20);
 assert.equal(actor(b).vida,40,'el dragón vuelve con la vida que tenía');
 b=turno(b); b=c.actuar(b,'a','volver_forma','a',()=>20);
 assert.equal(actor(b).vida,30);
 b=turno(b); b=c.actuar(b,'a','hab:h:cambiar>dragon','a',()=>20);
 assert.equal(actor(b).vida,40,'salir a la realidad no rellena la forma');
});
test('una forma rota no se puede volver a usar en el encuentro', () => {
 const def={id:'sangre',nombre:'Sangre',tipo:'forma',etapas:[{id:'dragon',nombre:'Dragón',stats:{vida:100}}],
  transiciones:[{id:'a',desde:'_realidad',hasta:'dragon',sentido:'ambos'}]};
 const golpe=ataque('golpe','Golpe',{cantidad:10,caras:6,modificador:100});
 let b=c.nuevoCombate();
 b=c.agregar(b,{id:'a',nombre:'Vyr',forja_id:null,posicion:{x:1,y:1},stats:{vida:30,ph:20,fatiga:10},
  configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'S',stats:{},efectos:[{...cambiar,transformacion:def}]}]}},'jugador',()=>20);
 b=c.agregar(b,{id:'e',nombre:'E',forja_id:null,posicion:{x:2,y:1},stats:{vida:25,ph:0,fatiga:3},
  configuracion:{tipo_creacion:'personaje',habilidades:[{id:'g',nombre:'G',stats:{},efectos:[golpe]}]}},'enemigo',()=>1);
 b.regla='directo'; b=c.iniciar(b,()=>1);
 b=c.actuar(b,'a','hab:h:cambiar>dragon','a',()=>20);
 b=c.siguiente(b,()=>20);
 b=c.actuar(b,'e','hab:g:golpe','a',()=>20,true);
 assert.equal(actor(b).transformacion,null,'la forma se rompe');
 assert.equal(actor(b).vida,30);
 b=c.siguiente(b,()=>20);
 const opcion=c.acciones(actor(b)).find(a=>a.id==='hab:h:cambiar>dragon');
 assert.match(opcion.bloqueada||'',/rota/i);
 assert.throws(()=>c.actuar(b,'a','hab:h:cambiar>dragon','a',()=>20),/rota/i);
});
// Revisión final · M2: el enfriamiento es de la acción, no de cada destino.
test('el enfriamiento de la transformación vale para todos los destinos', () => {
 let b=campoForma({enfriamiento:3});
 b=c.actuar(b,'a','hab:h:cambiar>dragon','a',()=>20);
 b=turno(b);
 assert.throws(()=>c.actuar(b,'a','hab:h:cambiar>humano','a',()=>20),/enfriamiento/i);
});

// Fallos menores de la revisión.
function campoCon(def,stats={vida:30,ph:20,fatiga:10}){
 let b=c.nuevoCombate();
 b=c.agregar(b,{id:'a',nombre:'Vyr',forja_id:null,posicion:{x:1,y:1},stats,
  configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'S',stats:{},efectos:[{...cambiar,transformacion:def}]}]}},'jugador',()=>20);
 b=c.agregar(b,{id:'e',nombre:'E',forja_id:null,posicion:{x:8,y:6},stats:{vida:25,ph:0,fatiga:3},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);
 b.regla='directo'; return c.iniciar(b,()=>1);
}
test('M1: usar el cambio libre no gasta la cadena del mismo grafo', () => {
 const def={id:'mixta',nombre:'Mixta',tipo:'poder',etapas:[{id:'humano',nombre:'Humano',stats:{armadura:7}},{id:'etapa1',nombre:'Etapa 1',stats:{armadura:9}}],
  transiciones:[{id:'a',desde:'_realidad',hasta:'humano',sentido:'ambos'},{id:'b',desde:'_realidad',hasta:'etapa1',sentido:'uno'}]};
 let b=campoCon(def);
 b=c.actuar(b,'a','hab:h:cambiar>humano','a',()=>20);
 b=turno(b); b=c.actuar(b,'a','volver_forma','a',()=>20);
 b=turno(b);
 assert.equal(c.acciones(actor(b)).find(a=>a.id==='hab:h:cambiar>etapa1').bloqueada,undefined);
 b=c.actuar(b,'a','hab:h:cambiar>etapa1','a',()=>20);
 b=turno(b); b=c.actuar(b,'a','volver_forma','a',()=>20);
 b=turno(b);
 assert.match(c.acciones(actor(b)).find(a=>a.id==='hab:h:cambiar>etapa1').bloqueada||'',/utilizada/);
 assert.equal(c.acciones(actor(b)).find(a=>a.id==='hab:h:cambiar>humano').bloqueada,undefined);
});
test('M5: el coste de volver se comprueba con las estadísticas del cuerpo original', () => {
 const def={id:'fatigosa',nombre:'F',tipo:'poder',etapas:[{id:'bestia',nombre:'Bestia',stats:{fatiga:30}}],
  transiciones:[{id:'a',desde:'_realidad',hasta:'bestia',sentido:'ambos',coste:{fatiga:3}}]};
 let b=campoCon(def);
 b=c.actuar(b,'a','hab:h:cambiar>bestia','a',()=>20);
 b=turno(b);
 actor(b).fatiga=9;
 assert.throws(()=>c.actuar(b,'a','volver_forma','a',()=>20),/fatiga/i);
});
test('M8: no se ofrece una forma que no existe en las etapas guardadas', () => {
 const def={id:'dup',nombre:'D',tipo:'poder',etapas:[{id:'x',nombre:'X',stats:{armadura:7}},{id:'x',nombre:'X2',stats:{armadura:9}}],
  transiciones:[{id:'a',desde:'_realidad',hasta:'x',sentido:'ambos'},{id:'b',desde:'x',hasta:'x_2',sentido:'ambos'}]};
 let b=campoCon(def);
 b=c.actuar(b,'a','hab:h:cambiar>x','a',()=>20);
 b=turno(b);
 assert.ok(!c.acciones(actor(b)).some(a=>a.id==='hab:h:cambiar>x_2'));
});
