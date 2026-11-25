'use client';
// Carta de elemento: un orbe que gira con el color del elemento, el kanji de su base y sus reglas como pips.
import type {CSSProperties,ReactNode} from 'react';
import IconoYugen from '../IconoYugen';
import {describirElemento,elementoBase,type DefinicionElemento} from '../../lib/elementos';

export const KANJI_BASE:Record<string,string>={fuego:'火',agua:'水',electricidad:'雷',hielo:'氷',luz_sagrada:'光'};

export default function CartaElemento({def,color,base=false,grande=false,onClick,pie,etiqueta}:{def:DefinicionElemento;color:string;base?:boolean;grande?:boolean;onClick?:()=>void;pie?:ReactNode;etiqueta?:string}){
 const reglas=[
  def.dados_extra&&`+${def.dados_extra.cantidad}d${def.dados_extra.caras}`,
  def.ignora_armadura&&`−${def.ignora_armadura} ARM`,
  ...(def.al_impactar||[]).map(x=>(x.estado_def?.nombre||x.estado).replace(/_/g,' ').split(':')[0]),
  def.cadena&&`⚡${def.cadena.dano}`,
 ].filter(Boolean) as string[];
 const contenido=<>
  <span className="ge-sello" aria-hidden="true">{KANJI_BASE[def.base]}</span>
  {base&&<span className="ge-base">Base</span>}
  <span className="ge-orbe" aria-hidden="true"><span className="ge-orbe-anillo"/><span className="ge-orbe-chispas"/><IconoYugen id={def.icono||'fuego'} size={grande?56:36}/></span>
  <strong className="ge-nombre">{def.nombre}</strong>
  <span className="ge-meta">{def.id!==def.base?<span>de {elementoBase(def.base)?.nombre.toLowerCase()}</span>:<span>Elemento primordial</span>}</span>
  <span className="ge-reglas">{reglas.length?reglas.map((r,i)=><span key={i}>{r}</span>):<span className="ge-vacio">Sin efectos extra</span>}</span>
  {grande&&<p className="ge-frase">{describirElemento(def)}</p>}
  {pie}
 </>;
 const clase=`ge-carta ge-carta-elemento${grande?' is-grande':''}`,estilo={'--aura':color} as CSSProperties;
 return onClick
  ?<button type="button" className={clase} style={estilo} onClick={onClick} aria-label={etiqueta||`Abrir ${def.nombre}`} title={describirElemento(def)}>{contenido}</button>
  :<div className={clase} style={estilo}>{contenido}</div>;
}
