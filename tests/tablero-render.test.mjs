import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
import * as motor from '../supabase/functions/equipo-combate/motor.js';
function tablero(){
 const hooks=[],efectos=[];let cursor=0;
 const igual=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 const react={useRef:inicial=>{const n=cursor++;hooks[n]??={current:inicial};return hooks[n];},useState:inicial=>{const n=cursor++;hooks[n]??={valor:inicial};return [hooks[n].valor,v=>hooks[n].valor=typeof v==='function'?v(hooks[n].valor):v];},useMemo:(fn,deps)=>{const n=cursor++;if(!igual(hooks[n]?.deps,deps))hooks[n]={deps,valor:fn()};return hooks[n].valor;},useEffect:(fn,deps)=>{const n=cursor++;if(!igual(hooks[n]?.deps,deps)){hooks[n]={deps};efectos.push(fn);}}};
 const cuentas={alcance:0,area:0},exports={};
 const jsx=(type,props,key)=>({type,props,key});
 const require=nombre=>nombre==='react'?react:nombre==='react/jsx-runtime'?{jsx,jsxs:jsx}:nombre==='../lib/movimiento-visual'?cargarDependencia('movimiento-visual'):nombre==='./CapaOcular'?{casillasDebiles:()=>new Map(),estiloOcular:()=>undefined,lineaOcular:()=>null,HudOcular:()=>null,MarcasOculares:()=>null,PanelOcular:()=>null}:nombre==='../lib/combate'?{...motor,alcanceDesde:(...a)=>{cuentas.alcance++;return motor.alcanceDesde(...a);},areaDesde:(...a)=>{cuentas.area++;return motor.areaDesde(...a);}}:nombre==='../lib/combate-interfaz'?cargarDependencia('combate-interfaz'):nombre==='../lib/precarga-vfx'?{precargarVFX:()=>{}}:nombre==='../lib/descripciones'?{describirEfecto:()=>({resumen:'',detalles:[]}),describirRegla:()=>({resumen:'',detalles:[]})}:nombre==='lucide-react'?new Proxy({},{get:(_,k)=>k}):()=>null;
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

test('un clic mueve a una casilla libre y alcanzable; nunca a una ocupada ni con el tablero ocupado',()=>{
 const h=tablero(),movidos=[],p={...base(),moviendo:true,alcanzables:{'2,1':1},onMover:p=>movidos.push(p)};
 const vista=h.render(p),casilla=nodos(vista).find(n=>n.type==='button'&&n.props['aria-label']?.startsWith('Casilla 3, 2'));
 casilla.props.onClick();assert.equal(movidos.length,1);assert.equal(movidos[0].x,2);
 assert.equal(casilla.props.onDoubleClick,undefined);
 const enemigo=nodos(vista).find(n=>n.type==='button'&&n.props['aria-label']?.startsWith('b, enemigo'));
 enemigo.props.onClick();assert.equal(movidos.length,1);
 const ocupado=h.render({...p,ocupado:true});nodos(ocupado).find(n=>n.type==='button'&&n.props['aria-label']?.startsWith('Casilla 3, 2')).props.onClick();assert.equal(movidos.length,1);
});
const enemigoDe=v=>nodos(v).find(n=>n.type==='button'&&n.props['aria-label']?.startsWith('b, enemigo'));
const ataque={id:'ataque',nombre:'Ataque',efecto:'dano',coste_ph:0};
test('un clic sobre un objetivo válido ejecuta la acción; sin acción disponible solo selecciona',()=>{
 const h=tablero(),hechas=[],elegidos=[],p={...base(),habilidad:ataque,onEjecutar:s=>hechas.push(s),puedeEjecutar:true,onObjetivo:id=>elegidos.push(id)};
 enemigoDe(h.render(p)).props.onClick();
 assert.equal(hechas.length,1);assert.equal(hechas[0].objetivo,'b');assert.equal(elegidos.at(-1),'b');
 // Un aliado no es objetivo de un ataque: el clic solo lo selecciona.
 nodos(h.render(p)).find(n=>n.type==='button'&&n.props['aria-label']?.startsWith('a, aliado')).props.onClick();assert.equal(hechas.length,1);
 enemigoDe(h.render({...p,puedeEjecutar:false})).props.onClick();assert.equal(hechas.length,1);
 enemigoDe(h.render({...p,ocupado:true})).props.onClick();assert.equal(hechas.length,1);
});
test('un área se lanza con un clic en una casilla blanca',()=>{
 const h=tablero(),hechas=[],apuntes=[],p={...base(),onEjecutar:s=>hechas.push(s),puedeEjecutar:true,onApuntar:(c,id)=>apuntes.push([c,id])};
 enemigoDe(h.render(p)).props.onClick();
 assert.equal(apuntes.length,1);assert.equal(hechas.length,1);assert.equal(hechas[0].centro.x,3);assert.equal(hechas[0].objetivo,'b');
});
test('un efecto solo de suelo no se ejecuta sobre quien vuela y la previsualización lo explica',()=>{
 const h=tablero(),hechas=[],p={...base(),fichas:[ficha('a',1),{...ficha('b',3),estados:['En vuelo']}],habilidad:{...ataque,suelo:true},onEjecutar:s=>hechas.push(s),puedeEjecutar:true};
 let v=h.render(p);const rival=enemigoDe(v);
 assert.ok(rival.props.className.includes('capa-aire'));assert.ok(rival.props['aria-label'].includes('en aire'));
 rival.props.onClick();assert.equal(hechas.length,0);
 rival.props.onFocus();v=h.render(p);
 assert.ok(nodos(v).some(n=>n.props?.className?.startsWith?.('campo-preview is-bloqueada')));
});
test('quien está bajo tierra y es enemigo solo deja una marca',()=>{
 const h=tablero(),p={...base(),perspectiva:'a',fichas:[ficha('a',1),{...ficha('b',3),estados:['Bajo tierra']}]};
 const v=h.render(p),marca=nodos(v).find(n=>n.type==='button'&&n.props['aria-label']?.startsWith('Marca en el suelo'));
 assert.ok(marca);assert.ok(marca.props.className.includes('capa-oculta'));
 assert.ok(!nodos(v).some(n=>n.type==='button'&&n.props['aria-label']?.startsWith('b, enemigo')));
});
