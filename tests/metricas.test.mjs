import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const exports={};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/metricas-combate.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,TextEncoder,performance,Date,Set,Number,Math,JSON});
test('p95 exige 30 éxitos, separa errores y mide UTF-8 real',()=>{
 exports.limpiarMetricas();for(let n=1;n<=29;n++)exports.registrarMetrica('confirmacion',n,true);
 exports.registrarMetrica('confirmacion',999,false);assert.equal(exports.resumenMetricas()[0].suficientes,false);
 exports.registrarMetrica('confirmacion',30,true,exports.bytesJSON('ñ'));
 const r=exports.resumenMetricas()[0];assert.equal(r.p95,29);assert.equal(r.errores,1);assert.equal(r.correctas,30);assert.equal(r.bytes_maximos,4);assert.equal(r.suficientes,true);
 const reporte=exports.exportarMetricas({commit:'abc',rama:'main',entorno:'local'});assert.equal(reporte.version.commit,'abc');assert.equal(reporte.muestras.length,31);
});
test('consulta registra error de transporte y tamaño de respuesta sin contenido',async()=>{
 exports.limpiarMetricas();await exports.medirConsulta('http.consulta_ligera',async()=>({data:{vida:3},error:null}));
 await assert.rejects(exports.medirConsulta('http.consulta_ligera',async()=>{throw Error('red');}),/red/);
 const r=exports.resumenMetricas()[0];assert.equal(r.errores,1);assert.equal(r.correctas,1);assert.equal(r.bytes_maximos,exports.bytesJSON({vida:3}));assert.equal(JSON.stringify(exports.exportarMetricas({})).includes('vida'),false);
});
