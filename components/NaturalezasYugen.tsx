"use client";
import { useCallback, useEffect, useState } from "react";
import { EditorDados } from "./EditorDados";
import { EditorPasivas } from "./EditorPasivas";
import { EditorReglas } from "./EditorReglas";
import { type Efecto, validarEfectos } from "../lib/creacion";
import { type ReglaPasiva, validarPasivas } from "../lib/pasivas";
import { type Regla, validarReglas } from "../lib/reglas";
import { supabase } from "../lib/supabase";

type Naturaleza = { id:string; clave:string; nombre:string; descripcion:string; modificadores:Record<string,number>; pasivas:unknown[]; habilidades:unknown[]; reglas:Record<string,unknown> };
type Vinculo = { id:string; naturaleza_id:string; activa:boolean; origen:string; metadata:Record<string,unknown>; adquirida_at:string };
const input="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm text-white";
const btn="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-white hover:border-emerald-600 disabled:opacity-40";
const slug=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
function objetoNumerico(texto:string):Record<string,number>{
 const obj=JSON.parse(texto||"{}") as Record<string,unknown>;
 if(!obj || Array.isArray(obj) || typeof obj!=="object" || Object.values(obj).some(x=>typeof x!=="number"||!Number.isFinite(x)))throw Error("Los modificadores deben ser un objeto JSON con valores numéricos.");
 return obj as Record<string,number>;
}
function vista(texto:string,fallback:unknown){try{const v=JSON.parse(texto);return v && typeof v==="object" && Array.isArray(v)===Array.isArray(fallback)?v:fallback;}catch{return fallback;}}
function lista(texto:string):unknown[]{const v=JSON.parse(texto||"[]");if(!Array.isArray(v))throw Error("Las pasivas y habilidades deben ser listas JSON.");return v;}
export default function NaturalezasYugen({personajeId,onCambio,soloCatalogo=false}:{personajeId?:number;onCambio?:()=>void;soloCatalogo?:boolean}){
 const [catalogo,setCatalogo]=useState<{id:string;nombre:string;tipo_creacion:string}[]>([]);
 const [naturalezas,setNaturalezas]=useState<Naturaleza[]>([]);
 const [vinculos,setVinculos]=useState<Vinculo[]>([]);
 const [nombre,setNombre]=useState("");
 const [descripcion,setDescripcion]=useState("");
 const [mod,setMod]=useState("{}");
 const [pasivas,setPasivas]=useState("[]");
 const [habilidades,setHabilidades]=useState("[]");
 const [reglas,setReglas]=useState("{}");
 const [editId,setEditId]=useState("");
 const [elegida,setElegida]=useState("");
 const [origen,setOrigen]=useState("");
 const [metadata,setMetadata]=useState("{}");
 const [error,setError]=useState("");
 const [mensaje,setMensaje]=useState("");
 const [ocupado,setOcupado]=useState(false);
 const cargar=useCallback(async()=>{
  const [n,v]=await Promise.all([supabase.from("naturalezas").select("*").order("nombre"),personajeId?supabase.from("personaje_naturalezas").select("*").eq("personaje_id",personajeId).order("adquirida_at"):Promise.resolve({data:[],error:null})]);
  if(n.error||v.error){setError(n.error?.message||v.error?.message||"Error al cargar.");return;}
  setNaturalezas((n.data||[]) as Naturaleza[]);setVinculos((v.data||[]) as Vinculo[]);
 },[personajeId]);
 useEffect(()=>{void Promise.resolve().then(cargar);void supabase.from("forja_maestra").select("id,nombre,tipo_creacion").eq("estado","aprobado").in("tipo_creacion",["habilidad","pasiva"]).then(({data})=>setCatalogo(data||[]));},[cargar]);
 async function ejecutar(fn:()=>Promise<void>){
  setOcupado(true);setError("");setMensaje("");
  try{await fn();await cargar();onCambio?.();}catch(e){setError(e instanceof Error?e.message:"No se pudo guardar.");}finally{setOcupado(false);}
 }
 function editar(n?:Naturaleza){
  setEditId(n?.id||"");setNombre(n?.nombre||"");setDescripcion(n?.descripcion||"");
  setMod(JSON.stringify(n?.modificadores||{},null,2));setPasivas(JSON.stringify(n?.pasivas||[],null,2));
  setHabilidades(JSON.stringify(n?.habilidades||[],null,2));setReglas(JSON.stringify(n?.reglas||{},null,2));
 }
 async function guardar(){
  await ejecutar(async()=>{
   const n=nombre.trim();if(!n)throw Error("Escribe el nombre de la naturaleza.");
   const r=JSON.parse(reglas||"{}");if(!r||typeof r!=="object"||Array.isArray(r))throw Error("Las reglas deben ser un objeto JSON.");
   for(const x of lista(pasivas)) {if(typeof x==="string")continue;const p=x as {reglas?:ReglaPasiva[];reglas_motor?:Regla[]};const fallo=validarPasivas(p.reglas||[])||validarReglas(p.reglas_motor||[]);if(fallo)throw Error(fallo);}
   for(const x of lista(habilidades)){if(typeof x==="string")continue;const h=x as {efectos?:Efecto[];reglas?:Regla[]};const fallo=validarEfectos(h.efectos||[])||validarReglas(h.reglas||[]);if(fallo)throw Error(fallo);}
   const fallo=validarReglas(r.motor||[]);if(fallo)throw Error(fallo);
   const data={nombre:n,descripcion,modificadores:objetoNumerico(mod),pasivas:lista(pasivas),habilidades:lista(habilidades),reglas:r};
   const q=editId?supabase.from("naturalezas").update(data).eq("id",editId).select("id").single():supabase.from("naturalezas").insert({...data,clave:slug(n)}).select("id").single();
   const res=await q;if(res.error)throw Error(res.error.message);
   setMensaje(editId?"Definición actualizada. Los vínculos existentes conservan sus modificadores originales.":"Naturaleza creada.");editar();
  });
 }
 async function asignar(){
  if(!personajeId)return;
  await ejecutar(async()=>{
   if(!elegida)throw Error("Elige una naturaleza.");
   const meta=JSON.parse(metadata||"{}");if(!meta||typeof meta!=="object"||Array.isArray(meta))throw Error("Los datos del vínculo deben ser un objeto JSON.");
   const r=await supabase.from("personaje_naturalezas").insert({personaje_id:personajeId,naturaleza_id:elegida,origen,metadata:meta}).select("id").single();
   if(r.error)throw Error(r.error.message);
   setMensaje("Naturaleza adquirida. Estadísticas recalculadas.");setOrigen("");setMetadata("{}");
  });
 }
 async function activar(v:Vinculo){
  await ejecutar(async()=>{const r=await supabase.from("personaje_naturalezas").update({activa:!v.activa}).eq("id",v.id).select("id").single();if(r.error)throw Error(r.error.message);setMensaje(v.activa?"Naturaleza suspendida.":"Naturaleza reactivada.");});
 }
 async function retirar(v:Vinculo){
  if(!window.confirm("¿Retirar esta naturaleza? Sus bonificaciones serán revertidas. Esta acción no se puede deshacer."))return;
  await ejecutar(async()=>{const r=await supabase.from("personaje_naturalezas").delete().eq("id",v.id).select("id").single();if(r.error)throw Error(r.error.message);setMensaje("Naturaleza retirada.");});
 }
 return <section className="space-y-4 rounded-xl border border-emerald-900/50 bg-neutral-950 p-4 text-neutral-100">
  <div><h3 className="text-lg font-semibold">Naturalezas adquiridas</h3><p className="text-xs text-neutral-400">Se acumulan con la raza de origen. Solo el GM puede crear y aplicar naturalezas.</p></div>
  {error&&<p role="alert" className="text-sm text-red-400">{error}</p>}{mensaje&&<p role="status" className="text-sm text-emerald-400">{mensaje}</p>}
  {!soloCatalogo&&personajeId&&<div className="space-y-3 border-b border-neutral-800 pb-4">
   {vinculos.map(v=><div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-800 p-3">
    <div><strong>{naturalezas.find(n=>n.id===v.naturaleza_id)?.nombre||"Naturaleza desconocida"}</strong><p className="text-xs text-neutral-400">{v.origen||"Sin origen registrado"} · {v.activa?"Activa":"Suspendida"}</p></div>
    <div className="flex gap-2"><button className={btn} disabled={ocupado} onClick={()=>void activar(v)}>{v.activa?"Suspender":"Activar"}</button><button className={btn} disabled={ocupado} onClick={()=>void retirar(v)}>Retirar</button></div>
   </div>)}
   {!vinculos.length&&<p className="text-sm text-neutral-500">Este personaje todavía no tiene naturalezas adquiridas.</p>}
   <label className="block text-sm">Adquirir naturaleza<select className={input} value={elegida} onChange={e=>setElegida(e.target.value)}><option value="">Seleccionar…</option>{naturalezas.filter(n=>!vinculos.some(v=>v.naturaleza_id===n.id)).map(n=><option key={n.id} value={n.id}>{n.nombre}</option>)}</select></label>
   <label className="block text-sm">Origen / acontecimiento<input className={input} value={origen} onChange={e=>setOrigen(e.target.value)} placeholder="Ej. Bestia sellada durante la campaña"/></label>
   <label className="block text-sm">Datos particulares del vínculo (JSON)<textarea className={input} rows={2} value={metadata} onChange={e=>setMetadata(e.target.value)} placeholder='{"bestia":"Lobo Carmesí"}'/></label>
   <button className={btn} disabled={ocupado||!elegida} onClick={()=>void asignar()}>Aplicar al personaje</button>
  </div>}
  <details open={soloCatalogo} className="space-y-3"><summary className="cursor-pointer font-semibold">Catálogo y editor universal ({naturalezas.length})</summary>
   <div className="mt-3 grid gap-2 sm:grid-cols-2">{naturalezas.map(n=><button key={n.id} className={btn+" text-left"} onClick={()=>editar(n)}><strong>{n.nombre}</strong><span className="block text-xs text-neutral-400">{n.descripcion||n.clave}</span></button>)}</div>
   <div className="grid gap-3 border-t border-neutral-800 pt-4">
    <h4 className="font-medium">{editId?"Editar naturaleza":"Crear nueva naturaleza"}</h4>
    <label className="text-sm">Nombre<input className={input} value={nombre} onChange={e=>setNombre(e.target.value)}/></label>
    <label className="text-sm">Descripción<textarea className={input} rows={2} value={descripcion} onChange={e=>setDescripcion(e.target.value)}/></label>
    <label className="text-sm">Bonificaciones numéricas (JSON)<textarea className={input+" font-mono"} rows={3} value={mod} onChange={e=>setMod(e.target.value)}/></label>
    <label className="text-sm">Añadir desde El Yunque<select className={input} value="" onChange={e=>{const f=catalogo.find(f=>f.id===e.target.value);if(!f)return;const actual=lista(f.tipo_creacion==='pasiva'?pasivas:habilidades);if(!actual.includes(f.id))(f.tipo_creacion==='pasiva'?setPasivas:setHabilidades)(JSON.stringify([...actual,f.id]));}}><option value="">Selecciona una habilidad o pasiva aprobada…</option>{catalogo.map(f=><option key={f.id} value={f.id}>{f.nombre} · {f.tipo_creacion}</option>)}</select></label>
   <div className="flex flex-wrap gap-2">{([['pasiva',vista(pasivas,[])],['habilidad',vista(habilidades,[])]] as [string,unknown[]][]).flatMap(([tipo,items])=>items.filter((x):x is string=>typeof x==='string').map(id=><button key={tipo+id} className={btn} onClick={()=>{const setter=tipo==='pasiva'?setPasivas:setHabilidades;setter(JSON.stringify(items.filter(x=>x!==id)));}}>{catalogo.find(f=>f.id===id)?.nombre||id} · Quitar</button>))}</div>
   <EditorPasivas value={(vista(pasivas,[]).filter((p:unknown)=>typeof p!=="string")[0]?.reglas||[]) as ReglaPasiva[]} onChange={reglas=>{const todas=lista(pasivas);const i=todas.findIndex(p=>typeof p!=="string");if(i<0)todas.push({id:"propia",nombre:nombre||"Naturaleza",reglas});else todas[i]={...(todas[i] as object),reglas};setPasivas(JSON.stringify(todas));}}/>
   <EditorDados value={(vista(habilidades,[]).filter((p:unknown)=>typeof p!=="string")[0]?.efectos||[]) as Efecto[]} onChange={efectos=>{const todas=lista(habilidades);const i=todas.findIndex(p=>typeof p!=="string");if(i<0)todas.push({id:"propia",nombre:nombre||"Naturaleza",stats:{},efectos});else todas[i]={...(todas[i] as object),efectos};setHabilidades(JSON.stringify(todas));}}/>
   <EditorReglas value={(vista(reglas,{}).motor||[]) as Regla[]} onChange={motor=>setReglas(JSON.stringify({...vista(reglas,{}),motor}))}/>
   <details><summary>Definiciones avanzadas y referencias del Yunque</summary>
   <label className="text-sm">Pasivas (lista JSON)<textarea className={input+" font-mono"} rows={2} value={pasivas} onChange={e=>setPasivas(e.target.value)}/></label>
    <label className="text-sm">Habilidades (lista JSON)<textarea className={input+" font-mono"} rows={2} value={habilidades} onChange={e=>setHabilidades(e.target.value)}/></label>
    <label className="text-sm">Condiciones y reglas (objeto JSON)<textarea className={input+" font-mono"} rows={3} value={reglas} onChange={e=>setReglas(e.target.value)}/></label>
    </details><p className="text-xs text-emerald-300">Los efectos se incorporan al preparar el próximo encuentro. Las reglas permiten condiciones, transformaciones y costes con el mismo motor del Yunque. La raza de origen conserva sus pasivas.</p>
    <div className="flex gap-2"><button className={btn} disabled={ocupado} onClick={()=>void guardar()}>{editId?"Guardar cambios":"Crear naturaleza"}</button><button className={btn} disabled={ocupado} onClick={()=>editar()}>Nueva / limpiar</button></div>
   </div>
  </details>
 </section>;
}
