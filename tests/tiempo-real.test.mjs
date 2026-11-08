import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const espera=()=>new Promise(r=>setTimeout(r,170));
function montar(cargar){
 const efectos=[],listeners=new Map();let cambio,conectar,quitado=false;
 const eventos={addEventListener:(e,f)=>listeners.set(e,f),removeEventListener:e=>listeners.delete(e)};
 const canal={on:(_tipo,_filtro,cb)=>{cambio=cb;return canal;},subscribe:cb=>{conectar=cb;return canal;}};
 const exports={};const document={hidden:false,...eventos};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/useTiempoReal.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>name==='react'?{useRef:v=>({current:v}),useEffect:fn=>efectos.push(fn)}:{supabase:{channel:()=>canal,removeChannel:async()=>{quitado=true;}}},crypto,document,window:eventos,setTimeout,clearTimeout,setInterval,clearInterval});
 exports.useTiempoReal(cargar);const limpiezas=efectos.map(f=>f());
 return {cambio:()=>cambio(),conectar:()=>conectar('SUBSCRIBED'),document,listeners,limpiar:()=>limpiezas.forEach(f=>f?.()),quitado:()=>quitado};
}
test('agrega ráfagas de cambios y vuelve a consultar después de reconectar',async()=>{let veces=0;const h=montar(async()=>{veces++;});try{h.cambio();h.cambio();h.cambio();await espera();assert.equal(veces,1);h.conectar();await espera();assert.equal(veces,2);}finally{h.limpiar();}assert.equal(h.quitado(),true);assert.equal(h.listeners.size,0);});
test('una consulta lenta conserva el aviso siguiente y no lanza consultas paralelas',async()=>{let veces=0,resolver;const h=montar(()=>{veces++;if(veces===1)return new Promise(r=>resolver=r);});try{h.cambio();await espera();h.cambio();await espera();assert.equal(veces,1);resolver();await espera();assert.equal(veces,2);}finally{h.limpiar();}});
test('al volver a una pestaña visible recupera cambios y al desmontar cancela avisos',async()=>{let veces=0;const h=montar(()=>{veces++;});h.document.hidden=true;h.cambio();await espera();assert.equal(veces,0);h.document.hidden=false;h.listeners.get('visibilitychange')();await espera();assert.equal(veces,1);h.cambio();h.limpiar();await espera();assert.equal(veces,1);});
