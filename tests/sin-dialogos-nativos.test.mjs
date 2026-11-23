import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
// Los diálogos del navegador rompen la ambientación: todo aviso o confirmación pasa por components/Dialogo.tsx.
const raiz=new URL('..',import.meta.url).pathname;
const EXCLUIDOS=new Set(['components/Dialogo.tsx']);
function* recorrer(dir){
 for(const n of readdirSync(join(raiz,dir))){
  const rel=dir+'/'+n;
  if(statSync(join(raiz,rel)).isDirectory())yield* recorrer(rel);
  else if(/\.(tsx?|jsx?|mjs)$/.test(n))yield rel;
 }
}
const PATRON=/window\.(confirm|alert|prompt)\s*\(|(^|[^.\w$])(confirm|alert|prompt)\s*\(/;
test('ni app/ ni components/ usan window.confirm, window.alert o window.prompt',()=>{
 const hallados=[];
 for(const dir of ['app','components'])for(const f of recorrer(dir)){
  if(EXCLUIDOS.has(f))continue;
  readFileSync(join(raiz,f),'utf8').split('\n').forEach((linea,i)=>{
   const sinComentario=linea.replace(/\/\/.*$/,'');
   if(PATRON.test(sinComentario))hallados.push(`${f}:${i+1}: ${linea.trim().slice(0,120)}`);
  });
 }
 assert.deepEqual(hallados,[]);
});
test('el patrón detecta las formas prohibidas y respeta los métodos propios',()=>{
 for(const malo of ['window.confirm("x")','if(confirm("x"))','alert(x)',' prompt("n")'])assert.ok(PATRON.test(malo),malo);
 for(const bueno of ['await confirmar({})','dialogo.confirmar(x)','void avisar(x)','x.alert(1)'])assert.ok(!PATRON.test(bueno),bueno);
});
