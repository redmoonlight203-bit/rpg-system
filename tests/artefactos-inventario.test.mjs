import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {artefactoVacio,nivelVacio,devorar,bonosAbsorbidos,validarArtefacto,TRAMOS_BASE,absorber}=cargarDependencia('artefactos');
const espada={nombre:'Copia de prueba',stats:{armadura:2},habilidades:[{id:'h1',nombre:'Guardia'}],pasivas:[]};

test('consumir tres copias conserva el origen y alcanza exactamente el nivel 2 aunque se renombre el contador',()=>{
 const id='consumo_'+crypto.randomUUID();
 const a={...artefactoVacio(),contadoresConsumo:[{id,nombre:'Hambre'}]};
 a.niveles.push({...nivelVacio(2),condicion_subida:{tipo:'contador',contador:id,meta:3}});
 assert.equal(validarArtefacto(a),null);
 let p={nivel:1,absorbidas:[]};
 for(let i=1;i<=3;i++){
  a.contadoresConsumo[0].nombre='Objetos devorados';
  const anterior=p;
  p=devorar(a,p,espada,caras=>caras);
  assert.equal(anterior.absorbidas.length,i-1);
  assert.equal(p.nivel,i===3?2:1);
 }
 assert.equal(espada.stats.armadura,2);
 assert.equal(bonosAbsorbidos(p).stats.armadura,6);
 assert.equal(bonosAbsorbidos(p).habilidades.length,1);
});

test('los extremos de cada intervalo d100 eligen el tramo configurado',()=>{
 for(const t of TRAMOS_BASE)for(const valor of [t.desde,t.hasta]){
  let primera=true;
  const r=absorber(espada,TRAMOS_BASE,()=>{if(primera){primera=false;return valor}return 1});
  assert.equal(r.tramo,t.nombre);
 }
});
