"use client";
// Inventario como ventana centrada y privada: solo la ve quien la abre. No usa la sincronización del
// combate; el estado de juego sí se sincroniza cuando se equipa o se usa algo (lo hace quien llama).
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {FlaskConical,Pin,PinOff,X} from 'lucide-react';
import './ventana-inventario.css';

export type ConsumibleFijable={id:string;nombre:string;cantidad?:number;imagen_url?:string};
const MAX_FIJADOS=6;

export default function VentanaInventario({abierta,onCerrar,titulo,children,consumibles=[],fijados=[],onFijados}:{abierta:boolean;onCerrar:()=>void;titulo:string;children:ReactNode;consumibles?:ConsumibleFijable[];fijados?:string[];onFijados?:(ids:string[])=>void}){
 const ref=useRef<HTMLDialogElement>(null),[sobre,setSobre]=useState<number|null>(null);
 useEffect(()=>{const d=ref.current;if(!d)return;if(abierta&&!d.open)d.showModal?.();else if(!abierta&&d.open)d.close();},[abierta]);
 const porId=new Map(consumibles.map(c=>[c.id,c]));
 const ranuras=Array.from({length:MAX_FIJADOS},(_,i)=>fijados[i]&&porId.get(fijados[i])?fijados[i]:null);
 function fijar(id:string,pos?:number){
  const lista=fijados.filter(x=>x!==id&&porId.has(x));
  lista.splice(pos===undefined?lista.length:Math.min(pos,lista.length),0,id);
  onFijados?.(lista.slice(0,MAX_FIJADOS));
 }
 const quitar=(id:string)=>onFijados?.(fijados.filter(x=>x!==id));
 return <dialog ref={ref} className="ventana-inventario" aria-label={titulo} onCancel={e=>{e.preventDefault();onCerrar();}} onClose={onCerrar} onClick={e=>{if(e.target===ref.current)onCerrar();}}>
  {abierta&&<>
   <header className="ventana-inventario-cab"><div><span>Solo lo ves tú</span><h2>{titulo}</h2></div><button type="button" aria-label="Cerrar inventario" onClick={onCerrar}><X size={20}/></button></header>
   {onFijados&&<section className="ventana-barra" aria-label="Consumibles en la barra de acciones">
    <p>Arrastra un consumible a una ranura para tenerlo en la barra de acciones. También puedes usar «Fijar».</p>
    <ol className="ventana-barra-ranuras">{ranuras.map((id,i)=>{const c=id?porId.get(id):undefined;return <li key={i} className={`${sobre===i?'sobre':''} ${c?'llena':''}`}
     onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';setSobre(i);}} onDragLeave={()=>setSobre(s=>s===i?null:s)}
     onDrop={e=>{e.preventDefault();setSobre(null);const id=e.dataTransfer.getData('text/x-consumible');if(id&&porId.has(id))fijar(id,i);}}>
     {c?<><span className="ventana-barra-arte" draggable onDragStart={e=>{e.dataTransfer.setData('text/x-consumible',c.id);e.dataTransfer.effectAllowed='move';}}>{c.imagen_url?<img src={c.imagen_url} alt=""/>:<FlaskConical size={20} aria-hidden="true"/>}</span><strong>{c.nombre}</strong><button type="button" aria-label={`Quitar ${c.nombre} de la barra`} onClick={()=>quitar(c.id)}><PinOff size={14}/></button></>:<small>{i+1}</small>}
    </li>;})}</ol>
    {!!consumibles.length&&<ul className="ventana-barra-lista">{consumibles.map(c=>{const fijado=fijados.includes(c.id);return <li key={c.id} draggable onDragStart={e=>{e.dataTransfer.setData('text/x-consumible',c.id);e.dataTransfer.effectAllowed='move';}}>
     <span className="ventana-barra-arte">{c.imagen_url?<img src={c.imagen_url} alt=""/>:<FlaskConical size={18} aria-hidden="true"/>}</span><span>{c.nombre}{c.cantidad!==undefined&&<small> ×{c.cantidad}</small>}</span>
     <button type="button" disabled={!fijado&&fijados.filter(x=>porId.has(x)).length>=MAX_FIJADOS} onClick={()=>fijado?quitar(c.id):fijar(c.id)}>{fijado?<><PinOff size={14}/> Quitar</>:<><Pin size={14}/> Fijar</>}</button>
    </li>;})}</ul>}
   </section>}
   <div className="ventana-inventario-cuerpo">{children}</div>
  </>}
 </dialog>;
}
