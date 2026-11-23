"use client";
// Menú de potenciadores (plan maestro, Apéndice C · paso 8): al elegir una técnica compatible aparece en pantalla
// (no window.confirm). Muestra cada potenciador con su coste, el daño por componente y los efectos elementales
// previstos. La previsualización usa la MISMA función que el motor (lib/rasgos.ts), así coincide con el registro.
import {useEffect,useMemo,useRef,useState} from "react";
import {Zap,X} from "lucide-react";
import type {Accion,PotenciadorDisponible} from "../lib/combate";
import type {Efecto} from "../lib/creacion";
import {potenciar,describirPotenciado,type Rasgo,type EleccionPotenciador} from "../lib/rasgos";
import {atraparFoco} from "./Dialogo";
import "./menu-potenciador.css";

const EFECTO_ELEMENTAL:Record<string,string>={electricidad:"Rayo: ignora 3 ARM; con Mojado, Superconducción ×2.",fuego:"Fuego: puede causar Quemadura; con Mojado, onda de vapor.",hielo:"Hielo: puede causar Escarcha; con Mojado, congela.",agua:"Agua: deja Mojado.",luz_sagrada:"Luz: ignora 5 ARM; puede marcar.",ninguno:"Físico: sin efecto elemental."};
const NOMBRE:Record<string,string>={electricidad:"rayo",fuego:"fuego",hielo:"hielo",agua:"agua",luz_sagrada:"luz",ninguno:"físico"};
/** Rasgos mínimos a partir de lo que la acción ofrece: suficiente para que `potenciar` calcule igual que el motor. */
function rasgosDe(p:PotenciadorDisponible[]):Rasgo[]{
 const porRasgo=new Map<string,Rasgo>();
 for(const x of p){
  const r=porRasgo.get(x.rasgo)||{id:x.rasgo,nombre:x.rasgo_nombre,origen:"adquirido" as const,recursos:[],potenciadores:[]};
  if(x.recurso&&!r.recursos.some(d=>d.id===x.recurso!.id))r.recursos.push({id:x.recurso.id,nombre:x.recurso.nombre,tope:{tipo:"fijo",valor:Math.max(1,x.recurso.saldo)},inicial:0,generacion:[]});
  r.potenciadores.push({id:x.potenciador,nombre:x.nombre,acepta:["ataque"],coste:{ph:x.ph||undefined,fatiga:x.fatiga||undefined,recurso:x.recurso?{id:x.recurso.id,min:x.recurso.min,max:x.recurso.max}:undefined},componentes_anadidos:x.componentes as Rasgo["potenciadores"][number]["componentes_anadidos"],limite_por_uso:1});
  porRasgo.set(x.rasgo,r);
 }
 return [...porRasgo.values()];
}
export function previsualizar(a:Accion,elecciones:EleccionPotenciador[]){
 const e:Efecto={...a.efecto,etiquetas:["ataque"]};
 const r=potenciar(e,rasgosDe(a.potenciadores||[]),elecciones);
 return {formula:describirPotenciado(a.efecto.nombre||a.nombre,r.efecto,r.coste),componentes:r.efecto.componentes||[],coste:r.coste};
}

export default function MenuPotenciador({accion,ocupado=false,onConfirmar,onCancelar}:{accion:Accion;ocupado?:boolean;onConfirmar:(e:EleccionPotenciador[])=>void;onCancelar:()=>void}){
 const opciones=accion.potenciadores||[];
 const [activos,setActivos]=useState<Record<string,number>>({});
 const carta=useRef<HTMLElement>(null),confirmar=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const previo=document.activeElement as HTMLElement|null;confirmar.current?.focus();return ()=>{previo?.focus?.();};},[]);
 const elecciones=useMemo(()=>opciones.filter(o=>`${o.rasgo}:${o.potenciador}` in activos).map(o=>({rasgo:o.rasgo,potenciador:o.potenciador,unidades:o.recurso?activos[`${o.rasgo}:${o.potenciador}`]:undefined})),[activos,opciones]);
 let vista:ReturnType<typeof previsualizar>|null=null,error="";
 try{vista=previsualizar(accion,elecciones);}catch(e){error=e instanceof Error?e.message:"Combinación no válida.";}
 const saldoInsuficiente=elecciones.some(el=>{const o=opciones.find(x=>x.rasgo===el.rasgo&&x.potenciador===el.potenciador);return !!o?.recurso&&(el.unidades||0)>o.recurso.saldo;});
 const alternar=(o:PotenciadorDisponible)=>{const k=`${o.rasgo}:${o.potenciador}`;setActivos(v=>{const n={...v};if(k in n)delete n[k];else{for(const x of opciones)if(x.rasgo===o.rasgo)delete n[`${x.rasgo}:${x.potenciador}`];n[k]=o.recurso?Math.min(o.recurso.max,Math.max(o.recurso.min,Math.min(2,o.recurso.saldo)||o.recurso.min)):1;}return n;});};
 return <div className="mp-velo" onKeyDown={e=>{if(e.key==="Escape"&&!ocupado){e.preventDefault();onCancelar();return;}atraparFoco(e,carta.current);}}>
  <section ref={carta} className="mp-carta" role="dialog" aria-modal="true" aria-labelledby="mp-titulo">
   <button type="button" className="mp-cerrar" aria-label="Cancelar" onClick={onCancelar}><X size={16} aria-hidden="true"/></button>
   <p className="mp-eyebrow"><Zap size={14} aria-hidden="true"/>Potenciar técnica</p>
   <h2 id="mp-titulo" className="mp-titulo">{accion.efecto.nombre||accion.nombre}</h2>
   <ul className="mp-lista">{opciones.map(o=>{const k=`${o.rasgo}:${o.potenciador}`,on=k in activos;
    return <li key={k} className={on?"is-activo":undefined}>
     <button type="button" aria-pressed={on} className="mp-opcion" onClick={()=>alternar(o)}>
      <strong>{o.nombre}</strong><small>{o.rasgo_nombre}</small>
      <span className="mp-coste">{o.recurso?`${o.recurso.min}–${o.recurso.max} ${o.recurso.nombre} · tienes ${o.recurso.saldo}`:""}{o.ph?` · ${o.ph} PH`:""}{o.fatiga?` · ${o.fatiga} Fatiga`:""}</span>
     </button>
     {on&&o.recurso&&<div className="mp-unidades" role="group" aria-label={`Unidades de ${o.recurso.nombre}`}>
      {Array.from({length:o.recurso.max-o.recurso.min+1},(_,i)=>o.recurso!.min+i).map(u=><button key={u} type="button" aria-pressed={activos[k]===u} disabled={u>o.recurso!.saldo} onClick={()=>setActivos(v=>({...v,[k]:u}))}>{u}</button>)}
     </div>}
    </li>;})}</ul>
   <div className="mp-vista" aria-live="polite">
    {vista&&<>
     <p className="mp-formula" data-formula={vista.formula}>{vista.formula}</p>
     <ul className="mp-componentes">{vista.componentes.map(c=><li key={c.id} data-elemento={c.elemento}><b>{c.cantidad}d{c.caras}</b> {NOMBRE[c.elemento]||c.elemento}<small>{EFECTO_ELEMENTAL[c.elemento]}</small></li>)}</ul>
    </>}
    {error&&<p role="alert" className="mp-error">{error}</p>}
    {saldoInsuficiente&&<p role="alert" className="mp-error">No tienes recurso suficiente.</p>}
   </div>
   <div className="mp-acciones">
    <button type="button" className="mp-boton mp-boton--no" disabled={ocupado} onClick={()=>onConfirmar([])}>Sin potenciar</button>
    <button ref={confirmar} type="button" className="mp-boton mp-boton--si" disabled={ocupado||!!error||saldoInsuficiente} onClick={()=>onConfirmar(elecciones)}>{elecciones.length?"Lanzar potenciada":"Lanzar"}</button>
   </div>
  </section>
 </div>;
}
