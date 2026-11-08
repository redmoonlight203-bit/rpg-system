import {cargarDependencia} from './helpers/cargar-ts.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync(new URL('../lib/combate.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function cargar(entropia){const exports={};vm.runInNewContext(source,{exports,require:cargarDependencia,crypto:{getRandomValues(a){a[0]=entropia();return a;}}});return exports.dadoSeguro;}
test('todas las caras, incluidos los extremos, son alcanzables sin favorecer las bajas',()=>{
 for(const caras of [4,6,8,10,12,20,100,1000]){
  let n=0;const dado=cargar(()=>n++),cuentas=Array(caras).fill(0);
  for(let i=0;i<caras*100;i++)cuentas[dado(caras)-1]++;
  assert.ok(cuentas.every(n=>n===100),`d${caras}: cada cara debe tener igual frecuencia`);
 }
});
test('descarta la cola que introduciría sesgo al dividir el rango de 32 bits',()=>{
 const cola=[4294967295,4294967294,4294967293,4294967292,19];let llamadas=0;
 const dado=cargar(()=>{llamadas++;return cola.shift();});
 assert.equal(dado(20),20);assert.equal(llamadas,5);
});
test('dos tiradas independientes pueden repetir el mismo resultado',()=>{
 const dado=cargar(()=>20);assert.equal(dado(20),1);assert.equal(dado(20),1);
});
test('caras inválidas fallan antes de consumir azar o bloquear la mesa',()=>{
 const dado=cargar(()=>{throw Error('No debe pedir entropía');});
 for(const caras of [0,1,-1,2.5,NaN,Infinity,4294967297])assert.throws(()=>dado(caras),/caras enteras/);
});
