'use client';
// Grimorio del Yunque: piezas por familia con búsqueda. Una pieza se arrastra (eventos de puntero) hasta el lienzo:
// sobre un nodo compatible se conecta; en el vacío se une al núcleo o queda «sin conectar». Un clic (o Intro) la añade
// al nodo elegido si la admite, o al núcleo. Las plantillas (mecánicas listas) se suman siempre al núcleo.
import {useEffect,useMemo,useRef,useState,type PointerEvent as PE,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {ChevronRight,Search,X} from 'lucide-react';
import IconoYugen from '../IconoYugen';
import {familiaDe} from './NodoYunque';
import {FAMILIAS_GRIMORIO,PIEZAS,piezaPermitida,piezasColeccion,type FamiliaGrimorio,type Pieza} from '../../lib/yunque-grimorio';
import type {TipoNodo} from '../../lib/yunque-grafo';
import type {Punto} from '../../lib/yunque-disposicion';
import type {Creacion} from '../../lib/yunque-borrador';

export type PistaSoltar={texto:string;tono:'bien'|'mal'|'neutro'};
type Props={
 /** Lo que el núcleo de esta creación puede llevar (filtra familias y piezas). */
 filtro:readonly TipoNodo[];
 creaciones?:Creacion[];excluir?:string;
 /** Piezas para enlazar creaciones (personajes y monstruos); sus creaciones no se ofrecen además para copiar. */
 enlazar?:Pieza[];
 /** `pantalla=null`: clic o teclado (sin posición). */
 onSoltar:(pieza:Pieza,pantalla:Punto|null)=>void;
 /** Mientras se arrastra (null al terminar o cancelar). */
 onArrastrar?:(pieza:Pieza|null,pantalla:Punto|null)=>void;
 pista?:PistaSoltar|null;
 children?:ReactNode;
};
const SIN_PIEZAS:Pieza[]=[];
const normal=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const porDefecto=(f:FamiliaGrimorio,conColeccion:boolean)=>f==='acciones'||f==='eventos'||f==='plantillas'||(f==='coleccion'&&conColeccion);
const tinte=(p:Pieza)=>p.familia==='coleccion'?'vinculo':familiaDe(p.tipo);

export default function Grimorio({filtro,creaciones=[],excluir,enlazar=SIN_PIEZAS,onSoltar,onArrastrar,pista,children}:Props){
 const [busqueda,setBusqueda]=useState('');
 // Familias abiertas: las que el GM abrió o cerró y, si no las tocó, acciones, eventos y (en personajes) la colección.
 const [abiertas,setAbiertas]=useState<Partial<Record<FamiliaGrimorio,boolean>>>({});
 const abiertaPorDefecto=(f:FamiliaGrimorio)=>porDefecto(f,enlazar.length>0);
 const [flotante,setFlotante]=useState<{pieza:Pieza;x:number;y:number}|null>(null);
 const gesto=useRef<{pieza:Pieza;x0:number;y0:number;activo:boolean}|null>(null);
 const sinClic=useRef(false);
 const piezas=useMemo(()=>{
  const enlazadas=new Set(enlazar.map(p=>p.clave.slice('vinculo:'.length)));
  return [...PIEZAS,...enlazar,...piezasColeccion(creaciones.filter(c=>c.id!==excluir&&c.estado!=='rechazado'&&!enlazadas.has(c.id)),filtro)].filter(p=>piezaPermitida(p,filtro));
 },[creaciones,excluir,filtro,enlazar]);
 const q=normal(busqueda.trim());
 const grupos=useMemo(()=>FAMILIAS_GRIMORIO.map(f=>({...f,piezas:piezas.filter(p=>p.familia===f.clave&&(!q||normal(`${p.nombre} ${p.ayuda} ${p.grupo||''}`).includes(q)))})).filter(g=>g.piezas.length||(!q&&g.clave==='coleccion'&&filtro.length>0)),[piezas,q,filtro]);
 const total=grupos.reduce((n,g)=>n+g.piezas.length,0);

 // Escape cancela el arrastre en curso.
 useEffect(()=>{
  if(!flotante)return;
  const tecla=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();gesto.current=null;setFlotante(null);onArrastrar?.(null,null);}};
  window.addEventListener('keydown',tecla);return ()=>window.removeEventListener('keydown',tecla);
 },[flotante,onArrastrar]);

 function abajo(e:PE<HTMLButtonElement>,pieza:Pieza){
  if(e.button!==0)return;
  gesto.current={pieza,x0:e.clientX,y0:e.clientY,activo:false};
  e.currentTarget.setPointerCapture(e.pointerId);
 }
 function mover(e:PE<HTMLButtonElement>){
  const g=gesto.current;if(!g)return;
  if(!g.activo&&Math.hypot(e.clientX-g.x0,e.clientY-g.y0)<5)return;
  g.activo=true;
  setFlotante({pieza:g.pieza,x:e.clientX,y:e.clientY});
  onArrastrar?.(g.pieza,{x:e.clientX,y:e.clientY});
 }
 function arriba(e:PE<HTMLButtonElement>){
  const g=gesto.current;gesto.current=null;
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  if(!g?.activo)return;
  sinClic.current=true;setTimeout(()=>{sinClic.current=false;},0);
  setFlotante(null);onArrastrar?.(null,null);
  onSoltar(g.pieza,{x:e.clientX,y:e.clientY});
 }
 function cancelar(){if(gesto.current?.activo){setFlotante(null);onArrastrar?.(null,null);}gesto.current=null;}
 const alternar=(f:FamiliaGrimorio)=>setAbiertas(s=>({...s,[f]:!(s[f]??abiertaPorDefecto(f))}));
 // Las piezas no dependen del borrador: se memorizan y los botones llaman a los gestores del último render
 // (el taller se repinta en cada tecla; antes, con él, cientos de piezas e iconos del Grimorio).
 const gestores=useRef({abajo,mover,arriba,cancelar,alternar,onSoltar});
 useEffect(()=>{gestores.current={abajo,mover,arriba,cancelar,alternar,onSoltar};});
 const arrastrada=flotante?.pieza.clave,conColeccion=enlazar.length>0;
 const familias=useMemo(()=><div className="yq-familias">
   {grupos.map(g=>{
    const abierta=!!q||(abiertas[g.clave]??porDefecto(g.clave,conColeccion));
    const muestra=g.piezas[0];
    return <section key={g.clave} className="yq-familia" data-familia={muestra?tinte(muestra):'vinculo'} data-grimorio={g.clave}>
     <h3><button type="button" aria-expanded={abierta} onClick={()=>gestores.current.alternar(g.clave)}>
      <ChevronRight size={14} className="yq-familia-flecha" aria-hidden="true"/><span>{g.nombre}</span><small>{g.piezas.length}</small>
     </button></h3>
     {abierta&&(g.piezas.length?<ul className="yq-grimorio-piezas">{g.piezas.map((p,i)=><li key={p.clave} className={p.grupo&&p.grupo!==g.piezas[i-1]?.grupo?'yq-pieza-con-grupo':undefined}>
      {p.grupo&&p.grupo!==g.piezas[i-1]?.grupo&&<span className="yq-grimorio-grupo" role="presentation">{p.grupo}</span>}
      <button type="button" data-pieza={p.clave} data-familia={tinte(p)} title={`${p.ayuda}. Arrástrala al lienzo o pulsa para añadirla.`}
       className={arrastrada===p.clave?'is-arrastrada':undefined}
       onPointerDown={e=>gestores.current.abajo(e,p)} onPointerMove={e=>gestores.current.mover(e)} onPointerUp={e=>gestores.current.arriba(e)} onPointerCancel={()=>gestores.current.cancelar()}
       onClick={()=>{if(sinClic.current)return;gestores.current.onSoltar(p,null);}}>
       <span className="yq-pieza-icono"><IconoYugen id={p.icono} size={18}/></span>
       <span className="yq-pieza-texto"><strong>{p.nombre}</strong><small>{p.ayuda}</small></span>
       <span className="yq-pieza-asa" aria-hidden="true"/>
      </button>
     </li>)}</ul>:<p className="yq-familia-vacia">Ninguna creación de La Creación tiene piezas que copiar aquí.</p>)}
    </section>;
   })}
  </div>,[grupos,q,abiertas,arrastrada,conColeccion]);

 return <aside className="yq-panel yq-grimorio" aria-label="Grimorio">
  <h2><IconoYugen id="libro" size={18}/>Grimorio</h2>
  <p className="yq-panel-voz">Arrastra una pieza hasta un nodo para engancharla, o al vacío para dejarla a mano.</p>
  <label className="yq-busqueda"><Search size={15} aria-hidden="true"/><input type="search" placeholder="Buscar pieza…" aria-label="Buscar en el Grimorio" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
   {busqueda&&<button type="button" aria-label="Borrar búsqueda" onClick={()=>setBusqueda('')}><X size={14}/></button>}</label>
  {q&&!total&&<p className="yq-panel-voz">Kuroi no encuentra «{busqueda}» en el Grimorio.</p>}
  {familias}
  {children}
  {/* En el cuerpo del documento: un ancestro con transform convertiría `position:fixed` en relativo a él. */}
  {flotante&&createPortal(<div className="yq-pieza-flotante" data-familia={tinte(flotante.pieza)} style={{left:flotante.x,top:flotante.y}} aria-hidden="true">
   <span className="yq-pieza-icono"><IconoYugen id={flotante.pieza.icono} size={18}/></span>
   <span><strong>{flotante.pieza.nombre}</strong>{pista&&<small className={`is-${pista.tono}`}>{pista.texto}</small>}</span>
  </div>,document.body)}
 </aside>;
}
