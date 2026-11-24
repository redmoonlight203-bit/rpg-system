import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {cargarDependencia} from './helpers/cargar-ts.mjs';

const jsx=(type,props)=>({type,props});
const exports={};
let hooks=[],cursor=0;
const react={
 useRef:inicial=>hooks[cursor++]??={current:inicial},
 useState:inicial=>{const i=cursor++;hooks[i]??={valor:inicial};return [hooks[i].valor,v=>{hooks[i].valor=v;}];},
};
const config={module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/EditorPatronArea.tsx',import.meta.url),'utf8'),{compilerOptions:config}).outputText,{
 exports,require:n=>n==='react'?react:n==='react/jsx-runtime'?{jsx,jsxs:jsx}:cargarDependencia('patron-area'),
});
const nodos=n=>Array.isArray(n)?n.flatMap(nodos):n&&typeof n==='object'?[n,...nodos(n.props?.children)]:[];

function montar(inicial){
 hooks=[];
 let valor=structuredClone(inicial);
 const render=()=>{cursor=0;return nodos(exports.default({valor,onChange:v=>{valor=JSON.parse(JSON.stringify(v));}}));};
 const grid=()=>render().find(n=>n.props['aria-label']==='Cuadrícula para dibujar el ataque').props;
 const boton=t=>render().find(n=>n.type==='button'&&n.props.children===t).props;
 const casilla=(x,y)=>render().find(n=>n.props['data-casilla-patron']===`${x},${y}`).props;
 const panel={
  ownerDocument:{elementFromPoint(x,y){
   if(x<-6||x>6||y<-6||y>6)return null;
   return {closest:()=>({dataset:{casillaPatron:`${x},${y}`}})};
  }},
  contains:()=>true,setPointerCapture:()=>{},getBoundingClientRect:()=>({left:-6,right:7,top:-6,bottom:7}),
 };
 const puntero=(x,y)=>({isPrimary:true,button:0,pointerId:1,clientX:x,clientY:y,currentTarget:panel});
 const trazar=(...celdas)=>{
  grid().onPointerDown(puntero(...celdas[0]));
  for(const celda of celdas.slice(1))grid().onPointerMove(puntero(...celda));
  grid().onPointerUp(puntero(...celdas.at(-1)));
 };
 return {render,boton,casilla,trazar,valor:()=>valor};
}

test('editor libre: dibuja una forma asimétrica sin plantilla, conserva huecos y puede reabrirla',()=>{
 const a=montar({orientacion:'apuntar',casillas:[]});
 assert.ok(!a.render().some(n=>n.props.children==='Dibujar V'));
 a.trazar([1,0],[4,0]);a.trazar([-2,3]);
 a.trazar([1,0],[1,-2]); // iniciar en una casilla ya pintada sigue pintando
 const forma=[{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:-2,y:3},{x:1,y:-1},{x:1,y:-2}];
 assert.deepEqual(a.valor().casillas,forma);
 const b=montar(a.valor());
 assert.equal(b.casilla(-2,3)['aria-pressed'],true);
 assert.equal(b.casilla(2,-1)['aria-pressed'],false);
 b.boton('Borrar casillas').onClick();
 b.trazar([4,0],[3,0]);
 b.casilla(-2,3).onClick({detail:0});
 assert.deepEqual(b.valor(),{orientacion:'apuntar',casillas:forma.filter(q=>q.x!==3&&q.x!==4&&q.x!==-2)});
 b.boton('Pintar casillas').onClick();
 b.casilla(0,1).onClick({detail:0});
 assert.deepEqual(b.valor().casillas.at(-1),{x:0,y:1});
});

test('salir de la cuadrícula y reentrar no conecta dos tramos separados',()=>{
 const editor=montar({orientacion:'fija',casillas:[]});
 editor.trazar([-5,0],[-8,0],[-5,4]);
 assert.deepEqual(editor.valor(),{orientacion:'fija',casillas:[{x:-5,y:0},{x:-5,y:4}]});
});
