"use client";

import {useState} from "react";
import {supabase} from "../lib/supabase";
import {publicarDataImage} from "../lib/imagenes-storage";

type Retrato = {id:string;nombre:string;imagen_url:string|null};

/** Herramienta de GM para la migración de retratos históricos ya autorizada. */
export default function MigradorRetratos({onMigrado}:{onMigrado:()=>void|Promise<void>}) {
  const [ocupado,setOcupado]=useState(false);
  const [mensaje,setMensaje]=useState("");
  const [links,setLinks]=useState<{nombre:string;url:string}[]>([]);

  async function migrar() {
    if(ocupado)return;
    setOcupado(true);setMensaje("Buscando retratos antiguos…");setLinks([]);
    let migrados=0, errores:string[]=[];
    try {
      const {data,error}=await supabase.from("forja_maestra")
        .select("id,nombre,imagen_url").eq("tipo_creacion","personaje").limit(500);
      if(error)throw error;
      const pendientes=(data as Retrato[]||[]).filter(x=>x.imagen_url?.startsWith("data:image/"));
      if(!pendientes.length){setMensaje("No quedan retratos incrustados en las fichas de personajes.");return;}
      for(const retrato of pendientes) {
        try {
          const anterior=retrato.imagen_url!;
          setMensaje(`Publicando ${retrato.nombre} (${migrados+1}/${pendientes.length})…`);
          const url=await publicarDataImage(anterior);
          // No sobrescribir una edición concurrente hecha desde otra pantalla.
          const actual=await supabase.from("forja_maestra").select("imagen_url").eq("id",retrato.id).single();
          if(actual.error||actual.data.imagen_url!==anterior)throw Error("La imagen cambió durante la migración.");
          const cambio=await supabase.from("forja_maestra")
            .update({imagen_url:url}).eq("id",retrato.id)
            .like("imagen_url","data:image/%").select("id").single();
          if(cambio.error||!cambio.data)throw Error(cambio.error?.message||"La ficha no confirmó la sustitución.");
          migrados++;
          setLinks(prev=>[...prev,{nombre:retrato.nombre,url}]);
          await onMigrado();
        } catch(e) {
          errores.push(`${retrato.nombre}: ${e instanceof Error?e.message:"No se pudo migrar"}`);
        }
      }
      setMensaje(`Retratos migrados: ${migrados}/${pendientes.length}.${errores.length?" Fallos: "+errores.join(" · "):""}`);
    } catch(e) {
      setMensaje(e instanceof Error?e.message:"Error al buscar retratos.");
    } finally {
      setOcupado(false);
    }
  }

  return <section className="rounded-xl border border-orange-900/40 bg-neutral-900/50 p-4 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold">Retratos en Storage</h2>
      <p className="text-xs text-neutral-400">Convierte retratos de personajes incrustados a enlaces públicos. No toca combates ni respaldos.</p></div>
      <button type="button" disabled={ocupado} onClick={()=>void migrar()}
        className="rounded-lg border border-orange-700 bg-orange-950 px-4 py-2 text-sm disabled:opacity-50">
        {ocupado?"Migrando retratos…":"Migrar retratos existentes"}
      </button>
    </div>
    {mensaje&&<p role="status" aria-live="polite" className="text-sm text-amber-200">{mensaje}</p>}
    {links.length>0&&<p className="text-xs text-neutral-300">
      Verificados: {links.map((l,i)=><span key={l.url}>{i?", ":""}<a href={l.url} target="_blank" rel="noreferrer" className="underline">{l.nombre}</a></span>)}
    </p>}
  </section>;
}
