'use client';
import type {Reaccion,ResultadoReaccion} from '../lib/creacion';
import {PLANTILLAS_REACCION} from '../lib/combate';

const NOMBRES_PLANTILLA:Record<string,string>={inercia:'Inercia (Kion)',absorcion:'Absorción (Kion)',reflejo:'Reflejo (Kion)',reciproco:'Recíproco (Kion)',ancla:'Ancla (Kion)'};

/** Frase en vivo de la reacción, en el idioma de la mesa. */
export function describirReaccion(r:Reaccion):string{
 const partes:string[]=[];
 const ante=r.naturaleza==='magica'?'un golpe mágico':r.naturaleza==='fisica'?'un golpe físico':'cualquier golpe';
 const forma=r.forma?` estando en la forma «${r.forma}»`:r.sin_forma?` si no está en la forma «${r.sin_forma}»`:'';
 const res=(x:ResultadoReaccion|undefined,que:string)=>{const f:string[]=[];if(x?.devolver)f.push(`devuelve ${x.devolver.maximo?`hasta ${x.devolver.maximo} de `:''}${que} al atacante`);if(x?.reservar)f.push(`guarda ${Math.round(x.reservar.proporcion*100)} % de ${que} en «${x.reservar.recurso}» (máximo ${x.reservar.maximo})`);return f;};
 if(r.principal){
  const p=r.principal;
  partes.push(`Al recibir ${ante}${forma}, ${p.salvacion?`tira salvación de ${p.salvacion.atributo} CD ${p.salvacion.cd} y, si la supera, `:''}${p.reducir.modo==='mitad'?'detiene la mitad del daño':`detiene hasta ${p.reducir.valor||0} de daño`}`);
  partes.push(...res(p,'lo detenido'));
  if(p.permite_seguimiento)partes.push('y da paso a una reacción de seguimiento');
 }else if(r.seguimiento){
  partes.push(`Tras otra reacción que detuvo ${ante}${forma}`);partes.push(...res(r.seguimiento,'lo detenido'));
 }
 return partes.join(', ')+'.';
}

/** Sección «Reacción» de una acción del Yunque (primitiva del Yunque general). */
export default function EditorReaccion({valor,onChange}:{valor?:Reaccion;onChange:(r:Reaccion|undefined)=>void}){
 const r=valor,principal=!!r?.principal;
 const set=(p:Partial<Reaccion>)=>onChange({...r!,...p});
 const res=(x:ResultadoReaccion|undefined)=>x||{};
 const setRes=(p:Partial<ResultadoReaccion>)=>principal?set({principal:{...r!.principal!,...p}}):set({seguimiento:{...res(r!.seguimiento),...p}});
 const actual=principal?r!.principal!:res(r?.seguimiento);
 return <details className="yunque-avanzado" open={!!r}>
  <summary>Reacción al recibir un golpe{r?' · Activa':''}</summary>
  <p className="text-sm text-text-muted">Una reacción se activa sola cuando el portador recibe daño y no aparece en su barra de acciones.</p>
  <label><input type="checkbox" checked={!!r} onChange={ev=>onChange(ev.target.checked?{principal:{reducir:{modo:'fijo',valor:3}}}:undefined)}/> Esta acción es una reacción</label>
  {r&&<div className="space-y-3">
   <label>Plantilla<select value="" onChange={ev=>{const k=ev.target.value as keyof typeof PLANTILLAS_REACCION;if(k)onChange(structuredClone(PLANTILLAS_REACCION[k]));}}><option value="">Elegir para rellenar…</option>{Object.keys(PLANTILLAS_REACCION).map(k=><option key={k} value={k}>{NOMBRES_PLANTILLA[k]||k}</option>)}</select></label>
   <label>Cuándo actúa<select value={principal?'principal':'seguimiento'} onChange={ev=>onChange(ev.target.value==='principal'?{...r,seguimiento:undefined,principal:{reducir:{modo:'fijo',valor:3}}}:{...r,principal:undefined,seguimiento:{devolver:{}}})}><option value="principal">Intercepta el golpe</option><option value="seguimiento">Actúa tras otra reacción que lo detuvo</option></select></label>
   <label>Ante qué golpes<select value={r.naturaleza||''} onChange={ev=>set({naturaleza:(ev.target.value||undefined) as Reaccion['naturaleza']})}><option value="">Cualquiera</option><option value="fisica">Solo físicos</option><option value="magica">Solo mágicos</option></select></label>
   <label>Solo en la forma (clave de transformación, opcional)<input value={r.forma||''} onChange={ev=>set({forma:ev.target.value.trim()||undefined})}/></label>
   {principal&&<>
    <label>Prioridad (las mayores se prueban antes)<input type="number" min={-100} max={100} value={r.prioridad??0} onChange={ev=>set({prioridad:Number(ev.target.value)||0})}/></label>
    <label>Cuánto detiene<select value={r.principal!.reducir.modo} onChange={ev=>set({principal:{...r.principal!,reducir:ev.target.value==='mitad'?{modo:'mitad'}:{modo:'fijo',valor:3}}})}><option value="fijo">Una cantidad fija</option><option value="mitad">La mitad del daño</option></select></label>
    {r.principal!.reducir.modo==='fijo'&&<label>Daño máximo detenido<input type="number" min={1} max={1000} value={r.principal!.reducir.valor??3} onChange={ev=>set({principal:{...r.principal!,reducir:{modo:'fijo',valor:Number(ev.target.value)||1}}})}/></label>}
    <label><input type="checkbox" checked={!!r.principal!.salvacion} onChange={ev=>set({principal:{...r.principal!,salvacion:ev.target.checked?{cd:14,atributo:'salvacion'}:undefined}})}/> Requiere superar una salvación</label>
    {r.principal!.salvacion&&<div className="flex flex-wrap gap-3"><label>CD<input type="number" min={1} max={100} value={r.principal!.salvacion.cd} onChange={ev=>set({principal:{...r.principal!,salvacion:{...r.principal!.salvacion!,cd:Number(ev.target.value)||1}}})}/></label><label>Atributo<input value={r.principal!.salvacion.atributo} onChange={ev=>set({principal:{...r.principal!,salvacion:{...r.principal!.salvacion!,atributo:ev.target.value.trim()}}})}/></label></div>}
    <label><input type="checkbox" checked={!!r.principal!.permite_seguimiento} onChange={ev=>set({principal:{...r.principal!,permite_seguimiento:ev.target.checked||undefined}})}/> Si tiene éxito, permite una reacción de seguimiento</label>
   </>}
   <label><input type="checkbox" checked={!!actual.devolver} onChange={ev=>setRes({devolver:ev.target.checked?{}:undefined})}/> Devuelve lo detenido al atacante</label>
   {actual.devolver&&<label>Máximo devuelto (vacío: todo)<input type="number" min={1} max={1000} value={actual.devolver.maximo??''} onChange={ev=>setRes({devolver:{maximo:ev.target.value?Number(ev.target.value):undefined}})}/></label>}
   <label><input type="checkbox" checked={!!actual.reservar} onChange={ev=>setRes({reservar:ev.target.checked?{recurso:'Energía',proporcion:0.5,maximo:10}:undefined})}/> Guarda parte de lo detenido en una reserva</label>
   {actual.reservar&&<div className="flex flex-wrap gap-3"><label>Recurso<input value={actual.reservar.recurso} onChange={ev=>setRes({reservar:{...actual.reservar!,recurso:ev.target.value}})}/></label><label>Proporción (0,5 = mitad)<input type="number" step="0.1" min={0.1} max={10} value={actual.reservar.proporcion} onChange={ev=>setRes({reservar:{...actual.reservar!,proporcion:Number(ev.target.value)||0.5}})}/></label><label>Máximo<input type="number" min={1} value={actual.reservar.maximo} onChange={ev=>setRes({reservar:{...actual.reservar!,maximo:Number(ev.target.value)||1}})}/></label></div>}
   <p className="y-cita" aria-live="polite">{describirReaccion(r)}</p>
  </div>}
 </details>;
}
