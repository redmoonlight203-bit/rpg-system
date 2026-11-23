import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
import {m,ef,de,campoE} from './helpers/campo-estados.mjs';
const {validarConcepto,describirConcepto,DESARMADO_BASE,GUARDIA_BASE}=cargarDependencia('./conceptos-basicos');
const mordisco={id:'desarmado',nombre:'Mordisco',alcance:1,dano:{cantidad:2,caras:6,modificador:0,tipo_dano:'perforante',naturaleza:'natural'},coste:{ph:0,fatiga:1},animacion:'punos',requiere_mano:false};
test('validación de conceptos',()=>{
 assert.equal(validarConcepto(DESARMADO_BASE),null);assert.equal(validarConcepto(GUARDIA_BASE),null);assert.equal(validarConcepto(mordisco),null);
 assert.match(validarConcepto({...mordisco,coste:{ph:2,fatiga:1}}),/PH/);
 assert.match(validarConcepto({...GUARDIA_BASE,bonos:{}}),/al menos un bono/);
 assert.match(validarConcepto({id:'patada'}),/desarmado o guardia/);
 assert.equal(describirConcepto(GUARDIA_BASE),'Guardia: +2 ARM hasta su siguiente turno.');
 assert.equal(describirConcepto(mordisco),'Mordisco: 2d6 de daño perforante, alcance 1, 1 Fatiga, sin necesitar las manos.');
});
test('sustitución por id; sin sustitución se usa el concepto por defecto',()=>{
 const pasiva=ef('fauces',{efecto:'estado',estado:'Fauces',cantidad:0,solo_pasivo:true,concepto:mordisco});
 const c=campoE([{id:'k',bando:'jugador',x:1,efectos:[pasiva]},{id:'o',bando:'enemigo',x:2}]);
 assert.equal(m.conceptosDe(de(c,'k')).desarmado.nombre,'Mordisco');assert.equal(m.conceptosDe(de(c,'k')).guardia.nombre,'Guardia');
 assert.equal(m.conceptosDe(de(c,'o')).desarmado.nombre,'Ataque desarmado');
});
