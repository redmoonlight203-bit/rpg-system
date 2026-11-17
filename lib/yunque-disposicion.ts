import type {Grafo,TipoNodo} from "./yunque-grafo";
/** Disposición automática del lienzo del Yunque. Pura y determinista; sin React. */
export type Punto={x:number;y:number};
export const NODO={ancho:260,alto:140,separacionX:80,separacionY:40};
const PASO_X=NODO.ancho+NODO.separacionX,PASO_Y=NODO.alto+NODO.separacionY;
const BASE:Record<TipoNodo,number>={nucleo:0,accion:1,pasiva:1,vinculo:1,requisitos:1,invocacion:1,
 alcance:2,salvacion:2,estado:2,reaccion:2,transformacion:2,recurso:2,vfx:2,tabla_armas:2,cuando:2,si:3,entonces:4};
const finito=(n:unknown)=>typeof n==='number'&&Number.isFinite(n);
export function disponer(g:Grafo,guardadas:Record<string,Punto>={}):Record<string,Punto>{
 const col:Record<string,number>={};
 for(const n of g.nodos)col[n.id]=BASE[n.tipo]??1;
 const tipo:Record<string,TipoNodo>={};for(const n of g.nodos)tipo[n.id]=n.tipo;
 // Cadenas si/entonces anidadas avanzan una columna por nivel de cable.
 for(let it=0;it<=g.nodos.length;it++){
  let cambio=false;
  for(const c of g.cables){
   const d=c.desde.nodo,h=c.hasta.nodo;
   if((tipo[h]==='si'||tipo[h]==='entonces')&&col[d]!==undefined&&col[h]<col[d]+1){col[h]=col[d]+1;cambio=true;}
  }
  if(!cambio)break;
 }
 // Alcanzables desde el núcleo (BFS); el resto va debajo.
 const hijos:Record<string,string[]>={};
 for(const c of g.cables)(hijos[c.desde.nodo]??=[]).push(c.hasta.nodo);
 const vistos=new Set<string>();
 if(tipo.nucleo){vistos.add('nucleo');const cola=['nucleo'];
  while(cola.length){const a=cola.shift() as string;for(const h of hijos[a]||[])if(!vistos.has(h)&&tipo[h]){vistos.add(h);cola.push(h);}}}
 const alcanzables=g.nodos.filter(n=>vistos.has(n.id)),huerfanos=g.nodos.filter(n=>!vistos.has(n.id));
 const filas=Math.max(6,Math.ceil(Math.sqrt(g.nodos.length)));
 const columnas=[...new Set(g.nodos.map(n=>col[n.id]))].sort((a,b)=>a-b);
 const cuenta:Record<number,number>={};
 for(const n of alcanzables)cuenta[col[n.id]]=(cuenta[col[n.id]]||0)+1;
 // Cada columna se parte en subcolumnas si es muy alta; las siguientes se desplazan.
 const sub:Record<number,number>={},x0:Record<number,number>={};
 let x=0;
 for(const c of columnas){sub[c]=Math.max(1,Math.ceil((cuenta[c]||0)/filas));x0[c]=x;x+=sub[c]*PASO_X;}
 const validas:Record<string,Punto>={};
 for(const n of g.nodos){const p=guardadas[n.id];if(p&&finito(p.x)&&finito(p.y))validas[n.id]={x:p.x,y:p.y};}
 const res:Record<string,Punto>={};
 for(const id in validas)res[id]=validas[id];
 const siguiente:Record<number,number>={};
 const colocar=(n:{id:string},c:number,envolver:boolean,yBase:number)=>{
  // El hueco se consume aunque el nodo tenga posición guardada: mover uno no recoloca a los demás.
  const k=siguiente[c]||0;siguiente[c]=k+1;
  if(res[n.id])return;
  const s=envolver?Math.floor(k/filas):0,r=envolver?k%filas:k;
  res[n.id]={x:x0[c]+s*PASO_X,y:yBase+r*PASO_Y};
 };
 // Núcleo y alcanzables primero en el orden del grafo, luego huérfanos bajo ellos.
 const nucleo=alcanzables.filter(n=>n.id==='nucleo'),resto=alcanzables.filter(n=>n.id!=='nucleo');
 for(const n of nucleo)colocar(n,col[n.id],true,0);
 for(const n of resto)colocar(n,col[n.id],true,0);
 const usadas=Math.min(filas,Math.max(0,...Object.values(cuenta)));
 let yMax=usadas*PASO_Y;
 for(const p of Object.values(res))yMax=Math.max(yMax,p.y+PASO_Y);
 for(const k of Object.keys(siguiente))delete siguiente[+k];
 for(const n of huerfanos)colocar(n,col[n.id],false,yMax);
 return res;
}
export function leerPosiciones(clave:string):Record<string,Punto>{
 try{
  if(typeof globalThis.localStorage==='undefined')return {};
  const t=globalThis.localStorage.getItem(clave);
  if(!t)return {};
  const o=JSON.parse(t);
  if(!o||typeof o!=='object'||Array.isArray(o))return {};
  const r:Record<string,Punto>={};
  for(const [k,p] of Object.entries(o as Record<string,any>))if(p&&finito(p.x)&&finito(p.y))r[k]={x:p.x,y:p.y};
  return r;
 }catch{return {};}
}
export function guardarPosiciones(clave:string,p:Record<string,Punto>):void{
 try{if(typeof globalThis.localStorage!=='undefined')globalThis.localStorage.setItem(clave,JSON.stringify(p));}catch{/* almacenamiento lleno o bloqueado */}
}
export function encuadre(p:Record<string,Punto>,vista:{ancho:number;alto:number}):{x:number;y:number;zoom:number}{
 const v=Object.values(p);
 if(!v.length)return {x:0,y:0,zoom:1};
 const margen=40;
 const x1=Math.min(...v.map(q=>q.x))-margen,y1=Math.min(...v.map(q=>q.y))-margen;
 const x2=Math.max(...v.map(q=>q.x))+NODO.ancho+margen,y2=Math.max(...v.map(q=>q.y))+NODO.alto+margen;
 const w=x2-x1,h=y2-y1;
 const zoom=Math.min(2,Math.max(0.4,Math.min(vista.ancho/w,vista.alto/h)));
 // Si con el zoom mínimo un eje no cabe, se ancla arriba a la izquierda (donde está el núcleo) en vez de centrar.
 const eje=(tam:number,lado:number,o:number)=>tam*zoom>lado?-o*zoom:(lado-tam*zoom)/2-o*zoom;
 return {x:eje(w,vista.ancho,x1),y:eje(h,vista.alto,y1),zoom};
}
