import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,campoE} from './helpers/campo-estados.mjs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const el=cargarDependencia('elementos');
const golpe=(efecto,d,miembros)=>m.actuar(turnoDe(campoE(miembros||[{id:'a',bando:'enemigo',x:1,efectos:[efecto]},{id:'k',bando:'jugador',x:2}]),'a'),'a','hab:ha:'+efecto.id,'k',dados(d));
const infernal={id:'fuego_infernal',nombre:'Fuego infernal',base:'fuego',color:'#ff3300',dados_extra:{cantidad:2,caras:6},ignora_armadura:4,al_impactar:[{estado:'aturdido',salvacion:null}],cadena:{dano:5}};

test('el catálogo base es válido y reproduce las reglas históricas',()=>{
 for(const d of el.CATALOGO_ELEMENTOS)assert.equal(el.validarDefinicionElemento(d),null,d.id);
 assert.equal(el.elementoBase('electricidad').ignora_armadura,3);
 assert.equal(el.elementoBase('luz_sagrada').ignora_armadura,5);
 assert.equal(el.definicionElemento('ninguno'),undefined);
});
test('definicionElemento usa la variante solo para su propio elemento base',()=>{
 assert.equal(el.definicionElemento('fuego',infernal).nombre,'Fuego infernal');
 assert.equal(el.definicionElemento('hielo',infernal).nombre,'Hielo');
});
test('validación de variantes',()=>{
 assert.equal(el.validarDefinicionElemento(infernal),null);
 assert.match(el.validarDefinicionElemento({...infernal,base:'oscuridad'}),/base/);
 assert.match(el.validarDefinicionElemento({...infernal,dados_extra:{cantidad:0,caras:6}}),/Dados/);
 assert.match(el.validarDefinicionElemento({...infernal,al_impactar:[{estado:'inexistente'}]}),/desconocido/);
 assert.match(el.describirElemento(infernal),/\+2d6.*ignora 4 ARM.*Aturdido.*5 de daño/);
});
test('una habilidad sin variante hace exactamente lo de siempre (fuego: 1d6 + 1d4)',()=>{
 assert.equal(de(golpe(ef('tajo',{elemento:'fuego'}),[3,30]),'k').vida,43);
});
test('variante: dados extra propios, estado al impactar sin salvación',()=>{
 const n=golpe(ef('llama',{elemento:'fuego',elemento_def:infernal}),[3,2]);
 assert.equal(de(n,'k').vida,50-3-2-2,'1d6=3 + 2d6 (2+2)');
 assert.ok(de(n,'k').estados.some(s=>s.tipo==='aturdido'||s.id==='aturdido'),'queda aturdido');
 assert.ok(!de(n,'k').estados.some(s=>s.tipo==='quemadura'),'ya no usa la Quemadura de la base');
 assert.ok(n.registro.some(l=>/Daño elemental Fuego infernal: 2d6/.test(String(l))),'el registro nombra la variante');
});
test('variante: ignora su propia armadura y salta en cadena',()=>{
 const efecto=ef('llama',{elemento:'fuego',elemento_def:{...infernal,al_impactar:[]}});
 const c=campoE([{id:'a',bando:'enemigo',x:1,efectos:[efecto]},{id:'k',bando:'jugador',x:2,stats:{armadura:4}},{id:'j',bando:'jugador',x:3}],{regla:'reduccion'});
 c.miembros.find(x=>x.id==='k').grupo_cercania='A';c.miembros.find(x=>x.id==='j').grupo_cercania='A';
 const n=m.actuar(turnoDe(c,'a'),'a','hab:ha:llama','k',dados([3,1]));
 assert.equal(de(n,'k').vida,45,'1d6=3 + 2d6=2 = 5; ARM 4 ignorada');
 assert.equal(de(n,'j').vida,45,'chispa de 5');
});
test('una variante cuya base no coincide con el elemento se ignora (sigue la base)',()=>{
 const n=golpe(ef('tajo',{elemento:'hielo',elemento_def:infernal}),[3,30]);
 assert.equal(de(n,'k').vida,43);
});
