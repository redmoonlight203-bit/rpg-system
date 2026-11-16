import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import * as motor from '../supabase/functions/equipo-combate/motor.js';
// Caracterización de las defensas de Kion (plan del Yunque general, fase 2).
// La referencia se generó con el motor ANTERIOR a la migración a la primitiva «Reacción»;
// el motor migrado debe dar exactamente el mismo resultado en todas las combinaciones.
const REF=new URL('./fixtures/kion-defensas.json',import.meta.url);
const ATAQUES={
 fisico:{id:'golpe',nombre:'Golpe',efecto:'dano',cantidad:2,caras:8,modificador:0,coste_ph:0},
 magico_ph:{id:'rayo',nombre:'Rayo',efecto:'dano',cantidad:2,caras:8,modificador:0,coste_ph:2},
 magico:{id:'hechizo',nombre:'Hechizo',efecto:'dano',cantidad:2,caras:8,modificador:0,coste_ph:0,naturaleza:'magica'},
 leve:{id:'roce',nombre:'Roce',efecto:'dano',cantidad:1,caras:4,modificador:0,coste_ph:0},
};
const CONJUNTOS={
 completo:['inercia','absorcion','reciproco','ancla','reflejo'],
 sin_inercia:['absorcion','ancla','reflejo'],
 solo_inercia:['inercia'],
 inercia_reciproco:['inercia','reciproco'],
 inercia_absorcion:['inercia','absorcion'],
 inercia_reflejo:['inercia','reflejo'],
 ancla:['ancla'],
};
function escenario({conjunto,ataque,despierto,ph,salva,dado}){
 const efectos=CONJUNTOS[conjunto].map(d=>({id:'def_'+d,nombre:'Defensa '+d,efecto:'dano',cantidad:1,caras:4,modificador:0,coste_ph:2,ley_limitless:true,defensa:d}));
 const atacante={id:'a',nombre:'Atacante',stats:{vida:40,ph:100,armadura:0,salvacion:0},posicion:{x:1,y:1},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'Ataques',stats:{},efectos:Object.values(ATAQUES)}]}};
 const kion={id:'k',nombre:'Kion',stats:{vida:60,ph,armadura:0,salvacion:0},posicion:{x:2,y:1},recursos_especiales:{'Energía absorbida':8},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'d',nombre:'Defensas',stats:{},efectos}]}};
 let c=motor.iniciar(motor.agregar(motor.agregar(motor.nuevoCombate(),atacante,'enemigo',()=>20),kion,'jugador',()=>1));c.regla='directo';
 const k0=c.miembros.find(m=>m.id==='k');k0.ph=ph;if(despierto)k0.transformacion={definicion_id:'limitless'};
 const n=motor.actuar(c,'a','hab:h:'+ATAQUES[ataque].id,'k',caras=>caras===20?salva:dado);
 const k=n.miembros.find(m=>m.id==='k'),a=n.miembros.find(m=>m.id==='a');
 return {vida_k:k.vida,ph_k:k.ph,energia:k.recursos_especiales?.['Energía absorbida']??null,vida_a:a.vida,
  animacion:k.ultima_defensa?.animacion??null,
  registro:(n.registro||n.log||[]).map(x=>typeof x==='string'?x:x.texto||JSON.stringify(x)).filter(t=>/activa|recibe|reducción/.test(t))};
}
function rejilla(){
 const casos={};
 for(const conjunto of Object.keys(CONJUNTOS))for(const ataque of Object.keys(ATAQUES))for(const despierto of [false,true])for(const ph of [0,2,4,10])for(const salva of [3,14,20])for(const dado of [1,8]){
  const clave=[conjunto,ataque,despierto?'despierto':'normal','ph'+ph,'d20_'+salva,'dado'+dado].join('|');
  casos[clave]=escenario({conjunto,ataque,despierto,ph,salva,dado});
 }
 return casos;
}
test('las defensas de Kion dan el mismo resultado que el motor de referencia en todas las combinaciones',()=>{
 const actual=rejilla();
 if(!existsSync(REF)||process.env.ACTUALIZAR_REFERENCIA==='1'){writeFileSync(REF,JSON.stringify(actual,null,1));console.log('Referencia escrita:',Object.keys(actual).length,'casos');return;}
 const ref=JSON.parse(readFileSync(REF,'utf8'));
 assert.equal(Object.keys(actual).length,Object.keys(ref).length);
 for(const [clave,esperado] of Object.entries(ref))assert.deepEqual(actual[clave],esperado,clave);
});
