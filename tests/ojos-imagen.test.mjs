import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';
import {cargarDependencia} from './helpers/cargar-ts.mjs';

const require = createRequire(import.meta.url);
const vision = cargarDependencia('./vision');
function montar(path, dependencias = {}) {
 const memoria = [];
 let cursor = 0;
 const hooks = {
  useId:()=>':eye:',
  useLayoutEffect:f=>void f(),
  useState(initial) {
   const i = cursor++;
   if (!(i in memoria)) memoria[i] = initial;
   return [memoria[i], v => { memoria[i] = v; }];
  },
  useRef(valor) {
   const i = cursor++;
   return memoria[i] ??= {current:valor};
  },
 };
 const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url),'utf8'),{
  compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},
 }).outputText;
 const exports = {};
 vm.runInNewContext(code,{exports,Error,require:n=>n==='react'?hooks:n.endsWith('.css')?{}:dependencias[n]??require(n)});
 return props => {cursor=0;return exports.default(props);};
}
function buscar(el,condicion) {
 if (Array.isArray(el)) return el.flatMap(x=>buscar(x,condicion));
 if (!React.isValidElement(el)) return [];
 return [...(condicion(el)?[el]:[]), ...buscar(el.props.children,condicion)];
}
const porTipo=(el,t)=>buscar(el,x=>x.type===t)[0];

test('el ojo completo se centra conservando las proporciones; si el enlace falla, vuelve el dibujo',()=>{
 const dibujar=montar('../components/OjoVisual.tsx');
 const apariencia={...vision.nuevaVision().apariencia,imagen_url:'https://img.example/ojos.webp',imagen_ajuste:'completa'};
 const svg=dibujar({apariencia,nombre:'Rei-Gan'});
 const hijo=buscar(svg,x=>typeof x.type==='function')[0];
 // El render del hijo mantiene su propio estado, igual que en el editor y el tablero.
 const estados=[];
 const código=ts.transpileModule(readFileSync(new URL('../components/OjoVisual.tsx',import.meta.url),'utf8')+'\nexport {IlustracionOjo};',{
  compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},
 }).outputText;
 const exports={};
 vm.runInNewContext(código,{exports,require:n=>n==='react'?{useState:init=>[estados[0]??init,v=>{estados[0]=v;}]}:n.endsWith('.css')?{}:require(n)});
 const vista=()=>exports.IlustracionOjo(hijo.props);
 const imagen=porTipo(vista(),'image');
 assert.equal(imagen.props.href,apariencia.imagen_url);
 assert.equal(imagen.props.preserveAspectRatio,'xMidYMid meet');
 assert.equal(imagen.props.width,92);
 assert.equal(imagen.props.clipPath,undefined);
 assert.ok(porTipo(vista(),'circle'));
 imagen.props.onLoad();
 assert.equal(porTipo(vista(),'image').props.opacity,1);
 assert.equal(porTipo(vista(),'circle'),undefined);
 porTipo(vista(),'image').props.onError();
 assert.equal(porTipo(vista(),'image'),undefined);
 assert.ok(porTipo(vista(),'circle'));
 const otro=buscar(dibujar({nombre:'Rei-Gan',apariencia:{...apariencia,imagen_url:'/otro.webp',imagen_ajuste:undefined}}),x=>typeof x.type==='function')[0];
 assert.notEqual(hijo.key,otro.key);
 estados.length=0;
 const heredada=porTipo(exports.IlustracionOjo(otro.props),'image');
 assert.equal(heredada.props.preserveAspectRatio,'xMidYMid slice');
 assert.match(heredada.props.clipPath,/circulo/);
});

test('subir guarda una URL reutilizable, conserva la última edición y no pisa una URL manual',async()=>{
 const Texto=()=>null;
 let completar, rechazar;
 const publicarArchivoImagen=()=>new Promise((res,rej)=>{completar=res;rechazar=rej;});
 const mostrar=montar('../components/yunque/editores/ImagenOjo.tsx',{
  '../Controles':{Texto}, '../../../lib/imagenes-storage':{publicarArchivoImagen},
 });
 let actual='', ajuste; const cambios=[];
 const vista=(nota='')=>mostrar({valor:actual,ajuste,onChange:(url,a)=>{actual=url;ajuste=a;cambios.push([url,nota,a]);}});
 const tick=()=>new Promise(r=>setImmediate(r));
 async function elegir(){
  const input=porTipo(vista(),'input');
  assert.equal(input.props.accept,'image/png,image/jpeg,image/webp');
  const currentTarget={files:[{type:'image/png',name:'ojo.png'}],value:'ojo.png'};
  input.props.onChange({currentTarget});
  assert.equal(currentTarget.value,'');
  await tick();
 }
 await elegir();
 vista('edición posterior');
 const url='https://img.example/ojos.webp';
 completar(url);
 await tick();
 assert.deepEqual(cambios,[[url,'edición posterior','completa']]);
 assert.equal(vision.validarVision({...vision.nuevaVision(),apariencia:{...vision.nuevaVision().apariencia,imagen_url:actual}}),null);
 await elegir();
 porTipo(vista(),Texto).props.onChange(' https://img.example/manual.png ');
 completar('https://img.example/antigua.webp');
 await tick();
 assert.equal(actual,'https://img.example/manual.png');
 await elegir();
 rechazar(new Error('Archivo no admitido'));
 await tick();
 assert.equal(buscar(vista(),x=>x.props.role==='alert')[0].props.children,'Archivo no admitido');
 assert.equal(actual,'https://img.example/manual.png');
 buscar(vista(),x=>x.props.children==='Quitar imagen')[0].props.onClick();
 assert.equal(actual,'');
});
