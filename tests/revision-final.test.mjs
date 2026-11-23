// Regresiones de la revisión final de la rama (plan «Yunque · una más»).
import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
import {m,ef,campo,dados,de,turnoDe} from './helpers/campo-reacciones.mjs';
const E=cargarDependencia('espejo-mental');
const json=x=>JSON.parse(JSON.stringify(x));

test('dos reacciones no se pagan con un mismo saldo de PH',()=>{
 const acecho=id=>ef(id,{cantidad:0,reaccion:{disparador:'fin_de_turno',coste:5,principal:{contraatacar:{cantidad:1,caras:4}}}});
 const c=campo([{id:'a',bando:'enemigo',x:1},{id:'w',bando:'jugador',x:2,stats:{ph:6},efectos:[ef('golpe'),acecho('uno'),acecho('dos')]}]);
 const rng=dados([3]);const n=m.siguiente(turnoDe(c,'a'),rng);
 assert.equal(rng.ofertas.length,1,'la segunda ya no alcanza');assert.equal(de(n,'w').ph,1);
});
test('un poseído no aborta su ataque cuando el blanco puede reaccionar: la oferta queda pendiente',()=>{
 const t={id:'gorveth',nombre:'Gor',tipo:'poder',posesion:{umbral_pct:50,cd:12,etapa_id:'g'},etapas:[{id:'g',nombre:'Rana',stats:{},descontrolada:true,vida_maxima_posesion:40,curacion_entrada:0,habilidades:['mordida']}]};
 const transformar={id:'transformar',nombre:'Liberar',efecto:'transformacion',cantidad:0,caras:6,modificador:0,coste_ph:0,transformacion:t};
 const mordida=ef('mordida',{cantidad:1,caras:6,modificador:2});
 let b=m.nuevoCombate();
 b=m.agregar(b,{id:'o',nombre:'Orin',vida_actual:8,posicion:{x:1,y:1},stats:{vida:26,ph:8,fatiga:10,movimiento:6},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'D',stats:{},efectos:[transformar,mordida]}]}},'jugador',()=>20);
 b=m.agregar(b,{id:'al',nombre:'Aliado',posicion:{x:2,y:1},stats:{vida:20,ph:5},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'hr',nombre:'R',stats:{},efectos:[ef('escudo',{cantidad:0,reaccion:{disparador:'antes_ser_atacado',principal:{reducir:{modo:'fijo',valor:2}}}})]}]}},'jugador',()=>1);
 b=m.agregar(b,{id:'e',nombre:'Enemigo',posicion:{x:4,y:1},stats:{vida:25},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);
 b.regla='directo';
 const p=m.turnoConReacciones(b,'iniciar',()=>1);
 assert.equal(p.reaccion_pendiente?.oferta.defensor,'al');
 const r=m.responderReaccion(p,'al',true,()=>1);
 assert.ok(r.registro.some(l=>/poseído ataca/.test(l)&&/Aliado/.test(l)));
});
test('quién decide la reacción: el GM decide por enemigos, NPC, dominados y poseídos',()=>{
 const c=m.dominar(campo([{id:'p',bando:'jugador',x:1},{id:'e',bando:'enemigo',x:2}]),'p',true);
 const p={...de(c,'p'),personaje_id:'7'};
 assert.equal(m.reaccionLaDecideGM(p),true);
 assert.equal(m.reaccionLaDecideGM({...p,estados:[]}),false);
 assert.equal(m.reaccionLaDecideGM({...p,estados:[],transformacion:{descontrolada:true}}),true);
 assert.equal(m.reaccionLaDecideGM(de(c,'e')),true);
});
const real=()=>({tablero:{columnas:10,filas:6},actual:'Bram',actual_id:'aliado',registro:['Bram recibe 4 daño.'],reaccion_esperando:'Bram',
 objetivos:[{id:'p',nombre:'Aiko',bando:'jugador',posicion:{x:1,y:2}},{id:'aliado',nombre:'Bram',bando:'jugador',posicion:{x:2,y:2}},{id:'malo',nombre:'Goblin',bando:'enemigo',posicion:{x:7,y:3}}],
 ocular:{visiones:[],objetivos:{malo:{puntos:['e','ne','n']}},amenaza:['6,3']}});
test('espejo: la respuesta no filtra el nombre de quien decide una reacción',()=>{
 const r=E.proyectarRespuesta(real(),'p',{espejar:false,intercambiar:false,ocultar:true,aviso:true});
 assert.equal(r.reaccion_esperando,'???');assert.equal(r.actual,'???');assert.deepEqual(json(r.registro),['Tu mente se confunde: no distingues lo que ocurre.']);
 assert.equal(r.espejo.aviso,'Tu mente se confunde');
});
test('espejo: la vista ocular se refleja y, con bandos cambiados, no delata a los enemigos reales',()=>{
 const r=E.proyectarRespuesta(real(),'p',{espejar:true,intercambiar:false,ocultar:false,aviso:false});
 assert.deepEqual(json(r.ocular.amenaza),['3,3']);assert.deepEqual(json(r.ocular.objetivos.malo.puntos),['o','no','n']);
 const s=E.proyectarRespuesta(real(),'p',{espejar:false,intercambiar:true,ocultar:false,aviso:false});
 assert.deepEqual(json(s.ocular.objetivos),{});
 const sin=E.proyectarRespuesta(real(),'p',null);assert.equal(sin.reaccion_esperando,'Bram');assert.equal(sin.espejo,undefined);
});
test('voces: una opción con espacios sobrantes se puede responder',()=>{
 const voces={cd:14,atributo:'voluntad',duracion:3,voces:[{id:'q',tipo:'pregunta',texto:'¿?',opciones:['Sí ','No']}]};
 const c=m.asignarVoz(m.tomarArtefacto(campo([{id:'p',bando:'jugador',x:1,stats:{voluntad:0}},{id:'e',bando:'enemigo',x:2}]),'p',voces,dados([2])),'p','q');
 assert.equal(de(m.responderVoz(c,'p','Sí'),'p').voz_artefacto.respuesta,'Sí');
});
test('tomar el artefacto o resistir la voz no gasta en silencio la repetición de salvación del jugador',()=>{
 const voces={cd:14,atributo:'voluntad',duracion:3,voces:[{id:'c',tipo:'comentario',texto:'…'}]};
 const c=campo([{id:'p',bando:'jugador',x:1,stats:{voluntad:0,ph:10},efectos:[ef('golpe'),ef('suerte',{cantidad:0,reaccion:{disparador:'tras_fallar_prueba',coste:3,principal:{repetir_tirada:{}}}})]},{id:'e',bando:'enemigo',x:2}]);
 const n=m.tomarArtefacto(c,'p',voces,()=>2);
 assert.equal(de(n,'p').ph,10);assert.equal(de(n,'p').voz_artefacto.estado,'pendiente');
});
