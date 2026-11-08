"use client";
import {useState} from 'react';
import {resumenMetricas} from '../lib/metricas-combate';
export default function MetricasCombate(){
 const [datos,setDatos]=useState<ReturnType<typeof resumenMetricas>>([]);
 const nombres:Record<string,string>={confirmacion:'Confirmación completa','sql.commit':'Guardado SQL','servidor.auth_ms':'Autenticación','servidor.lectura_ms':'Lectura del servidor','servidor.motor_ms':'Cálculo de reglas','servidor.commit_ms':'Confirmación del servidor','servidor.total_ms':'Total en servidor'};
 return <details className="my-4 rounded-xl border border-neutral-700 p-3 text-xs" onToggle={e=>{if(e.currentTarget.open)setDatos(resumenMetricas());}}><summary>Rendimiento del combate · diagnóstico local</summary><p className="my-2">Tiempos de esta pestaña, en milisegundos. El p95 necesita suficientes muestras; no es una garantía del tiempo de respuesta.</p><button type="button" onClick={()=>setDatos(resumenMetricas())}>Actualizar mediciones</button><div className="overflow-x-auto"><table className="mt-2 w-full text-left"><thead><tr><th>Tramo</th><th>Muestras</th><th>p50</th><th>p95</th><th>Errores</th></tr></thead><tbody>{datos.map(d=><tr key={d.tramo}><td>{nombres[d.tramo]||d.tramo}</td><td>{d.muestras}</td><td>{d.p50?.toFixed(1)}</td><td>{d.p95?.toFixed(1)}</td><td>{d.errores}</td></tr>)}</tbody></table>{!datos.length&&<p>Todavía no hay acciones medidas.</p>}</div></details>;
}
