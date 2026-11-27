import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function crear(){
 const exports={},timers=new Map();
 let tiempo=0,numero=0;
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/cola-visual.ts',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
 }).outputText,{
  exports,Map,Set,Math,
  setTimeout:(f,ms)=>{const id=++numero;timers.set(id,{f,cuando:tiempo+ms});return id;},
  clearTimeout:id=>timers.delete(id),
 });
 function avanzar(hasta){
  while(timers.size){
   const [id,{f,cuando}]=[...timers].sort((a,b)=>a[1].cuando-b[1].cuando)[0];
   if(cuando>hasta)break;
   tiempo=cuando;timers.delete(id);f();
  }
  tiempo=hasta;
 }
 return {...exports,timers,avanzar};
}

test('una ráfaga de más de seis golpes no pierde ninguno y arranca antes de acabar el anterior',()=>{
 const {ColaVisual,avanzar}=crear(),vistos=new Set(),fotos=[];
 const c=new ColaVisual(lotes=>{
  const activos=Array.from(lotes,lote=>lote.id);
  activos.forEach(id=>vistos.add(id));
  fotos.push(activos);
 },()=>580,110);
 for(let i=1;i<=10;i++)c.agregar({id:String(i)});
 c.agregar({id:'2'});
 assert.deepEqual(fotos.at(-1),['1']);
 avanzar(110);
 assert.deepEqual(fotos.at(-1),['1','2']);
 avanzar(990);
 assert.deepEqual([...vistos],Array.from({length:10},(_,i)=>String(i+1)));
 avanzar(1800);
 assert.deepEqual(fotos.at(-1),[]);
});

test('cerrar cancela lanzamientos pendientes y temporizadores de efectos activos',()=>{
 const {ColaVisual,timers,avanzar}=crear(),fotos=[];
 const c=new ColaVisual(lotes=>fotos.push(Array.from(lotes,lote=>lote.id)),()=>580,110);
 c.agregar({id:'1'});c.agregar({id:'2'});
 c.cerrar();avanzar(1500);
 assert.equal(timers.size,0);
 assert.deepEqual(fotos,[['1']]);
});
