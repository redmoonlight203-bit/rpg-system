import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
import {m,ef,campo,dados,de,turnoDe} from './helpers/campo-reacciones.mjs';
const V=cargarDependencia('artefactos-voces');
const voces={cd:14,atributo:'voluntad',duracion:3,voces:[
 {id:'q',tipo:'pregunta',texto:'¿A quién quieres ver sangrar?',opciones:['Al enemigo','A tu aliado']},
 {id:'c',tipo:'comentario',texto:'Qué débil eres.'},
 {id:'n',tipo:'negativa',texto:'No te dejaré usar eso.',habilidad:'golpe'},
]};
const base=()=>campo([{id:'p',bando:'jugador',x:1,stats:{voluntad:0}},{id:'e',bando:'enemigo',x:2}]);

test('validarVoces: CD, duración y voces bien formadas',()=>{
 assert.equal(V.validarVoces(voces),null);
 assert.match(V.validarVoces({...voces,cd:0}),/CD/);
 assert.match(V.validarVoces({...voces,duracion:0}),/[Dd]uración/);
 assert.match(V.validarVoces({...voces,voces:[{id:'x',tipo:'pregunta',texto:'¿?',opciones:[]}]}),/opciones/);
 assert.match(V.validarVoces({...voces,voces:[{id:'x',tipo:'negativa',texto:'No'}]}),/habilidad/);
 assert.match(V.validarVoces({...voces,voces:[{id:'x',tipo:'grito',texto:'¡'}]}),/tipo/);
});
test('al tomar el arma: salvación de Voluntad; si la supera no hay voz',()=>{
 const n=m.tomarArtefacto(base(),'p',voces,dados([18]));
 assert.equal(de(n,'p').voz_artefacto,undefined);assert.ok(n.registro.some(l=>/salvación/.test(l)));
});
test('si falla, queda pendiente hasta que el GM asigna una voz',()=>{
 const n=m.tomarArtefacto(base(),'p',voces,dados([3]));
 assert.equal(de(n,'p').voz_artefacto.estado,'pendiente');
 const q=m.asignarVoz(n,'p','q');
 const v=de(q,'p').voz_artefacto;assert.equal(v.estado,'activa');assert.equal(v.tipo,'pregunta');assert.equal(v.restantes,3);
 const r=m.responderVoz(q,'p','A tu aliado');assert.equal(de(r,'p').voz_artefacto.respuesta,'A tu aliado');
 assert.ok(r.registro.some(l=>/A tu aliado/.test(l)));
 assert.throws(()=>m.responderVoz(r,'p','Otra'),/ya respondi/i);
 assert.throws(()=>m.responderVoz(q,'p','Nadie'),/opciones/);
});
test('la voz dura los turnos configurados y expira',()=>{
 let c=m.asignarVoz(m.tomarArtefacto(base(),'p',voces,dados([3])),'p','c');
 for(let i=0;i<2;i++){c=m.siguiente(turnoDe(c,'p'),dados([10]));assert.equal(de(c,'p').voz_artefacto.restantes,2-i);}
 c=m.siguiente(turnoDe(c,'p'),dados([10]));assert.equal(de(c,'p').voz_artefacto,undefined);
 assert.ok(c.registro.some(l=>/voz calla/i.test(l)));
 const otro=m.siguiente(turnoDe(m.asignarVoz(m.tomarArtefacto(base(),'p',voces,dados([3])),'p','c'),'e'),dados([10]));
 assert.equal(de(otro,'p').voz_artefacto.restantes,3,'solo cuenta el turno del portador');
});
test('negativa: bloquea la habilidad; el portador puede repetir la prueba una vez por encuentro',()=>{
 let c=m.asignarVoz(m.tomarArtefacto(base(),'p',voces,dados([3])),'p','n');
 const golpe=m.acciones(de(c,'p')).find(a=>a.id==='hab:hp:golpe');assert.match(golpe.bloqueada,/voz/i);
 assert.throws(()=>m.actuar(turnoDe(c,'p'),'p','hab:hp:golpe','e',dados([4])),/voz/i);
 const fallo=m.resistirVoz(c,'p',dados([2]));assert.equal(de(fallo,'p').voz_artefacto.estado,'activa');
 assert.throws(()=>m.resistirVoz(fallo,'p',dados([20])),/una vez por encuentro/);
 const exito=m.resistirVoz(c,'p',dados([19]));assert.equal(de(exito,'p').voz_artefacto,undefined);
 assert.throws(()=>m.resistirVoz(m.asignarVoz(m.tomarArtefacto(base(),'p',voces,dados([3])),'p','c'),'p',dados([19])),/negativa/);
});
test('el GM domina o libera al portador; dominado no actúa por su cuenta',()=>{
 const d=m.dominar(base(),'p',true);assert.ok(de(d,'p').estados.some(e=>e.tipo==='dominado'));
 assert.equal(m.estaDominado(de(d,'p')),true);
 const l=m.dominar(d,'p',false);assert.equal(m.estaDominado(de(l,'p')),false);
});
