import{test}from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import ts from'typescript';import vm from'node:vm';
const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/combate.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,crypto,JSON,Array,Object,Math,Number});const c=exports;
function pj(id){return{id,forja_id:null,personaje_id:id,nombre:id,stats:{vida:20,armadura:5},configuracion:{tipo_creacion:'personaje'}};}
function campo(){let b=c.nuevoCombate();for(const[id,d]of [['a',20],['b',10],['c',1]])b=c.agregar(b,pj(id),'jugador',()=>d);return c.iniciar(b);}
test('retirar al actual avanza una vez al siguiente y conserva fichas',()=>{const b=campo(),n=c.retirar(b,'a');assert.equal(n.actual,'b');assert.equal(n.miembros.length,2);assert.equal(n.miembros[0].turnos,1);assert.equal(b.actual,'a');assert.equal(b.miembros.length,3);assert.equal(n.miembros[0].personaje_id,'b');});
test('retirar a otro no interrumpe la acción del actual',()=>{let b=campo();b.miembros[0].accion_usada=true;const n=c.retirar(b,'c');assert.equal(n.actual,'a');assert.equal(n.miembros[0].accion_usada,true);});
test('retirar al último finaliza sin referencia colgante',()=>{const b=c.iniciar(c.agregar(c.nuevoCombate(),pj('a'),'jugador',()=>10)),n=c.retirar(b,'a');assert.equal(n.actual,null);assert.equal(n.fase,'finalizado');assert.equal(n.miembros.length,0);});
test('retirar antes del inicio conserva preparación e iniciativa',()=>{let b=c.agregar(c.agregar(c.nuevoCombate(),pj('a'),'jugador',()=>10),pj('b'),'enemigo',()=>4);const n=c.retirar(b,'a');assert.equal(n.fase,'preparacion');assert.equal(n.miembros[0].iniciativa,4);});
test('retirar al actual salta participantes caídos',()=>{const b=campo();b.miembros[1].vida=0;const n=c.retirar(b,'a');assert.equal(n.actual,'c');});
