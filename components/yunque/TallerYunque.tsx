'use client';
// Taller del Yunque: barra superior + tres paneles (grimorio, lienzo, arena). El Borrador es la única fuente
// de verdad; cada gesto es una Operacion pura (`aplicar`) y sus errores se muestran como aviso, nunca rompen.
import {useCallback,useEffect,useMemo,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {Hammer} from 'lucide-react';
import IconoYugen from '../IconoYugen';
import {BarraVital,Runa} from '../ui/Juego';
import Lienzo,{type ContenidoNodo} from './Lienzo';
import {ICONO_TIPO,NOMBRE_TIPO,familiaDe} from './NodoYunque';
import EditorNucleo,{ICONO_CREACION} from './editores/EditorNucleo';
import EditorAccion from './editores/EditorAccion';
import {claseDe,type ContextoTaller} from './contexto';
import {CLASES_YUGEN,UMBRALES_CLASE} from '../../lib/clases';
import {TIPOS,type Efecto} from '../../lib/creacion';
import {mensajeError} from '../../lib/errores';
import {aGrafo,type Nodo,type TipoNodo} from '../../lib/yunque-grafo';
import {aplicar,copiar,type Operacion} from '../../lib/yunque-operaciones';
import {disponer,guardarPosiciones,leerPosiciones,type Punto} from '../../lib/yunque-disposicion';
import type {Borrador} from '../../lib/yunque-borrador';
import './yunque.css';

export type {ContextoTaller} from './contexto';
type Props={b:Borrador;setB:Dispatch<SetStateAction<Borrador>>;ctx:ContextoTaller;onGuardar:()=>void|Promise<void>;guardando:boolean;error:string};
const ICONO_EFECTO:Record<Efecto['efecto'],string>={dano:'espada',curacion:'pocion',estado:'fuego',crear_arma:'arco',transformacion:'alma',recuperar_ph:'agua',reducir_fatiga:'vida'};
const MODULOS:TipoNodo[]=['alcance','salvacion','estado','reaccion','transformacion','recurso','vfx','tabla_armas'];
const NUCLEO_LLEVA:Record<string,TipoNodo[]>={personaje:['cuando'],pasiva:['pasiva','cuando'],objeto:['accion','cuando','pasiva'],habilidad:['accion','cuando'],titulo:['accion','cuando'],otro:['accion','cuando','pasiva']};
const claveDe=(b:Borrador)=>`yunque:posiciones:${b.id||'nuevo'}`;

export default function TallerYunque({b,setB,ctx,onGuardar,guardando,error}:Props){
 const contextoGrafo=useMemo(()=>({creaciones:ctx.creaciones}),[ctx.creaciones]);
 const grafo=useMemo(()=>aGrafo(b,contextoGrafo),[b,contextoGrafo]);
 const clave=claveDe(b);
 const [guardadas,setGuardadas]=useState(()=>({clave,p:leerPosiciones(clave)}));
 if(guardadas.clave!==clave)setGuardadas({clave,p:leerPosiciones(clave)});
 const posiciones=useMemo(()=>disponer(grafo,guardadas.p),[grafo,guardadas.p]);
 const [eleccion,setSeleccion]=useState<string|null>('nucleo');
 const seleccion=eleccion&&grafo.nodos.some(n=>n.id===eleccion)?eleccion:null;
 const [nuevos,setNuevos]=useState<ReadonlySet<string>>(new Set());
 const [aviso,setAviso]=useState<{texto:string;tono:'error'|'info';n:number}|null>(null);
 const bRef=useRef(b);
 useEffect(()=>{bRef.current=b;},[b]);
 const temporizadores=useRef<number[]>([]);
 useEffect(()=>()=>temporizadores.current.forEach(clearTimeout),[]);
 const despues=(ms:number,f:()=>void)=>{temporizadores.current.push(window.setTimeout(f,ms));};
 const avisar=useCallback((texto:string,tono:'error'|'info'='error')=>{
  const n=Date.now();setAviso({texto,tono,n});
  temporizadores.current.push(window.setTimeout(()=>setAviso(a=>a?.n===n?null:a),4200));
 },[]);
 const fijarPosicion=useCallback((cambios:Record<string,Punto>)=>{
  setGuardadas(g=>{const p={...g.p,...cambios};guardarPosiciones(g.clave,p);return {clave:g.clave,p};});
 },[]);

 /** Aplica operaciones en orden sobre el último borrador; si una falla, no cambia nada y avisa. */
 function ejecutar(ops:Operacion[],punto?:Punto,info?:string){
  const antes=bRef.current;let nuevo=antes;
  try{for(const o of ops)nuevo=aplicar(nuevo,o);}catch(e){avisar(mensajeError(e,'No se pudo hacer ese cambio.'));return;}
  bRef.current=nuevo;setB(nuevo);
  if(info)avisar(info,'info');
  if(ops.every(o=>o.op==='fijar'))return;
  const previos=new Set(aGrafo(antes,contextoGrafo).nodos.map(n=>n.id));
  const creados=aGrafo(nuevo,contextoGrafo).nodos.filter(n=>!previos.has(n.id)).map(n=>n.id);
  if(!creados.length)return;
  if(punto)fijarPosicion({[creados[0]]:punto});
  const conjunto=new Set(creados);setNuevos(conjunto);setSeleccion(creados[0]);
  despues(700,()=>setNuevos(s=>s===conjunto?new Set():s));
 }
 const operar=(o:Operacion,punto?:Punto)=>ejecutar([o],punto);

 /** Soltar un cable sobre un nodo compatible: un módulo cambia de acción (se copia y se quita del origen). */
 function conectar(origen:{nodo:string;puerto:string},destino:string){
  if(grafo.cables.some(c=>c.desde.nodo===origen.nodo&&c.hasta.nodo===destino))return;
  const n=grafo.nodos.find(x=>x.id===destino),o=grafo.nodos.find(x=>x.id===origen.nodo);if(!n||!o)return;
  if(!MODULOS.includes(n.tipo)){avisar(`«${n.titulo}» ya está unido a su sitio. Para usarlo en otro lugar, duplícalo.`,'info');return;}
  let fragmento;try{fragmento=copiar(bRef.current,destino);}catch(e){avisar(mensajeError(e,'No se pudo mover ese módulo.'));return;}
  ejecutar([{op:'pegar',fragmento,padre:origen.nodo},{op:'quitar',nodo:destino}],undefined,`${NOMBRE_TIPO[n.tipo]} pasa a «${o.titulo}».`);
 }

 const clase=claseDe(b,ctx);
 const iClase=CLASES_YUGEN.indexOf(clase.clase as typeof CLASES_YUGEN[number]);
 const siguiente=UMBRALES_CLASE[iClase+1];
 const errores=grafo.nodos.filter(n=>n.error);
 const lleva=NUCLEO_LLEVA[b.tipo]||[];
 const agregar=(tipo:TipoNodo)=>operar({op:'agregar',tipo,padre:'nucleo'});

 const contenido=(n:Nodo):ContenidoNodo=>{
  if(n.tipo==='nucleo')return {
   icono:b.icono||(b.ramaMonstruo?'bestia':ICONO_CREACION[b.tipo]),
   pie:<div className="yq-forjar-rapido">{lleva.map(t=><button type="button" key={t} data-familia={familiaDe(t)} onClick={()=>agregar(t)}>+ {t==='cuando'?'Regla':NOMBRE_TIPO[t]}</button>)}</div>,
   editor:<EditorNucleo b={b} nodo={n} operar={o=>operar(o)} ctx={ctx}/>,
  };
  if(n.tipo==='accion'){const e=b.efectos[n.ruta[1] as number];return {icono:e?ICONO_EFECTO[e.efecto]:undefined,editor:<EditorAccion b={b} nodo={n} operar={o=>operar(o)}/>};}
  return {};
 };

 return <div className="yq-taller">
  <header className="yq-barra">
   <span className="yq-barra-runa"><Runa seccion="forja" size={30}/></span>
   <div className="yq-barra-titulo"><small>El Yunque</small><h1>{b.nombre.trim()||'Nueva creación'}</h1></div>
   <span className="yq-barra-tipo"><IconoYugen id={b.ramaMonstruo?'bestia':ICONO_CREACION[b.tipo]} size={16}/>{b.ramaMonstruo?'Monstruo':TIPOS.find(t=>t.valor===b.tipo)?.nombre}</span>
   <span className="yq-barra-clase" title="Clase calculada con los atributos, la acción más potente, los bonos pasivos y las reglas"><b>{clase.clase}</b><span>Clase · {clase.puntuacion} pts</span></span>
   {errores.length>0&&<button type="button" className="yq-barra-errores" onClick={()=>setSeleccion(errores[0].id)}><span aria-hidden="true">!</span>{errores.length===1?'1 nodo por revisar':`${errores.length} nodos por revisar`}</button>}
   <button type="button" className="yq-forjar" disabled={guardando} onClick={()=>void onGuardar()}><Hammer size={16} aria-hidden="true"/>{guardando?'Forjando…':'Forjar'}</button>
  </header>
  {error&&<p role="alert" className="yq-error-global">{error}</p>}
  <aside className="yq-panel yq-grimorio" aria-label="Grimorio">
   <h2><IconoYugen id="libro" size={18}/>Grimorio</h2>
   <p className="yq-panel-voz">Forja piezas nuevas o tira de un puerto <i className="yq-punto" aria-hidden="true"/> hasta el vacío.</p>
   <div className="yq-grimorio-piezas">{lleva.map(t=><button type="button" key={t} data-familia={familiaDe(t)} onClick={()=>agregar(t)}>
    <IconoYugen id={t==='cuando'?'libro':ICONO_TIPO[t]} size={22}/><span><strong>{t==='cuando'?'Regla':NOMBRE_TIPO[t]}</strong><small>{t==='accion'?'Se usa en el turno':t==='cuando'?'Cuándo → si → entonces':'Funciona sola'}</small></span>
   </button>)}</div>
   <h3>En el lienzo</h3>
   <ol className="yq-indice">{grafo.nodos.map(n=><li key={n.id}><button type="button" aria-current={seleccion===n.id||undefined} data-familia={familiaDe(n.tipo)} onClick={()=>setSeleccion(n.id)} style={{paddingLeft:8+Math.min(3,n.ruta.length>2?2:n.tipo==='nucleo'?0:1)*12}}>
    <span className="yq-indice-punto" aria-hidden="true"/><span>{n.titulo}</span>{n.error&&<b aria-label="con error">!</b>}
   </button></li>)}</ol>
  </aside>
  <section className="yq-centro" aria-label="Lienzo">
   <Lienzo grafo={grafo} posiciones={posiciones} seleccion={seleccion} nuevos={nuevos}
    onMover={(id,p)=>fijarPosicion({[id]:p})} onSeleccionar={setSeleccion} onConectar={conectar} onOperar={operar} contenido={contenido}/>
   {aviso&&<p key={aviso.n} role="status" className={`yq-aviso is-${aviso.tono}`}>{aviso.texto}</p>}
  </section>
  <aside className="yq-panel yq-arena" aria-label="Arena de dolls">
   <h2><IconoYugen id="espada" size={18}/>Arena de dolls</h2>
   <div className="yq-clase">
    <div className="yq-clase-letra"><b>{clase.clase}</b></div>
    <div><strong>{clase.puntuacion} puntos de poder</strong><small>{siguiente!==undefined?`Clase ${CLASES_YUGEN[iClase+1]} desde ${siguiente}`:'La clase más alta'}</small></div>
   </div>
   {siguiente!==undefined&&<BarraVital etiqueta="Hacia la siguiente clase" tipo="exp" valor={Math.round((clase.puntuacion-UMBRALES_CLASE[iClase])*10)/10} max={siguiente-UMBRALES_CLASE[iClase]}/>}
   <dl className="yq-desglose">
    <div><dt>Atributos</dt><dd>{Math.round(clase.atributos*100)/100}</dd></div>
    <div><dt>Acción más fuerte</dt><dd>{Math.round(clase.acciones*100)/100}</dd></div>
    <div><dt>Bonos pasivos</dt><dd>{Math.round(clase.pasivas*100)/100}</dd></div>
    <div><dt>Reglas</dt><dd>{Math.round(clase.reglas*100)/100}</dd></div>
   </dl>
   <h3>Por revisar</h3>
   {errores.length?<ul className="yq-revisar">{errores.map(n=><li key={n.id}><button type="button" onClick={()=>setSeleccion(n.id)}><b>{n.titulo}</b><span>{n.error}</span></button></li>)}</ul>
    :<p className="yq-panel-voz">Nada que corregir. Kuroi asiente.</p>}
   <div className="yq-arena-dormida"><IconoYugen id="espectro" size={40}/><p>Los dolls aún duermen. Pronto probarás aquí cada acción contra el saco de golpes.</p></div>
  </aside>
 </div>;
}
