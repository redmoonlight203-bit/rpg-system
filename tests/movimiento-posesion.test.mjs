import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../supabase/functions/equipo-combate/motor.js';

const ataque=(id,nombre,extra={})=>({
 id,nombre,efecto:'dano',cantidad:0,caras:6,modificador:5,
 tipo_dano:'fisico',estado:'',duracion:0,coste_ph:0,coste_fatiga:0,...extra
});
const dash=ataque('dash','Embestida',{
 tablero:{alcance:5,forma:'individual',tamano:0,afecta:'enemigos',
 movimiento_lanzador:{tipo:'dash',casillas:4,alcance_golpe:1}}
});
const definicion={
 id:'gorveth',nombre:'Gor’Veth',tipo:'poder',
 posesion:{umbral_pct:50,cd:12,etapa_id:'gigante'},
 etapas:[
  {id:'primera',nombre:'Manifestación parcial',stats:{armadura:8},reglas:[{
   id:'pasiva1',nombre:'Curación de prueba',evento:'inicio_turno',condicion:{tipo:'siempre'},
   efectos:[{tipo:'curar',destino:'yo',valor:2}],coste_ph:0,coste_fatiga:0,enfriamiento:0,usos:0,prioridad:0
  }]},
  {id:'segunda',nombre:'Fusión',stats:{armadura:12}},
  {id:'gigante',nombre:'Rana gigante',stats:{armadura:15},
   descontrolada:true,vida_maxima_posesion:40,curacion_entrada:20,habilidades:['mordida']}
 ]
};
const transformar={...ataque('transformar','Liberar el sello'),efecto:'transformacion',
 cantidad:0,modificador:0,transformacion:definicion};
const mordida=ataque('mordida','Mandíbula colosal',{cantidad:1,caras:6,modificador:2});
function campo({conDash=false,conOrin=false,vida=26,aliado=false,muro=false}={}){
 let b=c.nuevoCombate();
 if(muro)b.mapa={id:'mapa',version:1,nombre:'Pared',columnas:12,filas:8,
  celdas:Object.fromEntries(Array.from({length:8},(_,y)=>['2,'+y,'muro']))};
 b=c.agregar(b,{
  id:'a',nombre:'Orin',forja_id:null,vida_actual:vida,posicion:{x:1,y:1},
  stats:{vida:26,ph:8,fatiga:10,armadura:6,movimiento:6},
  configuracion:{tipo_creacion:'personaje',habilidades:[
   ...(conDash?[{id:'dashh',nombre:'Dash',stats:{},efectos:[dash]}]:[]),
   ...(conOrin?[{id:'h',nombre:'Despertar',stats:{},efectos:[transformar,mordida]}]:[])
  ]}
 },'jugador',()=>20);
 if(aliado)b=c.agregar(b,{
  id:'aliado',nombre:'Aliado',forja_id:null,posicion:{x:2,y:1},
  stats:{vida:20,ph:0,fatiga:3},configuracion:{tipo_creacion:'personaje'}
 },'jugador',()=>1);
 b=c.agregar(b,{
  id:'enemigo',nombre:'Enemigo',forja_id:null,posicion:{x:4,y:1},
  stats:{vida:25,ph:0,fatiga:3},configuracion:{tipo_creacion:'personaje'}
 },'enemigo',()=>1);
 b.regla='directo';
 return c.iniciar(b,()=>1);
}
const actor=b=>b.miembros.find(m=>m.id==='a');
test('dash mueve al lanzador antes del impacto sin consumir su movimiento normal',()=>{
 let b=campo({conDash:true});
 b=c.actuar(b,'a','hab:dashh:dash','enemigo',()=>20);
 assert.deepEqual(c.posicionesTablero(b).a,{x:3,y:1});
 assert.equal(b.miembros.find(m=>m.id==='enemigo').vida,20);
 assert.equal(c.movimientoRestante(actor(b)),6);
});
test('dash no atraviesa un muro y no consume recursos al fallar',()=>{
 const b=campo({conDash:true,muro:true}),antes=JSON.stringify(b);
 assert.throws(()=>c.actuar(b,'a','hab:dashh:dash','enemigo',()=>20),/muro|trayectoria|casilla/i);
 assert.equal(JSON.stringify(b),antes);
});
test('si falla salvación por HP bajo se convierte en rana y ataca de manera autónoma',()=>{
 const b=campo({conOrin:true,vida:8,aliado:true});
 const o=actor(b);
 assert.equal(o.transformacion?.etapa_id,'gigante');
 assert.equal(o.transformacion?.descontrolada,true);
 assert.equal(c.maxVida(o),40);
 assert.equal(o.vida,28);
 assert.equal(o.accion_usada,true);
 assert.ok(b.registro.some(s=>s.includes('poseído ataca')&&s.includes('Aliado')));
 assert.throws(()=>c.actuar(b,'a','volver_forma','a',()=>20),/fuera de control/i);
});
test('si supera salvación conserva su voluntad',()=>{
 let b=c.nuevoCombate();
 b=c.agregar(b,{id:'a',nombre:'Orin',forja_id:null,vida_actual:8,stats:{vida:26,ph:8,fatiga:10},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'Despertar',stats:{},efectos:[transformar,mordida]}]}},'jugador',()=>20);
 b=c.agregar(b,{id:'e',nombre:'Enemigo',forja_id:null,stats:{vida:20,ph:0,fatiga:3},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);
 b=c.iniciar(b,()=>20);
 assert.equal(actor(b).transformacion,undefined);
 assert.equal(actor(b).accion_usada,false);
});
test('la regla de etapa existe solo mientras esa etapa está activa',()=>{
 let b=campo({conOrin:true,vida:20});
 b=c.actuar(b,'a','hab:h:transformar','a',()=>20);
 assert.equal(actor(b).vida,20);
 b=c.siguiente(c.siguiente(b,()=>20),()=>20);
 assert.equal(actor(b).vida,22);
 b=c.actuar(b,'a','hab:h:transformar','a',()=>20);
 assert.equal(actor(b).transformacion.etapa_id,'segunda');
 b=c.siguiente(c.siguiente(b,()=>20),()=>20);
 assert.equal(actor(b).vida,22);
 assert.ok(c.acciones(actor(b)).some(a=>a.efecto.efecto==='transformacion'&&a.bloqueada));
});
