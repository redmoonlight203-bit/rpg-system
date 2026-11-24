"use client";

import {useRef,useState,type PointerEvent} from 'react';
import type {AlcanceHabilidad} from '../lib/creacion';
import {DIRECCIONES_PATRON,patronDesde,patronEnV,trazoPatron,MAX_RADIO_PATRON} from '../lib/patron-area';

type Patron=NonNullable<AlcanceHabilidad['patron']>;
const radio=MAX_RADIO_PATRON,lado=radio*2+1;
const teclas:Record<string,[number,number]>={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
const direcciones=DIRECCIONES_PATRON;
type Punto={x:number;y:number};
const puntos=Array.from({length:lado*lado},(_,i)=>({x:i%lado-radio,y:Math.floor(i/lado)-radio}));
const clave=({x,y}:{x:number;y:number})=>`${x},${y}`;
const etiqueta=(x:number,y:number)=>x===0&&y===0?'Casilla de referencia del lanzador':[
 x>0?`${x} al este`:x<0?`${-x} al oeste`:'',
 y>0?`${y} al sur`:y<0?`${-y} al norte`:'',
].filter(Boolean).join(', ');

export default function EditorPatronArea({valor,onChange}:{valor:Patron;onChange:(patron:Patron)=>void}){
 const [foco,setFoco]=useState('0,0');
 const [direccion,setDireccion]=useState<(typeof direcciones)[number]>(direcciones[0]);
 const botones=useRef(new Map<string,HTMLButtonElement>());
 const trazo=useRef<{id:number;borrar:boolean;casillas:Map<string,Punto>;ultimo:Punto}|null>(null);
 const elegidas=new Set(valor.casillas.map(clave));
 const cantidad=valor.casillas.length;
 function alternar(x:number,y:number){
  const k=clave({x,y});
  onChange({...valor,casillas:elegidas.has(k)?valor.casillas.filter(p=>clave(p)!==k):[...valor.casillas,{x,y}]});
 }
 function casillaEn(e:PointerEvent<HTMLDivElement>){
  const boton=e.currentTarget.ownerDocument.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLButtonElement>('[data-casilla-patron]');
  if(!boton||!e.currentTarget.contains(boton))return null;
  const coords=boton.dataset.casillaPatron?.split(',').map(Number);
  return coords?{x:coords[0],y:coords[1]}:null;
 }
 function pintar(e:PointerEvent<HTMLDivElement>){
  const s=trazo.current;if(!s||s.id!==e.pointerId)return;
  const p=casillaEn(e);if(!p)return;
  let cambio=false;
  for(const q of trazoPatron(s.ultimo,p)){
   const k=clave(q);
   if(s.borrar){if(s.casillas.delete(k))cambio=true;}
   else if(!s.casillas.has(k)){s.casillas.set(k,q);cambio=true;}
  }
  s.ultimo=p;
  if(cambio)onChange({...valor,casillas:[...s.casillas.values()]});
 }
 return <fieldset className="min-w-0 space-y-3 rounded-xl border border-sky-900/60 bg-neutral-950/40 p-3">
  <legend className="px-1 font-semibold text-sky-200">Dibuja las casillas que golpea</legend>
  <p className="text-xs text-neutral-400">Haz clic o arrastra para pintar. Si empiezas en una casilla pintada, el trazo borra. ◆ marca al lanzador. Con teclado, usa las flechas y Espacio.</p>
  <label className="block text-sm">Orientación al lanzar
   <select className="mt-1 block w-full max-w-sm rounded border border-neutral-700 bg-well p-2" value={valor.orientacion} onChange={e=>onChange({...valor,orientacion:e.target.value as Patron['orientacion']})}>
    <option value="fija">Fija: tal como lo dibujas</option>
    <option value="apuntar">Sigue el cursor (8 direcciones)</option>
   </select>
  </label>
  {valor.orientacion==='apuntar'&&<p className="text-xs text-neutral-400">Dibuja la abertura hacia →. En combate, mueve el cursor para orientar y haz clic para confirmar. El dibujo siempre nace del lanzador.</p>}
  <div className="max-w-full overflow-x-auto pb-1">
   <div className="grid w-full max-w-[30rem] min-w-[21rem] touch-none select-none gap-0.5" onPointerDown={e=>{
    if(e.button!==0||!e.isPrimary||trazo.current)return;
    const p=casillaEn(e);if(!p)return;
    trazo.current={id:e.pointerId,borrar:elegidas.has(clave(p)),casillas:new Map(valor.casillas.map(q=>[clave(q),q])),ultimo:p};
    e.currentTarget.setPointerCapture(e.pointerId);pintar(e);
   }} onPointerMove={pintar} onPointerUp={e=>{pintar(e);if(trazo.current?.id===e.pointerId)trazo.current=null;}}
    onPointerCancel={e=>{if(trazo.current?.id===e.pointerId)trazo.current=null;}}
    onLostPointerCapture={e=>{if(trazo.current?.id===e.pointerId)trazo.current=null;}} style={{gridTemplateColumns:`repeat(${lado}, minmax(0, 1fr))`}} role="group" aria-label="Cuadrícula para dibujar el ataque">
    {puntos.map(({x,y})=>{
     const k=clave({x,y}),afectada=elegidas.has(k),origen=x===0&&y===0;
     return <button type="button" key={k} ref={node=>{if(node)botones.current.set(k,node);else botones.current.delete(k);}}
      data-casilla-patron={k} tabIndex={foco===k?0:-1} onFocus={()=>setFoco(k)} aria-label={etiqueta(x,y)} aria-pressed={afectada}
      className={`aspect-square rounded border text-xs font-bold focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-white ${afectada?'bg-sky-600 text-white':'bg-neutral-900 text-amber-100'} ${origen?'border-amber-400':'border-neutral-700 hover:border-sky-400'}`}
      onClick={e=>{if(e.detail===0)alternar(x,y);}} onKeyDown={e=>{
       const paso=teclas[e.key];if(!paso)return;
       e.preventDefault();
       botones.current.get(clave({x:x+paso[0],y:y+paso[1]}))?.focus();
      }}>{origen?'◆':''}</button>;
    })}
   </div>
  </div>
  <div className="flex flex-wrap items-center gap-3 text-xs">
   <span role="status" className={cantidad?'text-sky-200':'text-amber-300'}>{cantidad?`${cantidad} ${cantidad===1?'casilla marcada':'casillas marcadas'}`:'Marca al menos una casilla antes de guardar.'}</span>
   <button type="button" className="rounded border border-neutral-700 px-2 py-1 disabled:opacity-40" disabled={!cantidad} onClick={()=>onChange({...valor,casillas:[]})}>Borrar dibujo</button>
   <button type="button" className="rounded border border-sky-800 px-2 py-1 text-sky-200" title="Sustituye el dibujo por una V que sigue el cursor" onClick={()=>onChange({orientacion:'apuntar',casillas:patronEnV()})}>Dibujar V</button>
  </div>
  {valor.orientacion==='apuntar'&&<details open className="space-y-2 text-xs">
   <summary className="cursor-pointer text-sky-200">Vista previa del giro</summary>
   <div className="flex flex-wrap gap-1" role="group" aria-label="Dirección de la vista previa">
    {direcciones.map(d=><button key={d.nombre} type="button" aria-pressed={direccion===d} onClick={()=>setDireccion(d)}
     className={`rounded border px-2 py-1 ${direccion===d?'border-sky-400 bg-sky-900':'border-neutral-700'}`}>{d.signo} {d.nombre}</button>)}
   </div>
   <VistaGiro valor={valor} direccion={direccion}/>
  </details>}
 </fieldset>;
}

function VistaGiro({valor,direccion}:{valor:Patron;direccion:(typeof direcciones)[number]}){
 const centro={x:radio,y:radio};
 const giradas=new Set(patronDesde(valor,centro,{x:radio+direccion.x,y:radio+direccion.y},{columnas:lado,filas:lado}).map(p=>clave({x:p.x-radio,y:p.y-radio})));
 return <div className="grid w-full max-w-56 gap-px" style={{gridTemplateColumns:`repeat(${lado}, minmax(0, 1fr))`}} aria-hidden="true">
  {puntos.map(p=>{
   const k=clave(p);
   return <span key={k} className={`aspect-square rounded-sm border ${k==='0,0'?'border-amber-400':'border-transparent'} ${giradas.has(k)?'bg-sky-600':'bg-neutral-800'}`}/>;
  })}
 </div>;
}
