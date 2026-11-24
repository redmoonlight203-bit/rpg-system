"use client";
import {Sparkles} from "lucide-react";
import {arcanoDe,type Vinculo} from "../../lib/codices";
import {rangoDe} from "../../lib/cartas";
import {imagenCreacion} from "../../lib/arte-creacion";
import IconoYugen from "../IconoYugen";
import {Portada,type PiezaGaleria} from "../GaleriaCreacion";
import {EnlaceCreacion} from "./Comunes";
import type {ContextoCodice} from "./tipos";
import type {CSSProperties} from "react";

function destino<T extends PiezaGaleria>(ctx:ContextoCodice<T>,id:string){return ctx.props.items.find(i=>i.id===id);}

export function MiniTarot<T extends PiezaGaleria>({ctx,id,indice=0}:{ctx:ContextoCodice<T>;id:string;indice?:number}){
  const d=destino(ctx,id);
  if(!d)return <EnlaceCreacion ctx={ctx} id={id}>{null}</EnlaceCreacion>;
  return <EnlaceCreacion ctx={ctx} id={id} className={`cx-mini cx-mini-tarot ${rangoDe(d.clase).css}`} estilo={{"--k":indice} as CSSProperties}>
    <span className="cx-mini-tarot-carta">
      <span className="cx-mini-arcano">{arcanoDe(d.id).romano}</span>
      <span className="cx-mini-arte"><Portada src={imagenCreacion(d.id,d.imagen_url)} tipo={ctx.props.tipoDe(d)} icono={ctx.props.iconoDe(d)}/></span>
    </span>
    <span className="cx-mini-nombre">{d.nombre}</span>
  </EnlaceCreacion>;
}

export function MiniSello<T extends PiezaGaleria>({ctx,id}:{ctx:ContextoCodice<T>;id:string}){
  const d=destino(ctx,id);
  if(!d)return <EnlaceCreacion ctx={ctx} id={id}>{null}</EnlaceCreacion>;
  return <EnlaceCreacion ctx={ctx} id={id} className={`cx-mini cx-mini-sello ${rangoDe(d.clase).css}`}>
    <span className="cx-mini-lacre"><IconoYugen id={ctx.props.iconoDe(d)} size={26}/></span>
    <span className="cx-mini-nombre">{d.nombre}</span>
  </EnlaceCreacion>;
}

export function MiniReliquia<T extends PiezaGaleria>({ctx,id,espacio}:{ctx:ContextoCodice<T>;id:string;espacio?:string}){
  const d=destino(ctx,id);
  if(!d)return <EnlaceCreacion ctx={ctx} id={id}>{null}</EnlaceCreacion>;
  return <EnlaceCreacion ctx={ctx} id={id} className={`cx-mini cx-mini-reliquia ${rangoDe(d.clase).css}`}>
    <span className="cx-mini-vitrina"><Portada src={imagenCreacion(d.id,d.imagen_url)} tipo={ctx.props.tipoDe(d)} icono={ctx.props.iconoDe(d)}/></span>
    <span className="cx-mini-nombre">{d.nombre}</span>
    {espacio&&<small className="cx-mini-espacio">{espacio}</small>}
  </EnlaceCreacion>;
}

/** Personaje o monstruo: retrato circular con el marco de su rango. */
export function MiniRetrato<T extends PiezaGaleria>({ctx,id}:{ctx:ContextoCodice<T>;id:string}){
  const d=destino(ctx,id);
  if(!d)return <EnlaceCreacion ctx={ctx} id={id}>{null}</EnlaceCreacion>;
  return <EnlaceCreacion ctx={ctx} id={id} className={`cx-mini cx-mini-retrato ${rangoDe(d.clase).css}`}>
    <span className="cx-mini-medallon"><Portada src={imagenCreacion(d.id,d.imagen_url)} tipo={ctx.props.tipoDe(d)} icono={ctx.props.iconoDe(d)} circular/></span>
    <span className="cx-mini-nombre">{d.nombre}</span>
    {ctx.props.esMonstruo?.(d)&&<small className="cx-mini-espacio">Monstruo</small>}
  </EnlaceCreacion>;
}

/** Elige la miniatura según el tipo real de la creación enlazada. */
export function Miniatura<T extends PiezaGaleria>({ctx,id,espacio,indice}:{ctx:ContextoCodice<T>;id:string;espacio?:string;indice?:number}){
  const d=destino(ctx,id);
  const tipo=d?ctx.props.tipoDe(d):null;
  if(tipo==="habilidad")return <MiniTarot ctx={ctx} id={id} indice={indice}/>;
  if(tipo==="pasiva")return <MiniSello ctx={ctx} id={id}/>;
  if(tipo==="objeto"||tipo==="titulo")return <MiniReliquia ctx={ctx} id={id} espacio={espacio}/>;
  if(tipo==="personaje")return <MiniRetrato ctx={ctx} id={id}/>;
  return <EnlaceCreacion ctx={ctx} id={id} className="cx-mini cx-mini-chip"><Sparkles size={14} aria-hidden="true"/>{d?.nombre}</EnlaceCreacion>;
}

const GRUPOS:{tipo:Vinculo["tipo"];titulo:string}[]=[{tipo:"habilidad",titulo:"Habilidades"},{tipo:"pasiva",titulo:"Pasivas"},{tipo:"equipo",titulo:"Equipo"}];

/** Vínculos agrupados por clase (habilidades, pasivas, equipo). */
export function GrupoVinculos<T extends PiezaGaleria>({ctx,vinculos}:{ctx:ContextoCodice<T>;vinculos:Vinculo[]}){
  return <div className="cx-grupos">{GRUPOS.map(g=>{
    const lista=vinculos.filter(v=>v.tipo===g.tipo);
    if(!lista.length)return null;
    return <div className="cx-grupo" key={g.tipo}>
      <h4>{g.titulo}</h4>
      <div className="cx-minis">{lista.map((v,i)=><Miniatura key={v.id} ctx={ctx} id={v.id} espacio={v.espacio} indice={i}/>)}</div>
    </div>;
  })}</div>;
}
