// Carga componentes .tsx sin Next y los renderiza a HTML estático (react-dom/server).
// Stubs: hojas .css, subida de imágenes, next/link y next/navigation. El árbol se envuelve en el
// DialogoProvider real porque useDialogo lo exige.
import {readFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

export const raiz=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const nativeRequire=createRequire(import.meta.url),cache=new Map();
const Link=({href,children,...props})=>React.createElement('a',{href:String(href),...props},children);
const stubs={
 'next/link':{__esModule:true,default:Link},
 'next/navigation':{useRouter:()=>({push(){},replace(){},back(){}}),usePathname:()=>'/dm/forja',useSearchParams:()=>new URLSearchParams()},
};
// Cliente falso: las consultas no devuelven filas (el render estático no ejecuta efectos de todos modos).
const consulta={select:()=>consulta,eq:()=>consulta,order:()=>consulta,maybeSingle:async()=>({data:null,error:null}),single:async()=>({data:null,error:null})};
const supabaseFalso={from:()=>consulta,rpc:async()=>({data:null,error:null}),auth:{getSession:async()=>({data:{session:null}})}};
function cargar(path){
 if(cache.has(path))return cache.get(path);
 const exports={};cache.set(path,exports);
 const require=name=>{
  if(name.endsWith('.css'))return {};
  if(stubs[name])return stubs[name];
  if(name.endsWith('/lib/supabase'))return {supabase:supabaseFalso};
  if(name.endsWith('/imagenes-storage'))return {publicarArchivoImagen:async()=>{throw Error('No se suben imágenes durante render');}};
  if(!name.startsWith('.'))return nativeRequire(name);
  const base=resolve(dirname(path),name),p=['.tsx','.ts','.js','/index.ts','/index.tsx'].map(ext=>base+ext).find(existsSync);
  return p?cargar(p):nativeRequire(base);
 };
 vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{fileName:path,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,
  {exports,require,crypto,console,setTimeout,clearTimeout,URL,URLSearchParams,Blob,JSON,structuredClone});
 return exports;
}
export function cargarTsx(ruta){return cargar(resolve(raiz,ruta));}
export function renderizar(ruta,componente,props){
 const {DialogoProvider}=cargarTsx('components/Dialogo.tsx');
 const C=cargarTsx(ruta)[componente];
 if(!C)throw Error(`${ruta} no exporta ${componente}`);
 return renderToStaticMarkup(React.createElement(DialogoProvider,null,React.createElement(C,props)));
}
