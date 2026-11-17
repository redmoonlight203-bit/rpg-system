"use client";
// Ruta de desarrollo del lienzo del Yunque: monta el taller con un borrador vacío y el catálogo de la Forja.
// Se elimina en la Tarea 11, cuando la pestaña «El yunque» de /dm/forja pase a montar el taller.
import {useEffect,useState} from "react";
import TallerYunque,{type ContextoTaller} from "../../../../components/yunque/TallerYunque";
import {supabase} from "../../../../lib/supabase";
import {vacio,type Borrador,type Creacion} from "../../../../lib/yunque-borrador";

export default function TallerDePruebas(){
 const [b,setB]=useState<Borrador>(vacio);
 const [ctx,setCtx]=useState<ContextoTaller|null>(null);
 const [error,setError]=useState("");
 useEffect(()=>{
  let vivo=true;
  void (async()=>{
   const [c,a,f]=await Promise.all([supabase.from("categorias_forja").select("*").order("created_at"),supabase.from("config_estadisticas").select("*"),supabase.from("forja_maestra").select("*").order("created_at",{ascending:false})]);
   if(!vivo)return;
   if(c.error||a.error||f.error)setError("No se pudo cargar el catálogo de la Forja. El lienzo funciona igual, sin familias.");
   setCtx({categorias:c.data||[],atributos:a.data||[],creaciones:(f.data||[]) as Creacion[]});
  })();
  return ()=>{vivo=false;};
 },[]);
 return <main className="yq-pagina">
  {ctx?<TallerYunque b={b} setB={setB} ctx={ctx} guardando={false} error={error}
   onGuardar={()=>setError("Este es el taller de pruebas: aquí no se guarda nada. Forja desde La Forja.")}/>
   :<p className="yq-cargando" role="status">Kuroi enciende la forja…</p>}
 </main>;
}
