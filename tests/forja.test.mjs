import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
function cargar(path, dependencies={}) {
 const source=readFileSync(new URL(path,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const exports={};vm.runInNewContext(js,{exports,require:k=>dependencies[k],Map,Set,Number,Math,Object});return exports;
}
const stats=cargar('../lib/estadisticas.ts');
const f=cargar('../lib/forja.ts',{'./estadisticas':stats});
const categorias=[{id:'o',clave:'objetos',nombre:'Objetos'},{id:'a',clave:'armadura',nombre:'Armaduras',parent_id:'o'},{id:'c',clave:'cascos',nombre:'Cascos',parent_id:'a'}];
test('clasificación completa y filtros incluyen descendientes',()=>{
 assert.equal(f.rutaForja(categorias,'cascos'),'Objetos / Armaduras / Cascos');
 assert.equal(f.coincideClasificacion(categorias,'cascos','objetos'),true);
 assert.equal(f.coincideClasificacion(categorias,'cascos','armadura'),true);
 assert.equal(f.coincideClasificacion(categorias,'armadura','cascos'),false);
 assert.match(f.rutaForja(categorias,'antigua'),/Sin categoría disponible/);
});
test('fijos permiten cero y decimales sin confundirlos con rangos',()=>{
 assert.equal(f.validarValoresForja({armadura:0,peso:1.2}),null);
 assert.notEqual(f.validarValoresForja({vida:NaN}),null);
});
test('mallas aceptan rangos cerrados, ceros y decimales de peso',()=>{
 assert.equal(f.validarValoresForja({}, {vida:{min:0,max:0},peso:{min:.1,max:1.25}}),null);
});
test('mallas rechazan rangos vacíos, invertidos, infinitos y precisión inválida',()=>{
 for(const r of [{},{vida:{min:10,max:1}},{vida:{min:0,max:Infinity}},{peso:{min:.001,max:1}},{vida:{min:0,max:1000001}}])assert.notEqual(f.validarValoresForja({},r),null);
});
test('dados de daño usan cantidades enteras positivas',()=>{
 assert.equal(f.validarValoresForja({dados_dano:1,caras_dano:6,dano:0}),null);
 assert.notEqual(f.validarValoresForja({dados_dano:1.5}),null);
 assert.notEqual(f.validarValoresForja({},{caras_dano:{min:4.5,max:8}}),null);
});
