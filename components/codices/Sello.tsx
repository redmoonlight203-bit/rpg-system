"use client";
import {rangoDe} from "../../lib/cartas";
import IconoYugen from "../IconoYugen";
import type {PiezaGaleria} from "../GaleriaCreacion";
import {CabeceraCodice} from "./Comunes";
import {SeccionesCodice} from "./Secciones";
import type {VistaProps} from "./tipos";

const DIENTES=36;
/** Pasiva como sello de lacre: el nombre grabado en el anillo y su ritual al lado. */
export default function Sello<T extends PiezaGaleria>({ctx}:VistaProps<T>){
  const {item}=ctx;
  const rango=rangoDe(item.clase);
  const anillo=`cx-anillo-${item.id.replace(/[^a-zA-Z0-9_-]/g,"")}`;
  const grabado=`${item.nombre} · ${rango.nombre} · `.toUpperCase();
  // Borde ondulado del lacre: un círculo con DIENTES ondas suaves.
  const borde=Array.from({length:DIENTES*2},(_,i)=>{
    const a=i/(DIENTES*2)*Math.PI*2,r=i%2?104:110;
    return `${(110+r*Math.cos(a)).toFixed(1)},${(110+r*Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return <div className="cx-mesa cx-mesa-sello">
    <aside className="cx-lateral">
      <div className="cx-sello">
        <svg viewBox="0 0 220 220" role="img" aria-label={`Sello de ${item.nombre}`}>
          <defs><path id={anillo} d="M110,110 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0"/></defs>
          <polygon className="cx-sello-borde" points={borde}/>
          <circle className="cx-sello-cuerpo" cx="110" cy="110" r="98"/>
          <circle className="cx-sello-linea" cx="110" cy="110" r="92"/>
          <circle className="cx-sello-linea" cx="110" cy="110" r="66"/>
          <text className="cx-sello-texto"><textPath href={`#${anillo}`} textLength="500" lengthAdjust="spacingAndGlyphs">{grabado}</textPath></text>
        </svg>
        <span className="cx-sello-icono" aria-hidden="true"><IconoYugen id={ctx.iconoVisible} size={64}/></span>
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
