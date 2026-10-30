"use client";
import {useState} from "react";
import {type Efecto,formula,nuevoEfecto,validarEfectos} from "../lib/creacion";
const campo="w-full rounded border border-neutral-700 bg-black p-2 text-sm text-neutral-100";
export function EditorDados({value,onChange,disabled=false}:{value:Efecto[];onChange:(e:Efecto[])=>void;disabled?:boolean}){
 const [prueba,setPrueba]=useState("");
 function cambiar(id:string,patch:Partial<Efecto>){onChange(value.map(e=>e.id===id?{...e,...patch}:e));setPrueba("");}
 function tirar(e:Efecto){
  const error=validarEfectos([e]);if(error){setPrueba(error);return;}
  const rolls=Array.from({length:e.cantidad},()=>{const a=new Uint32Array(1);const limite=Math.floor(4294967296/e.caras)*e.caras;do{crypto.getRandomValues(a);}while(a[0]>=limite);return a[0]%e.caras+1;});
  const total=rolls.reduce((a,b)=>a+b,0)+e.modificador;
  setPrueba(`${e.nombre}: [${rolls.join(", ")}] ${e.modificador>=0?"+":""}${e.modificador} = ${total}. Prueba sin aplicar cambios ni gastar PH.`);
 }
 return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Dados y efectos</h2><p className="text-sm text-neutral-400">Configura cada acción: daño, curación, recuperación o estado.</p></div><button disabled={disabled||value.length>=20} type="button" onClick={()=>onChange([...value,nuevoEfecto()])} className="rounded border border-orange-800 px-3 py-2 text-sm">+ Agregar acción</button></div>
 {!value.length&&<p className="text-sm text-neutral-500">Sin acciones con dados. Una armadura ordinaria puede funcionar solo con sus atributos.</p>}
 {value.map(e=><fieldset disabled={disabled} key={e.id} className="space-y-3 rounded-lg border border-neutral-800 p-4"><legend className="px-2 text-orange-300">{e.nombre||"Nueva acción"} · {e.efecto==="estado"?"Estado":formula(e)}</legend>
 <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Nombre<input maxLength={120} className={campo} value={e.nombre} onChange={v=>cambiar(e.id,{nombre:v.target.value})} placeholder="Bola de fuego, curación…"/></label><label className="text-sm">Efecto<select className={campo} value={e.efecto} onChange={v=>cambiar(e.id,{efecto:v.target.value as Efecto["efecto"]})}><option value="dano">Causar daño</option><option value="curacion">Curar vida</option><option value="recuperar_ph">Recuperar PH</option><option value="reducir_fatiga">Reducir Fatiga</option><option value="estado">Aplicar estado</option></select></label></div>
 {e.efecto!=="estado"&&<div className="grid grid-cols-3 gap-3"><label className="text-sm">Cantidad de dados<input className={campo} type="number" min="0" max="100" value={e.cantidad} onChange={v=>cambiar(e.id,{cantidad:Number(v.target.value)})}/></label><label className="text-sm">Caras del dado<select className={campo} value={e.caras} onChange={v=>cambiar(e.id,{caras:Number(v.target.value)})}>{[...new Set([4,6,8,10,12,20,100,e.caras])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>d{n}</option>)}</select></label><label className="text-sm">Modificador<input className={campo} type="number" value={e.modificador} onChange={v=>cambiar(e.id,{modificador:Number(v.target.value)})}/></label></div>}
 <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Coste en PH<input type="number" min="0" className={campo} value={e.coste_ph} onChange={v=>cambiar(e.id,{coste_ph:Number(v.target.value)})}/></label><label className="text-sm">Duración en turnos (0 = inmediato)<input type="number" min="0" className={campo} value={e.duracion} onChange={v=>cambiar(e.id,{duracion:Number(v.target.value)})}/></label></div>
 {e.efecto==="dano"&&<label className="block text-sm">Tipo de daño<input className={campo} value={e.tipo_dano} maxLength={120} onChange={v=>cambiar(e.id,{tipo_dano:v.target.value})} placeholder="Cortante, fuego, eléctrico…"/></label>}
 {e.efecto==="estado"&&<label className="block text-sm">Estado y efecto<textarea maxLength={1000} className={campo} value={e.estado} onChange={v=>cambiar(e.id,{estado:v.target.value})} placeholder="Describe qué provoca y cuándo termina"/></label>}
 <div className="flex flex-wrap justify-between gap-3 text-sm"><button type="button" onClick={()=>onChange(value.filter(v=>v.id!==e.id))} className="text-red-300">Quitar acción</button>{e.efecto!=="estado"&&<button type="button" onClick={()=>tirar(e)}>Probar {formula(e)}</button>}</div>
 </fieldset>)}
 {prueba&&<p role="status" className="text-sm text-amber-200">{prueba}</p>}
 </section>;
}
