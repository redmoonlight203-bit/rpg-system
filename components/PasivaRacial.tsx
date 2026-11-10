"use client";
import {useRef, useState} from "react";
import {EditorPasivas} from "./EditorPasivas";
import {EditorReglas} from "./EditorReglas";
import {validarPasivas, type ReglaPasiva} from "../lib/pasivas";
import {validarReglas, type Regla} from "../lib/reglas";
import {linaje, type CategoriaBase} from "../lib/estadisticas";
import {supabase} from "../lib/supabase";
export type DefinicionRacial = {nombre:string; descripcion:string; reglas:Regla[]; reglas_pasivas:ReglaPasiva[]};
type Categoria = CategoriaBase & {pasiva_racial?:DefinicionRacial|null};
const vacia=():DefinicionRacial=>({nombre:"",descripcion:"",reglas:[],reglas_pasivas:[]});
const boton="rounded-lg border border-neutral-700 px-3 py-2 text-sm disabled:opacity-40";
const campo="mt-2 w-full rounded-lg border border-neutral-700 bg-well p-3 text-sm";
export function PasivaRacial({categoria,categorias,onSaved}:{categoria:Categoria;categorias:Categoria[];onSaved:()=>void}){
 const [valor,setValor]=useState<DefinicionRacial>(()=>structuredClone(categoria.pasiva_racial||vacia()));
 const [editando,setEditando]=useState(false),[ocupado,setOcupado]=useState(false),[error,setError]=useState("");
 const bloqueo=useRef(false);
 const esRaza=linaje(categorias,categoria.clave).some(c=>c.clave==="razas");
 if(!esRaza)return null;
 const heredadas=linaje(categorias,categoria.clave).filter(c=>c.id!==categoria.id).map(c=>categorias.find(x=>x.id===c.id)!).filter(c=>c.pasiva_racial);
 async function guardar(eliminar=false){
  if(bloqueo.current)return;
  if(!eliminar){const fallo=validarPasivas(valor.reglas_pasivas)||validarReglas(valor.reglas);if(!valor.nombre.trim()||(!valor.reglas.length&&!valor.reglas_pasivas.length))return setError("Añade un nombre y al menos una regla para la pasiva.");if(fallo)return setError(fallo);}
  bloqueo.current=true;setOcupado(true);setError("");
  try{
   let q=supabase.from("categorias_forja").update({pasiva_racial:eliminar?null:{...valor,nombre:valor.nombre.trim(),descripcion:valor.descripcion.trim()}}).eq("id",categoria.id);
   q=categoria.pasiva_racial?q.eq("pasiva_racial",JSON.stringify(categoria.pasiva_racial)):q.is("pasiva_racial",null);
   const r=await q.select("id").single();if(r.error)throw Error(r.error.message);if(!r.data)throw Error("La raza cambió. Recarga antes de guardar.");
   setEditando(false);onSaved();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo guardar la pasiva.");}finally{bloqueo.current=false;setOcupado(false);}
 }
 return <section className="mt-6 space-y-4 rounded-xl border border-orange-900/60 bg-orange-950/10 p-4 sm:p-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs  tracking-normal text-orange-400">Motor racial</p><h3 className="mt-1 font-semibold">Pasiva de {categoria.nombre}</h3></div>{!editando&&<button className={boton} onClick={()=>{setValor(structuredClone(categoria.pasiva_racial||vacia()));setEditando(true);setError("");}}>{categoria.pasiva_racial?"Editar pasiva":"Crear pasiva"}</button>}</div>
  <p className="text-sm text-neutral-400">Se incorpora automáticamente al preparar al personaje para combate. Las razas descendientes también reciben esta pasiva; los encuentros ya preparados conservan sus reglas.</p>
  {heredadas.map(c=><p className="text-xs text-orange-300" key={c.id}>Heredada de {c.nombre}: {c.pasiva_racial?.nombre} · se edita en su origen.</p>)}
  {!editando&&categoria.pasiva_racial&&<div><strong>{categoria.pasiva_racial.nombre}</strong><p className="mt-1 text-sm text-neutral-400">{categoria.pasiva_racial.descripcion}</p><p className="mt-2 text-xs text-orange-300">{categoria.pasiva_racial.reglas_pasivas.length} efectos pasivos · {categoria.pasiva_racial.reglas.length} reglas del motor</p></div>}
  {editando&&<fieldset disabled={ocupado} className="min-w-0 space-y-5"><label className="block text-sm">Nombre de la pasiva<input maxLength={120} className={campo} value={valor.nombre} onChange={e=>setValor({...valor,nombre:e.target.value})}/></label><label className="block text-sm">Descripción para el jugador<textarea maxLength={2000} rows={3} className={campo} value={valor.descripcion} onChange={e=>setValor({...valor,descripcion:e.target.value})}/></label>
  <EditorPasivas value={valor.reglas_pasivas} onChange={reglas_pasivas=>setValor({...valor,reglas_pasivas})}/>
  <details className="rounded-lg border border-neutral-800 p-3"><summary className="cursor-pointer text-sm">Reglas avanzadas: condiciones, salvaciones y transformaciones</summary><div className="mt-4"><EditorReglas value={valor.reglas} onChange={reglas=>setValor({...valor,reglas})}/></div></details>
  <div className="flex flex-wrap gap-3"><button className={boton} onClick={()=>void guardar()}>{ocupado?"Guardando…":"Guardar pasiva"}</button><button className={boton} onClick={()=>{setEditando(false);setError("");}}>Cancelar</button>{categoria.pasiva_racial&&<button className={`${boton} text-red-300`} onClick={()=>{if(window.confirm(`¿Quitar la pasiva propia de ${categoria.nombre}? Las pasivas de sus antepasados se conservan.`))void guardar(true);}}>Quitar pasiva propia</button>}</div></fieldset>}
  {error&&<p role="alert" className="text-sm text-red-300">{error}</p>}
 </section>;
}
