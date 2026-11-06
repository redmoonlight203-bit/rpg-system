"use client";
import {useEffect,useMemo,useState} from "react";
import {Sparkles,X,Eye,Lightbulb,MessageCircle,Send} from "lucide-react";

type Contexto={nombre:string;tipo:string;clasificacion:string;descripcion:string;efectos:number;reglas:number;pasivas:number;requisitos:boolean;guardando:boolean};
export default function NavyCompanera({contexto,activo}:{contexto:Contexto;activo:boolean}){
 const [abierta,setAbierta]=useState(false);
 const [habilitada,setHabilitada]=useState(true);
 const [mensaje,setMensaje]=useState("");
 const [historial,setHistorial]=useState<{autor:"navy"|"usuario";texto:string}[]>([]);
 const [silenciar,setSilenciar]=useState(false);
 const sugerencias=useMemo(()=>{
  const s:string[]=[];
  if(!contexto.nombre.trim())s.push("Ponle un nombre a tu creación para reconocerla en La Creación.");
  if(!contexto.clasificacion)s.push("Selecciona una subcategoría: determina los atributos y opciones disponibles.");
  if(!contexto.descripcion.trim())s.push("Añade una descripción clara. Servirá para explicar esta creación a los jugadores.");
  if(["habilidad","pasiva"].includes(contexto.tipo)&&contexto.efectos+contexto.reglas+contexto.pasivas===0)s.push("Todavía no hay comportamiento mecánico. Puedes añadir acciones, pasivas o reglas.");
  if(contexto.reglas>0)s.push("Revisa los disparadores y condiciones de tus reglas especiales antes de guardar.");
  if(!contexto.requisitos&&["habilidad","pasiva"].includes(contexto.tipo))s.push("Si este poder es exclusivo de una raza o exige estadísticas mínimas, añade requisitos de uso.");
  return s;
 },[contexto.nombre,contexto.clasificacion,contexto.descripcion,contexto.tipo,contexto.efectos,contexto.reglas,contexto.pasivas,contexto.requisitos]);
 useEffect(()=>{try{const v=localStorage.getItem("yugen-navy-companera");if(v==="off")setHabilitada(false);}catch{}},[]);
 function cambiarHabilitada(){setHabilitada(v=>{try{localStorage.setItem("yugen-navy-companera",v?"off":"on");}catch{}return !v;});}
 function responder(){const q=mensaje.trim();if(!q)return;const r=/requisit|raza/i.test(q)?"Los requisitos se configuran en Presentación e historia. Puedes restringir por raza o estadísticas.":/regla|condici|evento/i.test(q)?"En Reglas especiales puedes conectar eventos, condiciones y efectos. Revisa sus disparadores antes de guardar.":/dado|azar|tirada/i.test(q)?"En el editor de dados puedes configurar tiradas y resultados por cara.":sugerencias[0]||"Tu creación tiene los campos básicos. Revisa los efectos y pruébala antes de guardar.";setHistorial(v=>[...v,{autor:"usuario",texto:q},{autor:"navy",texto:r}]);setMensaje("");}
 if(!activo)return null;
 return <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 text-neutral-100">
  {abierta&&<section aria-label="Navy, compañera del Yunque" className="w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-sky-500/40 bg-neutral-950 shadow-2xl shadow-sky-950/40">
   <header className="flex items-center justify-between border-b border-sky-900/50 bg-sky-950/40 px-4 py-3"><span className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-sky-300"/> Navy · Compañera</span><button aria-label="Cerrar Navy" onClick={()=>setAbierta(false)}><X className="h-4 w-4"/></button></header>
   <div className="max-h-72 space-y-3 overflow-y-auto p-4 text-sm">
    <p className="flex items-center gap-2 text-sky-200"><Eye className="h-4 w-4"/> Viendo: {contexto.nombre||"Nueva creación"} ({contexto.tipo})</p>
    <p className="text-xs text-neutral-400">Puedo ver los campos del editor y ofrecer orientación. Las respuestas actuales son locales; la conexión con una IA todavía no está configurada.</p>
    {habilitada&&!silenciar&&sugerencias.slice(0,3).map((s,i)=><p key={i} className="flex gap-2 rounded-lg bg-sky-950/30 p-2"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"/>{s}</p>)}
    {historial.map((h,i)=><p key={i} className={h.autor==="usuario"?"rounded-lg bg-neutral-800 p-2":"rounded-lg bg-sky-950/30 p-2"}><strong>{h.autor==="usuario"?"Tú":"Navy"}: </strong>{h.texto}</p>)}
   </div>
   <form onSubmit={e=>{e.preventDefault();responder();}} className="flex gap-2 border-t border-neutral-800 p-3"><input aria-label="Preguntar a Navy" className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm" value={mensaje} onChange={e=>setMensaje(e.target.value)} placeholder="¿Cómo creo una regla?"/><button type="submit" aria-label="Enviar" className="rounded-lg bg-sky-800 p-2"><Send className="h-4 w-4"/></button></form>
   <footer className="flex items-center justify-between border-t border-neutral-800 px-3 py-2 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={!silenciar} onChange={e=>setSilenciar(!e.target.checked)}/> Sugerencias</label><button onClick={cambiarHabilitada}>{habilitada?"Desactivar compañera":"Activar compañera"}</button></footer>
  </section>}
  <button type="button" onClick={()=>setAbierta(v=>!v)} aria-label="Abrir asistente Navy" title="Navy, tu compañera del Yunque" className="relative flex h-14 w-14 items-center justify-center rounded-full border border-sky-300/70 bg-sky-900/90 shadow-lg shadow-sky-500/30 transition hover:scale-105"><span aria-hidden className="absolute -left-2 h-6 w-4 rotate-[-30deg] rounded-full border border-sky-200/70 bg-sky-200/40"/><span aria-hidden className="absolute -right-2 h-6 w-4 rotate-[30deg] rounded-full border border-sky-200/70 bg-sky-200/40"/><Sparkles className="relative h-7 w-7 text-sky-100"/>{habilitada&&sugerencias.length>0&&!abierta&&<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">{sugerencias.length}</span>}</button>
 </div>;
}
