"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,BookOpen,Sparkles,TrendingUp} from "lucide-react";
import {supabase} from "../../../lib/supabase";
import {experienciaParaNivel} from "../../../lib/progresion";

type Ser={id:string;nombre:string;nivel:number;exp_total:number;elecciones_pendientes?:number;tipo:"jugador"|"creacion";malla?:boolean;maximo?:number};
export default function ExperienciaGM(){
 const [seres,setSeres]=useState<Ser[]>([]),[cantidades,setCantidades]=useState<Record<string,string>>({}),[error,setError]=useState(""),[aviso,setAviso]=useState(""),[ocupado,setOcupado]=useState(false),[cargando,setCargando]=useState(true);
 async function cargar(){setCargando(true);try{
  const [jugadores,creaciones]=await Promise.all([
   supabase.from("personajes").select("id,nombre,nivel,exp_total,elecciones_pendientes").order("nombre"),
   supabase.from("forja_maestra").select("id,nombre,nivel,exp_total,nivel_maximo,es_grupo").eq("tipo_creacion","personaje").eq("estado","aprobado").order("nombre")
  ]);
  if(jugadores.error||creaciones.error)throw Error(jugadores.error?.message||creaciones.error?.message);
  setSeres([...(jugadores.data||[]).map(x=>({id:String(x.id),nombre:x.nombre,nivel:x.nivel||1,exp_total:x.exp_total||0,elecciones_pendientes:x.elecciones_pendientes||0,tipo:"jugador" as const})),...(creaciones.data||[]).map(x=>({id:x.id,nombre:x.nombre,nivel:x.nivel||1,exp_total:x.exp_total||0,malla:!!x.es_grupo,maximo:x.nivel_maximo||20,tipo:"creacion" as const}))]);
 }catch(e){setError(e instanceof Error?e.message:"No se pudieron cargar los seres vivos.");}finally{setCargando(false);}}
 useEffect(()=>{void cargar();},[]);
 async function otorgar(s:Ser){const key=s.tipo+":"+s.id,valor=Number(cantidades[key]);if(!Number.isInteger(valor)||valor<1||valor>1000000){setError("La experiencia debe ser un entero de 1 a 1 000 000.");return;}
  setOcupado(true);setError("");setAviso("");try{
   const {data,error}=await supabase.rpc(s.tipo==="jugador"?"progresion_dar_experiencia":"progresion_dar_experiencia_creacion",s.tipo==="jugador"?{p_personaje:s.id,p_cantidad:valor}:{p_forja:s.id,p_cantidad:valor});
   if(error)throw Error(error.message);
   setAviso(s.nombre+" recibió "+valor+" XP. Nivel actual: "+data.nivel+(data.elecciones_anadidas?" · Nuevas elecciones: "+data.elecciones_anadidas:""));
   await cargar();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo otorgar la experiencia.");}finally{setOcupado(false);}
 }
 return <main className="min-h-screen bg-black px-4 py-8 text-neutral-100 sm:px-8"><div className="mx-auto max-w-5xl space-y-6">
  <Link href="/dm/combate" className="inline-flex items-center gap-2 text-sm text-amber-400"><ArrowLeft size={15}/>Volver al combate</Link>
  <header className="rounded-2xl border border-amber-800/40 bg-neutral-950 p-6"><p className="text-xs uppercase tracking-widest text-amber-400">Kuroi · Progresión</p><h1 className="mt-2 text-3xl font-bold">Experiencia y niveles</h1><p className="mt-3 text-sm text-neutral-400">Concede experiencia tras combates, misiones o eventos. Las estadísticas de los jugadores crecen automáticamente; cada nivel añade tres elecciones de habilidades. Los monstruos pueden progresar y su nivel también se puede definir al invocarlos.</p></header>
  {error&&<p role="alert" className="rounded-lg border border-red-800 p-3 text-red-300">{error}</p>}{aviso&&<p role="status" className="rounded-lg border border-emerald-800 p-3 text-emerald-300">{aviso}</p>}
  <div className="flex flex-wrap justify-between gap-3"><p className="text-sm text-neutral-400">{seres.length} seres registrados · niveles del 1 al 100</p><Link href="/dm/forja" className="text-sm text-amber-300">Crear especies y habilidades en el Yunque</Link></div>
  {cargando?<p>Cargando progresión…</p>:!seres.length?<p className="rounded-xl border border-neutral-800 p-5">No hay seres registrados. Crea un personaje o monstruo en el Yunque.</p>:<div className="grid gap-4 sm:grid-cols-2">{seres.map(s=>{
   const key=s.tipo+":"+s.id,proximo=experienciaParaNivel(s.nivel+1),tope=s.tipo==="creacion"?(s.maximo||100):100;
   return <article key={key} className="rounded-xl border border-neutral-800 bg-neutral-950 p-5"><div className="mb-3 flex items-start justify-between gap-2"><div><p className="text-xs uppercase tracking-wider text-amber-400">{s.tipo==="jugador"?"Reencarnado":s.malla?"Monstruo / malla":"Creación única"}</p><h2 className="text-xl font-semibold">{s.nombre}</h2></div><span className="rounded bg-amber-950 px-3 py-1 text-amber-200">Nv. {s.nivel}</span></div>
    <p className="text-sm text-neutral-400">{s.exp_total.toLocaleString("es-DO")} XP acumulados {s.nivel<Math.min(100,tope)?"· Próximo nivel: "+proximo.toLocaleString("es-DO"):"· Nivel máximo"}</p>
    {s.tipo==="jugador"&&!!s.elecciones_pendientes&&<p className="mt-2 text-sm text-cyan-300"><Sparkles size={14} className="inline"/> {s.elecciones_pendientes} habilidades por elegir</p>}
    {s.malla&&<p className="mt-2 text-xs text-neutral-500">Al entrar al combate puedes fijar un nivel entre 1 y {tope}.</p>}
    <div className="mt-4 flex gap-2"><input aria-label={"XP para "+s.nombre} type="number" min={1} max={1000000} step={1} placeholder="XP a otorgar" value={cantidades[key]||""} onChange={e=>setCantidades(p=>({...p,[key]:e.target.value}))} className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm"/><button disabled={ocupado} onClick={()=>void otorgar(s)} className="inline-flex items-center gap-2 rounded-lg border border-amber-700 px-3 py-2 text-sm text-amber-100 disabled:opacity-50"><TrendingUp size={16}/>Dar XP</button></div>
   </article>;})}</div>}
  <p className="flex gap-2 text-xs text-neutral-500"><BookOpen size={16}/>La progresión es una regla mecánica configurable en código; los rangos F–KUROI siguen calculándose por el poder real, no por el nivel.</p>
 </div></main>;
}
