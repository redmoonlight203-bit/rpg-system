'use client';
// Editor general de reacciones: cualquier creación elige cuándo reacciona (disparador) y qué hace.
// Solo se muestran los campos que el motor resuelve para ese disparador (RESULTADOS_POR_DISPARADOR).
import {ArrowLeftRight,Crosshair,HeartCrack,Hourglass,RotateCcw,Shield,ShieldAlert,Swords,Users} from 'lucide-react';
import type {Reaccion,ResultadoReaccion} from '../lib/creacion';
import {describirReaccion} from '../lib/descripciones';
import './editor-yunque.css';
import {DISPARADORES,NOMBRE_DISPARADOR,RESULTADOS_POR_DISPARADOR,CON_ALCANCE,PLANTILLAS_REACCION,disparadorDe,lineaCosteReaccion,type ClaveResultado,type DisparadorReaccion} from '../lib/reacciones';

const NOMBRE_PLANTILLA:Record<string,string>={inercia:'Inercia',absorcion:'Absorción',reflejo:'Reflejo',reciproco:'Recíproco',ancla:'Ancla'};
const ICONO:Record<DisparadorReaccion,typeof Shield>={antes_ser_atacado:ShieldAlert,despues_ser_atacado:Shield,tras_fallar_ataque:RotateCcw,tras_fallar_prueba:RotateCcw,aliado_atacado:Users,aliado_ataca:Swords,aliado_cae:HeartCrack,apuntado_por_area:Crosshair,fin_de_turno:Hourglass};
type Principal=NonNullable<Reaccion['principal']>;
/** Reacción nueva con un resultado que el disparador sí resuelve. */
function inicial(d:DisparadorReaccion,previa?:Reaccion):Reaccion{
 const base:Reaccion={disparador:d==='despues_ser_atacado'?undefined:d,coste:previa?.coste,usos:previa?.usos,enfriamiento:previa?.enfriamiento,naturaleza:previa?.naturaleza};
 const p=RESULTADOS_POR_DISPARADOR[d];
 const principal:Principal=p.includes('repetir_tirada')?{repetir_tirada:{}}:p.includes('interponerse')?{interponerse:{}}:p.includes('reducir')?{reducir:{modo:'fijo',valor:3}}:{contraatacar:{cantidad:1,caras:6}};
 return JSON.parse(JSON.stringify({...base,principal}));
}

export default function EditorReaccion({valor,onChange,costeAccion=0}:{valor?:Reaccion;onChange:(r:Reaccion|undefined)=>void;costeAccion?:number}){
 const r=valor,disparador=r?disparadorDe(r):'despues_ser_atacado',permite=(k:ClaveResultado)=>RESULTADOS_POR_DISPARADOR[disparador].includes(k);
 const principal=!!r?.principal;
 const set=(p:Partial<Reaccion>)=>onChange({...r!,...p});
 const setP=(p:Partial<Principal>)=>set({principal:{...r!.principal!,...p}});
 const res=(x:ResultadoReaccion|undefined)=>x||{};
 const setRes=(p:Partial<ResultadoReaccion>)=>principal?setP(p):set({seguimiento:{...res(r!.seguimiento),...p}});
 const actual:ResultadoReaccion&Partial<Principal>=principal?r!.principal!:res(r?.seguimiento);
 const numero=(v:string,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(Number(v))||min));
 return <details className="yunque-avanzado yq-reaccion" open={!!r}>
  <summary>Reacción{r?` · ${NOMBRE_DISPARADOR[disparador]}`:''}</summary>
  <label className="yq-reaccion-activa"><input type="checkbox" checked={!!r} onChange={ev=>onChange(ev.target.checked?inicial('despues_ser_atacado'):undefined)}/> Esta acción es una reacción</label>
  {r&&<div className="space-y-3">
   <fieldset className="yq-reaccion-disparadores"><legend>Disparador</legend>
    <div role="radiogroup" aria-label="Disparador">{DISPARADORES.map(d=>{const Icono=ICONO[d];return <button key={d} type="button" role="radio" aria-checked={disparador===d} className={disparador===d?'is-elegido':undefined} onClick={()=>{if(d!==disparador)onChange(inicial(d,r));}}><Icono size={18} aria-hidden="true"/><span>{NOMBRE_DISPARADOR[d]}</span></button>;})}</div>
   </fieldset>
   <label>Plantilla<select value="" onChange={ev=>{const k=ev.target.value;if(k&&PLANTILLAS_REACCION[k])onChange(structuredClone(PLANTILLAS_REACCION[k]));}}><option value="">Rellenar desde una plantilla…</option>{Object.keys(PLANTILLAS_REACCION).map(k=><option key={k} value={k}>{(NOMBRE_PLANTILLA[k]||k)+' (plantilla)'}</option>)}</select></label>
   <fieldset className="yq-reaccion-coste"><legend>Coste</legend>
    <div className="flex flex-wrap gap-3">
     <label>Coste (PH)<input type="number" min={0} max={1000} placeholder={String(costeAccion)} value={r.coste??''} onChange={ev=>set({coste:ev.target.value===''?undefined:numero(ev.target.value,0,1000)})}/></label>
     <label>Usos<select value={r.usos?.tipo||'ilimitado'} onChange={ev=>{const tipo=ev.target.value as 'encuentro'|'turno'|'ilimitado';set({usos:tipo==='ilimitado'?undefined:{tipo,maximo:r.usos?.maximo||1},una_por_ronda:undefined});}}><option value="ilimitado">Sin límite</option><option value="encuentro">Por encuentro</option><option value="turno">Por ronda</option></select></label>
     {r.usos&&r.usos.tipo!=='ilimitado'&&<label>Máximo<input type="number" min={1} max={100} value={r.usos.maximo||1} onChange={ev=>set({usos:{...r.usos!,maximo:numero(ev.target.value,1,100)}})}/></label>}
     <label>Enfriamiento (rondas)<input type="number" min={0} max={100} value={r.enfriamiento??0} onChange={ev=>set({enfriamiento:numero(ev.target.value,0,100)||undefined})}/></label>
    </div>
    <p className="yq-reaccion-linea">{lineaCosteReaccion(r,costeAccion)}</p>
   </fieldset>
   {CON_ALCANCE.includes(disparador)&&<label>Alcance (casillas)<input type="number" min={1} max={30} value={r.alcance??1} onChange={ev=>set({alcance:numero(ev.target.value,1,30)})}/></label>}
   {!['tras_fallar_ataque','tras_fallar_prueba'].includes(disparador)&&<label>Naturaleza<select value={r.naturaleza||''} onChange={ev=>set({naturaleza:(ev.target.value||undefined) as Reaccion['naturaleza']})}><option value="">Cualquier golpe</option><option value="fisica">Solo físicos</option><option value="magica">Solo mágicos</option></select></label>}
   <label>Solo en la forma (clave de transformación, opcional)<input value={r.forma||''} onChange={ev=>set({forma:ev.target.value.trim()||undefined})}/></label>
   {permite('seguimiento')&&<label>Cuándo actúa<select value={principal?'principal':'seguimiento'} onChange={ev=>onChange(ev.target.value==='principal'?{...r,seguimiento:undefined,principal:{reducir:{modo:'fijo',valor:3}}}:{...r,principal:undefined,esquiva_opuesta:undefined,seguimiento:{devolver:{}}})}><option value="principal">Intercepta el golpe</option><option value="seguimiento">Actúa tras otra reacción que lo detuvo</option></select></label>}
   {principal&&permite('esquiva_opuesta')&&<label><input type="checkbox" checked={!!r.esquiva_opuesta} onChange={ev=>set({esquiva_opuesta:ev.target.checked?{caras:20,contra_caras:6}:undefined})}/> Esquiva enfrentada al ataque</label>}
   {r.esquiva_opuesta&&<fieldset><legend>Al igualar o superar el ataque, esquiva y contraataca. Por debajo, recibe la mitad.</legend>
    {(['caras','contra_caras'] as const).map(k=><label key={k}>{k==='caras'?'Caras del dado de esquiva':'Caras del dado de contraataque'}<input type="number" min={2} max={100} value={r.esquiva_opuesta![k]} onChange={ev=>set({esquiva_opuesta:{...r.esquiva_opuesta!,[k]:Number(ev.target.value)}})}/></label>)}
   </fieldset>}
   {principal&&!r.esquiva_opuesta&&<>
    {permite('repetir_tirada')&&<p className="yq-nota"><RotateCcw size={14} aria-hidden="true"/> Repetir tirada: vuelve a tirar y se queda con la segunda.</p>}
    {permite('interponerse')&&<label><input type="checkbox" checked={!!r.principal!.interponerse} onChange={ev=>setP({interponerse:ev.target.checked?{}:undefined})}/> <ArrowLeftRight size={14} aria-hidden="true"/> Interponerse: recibe el ataque en lugar del aliado</label>}
    {permite('reducir')&&<>
     {disparador!=='despues_ser_atacado'&&<label><input type="checkbox" checked={!!r.principal!.reducir} onChange={ev=>setP({reducir:ev.target.checked?{modo:'fijo',valor:3}:undefined})}/> Reducción</label>}
     {r.principal!.reducir&&<><label>Reducción<select value={r.principal!.reducir.modo} onChange={ev=>setP({reducir:ev.target.value==='todo'?{modo:'todo'}:ev.target.value==='mitad'?{modo:'mitad'}:{modo:'fijo',valor:3}})}><option value="fijo">Una cantidad fija</option><option value="todo">Todo el daño</option><option value="mitad">La mitad del daño</option></select></label>
     {r.principal!.reducir.modo==='fijo'&&<label>Daño máximo detenido<input type="number" min={1} max={1000} value={r.principal!.reducir.valor??3} onChange={ev=>setP({reducir:{modo:'fijo',valor:numero(ev.target.value,1,1000)}})}/></label>}</>}
     {disparador==='despues_ser_atacado'&&<label>Prioridad (las mayores se prueban antes)<input type="number" min={-100} max={100} value={r.prioridad??0} onChange={ev=>set({prioridad:Number(ev.target.value)||0})}/></label>}
    </>}
    {permite('salvacion')&&<><label><input type="checkbox" checked={!!r.principal!.salvacion} onChange={ev=>setP({salvacion:ev.target.checked?{cd:14,atributo:'salvacion'}:undefined})}/> Requiere superar una salvación</label>
    {r.principal!.salvacion&&<div className="flex flex-wrap gap-3"><label>CD<input type="number" min={1} max={100} value={r.principal!.salvacion.cd} onChange={ev=>setP({salvacion:{...r.principal!.salvacion!,cd:numero(ev.target.value,1,100)}})}/></label><label>Atributo<input value={r.principal!.salvacion.atributo} onChange={ev=>setP({salvacion:{...r.principal!.salvacion!,atributo:ev.target.value.trim()}})}/></label></div>}</>}
    {permite('seguimiento')&&<label><input type="checkbox" checked={!!r.principal!.permite_seguimiento} onChange={ev=>setP({permite_seguimiento:ev.target.checked||undefined})}/> Si tiene éxito, permite una reacción de seguimiento</label>}
   </>}
   {!r.esquiva_opuesta&&<>
    {permite('contraatacar')&&<><label><input type="checkbox" checked={!!actual.contraatacar} onChange={ev=>setRes({contraatacar:ev.target.checked?{cantidad:1,caras:6}:undefined})}/> Contraataque</label>
    {actual.contraatacar&&<div className="flex flex-wrap gap-3">{(['cantidad','caras','modificador'] as const).map(k=><label key={k}>{k==='cantidad'?'Dados':k==='caras'?'Caras':'Modificador'}<input type="number" min={k==='modificador'?-100:k==='caras'?2:1} max={k==='cantidad'?20:100} value={actual.contraatacar![k]??0} onChange={ev=>setRes({contraatacar:{...actual.contraatacar!,[k]:k==='modificador'?(Number(ev.target.value)||undefined):numero(ev.target.value,k==='caras'?2:1,k==='cantidad'?20:100)}})}/></label>)}</div>}</>}
    {permite('devolver')&&<><label><input type="checkbox" checked={!!actual.devolver} onChange={ev=>setRes({devolver:ev.target.checked?{}:undefined})}/> Devolver lo detenido al atacante</label>
    {actual.devolver&&<label>Máximo devuelto (vacío: todo)<input type="number" min={1} max={1000} value={actual.devolver.maximo??''} onChange={ev=>setRes({devolver:{maximo:ev.target.value?Number(ev.target.value):undefined}})}/></label>}</>}
    {permite('reservar')&&<><label><input type="checkbox" checked={!!actual.reservar} onChange={ev=>setRes({reservar:ev.target.checked?{recurso:'Energía',proporcion:0.5,maximo:10}:undefined})}/> Guardar parte de lo detenido en una reserva</label>
    {actual.reservar&&<div className="flex flex-wrap gap-3"><label>Recurso<input value={actual.reservar.recurso} onChange={ev=>setRes({reservar:{...actual.reservar!,recurso:ev.target.value}})}/></label><label>Proporción (0,5 = mitad)<input type="number" step="0.1" min={0.1} max={10} value={actual.reservar.proporcion} onChange={ev=>setRes({reservar:{...actual.reservar!,proporcion:Number(ev.target.value)||0.5}})}/></label><label>Máximo<input type="number" min={1} value={actual.reservar.maximo} onChange={ev=>setRes({reservar:{...actual.reservar!,maximo:Number(ev.target.value)||1}})}/></label></div>}</>}
   </>}
   <p className="y-cita yq-reaccion-vista" aria-live="polite">{describirReaccion(r,costeAccion)}</p>
  </div>}
 </details>;
}
