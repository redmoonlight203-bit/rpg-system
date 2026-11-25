"use client";
// Invocación en combate: la ventana para pedirla o diseñarla (GM y jugador) y su materialización,
// que solo hace la pantalla del GM (prepara la criatura, valida su clase y la pone en el tablero).
import {mensajeError} from '../lib/errores';
import {useEffect,useMemo,useRef,useState} from "react";
import {supabase} from "../lib/supabase";
import {evaluarInvocacionEnWorker,useEvaluacionInvocacion} from "./useEvaluacionInvocacion";
import {criaturaTemporal,habilidadesElegibles,pasivasElegibles,propuestaInicial,statsCriaturaExistente,type PiezaCatalogo,type PropuestaInvocacion} from "../lib/invocaciones";
import {dadoSeguro,estadisticas,incorporarInvocacion,type Combate,type Fuente} from "../lib/combate";
import {normalizarHuella} from '../lib/huellas-combate';
import type {CategoriaBase} from '../lib/estadisticas';
import type {InvocacionEditor} from "./EditorInvocacion";

export type CreacionCatalogo=PiezaCatalogo&{naturaleza_vinculo?:{huella?:unknown}|null};
export type DatosInvocacion={catalogo:CreacionCatalogo[];atributos:{clave:string;etiqueta:string}[];categorias:CategoriaBase[]};
const NEGATIVOS=["iniciativa","salvacion","bono_impacto","dano"];
const campo="w-full rounded border border-neutral-700 bg-well p-2 text-sm";

/** En estos modos la criatura se diseña en el momento de invocarla. */
export const disenaEnCombate=(modo:string)=>modo==='jugador_en_combate'||modo==='gm_en_combate';

export async function cargarCatalogoInvocacion():Promise<DatosInvocacion>{
 const [f,a,cat]=await Promise.all([supabase.from('forja_maestra').select('*').eq('estado','aprobado'),supabase.from('config_estadisticas').select('clave,etiqueta').eq('categoria','razas'),supabase.from('categorias_forja').select('id,clave,nombre,parent_id,pasiva_racial')]);
 if(f.error||a.error||cat.error)throw Error(f.error?.message||a.error?.message||cat.error?.message);
 return {catalogo:(f.data||[]) as CreacionCatalogo[],atributos:a.data||[],categorias:(cat.data||[]) as CategoriaBase[]};
}

/** Solo la pantalla del GM: prepara la criatura, valida su clase si se diseñó en combate y la pone en el tablero (paga y gasta la acción). */
export async function materializarInvocacion({combate,actorId,habilidad,propuesta,datos}:{combate:Combate;actorId:string;habilidad:Fuente;propuesta?:PropuestaInvocacion;datos:DatosInvocacion}):Promise<Combate>{
 const config=habilidad.configuracion_invocacion as InvocacionEditor|undefined;
 if(!config)throw Error('Esta habilidad no invoca.');
 const actor=combate.miembros.find(m=>m.id===actorId);
 if(!actor)throw Error('Quien invoca ya no está en el combate.');
 let preparado:Parameters<typeof incorporarInvocacion>[3];
 if(config.modo==='existente'){
  const origen=datos.catalogo.find(x=>x.id===config.origenId);
  if(!origen)throw Error('La criatura de esta invocación ya no existe en La Creación.');
  const r=await supabase.rpc('combate_preparar_personaje',{p_forja:config.origenId});
  if(r.error)throw Error(r.error.message);
  const base=r.data as Parameters<typeof incorporarInvocacion>[3]&{configuracion:{bonos_equipamiento?:Record<string,number>;huella?:unknown}};
  preparado={...base,stats:statsCriaturaExistente(base,origen,estadisticas(actor).nivel||1),configuracion:{...base.configuracion,huella:normalizarHuella(origen.naturaleza_vinculo?.huella??base.configuracion?.huella),...(origen.imagen_url?{imagen_url:origen.imagen_url}:{})}};
 }else{
  const p=config.modo==='plantilla_temporal'?propuestaInicial(config):propuesta;
  if(!p)throw Error('Falta el diseño de la criatura.');
  if(disenaEnCombate(config.modo)){
   const ev=await evaluarInvocacionEnWorker([config,p,datos.catalogo,datos.categorias]);
   if(!ev.valida)throw Error(ev.errores.join(' ')||'La criatura no cumple los límites de la invocación.');
  }
  preparado=criaturaTemporal(p,datos.catalogo) as Parameters<typeof incorporarInvocacion>[3];
 }
 return incorporarInvocacion(combate,actorId,habilidad,preparado,config.duracionTurnos,config.maxActivas??1,dadoSeguro,propuesta?.apariencia);
}

/** Ventana de invocación. `disenar`: quien la abre diseña la criatura (en los modos de diseño en combate). */
export default function VentanaInvocacion({titulo,config,nivel,disenar,nota,textoConfirmar='Invocar',inicial,onCerrar,onConfirmar}:{titulo:string;config:InvocacionEditor;nivel:number;disenar:boolean;nota?:string;textoConfirmar?:string;inicial?:PropuestaInvocacion;onCerrar:()=>void;onConfirmar:(p?:PropuestaInvocacion)=>Promise<void>}){
 const [datos,setDatos]=useState<DatosInvocacion|null>(null),[error,setError]=useState(''),[ocupado,setOcupado]=useState(false);
 const [p,setP]=useState<PropuestaInvocacion>(()=>inicial||propuestaInicial(config));
 const dialogo=useRef<HTMLDialogElement>(null),bloqueo=useRef(false);
 const diseno=disenaEnCombate(config.modo);
 useEffect(()=>{dialogo.current?.showModal();let vivo=true;cargarCatalogoInvocacion().then(d=>{if(vivo)setDatos(d);},e=>{if(vivo)setError(mensajeError(e,'No se pudo cargar el catálogo.'));});return()=>{vivo=false;};},[]);
 const evaluacion=useEvaluacionInvocacion(diseno&&disenar&&datos?[config,p,datos.catalogo,datos.categorias]:null);
 const origen=config.modo==='existente'?datos?.catalogo.find(x=>x.id===config.origenId):undefined;
 const statsOrigen=useMemo(()=>origen?statsCriaturaExistente({stats:origen.stats||{},configuracion:{}},origen,nivel,()=>0.5):null,[origen,nivel]);
 const elegibles=useMemo(()=>datos?{habilidades:habilidadesElegibles(datos.catalogo,config.claseMaxima),pasivas:pasivasElegibles(datos.catalogo,config.claseMaxima)}:{habilidades:[],pasivas:[]},[datos,config.claseMaxima]);
 const claves=useMemo(()=>[...new Map([...(datos?.atributos||[]),...Object.keys(config.rangos||{}).map(clave=>({clave,etiqueta:clave})),...Object.keys(p.stats).map(clave=>({clave,etiqueta:clave}))].map(a=>[a.clave,a])).values()],[datos,config.rangos,p.stats]);
 const fijo=config.modo==='plantilla_temporal'?propuestaInicial(config):null;
 const listo=!!datos&&!ocupado&&(!diseno||!disenar||!!evaluacion?.valida)&&(config.modo!=='existente'||!!origen);
 async function confirmar(){
  if(bloqueo.current||!listo)return;bloqueo.current=true;setOcupado(true);setError('');
  try{await onConfirmar(diseno&&disenar?p:undefined);}catch(e){setError(mensajeError(e,'No se pudo invocar.'));}finally{bloqueo.current=false;setOcupado(false);}
 }
 const marcar=(tipo:'habilidades'|'pasivas',id:string,si:boolean)=>setP({...p,[tipo]:si?[...p[tipo],id]:p[tipo].filter(x=>x!==id)});
 const resumen=[`Clase máxima ${config.claseMaxima}`,`${config.duracionTurnos} ${config.duracionTurnos===1?'turno propio':'turnos propios'}`,config.costePh?`${config.costePh} PH`:'',config.costeFatiga?`${config.costeFatiga} Fatiga`:'',(config.maxActivas??1)>1?`hasta ${config.maxActivas} a la vez`:''].filter(Boolean).join(' · ');
 return <dialog ref={dialogo} aria-labelledby="invocacion-titulo" onCancel={e=>{e.preventDefault();if(!ocupado)onCerrar();}} className="m-auto max-h-[90vh] w-full max-w-xl overflow-auto rounded-xl border border-sky-800 bg-neutral-950 p-6 text-neutral-100 backdrop:bg-black/80">
  <h2 id="invocacion-titulo" className="text-xl">{titulo}</h2>
  <p className="my-2 text-sm text-neutral-400">{resumen}.</p>
  {!datos&&!error&&<p role="status">Cargando La Creación…</p>}
  {datos&&config.modo==='existente'&&(origen?<section className="rounded border border-neutral-800 p-3"><strong>{origen.nombre}</strong>{origen.es_grupo&&<span className="text-sm text-neutral-400"> · al nivel {Math.min(nivel,origen.nivel_maximo||20)}</span>}<p className="mt-1 text-sm text-neutral-300">{Object.entries(statsOrigen||{}).filter(([k])=>k!=='nivel').map(([k,v])=>`${datos.atributos.find(a=>a.clave===k)?.etiqueta||k} ${v}`).join(' · ')}</p></section>:<p role="alert" className="text-red-300">La criatura de esta invocación ya no existe en La Creación.</p>)}
  {datos&&fijo&&<section className="rounded border border-neutral-800 p-3"><strong>{fijo.nombre||'Criatura'}</strong><p className="mt-1 text-sm text-neutral-300">{Object.entries(fijo.stats).map(([k,v])=>`${datos.atributos.find(a=>a.clave===k)?.etiqueta||k} ${v}`).join(' · ')}</p>{!!fijo.habilidades.length&&<p className="text-sm text-neutral-400">Habilidades: {fijo.habilidades.map(id=>datos.catalogo.find(x=>x.id===id)?.nombre||'—').join(', ')}</p>}</section>}
  {datos&&diseno&&!disenar&&<p className="rounded border border-neutral-800 p-3 text-sm">El GM diseñará la criatura en cuanto la pidas, con clase máxima {config.claseMaxima}.</p>}
  {datos&&diseno&&disenar&&<fieldset disabled={ocupado} className="space-y-3">
   <label className="block">Nombre<input className={campo} maxLength={60} value={p.nombre} onChange={e=>setP({...p,nombre:e.target.value})}/></label>
   <label className="block">Apariencia<textarea className={campo} maxLength={500} value={p.apariencia||''} onChange={e=>setP({...p,apariencia:e.target.value})}/></label>
   <div className="grid grid-cols-2 gap-3">{claves.map(a=>{const r=config.rangos?.[a.clave];return <label key={a.clave}>{a.etiqueta}{r&&<small className="text-neutral-400"> ({r.min}–{r.max})</small>}<input type="number" min={r?.min??(NEGATIVOS.includes(a.clave)?undefined:0)} max={r?.max} className={campo} value={p.stats[a.clave]??0} onChange={e=>setP({...p,stats:{...p.stats,[a.clave]:Number(e.target.value)}})}/></label>;})}</div>
   <fieldset><legend>Habilidades {p.habilidades.length}/{config.maxHabilidades}</legend>{elegibles.habilidades.length?elegibles.habilidades.map(h=><label className="block" key={h.id}><input type="checkbox" checked={p.habilidades.includes(h.id!)} disabled={!p.habilidades.includes(h.id!)&&p.habilidades.length>=config.maxHabilidades} onChange={e=>marcar('habilidades',h.id!,e.target.checked)}/> {h.nombre} · {h.clase}</label>):<p className="text-sm text-neutral-400">No hay habilidades de clase {config.claseMaxima} o menor en La Creación.</p>}</fieldset>
   {!!elegibles.pasivas.length&&<details><summary>Pasivas {p.pasivas.length}</summary>{elegibles.pasivas.map(h=><label className="block" key={h.id}><input type="checkbox" checked={p.pasivas.includes(h.id!)} onChange={e=>marcar('pasivas',h.id!,e.target.checked)}/> {h.nombre} · {h.clase}</label>)}</details>}
   <p role="status" className="text-sm">{evaluacion?`Clase total ${evaluacion.clase} · ${evaluacion.puntuacion.toFixed(2)} IPE. ${evaluacion.valida?'Dentro del límite.':evaluacion.errores.join(' ')}`:'Calculando clase…'}</p>
  </fieldset>}
  {nota&&<p className="mt-3 text-sm text-neutral-400">{nota}</p>}
  {error&&<p role="alert" className="mt-3 text-red-300">{error}</p>}
  <div className="mt-4 flex gap-3"><button type="button" disabled={ocupado} onClick={onCerrar}>Cancelar</button><button type="button" className="rounded bg-sky-900 p-2" disabled={!listo} onClick={()=>void confirmar()}>{ocupado?'Invocando…':textoConfirmar}</button></div>
 </dialog>;
}
