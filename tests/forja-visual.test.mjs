import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const nativeRequire=createRequire(import.meta.url),cache=new Map();
function cargar(path){
 if(cache.has(path))return cache.get(path);
 const exports={};cache.set(path,exports);
 const require=name=>{
  if(name.endsWith('.css'))return {};
  if(!name.startsWith('.'))return nativeRequire(name);
  const base=resolve(dirname(path),name),p=['.tsx','.ts','.js'].map(ext=>base+ext).find(existsSync);
  return p?cargar(p):nativeRequire(base);
 };
 vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{fileName:path,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,require,crypto,console,setTimeout,clearTimeout,URL,Blob});
 return exports;
}
const raiz=resolve(dirname(new URL(import.meta.url).pathname),'..');
const reglas=cargar(resolve(raiz,'lib/reglas.ts'));
const creacion=cargar(resolve(raiz,'lib/creacion.ts'));
const render=(archivo,componente,props)=>renderToStaticMarkup(React.createElement(cargar(resolve(raiz,archivo))[componente],props));
test('las reglas se editan visualmente, mantienen el laboratorio y se reutilizan por archivo',()=>{
 const value=reglas.receta('furia'),antes=JSON.stringify(value);
 const html=render('components/EditorReglas.tsx','EditorReglas',{value,onChange:()=>{}});
 assert.match(html,/Recorrido de la regla/);assert.match(html,/Arrastrar reglas/);assert.match(html,/Abrir reglas guardadas/);assert.match(html,/type="file"/);assert.doesNotMatch(html,/Reglas JSON|Aplicar JSON|font-mono/);assert.match(html,/Laboratorio/);assert.equal(JSON.stringify(value),antes);
});
test('acciones y transformaciones muestran controles de orden y conservan su configuración',()=>{
 const e={...creacion.nuevoEfecto(),nombre:'Etapas del alma',efecto:'transformacion',transformacion:{id:'t',nombre:'Etapas',tipo:'forma',etapas:[{id:'e1',nombre:'Primera',stats:{vida:20}},{id:'e2',nombre:'Segunda',stats:{vida:40}}]}};
 const antes=structuredClone(e),html=render('components/EditorDados.tsx','EditorDados',{value:[e],onChange:()=>{}});
 assert.match(html,/Arrastrar acciones 1/);assert.match(html,/Arrastrar etapas 2/);assert.match(html,/Subir etapas 2/);assert.match(html,/Primera/);assert.match(html,/Segunda/);assert.deepEqual(e,antes);
});
test('la selección de creaciones admite tarjetas, arrastre y alternativas para tocar',()=>{
 const html=render('components/SelectorCreacionVisual.tsx','default',{nombre:'Equipo',items:[{id:'a',nombre:'Espada',clase:'C'},{id:'b',nombre:'Arco'}],value:['a'],onChange:()=>{}});
 assert.match(html,/draggable="true"/);assert.match(html,/aria-pressed="true"/);assert.match(html,/Quitar Espada/);assert.match(html,/Arrastra una tarjeta aquí o tócala/);
});
