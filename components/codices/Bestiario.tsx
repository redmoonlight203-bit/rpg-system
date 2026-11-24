"use client";
import {useCallback,useEffect,useRef,useState,type ReactNode} from "react";
import {ChevronLeft,ChevronRight} from "lucide-react";
import {paginasBestiario,type PaginaBestiario} from "../../lib/codices";
import {rangoDe} from "../../lib/cartas";
import {Sello} from "../ui/Juego";
import {Portada,type PiezaGaleria} from "../GaleriaCreacion";
import {CabeceraCodice} from "./Comunes";
import {SeccionCodice,tieneDatos} from "./Secciones";
import type {VistaProps} from "./tipos";
import {useMedia,useMovimiento} from "./useMedia";

export type Giro=null|"adelante"|"atras";

/** Paginación del libro: una o dos láminas por vista, giro de hoja con su animación y respaldo por tiempo. */
export function usePaginasLibro(total:number,{dosPaginasDesde,animar,duracion}:{dosPaginasDesde:number;animar:boolean;duracion:number}){
  const porVista:1|2=useMedia(`(min-width: ${dosPaginasDesde}px)`)?2:1;
  const [pedido,setPedido]=useState(0);
  const [girando,setGirando]=useState<Giro>(null);
  const destino=useRef(0);
  const [meta,setMeta]=useState(0);
  const respaldo=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const alinear=useCallback((n:number)=>{
    const acotado=Math.max(0,Math.min(total-1,n));
    return porVista===2?acotado-(acotado%2):acotado;
  },[porVista,total]);
  const indice=alinear(pedido);
  const terminar=useCallback(()=>{
    clearTimeout(respaldo.current);
    setPedido(destino.current);
    setGirando(null);
  },[]);
  useEffect(()=>()=>clearTimeout(respaldo.current),[]);
  const ir=useCallback((n:number)=>{
    if(girando)return;
    const objetivo=alinear(n);
    if(objetivo===indice)return;
    if(!animar||duracion<=0){setPedido(objetivo);return;}
    destino.current=objetivo;
    setMeta(objetivo);
    setGirando(objetivo>indice?"adelante":"atras");
    respaldo.current=setTimeout(terminar,duracion+150);
  },[alinear,animar,duracion,girando,indice,terminar]);
  return {
    indice,porVista,girando,destino:girando?meta:indice,
    ir,terminar,
    siguiente:()=>ir(indice+porVista),
    anterior:()=>ir(indice-porVista),
    hayAnterior:indice>0,
    haySiguiente:indice+porVista<total,
  };
}

/** Monstruo como lámina de bestiario: libro con páginas que se pasan y marcapáginas por sección. */
export default function Bestiario<T extends PiezaGaleria>({ctx}:VistaProps<T>){
  const {item,config}=ctx;
  const animar=useMovimiento(config.movimiento.activo);
  const secciones=config.codices[ctx.codice].secciones;
  const variantes=(item.configuracion_monstruo?.variantes||[]).map(v=>({id:v.id,nombre:v.nombre}));
  const paginas=paginasBestiario(secciones,k=>tieneDatos(ctx,k),variantes);
  const libro=usePaginasLibro(paginas.length,{dosPaginasDesde:config.libro.dos_paginas_desde,animar,duracion:config.movimiento.pagina_ms});
  const toque=useRef<{x:number;y:number}|null>(null);
  const rango=rangoDe(item.clase);

  function contenido(p:PaginaBestiario|undefined):ReactNode{
    if(!p)return <div className="cx-pagina-vacia" aria-hidden="true"/>;
    if(p.clave==="lamina")return <div className="cx-lamina">
      <div className="cx-lamina-retrato"><Portada src={ctx.imagenVisible} tipo={ctx.tipo} icono={ctx.iconoVisible}/></div>
      <CabeceraCodice ctx={ctx}/>
      <div className="cx-amenaza"><Sello runa="/arte/runas/combate.png" texto={`Amenaza ${rango.clave==="KUROI"?"K":rango.clave} · ${rango.nombre}`}/></div>
      {ctx.ranuras.formas}
    </div>;
    if(p.clave==="ficha")return <div className="cx-ficha-final">
      <h3 className="cx-pagina-titulo">Ficha</h3>
      {ctx.ranuras.verComo}
      {ctx.ranuras.acciones}
      {ctx.ranuras.presentacion}
      {ctx.ranuras.estado}
      {ctx.ranuras.peligro}
    </div>;
    const seccion=secciones.find(s=>s.clave===p.clave)!;
    return <div>
      <h3 className="cx-pagina-titulo">{p.titulo}</h3>
      <SeccionCodice ctx={ctx} seccion={seccion} varianteId={p.varianteId} sinTitulo/>
    </div>;
  }
  const pagina=(i:number,lado:string,extra="")=>{
    const p=paginas[i];
    return <div className={`cx-pagina is-${lado} ${extra}`} data-clave={p?.clave}>
      {contenido(p)}
      {p&&<span className="cx-folio" aria-hidden="true">{i+1}</span>}
    </div>;
  };

  const {indice,porVista,girando,destino}=libro;
  // Pliego visible bajo la hoja que gira y la hoja misma (cara y dorso).
  let base:ReactNode,hoja:ReactNode=null;
  if(porVista===2){
    if(girando==="adelante"){
      base=<>{pagina(indice,"izquierda")}{pagina(destino+1,"derecha")}</>;
      hoja=<div className="cx-hoja is-adelante" aria-hidden="true" inert onAnimationEnd={libro.terminar}><div className="cx-hoja-cara">{pagina(indice+1,"derecha")}</div><div className="cx-hoja-dorso">{pagina(destino,"izquierda")}</div></div>;
    }else if(girando==="atras"){
      base=<>{pagina(destino,"izquierda")}{pagina(indice+1,"derecha")}</>;
      hoja=<div className="cx-hoja is-atras" aria-hidden="true" inert onAnimationEnd={libro.terminar}><div className="cx-hoja-cara">{pagina(indice,"izquierda")}</div><div className="cx-hoja-dorso">{pagina(destino+1,"derecha")}</div></div>;
    }else base=<>{pagina(indice,"izquierda")}{pagina(indice+1,"derecha")}</>;
  }else{
    if(girando==="adelante"){
      base=pagina(destino,"unica");
      hoja=<div className="cx-hoja is-adelante is-sola" aria-hidden="true" inert onAnimationEnd={libro.terminar}><div className="cx-hoja-cara">{pagina(indice,"unica")}</div><div className="cx-hoja-dorso"><div className="cx-pagina is-unica"/></div></div>;
    }else if(girando==="atras"){
      base=pagina(indice,"unica");
      hoja=<div className="cx-hoja is-atras is-sola" aria-hidden="true" inert onAnimationEnd={libro.terminar}><div className="cx-hoja-cara">{pagina(destino,"unica")}</div><div className="cx-hoja-dorso"><div className="cx-pagina is-unica"/></div></div>;
    }else base=pagina(indice,"unica");
  }

  const cintas=paginas.reduce<{clave:string;titulo:string;indice:number}[]>((lista,p,i)=>{
    if(!lista.some(c=>c.clave===p.clave))lista.push({clave:p.clave,titulo:p.clave==="variantes"?secciones.find(s=>s.clave==="variantes")!.titulo:p.titulo,indice:i});
    return lista;
  },[]);
  const visibles=new Set([paginas[indice]?.clave,porVista===2?paginas[indice+1]?.clave:undefined]);
  const ultima=Math.min(paginas.length,indice+porVista);
  const cintasRef=useRef<HTMLElement>(null);
  useEffect(()=>{
    cintasRef.current?.querySelector<HTMLElement>("[aria-current]")?.scrollIntoView({block:"nearest",inline:"nearest"});
  },[indice]);
  const rotulo=`Página ${indice+1}${ultima>indice+1?`–${ultima}`:""} de ${paginas.length}`;

  return <div className="cx-bestiario">
    <nav ref={cintasRef} className="cx-cintas" aria-label="Marcapáginas">
      {cintas.map(c=><button key={c.clave} type="button" className="cx-cinta" aria-current={visibles.has(c.clave as PaginaBestiario["clave"])?"true":undefined} onClick={()=>libro.ir(c.indice)}>{c.titulo}</button>)}
    </nav>
    <div className={`cx-libro ${porVista===2?"is-doble":"is-sencillo"}`} role="region" aria-roledescription="libro" aria-label={`Bestiario: ${item.nombre}`} tabIndex={0}
      onKeyDown={e=>{
        if(e.target!==e.currentTarget)return;
        if(e.key==="ArrowRight"){e.preventDefault();libro.siguiente();}
        if(e.key==="ArrowLeft"){e.preventDefault();libro.anterior();}
      }}
      onPointerDown={e=>{if(e.pointerType!=="mouse")toque.current={x:e.clientX,y:e.clientY};}}
      onPointerUp={e=>{
        const t=toque.current;toque.current=null;
        if(!t)return;
        const dx=e.clientX-t.x,dy=e.clientY-t.y;
        if(Math.abs(dx)>50&&Math.abs(dy)<30){if(dx<0)libro.siguiente();else libro.anterior();}
      }}>
      <div className="cx-pliego">{base}{hoja}</div>
      <span className="cx-lomo" aria-hidden="true"/>
    </div>
    <div className="cx-libro-pie">
      <button type="button" className="cg-button" disabled={!libro.hayAnterior||!!girando} onClick={libro.anterior}><ChevronLeft size={16} aria-hidden="true"/>Anterior</button>
      <span aria-live="polite">{rotulo}</span>
      <button type="button" className="cg-button" disabled={!libro.haySiguiente||!!girando} onClick={libro.siguiente}>Siguiente<ChevronRight size={16} aria-hidden="true"/></button>
    </div>
  </div>;
}
