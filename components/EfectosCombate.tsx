"use client";
import {createPortal} from 'react-dom';
import {useEffect,useRef,useState} from 'react';
import type {EventoVisual} from '../lib/combate';
import {buscarVFX,planificarVFX,type ClipVFX} from '../lib/vfx';
import {ColaVisual} from '../lib/cola-visual';
import {precargarVFX} from '../lib/precarga-vfx';
import './vfx.css';

type Lote={id:string;clips:ClipVFX[];pantalla?:string};
const reproducidos=new Set<string>();
function Sprite({clip,columnas,filas}:{clip:ClipVFX;columnas:number;filas:number}){
 const ref=useRef<HTMLSpanElement>(null),asset=buscarVFX(clip.animacion)!;
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  const x=(p:number)=>(p+.5)/columnas*100+'%',y=(p:number)=>(p+.5)/filas*100+'%';
  const anim=el.animate([
   {left:x(clip.desde.x),top:y(clip.desde.y),opacity:1},
   {left:x((clip.desde.x+clip.hasta.x)/2),top:y((clip.desde.y+clip.hasta.y)/2-(clip.salto?1.5:0)),opacity:1,offset:.5},
   {left:x(clip.hasta.x),top:y(clip.hasta.y),opacity:1}
  ],{duration:clip.duracion,delay:clip.inicio,fill:'none',easing:'linear'});
  return()=>anim.cancel();
 },[clip,columnas,filas]);
 return <span ref={ref} className="vfx-sprite" style={{left:(clip.desde.x+.5)/columnas*100+'%',top:(clip.desde.y+.5)/filas*100+'%',width:clip.escala/columnas*100+'%',height:clip.escala/filas*100+'%',opacity:0}}><ImagenDiferida clip={clip} src={asset.url}/></span>;
}
function ImagenDiferida({clip,src}:{clip:ClipVFX;src:string}){
 const [visible,setVisible]=useState(clip.inicio===0);
 useEffect(()=>{const timer=setTimeout(()=>setVisible(true),clip.inicio);return()=>clearTimeout(timer);},[clip.inicio]);
 return visible?<img src={src} alt="" style={{transform:`rotate(${clip.giro||0}deg)`}}/>:null;
}
export default function EfectosCombate({evento,columnas,filas}:{evento?:EventoVisual;columnas:number;filas:number}){
 const [lote,setLote]=useState<Lote>(),propio=useRef<string|undefined>(undefined);
 const cola=useRef<ColaVisual<Lote>>(undefined);
 useEffect(()=>{cola.current=new ColaVisual<Lote>(setLote,l=>Math.max(l.pantalla?1500:0,...l.clips.map(c=>c.inicio+c.duracion))+80);return()=>{cola.current?.cerrar();cola.current=undefined;};},[]);
 useEffect(()=>{
  if(!evento||(reproducidos.has(evento.id)&&propio.current!==evento.id)||!evento.creado_en||Date.now()-(evento.recibido_en||evento.creado_en)>10000)return;
  const clips=planificarVFX(evento).slice(0,24).map(c=>({...c,inicio:Math.min(c.inicio,800),duracion:Math.min(c.duracion,2400)}));if(!clips.length&&!evento.vfx?.pantalla)return;
  propio.current=evento.id;reproducidos.add(evento.id);if(reproducidos.size>250)reproducidos.delete(reproducidos.values().next().value!);
  precargarVFX(clips.map(c=>c.animacion));cola.current?.agregar({id:evento.id,clips,pantalla:evento.vfx?.pantalla?evento.nombre.split(" · ").pop():undefined});
 },[evento?.id]);
 return <div className="vfx-layer" aria-hidden="true">{lote?.pantalla&&createPortal(<div key={lote.id} className="vfx-paradoja" aria-hidden="true"><strong>{lote.pantalla}</strong></div>,document.body)}{lote?.clips.map(c=><Sprite key={lote.id+':'+c.id} clip={c} columnas={columnas} filas={filas}/>)}</div>;
}

export function AuraTransformacion({id,escala=1.5}:{id?:string;escala?:number}){
 const a=buscarVFX(id);if(!a)return null;
 const margen=(1-Math.max(.5,Math.min(4,escala)))*50;
 return <span className="vfx-aura" style={{inset:margen+'%'}} aria-hidden="true"><img src={a.bucle} alt="" loading="lazy"/></span>;
}
