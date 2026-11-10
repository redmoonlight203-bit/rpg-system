"use client";

import {useEffect, useRef, useState} from 'react';
import type {CSSProperties} from 'react';
import type {EventoVisual} from '../lib/combate';
import {geometriaAtaque} from '../lib/animaciones-armas';
import './animaciones-armas.css';

const reproducidos = new Set<string>();
type Ataque = EventoVisual & {arma_visual: NonNullable<EventoVisual['arma_visual']>};

const punto = (v: number, tamano: number) => ((v + .5) / tamano) * 100 + '%';

function DibujoEspada() {
  return <g className="weapon-sword-swing">
    <path d="M46 42 L83 44 L93 48 L83 52 L46 54 Z" fill="#d8e5f1" stroke="#4d5d6b" strokeWidth="2"/>
    <path d="M51 45 L84 46 L88 48 L51 48 Z" fill="#fff"/>
    <path d="M45 37 L51 37 L53 59 L45 59 Z" fill="#b99146" stroke="#4d352a" strokeWidth="2"/>
    <path d="M27 45 L45 45 L45 52 L27 52 Z" fill="#614332" stroke="#251f20" strokeWidth="2"/>
    <path d="M26 44 L30 44 L30 53 L26 53 Z" fill="#c69c59"/>
  </g>;
}
function DibujoArco() {
  return <g className="weapon-bow-pull">
    <path d="M46 20 Q15 48 46 76" fill="none" stroke="#3c241a" strokeWidth="9" strokeLinecap="round"/>
    <path d="M46 20 Q17 48 46 76" fill="none" stroke="#c78c4e" strokeWidth="5" strokeLinecap="round"/>
    <path d="M46 21 L32 48 L46 75" fill="none" stroke="#f6eee1" strokeWidth="1.8" className="weapon-bow-string"/>
    <path d="M30 47 L77 47 L77 49 L30 49 Z" fill="#bd986a"/>
    <path d="M70 43 L82 48 L70 53 Z" fill="#e6ecf0" stroke="#5c646a" strokeWidth="1.5"/>
    <path d="M32 48 L23 42 L23 48 L23 54 Z" fill="#b04b40"/>
  </g>;
}
function DibujoPunos() {
  return <>
    <g className="weapon-fist-first">
      <path d="M28 39 L51 39 L51 53 L28 53 Z" fill="#9b5941" stroke="#3f2726" strokeWidth="2"/>
      <path d="M50 34 L63 34 L68 38 L68 52 L63 55 L50 55 Z" fill="#deb087" stroke="#654333" strokeWidth="2"/>
      <path d="M53 35 L53 43 M60 35 L60 43" stroke="#a66e53" strokeWidth="2"/>
    </g>
    <g className="weapon-fist-second">
      <path d="M29 49 L47 49 L47 64 L29 64 Z" fill="#855039" stroke="#3f2726" strokeWidth="2"/>
      <path d="M46 45 L60 45 L65 49 L65 62 L60 66 L46 66 Z" fill="#c18a6f" stroke="#654333" strokeWidth="2"/>
      <path d="M49 46 L49 54 M56 46 L56 54" stroke="#855b4a" strokeWidth="2"/>
    </g>
  </>;
}
function Flecha({evento,columnas,filas,duracion,angulo}:{evento:Ataque;columnas:number;filas:number;duracion:number;angulo:number}) {
  const ref=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    const el=ref.current,desde=evento.desde,hasta=evento.hasta;
    if(!el||!desde||!hasta)return;
    const anim=el.animate([
      {left:punto(desde.x,columnas),top:punto(desde.y,filas),opacity:0,offset:0},
      {left:punto(desde.x+(hasta.x-desde.x)*.06,columnas),top:punto(desde.y+(hasta.y-desde.y)*.06,filas),opacity:1,offset:.06},
      {left:punto(desde.x+(hasta.x-desde.x)*.95,columnas),top:punto(desde.y+(hasta.y-desde.y)*.95,filas),opacity:1,offset:.95},
      {left:punto(hasta.x,columnas),top:punto(hasta.y,filas),opacity:0,offset:1},
    ],{duration:duracion,delay:170,easing:'linear',fill:'both'});
    return ()=>anim.cancel();
  },[evento.id,evento.desde,evento.hasta,columnas,filas,duracion]);
  if(!evento.desde)return null;
  return <span ref={ref} className="weapon-flying-arrow" style={{left:punto(evento.desde.x,columnas),top:punto(evento.desde.y,filas),width:100/columnas+'%',height:100/filas+'%',transform:`translate(-50%,-50%) rotate(${angulo}deg)`}}>
    <svg viewBox="0 0 96 96" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M8 46 L72 46 L72 50 L8 50 Z" fill="#be9664" stroke="#503b2d" strokeWidth="1"/>
      <path d="M68 40 L90 48 L68 56 L73 49 L73 47 Z" fill="#e0e7ed" stroke="#5e6976" strokeWidth="2"/>
      <path d="M18 46 L6 37 L6 45 L13 48 Z" fill="#a33d3d"/>
      <path d="M18 50 L6 59 L6 51 L13 48 Z" fill="#cf6157"/>
      <path d="M22 45 L53 45" stroke="#f1dfb5" strokeWidth="1"/>
    </svg>
  </span>;
}

/** Superposición de gestos: no escribe en la base de datos ni retrasa el turno. */
export default function AnimacionesArmas({evento,columnas,filas}:{evento?:EventoVisual;columnas:number;filas:number}) {
  const [activo,setActivo]=useState<Ataque|null>(null);
  useEffect(()=>{
    if(!evento?.arma_visual||!evento.desde||!evento.hasta||!evento.creado_en
      ||Date.now()-(evento.recibido_en||evento.creado_en)>10000||reproducidos.has(evento.id))return;
    reproducidos.add(evento.id);
    if(reproducidos.size>250)reproducidos.delete(reproducidos.values().next().value!);
    const actual=evento as Ataque;
    setActivo(actual);
    const duracion=geometriaAtaque(actual.desde!,actual.hasta!).duracionFlecha;
    const timeout=setTimeout(()=>setActivo(v=>v?.id===actual.id?null:v),duracion+700);
    return ()=>clearTimeout(timeout);
  },[evento?.id]);
  if(!activo?.desde||!activo.hasta)return null;
  const {angulo,duracionFlecha}=geometriaAtaque(activo.desde,activo.hasta);
  const origen:CSSProperties={left:punto(activo.desde.x,columnas),top:punto(activo.desde.y,filas),width:100/columnas+'%',height:100/filas+'%'};
  const final:CSSProperties={left:punto(activo.hasta.x,columnas),top:punto(activo.hasta.y,filas),width:100/columnas+'%',height:100/filas+'%',animationDelay:activo.arma_visual==='arco'?duracionFlecha+170+'ms':'260ms'};
  return <div key={activo.id} className="weapon-animation-layer" aria-hidden="true">
    <span className={`weapon-actor weapon-${activo.arma_visual}`} style={origen}>
      <svg viewBox="0 0 96 96" shapeRendering="crispEdges" className="weapon-held-svg" style={{transform:`rotate(${angulo}deg)`}}>
        {activo.arma_visual==='arco'?<DibujoArco/>:activo.arma_visual==='espada'?<DibujoEspada/>:<DibujoPunos/>}
      </svg>
    </span>
    {activo.arma_visual==='arco'&&<Flecha evento={activo} columnas={columnas} filas={filas} duracion={duracionFlecha} angulo={angulo}/>}
    <span className="weapon-contact" style={final}/>
  </div>;
}
