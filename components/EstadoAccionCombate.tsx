"use client";
import {useEffect,useState} from 'react';
import type {EstadoAccion} from '../lib/accion-segura';
export default function EstadoAccionCombate({estado,revisando,onComprobar,onReintentar,conexion}:{estado:EstadoAccion;revisando:boolean;onComprobar:()=>void;onReintentar:()=>void;conexion?:string}){
 const [ahora,setAhora]=useState(Date.now());
 useEffect(()=>{if(!estado.solicitud)return;setAhora(Date.now());const t=setInterval(()=>setAhora(Date.now()),250);return()=>clearInterval(t);},[estado.solicitud?.action_id]);
 const segundos=estado.solicitud?Math.max(0,Math.floor((ahora-estado.solicitud.inicio)/1000)):0;
 return <>{conexion&&conexion!=='conectado'&&<p role="status" className="my-2 text-sm text-amber-200">{conexion==='conectando'?'Conectando con el combate…':'Reconectando… Recuperaremos el estado confirmado.'}</p>}{estado.solicitud&&<section role="status" aria-live="polite" className="my-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-700 bg-amber-950/30 p-3 text-sm"><strong>Procesando {estado.solicitud.etiqueta}…</strong>{segundos>=1&&<span>{segundos}s · La respuesta está tardando.</span>}{estado.mensaje&&<span>{estado.mensaje}</span>}{(segundos>=5||estado.fase==='incierta')&&<><button type="button" disabled={revisando} onClick={onComprobar}>Comprobar estado</button><button type="button" disabled={revisando} onClick={onReintentar}>Reintentar misma acción</button></>}</section>}</>;
}
