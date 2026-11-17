'use client';
// Lienzo del Yunque: desplazar arrastrando el fondo, zoom con la rueda (0.4–2) alrededor del cursor,
// nodos que se arrastran con transform y cables Bézier que se dibujan arrastrando desde un puerto de salida.
import {useCallback,useEffect,useImperativeHandle,useMemo,useRef,useState,type PointerEvent as PE,type KeyboardEvent,type FocusEvent,type ReactNode,type Ref} from 'react';
import {Maximize,Minus,Plus,X} from 'lucide-react';
import IconoYugen from '../IconoYugen';
import NodoYunque,{familiaDe,puertoLocal,ICONO_TIPO,NOMBRE_TIPO,type Familia} from './NodoYunque';
import {NODO,encuadre,type Punto} from '../../lib/yunque-disposicion';
import {conexionValida,type Operacion} from '../../lib/yunque-operaciones';
import type {Grafo,Nodo,Puerto,TipoNodo} from '../../lib/yunque-grafo';

export type Vista={x:number;y:number;z:number};
export type ContenidoNodo={icono?:string;editor?:ReactNode;pie?:ReactNode};
type Extremo={nodo:string;puerto:string};
/** Lo que el taller necesita del lienzo para soltar piezas del Grimorio (coordenadas de pantalla → mundo). */
export type LienzoAPI={
 /** ¿El punto de pantalla cae dentro del lienzo? */
 dentro:(cx:number,cy:number)=>boolean;
 aMundo:(cx:number,cy:number)=>Punto;
 /** Centro visible del lienzo, en coordenadas del mundo. */
 centro:()=>Punto;
 /** Nodo (y salida, si el cursor está sobre su fila) bajo un punto de pantalla; ignora los nodos sueltos. */
 destinoEn:(cx:number,cy:number,excluir?:string)=>{nodo:string;puerto?:string}|null;
};
/** Guía mientras se arrastra una pieza del Grimorio: nodos que la admiten, el que está debajo y un cable de vista previa. */
export type GuiaPieza={compatibles:ReadonlySet<string>;sobre:string|null;cable:Extremo|null;punto:Punto|null};
type Props={
 grafo:Grafo;posiciones:Record<string,Punto>;seleccion:string|null;encendidos?:ReadonlySet<string>;nuevos?:ReadonlySet<string>;
 onMover:(id:string,p:Punto)=>void;onSeleccionar:(id:string|null)=>void;
 onConectar:(origen:Extremo,destino:string)=>void;onOperar:(o:Operacion,punto?:Punto)=>void;
 contenido:(n:Nodo)=>ContenidoNodo;
 /** Piezas soltadas en el vacío que aún no pertenecen al borrador (nodos «sin conectar», solo de interfaz). */
 sueltos?:Nodo[];guia?:GuiaPieza|null;api?:Ref<LienzoAPI>;
 /** Por cada nodo suelto, los nodos que lo admiten (se iluminan al arrastrarlo). */
 compatiblesSuelto?:Record<string,ReadonlySet<string>>;
 /** Un nodo suelto arrastrado y soltado sobre otro nodo. */
 onSoltarSuelto?:(id:string,destino:{nodo:string;puerto?:string})=>void;
};
const Z_MIN=0.4,Z_MAX=2;
const acotar=(z:number)=>Math.min(Z_MAX,Math.max(Z_MIN,z));
/** Tipos que el menú de forja puede crear al soltar un cable en el vacío. */
const AGREGABLES:TipoNodo[]=['accion','cuando','pasiva','invocacion','alcance','salvacion','estado','reaccion','transformacion','recurso','vfx','tabla_armas','si','entonces'];
const AYUDA:Partial<Record<TipoNodo,string>>={accion:'Algo que se usa en el turno',cuando:'Una regla que reacciona a un evento',pasiva:'Un efecto que funciona solo',invocacion:'Traer a una criatura',alcance:'Distancia y área en el tablero',salvacion:'El objetivo tira para resistir',estado:'Veneno, quemadura, aturdir…',reaccion:'Defensa al recibir daño',transformacion:'Cambia de forma por etapas',recurso:'Una reserva que sube o baja',vfx:'Cómo se ve al usarla',tabla_armas:'Un arma al azar por cara',si:'Una condición',entonces:'Un efecto de la regla'};
const COLOR:Record<Familia,string>={nucleo:'var(--color-gold-bright)',accion:'var(--color-gold)',modulo:'var(--color-arcane)',regla:'var(--color-crimson)',pasiva:'var(--color-success-text)',vinculo:'var(--color-parchment)'};
// Brasas deterministas (sin Math.random en el render).
const BRASAS=Array.from({length:22},(_,i)=>({x:(i*37+11)%100,d:9+(i*7)%9,r:-((i*13)%17),s:2+(i%3)}));
const curva=(a:Punto,b:Punto)=>{const dx=Math.max(48,Math.abs(b.x-a.x)*.5);return `M${a.x} ${a.y}C${a.x+dx} ${a.y},${b.x-dx} ${b.y},${b.x} ${b.y}`;};

/** Encuadre de la vista: como `encuadre`, pero sin acercar por encima del 100 % (un núcleo solo no llena la pantalla). */
export function encuadrar(pos:Record<string,Punto>,ancho:number,alto:number):Vista{
 const e=encuadre(pos,{ancho,alto});
 if(e.zoom<=1)return {x:e.x,y:e.y,z:e.zoom};
 const v=Object.values(pos);
 const x1=Math.min(...v.map(q=>q.x)),y1=Math.min(...v.map(q=>q.y));
 const w=Math.max(...v.map(q=>q.x))+NODO.ancho-x1,h=Math.max(...v.map(q=>q.y))+NODO.alto-y1;
 return {x:Math.max(40,(ancho-w)/2)-x1,y:Math.max(40,(alto-h)/2)-y1,z:1};
}

export default function Lienzo({grafo,posiciones,seleccion,encendidos,nuevos,onMover,onSeleccionar,onConectar,onOperar,contenido,sueltos,guia,api,onSoltarSuelto,compatiblesSuelto}:Props){
 const caja=useRef<HTMLDivElement>(null);
 const [vista,setVista]=useState<Vista>({x:80,y:80,z:1});
 const [suave,setSuave]=useState(false),[desplazando,setDesplazando]=useState(false);
 const [tam,setTam]=useState<Record<string,{w:number;h:number}>>({});
 const [arrastre,setArrastre]=useState<{id:string;p:Punto}|null>(null);
 const [cable,setCable]=useState<{origen:Extremo;puerto:Puerto;desde:Punto;hasta:Punto}|null>(null);
 const [menu,setMenu]=useState<{origen:Extremo;puerto:Puerto;punto:Punto;pantalla:Punto}|null>(null);
 const gesto=useRef<{tipo:'pan'|'nodo'|'cable';x0:number;y0:number;base:Punto;movido:boolean;id?:string}|null>(null);
 const vistaRef=useRef(vista),posRef=useRef(posiciones),selRef=useRef(seleccion),encuadrado=useRef(false);
 useEffect(()=>{vistaRef.current=vista;},[vista]);
 useEffect(()=>{posRef.current=posiciones;},[posiciones]);
 useEffect(()=>{selRef.current=seleccion;},[seleccion]);
 const todos=useMemo(()=>sueltos?.length?[...grafo.nodos,...sueltos]:grafo.nodos,[grafo,sueltos]);
 const porId=useMemo(()=>new Map(todos.map(n=>[n.id,n])),[todos]);
 const conectados=useMemo(()=>{const m=new Map<string,Set<string>>();for(const c of grafo.cables){if(!m.has(c.desde.nodo))m.set(c.desde.nodo,new Set());m.get(c.desde.nodo)!.add(c.desde.puerto);}return m;},[grafo]);
 // El nodo elegido se despliega con su editor: los nodos de las columnas siguientes se apartan a la derecha
 // y los de su misma columna, hacia abajo (solo en pantalla; las posiciones guardadas no cambian).
 const apartes=useMemo(()=>{
  const r:Record<string,Punto>={};
  const s=seleccion?posiciones[seleccion]:undefined,t=seleccion?tam[seleccion]:undefined;
  if(!seleccion||!s||!t)return r;
  const derecha=Object.entries(posiciones).filter(([id,p])=>id!==seleccion&&p.x>s.x+10);
  const dx=Math.max(0,s.x+t.w+NODO.separacionX/2-Math.min(Infinity,...derecha.map(([,p])=>p.x)));
  if(Number.isFinite(dx)&&dx>0)for(const [id] of derecha)r[id]={x:dx,y:0};
  const debajo=Object.entries(posiciones).filter(([id,p])=>id!==seleccion&&Math.abs(p.x-s.x)<=10&&p.y>s.y);
  const dy=Math.max(0,s.y+t.h+NODO.separacionY/2-Math.min(Infinity,...debajo.map(([,p])=>p.y)));
  if(Number.isFinite(dy)&&dy>0)for(const [id] of debajo)r[id]={x:0,y:dy};
  return r;
 },[seleccion,posiciones,tam]);
 const pos=useCallback((id:string):Punto|undefined=>{
  if(arrastre?.id===id)return arrastre.p;
  const p=posiciones[id],a=apartes[id];
  return p&&a?{x:p.x+a.x,y:p.y+a.y}:p;
 },[arrastre,posiciones,apartes]);
 const ancho=(id:string)=>tam[id]?.w??NODO.ancho;

 /** Desplaza la vista (suave) lo justo para que el nodo se vea entero, priorizando su esquina superior izquierda. */
 const asegurarVisible=useCallback((id:string)=>{
  const el=caja.current,p=posRef.current[id];if(!el||!p)return;
  const nodo=el.querySelector<HTMLElement>(`.yq-nodo-pos[data-id="${CSS.escape(id)}"]`);
  const v=vistaRef.current,W=el.clientWidth,H=el.clientHeight,m=32;
  const w=(nodo?.offsetWidth??NODO.ancho)*v.z,h=(nodo?.offsetHeight??NODO.alto)*v.z;
  const sx=p.x*v.z+v.x,sy=p.y*v.z+v.y;
  let dx=0,dy=0;
  if(sx+w>W-m)dx=W-m-(sx+w);if(sx+dx<m)dx=m-sx;
  if(sy+h>H-m)dy=H-m-(sy+h);if(sy+dy<m)dy=m-sy;
  if(Math.abs(dx)<1&&Math.abs(dy)<1)return;
  const sig={...v,x:v.x+dx,y:v.y+dy};vistaRef.current=sig;
  setSuave(true);setVista(sig);
 },[]);
 // Tamaño de cada nodo (cambia al seleccionarlo y mostrar su editor) y de la vista.
 const observador=useRef<ResizeObserver|null>(null);
 const observar=useCallback((el:HTMLDivElement|null)=>{
  if(!el)return;
  observador.current??=new ResizeObserver(entradas=>setTam(prev=>{
   let cambio=false;const sig={...prev};
   for(const e of entradas){const id=(e.target as HTMLElement).dataset.id!;const w=(e.target as HTMLElement).offsetWidth,h=(e.target as HTMLElement).offsetHeight;if(!sig[id]||sig[id].w!==w||sig[id].h!==h){sig[id]={w,h};cambio=true;}}
   return cambio?sig:prev;
  }));
  const o=observador.current;o.observe(el);
  return ()=>o.unobserve(el);
 },[]);
 useEffect(()=>{
  const el=caja.current;if(!el)return;
  const ro=new ResizeObserver(()=>{
   if(encuadrado.current||!Object.keys(posRef.current).length)return;
   encuadrado.current=true;const v=encuadrar(posRef.current,el.clientWidth,el.clientHeight);vistaRef.current=v;setVista(v);
   if(selRef.current)requestAnimationFrame(()=>asegurarVisible(selRef.current!));
  });
  ro.observe(el);return ()=>ro.disconnect();
 },[asegurarVisible]);

 // Rueda: zoom alrededor del cursor. Las ruedas numéricas ([data-rueda]) y las zonas desplazables tienen la suya.
 useEffect(()=>{
  const el=caja.current;if(!el)return;
  const rueda=(e:WheelEvent)=>{
   const t=e.target as HTMLElement;
   if(!e.ctrlKey&&!e.metaKey&&t.closest('[data-rueda],.yq-desplazable,.yq-menu-forja'))return;
   e.preventDefault();
   const r=el.getBoundingClientRect(),cx=e.clientX-r.left,cy=e.clientY-r.top;
   setSuave(false);
   setVista(v=>{const z=acotar(v.z*Math.exp(-e.deltaY*0.0015));const k=z/v.z;return {x:cx-(cx-v.x)*k,y:cy-(cy-v.y)*k,z};});
  };
  el.addEventListener('wheel',rueda,{passive:false});
  return ()=>el.removeEventListener('wheel',rueda);
 },[]);

 // Al elegir un nodo desde fuera del lienzo (índice, nodo recién forjado), llevarlo a la vista.
 const porPuntero=useRef(false);
 useEffect(()=>{
  if(!seleccion)return;
  if(porPuntero.current){porPuntero.current=false;return;}
  const raf=requestAnimationFrame(()=>asegurarVisible(seleccion));
  return ()=>cancelAnimationFrame(raf);
 },[seleccion,nuevos,asegurarVisible]);

 const aMundo=(cx:number,cy:number):Punto=>{const r=caja.current!.getBoundingClientRect(),v=vistaRef.current;return {x:(cx-r.left-v.x)/v.z,y:(cy-r.top-v.y)/v.z};};
 const destinoEn=(cx:number,cy:number,excluir?:string)=>{
  for(const el of document.elementsFromPoint(cx,cy)){
   if(!(el instanceof HTMLElement)||!caja.current?.contains(el))continue;
   if(el.closest('.yq-lienzo-barra,.yq-menu-forja'))return null;
   const n=el.closest<HTMLElement>('.yq-nodo-pos');const id=n?.dataset.id;
   if(!id||id===excluir||id.startsWith('suelto:'))continue;
   const puerto=el.closest<HTMLElement>('[data-salida]')?.dataset.salida;
   return puerto?{nodo:id,puerto}:{nodo:id};
  }
  return null;
 };
 useImperativeHandle(api,()=>({
  dentro:(cx,cy)=>{const r=caja.current?.getBoundingClientRect();return !!r&&cx>=r.left&&cx<=r.right&&cy>=r.top&&cy<=r.bottom;},
  aMundo,destinoEn,
  centro:()=>{const el=caja.current,v=vistaRef.current;return el?{x:(el.clientWidth/2-v.x)/v.z,y:(el.clientHeight/2-v.y)/v.z}:{x:0,y:0};},
 }));
 function zoomCentro(f:number){const el=caja.current;if(!el)return;const cx=el.clientWidth/2,cy=el.clientHeight/2;setSuave(true);setVista(v=>{const z=acotar(v.z*f),k=z/v.z;return {x:cx-(cx-v.x)*k,y:cy-(cy-v.y)*k,z};});}
 function encuadrarTodo(){const el=caja.current;if(!el)return;setSuave(true);setVista(encuadrar(posiciones,el.clientWidth,el.clientHeight));}

 function abajo(e:PE<HTMLDivElement>){
  if(e.button!==0)return;
  const t=e.target as HTMLElement;
  if(t.closest('.yq-menu-forja,.yq-lienzo-barra'))return;
  if(menu)setMenu(null);
  const puertoEl=t.closest<HTMLElement>('[data-lado="salida"]');
  const nodoEl=t.closest<HTMLElement>('.yq-nodo-pos');
  setSuave(false);
  if(puertoEl&&nodoEl){
   const id=nodoEl.dataset.id!,n=porId.get(id),p=n?.puertos.find(q=>q.id===puertoEl.dataset.puerto);
   const base=pos(id);if(!n||!p||!base)return;
   const l=puertoLocal(n,p.id,ancho(id)),desde={x:base.x+l.x,y:base.y+l.y};
   gesto.current={tipo:'cable',x0:e.clientX,y0:e.clientY,base:desde,movido:false,id};
   setCable({origen:{nodo:id,puerto:p.id},puerto:p,desde,hasta:desde});
   caja.current!.setPointerCapture(e.pointerId);e.preventDefault();return;
  }
  if(nodoEl){
   const id=nodoEl.dataset.id!;
   if(seleccion!==id){porPuntero.current=true;onSeleccionar(id);}
   if(t.closest('[data-asa]')&&!t.closest('button,input,select,textarea,a,label')){
    const base=pos(id);if(!base)return;
    gesto.current={tipo:'nodo',x0:e.clientX,y0:e.clientY,base,movido:false,id};
    caja.current!.setPointerCapture(e.pointerId);e.preventDefault();
   }
   return;
  }
  gesto.current={tipo:'pan',x0:e.clientX,y0:e.clientY,base:{x:vista.x,y:vista.y},movido:false};
  caja.current!.setPointerCapture(e.pointerId);
 }
 function mover(e:PE<HTMLDivElement>){
  const g=gesto.current;if(!g)return;
  const dx=e.clientX-g.x0,dy=e.clientY-g.y0;
  if(!g.movido&&Math.hypot(dx,dy)<3)return;
  g.movido=true;
  if(g.tipo==='pan'){setDesplazando(true);setVista(v=>({...v,x:g.base.x+dx,y:g.base.y+dy}));}
  else if(g.tipo==='nodo')setArrastre({id:g.id!,p:{x:Math.round(g.base.x+dx/vista.z),y:Math.round(g.base.y+dy/vista.z)}});
  else setCable(c=>c&&{...c,hasta:aMundo(e.clientX,e.clientY)});
 }
 /** Un gesto cancelado (el sistema roba el puntero) no se trata como soltar: se descarta sin efectos. */
 function cancelar(e:PE<HTMLDivElement>){
  gesto.current=null;
  if(caja.current?.hasPointerCapture(e.pointerId))caja.current.releasePointerCapture(e.pointerId);
  setArrastre(null);setCable(null);setDesplazando(false);
 }
 /** Teclado: Tab llega a cada nodo; Intro o Espacio sobre el nodo lo elige (y la vista lo sigue). */
 const nodoDe=(t:EventTarget)=>t instanceof HTMLElement&&t.matches('.yq-nodo[data-nodo]')?t.dataset.nodo!:null;
 function tecla(e:KeyboardEvent<HTMLDivElement>){
  const id=nodoDe(e.target);
  if(id&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(seleccion!==id)onSeleccionar(id);else asegurarVisible(id);}
  if(e.key==='Escape'&&menu)setMenu(null);
 }
 function enfocar(e:FocusEvent<HTMLDivElement>){const id=nodoDe(e.target);if(id)requestAnimationFrame(()=>asegurarVisible(id));}
 function arriba(e:PE<HTMLDivElement>){
  const g=gesto.current;gesto.current=null;if(!g)return;
  if(caja.current?.hasPointerCapture(e.pointerId))caja.current.releasePointerCapture(e.pointerId);
  if(g.tipo==='pan'){setDesplazando(false);if(!g.movido)onSeleccionar(null);return;}
  if(g.tipo==='nodo'){
   if(g.movido&&arrastre){
    onMover(arrastre.id,arrastre.p);
    // Un nodo suelto que cae sobre otro nodo intenta conectarse a él.
    if(arrastre.id.startsWith('suelto:')){const d=destinoEn(e.clientX,e.clientY,arrastre.id);if(d)onSoltarSuelto?.(arrastre.id,d);}
   }
   setArrastre(null);return;
  }
  const c=cable;setCable(null);if(!c)return;
  const bajo=document.elementFromPoint(e.clientX,e.clientY) as HTMLElement|null;
  const destinoEl=bajo?.closest<HTMLElement>('.yq-nodo-pos');
  if(destinoEl){const id=destinoEl.dataset.id!;if(compatible(id,c.puerto,c.origen.nodo))onConectar(c.origen,id);return;}
  if(!g.movido)return;
  const r=caja.current!.getBoundingClientRect();
  setMenu({origen:c.origen,puerto:c.puerto,punto:aMundo(e.clientX,e.clientY),pantalla:{x:Math.min(e.clientX-r.left,r.width-280),y:Math.min(e.clientY-r.top,r.height-320)}});
 }
 const compatible=(id:string,origen:Puerto,origenNodo:string)=>{
  const n=porId.get(id);if(!n||id===origenNodo)return false;
  return n.puertos.some(p=>conexionValida(origen,p,n.tipo));
 };
 const opciones=menu?menu.puerto.acepta.filter(t=>AGREGABLES.includes(t)):[];
 const sueltoMovido=arrastre?.id.startsWith('suelto:')?porId.get(arrastre.id)??null:null;
 // Cable de vista previa desde el puerto que recibirá la pieza hasta el cursor.
 const guiaCable=(()=>{
  if(!guia?.cable||!guia.punto)return null;
  const n=porId.get(guia.cable.nodo),b=pos(guia.cable.nodo);if(!n||!b)return null;
  const l=puertoLocal(n,guia.cable.puerto,ancho(n.id));
  return {desde:{x:b.x+l.x,y:b.y+l.y},hasta:guia.punto};
 })();

 return <div ref={caja} className={`yq-lienzo${cable||guia||sueltoMovido?' is-cableando':''}${guia?' is-guiando':''}${desplazando?' is-desplazando':''}`}
  style={{['--yq-x' as string]:`${vista.x}px`,['--yq-y' as string]:`${vista.y}px`,['--yq-z' as string]:vista.z}}
  onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={cancelar} onKeyDown={tecla} onFocus={enfocar}
  role="region" aria-label="Lienzo de nodos del Yunque" aria-roledescription="lienzo">
  <div className="yq-lienzo-rejilla" aria-hidden="true"/>
  <div className="yq-lienzo-vineta" aria-hidden="true"/>
  <div className="yq-brasas" aria-hidden="true">{BRASAS.map((b,i)=><span key={i} style={{left:`${b.x}%`,width:b.s,height:b.s,animationDuration:`${b.d}s`,animationDelay:`${b.r}s`}}/>)}</div>
  <div className={`yq-mundo${suave?' is-suave':''}`} style={{transform:`translate(${vista.x}px,${vista.y}px) scale(${vista.z})`}} onTransitionEnd={e=>{if(e.target===e.currentTarget&&e.propertyName==='transform')setSuave(false);}}>
   <svg className="yq-cables" width="1" height="1" aria-hidden="true">
    <defs>{grafo.cables.map(c=>{
     const a=porId.get(c.desde.nodo),b=porId.get(c.hasta.nodo),pa=pos(c.desde.nodo),pb=pos(c.hasta.nodo);if(!a||!b||!pa||!pb)return null;
     const la=puertoLocal(a,c.desde.puerto,ancho(a.id));
     return <linearGradient key={c.id} id={`yq-g-${c.id.replace(/[^a-zA-Z0-9_-]/g,'_')}`} gradientUnits="userSpaceOnUse" x1={pa.x+la.x} y1={pa.y+la.y} x2={pb.x} y2={pb.y+20}>
      <stop offset="0" stopColor={COLOR[familiaDe(a.tipo)]}/><stop offset="1" stopColor={COLOR[familiaDe(b.tipo)]}/>
     </linearGradient>;
    })}</defs>
    {grafo.cables.map(c=>{
     const a=porId.get(c.desde.nodo),b=porId.get(c.hasta.nodo),pa=pos(c.desde.nodo),pb=pos(c.hasta.nodo);if(!a||!b||!pa||!pb)return null;
     const la=puertoLocal(a,c.desde.puerto,ancho(a.id)),lb=puertoLocal(b,c.hasta.puerto,ancho(b.id));
     const d=curva({x:pa.x+la.x,y:pa.y+la.y},{x:pb.x+lb.x,y:pb.y+lb.y});
     const vivo=encendidos?.has(c.desde.nodo)||encendidos?.has(c.hasta.nodo);
     const tenue=!!seleccion&&seleccion!==c.desde.nodo&&seleccion!==c.hasta.nodo;
     return <g key={c.id} className={`yq-cable-grupo${vivo?' is-encendido':''}${tenue?' is-tenue':''}`} data-cable={c.id}>
      <path className="yq-cable-aura" d={d}/>
      <path className="yq-cable" d={d} stroke={`url(#yq-g-${c.id.replace(/[^a-zA-Z0-9_-]/g,'_')})`}/>
      <path className="yq-cable-flujo" d={d}/>
     </g>;
    })}
    {cable&&<path className="yq-cable-nuevo" d={curva(cable.desde,cable.hasta)}/>}
    {guiaCable&&<path className="yq-cable-nuevo is-guia" d={curva(guiaCable.desde,guiaCable.hasta)}/>}
   </svg>
   {todos.map(n=>{
    const p=pos(n.id);if(!p)return null;
    const c=contenido(n),sel=seleccion===n.id;
    const estado=cable?(n.id===cable.origen.nodo?'origen':compatible(n.id,cable.puerto,cable.origen.nodo)?'compatible':'incompatible')
     :guia?(n.id===guia.sobre?(guia.compatibles.has(n.id)?'destino':'rechazo'):guia.compatibles.has(n.id)?'compatible':'incompatible')
     :sueltoMovido?(n.id===sueltoMovido.id?'origen':(compatiblesSuelto?.[sueltoMovido.id]?.has(n.id)??n.puertos.some(q=>q.lado==='salida'&&q.acepta.includes(sueltoMovido.tipo)))?'compatible':'incompatible'):undefined;
    return <div key={n.id} ref={observar} data-id={n.id} data-cable={estado} className={`yq-nodo-pos${sel?' is-encima':''}${arrastre?.id===n.id?' is-arrastrado':''}`} style={{transform:`translate(${p.x}px,${p.y}px)`}}>
     <NodoYunque nodo={n} seleccionado={sel} encendido={encendidos?.has(n.id)} nuevo={nuevos?.has(n.id)} icono={c.icono} conectados={conectados.get(n.id)} pie={c.pie} onOperar={o=>onOperar(o)}>{c.editor}</NodoYunque>
    </div>;
   })}
  </div>
  {menu&&<div className="yq-menu-forja" style={{left:menu.pantalla.x,top:menu.pantalla.y}} role="dialog" aria-label="Forjar una pieza conectada" onKeyDown={e=>{if(e.key==='Escape')setMenu(null);}}>
   <header><span>Forjar desde «{menu.puerto.etiqueta||menu.puerto.id}»</span><button type="button" aria-label="Cerrar" onClick={()=>setMenu(null)}><X size={14}/></button></header>
   {opciones.length?<ul>{opciones.map((t,i)=><li key={t} style={{animationDelay:`${i*25}ms`}}><button type="button" autoFocus={i===0} data-familia={familiaDe(t)} onClick={()=>{const m=menu;setMenu(null);onOperar({op:'agregar',tipo:t,padre:m.origen.nodo,...(m.origen.puerto==='exito'||m.origen.puerto==='fallo'?{rama:m.origen.puerto}:{})},{x:m.punto.x,y:m.punto.y-20});}}>
    <IconoYugen id={ICONO_TIPO[t]} size={20}/><span><strong>{NOMBRE_TIPO[t]}</strong><small>{AYUDA[t]}</small></span>
   </button></li>)}</ul>:<p className="yq-menu-vacio">Esta salida se enlaza desde la Colección del Grimorio.</p>}
  </div>}
  <div className="yq-lienzo-barra" role="toolbar" aria-label="Vista del lienzo">
   <button type="button" aria-label="Alejar" onClick={()=>zoomCentro(1/1.2)}><Minus size={15}/></button>
   <output aria-live="polite">{Math.round(vista.z*100)} %</output>
   <button type="button" aria-label="Acercar" onClick={()=>zoomCentro(1.2)}><Plus size={15}/></button>
   <button type="button" className="is-texto" onClick={encuadrarTodo}><Maximize size={14}/>Encuadrar todo</button>
  </div>
  <p className="yq-lienzo-pista" aria-hidden="true">Arrastra el fondo para moverte · rueda para acercar · arrastra desde un <i/> para forjar una pieza conectada</p>
 </div>;
}
