"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AccionSegura,type ComandoAccion,type EstadoAccion,type SolicitudAccion} from './accion-segura';
import {registrarMetrica} from './metricas-combate';
export function useAccionSegura<T>({clave,enviar,consultar,descartar,recuperar,onRecuperado}:{clave:string;enviar:(c:ComandoAccion)=>Promise<T>;consultar:(id:string)=>Promise<{confirmada?:boolean}>;descartar?:(id:string)=>Promise<{confirmada?:boolean;descartada?:boolean}>;recuperar:()=>Promise<T>;onRecuperado:(data:T)=>void}){
 const ultima=useRef(onRecuperado),claveActual=useRef(clave);ultima.current=onRecuperado;claveActual.current=clave;
 const control=useMemo(()=>new AccionSegura<T>({enviar:async c=>{const inicio=performance.now();try{const r=await enviar(c);registrarMetrica('confirmacion',performance.now()-inicio,true,JSON.stringify(c).length);return r;}catch(e){registrarMetrica('confirmacion',performance.now()-inicio,false);throw e;}},consultar,descartar,recuperar,
  cargar:()=>{try{return JSON.parse(sessionStorage.getItem('yugen:accion:'+clave)||'null') as SolicitudAccion|null;}catch{return null;}},
  guardar:s=>{if(s)sessionStorage.setItem('yugen:accion:'+clave,JSON.stringify(s));else sessionStorage.removeItem('yugen:accion:'+clave);}
 }),[clave]);
 const [estado,setEstado]=useState<EstadoAccion>({fase:'reposo'}),[revisando,setRevisando]=useState(false);
 useEffect(()=>{setEstado(control.estado);const quitar=control.escuchar(setEstado);control.restaurar();return quitar;},[control]);
 const ejecutar=useCallback((comando:ComandoAccion,etiqueta?:string)=>control.ejecutar(comando,etiqueta),[control]);
 const revisar=useCallback(async(modo:'comprobar'|'reintentar'|'descartar'='comprobar')=>{setRevisando(true);try{const r=modo==='descartar'?await control.descartar():modo==='reintentar'?await control.reintentar():await control.comprobar();if(r!==undefined&&claveActual.current===clave)ultima.current(r);}catch{/* El estado pendiente conserva el motivo y permite recuperar. */}finally{setRevisando(false);}},[control,clave]);
 return {ejecutar,estado,revisando,pendiente:estado.fase!=='reposo',comprobar:()=>void revisar(),reintentar:()=>void revisar('reintentar'),descartar:descartar?()=>void revisar('descartar'):undefined};
}
