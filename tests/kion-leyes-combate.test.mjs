import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as m from '../supabase/functions/equipo-combate/motor.js';
const base={id:'hechizo',nombre:'Luz',efecto:'dano',naturaleza:'magica',cantidad:1,caras:6,modificador:1,coste_ph:1,tablero:{forma:'individual',alcance:8,tamano:0,afecta:'todos'}};
const aprender={...base,id:'estudio',efecto:'estado',aprendizaje:{cd:18,bono:15}};
function campo(efecto){
 let c=m.nuevoCombate();
 for(const [id,hab,bando,x] of [['k',efecto,'jugador',1],['m',base,'enemigo',2]]){
  c=m.agregar(c,{id,nombre:id,stats:{vida:100,ph:20},posicion:{x,y:1},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h'+id,nombre:hab.nombre,stats:{},efectos:[hab]}]}},bando,()=>1);
 }
 c=m.iniciar(c,()=>1);c.regla='directo';c.actual='m';return c;
}
test('observación, CD del GM y aprendizaje utilizable en combate',()=>{
 const c=campo(aprender);c.actual='k';
 assert.throws(()=>m.actuar(c,'k','hab:hk:estudio','m'),/visto/);
 c.actual='m';const visto=m.actuar(c,'m','hab:hm:hechizo','k',()=>2);visto.actual='k';
 const fallo=m.actuar(visto,'k','hab:hk:estudio','m',()=>2);assert.equal(fallo.miembros[0].hechizos_aprendidos,undefined);
 const aprendido=m.actuar(visto,'k','hab:hk:estudio','m',()=>3);
 assert.deepEqual(aprendido.miembros[0].hechizos_aprendidos,['hm']);assert.ok(m.acciones(aprendido.miembros[0]).some(a=>a.id==='hab:hm:hechizo'));
});
test('descarga la reserva entera una sola vez y añade el saldo al golpe',()=>{
 const c=campo({...base,recurso:{nombre:'Energía',inicial:0,cambio:-1,descargar:true}});c.actual='k';
 assert.throws(()=>m.actuar(c,'k','hab:hk:hechizo','m'),/almacenada/);
 c.miembros[0].recursos_especiales={'Energía':12};
 const n=m.actuar(c,'k','hab:hk:hechizo','m',()=>2);
 assert.equal(n.miembros[1].vida,85);assert.equal(n.miembros[0].recursos_especiales['Energía'],0);
});
