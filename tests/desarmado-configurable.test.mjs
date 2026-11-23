import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,campoE} from './helpers/campo-estados.mjs';
// A.2: el desarmado por defecto da el mismo daño, alcance y coste. A.3: uno propio para una criatura.
function solo(efectos){let c=m.nuevoCombate();c=m.agregar(c,{id:'k',nombre:'k',stats:{vida:30,fatiga:5},posicion:{x:1,y:1},configuracion:{tipo_creacion:'personaje',habilidades:efectos?[{id:'h',nombre:'H',stats:{},efectos}]:[]}},'jugador',()=>1);c=m.agregar(c,{id:'o',nombre:'o',stats:{vida:30},posicion:{x:2,y:1},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);c=m.iniciar(c,()=>1);c.regla='directo';return c;}
test('regresión: el desarmado de siempre (1d4 físico, alcance 1, sin coste)',()=>{
 const c=solo();const a=m.acciones(de(c,'k')).find(x=>x.id==='ataque');
 assert.equal(a.nombre,'Ataque desarmado');assert.equal(a.efecto.id,'basico');assert.equal(a.efecto.cantidad,1);assert.equal(a.efecto.caras,4);assert.equal(a.efecto.tablero.alcance,1);
 assert.equal(de(m.actuar(turnoDe(c,'k'),'k','ataque','o',dados([3])),'o').vida,27);
 assert.equal(m.esqueletoDeAccion(de(c,'k'),a,'ataque'),'punos');
});
test('mordisco de criatura: 2d6, sin manos, gasta Fatiga y sangra al impactar',()=>{
 const sangrado={id:'sangrado',nombre:'Sangrado',categoria:'fisico',duracion:{tipo:'turnos',turnos:2},efectos:[{tipo:'dano_periodico',cantidad:1,caras:4,tipo_dano:'fisico',momento:'inicio'}]};
 const concepto={id:'desarmado',nombre:'Mordisco',alcance:1,dano:{cantidad:2,caras:6,modificador:1,tipo_dano:'perforante',naturaleza:'natural'},coste:{ph:0,fatiga:1},animacion:'punos',requiere_mano:false,estado_impacto:sangrado};
 const c=solo([ef('fauces',{efecto:'estado',estado:'Fauces',cantidad:0,solo_pasivo:true,concepto})]);
 const a=m.acciones(de(c,'k')).find(x=>x.id==='ataque');assert.equal(a.nombre,'Mordisco');
 const n=m.actuar(turnoDe(c,'k'),'k','ataque','o',dados([3]));
 assert.equal(de(n,'o').vida,30-7);assert.ok(de(n,'o').estados.some(e=>e.nombre==='Sangrado'));
 assert.equal(de(n,'k').fatiga,1);
});
