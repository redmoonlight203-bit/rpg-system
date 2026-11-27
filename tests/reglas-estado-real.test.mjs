import {test} from 'node:test';import assert from 'node:assert/strict';
import * as c from '../supabase/functions/equipo-combate/motor.js';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const reglas=cargarDependencia('reglas');
const regla=efecto=>({id:'r',nombre:'Hechizo',evento:'usar',condicion:{tipo:'siempre'},efectos:[efecto],coste_ph:0,coste_fatiga:0,enfriamiento:0,usos:0,prioridad:0});
function campo(efecto,inmunidades){
 let b=c.nuevoCombate();
 for(const [id,bando,x] of [['a','jugador',0],['b','enemigo',1]])b=c.agregar(b,{id,forja_id:null,nombre:id,posicion:{x,y:1},stats:{vida:30,ph:10,armadura:0},configuracion:{tipo_creacion:'personaje',reglas:id==='a'?[regla(efecto)]:[],
  habilidades:id==='b'&&inmunidades?[{id:'piel',nombre:'Piel',stats:{},efectos:[{id:'p',nombre:'Piel',efecto:'estado',solo_pasivo:true,estado_tipo:'narrativo',estado:'Piel',cantidad:0,caras:6,modificador:0,coste_ph:0,duracion:0,inmunidades}]}]:[]}},bando,()=>id==='a'?20:1);
 return c.iniciar(b);
}
const sopor={id:'sopor_toxico',nombre:'Sopor tóxico',categoria:'mental',subcategoria:'control',duracion:{tipo:'turnos',turnos:2},efectos:[{tipo:'perder_turno'},{tipo:'capa',capa:'subsuelo'}]};

test('una regla aplica de verdad un estado del catálogo (con sus primitivas)',()=>{
 const n=c.actuar(campo({tipo:'estado',destino:'objetivo',clave:'dormido',nombre:'Dormido'}),'a','regla:propio:r','b',()=>4);
 const b=n.miembros.find(m=>m.id==='b');
 const s=b.estados.find(e=>e.tipo==='dormido');
 assert.ok(s,'Dormido aplicado como estado');assert.equal(s.restantes,3);
 assert.equal(c.estadosVisibles(b)[0].icono,'sueno');
});

test('una regla aplica un estado del grimorio con su copia',()=>{
 const n=c.actuar(campo({tipo:'estado',destino:'objetivo',clave:sopor.id,nombre:'Sopor',estado_def:sopor}),'a','regla:propio:r','b',()=>4);
 const b=n.miembros.find(m=>m.id==='b');
 assert.ok(b.estados.some(e=>e.tipo===sopor.id&&e.def));
 assert.equal(c.capaCombatiente(b),'subsuelo');
});

test('una clave propia («furia») sigue siendo un modificador, como antes',()=>{
 const n=c.actuar(campo({tipo:'estado',destino:'yo',clave:'furia',nombre:'Furia'}),'a','regla:propio:r','a',()=>4);
 const a=n.miembros.find(m=>m.id==='a');
 assert.equal(a.estados.some(e=>e.tipo==='furia'),false);
 assert.ok(a.motor.modificadores.some(x=>x.clave==='furia'));
});

test('las inmunidades bloquean el estado aplicado por una regla',()=>{
 const n=c.actuar(campo({tipo:'estado',destino:'objetivo',clave:'dormido'},[{tipo:'categoria',valor:'mental',modo:'inmune'}]),'a','regla:propio:r','b',()=>4);
 assert.equal(n.miembros.find(m=>m.id==='b').estados.some(e=>e.tipo==='dormido'),false);
});

test('la copia del grimorio se valida con la regla',()=>{
 const base=regla({tipo:'estado',destino:'objetivo',clave:sopor.id,estado_def:sopor});
 assert.equal(reglas.validarReglas([base]),null);
 assert.match(reglas.validarReglas([regla({tipo:'estado',destino:'objetivo',clave:'otro',estado_def:sopor})]),/no coincide/);
 assert.ok(reglas.validarReglas([regla({tipo:'estado',destino:'objetivo',clave:sopor.id,estado_def:{...sopor,duracion:{tipo:'turnos',turnos:0}}})]));
});
