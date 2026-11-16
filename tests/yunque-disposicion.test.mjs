import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {aGrafo}=cargarDependencia('yunque-grafo');
const {vacio}=cargarDependencia('yunque-borrador');
const F=JSON.parse(readFileSync(new URL('./fixtures/yunque-borradores.json',import.meta.url),'utf8'));
const json=x=>JSON.parse(JSON.stringify(x));
const ctx={creaciones:[]};
const {disponer,leerPosiciones,guardarPosiciones,encuadre,NODO}=cargarDependencia('yunque-disposicion');
const grande=()=>{
 const b=json(F.habilidad);
 const e0=b.efectos[0],r0=b.reglas[0];
 b.efectos=[];b.reglas=[];
 for(let i=0;i<30;i++)b.efectos.push({...json(e0),id:'e'+i,nombre:'A'+i});
 for(let i=0;i<20;i++)b.reglas.push({...json(r0),id:'r'+i,nombre:'R'+i});
 return aGrafo(b,ctx);
};
const choca=(a,b)=>a.x<b.x+NODO.ancho&&b.x<a.x+NODO.ancho&&a.y<b.y+NODO.alto&&b.y<a.y+NODO.alto;

test('disponer es determinista',()=>{
 const g=aGrafo(F.habilidad,ctx);
 assert.deepEqual(json(disponer(g)),json(disponer(g)));
 assert.equal(Object.keys(disponer(g)).length,g.nodos.length);
});
test('columnas: núcleo en x=0 y reglas avanzan hacia la derecha',()=>{
 const g=aGrafo(F.habilidad,ctx);const p=disponer(g);
 assert.equal(p.nucleo.x,0);
 const x=t=>g.nodos.filter(n=>n.tipo===t).map(n=>p[n.id].x);
 const col=(t,c)=>x(t).forEach(v=>assert.ok(v>=c*(NODO.ancho+NODO.separacionX),t));
 col('accion',1);col('cuando',2);col('si',3);col('entonces',4);
 assert.ok(Math.min(...x('si'))>Math.max(...x('cuando')));
});
test('30 acciones y 20 reglas: ningún par de nodos se superpone',()=>{
 const g=grande();const p=disponer(g);const ids=g.nodos.map(n=>n.id);
 assert.ok(ids.length>=90);
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)assert.ok(!choca(p[ids[i]],p[ids[j]]),ids[i]+' / '+ids[j]);
});
test('encuadre deja todos los nodos dentro de la vista con zoom ≥ 0.4',()=>{
 const g=grande();const p=disponer(g);const vista={ancho:2560,alto:1440};
 const e=encuadre(p,vista);
 assert.ok(e.zoom>=0.4&&e.zoom<=2);
 for(const q of Object.values(p)){
  assert.ok(q.x*e.zoom+e.x>=-1e-6&&(q.x+NODO.ancho)*e.zoom+e.x<=vista.ancho+1e-6);
  assert.ok(q.y*e.zoom+e.y>=-1e-6&&(q.y+NODO.alto)*e.zoom+e.y<=vista.alto+1e-6);
 }
});
test('encuadre acota el zoom a 0.4–2 y tolera vacío',()=>{
 assert.equal(encuadre({a:{x:0,y:0}},{ancho:5000,alto:5000}).zoom,2);
 assert.equal(encuadre({a:{x:0,y:0},b:{x:50000,y:0}},{ancho:800,alto:600}).zoom,0.4);
 assert.ok(Number.isFinite(encuadre({},{ancho:800,alto:600}).zoom));
});
test('posiciones guardadas de nodos inexistentes se ignoran y los nodos nuevos reciben posición automática',()=>{
 const g=aGrafo(F.habilidad,ctx);const auto=disponer(g);
 const movido=g.nodos[1].id;
 const p=disponer(g,{[movido]:{x:999,y:-77},fantasma:{x:1,y:2}});
 assert.deepEqual(json(p[movido]),{x:999,y:-77});
 assert.ok(!('fantasma' in p));
 assert.equal(Object.keys(p).length,g.nodos.length);
 for(const n of g.nodos)if(n.id!==movido)assert.deepEqual(json(p[n.id]),json(auto[n.id]));
 const q=disponer(g,{[movido]:{x:999,y:-77}});
 for(const n of g.nodos)assert.ok(Number.isFinite(q[n.id].x)&&Number.isFinite(q[n.id].y));
});
test('nodos no alcanzables desde el núcleo también reciben posición, sin solaparse',()=>{
 const g=aGrafo(F.habilidad,ctx);
 const solo=json(g);solo.cables=solo.cables.filter(c=>c.desde.nodo!=='nucleo');
 const p=disponer(solo);const ids=solo.nodos.map(n=>n.id);
 assert.equal(Object.keys(p).length,ids.length);
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)assert.ok(!choca(p[ids[i]],p[ids[j]]));
});
test('grafo solo con núcleo',()=>{
 const p=disponer(aGrafo(vacio(),ctx));
 assert.deepEqual(json(p.nucleo),{x:0,y:0});
});
const fake=(o={})=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,v);},...o};};
test('leerPosiciones con localStorage que lanza devuelve {}',()=>{
 const d=cargarDependencia('yunque-disposicion',{localStorage:fake({getItem(){throw new Error('x');}})});
 assert.deepEqual(json(d.leerPosiciones('k')),{});
});
test('leerPosiciones sin localStorage, con JSON roto o forma inválida devuelve {}',()=>{
 assert.deepEqual(json(cargarDependencia('yunque-disposicion').leerPosiciones('k')),{});
 const ls=fake();ls.setItem('k','{no');
 const d=cargarDependencia('yunque-disposicion',{localStorage:ls});
 assert.deepEqual(json(d.leerPosiciones('k')),{});
 ls.setItem('k',JSON.stringify({a:{x:1,y:2},b:{x:'z'},c:null}));
 assert.deepEqual(json(d.leerPosiciones('k')),{a:{x:1,y:2}});
});
test('guardarPosiciones con almacenamiento lleno no lanza',()=>{
 const d=cargarDependencia('yunque-disposicion',{localStorage:fake({setItem(){throw new Error('QuotaExceededError');}})});
 assert.doesNotThrow(()=>d.guardarPosiciones('k',{a:{x:1,y:2}}));
 assert.doesNotThrow(()=>cargarDependencia('yunque-disposicion').guardarPosiciones('k',{}));
});
test('guardar y leer round-trip',()=>{
 const d=cargarDependencia('yunque-disposicion',{localStorage:fake()});
 d.guardarPosiciones('yugen_yunque_pos_nuevo',{a:{x:3,y:4}});
 assert.deepEqual(json(d.leerPosiciones('yugen_yunque_pos_nuevo')),{a:{x:3,y:4}});
});
