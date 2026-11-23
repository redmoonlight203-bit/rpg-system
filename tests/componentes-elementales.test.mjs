import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,campoE} from './helpers/campo-estados.mjs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const golpe=(efecto,d)=>m.actuar(turnoDe(campoE([{id:'a',bando:'enemigo',x:1,efectos:[efecto]},{id:'k',bando:'jugador',x:2}]),'a'),'a','hab:ha:'+efecto.id,'k',dados(d));
test('un efecto antiguo da el mismo daño',()=>{
 assert.equal(de(golpe(ef('tajo',{elemento:'fuego'}),[3,30]),'k').vida,43,'1d6=3 + 1d4=4');
});
test('un efecto con dos componentes suma por separado',()=>{
 const doble=ef('doble',{componentes:[{id:'base',elemento:'fuego',cantidad:1,caras:6,origen:'base'},{id:'p',elemento:'electricidad',cantidad:1,caras:6,origen:'potenciador'}]});
 const n=golpe(doble,[3]);
 assert.equal(de(n,'k').vida,38,'(3+3) fuego + (3+3) rayo');
 assert.match(n.registro.join('\n'),/Daño por componente: fuego 6 \+ electricidad 6 = 12/);
});
test('validación: máximo 3 componentes con elementos de la lista',()=>{
 const deps={'./estadisticas':{},'./vision':cargarDependencia('./vision'),'./rasgos':cargarDependencia('./rasgos'),'./inmunidades':cargarDependencia('./inmunidades'),'./estados':cargarDependencia('./estados')};
 const c=cargarDependencia('./creacion',{});
 const comp=(elemento)=>({id:elemento,elemento,cantidad:1,caras:6,origen:'base'});
 const base={...c.nuevoEfecto(),nombre:'X',efecto:'dano',cantidad:1,caras:6};
 assert.equal(c.validarEfectos([{...base,componentes:[comp('fuego'),comp('hielo')]}]),null);
 assert.match(c.validarEfectos([{...base,componentes:['fuego','hielo','agua','electricidad'].map(comp)}]),/3 componentes/);
 assert.match(c.validarEfectos([{...base,componentes:[comp('plasma')]}]),/componentes/);
 void deps;
});
