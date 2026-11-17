'use client';
// Controles de los editores de nodo: fichas pulsables y ruedas numéricas (botones ± y rueda del ratón).
import {useEffect,useRef,type ReactNode} from 'react';
import IconoYugen from '../IconoYugen';

export type Opcion<T extends string|number>={valor:T;nombre:string;icono?:string;ayuda?:string};
/** Grupo de fichas: un valor corto se elige pulsando, nunca con un desplegable. */
export function Fichas<T extends string|number>({etiqueta,opciones,valor,onChange,tono,grandes=false,columnas}:{etiqueta:string;opciones:Opcion<T>[];valor:T|undefined;onChange:(v:T)=>void;tono?:'arcano'|'oro'|'carmesi'|'verde';grandes?:boolean;columnas?:number}){
 return <fieldset className={`yq-fichas${grandes?' yq-fichas--grandes':''}${columnas?' yq-fichas--rejilla':''}${tono?` is-${tono}`:''}`} style={columnas?{['--yq-columnas' as string]:columnas}:undefined}>
  <legend>{etiqueta}</legend>
  <div>{opciones.map(o=><button type="button" key={String(o.valor)} aria-pressed={o.valor===valor} title={o.ayuda} onClick={()=>onChange(o.valor)}>
   {o.icono&&<IconoYugen id={o.icono} size={grandes?30:16}/>}<span>{o.nombre}</span>{grandes&&o.ayuda&&<small>{o.ayuda}</small>}
  </button>)}</div>
 </fieldset>;
}

/** Rueda numérica: la rueda del ratón sube o baja (sin mover el lienzo); `valores` la convierte en un ciclo fijo (caras del dado). */
export function Rueda({nombre,etiqueta,valor,onChange,min=-999,max=9999,paso=1,valores,prefijo,compacta=false}:{nombre:string;etiqueta:string;valor:number;onChange:(n:number)=>void;min?:number;max?:number;paso?:number;valores?:number[];prefijo?:ReactNode;compacta?:boolean}){
 const ref=useRef<HTMLSpanElement>(null);
 const ultimo=useRef({valor,onChange,min,max,paso,valores});
 useEffect(()=>{ultimo.current={valor,onChange,min,max,paso,valores};});
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  const rueda=(e:WheelEvent)=>{e.preventDefault();e.stopPropagation();if(Math.abs(e.deltaY)<1)return;mover(e.deltaY<0?1:-1);};
  el.addEventListener('wheel',rueda,{passive:false});
  return ()=>el.removeEventListener('wheel',rueda);
 },[]);
 function mover(dir:number){
  const u=ultimo.current;
  if(u.valores){const lista=[...new Set([...u.valores,u.valor])].sort((a,b)=>a-b);const i=lista.indexOf(u.valor);u.onChange(lista[Math.min(lista.length-1,Math.max(0,i+dir))]);return;}
  u.onChange(Math.min(u.max,Math.max(u.min,Math.round((u.valor+dir*u.paso)*100)/100)));
 }
 return <span ref={ref} className={`yq-rueda${compacta?' is-compacta':''}`} data-rueda={nombre} title="Usa la rueda del ratón o los botones">
  <button type="button" tabIndex={-1} aria-label={`Bajar ${etiqueta}`} onClick={()=>mover(-1)} disabled={valores?valor<=Math.min(...valores):valor<=min}>−</button>
  {prefijo}
  <input aria-label={etiqueta} inputMode="numeric" value={valor} onChange={e=>{const n=Number(e.target.value);if(e.target.value!==''&&Number.isFinite(n))onChange(Math.min(max,Math.max(min,n)));}}
   onKeyDown={e=>{if(e.key==='ArrowUp'){e.preventDefault();mover(1);}if(e.key==='ArrowDown'){e.preventDefault();mover(-1);}}}/>
  <button type="button" tabIndex={-1} aria-label={`Subir ${etiqueta}`} onClick={()=>mover(1)} disabled={valores?valor>=Math.max(...valores):valor>=max}>+</button>
 </span>;
}

/** Interruptor (switch) con la misma apariencia que «Todos los campos». */
export function Interruptor({etiqueta,valor,onChange,disabled=false}:{etiqueta:ReactNode;valor:boolean;onChange:(v:boolean)=>void;disabled?:boolean}){
 return <label className="yq-conmutador"><input type="checkbox" role="switch" checked={valor} disabled={disabled} onChange={e=>onChange(e.target.checked)}/><span aria-hidden="true"/>{etiqueta}</label>;
}
/** Campo de texto corto con etiqueta en versalitas. */
export function Texto({etiqueta,valor,onChange,max=120,placeholder,ayuda}:{etiqueta:string;valor:string;onChange:(v:string)=>void;max?:number;placeholder?:string;ayuda?:string}){
 return <label className="yq-campo"><span>{etiqueta}</span><input maxLength={max} value={valor} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>{ayuda&&<small className="yq-campo-ayuda">{ayuda}</small>}</label>;
}
