import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
export function cargarDependencia(nombre){
 const exports={};
 const source=readFileSync(new URL('../../lib/'+nombre.replace('./','')+'.ts',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:cargarDependencia,crypto,JSON,Array,Object,Math,Number,Set,Map,Error});
 return exports;
}
