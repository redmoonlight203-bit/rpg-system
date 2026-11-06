"use client";
import {useMemo} from "react";
import {CLASES_YUGEN} from "../lib/clases";
import {clasePermitida,type ClaseYugen,type ConfiguracionInvocacion} from "../lib/invocaciones";

export type InvocacionEditor=ConfiguracionInvocacion & {plantilla?:{nombre:string;stats:Record<string,number>;habilidades:string[]}};
type Opcion={id:string;nombre:string;clase?:string;tipo_creacion?:string};
const campo="mt-1 w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-neutral-100";
export default function EditorInvocacion({value,onChange,creaciones,crearDentro}:{value:InvocacionEditor|null;onChange:(v:InvocacionEditor|null)=>void;creaciones:Opcion[];crearDentro:()=>void}){
 const personajes=creaciones.filter(c=>c.tipo_creacion==="personaje");
 const habilidades=useMemo(()=>creaciones.filter(c=>c.tipo_creacion==="habilidad"&&value&&clasePermitida(c.clase||"",value.claseMaxima)),[creaciones,value]);
 const v=value;
 const patch=(p:Partial<InvocacionEditor>)=>v&&onChange({...v,...p});
 return <section className="rounded-xl border border-sky-900/60 bg-sky-950/10 p-4 space-y-4">
  <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!v} onChange={e=>onChange(e.target.checked?{claseMaxima:"C",maxHabilidades:1,modo:"jugador_en_combate",duracionTurnos:3}:null)}/>Esta habilidad permite invocar</label>
  {v&&<>
   <p className="text-xs text-neutral-400">La clase es un techo absoluto. Ni una tirada crítica puede superarlo. Las criaturas temporales no se publican en La Creación.</p>
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm">Modo de invocación<select className={campo} value={v.modo} onChange={e=>patch({modo:e.target.value as InvocacionEditor["modo"]})}><option value="existente">Invocar creación existente</option><option value="plantilla_temporal">Diseñar criatura temporal aquí</option><option value="jugador_en_combate">Jugador crea durante combate</option><option value="gm_en_combate">GM crea durante combate</option></select></label>
    <label className="text-sm">Clase máxima<select className={campo} value={v.claseMaxima} onChange={e=>patch({claseMaxima:e.target.value as ClaseYugen})}>{CLASES_YUGEN.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
    <label className="text-sm">Habilidades que puede elegir<input className={campo} type="number" min={0} max={20} value={v.maxHabilidades} onChange={e=>patch({maxHabilidades:Number(e.target.value)})}/></label>
    <label className="text-sm">Duración (turnos)<input className={campo} type="number" min={1} value={v.duracionTurnos} onChange={e=>patch({duracionTurnos:Number(e.target.value)})}/></label>
   </div>
   {v.modo==="existente"&&<label className="block text-sm">Personaje de La Creación<select className={campo} value={v.origenId||""} onChange={e=>patch({origenId:e.target.value})}><option value="">Elige un personaje</option>{personajes.filter(c=>clasePermitida(c.clase||"",v.claseMaxima)).map(c=><option key={c.id} value={c.id}>{c.nombre} · {c.clase}</option>)}</select></label>}
   {v.modo==="plantilla_temporal"&&<div className="space-y-3 rounded-lg border border-neutral-800 p-3"><label className="block text-sm">Nombre de la criatura<input className={campo} value={v.plantilla?.nombre||""} onChange={e=>patch({plantilla:{nombre:e.target.value,stats:v.plantilla?.stats||{},habilidades:v.plantilla?.habilidades||[]}})}/></label><p className="text-xs text-neutral-400">Puedes definir atributos iniciales y una habilidad de La Creación. La validación de clase se ejecutará antes de invocarla.</p><label className="block text-sm">Habilidad preseleccionada<select className={campo} value={v.plantilla?.habilidades?.[0]||""} onChange={e=>patch({plantilla:{nombre:v.plantilla?.nombre||"",stats:v.plantilla?.stats||{},habilidades:e.target.value?[e.target.value]:[]}})}><option value="">Ninguna</option>{habilidades.map(h=><option key={h.id} value={h.id}>{h.nombre} · {h.clase}</option>)}</select></label><button type="button" className="rounded-lg border border-sky-700 px-3 py-2 text-sm" onClick={crearDentro}>Crear personaje completo en El Yunque</button></div>}
   {(v.modo==="jugador_en_combate"||v.modo==="gm_en_combate")&&<div className="rounded-lg border border-neutral-800 p-3 text-sm"><p>{v.modo==="jugador_en_combate"?"El jugador":"El GM"} podrá nombrar y distribuir estadísticas durante el combate, con clase máxima {v.claseMaxima}.</p><p className="mt-2 text-neutral-400">Habilidades elegibles en La Creación: {habilidades.length}. El motor debe validar la clase combinada antes de confirmar.</p></div>}
  </>}
 </section>;
}
