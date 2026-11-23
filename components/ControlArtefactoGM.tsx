"use client";
// Controles del GM sobre la mente de un combatiente: tomar un artefacto (salvación), asignar la voz, dominar y,
// desde el paso 3.5, el espejo mental. El GM decide; las tiradas solo abren la puerta.
import {Brain,Crown,Skull} from "lucide-react";
import {tomarArtefacto,asignarVoz,dominar,estaDominado,type Combate,type Combatiente} from "../lib/combate";
import {NOMBRE_VOZ} from "../lib/artefactos-voces";
import type {ConfiguracionArtefacto} from "../lib/artefactos";
import "./control-artefacto.css";

export type ArtefactoGM={id:string;nombre:string;configuracion_artefacto:ConfiguracionArtefacto|null};
type Props={c:Combate;m:Combatiente;artefactos:ArtefactoGM[];ocupado:boolean;aplicar:(f:(c:Combate)=>Combate)=>void;extra?:React.ReactNode};

export default function ControlArtefactoGM({c,m,artefactos,ocupado,aplicar,extra}:Props){
 const conVoz=artefactos.filter(a=>a.configuracion_artefacto?.voces);
 const voz=m.voz_artefacto,dominado=estaDominado(m);
 if(c.fase!=="en_curso")return null;
 return <section className="gm-mente" aria-label={`Mente de ${m.nombre}`}>
  <h4><Brain size={14} aria-hidden="true"/>Mente</h4>
  {conVoz.length>0&&!voz&&<form className="gm-mente-fila" onSubmit={e=>{e.preventDefault();const id=new FormData(e.currentTarget).get("artefacto");const a=conVoz.find(x=>x.id===id);if(a?.configuracion_artefacto?.voces)aplicar(x=>tomarArtefacto(x,m.id,a.configuracion_artefacto!.voces!));}}>
   <select name="artefacto" aria-label={`Artefacto que toma ${m.nombre}`} defaultValue={conVoz[0].id}>{conVoz.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}</select>
   <button type="submit" disabled={ocupado}><Skull size={14} aria-hidden="true"/>Tomar artefacto</button>
  </form>}
  {voz?.estado==="pendiente"&&<div className="gm-mente-voces"><p>Falló la salvación. Elige la voz que oye:</p>
   {m.voz_config?.voces.map(z=><button key={z.id} type="button" disabled={ocupado} className={`is-${z.tipo}`} onClick={()=>aplicar(x=>asignarVoz(x,m.id,z.id))}><small>{NOMBRE_VOZ[z.tipo]}</small>{z.texto}</button>)}</div>}
  {voz?.estado==="activa"&&<p className={`gm-mente-activa is-${voz.tipo}`}>«{voz.texto}» · {voz.restantes} {voz.restantes===1?"turno":"turnos"}{voz.respuesta?` · responde: ${voz.respuesta}`:""}</p>}
  <div className="gm-mente-fila">
   <button type="button" disabled={ocupado} aria-pressed={dominado} className={dominado?"is-activo":undefined} onClick={()=>aplicar(x=>dominar(x,m.id,!dominado))}><Crown size={14} aria-hidden="true"/>{dominado?"Liberar":"Dominar"}</button>
   {extra}
  </div>
 </section>;
}
