"use client";
import {EFECTOS_NOMBRE,efectosDe,formula} from "../../lib/creacion";
import {EVENTOS,EFECTOS_REGLA,DESTINOS,type CondicionRegla,type EfectoRegla,type ValorRegla} from "../../lib/reglas";
import {describirEfecto,describirRegla} from "../../lib/descripciones";
import {cadenaPasiva} from "../../lib/codices";
import ContenidoAyuda from "../ContenidoAyuda";
import type {PiezaGaleria} from "../GaleriaCreacion";
import type {ContextoCodice} from "./tipos";

export function resumenValor(v?:ValorRegla):string{
  if(v===undefined)return "";
  if(typeof v==="number")return String(v);
  return [v.dados?`${v.dados}d${v.caras}`:"",v.atributo?`${v.atributo}${v.escala?` × ${v.escala}`:""}`:"",v.evento?"valor del evento":"",v.bono?`${v.bono>0?"+":""}${v.bono}`:""].filter(Boolean).join(" ")||"0";
}

export function resumenCondicion(c:CondicionRegla):string{
  switch(c.tipo){
    case "siempre":return "Siempre";
    case "estado_terminado":return `Al terminar ${c.clave}`;
    case "todas":return c.condiciones.map(resumenCondicion).join(" y ");
    case "alguna":return c.condiciones.map(resumenCondicion).join(" o ");
    case "no":return `No (${resumenCondicion(c.condicion)})`;
    case "estado":return `${DESTINOS[c.sujeto]} tiene ${c.estado}`;
    case "comparar":return `${DESTINOS[c.sujeto]}: ${c.atributo} ${c.operador} ${c.valor}${c.porcentaje?"%":""}`;
    case "elemento":return `Elemento ${c.elemento}`;
    case "probabilidad":return `Probabilidad ${c.porcentaje}%`;
  }
}

export function ResumenEfecto({efecto:e,depth=0}:{efecto:EfectoRegla;depth?:number}){
  if(depth>8)return null;
  return <div className="cg-effect-summary"><span>{EFECTOS_REGLA[e.tipo]} · {DESTINOS[e.destino]}{e.atributo?` · ${e.atributo}`:""}{e.operacion?` · ${{sumar:"sumar",fijar:"fijar",multiplicar:"multiplicar"}[e.operacion]}`:""}{e.valor!==undefined?` ${resumenValor(e.valor)}`:""}{e.nombre||e.clave?` · ${e.nombre||e.clave}`:""}{e.cd?` · CD ${e.cd}`:""}{e.permanente?" · Permanente":e.duracion?` · ${e.duracion} turnos`:""}{e.acumular?" · Acumulable":""}</span>
    {e.condicion&&<p>Si: {resumenCondicion(e.condicion)}</p>}
    {e.cambios?.map((c,i)=><p key={i}>{c.atributo}: {c.operacion} {resumenValor(c.valor)}</p>)}
    {e.accion&&<p>{e.accion.nombre} · {formula(e.accion)}</p>}
    {([["Éxito",e.exito],["Fallo",e.fallo]] as const).map(([label,efectos])=>efectos?.length?<div className="cg-effect-branch" key={label}><b>{label}</b>{efectos.map((efecto,i)=><ResumenEfecto key={i} efecto={efecto} depth={depth+1}/>)}</div>:null)}
  </div>;
}

/** Acciones con dados, costes y su ayuda emergente. */
export function ListaAcciones<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  return <>{efectosDe(ctx.item).map(e=><div className="cg-rule cg-action-help cx-accion" key={e.id} tabIndex={0} aria-describedby={`efecto-ayuda-${e.id}`}>
    <strong>{e.nombre||EFECTOS_NOMBRE[e.efecto]}</strong>
    {e.cantidad>0&&<span className="cx-formula">{formula(e)}</span>}
    <p>{describirEfecto(e).resumen}</p>
    <span className="cg-effect-tooltip" role="tooltip" id={`efecto-ayuda-${e.id}`}><ContenidoAyuda ayuda={describirEfecto(e)}/></span>
  </div>)}</>;
}

/** Pasivas propias en texto. */
export function ListaPasivas<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  const etiqueta=(k:string)=>ctx.props.etiqueta(ctx.item,k);
  return <>{(ctx.item.reglas_pasivas||[]).map(r=>{
    const [evento,condicion,...efectos]=cadenaPasiva(r,etiqueta);
    return <div className="cg-rule" key={r.id}><strong>{r.nombre}</strong><p>{evento.texto} · {condicion.texto}</p>{efectos.length>0&&<p>{efectos.map(x=>x.texto).join(" · ")}</p>}</div>;
  })}</>;
}

/** Pasivas propias como cadena ritual: evento → condición → efectos. */
export function Ritual<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  const etiqueta=(k:string)=>ctx.props.etiqueta(ctx.item,k);
  return <>{(ctx.item.reglas_pasivas||[]).map(r=><div className="cx-ritual-bloque" key={r.id}>
    <strong className="cx-ritual-nombre">{r.nombre}</strong>
    <ol className="cx-ritual">{cadenaPasiva(r,etiqueta).map((paso,i)=><li key={i} data-paso={paso.tipo}><span className="cx-ritual-tipo">{{evento:"Cuando",condicion:"Si",efecto:"Entonces"}[paso.tipo]}</span>{paso.texto}</li>)}</ol>
  </div>)}</>;
}

/** Reglas del motor de la creación. */
export function ListaReglas<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  return <>{(ctx.item.reglas||[]).map((r,i)=><div className="cg-rule" key={r.id||i}>
    <strong>{r.nombre||`Regla ${i+1}`}</strong>
    <p>{describirRegla(r).resumen}</p>
    <p>{EVENTOS[r.evento]}</p>
    <p>Si: {resumenCondicion(r.condicion)}</p>
    <ul>{r.efectos.map((efecto,j)=><li key={j}><ResumenEfecto efecto={efecto}/></li>)}</ul>
    <p>{r.coste_ph||0} PH · {r.coste_fatiga||0} Fatiga{r.enfriamiento?` · Enfriamiento: ${r.enfriamiento} turnos`:""}{r.usos?` · ${r.usos} usos`:""}</p>
  </div>)}</>;
}
