"use client";

import {useEffect, useRef, useState} from 'react';
import type {CSSProperties} from 'react';
import type {EventoVisual} from '../lib/combate';
import {geometriaAtaque} from '../lib/animaciones-armas';
import {esqueletoBase,duracionGesto,type Esqueleto,type FamiliaGesto} from '../lib/esqueletos';
import './animaciones-armas.css';

const reproducidos = new Set<string>();
type Ataque = EventoVisual & {arma_visual: NonNullable<EventoVisual['arma_visual']>};

const punto = (v: number, tamano: number) => ((v + .5) / tamano) * 100 + '%';

function DibujoEspada() {
  return <g className="weapon-sword-swing weapon-gesto">
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
function DibujoHacha() {
  return <g className="weapon-gesto">
    <path d="M22 47 L74 45 L74 51 L22 53 Z" fill="#6b4a33" stroke="#2a1d18" strokeWidth="2"/>
    <path d="M66 30 Q86 32 88 48 Q86 64 66 66 L70 54 L70 42 Z" fill="#c9d3dc" stroke="#45505a" strokeWidth="2"/>
    <path d="M70 36 Q82 40 83 48" fill="none" stroke="#fff" strokeWidth="1.5"/>
    <path d="M20 46 L26 46 L26 54 L20 54 Z" fill="#b48a4c"/>
  </g>;
}
function DibujoLanza() {
  return <g className="weapon-gesto">
    <path d="M6 47 L76 47 L76 50 L6 50 Z" fill="#8a6440" stroke="#2f2219" strokeWidth="1.5"/>
    <path d="M74 41 L94 48.5 L74 56 L78 48.5 Z" fill="#dfe8ef" stroke="#56626c" strokeWidth="2"/>
    <path d="M70 44 L74 44 L74 53 L70 53 Z" fill="#b04b40"/>
  </g>;
}
function DibujoBaston() {
  return <g className="weapon-gesto">
    <path d="M14 54 L86 42 L87 46 L15 58 Z" fill="#7a5532" stroke="#2c1f17" strokeWidth="1.5"/>
    <circle cx="88" cy="43" r="6" fill="#b9f5c5" stroke="#3d6b47" strokeWidth="2"/>
    <circle cx="88" cy="43" r="2.5" fill="#fff"/>
    <path d="M30 51 L34 51 L35 56 L31 56 Z" fill="#c69c59"/>
  </g>;
}
/** Dibujo de cada esqueleto base; un esqueleto creado por el GM usa el de su base (o el de su familia de gesto). */
const DIBUJO:Record<string,()=>React.JSX.Element>={espada:DibujoEspada,hacha:DibujoHacha,lanza:DibujoLanza,arco:DibujoArco,baston:DibujoBaston,punos:DibujoPunos};
const BASE_DE_FAMILIA:Record<FamiliaGesto,string>={corte:'espada',golpe_pesado:'hacha',estocada:'lanza',tiro:'arco',barrido:'baston',impacto_corto:'punos'};
export function esqueletoDelEvento(e:Pick<EventoVisual,'arma_visual'|'esqueleto'>):Esqueleto{
  return e.esqueleto||esqueletoBase(e.arma_visual)||esqueletoBase('espada')!;
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
    const duracion=Math.max(geometriaAtaque(actual.desde!,actual.hasta!).duracionFlecha,duracionGesto(esqueletoDelEvento(actual)));
    const timeout=setTimeout(()=>setActivo(v=>v?.id===actual.id?null:v),duracion+700);
    return ()=>clearTimeout(timeout);
  },[evento?.id]);
  if(!activo?.desde||!activo.hasta)return null;
  const {angulo,duracionFlecha}=geometriaAtaque(activo.desde,activo.hasta);
  // Todo sale del esqueleto: familia de gesto, fases (duraciones), longitud y color de la estela.
  const esq=esqueletoDelEvento(activo),familia=esq.familia_gesto,dibujo=DIBUJO[esq.id]||DIBUJO[esq.base||'']||DIBUJO[BASE_DE_FAMILIA[familia]];
  const total=duracionGesto(esq),impacto=esq.fases.preparacion+esq.fases.impacto;
  const tiro=familia==='tiro'||!!esq.proyectil;
  const vars={['--gesto-duracion' as string]:total+'ms',['--gesto-escala' as string]:String(Math.max(.3,Math.min(3,esq.longitud_relativa))),['--estela' as string]:esq.color||'#f1e4bd'} as CSSProperties;
  const origen:CSSProperties={left:punto(activo.desde.x,columnas),top:punto(activo.desde.y,filas),width:100/columnas+'%',height:100/filas+'%',...vars};
  const final:CSSProperties={left:punto(activo.hasta.x,columnas),top:punto(activo.hasta.y,filas),width:100/columnas+'%',height:100/filas+'%',animationDelay:tiro?duracionFlecha+170+'ms':impacto+'ms',...vars};
  const Dibujo=dibujo;
  return <div key={activo.id} className="weapon-animation-layer" aria-hidden="true" data-esqueleto={esq.id} data-familia={familia}>
    <span className={`weapon-actor weapon-${esq.base||esq.id} gesto-${familia}`} style={origen}>
      <svg viewBox="0 0 96 96" shapeRendering="crispEdges" className="weapon-held-svg" style={{transform:`rotate(${angulo}deg) scale(var(--gesto-escala))`}}>
        {familia!=='tiro'&&familia!=='impacto_corto'&&<path className="weapon-estela" d="M40 20 Q96 30 84 76" fill="none" stroke="var(--estela)" strokeWidth="4" strokeLinecap="round"/>}
        <Dibujo/>
      </svg>
    </span>
    {tiro&&<Flecha evento={activo} columnas={columnas} filas={filas} duracion={duracionFlecha} angulo={angulo}/>}
    <span className="weapon-contact" style={final}/>
  </div>;
}
