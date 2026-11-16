'use client';
import {useId} from 'react';
import {cn} from './cn';
export type TipoVital='vida'|'energia'|'experiencia';
const tono:Record<TipoVital,string>={vida:'yg-vital-vida',energia:'yg-vital-energia',experiencia:'yg-vital-exp'};
/** Barra con brillo; anima el cambio de valor. La cifra siempre visible. */
export function BarraVital({label,value,max,tipo='vida',className}:{label:string;value:number;max:number;tipo?:TipoVital;className?:string}){
 const id=useId(),limite=Math.max(0,max),actual=Math.min(limite,Math.max(0,value)),porcentaje=limite?actual/limite*100:0;
 return <div className={cn('yg-vital',className)}>
  <div className="yg-vital-cabecera"><span id={id}>{label}</span><span className="tabular-nums font-semibold text-gold-bright">{actual} / {limite}</span></div>
  <div role="progressbar" aria-labelledby={id} aria-valuemin={0} aria-valuemax={limite||1} aria-valuenow={actual} className="yg-vital-pista">
   <div className={cn('yg-vital-relleno',tono[tipo])} style={{width:`${porcentaje}%`}}/>
  </div>
 </div>;
}
