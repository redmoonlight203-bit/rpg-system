'use client';
import {useLayoutEffect,useRef,useState,type RefObject} from 'react';
import type {EventoVisual} from '../lib/combate';
import EfectosCombate from './EfectosCombate';
import AnimacionesArmas from './AnimacionesArmas';

import {tieneClipsVFX} from '../lib/vfx';
import {anclarAlLanzador} from '../lib/ancla-visual';

const SIN_EVENTOS:readonly EventoVisual[]=[];

export default function AnimacionesDelTablero({evento,eventos=SIN_EVENTOS,tablero,columnas,filas}:{evento?:EventoVisual;eventos?:readonly EventoVisual[];tablero:RefObject<HTMLDivElement|null>;columnas:number;filas:number}){
 const anclas=useRef(new WeakMap<EventoVisual,EventoVisual>());
 const [anclados,setAnclados]=useState<readonly EventoVisual[]>(SIN_EVENTOS);
 useLayoutEffect(()=>{
  const capa=tablero.current;
  if(!capa)return;
  const nuevos=evento&&!eventos.some(e=>e.id===evento.id)?[...eventos,evento]:eventos;
  // La salida se mide una sola vez por evento, antes de pintar o mover la ficha.
  setAnclados(nuevos.map(e=>{
   const anterior=anclas.current.get(e);
   if(anterior)return anterior;
   const siguiente=anclarAlLanzador(e,capa,columnas,filas);
   anclas.current.set(e,siguiente);
   return siguiente;
  }));
 },[evento,eventos,tablero,columnas,filas]);
 const ultimo=anclados.at(-1);
 const visual=ultimo?.id===evento?.id?ultimo:undefined;
 return <>
  <EfectosCombate eventos={anclados} columnas={columnas} filas={filas}/>
  <AnimacionesArmas evento={visual} columnas={columnas} filas={filas}/>
  {visual?.desde&&visual.hasta&&!tieneClipsVFX(visual.vfx)&&!visual.arma_visual&&['proyectil','trayectoria','desplazamiento'].includes(visual.animacion||'')&&<svg key={visual.id} className="tactical-projectile" viewBox={`0 0 ${columnas*100} ${filas*100}`} preserveAspectRatio="none" aria-hidden="true"><line x1={visual.desde.x*100+50} y1={visual.desde.y*100+50} x2={visual.hasta.x*100+50} y2={visual.hasta.y*100+50}/></svg>}
 </>;
}
