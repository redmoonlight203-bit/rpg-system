"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,BookOpen,Check,Lock,Sparkles,Star} from "lucide-react";
import {supabase} from "../../../lib/supabase";
import {experienciaParaNivel} from "../../../lib/progresion";

type Personaje={id:number;nombre:string;raza:string;nivel:number;exp_total:number;elecciones_pendientes:number;nivel_eleccion:number;habilidades_elegidas:{id:string;nombre:string;nivel:number}[];atributos:Record<string,number>};
type Opcion={id:string;nombre:string;descripcion?:string;clase?:string;requisitos?:{nivel_minimo?:number}};
export default function ProgresionJugador(){
 const [pj,setPj]=useState<Personaje|null>(null),[opciones,setOpciones]=useState<Opcion[]>([]),[cargando,setCargando]=useState(true),[ocupado,setOcupado]=useState(false),[error,setError]=useState(""),[aviso,setAviso]=useState("");
 const cargar=useCallback(async()=>{setCargando(true);try{
  const id=localStorage.getItem("personaje_activo_id");if(!id)throw Error("Elige primero un personaje en Mis personajes.");
  const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error("Inicia sesión.");
  const {data,error}=await supabase.from("personajes").select("id,nombre,raza,nivel,exp_total,elecciones_pendientes,nivel_eleccion,habilidades_elegidas,atributos").eq("id",id).eq("user_id",user.id).single();
  if(error||!data)throw Error(error?.message||"Personaje no encontrado.");
  setPj(data as Personaje);
  if(data.elecciones_pendientes>0){const o=await supabase.rpc("progresion_opciones",{p_personaje:data.id});if(o.error)throw Error(o.error.message);setOpciones((o.data||[]) as Opcion[]);}else setOpciones([]);
  setError("");
 }catch(e){setError(e instanceof Error?e.message:"No se pudo consultar tu progreso.");}finally{setCargando(false);}},[]);
 useEffect(()=>{void cargar();},[cargar]);
 async function aprender(h:Opcion){if(!pj||ocupado)return;setOcupado(true);setError("");setAviso("");try{
  const r=await supabase.rpc("progresion_escoger_habilidad",{p_personaje:pj.id,p_habilidad:h.id});if(r.error)throw Error(r.error.message);
  setAviso("Aprendiste "+h.nombre+". Ya está disponible en tus habilidades y en combate.");await cargar();
 }catch(e){setError(e instanceof Error?e.message:"No se pudo aprender.");}finally{setOcupado(false);}}
 const hist=pj?.habilidades_elegidas||[];
 const niveles=Array.from(new Set(hist.map(h=>h.nivel))).sort((a,b)=>a-b);
 return <main className="y-page"><Link href="/ficha/personaje" className="y-breadcrumb"><ArrowLeft size={14}/>VOLVER AL PERSONAJE</Link><section className="y-panel space-y-3"><p className="y-eyebrow">La senda del reencarnado</p><h1 className="text-3xl font-bold">Experiencia y árbol de habilidades</h1><p className="text-sm text-neutral-400">Cada nivel mejora tus atributos automáticamente y te permite elegir tres habilidades. La selección permanece ligada a este cuerpo.</p></section>
 {error&&<p role="alert" className="y-error">{error}</p>}{aviso&&<p role="status" className="rounded-xl border border-emerald-700 p-4 text-emerald-300">{aviso}</p>}
 {cargando?<p className="y-empty">Consultando experiencia…</p>:pj&&<div className="space-y-6">
  <section className="y-panel"><div className="flex flex-wrap items-center justify-between gap-4"><div><small className="y-eyebrow">{pj.raza}</small><h2 className="text-2xl font-bold">{pj.nombre}</h2></div><strong className="text-3xl text-amber-300">Nv. {pj.nivel}</strong></div>
   <p className="mt-3 text-sm text-neutral-300">{pj.exp_total.toLocaleString("es-DO")} XP acumulados {pj.nivel<100?"· Próximo nivel: "+experienciaParaNivel(pj.nivel+1).toLocaleString("es-DO")+" XP":"· Nivel máximo"}</p>
   <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-800"><div className="h-full bg-amber-500" style={{width:(pj.nivel>=100?100:100*Math.max(0,pj.exp_total-experienciaParaNivel(pj.nivel))/(experienciaParaNivel(pj.nivel+1)-experienciaParaNivel(pj.nivel)))+"%"}}/></div>
   <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(pj.atributos||{}).filter(([k])=>k!=="nivel").map(([k,v])=><div key={k} className="rounded-lg border border-neutral-800 p-3"><small className="block text-neutral-400">{k.replaceAll("_"," ")}</small><strong>{v}</strong></div>)}</div>
  </section>
  <section className="y-panel space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold"><Sparkles size={18} className="inline"/> Elección de nivel {pj.nivel_eleccion}</h2><p className="text-sm text-neutral-400">{pj.elecciones_pendientes?pj.elecciones_pendientes+" elecciones pendientes · "+Math.min(3,opciones.length)+" o más habilidades posibles":"Sube de nivel para desbloquear tus próximas elecciones."}</p></div><span className="rounded-lg border border-amber-700 px-3 py-2 text-amber-300">{opciones.length} / 20 opciones</span></div>
   {pj.elecciones_pendientes>0&&!opciones.length&&<p className="rounded-lg border border-amber-800 p-3 text-amber-300">No hay habilidades elegibles en La Forja. El GM debe crear habilidades compatibles con tu nivel y tus atributos.</p>}
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{opciones.map(h=><article key={h.id} className="rounded-xl border border-neutral-700 bg-neutral-950 p-4"><div className="mb-2 flex justify-between gap-2"><h3 className="font-bold">{h.nombre}</h3><span className="text-xs text-amber-400">{h.clase||"D"}</span></div><p className="min-h-12 text-sm text-neutral-400">{h.descripcion||"Habilidad creada en el Yunque."}</p><p className="mt-2 text-xs text-neutral-500">{h.requisitos?.nivel_minimo?"Nivel mínimo: "+h.requisitos.nivel_minimo:"Disponible desde el nivel 1"}</p><button disabled={ocupado} onClick={()=>void aprender(h)} className="mt-4 w-full rounded-lg border border-amber-700 bg-amber-950 px-3 py-2 text-sm text-amber-100 disabled:opacity-50"><Star size={15} className="inline"/> Elegir habilidad</button></article>)}</div>
  </section>
  <section className="y-panel space-y-4"><h2 className="text-xl font-bold"><BookOpen size={19} className="inline"/> Tu árbol de habilidades</h2><p className="text-sm text-neutral-400">Cada nivel añade una nueva rama al árbol. Lo que aprendes permanece en el inventario del personaje.</p>
   {!niveles.length?<p className="text-sm text-neutral-500">La constelación se irá formando con tus primeras elecciones.</p>:<div className="border-l-2 border-amber-800 pl-5 space-y-5">{niveles.map(n=><div key={n} className="relative"><div className="absolute -left-[30px] top-2 h-4 w-4 rounded-full border-2 border-amber-500 bg-black"/><h3 className="mb-2 font-bold text-amber-300">Nivel {n}</h3><div className="flex flex-wrap gap-2">{hist.filter(h=>h.nivel===n).map((h,i)=><span key={h.id+":"+i} className="rounded-lg border border-emerald-800 bg-emerald-950/30 px-3 py-2 text-sm"><Check size={14} className="inline"/> {h.nombre}</span>)}</div></div>)}</div>}
   {pj.elecciones_pendientes>0&&<p className="text-sm text-amber-300"><Lock size={14} className="inline"/> Falta escoger {pj.elecciones_pendientes} poderes para completar las ramas pendientes.</p>}
  </section>
 </div>}</main>;
}
