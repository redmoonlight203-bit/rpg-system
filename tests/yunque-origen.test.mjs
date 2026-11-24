import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {validarOrigen,leerOrigen,igualSinIds,anotarEditados,MENSAJE_ORIGEN}=cargarDependencia('yunque-origen');
const j=x=>JSON.parse(JSON.stringify(x));
const clon=x=>JSON.parse(JSON.stringify(x));
const origen=(editados=[])=>({plantilla:'rugido',fragmento:'plantilla-rugido',version:3,editados});
const borrador=(efectos,extra={})=>({efectos,reglas:[],reglas_pasivas:[],...extra});

test('validarOrigen acepta el formato y rechaza datos dañados',()=>{
 assert.equal(validarOrigen(undefined),null);
 assert.equal(validarOrigen(origen(['tablero','cantidad'])),null);
 const base=origen();
 for(const malo of [{...base,version:'3'},{...base,version:0},{...base,editados:'cantidad'},{...base,editados:['id']},{...base,editados:['origen']},{...base,editados:['a','a']},{...base,plantilla:'Rugido devastador'},{...base,fragmento:''},null,'x',[]])
  assert.equal(validarOrigen(malo),MENSAJE_ORIGEN,JSON.stringify(malo));
});

test('leerOrigen devuelve null para datos dañados y una copia para los válidos',()=>{
 assert.equal(leerOrigen(undefined),null);
 assert.equal(leerOrigen({...origen(),version:'3'}),null);
 const o=origen(['cantidad']);
 const l=leerOrigen(o);
 assert.deepEqual(j(l),o);
 assert.notEqual(l,o);
 assert.notEqual(l.editados,o.editados);
});

test('igualSinIds ignora ids anidados',()=>{
 const a={transformacion:{id:'a',etapas:[{id:'x',nombre:'E'}]}};
 assert.equal(igualSinIds(a,{transformacion:{id:'b',etapas:[{id:'y',nombre:'E'}]}}),true);
 assert.equal(igualSinIds(a,{transformacion:{id:'b',etapas:[{id:'y',nombre:'F'}]}}),false);
});

test('anotarEditados marca solo las claves que cambian',()=>{
 const antes=borrador([{id:'e1',cantidad:1,tablero:'a',origen:origen()}]);
 const d1=clon(antes);d1.efectos[0].cantidad=2;
 const r1=anotarEditados(antes,d1,['efectos',0,'cantidad']);
 assert.deepEqual(j(r1.efectos[0].origen.editados),['cantidad']);
 const d2=clon(r1);d2.efectos[0].tablero='b';
 const r2=anotarEditados(r1,d2,['efectos',0,'tablero']);
 assert.deepEqual(j(r2.efectos[0].origen.editados),['cantidad','tablero']);
});

test('anotarEditados no ensucia',()=>{
 const antes=borrador([{id:'e1',cantidad:1,origen:origen()},{id:'e2',cantidad:1}]);
 const igual=clon(antes);
 assert.equal(anotarEditados(antes,igual,['efectos',0,'cantidad']),igual);
 assert.equal(anotarEditados(antes,igual),igual);
 const cambiaOrigen=clon(antes);cambiaOrigen.efectos[0].origen.version=9;cambiaOrigen.efectos[0].id='otro';
 const r=anotarEditados(antes,cambiaOrigen);
 assert.equal(r,cambiaOrigen);
 assert.deepEqual(j(r.efectos[0].origen.editados),[]);
 const sinOrigen=clon(antes);sinOrigen.efectos[1].cantidad=5;
 const r2=anotarEditados(antes,sinOrigen);
 assert.equal('origen' in r2.efectos[1],false);
});

test('anotarEditados empareja por id cuando se sustituye la lista entera',()=>{
 const antes=borrador([{id:'e1',cantidad:1,origen:origen()},{id:'e2',cantidad:1,origen:{...origen(),fragmento:'otro'}}]);
 const despues=clon(antes);despues.efectos.reverse();despues.efectos[0].cantidad=7;
 const r=anotarEditados(antes,despues,['efectos']);
 const e2=r.efectos.find(e=>e.id==='e2'),e1=r.efectos.find(e=>e.id==='e1');
 assert.deepEqual(j(e2.origen.editados),['cantidad']);
 assert.deepEqual(j(e1.origen.editados),[]);
});

test('anotarEditados no muta sus entradas',()=>{
 const antes=borrador([{id:'e1',cantidad:1,origen:origen()}]);
 const despues=clon(antes);despues.efectos[0].cantidad=2;
 const a0=clon(antes),d0=clon(despues);
 anotarEditados(antes,despues,['efectos',0,'cantidad']);
 assert.deepEqual(antes,a0);assert.deepEqual(despues,d0);
});
