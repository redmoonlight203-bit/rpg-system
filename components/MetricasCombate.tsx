"use client";
import {mensajeError} from '../lib/errores';
import {useState} from 'react';
import {resumenMetricas,exportarMetricas,limpiarMetricas} from '../lib/metricas-combate';
export default function MetricasCombate(){
 const [datos,setDatos]=useState<ReturnType<typeof resumenMetricas>>([]),[error,setError]=useState('');
 const nombres:Record<string,string>={confirmacion:'Confirmación completa','http.consulta_ligera':'Consulta ligera','http.jugador':'Petición del jugador','sql.commit':'Guardado SQL','servidor.auth_ms':'Autenticación','servidor.lectura_ms':'Lectura del servidor','servidor.motor_ms':'Cálculo de reglas','servidor.commit_ms':'Confirmación del servidor','servidor.total_ms':'Total en servidor'};
 async function descargar(){
  try{
   setError('');const r=await fetch('/api/version',{cache:'no-store'});if(!r.ok)throw Error('No se pudo identificar la versión.');
   const reporte=exportarMetricas(await r.json()),url=URL.createObjectURL(new Blob([JSON.stringify(reporte,null,2)],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download=`yugen-metricas-${reporte.fecha.slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){setError(mensajeError(e,'No se pudo exportar.'));}
 }
 return <details className="my-4 rounded-xl border border-neutral-700 p-3 text-xs" onToggle={e=>{if(e.currentTarget.open)setDatos(resumenMetricas());}}><summary>Rendimiento del combate · diagnóstico local</summary>
 <p className="my-2">Tiempos de esta pestaña en milisegundos. Reúne al menos 30 acciones correctas. Los tamaños corresponden al JSON descomprimido; los errores se cuentan por separado.</p>
 <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>setDatos(resumenMetricas())}>Actualizar mediciones</button><button type="button" onClick={()=>void descargar()}>Descargar informe</button><button type="button" onClick={()=>{limpiarMetricas();setDatos([]);}}>Empezar nueva medición</button></div>
 {error&&<p role="alert">{error}</p>}
 <div className="overflow-x-auto"><table className="mt-2 w-full text-left"><thead><tr><th>Tramo</th><th>Correctas</th><th>p50</th><th>p95</th><th>KB máx.</th><th>Errores</th></tr></thead><tbody>{datos.map(d=><tr key={d.tramo}><td>{nombres[d.tramo]||d.tramo}{!d.suficientes&&' · muestra insuficiente'}</td><td>{d.correctas}</td><td>{d.p50?.toFixed(1)??'—'}</td><td>{d.p95?.toFixed(1)??'—'}</td><td>{d.bytes_maximos===undefined?'—':(d.bytes_maximos/1000).toFixed(1)}</td><td>{d.errores}</td></tr>)}</tbody></table>{!datos.length&&<p>Todavía no hay acciones medidas.</p>}</div></details>;
}
