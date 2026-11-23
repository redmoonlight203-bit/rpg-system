import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,campo,dados,de,turnoDe} from './helpers/campo-reacciones.mjs';
const reaccion=(id,r)=>ef(id,{cantidad:0,reaccion:r});
const golpe=(c,a,t,rng)=>m.actuar(turnoDe(c,a),a,'hab:h'+a+':golpe',t,rng);
const ofertas=(rng,d)=>rng.ofertas.filter(o=>o.disparador===d);

test('antes_ser_atacado: contraataca antes del golpe y reduce el daño que llega',()=>{
 const c=campo([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2,efectos:[ef('golpe'),reaccion('previa',{disparador:'antes_ser_atacado',principal:{contraatacar:{cantidad:1,caras:4},reducir:{modo:'fijo',valor:2}}})]}]);
 const rng=dados([3]);const n=golpe(c,'a','k',rng);
 assert.equal(ofertas(rng,'antes_ser_atacado').length,1);
 assert.equal(de(n,'a').vida,47,'contraataque 1d4=3');assert.equal(de(n,'k').vida,49,'golpe 3 − 2');
 const rng2=dados([3]);golpe(c,'k','a',rng2);assert.equal(rng2.ofertas.length,0,'no se ofrece al atacar');
});
test('despues_ser_atacado: intercepta el golpe recibido y contraataca',()=>{
 const c=campo([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2,efectos:[ef('golpe'),reaccion('tras',{disparador:'despues_ser_atacado',principal:{reducir:{modo:'mitad'},contraatacar:{cantidad:1,caras:4}}})]}]);
 const rng=dados([4]);const n=golpe(c,'a','k',rng);
 assert.equal(ofertas(rng,'despues_ser_atacado').length,1);
 assert.equal(de(n,'k').vida,48);assert.equal(de(n,'a').vida,46);
 const rng2=dados([4]);golpe(c,'k','a',rng2);assert.equal(rng2.ofertas.length,0);
});
test('tras_fallar_ataque: repite la tirada fallida; si acierta a la primera no se ofrece',()=>{
 const c=campo([{id:'a',bando:'enemigo',x:1,efectos:[ef('golpe'),reaccion('otra',{disparador:'tras_fallar_ataque',principal:{repetir_tirada:{}}})]},{id:'k',bando:'jugador',x:2,stats:{armadura:15}}],'impacto');
 const rng=dados([2,18,3]);const n=golpe(c,'a','k',rng);
 assert.equal(ofertas(rng,'tras_fallar_ataque').length,1);assert.equal(de(n,'k').vida,47,'la segunda tirada impacta');
 const rng2=dados([18,3]);golpe(c,'a','k',rng2);assert.equal(rng2.ofertas.length,0);
 const rng3=dados([2,18,3],()=>false);assert.equal(de(golpe(c,'a','k',rng3),'k').vida,50,'si no la usa, falla');
});
test('tras_fallar_prueba: repite la salvación fallida del portador',()=>{
 const veneno=ef('veneno',{efecto:'estado',estado:'Veneno',estado_tipo:'veneno',duracion:2,salvacion:{cd:15,atributo:'salvacion',exito:'anula'}});
 const c=campo([{id:'a',bando:'enemigo',x:1,efectos:[veneno]},{id:'k',bando:'jugador',x:2,efectos:[ef('golpe'),reaccion('suerte',{disparador:'tras_fallar_prueba',principal:{repetir_tirada:{}}})]}]);
 const rng=dados([5,17]);const n=m.actuar(turnoDe(c,'a'),'a','hab:ha:veneno','k',rng);
 assert.equal(ofertas(rng,'tras_fallar_prueba').length,1);assert.equal(de(n,'k').estados.length,0,'la segunda salvación la evita');
 const rng2=dados([17]);m.actuar(turnoDe(c,'a'),'a','hab:ha:veneno','k',rng2);assert.equal(rng2.ofertas.length,0);
});
test('aliado_atacado: un aliado cercano se interpone; lejos no se ofrece',()=>{
 const guardian=x=>({id:'w',bando:'jugador',x,efectos:[ef('golpe'),reaccion('escudo',{disparador:'aliado_atacado',alcance:1,principal:{interponerse:{}}})]});
 const c=campo([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2},guardian(3)]);
 const rng=dados([4]);const n=golpe(c,'a','k',rng);
 assert.equal(ofertas(rng,'aliado_atacado').length,1);assert.equal(de(n,'k').vida,50);assert.equal(de(n,'w').vida,46);
 const lejos=campo([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2},guardian(7)]);
 const rng2=dados([4]);golpe(lejos,'a','k',rng2);assert.equal(rng2.ofertas.length,0);
});
test('aliado_ataca: un aliado remata al objetivo que su compañero golpeó',()=>{
 const c=campo([{id:'a',bando:'jugador',x:1},{id:'w',bando:'jugador',x:3,y:1,efectos:[ef('golpe'),reaccion('apoyo',{disparador:'aliado_ataca',principal:{contraatacar:{cantidad:1,caras:4}}})]},{id:'k',bando:'enemigo',x:2}],'impacto');
 const rng=dados([15,3,2]);const n=golpe(c,'a','k',rng);
 assert.equal(ofertas(rng,'aliado_ataca').length,1);assert.equal(de(n,'k').vida,45,'golpe 3 + apoyo 2');
 const rng2=dados([1]);golpe(c,'a','k',rng2);assert.equal(rng2.ofertas.length,0,'si falla, no hay apoyo');
});
test('aliado_cae: venga al aliado caído; si sobrevive no se ofrece',()=>{
 const vengador={id:'w',bando:'jugador',x:3,efectos:[ef('golpe'),reaccion('venganza',{disparador:'aliado_cae',alcance:3,principal:{contraatacar:{cantidad:2,caras:6}}})]};
 const c=campo([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2,stats:{vida:2}},vengador]);
 const rng=dados([5]);const n=golpe(c,'a','k',rng);
 assert.equal(ofertas(rng,'aliado_cae').length,1);assert.equal(de(n,'a').vida,40);
 const vivo=campo([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2},vengador]);
 const rng2=dados([5]);golpe(vivo,'a','k',rng2);assert.equal(rng2.ofertas.length,0);
});
test('apuntado_por_area: reduce el daño de un área; ante un golpe individual no se ofrece',()=>{
 const onda=ef('onda',{tablero:{alcance:5,forma:'circulo',tamano:1,afecta:'enemigos'}});
 const c=campo([{id:'a',bando:'enemigo',x:1,efectos:[ef('golpe'),onda]},{id:'k',bando:'jugador',x:3,efectos:[ef('golpe'),reaccion('agacharse',{disparador:'apuntado_por_area',principal:{reducir:{modo:'todo'}}})]}]);
 const rng=dados([4]);const n=m.actuar(turnoDe(c,'a'),'a','hab:ha:onda','k',rng,false,{x:3,y:1});
 assert.equal(ofertas(rng,'apuntado_por_area').length,1);assert.equal(de(n,'k').vida,50);
 const cerca=campo([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2,efectos:[ef('golpe'),reaccion('agacharse',{disparador:'apuntado_por_area',principal:{reducir:{modo:'todo'}}})]}]);
 const rng2=dados([4]);golpe(cerca,'a','k',rng2);assert.equal(rng2.ofertas.length,0);
});
test('fin_de_turno: castiga al enemigo cercano que termina su turno, no a un aliado',()=>{
 const c=campo([{id:'a',bando:'enemigo',x:1},{id:'w',bando:'jugador',x:2,efectos:[ef('golpe'),reaccion('acecho',{disparador:'fin_de_turno',principal:{contraatacar:{cantidad:1,caras:6}}})]},{id:'b',bando:'jugador',x:3}]);
 const rng=dados([4]);const n=m.siguiente(turnoDe(c,'a'),rng);
 assert.equal(ofertas(rng,'fin_de_turno').length,1);assert.equal(de(n,'a').vida,46);
 const rng2=dados([4]);m.siguiente(turnoDe(c,'b'),rng2);assert.equal(ofertas(rng2,'fin_de_turno').length,0);
});
test('las ofertas llevan disparador y coste, y el modo pausado las espera',()=>{
 const c=campo([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2,efectos:[ef('golpe'),reaccion('previa',{disparador:'antes_ser_atacado',coste:2,principal:{contraatacar:{cantidad:1,caras:4}}})]}]);
 const p=m.actuarConReacciones(turnoDe(c,'a'),'a','hab:ha:golpe','k',()=>3);
 assert.equal(p.reaccion_pendiente.oferta.disparador,'antes_ser_atacado');assert.equal(p.reaccion_pendiente.oferta.coste,2);
 const r=m.responderReaccion(p,'k',true,()=>3);assert.equal(de(r,'a').vida,47);assert.equal(de(r,'k').ph,18);
});
