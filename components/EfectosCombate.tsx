"use client";
import {createPortal} from 'react-dom';
import {useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import type {EventoVisual} from '../lib/combate';
import {buscarVFX,esLanzamientoRayoDivino,separarVFX,transformacionClipVFX,transformacionVFX,planificarVFX,type ClipVFX} from '../lib/vfx';
import {ColaVisual} from '../lib/cola-visual';
import {FRACCION_AVANCE_HAZ} from '../lib/secuencia-vfx';
import {precargarVFX} from '../lib/precarga-vfx';
import './vfx.css';

type Lote={id:string;clips:ClipVFX[];pantalla?:string;contenedorPantalla?:HTMLElement};
const reproducidos=new Set<string>();
const SIN_EVENTOS:readonly EventoVisual[]=[];
function Sprite({clip,columnas,filas}:{clip:ClipVFX;columnas:number;filas:number}){
 const ref=useRef<HTMLSpanElement>(null),asset=buscarVFX(clip.animacion)!;
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  const x=(p:number)=>(p+.5)/columnas*100+'%',y=(p:number)=>(p+.5)/filas*100+'%';
  const anim=el.animate([
   {left:x(clip.desde.x),top:y(clip.desde.y),opacity:1,scale:clip.contacto?'1.18':'1'},
   {left:x((clip.desde.x+clip.hasta.x)/2),top:y((clip.desde.y+clip.hasta.y)/2-(clip.salto?1.5:0)),opacity:1,offset:.5},
   {left:x(clip.hasta.x),top:y(clip.hasta.y),opacity:1}
  ],{duration:clip.duracion,delay:clip.inicio,fill:'none',easing:'linear'});
  return()=>anim.cancel();
 },[clip,columnas,filas]);
 return <span ref={ref} data-clip={clip.id} className="vfx-sprite" style={{left:(clip.desde.x+.5)/columnas*100+'%',top:(clip.desde.y+.5)/filas*100+'%',width:clip.escala/columnas*100+'%',height:clip.escala/filas*100+'%',opacity:0}}><ImagenDiferida clip={clip} src={esLanzamientoRayoDivino(clip)?'/vfx/foundry/divine-beam-launch.png':asset.url}/></span>;
}
function Haz({clip,columnas,filas}:{clip:ClipVFX;columnas:number;filas:number}){
 const mascara=useId();
 const asset=buscarVFX(clip.animacion)!;
 const [visible,setVisible]=useState(clip.inicio===0);
 useEffect(()=>{const timer=setTimeout(()=>setVisible(true),clip.inicio);return()=>clearTimeout(timer);},[clip.inicio]);
 if(!visible)return null;
 const {base,cuartos,horizontal,vertical}=separarVFX(clip.animacion);
 const dx=clip.hasta.x-clip.desde.x,dy=clip.hasta.y-clip.desde.y;
 const largo=Math.hypot(dx,dy),angulo=Math.atan2(dy,dx)*180/Math.PI;
 const alto=clip.escala/2,divino=base==='foundry-divine-beam';
 const giro=(clip.giro??angulo)-angulo+cuartos*90;
 const sx=(horizontal!==!!clip.horizontal)?-1:1,sy=(vertical!==!!clip.vertical)?-1:1;
 const estilado={animation:`vfx-aparecer-haz ${clip.duracion}ms linear both`} as CSSProperties;
 return <svg className="vfx-haz" data-clip={clip.id} viewBox={`0 0 ${columnas} ${filas}`} preserveAspectRatio="none" style={estilado} aria-hidden="true">
  <g transform={`translate(${clip.desde.x+.5} ${clip.desde.y+.5}) rotate(${angulo})`}>
   <defs><clipPath id={mascara}><rect x={0} y={-alto/2} width={largo} height={alto}>
    <animate attributeName="width" from="0" to={largo} dur={`${Math.round(clip.duracion*FRACCION_AVANCE_HAZ)}ms`} fill="freeze"/>
   </rect></clipPath></defs>
   <g clipPath={`url(#${mascara})`}>
    <g transform={`translate(${largo/2} 0) scale(${sx} ${sy}) rotate(${giro}) translate(${-largo/2} 0)`}>
     {divino?<image href={asset.url} x={-alto/2} y={-largo*1.12} width={alto} height={largo*1.24} transform="rotate(90)" preserveAspectRatio="none"/>
      :<image href={asset.url} x={0} y={-alto/2} width={largo} height={alto} preserveAspectRatio="none"/>}
    </g>
   </g>
  </g>
 </svg>;
}
function ImagenDiferida({clip,src}:{clip:ClipVFX;src:string}){
 const [visible,setVisible]=useState(clip.inicio===0);
 useEffect(()=>{const timer=setTimeout(()=>setVisible(true),clip.inicio);return()=>clearTimeout(timer);},[clip.inicio]);
 return visible?<img src={src} alt="" style={{transform:transformacionClipVFX(clip)}}/>:null;
}
export default function EfectosCombate({eventos=SIN_EVENTOS,columnas,filas}:{eventos?:readonly EventoVisual[];columnas:number;filas:number}){
 const [lotes,setLotes]=useState<Lote[]>([]);
 const propios=useRef(new Set<string>());
 const defensaActiva=lotes.some(lote=>lote.clips.some(c=>separarVFX(c.animacion).base==='axioma-defensa'));
 const capa=useRef<HTMLDivElement>(null);
 useEffect(()=>{
   if(!defensaActiva || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   const tablero=capa.current?.parentElement;
   if(!tablero)return;
   const animaciones=tablero.getAnimations({subtree:true}).filter(anim=>{
     const objetivo=(anim.effect as KeyframeEffect|null)?.target;
     return anim.playState==='running' && objetivo instanceof Element && !capa.current?.contains(objetivo);
   });
   animaciones.forEach(anim=>anim.pause());
   const velo=document.createElement('div');
   Object.assign(velo.style,{position:'absolute',inset:'0',pointerEvents:'none',background:'radial-gradient(ellipse,transparent 20%,rgba(87,204,228,.32))'});
   capa.current?.appendChild(velo);
   velo.animate([{opacity:0},{opacity:1,offset:.23},{opacity:0}],{duration:430});
   const reanudar=()=>{animaciones.forEach(anim=>{if(anim.playState==='paused')anim.play()});velo.remove()};
   const timer=setTimeout(reanudar,430);
   return ()=>{clearTimeout(timer);reanudar()};
 },[defensaActiva]);
 const cola=useRef<ColaVisual<Lote>>(undefined);
 useEffect(()=>{
  cola.current=new ColaVisual<Lote>(setLotes,l=>Math.max(l.pantalla?1500:0,...l.clips.map(c=>c.inicio+c.duracion))+80);
  return ()=>{cola.current?.cerrar();cola.current=undefined;};
 },[]);
 useEffect(()=>{
  const receptor=cola.current;
  if(!receptor)return;
  for(const evento of eventos){
   if(receptor.tiene(evento.id)||(reproducidos.has(evento.id)&&!propios.current.has(evento.id))||!evento.creado_en||Date.now()-(evento.recibido_en||evento.creado_en)>10000)continue;
   const plan=planificarVFX(evento);
   const clips=evento.vfx?.secuencia&&evento.geometria_vfx?plan:plan.slice(0,24).map(c=>({...c,inicio:Math.min(c.inicio,800),duracion:Math.min(c.duracion,2400)}));
   if(!clips.length&&!evento.vfx?.pantalla)continue;
   propios.current.add(evento.id);
   if(propios.current.size>250)propios.current.delete(propios.current.values().next().value!);
   reproducidos.add(evento.id);
   if(reproducidos.size>250)reproducidos.delete(reproducidos.values().next().value!);
   precargarVFX(clips.map(c=>c.animacion));
   receptor.agregar({id:evento.id,clips,pantalla:evento.vfx?.pantalla?evento.nombre.split(" · ").pop():undefined,
    contenedorPantalla:capa.current?.closest('dialog')??undefined});
  }
 },[eventos]);
 return <div ref={capa} className="vfx-layer" aria-hidden="true">{lotes.map(lote=><LoteVisual key={lote.id} lote={lote} columnas={columnas} filas={filas}/>)}</div>;
}

function LoteVisual({lote,columnas,filas}:{lote:Lote;columnas:number;filas:number}){
 return <>{lote.pantalla&&createPortal(<div className="vfx-paradoja" aria-hidden="true"><strong>{lote.pantalla}</strong></div>,lote.contenedorPantalla??document.body)}
  {lote.clips.map(c=>c.haz
   ?<Haz key={c.id} clip={c} columnas={columnas} filas={filas}/>
   :<Sprite key={c.id} clip={c} columnas={columnas} filas={filas}/>)}</>;

}

export function AuraTransformacion({id,escala=1.5}:{id?:string;escala?:number}){
 const a=buscarVFX(id);if(!a)return null;
 const margen=(1-Math.max(.5,Math.min(4,escala)))*50;
 return <span className="vfx-aura" style={{inset:margen+'%'}} aria-hidden="true"><img style={{transform:transformacionVFX(id!)}} src={a.bucle} alt="" loading="lazy"/></span>;
}
