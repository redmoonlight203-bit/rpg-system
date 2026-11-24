"use client";
import {espacioDe} from "../../lib/codices";
import {rangoDe} from "../../lib/cartas";
import {Portada,type PiezaGaleria} from "../GaleriaCreacion";
import {CabeceraCodice} from "./Comunes";
import {SeccionesCodice} from "./Secciones";
import type {VistaProps} from "./tipos";

/** Objeto como reliquia expuesta en una vitrina, con su placa y su recorrido de artefacto. */
export default function Reliquia<T extends PiezaGaleria>({ctx}:VistaProps<T>){
  const {item}=ctx;
  const espacio=espacioDe(item.slot_tipo);
  const rango=rangoDe(item.clase);
  return <div className="cx-mesa cx-mesa-reliquia">
    <aside className="cx-lateral">
      <div className="cx-vitrina">
        <span className="cx-vitrina-cristal" aria-hidden="true"/>
        <div className="cx-vitrina-pieza"><Portada src={ctx.imagenVisible} tipo={ctx.tipo} icono={ctx.iconoVisible}/></div>
        <span className="cx-pedestal" aria-hidden="true"/>
        <div className="cx-placa"><strong>{item.nombre}</strong><small>Rango {rango.clave==="KUROI"?"K":rango.clave} · {rango.nombre}</small></div>
      </div>
      <div className="cx-chips">
        {espacio&&<span className="cx-chip">{espacio}</span>}
        {item.consumible&&<span className="cx-chip is-consumible">Consumible</span>}
        {item.ligado_al_alma&&<span className="cx-chip">Ligado al alma</span>}
      </div>
      {ctx.ranuras.formas}
      {ctx.ranuras.presentacion}
      {ctx.ranuras.estado}
    </aside>
    <div className="cx-texto">
      {ctx.ranuras.verComo}
      <CabeceraCodice ctx={ctx}/>
      {ctx.ranuras.acciones}
      <SeccionesCodice ctx={ctx}/>
      {ctx.ranuras.peligro}
    </div>
  </div>;
}
