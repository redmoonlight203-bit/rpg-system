'use client';
// Lienzo pequeño de nodos dentro de un editor del Yunque: lo usan las formas de una transformación y los
// módulos de un ojo. Cada nodo ocupa una celda fija de una rejilla (columna, fila), así que nunca se
// superponen. Se conecta arrastrando desde el puerto ◆ de un nodo hasta otro, o pulsando el puerto y
// después el nodo de destino (teclado y pantallas táctiles).
import {useEffect,useRef,useState,type PointerEvent as EventoPuntero} from 'react';
import IconoYugen from '../../IconoYugen';
import './lienzo-nodos.css';

export type NodoLienzo={id:string;titulo:string;subtitulo?:string;icono?:string;tono?:'oro'|'arcano'|'carmesi';columna:number;fila:number;
 /** Sin configurar: se dibuja punteado; conectarlo lo activa. */
 fantasma?:boolean;error?:boolean};
export type CableLienzo={id:string;desde:string;hasta:string;
 /** «ambos»: flecha en los dos extremos; «uno»: hacia `hasta`; «linea»: sin flecha. */
 sentido:'ambos'|'uno'|'linea';punteado?:boolean;etiqueta?:string};

const ANCHO=168,ALTO=58,PASO_X=214,PASO_Y=78,MARGEN=14;
const posicion=(n:NodoLienzo)=>({x:MARGEN+n.columna*PASO_X,y:MARGEN+n.fila*PASO_Y});
/** Punto del borde del rectángulo del nodo en dirección al otro nodo. */
function borde(desde:{x:number;y:number},hacia:{x:number;y:number}){
 const cx=desde.x+ANCHO/2,cy=desde.y+ALTO/2,dx=hacia.x+ANCHO/2-cx,dy=hacia.y+ALTO/2-cy;
 if(!dx&&!dy)return {x:cx,y:cy};
 const k=Math.min(Math.abs(dx)?(ANCHO/2+4)/Math.abs(dx):Infinity,Math.abs(dy)?(ALTO/2+4)/Math.abs(dy):Infinity);
 return {x:cx+dx*k,y:cy+dy*k};
}

type Props={nodos:NodoLienzo[];cables:CableLienzo[];etiqueta:string;seleccionado?:string|null;cableSeleccionado?:string|null;
 onSeleccionar?:(id:string)=>void;onSeleccionarCable?:(id:string)=>void;
 /** Sin esta función el lienzo no ofrece puertos de conexión. */
 onConectar?:(desde:string,hasta:string)=>void;
 /** Qué nodos pueden iniciar una conexión (por defecto, todos los que no son fantasma). */
 puedeConectar?:(id:string)=>boolean};

export default function LienzoNodos({nodos,cables,etiqueta,seleccionado,cableSeleccionado,onSeleccionar,onSeleccionarCable,onConectar,puedeConectar}:Props){
 const caja=useRef<HTMLDivElement>(null);
 const [origen,setOrigen]=useState<string|null>(null);
 /** Pulsar el ◆ del nodo que ya está conectando cancela la conexión. */
 const cancelar=useRef(false);
 const [cursor,setCursor]=useState<{x:number;y:number}|null>(null);
 const arrastrando=cursor!==null;
 // Un arrastre que se suelta fuera del lienzo se cancela (si se suelta dentro, el lienzo ya lo resolvió).
 useEffect(()=>{
  if(!arrastrando)return;
  const cancelar=()=>{setOrigen(null);setCursor(null);};
  window.addEventListener('pointerup',cancelar);window.addEventListener('pointercancel',cancelar);
  return ()=>{window.removeEventListener('pointerup',cancelar);window.removeEventListener('pointercancel',cancelar);};
 },[arrastrando]);
 const porId=new Map(nodos.map(n=>[n.id,n]));
 const columnas=Math.max(1,...nodos.map(n=>n.columna+1)),filas=Math.max(1,...nodos.map(n=>n.fila+1));
 const ancho=MARGEN*2+(columnas-1)*PASO_X+ANCHO,alto=MARGEN*2+(filas-1)*PASO_Y+ALTO;
 const conectable=(id:string)=>!!onConectar&&(puedeConectar?puedeConectar(id):!porId.get(id)?.fantasma);
 const local=(e:{clientX:number;clientY:number})=>{const r=caja.current?.getBoundingClientRect();return r?{x:e.clientX-r.left+(caja.current?.scrollLeft||0),y:e.clientY-r.top+(caja.current?.scrollTop||0)}:{x:0,y:0};};
 const terminar=(destino:string|null)=>{if(origen&&destino&&destino!==origen)onConectar?.(origen,destino);setOrigen(null);setCursor(null);};
 const soltar=(e:EventoPuntero)=>{
  if(!origen||!cursor)return;
  const objetivo=(document.elementFromPoint(e.clientX,e.clientY) as HTMLElement|null)?.closest<HTMLElement>('[data-lienzo-nodo]');
  terminar(objetivo?.dataset.lienzoNodo||null);
 };
 const pulsarNodo=(id:string)=>{if(origen){terminar(id);return;}onSeleccionar?.(id);};
 const deOrigen=origen?porId.get(origen):undefined;
 return <div className="ln-marco">
 {origen&&<p className="ln-aviso" role="status">Elige el nodo de destino para «{porId.get(origen)?.titulo}». Esc cancela.</p>}
 <div className="ln-lienzo" ref={caja} role="group" aria-label={etiqueta}
  onPointerMove={e=>{if(origen&&cursor)setCursor(local(e));}} onPointerUp={soltar}
  onKeyDown={e=>{if(e.key==='Escape'&&origen){setOrigen(null);setCursor(null);}}}>
  <div className="ln-plano" style={{width:ancho,height:alto}}>
   <svg className="ln-cables" width={ancho} height={alto} aria-hidden="true">
    <defs>
     <marker id="ln-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker>
    </defs>
    {cables.map(c=>{
     const a=porId.get(c.desde),b=porId.get(c.hasta);if(!a||!b)return null;
     const pa=posicion(a),pb=posicion(b),curva=a.columna!==b.columna&&a.fila!==b.fila;
     // Entre columnas distintas, curva de borde a borde (no cruza otros nodos); si no, recta.
     const [i,f]=a.columna<=b.columna?[pa,pb]:[pb,pa];
     const p=curva?{x:i.x+ANCHO+4,y:i.y+ALTO/2}:borde(pa,pb),q=curva?{x:f.x-4,y:f.y+ALTO/2}:borde(pb,pa);
     const medio=(p.x+q.x)/2,d=curva?`M${p.x} ${p.y}C${medio} ${p.y} ${medio} ${q.y} ${q.x} ${q.y}`:`M${p.x} ${p.y}L${q.x} ${q.y}`;
     return <g key={c.id} data-lienzo-cable={c.id} className={['ln-cable',c.punteado&&'is-punteado',cableSeleccionado===c.id&&'is-seleccionado'].filter(Boolean).join(' ')}>
      {/* El trazo va de izquierda a derecha en curvas: si el cable apunta hacia atrás, la flecha va al inicio. */}
      <path d={d} markerEnd={c.sentido==='ambos'||(c.sentido==='uno'&&(!curva||a.columna<=b.columna))?'url(#ln-flecha)':undefined} markerStart={c.sentido==='ambos'||(c.sentido==='uno'&&curva&&a.columna>b.columna)?'url(#ln-flecha)':undefined}/>
      {onSeleccionarCable&&<path className="ln-cable-zona" d={d} onClick={()=>onSeleccionarCable(c.id)}><title>{c.etiqueta||'Conexión'}</title></path>}
     </g>;
    })}
    {deOrigen&&cursor&&(()=>{const p=posicion(deOrigen);return <line className="ln-cable-vivo" x1={p.x+ANCHO} y1={p.y+ALTO/2} x2={cursor.x} y2={cursor.y}/>;})()}
   </svg>
   {nodos.map(n=>{const p=posicion(n);return <div key={n.id} data-lienzo-nodo={n.id} className="ln-nodo-pos" style={{left:p.x,top:p.y}}>
    <button type="button" className={['ln-nodo',`is-${n.tono||'arcano'}`,n.fantasma&&'is-fantasma',n.error&&'is-error',seleccionado===n.id&&'is-seleccionado',origen&&origen!==n.id&&'is-destino'].filter(Boolean).join(' ')}
     aria-pressed={seleccionado===n.id} onClick={()=>pulsarNodo(n.id)}>
     {n.icono&&<IconoYugen id={n.icono} size={20}/>}
     <span><strong>{n.titulo}</strong>{n.subtitulo&&<small>{n.subtitulo}</small>}</span>
    </button>
    {conectable(n.id)&&<button type="button" className={`ln-puerto${origen===n.id?' is-activo':''}`} aria-label={origen===n.id?'Cancelar conexión':`Conectar desde ${n.titulo}`} title="Arrastra hasta otro nodo, o pulsa y elige el destino"
     onPointerDown={e=>{e.preventDefault();cancelar.current=origen===n.id;if(cancelar.current)return;e.currentTarget.releasePointerCapture?.(e.pointerId);setOrigen(n.id);setCursor(local(e));}}
     onClick={()=>{if(cancelar.current){cancelar.current=false;setOrigen(null);setCursor(null);return;}if(cursor)return;setOrigen(n.id);}}>◆</button>}
   </div>;})}
  </div>
  </div>
 </div>;
}
