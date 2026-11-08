"use client";
import {useCallback,useEffect,useRef} from 'react';
import {supabase} from './supabase';
/** Una sola lectura en vuelo. false conserva el aviso mientras se resuelve una acción. */
export function useSincronizacionCombate(refrescar:(recuperar?:boolean)=>Promise<void|boolean>,combateId?:string,activo=true,onConexion?:(estado:string)=>void){
 const conexion=useRef(onConexion);conexion.current=onConexion;
 const ultima=useRef(refrescar),solicitud=useRef<()=>void>(()=>{});
 useEffect(()=>{ultima.current=refrescar;},[refrescar]);
 useEffect(()=>{
  if(!activo)return;
  let cerrado=false,leyendo=false,pendiente=false,recuperar=false,conectadoAntes=false;
  const revisiones=new Map<string,number>();
  conexion.current?.('conectando');
  let timer:ReturnType<typeof setTimeout>|undefined;
  let canal:ReturnType<typeof supabase.channel>|undefined;
  const programar=()=>{if(cerrado)return;pendiente=true;clearTimeout(timer);timer=setTimeout(()=>void ejecutar(),40);};
  const ejecutar=async()=>{
   if(cerrado||document.hidden||leyendo)return;
   pendiente=false;leyendo=true;
   try{const forzar=recuperar;recuperar=false;if(await ultima.current(forzar)===false){pendiente=true;recuperar=forzar;}}catch{/* La pantalla conserva el estado y muestra el error. */}
   finally{leyendo=false;if(pendiente&&!cerrado)timer=setTimeout(()=>void ejecutar(),250);}
  };
  solicitud.current=programar;
  void supabase.auth.getSession().then(({data})=>{
   if(cerrado||!data.session)return;
   canal=supabase.channel(`combate-${crypto.randomUUID()}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'combate_actualizaciones',filter:`user_id=eq.${data.session.user.id}`},payload=>{
     const fila=payload.new as {combate_id?:string;version?:number};
     if(fila.combate_id&&Number.isInteger(fila.version)){const previa=revisiones.get(fila.combate_id);if(previa!==undefined&&fila.version!<=previa)return;revisiones.set(fila.combate_id,fila.version!);}
     if(!combateId||fila.combate_id===combateId)programar();
    }).subscribe(estado=>{if(cerrado)return;if(estado==='SUBSCRIBED'){recuperar=conectadoAntes;conectadoAntes=true;conexion.current?.('conectado');programar();}else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(estado)){recuperar=true;conexion.current?.('reconectando');programar();}});
  });
  programar();
  const volver=()=>{recuperar=true;programar();};
  const respaldo=setInterval(programar,15000);
  window.addEventListener('focus',volver);window.addEventListener('online',volver);document.addEventListener('visibilitychange',volver);
  return()=>{cerrado=true;solicitud.current=()=>{};clearTimeout(timer);clearInterval(respaldo);window.removeEventListener('focus',volver);window.removeEventListener('online',volver);document.removeEventListener('visibilitychange',volver);if(canal)void supabase.removeChannel(canal);};
 },[combateId,activo]);
 return useCallback(()=>solicitud.current(),[]);
}
