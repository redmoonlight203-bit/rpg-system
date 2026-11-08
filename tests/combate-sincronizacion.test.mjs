import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const esperar=ms=>new Promise(r=>setTimeout(r,ms));
function montar(cargar,activo=true){
 const efectos=[],listeners=new Map();let cambio,conectar,filtro,quitado=false;
 const eventos={addEventListener:(e,f)=>listeners.set(e,f),removeEventListener:e=>listeners.delete(e)};
 const canal={on:(_tipo,f,cb)=>{filtro=f;cambio=cb;return canal;},subscribe:cb=>{conectar=cb;return canal;}};
 const exports={},document={hidden:false,...eventos};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/useSincronizacionCombate.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>name==='react'?{useRef:v=>({current:v}),useCallback:f=>f,useEffect:fn=>efectos.push(fn)}:{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:'usuario'}}}})},channel:()=>canal,removeChannel:async()=>{quitado=true;}}},crypto,document,window:eventos,setTimeout,clearTimeout,setInterval,clearInterval});
 const refrescar=exports.useSincronizacionCombate(cargar,'encuentro',activo),limpiezas=efectos.map(f=>f());
 return {cambio:id=>cambio({new:{combate_id:id}}),conectar:()=>conectar('SUBSCRIBED'),filtro:()=>filtro,refrescar,document,listeners,limpiar:()=>limpiezas.forEach(f=>f?.()),quitado:()=>quitado};
}
test('consulta inicial, avisos agrupados y filtro del encuentro propio',async()=>{let veces=0;const h=montar(async()=>{veces++;});try{await esperar(90);assert.equal(veces,1);assert.equal(h.filtro().table,'combate_actualizaciones');assert.equal(h.filtro().filter,'user_id=eq.usuario');h.cambio('otro');await esperar(70);assert.equal(veces,1);h.cambio('encuentro');h.cambio('encuentro');await esperar(90);assert.equal(veces,2);h.conectar();await esperar(90);assert.equal(veces,3);}finally{h.limpiar();}assert.equal(h.quitado(),true);});
test('un aviso durante una consulta lenta se procesa sin consultas en paralelo',async()=>{let veces=0,resolver;const h=montar(()=>{veces++;if(veces===1)return new Promise(r=>resolver=r);});try{await esperar(90);h.cambio('encuentro');await esperar(90);assert.equal(veces,1);resolver();await esperar(300);assert.equal(veces,2);}finally{h.limpiar();}});
test('no pierde cambios mientras el personaje está ejecutando una acción',async()=>{let bloqueado=true,veces=0;const h=montar(async()=>{if(bloqueado)return false;veces++;});try{await esperar(90);assert.equal(veces,0);bloqueado=false;await esperar(300);assert.equal(veces,1);h.document.hidden=true;h.cambio('encuentro');await esperar(90);assert.equal(veces,1);h.document.hidden=false;h.listeners.get('visibilitychange')();await esperar(90);assert.equal(veces,2);}finally{h.limpiar();}});
test('el aviso global queda desactivado dentro del combate y limpia los temporizadores',async()=>{let veces=0;const h=montar(async()=>{veces++;},false);h.refrescar();await esperar(90);assert.equal(veces,0);h.limpiar();assert.equal(h.listeners.size,0);});
