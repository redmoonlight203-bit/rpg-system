import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,campo,dados,de,turnoDe} from './helpers/campo-reacciones.mjs';
const conReaccion=(r,ph=20)=>campo([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2,stats:{ph},efectos:[ef('golpe'),ef('escudo',{cantidad:0,reaccion:{disparador:'despues_ser_atacado',principal:{reducir:{modo:'fijo',valor:1}},...r}})]}]);
const golpe=(c,rng=dados([3]))=>{const n=m.actuar(turnoDe(c,'a'),'a','hab:ha:golpe','k',rng);return {n,rng};};

test('sin PH suficientes no se ofrece; con PH se descuenta',()=>{
 assert.equal(golpe(conReaccion({coste:5},3)).rng.ofertas.length,0);
 const {n,rng}=golpe(conReaccion({coste:5},5));assert.equal(rng.ofertas.length,1);assert.equal(de(n,'k').ph,0);
});
test('sin coste propio usa el coste de la acción',()=>{
 const c=campo([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2,efectos:[ef('golpe'),ef('escudo',{cantidad:0,coste_ph:3,reaccion:{principal:{reducir:{modo:'fijo',valor:1}}}})]}]);
 assert.equal(de(golpe(c).n,'k').ph,17);
});
test('una reacción de un solo uso por encuentro no se ofrece la segunda vez',()=>{
 const uno=golpe(conReaccion({usos:{tipo:'encuentro',maximo:1}}));assert.equal(uno.rng.ofertas.length,1);
 const otra=uno.n;otra.ronda+=3;
 const dos=golpe(otra);assert.equal(dos.rng.ofertas.length,0);
});
test('los usos por turno se renuevan en la ronda siguiente',()=>{
 const uno=golpe(conReaccion({usos:{tipo:'turno',maximo:1}}));
 assert.equal(golpe(uno.n).rng.ofertas.length,0,'misma ronda');
 const siguiente=structuredClone(uno.n);siguiente.ronda++;assert.equal(golpe(siguiente).rng.ofertas.length,1);
});
test('el enfriamiento bloquea la siguiente activación',()=>{
 const uno=golpe(conReaccion({enfriamiento:1}));
 const r1=structuredClone(uno.n);r1.ronda++;assert.equal(golpe(r1).rng.ofertas.length,0,'ronda siguiente: enfriándose');
 const r2=structuredClone(uno.n);r2.ronda+=2;assert.equal(golpe(r2).rng.ofertas.length,1,'dos rondas después: lista');
});
test('rechazar la oferta no gasta usos ni PH',()=>{
 const {n}=golpe(conReaccion({coste:2,usos:{tipo:'encuentro',maximo:1}}),dados([3],()=>false));
 assert.equal(de(n,'k').ph,20);assert.equal(golpe(n).rng.ofertas.length,1);
});
test('la oferta informa de usos restantes y enfriamiento',()=>{
 const {rng}=golpe(conReaccion({coste:1,usos:{tipo:'encuentro',maximo:2},enfriamiento:1}));
 const o=rng.ofertas[0];assert.equal(o.usos_restantes,2);assert.equal(o.enfriamiento,1);assert.equal(o.coste,1);
});
