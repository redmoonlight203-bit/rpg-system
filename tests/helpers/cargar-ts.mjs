import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
export function cargarDependencia(nombre,extras={}){
 if(nombre.endsWith('.json'))return {default:JSON.parse(readFileSync(new URL('../../lib/'+nombre,import.meta.url),'utf8'))};
 const exports={};
 const source=readFileSync(new URL('../../lib/'+nombre.replace('./','')+'.ts',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>cargarDependencia(n,extras),crypto,JSON,Array,Object,Math,Number,Set,Map,Error,structuredClone,console,setTimeout,clearTimeout,...extras});
 return exports;
}
