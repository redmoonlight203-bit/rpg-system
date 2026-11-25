'use client';
import {useLayoutEffect,useState,type RefObject} from 'react';
import type {EventoVisual} from '../lib/combate';
import EfectosCombate from './EfectosCombate';
import AnimacionesArmas from './AnimacionesArmas';

import {anclarAlLanzador} from '../lib/ancla-visual';

export default function AnimacionesDelTablero({evento,tablero,columnas,filas}:{evento?:EventoVisual;tablero:RefObject<HTMLDivElement|null>;columnas:number;filas:number}){
 const [anclado,setAnclado]=useState<EventoVisual>();
 useLayoutEffect(()=>{
  // El segundo render depende de medir el retrato ya montado y debe preceder al primer fotograma.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  if(evento&&tablero.current)setAnclado(anclarAlLanzador(evento,tablero.current,columnas,filas));
  // La salida se captura una vez por evento, antes de pintar o mover la ficha.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[evento?.id,tablero,columnas,filas]);
 const visual=anclado?.id===evento?.id?anclado:undefined;
 return <>
  <EfectosCombate evento={visual} columnas={columnas} filas={filas}/>
  <AnimacionesArmas evento={visual} columnas={columnas} filas={filas}/>
  {visual?.desde&&visual.hasta&&!visual.vfx?.lanzamiento&&!visual.vfx?.recorrido&&!visual.vfx?.impacto&&!visual.arma_visual&&['proyectil','trayectoria','desplazamiento'].includes(visual.animacion||'')&&<svg key={visual.id} className="tactical-projectile" viewBox={`0 0 ${columnas*100} ${filas*100}`} preserveAspectRatio="none" aria-hidden="true"><line x1={visual.desde.x*100+50} y1={visual.desde.y*100+50} x2={visual.hasta.x*100+50} y2={visual.hasta.y*100+50}/></svg>}
 </>;
}
