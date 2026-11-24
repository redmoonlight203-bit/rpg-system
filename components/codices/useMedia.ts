"use client";
import {useSyncExternalStore} from "react";

/** Estado de una media query, seguro en el servidor (devuelve `enServidor` hasta hidratar). */
export function useMedia(consulta:string,enServidor=false):boolean{
  return useSyncExternalStore(
    aviso=>{const m=window.matchMedia(consulta);m.addEventListener("change",aviso);return ()=>m.removeEventListener("change",aviso);},
    ()=>window.matchMedia(consulta).matches,
    ()=>enServidor,
  );
}

/** ¿Se permite animar? Lo impiden el movimiento reducido del sistema o el ajuste del GM. */
export function useMovimiento(activo:boolean):boolean{
  return !useMedia("(prefers-reduced-motion: reduce)",true)&&activo;
}
