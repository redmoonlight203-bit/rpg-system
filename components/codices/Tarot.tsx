"use client";
import {useEffect,useRef,useState} from "react";
import {EFECTOS_NOMBRE,efectosDe,formula} from "../../lib/creacion";
import {arcanoDe} from "../../lib/codices";
import {rangoDe} from "../../lib/cartas";
import {describirEfecto} from "../../lib/descripciones";
import {Portada,type PiezaGaleria} from "../GaleriaCreacion";
import {CabeceraCodice} from "./Comunes";
import {SeccionesCodice} from "./Secciones";
import type {VistaProps} from "./tipos";
import {useMedia,useMovimiento} from "./useMedia";

/** Inclinación de la carta según el puntero (solo con ratón y movimiento permitido). */
function useInclinacion(maximo:number,permitido:boolean){
  const carta=useRef<HTMLButtonElement>(null);
  const cuadro=useRef(0);
  const fino=useMedia("(hover: hover) and (pointer: fine)");
  const activa=permitido&&fino&&maximo>0;
  useEffect(()=>()=>cancelAnimationFrame(cuadro.current),[]);
  function mover(e:React.PointerEvent<HTMLDivElement>){
    if(!activa)return;
    const r=e.currentTarget.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    cancelAnimationFrame(cuadro.current);
    cuadro.current=requestAnimationFrame(()=>{
      carta.current?.style.setProperty("--rx",`${(-y*2*maximo).toFixed(2)}deg`);
      carta.current?.style.setProperty("--ry",`${(x*2*maximo).toFixed(2)}deg`);
    });
  }
  function soltar(){
    cancelAnimationFrame(cuadro.current);
    carta.current?.style.setProperty("--rx","0deg");
    carta.current?.style.setProperty("--ry","0deg");
  }
  return {carta,mover,soltar};
}

/** Habilidad como carta de tarot: anverso con su arte y arcano; reverso con la lectura de sus acciones. */
export default function Tarot<T extends PiezaGaleria>({ctx}:VistaProps<T>){
  const {item,config}=ctx;
  const [volteada,setVolteada]=useState(false);
  const permitido=useMovimiento(config.movimiento.activo);
  const {carta,mover,soltar}=useInclinacion(config.movimiento.inclinacion_max,permitido);
  const arcano=arcanoDe(item.id);
  const rango=rangoDe(item.clase);
  const acciones=efectosDe(item);
  return <div className="cx-mesa cx-mesa-tarot">
    <aside className="cx-lateral">
      <div className="cx-tarot-escena" onPointerMove={mover} onPointerLeave={soltar}>
        <button ref={carta} type="button" className={`cx-tarot ${volteada?"is-volteada":""}`} aria-pressed={volteada}
          aria-label={volteada?"Ver el anverso de la carta":"Voltear la carta para leerla"} onClick={()=>setVolteada(v=>!v)}>
          <span className="cx-tarot-cara is-anverso" aria-hidden={volteada} inert={volteada}>
            <span className="cx-tarot-arcano">{arcano.romano}</span>
            <span className="cx-tarot-arte"><Portada src={ctx.imagenVisible} tipo={ctx.tipo} icono={ctx.iconoVisible}/></span>
            <span className="cx-tarot-banda"><span className="cx-tarot-nombre">{item.nombre}</span><span className="cx-tarot-rango">{rango.clave==="KUROI"?"K":rango.clave} · {rango.nombre}</span></span>
          </span>
          <span className="cx-tarot-cara is-reverso" aria-hidden={!volteada} inert={!volteada}>
            <span className="cx-tarot-titulo">Lectura</span>
            {acciones.length?acciones.map(e=><span className="cx-tarot-accion" key={e.id}>
              <span className="cx-tarot-accion-cab"><b>{e.nombre||EFECTOS_NOMBRE[e.efecto]}</b>{e.cantidad>0&&<span className="cx-formula">{formula(e)}</span>}</span>
              <span className="cx-tarot-coste">{e.coste_ph||0} PH · {e.coste_fatiga||0} Fatiga</span>
              <span className="cx-tarot-resumen">{describirEfecto(e).resumen}</span>
            </span>):<span className="cx-tarot-vacio">Esta carta no tiene acciones; su poder está en sus reglas.</span>}
          </span>
        </button>
      </div>
      <p className="cx-pista">{volteada?"Pulsa la carta para volver al anverso.":"Pulsa la carta para leer su reverso."}</p>
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
