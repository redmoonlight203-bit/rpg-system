import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../supabase/functions/equipo-combate/motor.js';

const golpe=(id,tablero,extra={})=>({id,nombre:id,efecto:'dano',cantidad:0,caras:6,modificador:5,tipo_dano:'fisico',estado:'',duracion:0,coste_ph:0,coste_fatiga:0,tablero,...extra});
const salto={alcance:6,forma:'cuadrado',tamano:3,afecta:'enemigos',origen_area:'aterrizaje',afecta_lanzador:false,movimiento_lanzador:{tipo:'salto',casillas:6,alcance_golpe:1}};
const carrera={alcance:6,forma:'linea',tamano:4,afecta:'todos',origen_area:'recorrido',afecta_lanzador:false,movimiento_lanzador:{tipo:'carrera',casillas:4,alcance_golpe:1,ancho:0}};
const rugido={alcance:0,forma:'circulo',tamano:2,afecta:'todos',origen_area:'lanzador',afecta_lanzador:false};
const regla={id:'limite',nombre:'Asimilación',evento:'causar_dano',condicion:{tipo:'siempre'},efectos:[{tipo:'curar',destino:'yo',valor:2}],coste_ph:0,coste_fatiga:0,enfriamiento:0,usos:0,prioridad:0,limite_por_turno:1};
function escena({tablero=rugido,enemigos=[['e1',2,1]],aliados=[],hp=30,reglas=[],definicion=null,muro=false}={}){
 let b=c.nuevoCombate();
 if(muro)b.mapa={id:'mapa',version:1,nombre:'Pared',columnas:12,filas:8,celdas:Object.fromEntries(Array.from({length:8},(_,y)=>['3,'+y,'muro']))};
 const efectos=definicion?[{...golpe('liberar',undefined),efecto:'transformacion',transformacion:definicion},golpe('golpe',tablero)]:[golpe('golpe',tablero)];
 b=c.agregar(b,{id:'a',nombre:'Orin',forja_id:null,posicion:{x:1,y:1},vida_actual:hp,stats:{vida:30,ph:10,fatiga:10,armadura:0,movimiento:6},configuracion:{tipo_creacion:'personaje',reglas,habilidades:[{id:'habilidad',nombre:'Prueba',stats:{},efectos}]}},'jugador',()=>20);
 for(const [id,x,y] of enemigos)b=c.agregar(b,{id,nombre:id,forja_id:null,posicion:{x,y},stats:{vida:30,ph:0,fatiga:3,armadura:0},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);
 for(const [id,x,y] of aliados)b=c.agregar(b,{id,nombre:id,forja_id:null,posicion:{x,y},stats:{vida:30,ph:0,fatiga:3,armadura:0},configuracion:{tipo_creacion:'personaje'}},'jugador',()=>1);
 b.regla='directo';
 return c.iniciar(b,()=>1);
}
const vida=(b,id)=>b.miembros.find(m=>m.id===id).vida;
test('salto aterriza en espacio libre y daña varias casillas, sin golpearse a sí mismo',()=>{
 let b=escena({tablero:salto,enemigos:[['e1',5,1],['e2',5,2]]});
 b=c.actuar(b,'a','hab:habilidad:golpe','e1',()=>20);
 assert.deepEqual(c.posicionesTablero(b).a,{x:4,y:1});assert.equal(vida(b,'e1'),25);assert.equal(vida(b,'e2'),25);assert.equal(vida(b,'a'),30);
});
test('carrera recorre varios enemigos, golpea una vez a cada uno y termina detrás',()=>{
 let b=escena({tablero:carrera,enemigos:[['e1',2,1],['e2',3,1],['e3',4,1]]});
 b=c.actuar(b,'a','hab:habilidad:golpe','e3',()=>20);
 assert.deepEqual(c.posicionesTablero(b).a,{x:5,y:1});
 for(const id of ['e1','e2','e3'])assert.equal(vida(b,id),25);
});
test('rugido daña a todo alrededor, incluyendo aliados, pero no al emisor',()=>{
 let b=escena({tablero:rugido,enemigos:[['e1',2,1],['lejano',8,6]],aliados:[['aliado',1,2]]});
 b=c.actuar(b,'a','hab:habilidad:golpe','a',()=>20);
 assert.equal(vida(b,'e1'),25);assert.equal(vida(b,'aliado'),25);assert.equal(vida(b,'lejano'),30);assert.equal(vida(b,'a'),30);
});
test('un muro bloquea la carrera sin consumir la acción ni mover al actor',()=>{
 let b=escena({tablero:carrera,enemigos:[['e1',5,1]],muro:true});const antes=JSON.stringify(b);
 assert.throws(()=>c.actuar(b,'a','hab:habilidad:golpe','e1',()=>20),/muro|trayectoria|carrera|casilla/i);
 assert.equal(JSON.stringify(b),antes);
});
test('una pasiva con límite por turno no se multiplica al golpear un área',()=>{
 let b=escena({tablero:rugido,enemigos:[['e1',2,1],['e2',1,2]],hp:10,reglas:[regla]});
 b=c.actuar(b,'a','hab:habilidad:golpe','a',()=>20);
 assert.equal(vida(b,'a'),12);
 while(b.actual!=='a')b=c.siguiente(b,()=>20);
 // Avanzar por los turnos enemigos y entrar de nuevo en el turno de Orin
 if(b.miembros.find(m=>m.id==='a').accion_usada){
  for(let k=0;k<5&&b.miembros.find(m=>m.id==='a').accion_usada;k++)b=c.siguiente(b,()=>20);
 }
 if(b.actual==='a'&&!b.miembros.find(m=>m.id==='a').accion_usada){
  b=c.actuar(b,'a','hab:habilidad:golpe','a',()=>20);assert.equal(vida(b,'a'),14);
 }
});
test('la posesión usa un rugido automático contra enemigos y aliados',()=>{
 const d={id:'g',nombre:'Gor’Veth',tipo:'poder',posesion:{umbral_pct:50,cd:12,etapa_id:'rana'},etapas:[{id:'humana',nombre:'Etapa I',stats:{armadura:7}},{id:'rana',nombre:'Rana gigante',stats:{armadura:12},descontrolada:true,vida_maxima_posesion:60,curacion_entrada:25,habilidades:['golpe']}]};
 let b=escena({tablero:{...rugido},enemigos:[['e1',2,1]],aliados:[['aliado',1,2]],hp:4,definicion:d});
 assert.equal(b.miembros.find(m=>m.id==='a').transformacion?.descontrolada,true);
 assert.equal(c.maxVida(b.miembros.find(m=>m.id==='a')),60);
 assert.equal(b.miembros.find(m=>m.id==='a').accion_usada,true);
 assert.equal(vida(b,'e1'),25);
 assert.equal(vida(b,'aliado'),25);
});
