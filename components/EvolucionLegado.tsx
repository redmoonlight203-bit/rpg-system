"use client";
// Evolución y legado: etapas de vida, evoluciones y su árbol, editados como en un RPG (sin JSON).
// Se usa en la Forja (plantilla) y en la ficha del GM (instancia). La transformación temporal sigue en sus habilidades.
import './evolucion.css';
import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {publicarArchivoImagen} from '../lib/imagenes-storage';
import {mensajeError} from '../lib/errores';
import {EditorReglas} from './EditorReglas';
import EditorHuella from './EditorHuella';
import SelectorVFX from './SelectorVFX';
import SelectorCreacionVisual from './SelectorCreacionVisual';
import EditorDefensas from './yunque/editores/EditorDefensas';
import {SLOTS} from '../lib/creacion';
import {
 TIPOS_FORMA,MODOS_TRANSICION,REQUISITOS,LIMITES,aFormasHistoria,compararEtapas,crearEtapaDesde,creariaCiclo,desdeFormasHistoria,disponerArbol,
 etapaDe,habilidadesEtapa,lineaVacia,validarLinea,
 type EtapaEvolutiva,type Hitos,type LineaEvolutiva,type ModoTransicion,type RegistroEtapa,type RequisitoEvolucion,type TipoRequisito,type TransicionEvolutiva,
} from '../lib/evolucion';

export type OpcionCatalogo={id:string;nombre:string;tipo_creacion?:string;imagen_url?:string;descripcion?:string;clase?:string;slot_tipo?:string;configuracion_dados?:{efecto?:string}[]};
type Atributo={clave:string;etiqueta:string};
export type InstanciaEvolucion={etapa_actual:string;historial:RegistroEtapa[];hitos:Hitos};
type Props={
 linea:LineaEvolutiva|null;
 onChange:(l:LineaEvolutiva|null)=>void;
 catalogo:OpcionCatalogo[];
 atributos:Atributo[];
 statsBase:Record<string,number>;
 nombre:string;
 /** Formas antiguas (`formas_historia`): se ofrecen como punto de partida, nunca se borran. */
 formasAntiguas?:{nombre:string;historia:string;imagen:string}[];
 instancia?:InstanciaEvolucion;
 /** Solo GM, en una instancia: aplicar una transición conectada a la etapa actual. */
 onAplicar?:(t:TransicionEvolutiva,forzar:boolean)=>void;
 /** Clase calculada con el método vigente (simulación de balance) de una etapa. */
 claseEtapa?:(e:EtapaEvolutiva,registrar:(clase:string)=>void)=>ReactNode;
 ocupado?:boolean;
};
type Vista='tiempo'|'arbol'|'comparar';

const inicial=(n:string)=>(n.trim()[0]||'?').toUpperCase();
function Retrato({e,clase=''}:{e:Pick<EtapaEvolutiva,'nombre'|'retrato'>;clase?:string}){
 // eslint-disable-next-line @next/next/no-img-element
 return <span className={`evo-retrato ${clase}`}>{e.retrato?<img src={e.retrato} alt="" referrerPolicy="no-referrer"/>:inicial(e.nombre)}</span>;
}
const subtitulo=(e:EtapaEvolutiva)=>[TIPOS_FORMA[e.tipo].nombre,e.edad!==undefined?`${e.edad} ${e.edad===1?'año':'años'}`:'',e.acontecimiento?.capitulo||''].filter(Boolean).join(' · ');

export default function EvolucionLegado(props:Props){
 const {linea,onChange,catalogo,atributos,statsBase,nombre,formasAntiguas,instancia,onAplicar,claseEtapa,ocupado}=props;
 const [vista,setVista]=useState<Vista>('tiempo');
 const [sel,setSel]=useState<string|null>(null);
 const [selT,setSelT]=useState<string|null>(null);
 const error=useMemo(()=>validarLinea(linea),[linea]);
 if(!linea){
  const antiguas=desdeFormasHistoria(formasAntiguas,statsBase);
  return <section className="evo" aria-label="Evolución y legado">
   <div className="evo-cab"><h3>Evolución y legado</h3></div>
   <p className="evo-nota">Etapas de vida (crecer), evoluciones (cambiar de naturaleza o especie) y su árbol. Las transformaciones temporales se siguen creando como habilidades y partirán de la etapa que esté vigente.</p>
   <div className="evo-acciones">
    <button type="button" className="evo-boton is-primario" onClick={()=>onChange(lineaVacia(nombre||'Origen',statsBase))}>Empezar con una etapa de vida</button>
    <button type="button" className="evo-boton" onClick={()=>onChange(lineaVacia(nombre||'Forma inicial',statsBase,'evolucion'))}>Empezar una línea evolutiva</button>
    {antiguas&&<button type="button" className="evo-boton" onClick={()=>onChange(antiguas)}>Convertir sus {formasAntiguas!.length} formas en etapas de vida</button>}
   </div>
  </section>;
 }
 const l=linea;
 const etapa=l.etapas.find(e=>e.id===sel)||null;
 const transicion=l.transiciones.find(t=>t.id===selT)||null;
 const vividas=new Set(instancia?.historial.map(h=>h.etapa_id)||[]);
 const actual=instancia?.etapa_actual??l.inicial;
 const cambiarEtapa=(e:EtapaEvolutiva)=>onChange({...l,etapas:l.etapas.map(x=>x.id===e.id?e:x)});
 const cambiarT=(t:TransicionEvolutiva)=>onChange({...l,transiciones:l.transiciones.map(x=>x.id===t.id?t:x)});
 const eliminarEtapa=(id:string)=>{
  if(id===l.inicial||id===instancia?.etapa_actual||vividas.has(id))return;
  onChange({...l,etapas:l.etapas.filter(e=>e.id!==id),transiciones:l.transiciones.filter(t=>t.desde!==id&&t.hasta!==id)});setSel(null);
 };
 const crearDesde=(id:string)=>{const r=crearEtapaDesde(l,id);onChange(r.linea);setSel(r.etapa.id);setSelT(null);};
 const conectar=(desde:string,hasta:string)=>{
  if(creariaCiclo(l,desde,hasta)||hasta===l.inicial||l.transiciones.some(t=>t.desde===desde&&t.hasta===hasta))return false;
  const t:TransicionEvolutiva={id:crypto.randomUUID(),desde,hasta,requisito:{tipo:'autorizacion_gm'},modo:'manual_gm'};
  onChange({...l,etapas:l.etapas.map(e=>e.id===desde?{...e,final:false}:e),transiciones:[...l.transiciones,t]});setSelT(t.id);setSel(null);return true;
 };
 const siguientes=instancia?l.transiciones.filter(t=>t.desde===instancia.etapa_actual&&!instancia.hitos.rutas_cerradas?.includes(t.id)):[];
 return <section className="evo" aria-label="Evolución y legado">
  <div className="evo-cab">
   <h3>Evolución y legado · {nombre||'Sin nombre'}</h3>
   <div className="evo-pestanas" role="group" aria-label="Vista">
    {([['tiempo','Línea temporal'],['arbol','Árbol evolutivo'],['comparar','Comparador']] as const).map(([v,t])=><button key={v} type="button" aria-pressed={vista===v} onClick={()=>setVista(v)}>{t}</button>)}
   </div>
  </div>
  {error&&<p role="alert" className="evo-aviso">{error}</p>}
  {vista==='tiempo'&&<LineaTemporal linea={l} actual={actual} vividas={vividas} sel={sel} onSel={id=>{setSel(id);setSelT(null);}}/>}
  {vista==='arbol'&&<ArbolEvolutivo linea={l} actual={actual} vividas={vividas} cerradas={instancia?.hitos.rutas_cerradas||[]} sel={sel} selT={selT}
    onSel={id=>{setSel(id);setSelT(null);}} onSelT={id=>{setSelT(id);setSel(null);}} onMover={(id,pos)=>cambiarEtapa({...etapaDe(l,id),pos})} onConectar={conectar}/>}
  {vista==='comparar'&&<Comparador linea={l} catalogo={catalogo} atributos={atributos}/>}
  <div className="evo-acciones">
   <button type="button" className="evo-boton is-primario" disabled={!etapa&&!actual||l.etapas.length>=LIMITES.etapas} onClick={()=>crearDesde(etapa?.id||actual)}>Crear etapa desde {etapa?`«${etapa.nombre}»`:'la actual'}</button>
   <button type="button" className="evo-boton" disabled={l.etapas.length>=LIMITES.etapas} onClick={()=>{const e:EtapaEvolutiva={id:crypto.randomUUID(),tipo:'evolucion',nombre:'Nueva evolución',stats:{...statsBase},habilidades:[],pasivas:[]};onChange({...l,etapas:[...l.etapas,e]});setSel(e.id);}}>+ Etapa en blanco</button>
   {!instancia&&<button type="button" className="evo-boton is-peligro" onClick={()=>onChange(null)}>Quitar línea evolutiva</button>}
  </div>
  {instancia&&onAplicar&&<div className="evo-panel" aria-label="Siguientes pasos">
   <h4>Siguientes pasos desde «{etapaDe(l,instancia.etapa_actual).nombre}»</h4>
   {!siguientes.length&&<p className="evo-nota">Etapa final: no hay evoluciones abiertas.</p>}
   {siguientes.map(t=><div key={t.id} className="evo-acciones" style={{alignItems:'center'}}>
    <span>→ <b>{etapaDe(l,t.hasta).nombre}</b> · {MODOS_TRANSICION[t.modo]}</span>
    <button type="button" className="evo-boton is-primario" disabled={ocupado} onClick={()=>onAplicar(t,false)}>Evolucionar</button>
    <button type="button" className="evo-boton" disabled={ocupado} title="Ignora los requisitos y lo deja registrado en el historial" onClick={()=>onAplicar(t,true)}>Forzar (GM)</button>
   </div>)}
  </div>}
  {etapa&&<EditorEtapa key={etapa.id} etapa={etapa} linea={l} catalogo={catalogo} atributos={atributos} vivida={vividas.has(etapa.id)&&etapa.id!==instancia?.etapa_actual}
    onChange={cambiarEtapa} onEliminar={()=>eliminarEtapa(etapa.id)} bloqueoEliminar={etapa.id===l.inicial||etapa.id===instancia?.etapa_actual||vividas.has(etapa.id)}
    onInicial={()=>onChange({...l,inicial:etapa.id})} claseEtapa={claseEtapa}/>}
  {transicion&&<EditorTransicion key={transicion.id} t={transicion} linea={l} catalogo={catalogo} atributos={atributos} onChange={cambiarT}
    onEliminar={()=>{onChange({...l,transiciones:l.transiciones.filter(x=>x.id!==transicion.id)});setSelT(null);}}/>}
  <p className="evo-nota">Las etapas ya vividas guardan su propia copia en el historial: cambiar aquí una estadística no altera el pasado. En la Forja se configura la plantilla; cada personaje o criatura evoluciona sobre su propia copia.</p>
 </section>;
}

export function LineaTemporal({linea,actual,vividas,sel,onSel,historial}:{linea:LineaEvolutiva;actual:string;vividas:Set<string>;sel:string|null;onSel:(id:string)=>void;historial?:RegistroEtapa[]}){
 // Orden de la línea: lo vivido primero (por fecha), después la rama principal desde la actual.
 const orden=useMemo(()=>{
  const ids:string[]=[];const visto=new Set<string>();
  for(const h of historial||[])if(!visto.has(h.etapa_id)){visto.add(h.etapa_id);ids.push(h.etapa_id);}
  const niveles=disponerArbol(linea);
  for(const e of [...linea.etapas].sort((a,b)=>(niveles[a.id].y-niveles[b.id].y)||(niveles[a.id].x-niveles[b.id].x)))if(!visto.has(e.id)){visto.add(e.id);ids.push(e.id);}
  return ids.filter(id=>linea.etapas.some(e=>e.id===id));
 },[linea,historial]);
 return <ol className="evo-tiempo" aria-label="Línea temporal">
  {orden.map(id=>{const e=etapaDe(linea,id);const bloqueada=!vividas.has(id)&&id!==actual&&vividas.size>0;
   return <li key={id} style={{listStyle:'none'}}><button type="button" className={`evo-hito${bloqueada?' is-bloqueada':''}`} aria-current={id===actual} aria-pressed={sel===id} onClick={()=>onSel(id)}>
    <Retrato e={e}/>
    <strong>{e.nombre}</strong>
    <small>{subtitulo(e)}</small>
    <span className={`evo-sello ${id===actual?'is-actual':e.tipo==='etapa_vida'?'is-vida':'is-evolucion'}`}>{id===actual?'Actual':bloqueada?(e.secreta?'Secreta':'Bloqueada'):TIPOS_FORMA[e.tipo].nombre}</span>
   </button></li>;})}
 </ol>;
}

const ANCHO=170,ALTO=58,PASO_X=200,PASO_Y=110;
export function ArbolEvolutivo({linea,actual,vividas,cerradas,sel,selT,onSel,onSelT,onMover,onConectar}:{linea:LineaEvolutiva;actual:string;vividas:Set<string>;cerradas:string[];sel:string|null;selT:string|null;onSel:(id:string)=>void;onSelT:(id:string)=>void;onMover:(id:string,p:{x:number;y:number})=>void;onConectar:(a:string,b:string)=>boolean}){
 const auto=useMemo(()=>disponerArbol(linea),[linea]);
 const [origen,setOrigen]=useState<string|null>(null);
 const [arrastre,setArrastre]=useState<{id:string;dx:number;dy:number;x:number;y:number}|null>(null);
 const [aviso,setAviso]=useState('');
 const svg=useRef<SVGSVGElement>(null);
 const pos=(id:string)=>{const e=etapaDe(linea,id);const p=arrastre?.id===id?{x:arrastre.x,y:arrastre.y}:e.pos??auto[id];return {x:p.x*PASO_X,y:p.y*PASO_Y};};
 const todas=linea.etapas.map(e=>pos(e.id));
 const minX=Math.min(...todas.map(p=>p.x))-ANCHO,maxX=Math.max(...todas.map(p=>p.x))+ANCHO,maxY=Math.max(...todas.map(p=>p.y))+ALTO+40;
 const punto=(ev:React.PointerEvent)=>{const r=svg.current!.getBoundingClientRect();return {x:(ev.clientX-r.left+minX)/PASO_X,y:(ev.clientY-r.top-ALTO/2-14)/PASO_Y};};
 const pulsar=(id:string)=>{
  if(origen){if(origen!==id){setAviso(onConectar(origen,id)?'':'Esa conexión no es válida: crearía un ciclo, ya existe o vuelve a la etapa inicial.');}setOrigen(null);return;}
  onSel(id);
 };
 return <div className="evo-panel">
  <div className="evo-acciones" style={{alignItems:'center'}}>
   <button type="button" className="evo-boton" aria-pressed={!!origen} disabled={!sel&&!origen} onClick={()=>setOrigen(origen?null:sel)}>{origen?'Elige la etapa destino… (cancelar)':'Conectar desde la etapa elegida'}</button>
   <span className="evo-nota">Arrastra las etapas para ordenarlas. Pulsa una línea para editar sus requisitos.</span>
  </div>
  {aviso&&<p role="alert" className="evo-aviso">{aviso}</p>}
  <div className="evo-arbol">
   <svg ref={svg} width={Math.max(320,maxX-minX)} height={Math.max(160,maxY)} viewBox={`${minX} ${-ALTO/2-14} ${Math.max(320,maxX-minX)} ${Math.max(160,maxY)}`} role="group" aria-label="Árbol evolutivo"
    onPointerMove={ev=>{if(arrastre){const p=punto(ev);setArrastre({...arrastre,x:Math.round((p.x-arrastre.dx)*4)/4,y:Math.round((p.y-arrastre.dy)*4)/4});}}}
    onPointerUp={()=>{if(arrastre){onMover(arrastre.id,{x:arrastre.x,y:Math.max(0,arrastre.y)});setArrastre(null);}}}>
    {linea.transiciones.map(t=>{const a=pos(t.desde),b=pos(t.hasta);const d=`M${a.x},${a.y+ALTO/2} C${a.x},${(a.y+b.y)/2+ALTO/2} ${b.x},${(a.y+b.y)/2} ${b.x},${b.y-ALTO/2}`;
     const cls=`evo-arista${t.secreta?' is-secreta':''}${selT===t.id?' is-elegida':''}${cerradas.includes(t.id)?' is-cerrada':''}`;
     return <g key={t.id}><path className={cls} d={d} markerEnd="url(#evo-flecha)"/><path className="evo-arista-zona" d={d} role="button" tabIndex={0} aria-label={`Conexión ${etapaDe(linea,t.desde).nombre} → ${etapaDe(linea,t.hasta).nombre}`} onClick={()=>onSelT(t.id)} onKeyDown={e=>{if(e.key==='Enter')onSelT(t.id);}}/></g>;})}
    <defs><marker id="evo-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" style={{color:'var(--color-gold-soft)'}}/></marker></defs>
    {linea.etapas.map(e=>{const p=pos(e.id);const bloqueada=vividas.size>0&&!vividas.has(e.id)&&e.id!==actual;
     return <g key={e.id} className={`evo-nodo${sel===e.id?' is-seleccion':''}${e.id===actual?' is-actual':''}${origen===e.id?' is-origen':''}${bloqueada?' is-bloqueada':''}`} transform={`translate(${p.x-ANCHO/2},${p.y-ALTO/2})`}
      tabIndex={0} role="button" aria-label={`${e.nombre}${e.id===actual?' (actual)':''}`}
      onPointerDown={ev=>{if(origen)return;const q=punto(ev),b=e.pos??auto[e.id];(ev.target as Element).setPointerCapture?.(ev.pointerId);setArrastre({id:e.id,dx:q.x-b.x,dy:q.y-b.y,x:b.x,y:b.y});}}
      onClick={()=>pulsar(e.id)} onKeyDown={ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();pulsar(e.id);}}}>
      <rect width={ANCHO} height={ALTO}/>
      <text x={12} y={22}>{e.nombre.length>22?e.nombre.slice(0,21)+'…':e.nombre}</text>
      <text className="evo-nodo-tipo" x={12} y={42}>{e.secreta?'🔒 ':''}{TIPOS_FORMA[e.tipo].nombre}{e.final?' · final':''}{e.id===linea.inicial?' · inicio':''}</text>
     </g>;})}
   </svg>
  </div>
 </div>;
}

export function Comparador({linea,catalogo,atributos}:{linea:LineaEvolutiva;catalogo:OpcionCatalogo[];atributos:Atributo[]}){
 const [a,setA]=useState(linea.etapas[0].id),[b,setB]=useState(linea.etapas[Math.min(1,linea.etapas.length-1)].id);
 const ea=linea.etapas.find(e=>e.id===a)||linea.etapas[0],eb=linea.etapas.find(e=>e.id===b)||linea.etapas[0];
 const r=compararEtapas(ea,eb);const nombreDe=(id:string)=>catalogo.find(c=>c.id===id)?.nombre||'Poder no disponible';
 const etiqueta=(k:string)=>atributos.find(x=>x.clave===k)?.etiqueta||k.replaceAll('_',' ');
 return <div className="evo-panel" aria-label="Comparador de estadísticas">
  <div className="evo-rejilla">
   {([['Antes',a,setA],['Después',b,setB]] as const).map(([t,v,f])=><label key={t} className="evo-campo"><span>{t}</span><select value={v} onChange={e=>f(e.target.value)}>{linea.etapas.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label>)}
  </div>
  <div className="evo-previa" aria-hidden="true"><Retrato e={ea} clase="is-antes"/><Retrato e={eb} clase="is-despues"/></div>
  <table className="evo-stats"><thead><tr><th>Atributo</th><th>{ea.nombre}</th><th>{eb.nombre}</th><th>Cambio</th></tr></thead>
   <tbody>{r.stats.map(d=><tr key={d.clave}><th scope="row">{etiqueta(d.clave)}</th><td>{d.antes??'—'}</td><td>{d.despues??'—'}</td><td className={d.delta>0?'evo-sube':d.delta<0?'evo-baja':''}>{d.delta>0?'+':''}{d.delta||''}</td></tr>)}</tbody></table>
  {(r.ganadas.length>0||r.perdidas.length>0)&&<p className="evo-nota">{r.ganadas.length?<>Gana: {r.ganadas.map(nombreDe).join(', ')}. </>:null}{r.perdidas.length?<>Pierde: {r.perdidas.map(nombreDe).join(', ')}.</>:null}</p>}
 </div>;
}

function EditorEtapa({etapa,linea,catalogo,atributos,vivida,onChange,onEliminar,bloqueoEliminar,onInicial,claseEtapa}:{etapa:EtapaEvolutiva;linea:LineaEvolutiva;catalogo:OpcionCatalogo[];atributos:Atributo[];vivida:boolean;onChange:(e:EtapaEvolutiva)=>void;onEliminar:()=>void;bloqueoEliminar:boolean;onInicial:()=>void;claseEtapa?:Props['claseEtapa']}){
 const [subiendo,setSubiendo]=useState<'retrato'|'sprite'|null>(null);
 const [errorImagen,setErrorImagen]=useState('');
 const [nuevo,setNuevo]=useState('');
 // La subida termina después de otros cambios: se aplica sobre la etapa más reciente.
 const vigente=useRef(etapa);useEffect(()=>{vigente.current=etapa;},[etapa]);
 const de=(tipo:string)=>catalogo.filter(c=>c.tipo_creacion===tipo);
 const transformaciones=de('habilidad').filter(c=>c.configuracion_dados?.some(d=>d.efecto==='transformacion'));
 const claves=[...new Set([...atributos.map(a=>a.clave).filter(k=>!['nivel','experiencia','exp_total'].includes(k)),...Object.keys(etapa.stats)])];
 const etiqueta=(k:string)=>atributos.find(x=>x.clave===k)?.etiqueta||k.replaceAll('_',' ');
 const subir=async(campo:'retrato'|'sprite',archivo:File)=>{setSubiendo(campo);setErrorImagen('');try{const url=await publicarArchivoImagen(archivo);onChange({...vigente.current,[campo]:url});}catch(e){setErrorImagen(mensajeError(e,'No se pudo subir la imagen.'));}finally{setSubiendo(null);}};
 const texto=(campo:'apariencia'|'historia'|'personalidad'|'descripcion',titulo:string)=><label className="evo-campo"><span>{titulo}</span><textarea rows={3} maxLength={LIMITES.texto} value={etapa[campo]||''} onChange={e=>onChange({...etapa,[campo]:e.target.value})}/></label>;
 const equipo=etapa.equipamiento||[];
 return <div className="evo-panel" aria-label={`Etapa ${etapa.nombre}`}>
  <div className="evo-cab"><h4>{etapa.nombre}{vivida?' · registro histórico':''}</h4>{claseEtapa?.(etapa,clase=>onChange({...etapa,clase}))}</div>
  {vivida&&<p className="evo-nota">Ya vivida: el historial conserva su propia copia. Lo que cambies aquí solo afecta a esta línea, no al pasado registrado.</p>}
  <div className="evo-rejilla">
   <label className="evo-campo"><span>Nombre de la etapa</span><input maxLength={LIMITES.nombre} value={etapa.nombre} onChange={e=>onChange({...etapa,nombre:e.target.value})}/></label>
   <label className="evo-campo"><span>Clase de forma</span><select value={etapa.tipo} onChange={e=>onChange({...etapa,tipo:e.target.value as EtapaEvolutiva['tipo']})}><option value="etapa_vida">{TIPOS_FORMA.etapa_vida.nombre}</option><option value="evolucion">{TIPOS_FORMA.evolucion.nombre}</option></select></label>
   <label className="evo-campo"><span>Edad (opcional)</span><input type="number" min={0} max={100000} value={etapa.edad??''} onChange={e=>onChange({...etapa,edad:e.target.value===''?undefined:Math.max(0,Number(e.target.value))})}/></label>
   <label className="evo-campo"><span>Raza o especie</span><input value={etapa.raza||''} placeholder="Se conserva" onChange={e=>onChange({...etapa,raza:e.target.value||undefined})}/></label>
  </div>
  <p className="evo-nota">{TIPOS_FORMA[etapa.tipo].ayuda}</p>
  <div className="evo-rejilla">
   {(['retrato','sprite'] as const).map(campo=><div key={campo} className="evo-campo"><span>{campo==='retrato'?'Retrato':'Sprite de combate'}</span>
    {etapa[campo]&&<Retrato e={{nombre:etapa.nombre,retrato:etapa[campo]}}/>}
    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!subiendo} aria-label={`Subir ${campo}`} onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';if(f)void subir(campo,f);}}/>
    <input type="url" placeholder="o URL pública" value={etapa[campo]?.startsWith('data:')?'':etapa[campo]||''} onChange={e=>onChange({...etapa,[campo]:e.target.value||undefined})}/>
   </div>)}
  </div>
  {subiendo&&<p role="status" className="evo-nota">Subiendo imagen…</p>}
  {errorImagen&&<p role="alert" className="evo-aviso">{errorImagen}</p>}
  <div className="evo-rejilla">{texto('descripcion','Descripción')}{texto('apariencia','Apariencia')}{texto('personalidad','Personalidad')}{texto('historia','Historia de esta etapa')}</div>
  <fieldset className="evo-panel"><legend>Acontecimiento de la campaña</legend><div className="evo-rejilla">
   {(['fecha','capitulo','evento'] as const).map(k=><label key={k} className="evo-campo"><span>{k==='fecha'?'Fecha':k==='capitulo'?'Capítulo':'Acontecimiento'}</span><input value={etapa.acontecimiento?.[k]||''} onChange={e=>onChange({...etapa,acontecimiento:{...etapa.acontecimiento,[k]:e.target.value||undefined}})}/></label>)}
  </div></fieldset>
  <details open><summary><b>Estadísticas y HP máximos</b></summary>
   <p className="evo-nota">Valores totales de la etapa con los atributos de Reglas y estadísticas. El nivel y la experiencia nunca cambian al evolucionar.</p>
   <table className="evo-stats"><tbody>{claves.map(k=><tr key={k}><th scope="row">{etiqueta(k)}</th><td>{etapa.stats[k]!==undefined?<input type="number" min={k==='vida'?1:-1000000} max={1000000} aria-label={etiqueta(k)} value={etapa.stats[k]} onChange={e=>onChange({...etapa,stats:{...etapa.stats,[k]:Number(e.target.value)}})}/>:<span className="evo-nota">Se conserva</span>}</td>
    <td><button type="button" className="evo-boton" onClick={()=>{const stats={...etapa.stats};if(stats[k]!==undefined)delete stats[k];else stats[k]=0;onChange({...etapa,stats});}}>{etapa.stats[k]!==undefined?'Conservar':'Modificar'}</button></td></tr>)}</tbody></table>
  </details>
  <details><summary><b>Recursos especiales</b> · {Object.keys(etapa.recursos||{}).length}</summary>
   {Object.entries(etapa.recursos||{}).map(([k,v])=><div key={k} className="evo-req-fila"><span>{k}</span><input type="number" min={0} value={v} aria-label={`Máximo de ${k}`} onChange={e=>onChange({...etapa,recursos:{...etapa.recursos,[k]:Number(e.target.value)}})}/><button type="button" className="evo-boton" onClick={()=>{const r={...etapa.recursos};delete r[k];onChange({...etapa,recursos:r});}}>Quitar</button></div>)}
   <div className="evo-req-fila"><input placeholder="núcleo, energía lunar…" value={nuevo} onChange={e=>setNuevo(e.target.value)}/><button type="button" className="evo-boton" disabled={!/^[a-z_][a-z0-9_]{0,63}$/.test(nuevo)} onClick={()=>{onChange({...etapa,recursos:{...etapa.recursos,[nuevo]:0}});setNuevo('');}}>+ Recurso</button></div>
  </details>
  <details><summary><b>Poderes</b> · {habilidadesEtapa(etapa).length} habilidades · {etapa.pasivas.length} pasivas</summary>
   <SelectorCreacionVisual nombre="Habilidades" items={de('habilidad')} value={etapa.habilidades} onChange={habilidades=>onChange({...etapa,habilidades})}/>
   <SelectorCreacionVisual nombre="Habilidades naturales" items={de('habilidad')} value={etapa.habilidades_naturales||[]} onChange={v=>onChange({...etapa,habilidades_naturales:v})}/>
   <SelectorCreacionVisual nombre="MAGIA" items={de('habilidad')} value={etapa.magia||[]} onChange={v=>onChange({...etapa,magia:v})}/>
   <SelectorCreacionVisual nombre="Pasivas" items={de('pasiva')} value={etapa.pasivas} onChange={pasivas=>onChange({...etapa,pasivas})}/>
   <SelectorCreacionVisual nombre="Transformaciones disponibles en esta etapa" items={transformaciones} value={etapa.transformaciones||[]} onChange={v=>onChange({...etapa,transformaciones:v})}/>
  </details>
  <details><summary><b>Pasivas exclusivas de la etapa</b> · {etapa.reglas?.length||0}</summary><EditorReglas value={etapa.reglas||[]} onChange={reglas=>onChange({...etapa,reglas})}/></details>
  <details><summary><b>Resistencias e inmunidades</b> · {etapa.inmunidades?.length||0}</summary><EditorDefensas valor={etapa.inmunidades||[]} porTurnos={false} onChange={inmunidades=>onChange({...etapa,inmunidades})}/></details>
  <details><summary><b>Debilidades</b> · {etapa.debilidades?.length||0}</summary>
   <p className="evo-nota">Registro narrativo de lo que le hace vulnerable. Para que tengan efecto en combate, conviértelas en una pasiva exclusiva.</p>
   <label className="evo-campo"><span>Separadas por comas</span><input value={(etapa.debilidades||[]).join(', ')} onChange={e=>onChange({...etapa,debilidades:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></label>
  </details>
  <EditorHuella titulo="Tamaño y casillas ocupadas" valor={etapa.huella} defecto="Conservar el tamaño actual" onChange={huella=>onChange({...etapa,huella})}/>
  <details><summary><b>Equipamiento de esta etapa (registro)</b> · {equipo.length}</summary>
   <p className="evo-nota">Es un registro histórico: no crea ni entrega objetos reales.</p>
   {SLOTS.filter(s=>s.clave!=='titulo').map(s=>{const pieza=equipo.find(x=>x.slot===s.clave);const opciones=catalogo.filter(c=>c.tipo_creacion==='objeto'&&s.tipos.includes(c.slot_tipo||''));
    return <label key={s.clave} className="evo-campo"><span>{s.nombre}</span><select value={pieza?.forja_id||''} onChange={e=>{const c=opciones.find(o=>o.id===e.target.value);const resto=equipo.filter(x=>x.slot!==s.clave);onChange({...etapa,equipamiento:c?[...resto,{slot:s.clave,nombre:c.nombre,forja_id:c.id}]:resto});}}><option value="">Sin registro</option>{opciones.map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>;})}
  </details>
  <SelectorVFX transformacion valor={etapa.vfx} onChange={vfx=>onChange({...etapa,vfx})}/>
  <div className="evo-acciones">
   <label className="evo-check"><input type="checkbox" checked={!!etapa.secreta} onChange={e=>onChange({...etapa,secreta:e.target.checked||undefined})}/>Secreta para los jugadores hasta desbloquearla</label>
   <label className="evo-check"><input type="checkbox" checked={!!etapa.final} disabled={linea.transiciones.some(t=>t.desde===etapa.id)} onChange={e=>onChange({...etapa,final:e.target.checked||undefined})}/>Etapa final</label>
  </div>
  <div className="evo-acciones">
   {linea.inicial!==etapa.id&&!linea.transiciones.some(t=>t.hasta===etapa.id)&&<button type="button" className="evo-boton" onClick={onInicial}>Usar como etapa inicial</button>}
   <button type="button" className="evo-boton is-peligro" disabled={bloqueoEliminar} title={bloqueoEliminar?'La etapa inicial, la actual y las ya vividas no se eliminan':undefined} onClick={onEliminar}>Eliminar etapa</button>
  </div>
 </div>;
}

function EditorTransicion({t,linea,catalogo,atributos,onChange,onEliminar}:{t:TransicionEvolutiva;linea:LineaEvolutiva;catalogo:OpcionCatalogo[];atributos:Atributo[];onChange:(t:TransicionEvolutiva)=>void;onEliminar:()=>void}){
 const activadores=catalogo.filter(c=>c.tipo_creacion==='habilidad'||c.tipo_creacion==='objeto');
 const r=t.recuperacion||{modo:'ninguna' as const};
 return <div className="evo-panel" aria-label="Conexión evolutiva">
  <h4>{etapaDe(linea,t.desde).nombre} → {etapaDe(linea,t.hasta).nombre}</h4>
  <div className="evo-rejilla">
   <label className="evo-campo"><span>Cómo se activa</span><select value={t.modo} onChange={e=>onChange({...t,modo:e.target.value as ModoTransicion})}>{Object.entries(MODOS_TRANSICION).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   {t.modo==='habilidad_objeto'&&<label className="evo-campo"><span>Habilidad u objeto</span><select value={t.activador||''} onChange={e=>onChange({...t,activador:e.target.value||undefined})}><option value="">Elige…</option>{activadores.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>}
   <label className="evo-campo"><span>Recursos al evolucionar</span><select value={r.modo} onChange={e=>onChange({...t,recuperacion:{...r,modo:e.target.value as typeof r.modo}})}>
    <option value="ninguna">Sin recuperación (se limitan al nuevo máximo)</option><option value="proporcional">Proporcional al nuevo máximo</option><option value="fija">Recupera una cantidad fija</option><option value="completa">Recuperación completa</option></select></label>
   {r.modo==='fija'&&<>{(['vida','ph'] as const).map(k=><label key={k} className="evo-campo"><span>{k==='vida'?'Vida':'PH'}</span><input type="number" min={0} value={r[k]||0} onChange={e=>onChange({...t,recuperacion:{...r,[k]:Math.max(0,Number(e.target.value))}})}/></label>)}</>}
  </div>
  <div className="evo-acciones">
   <label className="evo-check"><input type="checkbox" checked={!!t.exclusiva} onChange={e=>onChange({...t,exclusiva:e.target.checked||undefined})}/>Ruta exclusiva: cierra las demás ramas</label>
   <label className="evo-check"><input type="checkbox" checked={!!t.secreta} onChange={e=>onChange({...t,secreta:e.target.checked||undefined})}/>Secreta para los jugadores</label>
  </div>
  <h4>Requisitos</h4>
  <EditorRequisito valor={t.requisito} onChange={requisito=>onChange({...t,requisito})} catalogo={catalogo} atributos={atributos} profundidad={0}/>
  <button type="button" className="evo-boton is-peligro" onClick={onEliminar}>Eliminar conexión</button>
 </div>;
}

const NUEVO:Record<TipoRequisito,()=>RequisitoEvolucion>={
 siempre:()=>({tipo:'siempre'}),todas:()=>({tipo:'todas',condiciones:[{tipo:'autorizacion_gm'}]}),alguna:()=>({tipo:'alguna',condiciones:[{tipo:'autorizacion_gm'}]}),
 no:()=>({tipo:'no',condicion:{tipo:'evento',clave:''}}),edad:()=>({tipo:'edad',minimo:18}),nivel:()=>({tipo:'nivel',minimo:5}),experiencia:()=>({tipo:'experiencia',minimo:1000}),
 comparar:()=>({tipo:'comparar',atributo:'fuerza',operador:'>=',valor:10}),objeto:()=>({tipo:'objeto',forja_id:''}),habilidad:()=>({tipo:'habilidad',forja_id:''}),
 derrotar:()=>({tipo:'derrotar',forja_id:'',cantidad:1}),mision:()=>({tipo:'mision',clave:''}),energia:()=>({tipo:'energia',clave:'',minimo:10}),nucleo:()=>({tipo:'nucleo',clave:'',minimo:1}),
 salvacion:()=>({tipo:'salvacion',atributo:'salvacion',cd:12}),evento:()=>({tipo:'evento',clave:''}),autorizacion_gm:()=>({tipo:'autorizacion_gm'}),
};
/** Constructor visual de condiciones Y / O / NO con las primitivas del motor. */
export function EditorRequisito({valor,onChange,catalogo,atributos,profundidad,onQuitar}:{valor:RequisitoEvolucion;onChange:(r:RequisitoEvolucion)=>void;catalogo:OpcionCatalogo[];atributos:Atributo[];profundidad:number;onQuitar?:()=>void}){
 const tipo=<select aria-label="Tipo de requisito" value={valor.tipo} onChange={e=>onChange(NUEVO[e.target.value as TipoRequisito]())}>{Object.entries(REQUISITOS).filter(([k])=>profundidad<LIMITES.profundidad-1||!['todas','alguna','no'].includes(k)).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>;
 const quitar=onQuitar&&<button type="button" className="evo-boton" aria-label="Quitar condición" onClick={onQuitar}>✕</button>;
 const num=(v:number,f:(n:number)=>void,etiqueta:string,min=0)=><input type="number" min={min} aria-label={etiqueta} value={v} onChange={e=>f(Number(e.target.value))}/>;
 const creacion=(id:string,tipos:string[],f:(id:string)=>void)=><select aria-label="Creación" value={id} onChange={e=>f(e.target.value)}><option value="">Elige…</option>{catalogo.filter(c=>tipos.includes(c.tipo_creacion||'')).map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select>;
 const clave=(v:string,f:(s:string)=>void,ph:string)=><input value={v} placeholder={ph} maxLength={200} onChange={e=>f(e.target.value)}/>;
 const atributo=(v:string,f:(s:string)=>void)=><select aria-label="Atributo" value={v} onChange={e=>f(e.target.value)}>{[...new Set([v,...atributos.map(a=>a.clave)])].map(k=><option key={k} value={k}>{atributos.find(a=>a.clave===k)?.etiqueta||k}</option>)}</select>;
 if(valor.tipo==='todas'||valor.tipo==='alguna'){
  const lista=valor.condiciones;
  return <div className="evo-req is-grupo"><div className="evo-req-fila">{tipo}<span className="evo-nota">{valor.tipo==='todas'?'Deben cumplirse todas':'Basta con una'}</span>{quitar}</div>
   {lista.map((c,i)=><EditorRequisito key={i} valor={c} catalogo={catalogo} atributos={atributos} profundidad={profundidad+1} onChange={n=>onChange({...valor,condiciones:lista.map((x,j)=>j===i?n:x)})} onQuitar={lista.length>1?()=>onChange({...valor,condiciones:lista.filter((_,j)=>j!==i)}):undefined}/>)}
   <div className="evo-acciones"><button type="button" className="evo-boton" disabled={lista.length>=20} onClick={()=>onChange({...valor,condiciones:[...lista,{tipo:'nivel',minimo:1}]})}>+ Condición</button></div>
  </div>;
 }
 if(valor.tipo==='no')return <div className="evo-req is-no"><div className="evo-req-fila">{tipo}<span className="evo-nota">No debe cumplirse:</span>{quitar}</div>
  <EditorRequisito valor={valor.condicion} catalogo={catalogo} atributos={atributos} profundidad={profundidad+1} onChange={condicion=>onChange({...valor,condicion})}/></div>;
 return <div className="evo-req"><div className="evo-req-fila">{tipo}
  {(valor.tipo==='edad'||valor.tipo==='nivel'||valor.tipo==='experiencia')&&<>mínimo {num(valor.minimo,minimo=>onChange({...valor,minimo}),'Mínimo')}</>}
  {valor.tipo==='comparar'&&<>{atributo(valor.atributo,a=>onChange({...valor,atributo:a}))}<select aria-label="Operador" value={valor.operador} onChange={e=>onChange({...valor,operador:e.target.value as typeof valor.operador})}>{['>=','>','=','<=','<'].map(o=><option key={o}>{o}</option>)}</select>{num(valor.valor,v=>onChange({...valor,valor:v}),'Valor',-1000000)}</>}
  {valor.tipo==='objeto'&&<>{creacion(valor.forja_id,['objeto'],forja_id=>onChange({...valor,forja_id}))}<label className="evo-check"><input type="checkbox" checked={!!valor.consumir} onChange={e=>onChange({...valor,consumir:e.target.checked||undefined})}/>Se consume</label></>}
  {valor.tipo==='habilidad'&&creacion(valor.forja_id,['habilidad','pasiva'],forja_id=>onChange({...valor,forja_id}))}
  {valor.tipo==='derrotar'&&<>{creacion(valor.forja_id,['personaje'],forja_id=>onChange({...valor,forja_id}))} veces {num(valor.cantidad,cantidad=>onChange({...valor,cantidad:Math.max(1,Math.floor(cantidad))}),'Veces',1)}</>}
  {(valor.tipo==='mision'||valor.tipo==='evento')&&clave(valor.clave,c=>onChange({...valor,clave:c}),valor.tipo==='mision'?'Nombre de la misión':'Acontecimiento')}
  {(valor.tipo==='energia'||valor.tipo==='nucleo')&&<>{clave(valor.clave,c=>onChange({...valor,clave:c}),valor.tipo==='energia'?'Energía':'Núcleo')} ≥ {num(valor.minimo,minimo=>onChange({...valor,minimo}),'Cantidad')}</>}
  {valor.tipo==='salvacion'&&<>{atributo(valor.atributo,a=>onChange({...valor,atributo:a}))} CD {num(valor.cd,cd=>onChange({...valor,cd:Math.max(1,Math.min(100,Math.floor(cd)))}),'CD',1)}</>}
  {quitar}
 </div></div>;
}

/** Ficha de solo lectura de una etapa (actual o histórica). Consultarla nunca la vuelve la etapa activa. */
export function FichaEtapa({etapa,catalogo,atributos,registro}:{etapa:EtapaEvolutiva;catalogo:OpcionCatalogo[];atributos:Atributo[];registro?:RegistroEtapa}){
 const nombreDe=(id:string)=>catalogo.find(c=>c.id===id)?.nombre||'Poder del pasado';
 const etiqueta=(k:string)=>atributos.find(x=>x.clave===k)?.etiqueta||k.replaceAll('_',' ');
 return <article className="evo-panel" aria-label={`Ficha de ${etapa.nombre}`}>
  <div className="evo-acciones" style={{alignItems:'center'}}><Retrato e={etapa}/><div><h4>{etapa.nombre}</h4><p className="evo-nota">{subtitulo(etapa)}{etapa.clase?` · Clase ${etapa.clase}`:''}</p>
   {registro?.created_at&&<p className="evo-nota">Alcanzada el {new Date(registro.created_at).toLocaleString('es-DO')} · {({inicial:'Etapa inicial',gm:'Autorizada por el GM',jugador:'Solicitada y aprobada',automatica:'Requisitos cumplidos',combate:'Durante un combate'} as const)[registro.origen]}</p>}</div></div>
  {etapa.descripcion&&<p>{etapa.descripcion}</p>}
  {etapa.apariencia&&<p><b>Apariencia.</b> {etapa.apariencia}</p>}
  {etapa.personalidad&&<p><b>Personalidad.</b> {etapa.personalidad}</p>}
  {etapa.historia&&<p><b>Historia.</b> {etapa.historia}</p>}
  {etapa.acontecimiento?.evento&&<p><b>Acontecimiento.</b> {[etapa.acontecimiento.fecha,etapa.acontecimiento.capitulo,etapa.acontecimiento.evento].filter(Boolean).join(' · ')}</p>}
  {Object.keys(etapa.stats).length>0&&<table className="evo-stats"><tbody>{Object.entries(registro?.ficha.stats||etapa.stats).map(([k,v])=><tr key={k}><th scope="row">{etiqueta(k)}</th><td>{v}</td></tr>)}</tbody></table>}
  {habilidadesEtapa(etapa).length+etapa.pasivas.length>0&&<p className="evo-nota">Poderes: {[...habilidadesEtapa(etapa),...etapa.pasivas].map(nombreDe).join(', ')}</p>}
  {!!etapa.equipamiento?.length&&<p className="evo-nota">Equipo de entonces: {etapa.equipamiento.map(e=>e.nombre).join(', ')}</p>}
 </article>;
}

export {aFormasHistoria};
