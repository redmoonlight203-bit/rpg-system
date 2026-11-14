"use client";
import {useState} from "react";
export type FormaHistoria = {nombre:string; historia:string; imagen:string};
export default function FormasHistoria({formas,cambiar}:{formas:FormaHistoria[]; cambiar:(formas:FormaHistoria[])=>void}){
  const [abierto,abrir]=useState(false);
  function editar(indice:number,campos:Partial<FormaHistoria>){
    cambiar(formas.map((forma,i)=>i===indice?{...forma,...campos}:forma));
  }
  return <div><button type="button" aria-expanded={abierto} className="rounded-lg border px-4 py-2" onClick={()=>abrir(!abierto)}>Formas ({formas.length})</button>
    {abierto&&<div className="grid gap-3 py-3 md:grid-cols-2">{formas.map((forma,i)=><fieldset key={i} className="grid gap-2 rounded-xl border border-neutral-700 p-3">
      {forma.imagen&&<img src={forma.imagen} alt={forma.nombre} className="h-52 w-full rounded-lg object-contain"/>}
      <label>Nombre de la forma<input value={forma.nombre} onChange={e=>editar(i,{nombre:e.target.value})}/></label>
      <label>Historia<textarea value={forma.historia} onChange={e=>editar(i,{historia:e.target.value})}/></label>
      <label>Imagen (URL o ruta)<input value={forma.imagen} onChange={e=>editar(i,{imagen:e.target.value})}/></label>
      <button type="button" onClick={()=>cambiar(formas.filter((_,j)=>j!==i))}>Quitar forma</button>
    </fieldset>)}<button type="button" onClick={()=>cambiar([...formas,{nombre:"",historia:"",imagen:""}])}>Agregar forma</button></div>}
  </div>;
}
