import test from 'node:test';
import assert from 'node:assert/strict';
import * as motor from '../supabase/functions/equipo-combate/motor.js';

const golpe={id:'golpe',nombre:'Golpe',efecto:'dano',cantidad:1,caras:8,modificador:0,coste_ph:0};
const esquiva={...golpe,id:'esquiva',coste_ph:1,reaccion:{una_por_ronda:true,esquiva_opuesta:{caras:20,contra_caras:6},principal:{reducir:{modo:'mitad'}}}};
const dash={...golpe,id:'dash',efecto:'desplazamiento',coste_ph:1,tablero:{alcance:6,forma:'individual',tamano:0,afecta:'todos'}};
function encuentro(){
 let c=motor.nuevoCombate();
 for(const [id,bando,x,efectos] of [['a','enemigo',1,[golpe]],['d','jugador',2,[esquiva,dash]]]){
  c=motor.agregar(c,{id,nombre:id,stats:{vida:40,ph:10,armadura:0},posicion:{x,y:1},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'Habilidad',stats:{},efectos}]}},bando,()=>10);
 }
 c=motor.iniciar(c,()=>10);c.actual='a';c.regla='impacto';return c;
}
for(const [nombre,acepta,tirada,vida,vidaAtacante] of [['rechazar',false,0,32,40],['inferior',true,9,36,40],['empatar',true,10,40,36],['superar',true,11,40,36]]){
 test('Reacción voluntaria de Paso Inercial al '+nombre,()=>{
  const c=encuentro(),p=motor.actuarConReacciones(c,'a','hab:h:golpe','d',()=>10);
  assert.equal(p.reaccion_pendiente.oferta.defensor,'d');assert.equal(p.miembros[1].ph,10);
  assert.throws(()=>motor.responderReaccion(p,'a',true));assert.throws(()=>motor.siguiente(p));
  const n=motor.responderReaccion(structuredClone(p),'d',acepta,caras=>caras===20?tirada:caras===6?4:8);
  assert.equal(n.reaccion_pendiente,undefined);assert.equal(n.miembros[1].vida,vida);assert.equal(n.miembros[0].vida,vidaAtacante);
  assert.equal(n.miembros[1].ph,acepta?9:10);
  n.miembros[0].accion_usada=false;
  const otro=motor.actuarConReacciones(n,'a','hab:h:golpe','d',()=>10);
  assert.equal(!!otro.reaccion_pendiente,!acepta);
 });
}
test('Dash usa 1 PH, no ataca y conserva el movimiento incluso agotado',()=>{
 const c=encuentro();c.actual='d';const d=c.miembros[1];d.movimiento={turno:d.turnos,gastado:50};
 for(const destino of [{x:1,y:1},{x:9,y:1}])assert.throws(()=>motor.actuar(c,'d','hab:h:dash','d',()=>1,false,destino));
 const n=motor.actuar(c,'d','hab:h:dash','d',()=>1,false,{x:8,y:1});
 assert.deepEqual(n.miembros[1].posicion,{x:8,y:1});assert.deepEqual(n.miembros[1].movimiento,d.movimiento);assert.equal(n.miembros[1].ph,9);assert.equal(n.miembros[0].vida,40);
});
