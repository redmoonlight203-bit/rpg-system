"use client";
import {rangoDe} from "../../lib/cartas";
import {Portada,type PiezaGaleria} from "../GaleriaCreacion";
import {CabeceraCodice} from "./Comunes";
import {SeccionesCodice} from "./Secciones";
import type {VistaProps} from "./tipos";

/** Título como edicto: estandarte colgante y proclama en pergamino. */
export default function Edicto<T extends PiezaGaleria>({ctx}:VistaProps<T>){
  const {item}=ctx;
  const rango=rangoDe(item.clase);
  return <div className="cx-mesa cx-mesa-edicto">
    <aside className="cx-lateral">
      <div className="cx-estandarte">
        <span className="cx-asta" aria-hidden="true"/>
        <div className="cx-estandarte-tela">
          <div className="cx-estandarte-emblema"><Portada src={ctx.imagenVisible} tipo={ctx.tipo} icono={ctx.iconoVisible} circular/></div>
          <span className="cx-estandarte-nombre">{item.nombre}</span>
          <span className="cx-estandarte-rango">{rango.nombre}</span>
        </div>
      </div>
      {ctx.ranuras.formas}
      {ctx.ranuras.presentacion}
      {ctx.ranuras.estado}
    </aside>
    <div className="cx-texto">
      {ctx.ranuras.verComo}
      {ctx.ranuras.acciones}
      <article className="cx-pagina cx-proclama">
        <CabeceraCodice ctx={ctx}/>
        <SeccionesCodice ctx={ctx}/>
      </article>
      {ctx.ranuras.peligro}
    </div>
  </div>;
}
