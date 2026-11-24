"use client";

import {MAX_HUELLA,normalizarHuella,type Huella} from '../lib/huellas-combate';

const dimensiones=Array.from({length:MAX_HUELLA},(_,i)=>i+1);
const campo='mt-1 w-full rounded-lg border border-neutral-700 bg-well p-2 text-neutral-100';

export default function EditorHuella({titulo,valor,defecto,onChange}:{
  titulo:string;valor?:Huella;defecto:string;onChange:(huella:Huella|undefined)=>void;
}){
  const huella=normalizarHuella(valor);
  return <fieldset className="space-y-2 rounded-lg border border-neutral-700 p-3">
    <legend className="px-1 font-semibold">{titulo}</legend>
    <label className="block text-sm">Configuración
      <select className={campo} value={valor?'propia':''} onChange={e=>onChange(e.target.value?{ancho:1,alto:1}:undefined)}>
        <option value="">{defecto}</option><option value="propia">Definir tamaño propio</option>
      </select>
    </label>
    {valor&&<div className="grid grid-cols-2 gap-2">
      <label className="block text-sm">Ancho (casillas)
        <select className={campo} value={huella.ancho} onChange={e=>onChange({...huella,ancho:Number(e.target.value)})}>
          {dimensiones.map(n=><option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label className="block text-sm">Alto (casillas)
        <select className={campo} value={huella.alto} onChange={e=>onChange({...huella,alto:Number(e.target.value)})}>
          {dimensiones.map(n=><option key={n} value={n}>{n}</option>)}
        </select>
      </label>
    </div>}
    <p className="text-xs text-neutral-400">Casillas que ocupa la ficha en el tablero.</p>
  </fieldset>;
}
