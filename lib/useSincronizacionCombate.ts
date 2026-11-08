"use client";
import {useCallback,useEffect,useRef} from 'react';
import {supabase} from './supabase';
/** Una sola lectura en vuelo. false conserva el aviso mientras se resuelve una acción. */
export function useSincronizacionCombate(refrescar:()=>Promise<void|boolean>,combateId?:string,activo=true){
 const ultima=useRef(refrescar),solicitud=useRef<()=>void>(()=>{});
 useEffect(()=>{ultima.current=refrescar;},[refrescar]);
 useEffect(()=>{
  if(!activo)return;
  let cerrado=false,leyendo=false,pendiente=false;
  let timer:ReturnType<typeof setTimeout>|undefined;
  let canal:ReturnType<typeof supabase.channel>|undefined;
  const programar=()=>{if(cerrado)return;pendiente=true;clearTimeout(timer);timer=setTimeout(()=>void ejecutar(),40);};
  const ejecutar=async()=>{
   if(cerrado||document.hidden||leyendo)return;
   pendiente=false;leyendo=true;
   try{if(await ultima.current()===false)pendiente=true;}catch{/* La pantalla conserva el estado y muestra el error. */}
   finally{leyendo=false;if(pendiente&&!cerrado)timer=setTimeout(()=>void ejecutar(),250);}
  };
  solicitud.current=programar;
  void supabase.auth.getSession().then(({data})=>{
   if(cerrado||!data.session)return;
   canal=supabase.channel(`combate-${crypto.randomUUID()}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'combate_actualizaciones',filter:`user_id=eq.${data.session.user.id}`},payload=>{
     const fila=payload.new as {combate_id?:string};if(!combateId||fila.combate_id===combateId)programar();
    }).subscribe(estado=>{if(estado==='SUBSCRIBED')programar();});
  });
  programar();
  const respaldo=setInterval(programar,15000);
  window.addEventListener('focus',programar);window.addEventListener('online',programar);document.addEventListener('visibilitychange',programar);
  return()=>{cerrado=true;solicitud.current=()=>{};clearTimeout(timer);clearInterval(respaldo);window.removeEventListener('focus',programar);window.removeEventListener('online',programar);document.removeEventListener('visibilitychange',programar);if(canal)void supabase.removeChannel(canal);};
 },[combateId,activo]);
 return useCallback(()=>solicitud.current(),[]);
}
