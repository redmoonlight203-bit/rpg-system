'use client';
// Carta-talismán de un estado: aura del color elegido, icono flotante, sello de categoría, runas de poder y
// primitivas como pips. La usan la cuadrícula del grimorio y la vista previa en vivo del editor.
import type {CSSProperties,ReactNode} from 'react';
import IconoYugen from '../IconoYugen';
import {iconoEstado,ICONO_PRIMITIVA,NOMBRE_PRIMITIVA,describirEstado,type DefinicionEstado} from '../../lib/estados';
import {NOMBRE_CATEGORIA,poderEstado} from '../../lib/estados-biblioteca';

const SELLO:Record<string,string>={mental:'心',fisico:'体',elemental:'元',narrativo:'語'};
const duracionCorta=(d:DefinicionEstado)=>{const du=d.duracion;return du.tipo==='turnos'?`${du.turnos} T`:du.tipo==='combate'?'∞':du.tipo==='salvacion'?`CD ${du.salvacion.cd}`:'1 T';};

export default function CartaEstado({def,color,base=false,grande=false,onClick,pie,etiqueta}:{def:DefinicionEstado;color:string;base?:boolean;grande?:boolean;onClick?:()=>void;pie?:ReactNode;etiqueta?:string}){
 const poder=poderEstado(def);
 const contenido=<>
  <span className="ge-aura" aria-hidden="true"/>
  <span className="ge-sello" aria-hidden="true">{SELLO[def.categoria]}</span>
  {base&&<span className="ge-base">Base</span>}
  <span className="ge-icono" aria-hidden="true"><IconoYugen id={iconoEstado(def)} size={grande?64:40}/></span>
  <strong className="ge-nombre">{def.nombre.split(':')[0]}</strong>
  <span className="ge-meta"><span>{NOMBRE_CATEGORIA[def.categoria]}</span><span className="ge-dur" title="Duración">⧗ {duracionCorta(def)}</span></span>
  <span className="ge-poder" aria-label={`Poder ${poder} de 5`}>{[1,2,3,4,5].map(i=><i key={i} className={i<=poder?'is-on':''}/>)}</span>
  <span className="ge-pips">{def.efectos.length?def.efectos.map((p,i)=><span key={i} className="ge-pip" title={NOMBRE_PRIMITIVA[p.tipo]}><IconoYugen id={ICONO_PRIMITIVA[p.tipo]} size={14}/></span>):<span className="ge-vacio">Sin primitivas: solo narrativo</span>}</span>
  {grande&&<p className="ge-frase">{describirEstado(def)}</p>}
  {pie}
 </>;
 const clase=`ge-carta ge-${def.categoria}${grande?' is-grande':''}`,estilo={'--aura':color} as CSSProperties;
 return onClick
  ?<button type="button" className={clase} style={estilo} onClick={onClick} aria-label={etiqueta||`Abrir ${def.nombre}`} title={describirEstado(def)}>{contenido}</button>
  :<div className={clase} style={estilo}>{contenido}</div>;
}
