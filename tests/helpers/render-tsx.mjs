import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

export const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const nativeRequire = createRequire(import.meta.url);
const cache = new Map();

function cargar(archivo) {
  if (cache.has(archivo)) return cache.get(archivo);
  const exports = {};
  cache.set(archivo, exports);
  const require = nombre => {
    if (nombre.endsWith('.css')) return {};
    if (nombre.endsWith('/imagenes-storage')) {
      return {publicarArchivoImagen: async () => { throw Error('No se suben imágenes durante render'); }};
    }
    if (nombre === 'next/link') {
      return ({href, children, ...props}) => React.createElement('a', {...props, href}, children);
    }
    if (nombre === 'next/navigation') return {useRouter: () => ({push() {}})};
    if (!nombre.startsWith('.')) return nativeRequire(nombre);
    const base = resolve(dirname(archivo), nombre);
    const ruta = ['.tsx','.ts','.js'].map(ext => base + ext).find(existsSync);
    return ruta ? cargar(ruta) : nativeRequire(base);
  };
  try {
    const {outputText} = ts.transpileModule(readFileSync(archivo, 'utf8'), {
      fileName: archivo,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
      },
    });
    vm.runInNewContext(outputText, {exports, require, crypto, console, setTimeout, clearTimeout, URL, Blob}, archivo);
    return exports;
  } catch (error) {
    cache.delete(archivo);
    throw error;
  }
}

export function cargarTsx(rutaRelativaDesdeRaiz) {
  return cargar(resolve(raiz, rutaRelativaDesdeRaiz));
}

export function renderizar(ruta, componente, props, envoltorio = el => el) {
  const {DialogoProvider} = cargarTsx('components/Dialogo.tsx');
  const el = React.createElement(cargarTsx(ruta)[componente], props);
  return renderToStaticMarkup(React.createElement(DialogoProvider, null, envoltorio(el)));
}
