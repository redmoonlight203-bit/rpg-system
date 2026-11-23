import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {ESQUELETOS_BASE,validarEsqueleto,copiarEsqueleto,esqueletoPorNombre,duracionGesto}=cargarDependencia('./esqueletos');
test('los seis esqueletos base se validan',()=>{
 assert.equal(JSON.stringify(ESQUELETOS_BASE.map(e=>e.id)),JSON.stringify(['espada','hacha','lanza','arco','baston','punos']));
 for(const e of ESQUELETOS_BASE)assert.equal(validarEsqueleto(e),null,e.id);
});
test('validación de anclas y fases',()=>{
 const e=ESQUELETOS_BASE[0];
 assert.match(validarEsqueleto({...e,anclas:e.anclas.slice(0,2)}),/mango, centro, punta/);
 assert.match(validarEsqueleto({...e,anclas:[...e.anclas,{id:'objeto',x:10,y:10}]}),/impacto corto/);
 assert.match(validarEsqueleto({...e,anclas:e.anclas.map(a=>({...a,x:120}))}),/0 a 96/);
 assert.match(validarEsqueleto({...e,fases:{preparacion:0,impacto:10,recuperacion:0}}),/30 ms/);
 assert.match(validarEsqueleto({...e,fases:{preparacion:1500,impacto:1000,recuperacion:0}}),/2,4 s/);
 assert.equal(validarEsqueleto(ESQUELETOS_BASE.find(x=>x.id==='punos')),null,'los puños pueden llevar un objeto (ancla opcional)');
});
test('copiar un esqueleto crea uno nuevo con su base',()=>{
 const g=copiarEsqueleto(ESQUELETOS_BASE[1],'guadana','Guadaña');assert.equal(g.base,'hacha');assert.equal(validarEsqueleto(g),null);
 assert.ok(duracionGesto(g)>0);
});
test('respaldo por nombre para creaciones antiguas',()=>{
 assert.equal(esqueletoPorNombre('Hacha de guerra'),'hacha');assert.equal(esqueletoPorNombre('Martillo'),'hacha');
 assert.equal(esqueletoPorNombre('Lanza larga'),'lanza');assert.equal(esqueletoPorNombre('Bastón de roble'),'baston');
});
