import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function cargar(nombre){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/'+nombre+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>cargar(n.replace('./','')),crypto,JSON,Array,Object,Math,Number,Set});return exports;}
const i=cargar('invocaciones'),c=cargar('combate'),p=cargar('progresion');
const config={claseMaxima:'C',maxHabilidades:1,modo:'jugador_en_combate',duracionTurnos:2,costePh:2,maxActivas:1};
const habilidad={id:'h',nombre:'Amigo',tipo_creacion:'habilidad',clase:'C',stats:{},configuracion_invocacion:config};
const poder={id:'p',nombre:'Golpe',tipo_creacion:'habilidad',clase:'C',stats:{}};
const propuesta={nombre:'Amigo',stats:{vida:10},habilidades:['p'],pasivas:[]};
test('techo absoluto incluye habilidad y estadísticas y rechaza clases superiores',()=>{assert.equal(i.evaluarInvocacion(config,propuesta,[poder]).valida,true);assert.equal(i.evaluarInvocacion(config,{...propuesta,stats:{armadura:25}},[poder]).valida,false);assert.equal(i.evaluarInvocacion(config,propuesta,[{...poder,clase:'B'}]).valida,false);});
test('rechaza objetos, duplicados, costes negativos y atributos fuera de rango',()=>{assert.equal(i.evaluarInvocacion(config,propuesta,[{...poder,tipo_creacion:'objeto'}]).valida,false);assert.equal(i.evaluarInvocacion(config,{...propuesta,habilidades:['p','p']},[poder]).valida,false);assert.equal(i.evaluarInvocacion({...config,costePh:-1},propuesta,[poder]).valida,false);assert.equal(i.evaluarInvocacion({...config,rangos:{vida:{min:1,max:5}}},propuesta,[poder]).valida,false);});
function ficha(id){return {id,forja_id:null,nombre:id,stats:{vida:20,ph:10,fatiga:10},configuracion:{tipo_creacion:'personaje',habilidades:[habilidad]}};}
function campo(){return c.iniciar(c.agregar(c.agregar(c.nuevoCombate(),ficha('a'),'jugador',()=>20),ficha('b'),'enemigo',()=>1),()=>1);}
test('invocar paga recursos, usa acción, conserva bando, iniciativa e historial y no muta origen',()=>{const origen=campo();const n=c.incorporarInvocacion(origen,'a',habilidad,ficha('amigo'),2,1,()=>5);assert.equal(origen.miembros.length,2);assert.equal(n.miembros.length,3);assert.equal(n.miembros[0].ph,8);assert.equal(n.miembros[0].accion_usada,true);assert.equal(n.miembros[2].bando,'jugador');assert.equal(n.miembros[2].iniciativa,5);assert.equal(c.deshacer(n).miembros.length,2);assert.throws(()=>c.incorporarInvocacion(n,'a',habilidad,ficha('otro'),2,1));});
test('temporal desaparece al finalizar y después de sus turnos; límites no cobran recursos',()=>{let n=c.incorporarInvocacion(campo(),'a',habilidad,ficha('amigo'),2,1,()=>5);assert.equal(c.finalizar(n).miembros.length,2);for(let j=0;j<12&&n.miembros[2].vida>0;j++)n=c.siguiente(n,()=>1);assert.equal(n.miembros[2].vida,0);const limitado=campo();limitado.miembros[0].ph=1;assert.throws(()=>c.incorporarInvocacion(limitado,'a',habilidad,ficha('amigo'),2,1));assert.equal(limitado.miembros.length,2);});
test('mallas escalan sin salir de los rangos y nivel no modifica clase',()=>{const r={vida:{min:10,max:100}};assert.equal(p.escalarMalla(r,1,20,()=>0).vida,10);assert.equal(p.escalarMalla(r,20,20,()=>1).vida,100);for(let n=1;n<=20;n++){const v=p.escalarMalla(r,n,20,()=>1).vida;assert.ok(v>=10&&v<=100);}assert.equal(p.nivelPorExperiencia(100),2);});
