'use client';
// Vista de lista del Yunque: los mismos nodos del grafo como bloques ordenados (núcleo, acciones con sus módulos,
// reglas, pasivas, vínculos, requisitos), editables con los mismos editores. Para pantallas estrechas, teclado y lectores.
import {useEffect,useRef} from 'react';
import {ChevronDown,Copy,Trash2} from 'lucide-react';
import IconoYugen from '../IconoYugen';
import {AGREGABLES,AYUDA,type ContenidoNodo} from './Lienzo';
import {ICONO_TIPO,NOMBRE_TIPO,familiaDe} from './NodoYunque';
import type {Grafo,Nodo} from '../../lib/yunque-grafo';
import type {Operacion} from '../../lib/yunque-operaciones';

type Props={grafo:Grafo;seleccion:string|null;onSeleccionar:(id:string|null)=>void;contenido:(n:Nodo)=>ContenidoNodo;operar:(o:Operacion)=>void;encendidos?:ReadonlySet<string>;nuevos?:ReadonlySet<string>;
 /** Mientras se arrastra una pieza del Grimorio: bloques que la admiten y el que está debajo. */
 guia?:{compatibles:ReadonlySet<string>;sobre:string|null}|null};
type Seccion={clave:string;titulo:string;icono:string;de:(n:Nodo)=>boolean;vacia?:string};
const SECCIONES:Seccion[]=[
 {clave:'nucleo',titulo:'Núcleo',icono:'yugen',de:n=>n.tipo==='nucleo'},
 {clave:'acciones',titulo:'Acciones',icono:'espada',de:n=>n.ruta[0]==='efectos'||n.tipo==='invocacion'},
 {clave:'reglas',titulo:'Reglas',icono:'libro',de:n=>n.tipo==='cuando'||n.tipo==='si'||n.tipo==='entonces'},
 {clave:'pasivas',titulo:'Pasivas',icono:'vida',de:n=>n.tipo==='pasiva'},
 {clave:'vinculos',titulo:'Vínculos',icono:'anillo',de:n=>n.tipo==='vinculo'},
 {clave:'requisitos',titulo:'Requisitos',icono:'corona',de:n=>n.tipo==='requisitos'},
];
/** Sangría del bloque: módulos bajo su acción; condiciones y efectos según su anidamiento en la regla. */
function nivel(n:Nodo):number{
 if(n.tipo==='si')return n.ruta.filter(k=>k==='condicion'||k==='condiciones').length;
 if(n.tipo==='entonces')return 2+n.ruta.filter(k=>k==='exito'||k==='fallo').length;
 if(n.ruta[0]==='efectos'&&n.tipo!=='accion')return 1;
 return 0;
}
const duplicable=(n:Nodo)=>['accion','cuando','pasiva','entonces'].includes(n.tipo)||(n.tipo==='si'&&!(n.ruta.length===3&&n.ruta[2]==='condicion'));

export default function VistaLista({grafo,seleccion,onSeleccionar,contenido,operar,encendidos,nuevos,guia}:Props){
 const raiz=useRef<HTMLDivElement>(null);
 // Al elegir un nodo (índice, nodo recién creado), el bloque se trae a la vista.
 // Al montar no se desplaza (en un móvil la barra superior debe seguir a la vista): solo al cambiar la elección o crear nodos.
 const previa=useRef(seleccion);
 useEffect(()=>{
  const cambio=previa.current!==seleccion||!!nuevos?.size;previa.current=seleccion;
  if(!cambio||!seleccion)return;
  const el=raiz.current?.querySelector<HTMLElement>(`[data-bloque="${CSS.escape(seleccion)}"]`);
  if(!el)return;
  const quieto=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({block:'nearest',behavior:quieto?'auto':'smooth'});
 },[seleccion,nuevos]);
 return <div ref={raiz} className={`yq-vlista yq-desplazable${guia?' is-guiando':''}`} role="region" aria-label="Lista de nodos del Yunque">
  {SECCIONES.map(s=>{
   const nodos=grafo.nodos.filter(s.de);
   if(!nodos.length)return null;
   return <section key={s.clave} className="yq-vlista-seccion" aria-labelledby={`yq-vlista-${s.clave}`}>
    <h2 id={`yq-vlista-${s.clave}`}><IconoYugen id={s.icono} size={16}/>{s.titulo}<small>{nodos.length}</small></h2>
    <ol>{nodos.map(n=><Bloque key={n.id} n={n} abierto={seleccion===n.id} encendido={!!encendidos?.has(n.id)} nuevo={!!nuevos?.has(n.id)}
     guia={guia?(n.id===guia.sobre?(guia.compatibles.has(n.id)?'destino':'rechazo'):guia.compatibles.has(n.id)?'compatible':'incompatible'):undefined}
     c={contenido(n)} onAlternar={()=>onSeleccionar(seleccion===n.id?null:n.id)} operar={operar}/>)}</ol>
   </section>;
  })}
 </div>;
}

function Bloque({n,abierto,encendido,nuevo,guia,c,onAlternar,operar}:{n:Nodo;abierto:boolean;encendido:boolean;nuevo:boolean;guia?:string;c:ContenidoNodo;onAlternar:()=>void;operar:(o:Operacion)=>void}){
 const familia=familiaDe(n.tipo);
 const editable=n.tipo!=='nucleo';
 const añadir=n.tipo==='nucleo'?[]:n.puertos.filter(p=>p.lado==='salida').flatMap(p=>p.acepta.filter(t=>AGREGABLES.includes(t)).map(t=>({t,puerto:p})));
 const panel=`yq-bloque-${n.id.replace(/[^a-zA-Z0-9_-]/g,'_')}`;
 return <li className={['yq-bloque',abierto&&'is-abierto',n.error&&'is-error',encendido&&'is-encendido',nuevo&&'is-nuevo'].filter(Boolean).join(' ')}
  data-bloque={n.id} data-guia={guia} data-familia={familia} data-tipo={n.tipo} data-encendido={encendido||undefined} data-nivel={Math.min(4,nivel(n))} style={{['--yq-nivel' as string]:Math.min(4,nivel(n))}}>
  <div className="yq-bloque-cab">
   <button type="button" className="yq-bloque-boton" aria-expanded={abierto} aria-controls={panel} onClick={onAlternar}>
    <span className="yq-nodo-icono"><IconoYugen id={c.icono||ICONO_TIPO[n.tipo]} size={20}/></span>
    <span className="yq-bloque-titulos"><small>{NOMBRE_TIPO[n.tipo]}</small><strong>{n.titulo}</strong><em>{n.frase||'—'}</em></span>
    {n.error&&<span className="yq-nodo-sello" role="img" aria-label={`Error: ${n.error}`}>!</span>}
    <ChevronDown size={16} className="yq-bloque-flecha" aria-hidden="true"/>
   </button>
   {abierto&&editable&&<span className="yq-nodo-herramientas">
    {duplicable(n)&&<button type="button" title="Duplicar" aria-label={`Duplicar ${n.titulo}`} onClick={()=>operar({op:'duplicar',nodo:n.id})}><Copy size={14}/></button>}
    <button type="button" title="Quitar" aria-label={`Quitar ${n.titulo}`} className="is-peligro" onClick={()=>operar({op:'quitar',nodo:n.id})}><Trash2 size={14}/></button>
   </span>}
  </div>
  {n.error&&<p className="yq-nodo-error">{n.error}</p>}
  {c.pie&&<div className="yq-bloque-pie">{c.pie}</div>}
  {abierto&&<div id={panel} className="yq-bloque-editor">
   {c.editor}
   {añadir.length>0&&<div className="yq-bloque-anadir" role="group" aria-label={`Añadir a ${n.titulo}`}>
    <span>Añadir</span>
    {añadir.map(({t,puerto})=><button type="button" key={`${puerto.id}:${t}`} data-familia={familiaDe(t)} title={AYUDA[t]}
     onClick={()=>operar({op:'agregar',tipo:t,padre:n.id,...(puerto.id==='exito'||puerto.id==='fallo'?{rama:puerto.id}:{})})}>
     + {NOMBRE_TIPO[t]}{puerto.id==='exito'||puerto.id==='fallo'?` · ${puerto.etiqueta}`:''}
    </button>)}
   </div>}
  </div>}
 </li>;
}
