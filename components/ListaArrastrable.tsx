"use client";
import {useId,useState,type ReactNode} from 'react';
import {GripVertical,ArrowUp,ArrowDown} from 'lucide-react';
import {moverElemento,leerOrden} from '../lib/orden-visual';
import './editor-yunque.css';
/** El asa arrastra; los campos siguen siendo seleccionables. Los botones funcionan en móvil y teclado. */
export default function ListaArrastrable<T>({items,onChange,nombre,render,disabled=false}:{items:T[];onChange:(items:T[])=>void;nombre:string;render:(item:T,index:number)=>ReactNode;disabled?:boolean}){
 const grupo=useId(),[destino,setDestino]=useState<number|null>(null);
 const mover=(desde:number,hasta:number)=>{if(!disabled)onChange(moverElemento(items,desde,hasta));setDestino(null);};
 return <div className="yunque-lista-visual" aria-label={nombre}>{items.map((item,i)=><div key={(item as {id?:string}).id||i} className={`yunque-ordenable ${destino===i?'yunque-destino':''}`} onDragOver={e=>{if(!disabled&&e.dataTransfer.types.includes('application/x-yugen-orden')){e.preventDefault();e.stopPropagation();setDestino(i);}}} onDragLeave={()=>setDestino(null)} onDrop={e=>{const desde=leerOrden(e.dataTransfer.getData('application/x-yugen-orden'),grupo,items.length);if(desde!==null){e.preventDefault();e.stopPropagation();mover(desde,i);}setDestino(null);}}>
  <div className="yunque-orden-barra"><button type="button" disabled={disabled} draggable={!disabled} aria-label={`Arrastrar ${nombre} ${i+1}`} onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData('application/x-yugen-orden',JSON.stringify({grupo,indice:i}));e.dataTransfer.effectAllowed='move';}} onDragEnd={()=>setDestino(null)}><GripVertical size={16}/><span>{i+1} · Arrastra para ordenar</span></button><div><button type="button" disabled={disabled||i===0} aria-label={`Subir ${nombre} ${i+1}`} onClick={()=>mover(i,i-1)}><ArrowUp size={15}/></button><button type="button" disabled={disabled||i===items.length-1} aria-label={`Bajar ${nombre} ${i+1}`} onClick={()=>mover(i,i+1)}><ArrowDown size={15}/></button></div></div>
  {render(item,i)}
 </div>)}<span className="sr-only" role="status">{items.length} {nombre}. Arrastra por el asa o usa los botones subir y bajar.</span></div>;
}
