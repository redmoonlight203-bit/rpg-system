"use client";

import {useRef,useState} from 'react';
import type {AlcanceHabilidad} from '../lib/creacion';
import {girarPatron,MAX_RADIO_PATRON} from '../lib/patron-area';

type Patron=NonNullable<AlcanceHabilidad['patron']>;
const radio=MAX_RADIO_PATRON,lado=radio*2+1;
const teclas:Record<string,[number,number]>={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
const direcciones=[{nombre:'Norte',signo:'↑',x:0,y:-1},{nombre:'Este',signo:'→',x:1,y:0},{nombre:'Sur',signo:'↓',x:0,y:1},{nombre:'Oeste',signo:'←',x:-1,y:0}];
const puntos=Array.from({length:lado*lado},(_,i)=>({x:i%lado-radio,y:Math.floor(i/lado)-radio}));
const clave=({x,y}:{x:number;y:number})=>`${x},${y}`;
const etiqueta=(x:number,y:number)=>x===0&&y===0?'Casilla de referencia del lanzador':[
 x>0?`${x} al este`:x<0?`${-x} al oeste`:'',
 y>0?`${y} al sur`:y<0?`${-y} al norte`:'',
].filter(Boolean).join(', ');

export default function EditorPatronArea({valor,onChange}:{valor:Patron;onChange:(patron:Patron)=>void}){
 const [foco,setFoco]=useState('0,0');
 const [direccion,setDireccion]=useState(direcciones[1]);
 const botones=useRef(new Map<string,HTMLButtonElement>());
 const elegidas=new Set(valor.casillas.map(clave));
 const cantidad=valor.casillas.length;
 function alternar(x:number,y:number){
  const k=clave({x,y});
  onChange({...valor,casillas:elegidas.has(k)?valor.casillas.filter(p=>clave(p)!==k):[...valor.casillas,{x,y}]});
 }
 return <fieldset className="min-w-0 space-y-3 rounded-xl border border-sky-900/60 bg-neutral-950/40 p-3">
  <legend className="px-1 font-semibold text-sky-200">Dibuja las casillas que golpea</legend>
  <p className="text-xs text-neutral-400">Pulsa una casilla para pintarla y otra vez para borrarla. El marco dorado marca al lanzador y también se puede pintar. Con teclado, usa las flechas y Espacio.</p>
  <label className="block text-sm">Orientación al lanzar
   <select className="mt-1 block w-full max-w-sm rounded border border-neutral-700 bg-well p-2" value={valor.orientacion} onChange={e=>onChange({...valor,orientacion:e.target.value as Patron['orientacion']})}>
    <option value="fija">Fija: tal como lo dibujas</option>
    <option value="apuntar">Gira al apuntar</option>
   </select>
  </label>
  {valor.orientacion==='apuntar'&&<p className="text-xs text-neutral-400">Dibuja con el frente hacia la derecha (este). En combate eliges hacia qué lado girarlo antes de atacar.</p>}
  <div className="max-w-full overflow-x-auto pb-1">
   <div className="grid w-full max-w-[30rem] min-w-[21rem] gap-0.5" style={{gridTemplateColumns:`repeat(${lado}, minmax(0, 1fr))`}} role="group" aria-label="Cuadrícula para dibujar el ataque">
    {puntos.map(({x,y})=>{
     const k=clave({x,y}),afectada=elegidas.has(k),origen=x===0&&y===0;
     return <button type="button" key={k} ref={node=>{if(node)botones.current.set(k,node);else botones.current.delete(k);}}
      tabIndex={foco===k?0:-1} onFocus={()=>setFoco(k)} aria-label={etiqueta(x,y)} aria-pressed={afectada}
      className={`aspect-square rounded border text-xs font-bold focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-white ${afectada?'bg-sky-600 text-white':'bg-neutral-900 text-amber-100'} ${origen?'border-amber-400':'border-neutral-700 hover:border-sky-400'}`}
      onClick={()=>alternar(x,y)} onKeyDown={e=>{
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
  </div>
  {valor.orientacion==='apuntar'&&<details className="space-y-2 text-xs">
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
 const giradas=new Set(valor.casillas.map(p=>clave(girarPatron(p,{x:0,y:0},direccion))));
 return <div className="grid w-full max-w-56 gap-px" style={{gridTemplateColumns:`repeat(${lado}, minmax(0, 1fr))`}} aria-hidden="true">
  {puntos.map(p=>{
   const k=clave(p);
   return <span key={k} className={`aspect-square rounded-sm border ${k==='0,0'?'border-amber-400':'border-transparent'} ${giradas.has(k)?'bg-sky-600':'bg-neutral-800'}`}/>;
  })}
 </div>;
}
