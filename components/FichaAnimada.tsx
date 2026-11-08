"use client";
import {useLayoutEffect,useRef,type ReactNode} from 'react';
import type {EventoVisual,MapaCombate} from '../lib/combate';
import type {FichaTablero} from './TableroCombate';
import {rutaVisual} from '../lib/movimiento-visual';

export default function FichaAnimada({ficha,fichas,evento,columnas,filas,mapa,children}:{ficha:FichaTablero;fichas:FichaTablero[];evento?:EventoVisual;columnas:number;filas:number;mapa?:MapaCombate;children:ReactNode}){
 const ref=useRef<HTMLSpanElement>(null);
 useLayoutEffect(()=>{
  const el=ref.current,m=evento?.movimientos?.find(m=>m.id===ficha.id);
  if(!el||!m||!evento?.creado_en||Date.now()-(evento.recibido_en||evento.creado_en)>10000||matchMedia('(prefers-reduced-motion: reduce)').matches||!el.animate)return;
  const celda=el.parentElement!,rect=celda.getBoundingClientRect();
  const ruta=m.tipo==='salto'||m.tipo==='teletransporte'?[m.desde,m.hasta]:rutaVisual(m.desde,m.hasta,columnas,filas,fichas.filter(f=>f.id!==ficha.id).map(f=>f.posicion),mapa);
  if(!ruta.length)return;
  celda.classList.add('token-moving');
  const frames=ruta.map((p,i)=>({transform:`translate(${(p.x-m.hasta.x)*rect.width}px, ${(p.y-m.hasta.y)*rect.height}px)`,offset:i/Math.max(1,ruta.length-1)}));
  const teleport=m.tipo==='teletransporte';
  const anim=el.animate(teleport?[{opacity:0},{opacity:1}]:m.tipo==='salto'?[frames[0],{transform:`translate(${(m.desde.x-m.hasta.x)*rect.width/2}px, ${(m.desde.y-m.hasta.y)*rect.height/2-rect.height}px)`,offset:.5},frames[1]]:frames,{duration:teleport?200:Math.min(1400,Math.max(240,(ruta.length-1)*140)),easing:'linear'});
  anim.onfinish=()=>celda.classList.remove('token-moving');
  return()=>{anim.cancel();celda.classList.remove('token-moving');};
 // Un evento confirmado se reproduce una vez, sin reiniciarse por refrescos de estado.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[evento?.id,ficha.id]);
 return <span ref={ref} className="tactical-token">{children}</span>;
}
