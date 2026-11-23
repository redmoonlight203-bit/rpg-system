import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,defensas} from './helpers/campo-estados.mjs';
// Paso 4.5 y 4.7: Fatiga/Vida/PH máximos del equipo e inmunidades que se van al desequipar.
const capa={id:'capa',nombre:'Capa del Viajero',slot_tipo:'capa',tipo_creacion:'objeto',stats:{fatiga:2}};
const anillo={id:'anillo',nombre:'Anillo de escarcha',slot_tipo:'accesorio',tipo_creacion:'objeto',stats:{vida:5,ph:3},efectos:[defensas({tipo:'estado',valor:'congelado',modo:'bloquear_aplicacion',duracion:'equipada'})]};
function portador(){
 let c=m.nuevoCombate();
 c=m.agregar(c,{id:'k',nombre:'k',stats:{vida:55,ph:23,fatiga:12,armadura:0},configuracion:{tipo_creacion:'personaje',stats_base:{vida:50,ph:20,fatiga:10},bonos_equipamiento:{fatiga:2,vida:5,ph:3},equipamiento:{capa,acc_1:anillo}}},'jugador',()=>1);
 c=m.agregar(c,{id:'a',nombre:'a',stats:{vida:50},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);
 return c;
}
test('la bonificación aparece al equipar y desaparece al desequipar, sin tocar otras',()=>{
 const c=portador();const s=m.estadisticas(de(c,'k'));
 assert.equal(s.fatiga,12);assert.equal(m.maxVida(de(c,'k')),55);assert.equal(s.ph,23);
 const sin=m.cambiarEquipo(c,'k',{acc_1:'anillo'});
 assert.equal(m.estadisticas(de(sin,'k')).fatiga,10,'sin capa: −2 Fatiga');
 assert.equal(m.maxVida(de(sin,'k')),55,'el anillo sigue');
 const nada=m.cambiarEquipo(sin,'k',{});
 assert.equal(m.maxVida(de(nada,'k')),50);assert.equal(m.estadisticas(de(nada,'k')).ph,20);
});
test('la inmunidad del objeto existe mientras está equipado',()=>{
 const c=portador();
 assert.equal(m.inmunidadesDe(de(c,'k')).length,1);
 assert.equal(m.inmunidadesDe(de(c,'k'))[0].origen,'Anillo de escarcha');
 assert.equal(m.inmunidadesDe(de(m.cambiarEquipo(c,'k',{capa:'capa'}),'k')).length,0);
});
