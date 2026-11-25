"use client";
import {useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase';
import {useTiempoReal} from './useTiempoReal';
import {leerFilaElemento,type ElementoGuardado} from './estados-biblioteca';

/** Elementos del grimorio. `vivo=false` lee una vez, sin canal de tiempo real (editores que se montan a menudo). */
export function useGrimorioElementos(vivo=true){
 const [elementos,setElementos]=useState<ElementoGuardado[]>([]),[cargado,setCargado]=useState(false),[error,setError]=useState('');
 const cargar=useCallback(async()=>{
  const r=await supabase.from('elementos_personalizados').select('id,definicion,color,updated_at').order('updated_at',{ascending:false});
  if(r.error){setError(r.error.message);setCargado(true);return;}
  setError('');setElementos((r.data||[]).map(leerFilaElemento).filter((x):x is ElementoGuardado=>!!x));setCargado(true);
 },[]);
 useEffect(()=>{const t=setTimeout(()=>void cargar(),0);return()=>clearTimeout(t);},[cargar]);
 useTiempoReal(cargar,vivo);
 return {elementos,cargado,error,recargar:cargar};
}
