"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "../../lib/supabase";
import {configuracionBase,escribirConfiguracion,leerConfiguracion,type AlmacenLocal,type Codice,type ConfiguracionCodices,type OrigenConfiguracion} from "../../lib/codices";

const CLAVE_LOCAL="yugen.codices.v1";
const local:AlmacenLocal={
  leer:()=>{try{return window.localStorage.getItem(CLAVE_LOCAL);}catch{return null;}},
  escribir:texto=>{try{window.localStorage.setItem(CLAVE_LOCAL,texto);}catch{/* almacenamiento bloqueado */}},
};

export type EstadoConfigCodices={
  config:ConfiguracionCodices;
  origen:OrigenConfiguracion;
  cargando:boolean;
  guardando:boolean;
  error:string;
  avisos:string[];
  guardar:(config:ConfiguracionCodices)=>Promise<boolean>;
  verComo:(id:string,codice:Codice|null)=>Promise<boolean>;
  recargar:()=>Promise<void>;
};

/** Configuración de los códices compartida por todo el GM (tabla forja_codices) con copia local. */
export function useConfigCodices():EstadoConfigCodices{
  const [config,setConfig]=useState<ConfiguracionCodices>(()=>configuracionBase());
  const [origen,setOrigen]=useState<OrigenConfiguracion>("base");
  const [cargando,setCargando]=useState(true);
  const [guardando,setGuardando]=useState(false);
  const [error,setError]=useState("");
  const [avisos,setAvisos]=useState<string[]>([]);
  const recargar=useCallback(async()=>{
    setCargando(true);
    const r=await leerConfiguracion(async()=>await supabase.from("forja_codices").select("config").eq("id",1).maybeSingle(),local);
    setConfig(r.config);setOrigen(r.origen);setAvisos(r.avisos);setError(r.error||"");setCargando(false);
  },[]);
  useEffect(()=>{
    let vivo=true;
    void leerConfiguracion(async()=>await supabase.from("forja_codices").select("config").eq("id",1).maybeSingle(),local).then(r=>{
      if(!vivo)return;
      setConfig(r.config);setOrigen(r.origen);setAvisos(r.avisos);setError(r.error||"");setCargando(false);
    });
    return ()=>{vivo=false;};
  },[]);
  const guardar=useCallback(async(nueva:ConfiguracionCodices)=>{
    setGuardando(true);
    const r=await escribirConfiguracion(nueva,async c=>await supabase.rpc("codices_guardar",{p_config:c}),local);
    setConfig(nueva);setOrigen(r.origen);setError(r.error||"");setGuardando(false);
    return !r.error;
  },[]);
  const verComo=useCallback(async(id:string,codice:Codice|null)=>{
    const porCreacion={...config.porCreacion};
    if(codice)porCreacion[id]=codice;else delete porCreacion[id];
    return guardar({...config,porCreacion});
  },[config,guardar]);
  return {config,origen,cargando,guardando,error,avisos,guardar,verComo,recargar};
}
