"use client";
import {rangoDe} from "../../lib/cartas";
import {Marco,Sello} from "../ui/Juego";
import {Portada,type PiezaGaleria} from "../GaleriaCreacion";
import {CabeceraCodice} from "./Comunes";
import {SeccionesCodice} from "./Secciones";
import type {VistaProps} from "./tipos";

/** Personaje como expediente de héroe: retrato enmarcado y, al lado, su grimorio, arsenal y atributos. */
export default function Expediente<T extends PiezaGaleria>({ctx}:VistaProps<T>){
  const rango=rangoDe(ctx.item.clase);
  return <div className="cx-mesa cx-mesa-expediente">
    <aside className="cx-lateral">
      <Marco className="cx-expediente-marco" brillo>
        <div className="cx-retrato cx-expediente-retrato"><Portada src={ctx.imagenVisible} tipo={ctx.tipo} icono={ctx.iconoVisible}/></div>
        <div className="cx-expediente-sello"><Sello runa="/arte/runas/personajes.png" texto={`Rango ${rango.clave==="KUROI"?"K":rango.clave} · ${rango.nombre}`}/></div>
      </Marco>
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
