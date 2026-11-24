'use client';
// Clase de una etapa con el método vigente de YUGEN: la misma simulación de balance que la ficha completa.
import {useMemo} from 'react';
import {useBalanceBorrador} from './PruebaBalance';
import {habilidadesEtapa,type EtapaEvolutiva} from '../../lib/evolucion';
import type {Borrador} from '../../lib/yunque-borrador';
import type {ContextoTaller} from './contexto';

export default function ClaseEtapa({b,ctx,etapa,registrar}:{b:Borrador;ctx:ContextoTaller;etapa:EtapaEvolutiva;registrar:(clase:string)=>void}){
 const borrador=useMemo<Borrador>(()=>({...b,malla:false,rangos:{},stats:{...b.stats,...etapa.stats},habilidades:habilidadesEtapa(etapa),pasivas:etapa.pasivas,reglas:[...b.reglas,...(etapa.reglas||[])],linea:null}),[b,etapa]);
 const balance=useBalanceBorrador(borrador,ctx);
 const clase=balance.informe?.clase;
 return <span className="evo-acciones" style={{alignItems:'center'}}>
  <span className="evo-sello is-actual" aria-live="polite">{clase?`Clase ${clase}`:balance.error?'Clase no disponible':'Calculando clase…'}</span>
  {clase&&clase!==etapa.clase&&<button type="button" className="evo-boton" onClick={()=>registrar(clase)}>Registrar clase</button>}
 </span>;
}
