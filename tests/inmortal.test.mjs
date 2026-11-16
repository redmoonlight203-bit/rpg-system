import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as motor from '../supabase/functions/equipo-combate/motor.js';
// Regla del jugador inmortal (plan del Yunque general): a 0 de vida queda inconsciente, nunca muere
// por el daño; solo el GM puede registrar su muerte. (El borrado del personaje es solo del GM: ver
// private.personaje_antes_borrar y tests/gm-borrar-personajes-database.mjs.)
const golpe={id:'golpe',nombre:'Golpe brutal',efecto:'dano',cantidad:10,caras:20,modificador:50,coste_ph:0};
function combate(){
 const ogro={id:'o',nombre:'Ogro',stats:{vida:80,ph:0,armadura:0},posicion:{x:1,y:1},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'Golpes',stats:{},efectos:[golpe]}]}};
 const heroe={id:'j',nombre:'Heroína',stats:{vida:12,ph:0,armadura:0},posicion:{x:2,y:1},configuracion:{tipo_creacion:'personaje',habilidades:[]}};
 let c=motor.iniciar(motor.agregar(motor.agregar(motor.nuevoCombate(),ogro,'enemigo',()=>20),heroe,'jugador',()=>1));c.regla='directo';return c;
}
test('un golpe que deja al jugador a 0 de vida lo deja inconsciente, no muerto',()=>{
 const n=motor.actuar(combate(),'o','hab:h:golpe','j',()=>20);
 const j=n.miembros.find(m=>m.id==='j');
 assert.equal(j.vida,0);
 assert.equal(motor.situacionCombatiente(j),'inconsciente');
 assert.notEqual(j.situacion,'muerto');
});
test('solo una decisión explícita (la del GM) marca la muerte',()=>{
 const c=combate();
 const n=motor.cambiarSituacion(c,'j','muerto');
 assert.equal(motor.situacionCombatiente(n.miembros.find(m=>m.id==='j')),'muerto');
});
