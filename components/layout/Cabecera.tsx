'use client';
import {useRef,type ReactNode} from 'react';
import {Kintsugi} from '../ui/Signature';

/** Cabecera común de pantalla (design.md §8): kanji índice, migas, título, subtítulo, acciones y kintsugi. */
export function Cabecera({kanji,migas,titulo,subtitulo,acciones,children}:{kanji:string;migas?:string;titulo:ReactNode;subtitulo?:ReactNode;acciones?:ReactNode;children?:ReactNode}){
 return <header className="y-cab">
  <div className="y-cab-fila">
   <span className="y-cab-kanji" aria-hidden="true">{kanji}</span>
   <div className="y-cab-texto">
    {migas&&<p className="y-cab-migas">{migas}</p>}
    <h1>{titulo}</h1>
    {subtitulo&&<p className="y-cab-sub">{subtitulo}</p>}
   </div>
   {acciones&&<div className="y-cab-acciones">{acciones}</div>}
  </div>
  {children}
  <Kintsugi className="y-cab-kintsugi"/>
 </header>;
}

export type Seccion={id:string;etiqueta:ReactNode;cuenta?:number;icono?:ReactNode};

/** Barra de secciones con subrayado oro. La pantalla decide qué contenido muestra según `valor`. */
export function Secciones({items,valor,onCambio,etiqueta}:{items:Seccion[];valor:string;onCambio:(id:string)=>void;etiqueta:string}){
 const refs=useRef<(HTMLButtonElement|null)[]>([]);
 return <div role="tablist" aria-label={etiqueta} className="y-secciones">{items.map((s,i)=><button key={s.id} ref={el=>{refs.current[i]=el;}} type="button" role="tab" aria-selected={valor===s.id} tabIndex={valor===s.id?0:-1}
  onClick={()=>onCambio(s.id)}
  onKeyDown={e=>{let n=i;if(e.key==='ArrowRight')n=(i+1)%items.length;else if(e.key==='ArrowLeft')n=(i-1+items.length)%items.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=items.length-1;else return;e.preventDefault();onCambio(items[n].id);refs.current[n]?.focus();}}>
  {s.icono}<span>{s.etiqueta}</span>{s.cuenta!==undefined&&<b className="y-secciones-cuenta">{s.cuenta}</b>}</button>)}</div>;
}
