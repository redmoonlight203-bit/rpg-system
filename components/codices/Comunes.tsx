"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ChevronRight,Pencil,Swords,Trash2} from "lucide-react";
import {TIPOS} from "../../lib/creacion";
import {plantilla} from "../../lib/codices";
import {mensajeError} from "../../lib/errores";
import type {PiezaGaleria} from "../GaleriaCreacion";
import type {ContextoCodice} from "./tipos";
import type {ReactNode} from "react";

export function textoEyebrow<T extends PiezaGaleria>(ctx:ContextoCodice<T>):string{
  return plantilla(ctx.config.codices[ctx.codice].eyebrow,ctx.vars);
}

/** Nombre (h2 que recibe el foco al abrir), eyebrow configurable, descripción y etiquetas. */
export function CabeceraCodice<T extends PiezaGaleria>({ctx,conFoco=true,children}:{ctx:ContextoCodice<T>;conFoco?:boolean;children?:ReactNode}){
  const {item}=ctx;
  const eyebrow=textoEyebrow(ctx);
  return <header className="cx-cabecera">
    {eyebrow&&<span className="cg-eyebrow cx-eyebrow">{eyebrow}</span>}
    {conFoco
      ?<h2 className="cx-nombre" tabIndex={-1} id={ctx.idTitulo}>{item.nombre}</h2>
      :<h3 className="cx-nombre">{item.nombre}</h3>}
    <p className="cx-descripcion">{item.descripcion||"Sin descripción."}</p>
    <div className="cg-detail-tags">
      <span>Clase {item.clase||"D"}</span>
      <span>{item.es_grupo?"Malla · valores por rango":"Único · valores fijos"}</span>
      {item.ligado_al_alma&&<span>Ligado al alma</span>}
    </div>
    {children}
  </header>;
}

/** Editar, entregar, preparar batalla y publicar: mismas condiciones y textos que la ficha anterior. */
export function AccionesCreacion<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  const {item,props,tipo,ocupado,presentacion}=ctx;
  const router=useRouter();
  const destino=`${tipo==="personaje"?"/dm/tienda-almas":"/dm/mercado"}?forja=${item.id}`;
  return <div className="cg-detail-actions cx-acciones">
    <button type="button" className="cg-button cg-primary" disabled={ocupado} onClick={()=>ctx.navegar(()=>props.onEditar(item))}><Pencil size={15}/>Editar ficha</button>
    <button type="button" className="cg-button" disabled={ocupado||!!item.alma_en_uso} onClick={()=>props.onEntregar(item)}>
      {item.ligado_al_alma?(item.alma_en_uso?"Ya entregada · Restablece para recuperar":"Entregar única al baúl"):"Entregar"}
    </button>
    {tipo==="personaje"&&!item.ligado_al_alma&&<button type="button" className="cg-button" disabled={ocupado} onClick={()=>props.onBatalla(item)}><Swords size={15}/>Preparar batalla</button>}
    <Link className="cg-button" href={destino} onClick={e=>{
      if(!ocupado&&!presentacion.dirty)return;
      e.preventDefault();
      ctx.navegar(()=>router.push(destino));
    }}>Publicar en tienda</Link>
  </div>;
}

/** Restablecer una pertenencia del alma y eliminar la creación. */
export function ZonaPeligro<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  const {item,props,ocupado,presentacion:p}=ctx;
  return <>
    {item.ligado_al_alma&&props.onRestablecer&&<aside className="yunque-resumen">
      <strong>Una sola pertenencia del alma</strong>
      <p>Se entrega al baúl de una cuenta. Restablecer la retira de los jugadores y la deja únicamente en La creación. Termina cualquier encuentro activo antes de hacerlo.</p>
      <button type="button" className="cg-button" disabled={ocupado} onClick={async()=>{p.setGuardando(true);try{await props.onRestablecer!(item);}finally{p.setGuardando(false);}}}>Restablecer y devolver a La creación</button>
    </aside>}
    <footer className="cg-danger-zone">
      <p>Las copias existentes conservan sus valores.</p>
      <button type="button" className="cg-button" disabled={ocupado} onClick={()=>ctx.navegar(()=>{void props.onEliminar(item).catch(e=>p.setError(mensajeError(e,"No se pudo eliminar.")));})}><Trash2 size={14}/>Eliminar creación</button>
    </footer>
  </>;
}

/** Botón que abre otra creación dentro de la vista, o texto atenuado si ya no existe. */
export function EnlaceCreacion<T extends PiezaGaleria>({ctx,id,className="",etiqueta,children}:{ctx:ContextoCodice<T>;id:string;className?:string;etiqueta?:string;children:ReactNode}){
  const destino=ctx.props.items.find(i=>i.id===id);
  if(!destino)return <span className="cx-no-disponible">Creación no disponible</span>;
  return <button type="button" className={`cx-enlace ${className}`} disabled={ctx.ocupado} aria-label={etiqueta||`Abrir ${destino.nombre}`} onClick={()=>ctx.abrir(id)}>{children}</button>;
}

/** Migas de las creaciones recorridas. */
export function Rastro({rastro,nombreDe,irA,volver}:{rastro:string[];nombreDe:(id:string)=>string;irA:(i:number)=>void;volver:()=>void}){
  if(rastro.length<2)return null;
  return <nav className="cx-rastro" aria-label="Rastro de creaciones">
    <ol>
      <li><button type="button" onClick={volver}>Colección</button></li>
      {rastro.map((id,i)=><li key={id+i}>
        <ChevronRight size={13} aria-hidden="true"/>
        {i===rastro.length-1
          ?<span aria-current="page">{nombreDe(id)}</span>
          :<button type="button" onClick={()=>irA(i)}>{nombreDe(id)}</button>}
      </li>)}
    </ol>
  </nav>;
}

export function nombreTipo(tipo:string,monstruo:boolean):string{
  return monstruo?"Monstruo":TIPOS.find(t=>t.valor===tipo)?.nombre||"Creación";
}
