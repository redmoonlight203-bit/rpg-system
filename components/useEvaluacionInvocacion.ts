'use client';
import { useEffect, useState } from 'react';
import type { evaluarInvocacion, EvaluacionInvocacion } from '../lib/invocaciones';

export function useEvaluacionInvocacion(entrada:Parameters<typeof evaluarInvocacion>|null) {
  const firma=entrada ? JSON.stringify(entrada) : '';
  const [resultado,setResultado]=useState<{firma:string; valor:EvaluacionInvocacion}>();
  useEffect(()=>{
    if(!firma)return;
    let tarea:Worker|undefined;
    const fallo=()=>setResultado({firma,valor:{valida:false,clase:'F',puntuacion:0,presupuestoMaximo:0,habilidadesElegibles:[],errores:['Falló la evaluación de la invocación.']}});
    const demora=window.setTimeout(()=>{
      try {
        tarea=new Worker(new URL('./invocacion.worker.ts',import.meta.url));
        tarea.onmessage=({data})=>{tarea?.terminate();setResultado({firma,valor:data});};
        tarea.onerror=()=>{tarea?.terminate();fallo();};
        tarea.postMessage(JSON.parse(firma));
      } catch { fallo(); }
    },200);
    return ()=>{window.clearTimeout(demora);tarea?.terminate();};
  },[firma]);
  return resultado?.firma===firma ? resultado.valor : null;
}

/** Evaluación puntual (sin React) en un worker: la usa la pantalla del GM para validar solicitudes. */
export function evaluarInvocacionEnWorker(entrada:Parameters<typeof evaluarInvocacion>,limite=30000):Promise<EvaluacionInvocacion>{
  return new Promise((resolver,rechazar)=>{
    let tarea:Worker;
    try{tarea=new Worker(new URL('./invocacion.worker.ts',import.meta.url));}catch{rechazar(Error('No se pudo evaluar la invocación.'));return;}
    const reloj=window.setTimeout(()=>{tarea.terminate();rechazar(Error('La evaluación de la invocación tardó demasiado.'));},limite);
    tarea.onmessage=({data})=>{window.clearTimeout(reloj);tarea.terminate();resolver(data);};
    tarea.onerror=()=>{window.clearTimeout(reloj);tarea.terminate();rechazar(Error('Falló la evaluación de la invocación.'));};
    tarea.postMessage(JSON.parse(JSON.stringify(entrada)));
  });
}
