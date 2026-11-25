"use client";
import {useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase';
import {useTiempoReal} from './useTiempoReal';
import {leerFila,type EstadoGuardado} from './estados-biblioteca';

/** Estados del grimorio del GM, siempre al día. Si la tabla aún no existe, devuelve una lista vacía sin romper nada. */
/** `vivo=false` lee una vez (para editores que se montan muchas veces) sin abrir canal de tiempo real. */
export function useGrimorioEstados(vivo=true){
 const [estados,setEstados]=useState<EstadoGuardado[]>([]),[cargado,setCargado]=useState(false),[error,setError]=useState('');
 const cargar=useCallback(async()=>{
  const r=await supabase.from('estados_personalizados').select('id,definicion,color,updated_at').order('updated_at',{ascending:false});
  if(r.error){setError(r.error.message);setCargado(true);return;}
  setError('');setEstados((r.data||[]).map(leerFila).filter((x):x is EstadoGuardado=>!!x));setCargado(true);
 },[]);
 useEffect(()=>{const t=setTimeout(()=>void cargar(),0);return()=>clearTimeout(t);},[cargar]);
 useTiempoReal(cargar,vivo);
 return {estados,cargado,error,recargar:cargar};
}
