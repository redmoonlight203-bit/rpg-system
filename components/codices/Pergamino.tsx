"use client";
import {Portada,type PiezaGaleria} from "../GaleriaCreacion";
import {CabeceraCodice} from "./Comunes";
import {SeccionesCodice} from "./Secciones";
import type {VistaProps} from "./tipos";

/** Rollo de pergamino: el códice genérico, válido para cualquier tipo de creación. */
export default function Pergamino<T extends PiezaGaleria>({ctx}:VistaProps<T>){
  return <div className="cx-pergamino-mesa">
    <aside className="cx-lateral">
      <div className="cx-retrato"><Portada src={ctx.imagenVisible} tipo={ctx.tipo} icono={ctx.iconoVisible}/><span className="cg-rank">{ctx.item.clase||"D"}</span></div>
      {ctx.ranuras.formas}
      {ctx.ranuras.presentacion}
      {ctx.ranuras.estado}
    </aside>
    <article className="cx-rollo">
      <span className="cx-varilla is-arriba" aria-hidden="true"/>
      <div className="cx-rollo-papel">
        {ctx.ranuras.verComo}
        <CabeceraCodice ctx={ctx}/>
        {ctx.ranuras.acciones}
        <SeccionesCodice ctx={ctx}/>
        {ctx.ranuras.peligro}
      </div>
      <span className="cx-varilla is-abajo" aria-hidden="true"/>
    </article>
  </div>;
}
