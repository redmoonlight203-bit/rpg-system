"use client";
// Menú de decisión de una reacción: aparece en la pantalla de quien puede reaccionar, con el disparador, el coste en PH,
// los usos que quedan y el enfriamiento. Quien espera ve «Esperando a <nombre>».
import {useEffect,useRef} from "react";
import {Hourglass,Shield,Sparkles} from "lucide-react";
import type {OfertaReaccion} from "../lib/combate";
import {NOMBRE_DISPARADOR,lineaCosteReaccion} from "../lib/reacciones";
import "./menu-reaccion.css";

export function lineaOferta(o:OfertaReaccion){
  return o.linea||lineaCosteReaccion({coste:o.coste,enfriamiento:o.enfriamiento||undefined},0);
}

export default function MenuReaccion({oferta,ocupado=false,onDecidir}:{oferta:OfertaReaccion;ocupado?:boolean;onDecidir:(usar:boolean)=>void}){
  const usar=useRef<HTMLButtonElement>(null);
  useEffect(()=>{usar.current?.focus();},[oferta.efecto,oferta.defensor]);
  const disparador=oferta.disparador?NOMBRE_DISPARADOR[oferta.disparador]:NOMBRE_DISPARADOR.despues_ser_atacado;
  const usos=oferta.usos_restantes==null?"∞":String(oferta.usos_restantes);
  return <div className="mr-velo" onKeyDown={e=>{if(e.key==="Escape"&&!ocupado){e.preventDefault();onDecidir(false);}}}>
    <section className="mr-carta" role="alertdialog" aria-modal="true" aria-labelledby="mr-titulo" aria-describedby="mr-linea">
      <div className="mr-halo" aria-hidden="true"/>
      <p className="mr-eyebrow"><Sparkles size={14} aria-hidden="true"/>¡Reacción! · {disparador}</p>
      <div className="mr-emblema" aria-hidden="true"><Shield size={30}/></div>
      <h2 id="mr-titulo" className="mr-titulo">{oferta.reaccion}</h2>
      <p className="mr-quien">{oferta.nombre} puede reaccionar ahora</p>
      <dl className="mr-stats">
        <div className={oferta.coste?"mr-stat mr-stat--ph":"mr-stat"}><dt>Coste</dt><dd>{oferta.coste?<>{oferta.coste}<small>PH</small></>:"Gratis"}</dd></div>
        <div className="mr-stat"><dt>Usos</dt><dd>{usos}<small>{oferta.usos_restantes==null?"":"quedan"}</small></dd></div>
        <div className="mr-stat"><dt>Enfriamiento</dt><dd>{oferta.enfriamiento||0}<small>{oferta.enfriamiento===1?"ronda":"rondas"}</small></dd></div>
      </dl>
      <p id="mr-linea" className="mr-linea">{lineaOferta(oferta)}</p>
      <div className="mr-acciones">
        <button type="button" className="mr-boton mr-boton--no" disabled={ocupado} onClick={()=>onDecidir(false)}>No usar</button>
        <button ref={usar} type="button" className="mr-boton mr-boton--si" disabled={ocupado} onClick={()=>onDecidir(true)}>Usar{oferta.coste?` · ${oferta.coste} PH`:""}</button>
      </div>
    </section>
  </div>;
}

export function EsperandoReaccion({nombre}:{nombre:string}){
  return <p className="mr-esperando" role="status" aria-live="polite"><Hourglass size={16} aria-hidden="true"/>Esperando a {nombre}<span className="mr-puntos" aria-hidden="true"><i/><i/><i/></span></p>;
}

export type ReaccionFicha={id:string;nombre:string;disparador:keyof typeof NOMBRE_DISPARADOR;linea:string;lista:boolean};
/** Reacciones del combatiente en su ficha: siempre con la línea de coste, usos y enfriamiento. */
export function ListaReacciones({reacciones}:{reacciones:ReaccionFicha[]}){
  if(!reacciones.length)return null;
  return <section className="mr-lista" aria-label="Reacciones">
    <h3><Shield size={14} aria-hidden="true"/>Reacciones</h3>
    <ul>{reacciones.map(r=><li key={r.id} className={r.lista?"is-lista":"is-agotada"}>
      <strong>{r.nombre}</strong>
      <span className="mr-lista-cuando">{NOMBRE_DISPARADOR[r.disparador]}</span>
      <span className="mr-lista-linea">{r.linea}</span>
      <em>{r.lista?"Lista":"No disponible"}</em>
    </li>)}</ul>
  </section>;
}
