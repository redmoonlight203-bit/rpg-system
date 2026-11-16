'use client';
// Primitivas de juego (design.md v3 §4): Runa, Marco, BarraVital, Medallon, Sello.
import {useEffect,useRef,useState,type HTMLAttributes,type ReactNode} from 'react';
import {runaDe} from '../../lib/runas';
import {cn} from './cn';

/** Runa de sección: imagen del propietario teñida con máscara, o el kanji anterior mientras no llegue. */
export function Runa({seccion,size=40,className}:{seccion:string;size?:number;className?:string}){
 const r=runaDe(seccion);
 if(r.imagen)return <span aria-hidden="true" className={cn('y3-runa',className)} style={{width:size,height:size,WebkitMaskImage:`url(${r.imagen})`,maskImage:`url(${r.imagen})`}}/>;
 return <span aria-hidden="true" className={cn('y3-runa-kanji',className)} style={{fontSize:size*0.85,width:size,height:size}}>{r.kanji}</span>;
}

const Esquina=({className}:{className:string})=><svg className={`y3-marco-esquina ${className}`} viewBox="0 0 28 28" aria-hidden="true"><path d="M1 27V9Q1 1 9 1h18" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M5 27V12q0-7 7-7h15" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".6"/><rect x="3.2" y="3.2" width="4" height="4" transform="rotate(45 5.2 5.2)" fill="currentColor"/></svg>;

/** Panel con esquinas ornamentadas. `titulo` opcional en la parte superior. */
export function Marco({titulo,accion,brillo,className,children,...props}:HTMLAttributes<HTMLElement>&{titulo?:ReactNode;accion?:ReactNode;brillo?:boolean}){
 return <section {...props} className={cn('y3-marco',brillo&&'y3-marco--brillo',className)}>
  <Esquina className="is-ti"/><Esquina className="is-td"/><Esquina className="is-bi"/><Esquina className="is-bd"/>
  {(titulo||accion)&&<header className="y3-marco-cab">{titulo&&<h2>{titulo}</h2>}{accion}</header>}
  {children}
 </section>;
}

type TipoBarra='vida'|'ph'|'fatiga'|'exp';
/** Barra de recurso con relleno animado (transform) y destello cuando cambia el valor. */
export function BarraVital({etiqueta,valor,max,tipo='vida',grande=false}:{etiqueta:string;valor:number;max:number;tipo?:TipoBarra;grande?:boolean}){
 const limite=Math.max(0,max),actual=Math.min(limite,Math.max(0,valor)),fraccion=limite?actual/limite:0;
 const previo=useRef(actual),[destello,setDestello]=useState(0);
 useEffect(()=>{if(previo.current!==actual){previo.current=actual;const t=setTimeout(()=>setDestello(d=>d+1),0);return()=>clearTimeout(t);}},[actual]);
 return <div className={cn('y3-barra',`y3-barra--${tipo}`,grande&&'y3-barra--grande')}>
  <div className="y3-barra-cab"><span>{etiqueta}</span><strong>{actual}<small> / {limite}</small></strong></div>
  <div className="y3-barra-pista" role="progressbar" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={limite||1} aria-valuenow={actual} aria-valuetext={`${actual} de ${limite}`}>
   <div className="y3-barra-relleno" style={{transform:`scaleX(${fraccion})`}}/>
   {destello>0&&<span key={destello} className="y3-barra-destello" aria-hidden="true"/>}
  </div>
 </div>;
}

/** Atributo como medallón: cifra grande dentro de un círculo con borde de oro. */
export function Medallon({etiqueta,valor,detalle}:{etiqueta:string;valor:ReactNode;detalle?:ReactNode}){
 return <div className="y3-medallon"><div className="y3-medallon-disco"><strong>{valor}</strong></div><span>{etiqueta}</span>{detalle&&<small>{detalle}</small>}</div>;
}

/** Sello de lacre para decisiones y logros (aprobado, victoria, nivel). `celebrar` anima su aparición una vez. */
export function Sello({texto,runa='承',celebrar=false}:{texto:string;runa?:string;celebrar?:boolean}){
 // `runa` puede ser un kanji o la ruta de una runa en imagen (/arte/runas/…), que se pinta en blanco con máscara.
 const imagen=runa.startsWith('/');
 return <span className={cn('y3-sello',celebrar&&'y3-sello--celebrar')}><span className="y3-sello-lacre" aria-hidden="true">{imagen?<span className="y3-sello-runa" style={{WebkitMaskImage:`url(${runa})`,maskImage:`url(${runa})`}}/>:runa}</span><span>{texto}</span></span>;
}
