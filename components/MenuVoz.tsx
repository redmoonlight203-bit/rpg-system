"use client";
// La voz del artefacto en la pantalla del portador: una pregunta con respuestas, un comentario o una negativa
// (con «Resistir», una vez por encuentro). Llega susurrada: letras que tiemblan sobre un velo carmesí.
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {Skull} from "lucide-react";
import type {EstadoVoz} from "../lib/artefactos-voces";
import "./menu-voz.css";

export type VozJugador=Extract<EstadoVoz,{estado:"activa"}>&{puede_resistir?:boolean};
export default function MenuVoz({voz,ocupado=false,onResponder,onResistir}:{voz:VozJugador;ocupado?:boolean;onResponder:(r:string)=>void;onResistir:()=>void}){
 const [oculta,setOculta]=useState<string|null>(null);
 const clave=voz.id+voz.restantes;
 if(oculta===clave&&(voz.tipo!=="pregunta"||voz.respuesta))return <button type="button" className="mv-eco" onClick={()=>setOculta(null)}><Skull size={14} aria-hidden="true"/>La voz sigue ahí · {voz.restantes} {voz.restantes===1?"turno":"turnos"}</button>;
 return <Capa><div className="mv-velo"><section className={`mv-voz is-${voz.tipo}`} role="dialog" aria-modal="true" aria-label="La voz del artefacto" aria-live="assertive">
  <p className="mv-eyebrow"><Skull size={14} aria-hidden="true"/>Una voz en tu cabeza · {voz.restantes} {voz.restantes===1?"turno":"turnos"}</p>
  <blockquote className="mv-texto">{[...voz.texto].map((l,i)=><span key={i} style={{animationDelay:`${i*18}ms`}}>{l}</span>)}</blockquote>
  {voz.tipo==="pregunta"&&!voz.respuesta&&<div className="mv-opciones">{(voz.opciones||[]).map(o=><button key={o} type="button" disabled={ocupado} onClick={()=>onResponder(o)}>{o}</button>)}</div>}
  {voz.tipo==="pregunta"&&voz.respuesta&&<p className="mv-nota">Respondiste: «{voz.respuesta}».</p>}
  {voz.tipo==="negativa"&&<div className="mv-opciones">
   <p className="mv-nota">Te niega «{voz.habilidad}».</p>
   <button type="button" disabled={ocupado||!voz.puede_resistir} onClick={onResistir}>{voz.puede_resistir?"Resistir (una vez por encuentro)":"Ya resististe en este encuentro"}</button></div>}
  {(voz.tipo!=="pregunta"||voz.respuesta)&&<button type="button" className="mv-cerrar" onClick={()=>setOculta(clave)}>Seguir luchando</button>}
 </section></div></Capa>;
}
/** Las capas del juego se pintan sobre el HUD fijo: se montan en <body>. */
function Capa({children}:{children:React.ReactNode}){
 const [raiz,setRaiz]=useState<HTMLElement|null>(null);
 useEffect(()=>setRaiz(document.body),[]);
 return raiz?createPortal(children,raiz):null;
}
/** Aviso en primera persona del espejo mental, flotando sobre todo. */
export function AvisoEspejo({texto}:{texto:string}){
 return <Capa><p className="aviso-espejo" role="alert">{texto}</p></Capa>;
}
