import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as motor from '../supabase/functions/equipo-combate/motor.js';
function tablero(){
 const hooks=[],efectos=[];let cursor=0;
 const igual=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 const react={useState:inicial=>{const n=cursor++;hooks[n]??={valor:inicial};return [hooks[n].valor,v=>hooks[n].valor=typeof v==='function'?v(hooks[n].valor):v];},useMemo:(fn,deps)=>{const n=cursor++;if(!igual(hooks[n]?.deps,deps))hooks[n]={deps,valor:fn()};return hooks[n].valor;},useEffect:(fn,deps)=>{const n=cursor++;if(!igual(hooks[n]?.deps,deps)){hooks[n]={deps};efectos.push(fn);}}};
 const cuentas={alcance:0,area:0},exports={};
 const jsx=(type,props,key)=>({type,props,key});
 const require=nombre=>nombre==='react'?react:nombre==='react/jsx-runtime'?{jsx,jsxs:jsx}:nombre==='../lib/combate'?{...motor,alcanceDesde:(...a)=>{cuentas.alcance++;return motor.alcanceDesde(...a);},areaDesde:(...a)=>{cuentas.area++;return motor.areaDesde(...a);}}:nombre==='../lib/descripciones'?{describirEfecto:()=>({resumen:'',detalles:[]}),describirRegla:()=>({resumen:'',detalles:[]})}:nombre==='lucide-react'?new Proxy({},{get:(_,k)=>k}):()=>null;
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/TableroCombate.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require,setTimeout:()=>1,clearTimeout:()=>{}});
 return {cuentas,render:props=>{cursor=0;const vista=exports.TableroCombate(props);efectos.splice(0).forEach(fn=>fn());return vista;}};
}
function nodos(n){return Array.isArray(n)?n.flatMap(nodos):n&&typeof n==='object'?[n,...nodos(n.props?.children)]:[];}
const ficha=(id,x)=>({id,nombre:id,bando:id==='a'?'jugador':'enemigo',vida:10,max_vida:10,posicion:{x,y:1}});
const base=()=>({fichas:[ficha('a',1),ficha('b',3)],actual:'a',objetivo:'',moviendo:false,ocupado:false,onObjetivo:()=>{},onMover:()=>{},puedeApuntar:true,lanzador:'a',habilidad:{id:'azul',nombre:'Azul',efecto:'dano',tablero:{alcance:6,forma:'circulo',tamano:1,afecta:'enemigos'}}});
test('cambiar objetivo y previsualizar áreas reutiliza el alcance calculado',()=>{
 const h=tablero(),p=base();let v=h.render(p);assert.equal(h.cuentas.alcance,1);
 v=h.render({...p,objetivo:'b'});assert.equal(h.cuentas.alcance,1);
 const celda=nodos(v).find(n=>n.type==='button'&&n.props['aria-label']?.startsWith('b, enemigo'));
 celda.props.onMouseEnter();v=h.render(p);assert.equal(h.cuentas.alcance,1);assert.equal(h.cuentas.area,1);
 assert.ok(nodos(v).some(n=>typeof n.props?.children==='string'&&n.props.children.includes('objetivos: b')));
 h.render({...p,ocupado:true});assert.equal(h.cuentas.area,1);assert.equal(h.cuentas.alcance,1);
});
test('mover el lanzador o cambiar de habilidad invalida el cálculo anterior',()=>{
 const h=tablero(),p=base();h.render(p);
 const movido={...p,fichas:[ficha('a',2),ficha('b',3)]};h.render(movido);assert.equal(h.cuentas.alcance,2);
 const v=h.render({...movido,habilidad:{...p.habilidad,tablero:{...p.habilidad.tablero,alcance:1}},columnas:10,filas:6});assert.equal(h.cuentas.alcance,3);
 assert.equal(nodos(v).filter(n=>n.type==='button'&&n.props.className?.startsWith('tactical-cell')).length,60);
});
test('la previsualización actualiza víctimas al recibir una vida nueva',()=>{
 const h=tablero(),p={...base(),centro:{x:3,y:1}};h.render(p);
 const v=h.render({...p,fichas:[ficha('a',1),{...ficha('b',3),vida:0}]});
 assert.equal(h.cuentas.area,1);assert.ok(nodos(v).some(n=>typeof n.props?.children==='string'&&n.props.children.includes('0 objetivos: ninguno')));
});
test('editar los muros actualiza el alcance visible sin conservar casillas bloqueadas',()=>{
 const h=tablero(),p={...base(),mapa:{id:'mapa',version:1,nombre:'Sala',columnas:12,filas:8,celdas:{}}};
 let v=h.render(p);let rival=nodos(v).find(n=>n.type==='button'&&n.props['aria-label']?.startsWith('b, enemigo'));
 assert.ok(rival.props.className.includes('spell-range'));
 v=h.render({...p,mapa:{...p.mapa,celdas:{'2,1':'muro'}}});
 rival=nodos(v).find(n=>n.type==='button'&&n.props['aria-label']?.startsWith('b, enemigo'));
 assert.equal(rival.props.className.includes('spell-range'),false);assert.equal(h.cuentas.alcance,2);
 assert.ok(nodos(v).some(n=>n.type==='button'&&n.props.title==='muro'));
});
