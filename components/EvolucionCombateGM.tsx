"use client";
// Control del GM en el encuentro: evolucionar a un combatiente (mismo turno, misma ficha) o, en la preparación,
// recrear a un personaje en una etapa histórica (encuentro aislado de práctica, sin tocar al personaje real).
import {useState} from 'react';
import {supabase} from '../lib/supabase';
import {MODOS_TRANSICION,type EtapaEvolutiva,type LineaEvolutiva,type RegistroEtapa,type TransicionEvolutiva} from '../lib/evolucion';
import type {Combatiente} from '../lib/combate';

type Datos={linea:LineaEvolutiva;actual:string;historial:RegistroEtapa[]};
export default function EvolucionCombateGM({m,fase,lineaPlantilla,deshabilitado,onEvolucionar,onHistorica}:{
 m:Combatiente;fase:'preparacion'|'en_curso'|'finalizado';lineaPlantilla?:LineaEvolutiva|null;deshabilitado:boolean;
 onEvolucionar:(etapa:EtapaEvolutiva,t:TransicionEvolutiva)=>void;onHistorica:(etapa:EtapaEvolutiva)=>void;
}){
 const [datos,setDatos]=useState<Datos|null>(null);
 const [error,setError]=useState('');
 async function abrir(){
  if(datos)return;
  if(m.personaje_id){
   const r=await supabase.rpc('evolucion_vista',{p_personaje:m.personaje_id});
   if(r.error){setError(r.error.message);return;}
   if(r.data?.gm)setDatos({linea:r.data.linea,actual:r.data.etapa_actual,historial:r.data.historial});
   else setError('Este personaje no tiene línea evolutiva.');
  }else if(lineaPlantilla)setDatos({linea:lineaPlantilla,actual:lineaPlantilla.inicial,historial:[]});
  else setError('Esta criatura no tiene línea evolutiva.');
 }
 if(!m.personaje_id&&!lineaPlantilla)return null;
 if(m.etapa_historica)return <p className="battle-owner-tag">Etapa histórica · {m.etapa_historica.nombre} (práctica)</p>;
 const actual=m.evolucion?.etapa_id||datos?.actual;
 const salidas=datos?datos.linea.transiciones.filter(t=>t.desde===actual):[];
 return <details className="battle-size" onToggle={e=>{if((e.target as HTMLDetailsElement).open)void abrir();}}>
  <summary>Evolución{m.evolucion?` · ${m.evolucion.nombre}`:''}</summary>
  {error&&<p className="text-xs text-red-300">{error}</p>}
  {datos&&fase!=='finalizado'&&<div className="space-y-2 text-sm">
   {!salidas.length&&<p className="text-xs text-neutral-400">No hay evoluciones desde su etapa actual.</p>}
   {salidas.map(t=>{const destino=datos.linea.etapas.find(e=>e.id===t.hasta)!;
    return <button key={t.id} type="button" className="battle-button" disabled={deshabilitado} title={MODOS_TRANSICION[t.modo]} onClick={()=>onEvolucionar(destino,t)}>Evolucionar → {destino.nombre}</button>;})}
   <p className="text-xs text-neutral-400">Conserva su turno, sus heridas y sus enfriamientos. En un encuentro real se guarda al finalizar; en práctica, no.</p>
  </div>}
  {datos&&fase==='preparacion'&&m.personaje_id&&datos.historial.length>1&&<div className="space-y-1 text-sm">
   <p className="text-xs text-neutral-400">Encuentro histórico: usa la ficha de una etapa pasada. El encuentro pasa a práctica, sin recompensas y sin tocar al personaje real.</p>
   {datos.historial.filter(h=>h.etapa_id!==datos.actual).map(h=><button key={h.id} type="button" className="battle-button" disabled={deshabilitado} onClick={()=>onHistorica(h.snapshot)}>Recrear: {h.snapshot.nombre}</button>)}
  </div>}
 </details>;
}
