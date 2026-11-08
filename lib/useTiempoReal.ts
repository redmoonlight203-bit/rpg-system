"use client";
import {useEffect,useRef} from 'react';
import {supabase} from './supabase';
/** Signals contain no game data. Every refresh uses the viewer's normal permissions. */
export function useTiempoReal(refrescar:()=>void|Promise<void>,activo=true){
 const ultima=useRef(refrescar);
 useEffect(()=>{ultima.current=refrescar;},[refrescar]);
 useEffect(()=>{
  if(!activo)return;
  let cerrado=false,leyendo=false,pendiente=false;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const ejecutar=async()=>{
   if(cerrado||document.hidden)return;
   if(leyendo){pendiente=true;return;}
   leyendo=true;
   try{await ultima.current();}catch{/* La pantalla presenta sus errores y el respaldo reintenta. */}
   finally{leyendo=false;if(pendiente&&!cerrado){pendiente=false;programar();}}
  };
  const programar=()=>{clearTimeout(timer);timer=setTimeout(()=>void ejecutar(),120);};
  const canal=supabase.channel(`actualizacion-${crypto.randomUUID()}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'avisos_actualizacion'},programar)
   .subscribe(estado=>{if(estado==='SUBSCRIBED')programar();});
  const respaldo=setInterval(programar,15000);
  window.addEventListener('focus',programar);window.addEventListener('online',programar);
  document.addEventListener('visibilitychange',programar);
  return()=>{cerrado=true;clearTimeout(timer);clearInterval(respaldo);window.removeEventListener('focus',programar);window.removeEventListener('online',programar);document.removeEventListener('visibilitychange',programar);void supabase.removeChannel(canal);};
 },[activo]);
}
