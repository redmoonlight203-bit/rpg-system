"use client";
import {createContext,useContext,useEffect,useMemo,useRef,useSyncExternalStore,type ReactNode} from "react";
import {crearColaDialogos,type ColaDialogos,type OpcionesAvisar,type OpcionesConfirmar,type PeticionDialogo} from "../lib/dialogo";
import "./dialogo.css";

type ApiDialogo = {confirmar:(o:OpcionesConfirmar)=>Promise<boolean>;avisar:(o:OpcionesAvisar)=>Promise<void>};
const Contexto=createContext<ColaDialogos|null>(null);

/** Diálogos en pantalla del juego. `confirmar` y `avisar` sustituyen a window.confirm / window.alert. */
export function useDialogo():ApiDialogo{
  const cola=useContext(Contexto);
  if(!cola)throw Error("useDialogo requiere <DialogoProvider> en la raíz.");
  return useMemo(()=>({confirmar:cola.confirmar,avisar:cola.avisar}),[cola]);
}

/** Trampa de foco reutilizable: Tab y Mayús+Tab circulan dentro del contenedor. */
export function atraparFoco(e:React.KeyboardEvent,contenedor:HTMLElement|null){
  if(e.key!=="Tab"||!contenedor)return;
  const focos=[...contenedor.querySelectorAll<HTMLElement>("button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex='-1'])")];
  if(!focos.length)return;
  const primero=focos[0],ultimo=focos[focos.length-1];
  if(!contenedor.contains(document.activeElement)){e.preventDefault();primero.focus();return;}
  if(e.shiftKey&&document.activeElement===primero){e.preventDefault();ultimo.focus();}
  else if(!e.shiftKey&&document.activeElement===ultimo){e.preventDefault();primero.focus();}
}

function Esquina({className}:{className:string}){
  return <svg className={"dlg-esquina "+className} viewBox="0 0 24 24" aria-hidden="true"><path d="M2 22V8a6 6 0 0 1 6-6h14" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/></svg>;
}

function Panel({cola}:{cola:ColaDialogos}){
  const actual=useSyncExternalStore<PeticionDialogo|null>(cola.suscribir,cola.actual,()=>null);
  const panel=useRef<HTMLDivElement>(null);
  const aceptar=useRef<HTMLButtonElement>(null);
  const previo=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    if(!actual)return;
    previo.current=document.activeElement as HTMLElement|null;
    aceptar.current?.focus();
    return ()=>{previo.current?.focus?.();};
  },[actual]);
  if(!actual)return null;
  const titulo="dlg-titulo-"+actual.id,mensaje="dlg-mensaje-"+actual.id;
  const tecla=(e:React.KeyboardEvent)=>{
    if(cola.tecla(e.key)){e.preventDefault();e.stopPropagation();return;}
    atraparFoco(e,panel.current);
  };
  return <div className="dlg-velo" onMouseDown={e=>{if(e.target===e.currentTarget)cola.responder(false);}} onKeyDown={tecla}>
    <div ref={panel} key={actual.id} role={actual.tipo==="confirmar"?"alertdialog":"dialog"} aria-modal="true" aria-labelledby={titulo} aria-describedby={mensaje} className={"dlg-panel"+(actual.peligro?" dlg-panel--peligro":"")}>
      <Esquina className="dlg-esquina--ai"/><Esquina className="dlg-esquina--ad"/><Esquina className="dlg-esquina--bi"/><Esquina className="dlg-esquina--bd"/>
      <div className="dlg-emblema" aria-hidden="true">{actual.peligro?"!":actual.tipo==="avisar"?"✦":"?"}</div>
      <h2 id={titulo} className="dlg-titulo">{actual.titulo}</h2>
      <p id={mensaje} className="dlg-mensaje">{actual.mensaje}</p>
      <div className="dlg-acciones">
        {actual.tipo==="confirmar"&&<button type="button" className="dlg-boton dlg-boton--secundario" onClick={()=>cola.responder(false)}>{actual.cancelar}</button>}
        <button ref={aceptar} type="button" className={"dlg-boton "+(actual.peligro?"dlg-boton--peligro":"dlg-boton--principal")} onClick={()=>cola.responder(true)}>{actual.aceptar}</button>
      </div>
    </div>
  </div>;
}

export function DialogoProvider({children}:{children:ReactNode}){
  const cola=useMemo(()=>crearColaDialogos(),[]);
  return <Contexto.Provider value={cola}>{children}<Panel cola={cola}/></Contexto.Provider>;
}
