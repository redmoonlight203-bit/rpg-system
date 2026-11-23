"use client";
import FondoMapaProcedural from './FondoMapaProcedural';
import {useEffect,useMemo,useRef,useState} from 'react';
import IconoYugen from './IconoYugen';
import {Footprints, Crosshair, Shield, Swords, Sparkles, Backpack, ChevronRight, FlaskConical, X} from 'lucide-react';
import EfectosCombate,{AuraTransformacion} from './EfectosCombate';
import AnimacionesArmas from './AnimacionesArmas';
import type {AnimacionEtapa} from '../lib/vfx';
import {precargarVFX} from '../lib/precarga-vfx';
import FichaAnimada from './FichaAnimada';
import {intensidadHerida,rutaVisual} from '../lib/movimiento-visual';
import RetratoCombate from './RetratoCombate';
import FotoEncuadrada from './FotoEncuadrada';
import {imagenCreacion} from '../lib/arte-creacion';
import Dado3D from './Dado3D';
import {describirEfecto,describirRegla} from '../lib/descripciones';
import {HudOcular,MarcasOculares,PanelOcular,casillasDebiles,estiloOcular,lineaOcular} from './CapaOcular';
import {distanciasMovimiento,lineaVisible,alcanceDesde,areaDesde, type VistaOcular, type MapaCombate,objetivoDelArea, type Accion, type Posicion, type EventoVisual, type CambioVida} from '../lib/combate';
import type {Efecto} from '../lib/creacion';
import type {TiradaVisual} from './AnimacionDados';
import {BarraVital} from './ui/Juego';
import {capaDe,CAPAS,esAccionPropia,objetivoValido,previsualizar,alcanzaCapa,resumenTurno,ranuraDeTecla,leerSegundoClic,guardarSegundoClic,notaPendiente,marcarNota,TUTORIAL_ALCANCE,type Capa,type Instantanea,type Previsualizacion} from '../lib/combate-interfaz';
import '../app/ficha/jugador.css';
import './tablero-combate.css';
import './tablero-campo.css';
import './combate-hud.css';

const TERRENOS:Record<string,[string,string]>={libre:['Terreno abierto','Sin efecto'],muro:['Muro','Bloquea el paso y la visión'],dificil:['Terreno difícil','Cuesta 2 de movimiento'],cobertura:['Cobertura','+2 ARM contra ataques a distancia'],peligro:['Peligro','2 de daño al entrar']};

const eventosMostrados=new Set<string>();
const EVENTO_SEGUNDO_CLIC='yugen:segundo-clic';
/** Preferencia «confirmar con segundo clic», compartida por el tablero y la barra. Activa por defecto en pantallas táctiles. */
function useSegundoClic():[boolean,(v:boolean)=>void]{
 const [valor,setValor]=useState(false);
 useEffect(()=>{
  if(typeof window==='undefined')return;
  const leer=()=>setValor(leerSegundoClic(typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches));
  leer();window.addEventListener?.(EVENTO_SEGUNDO_CLIC,leer);return()=>window.removeEventListener?.(EVENTO_SEGUNDO_CLIC,leer);
 },[]);
 return [valor,v=>{guardarSegundoClic(v);setValor(v);if(typeof window!=='undefined')window.dispatchEvent?.(new Event(EVENTO_SEGUNDO_CLIC));}];
}
const editable=(t:EventTarget|null)=>typeof HTMLElement!=='undefined'&&t instanceof HTMLElement&&(t.isContentEditable||!!t.closest('input,select,textarea'));
export type FichaTablero={vfx?:AnimacionEtapa;id:string;nombre:string;bando:string;vida?:number;max_vida?:number;imagen_url?:string;estados?:string[];posicion:Posicion};
export function TableroCombate({fichas,columnas=12,filas=8,actual,objetivo,moviendo,alcanzables={},ocupado,onObjetivo,onMover,habilidad,lanzador,centro,onApuntar,puedeApuntar=false,evento,mapa,perspectiva,onEjecutar,puedeEjecutar=false,ocular,turnoPropio=false}:{ocular?:VistaOcular|null;turnoPropio?:boolean;fichas:FichaTablero[];columnas?:number;filas?:number;actual?:string|null;objetivo:string;moviendo:boolean;alcanzables?:Record<string,number>;ocupado:boolean;onObjetivo:(id:string)=>void;onMover:(p:Posicion)=>void;habilidad?:Efecto;lanzador?:string;centro?:Posicion|null;onApuntar?:(p:Posicion,id?:string)=>void;puedeApuntar?:boolean;evento?:EventoVisual;mapa?:MapaCombate;perspectiva?:string;
  /** Si existe, un clic sobre un objetivo válido ejecuta la acción (con «segundo clic» activo, el primero solo previsualiza). */
  onEjecutar?:(sel:{objetivo?:string;centro?:Posicion})=>void;puedeEjecutar?:boolean}){
 const [vistaCompleta,setVistaCompleta]=useState(false);
 const [mostrarTechos,setMostrarTechos]=useState(false);
 const [cambios,setCambios]=useState<CambioVida[]>([]);
 useEffect(()=>{
  if(!evento?.id||!evento.creado_en||Date.now()-(evento.recibido_en||evento.creado_en)>10000){setCambios([]);return;}
  if(!eventosMostrados.has(evento.id)){
   eventosMostrados.add(evento.id);if(eventosMostrados.size>200)eventosMostrados.delete(eventosMostrados.values().next().value!);
   setCambios(evento.cambios_vida||[]);
   // El golpe sacude el tablero en proporción a la vida perdida; nunca con movimiento reducido.
   const fuerza=Math.max(0,...(evento.cambios_vida||[]).filter(c=>c.delta<0).map(c=>{const f=fichas.find(f=>f.id===c.id);return Math.min(1,-c.delta/Math.max(1,f?.max_vida||20));}));
   if(fuerza>0&&typeof matchMedia==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const d=3+fuerza*9;tableroRef.current?.animate?.([{transform:'translate(0,0)'},{transform:`translate(${-d}px,${d/2}px)`},{transform:`translate(${d*.7}px,${-d/3}px)`},{transform:`translate(${-d/3}px,${d/5}px)`},{transform:'translate(0,0)'}],{duration:260,delay:140,easing:'ease-out'});}
  }
  const timer=setTimeout(()=>setCambios([]),2600);return()=>clearTimeout(timer);
 },[evento?.id]);
 const [destino,setDestino]=useState<Posicion|null>(null),[hover,setHover]=useState<Posicion|null>(null),[cursor,setCursor]=useState<Posicion|null>(null),tableroRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{const v=habilidad?.vfx;precargarVFX([v?.lanzamiento,v?.recorrido,v?.impacto,...(habilidad?.transformacion?.etapas.flatMap(e=>[e.vfx?.entrada,e.vfx?.aura])||[])]);},[habilidad?.id,habilidad?.vfx,habilidad?.transformacion]);
 const origen=fichas.find(f=>f.id===lanzador),t=!moviendo?habilidad?.tablero:undefined;
 const blancas=useMemo(()=>{
  if(habilidad?.efecto==='desplazamiento'&&t&&origen)return new Set(Object.keys(distanciasMovimiento(origen.posicion,fichas.map(f=>f.posicion),columnas,filas,mapa,t.alcance,capaDe(origen.estados)==='aire')));
  return new Set((t&&origen?alcanceDesde(origen.posicion,t,{columnas,filas}).filter(p=>lineaVisible(origen.posicion,p,mapa)):[]).map(p=>`${p.x},${p.y}`));},[habilidad,t,origen,fichas,columnas,filas,mapa]);
 const punto=t?.origen_area==='lanzador'?origen?.posicion:centro||hover;
 const area=useMemo(()=>t&&origen&&punto?areaDesde(origen.posicion,punto,t,{columnas,filas}):[],[t,origen?.posicion.x,origen?.posicion.y,punto?.x,punto?.y,columnas,filas]);
 const afectadas=useMemo(()=>new Set(area.map(p=>`${p.x},${p.y}`)),[area]);
 const victimas=useMemo(()=>origen&&t?fichas.filter(f=>f.vida!==0&&afectadas.has(`${f.posicion.x},${f.posicion.y}`)&&objetivoDelArea(origen,f,habilidad!)):[],[fichas,origen,t,afectadas,habilidad]);
 const pixelArt=!!(evento?.vfx?.lanzamiento||evento?.vfx?.recorrido||evento?.vfx?.impacto);
 const fichaObjetivo=fichas.find(f=>f.id===objetivo);
 const porCasilla=useMemo(()=>new Map(fichas.map(f=>[`${f.posicion.x},${f.posicion.y}`,f])),[fichas]);
 const casillas=useMemo(()=>Array.from({length:columnas*filas},(_,i)=>({x:i%columnas,y:Math.floor(i/columnas)})),[columnas,filas]);
 // Vista previa: ruta hasta la casilla bajo el cursor (o el destino elegido) y franja que quedaría al alcance cuerpo a cuerpo.
 const mueve=fichas.find(f=>f.id===lanzador)||fichas.find(f=>f.id===actual);
 const metaRuta=!moviendo?null:destino&&alcanzables[`${destino.x},${destino.y}`]?destino:cursor&&alcanzables[`${cursor.x},${cursor.y}`]?cursor:null;
 const ruta=useMemo(()=>mueve&&metaRuta?rutaVisual(mueve.posicion,metaRuta,columnas,filas,fichas.filter(f=>f.id!==mueve.id).map(f=>f.posicion),mapa):[],[mueve?.id,mueve?.posicion.x,mueve?.posicion.y,metaRuta?.x,metaRuta?.y,columnas,filas,fichas,mapa]);
 const amenaza=useMemo(()=>{const s=new Set<string>();if(!moviendo||!mueve)return s;const origenK=`${mueve.posicion.x},${mueve.posicion.y}`;for(const k of [origenK,...Object.keys(alcanzables)]){const [x,y]=k.split(',').map(Number);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,q=`${xx},${yy}`;if(xx<0||yy<0||xx>=columnas||yy>=filas||alcanzables[q]||q===origenK||mapa?.celdas[q]==='muro'||porCasilla.get(q)?.bando===mueve.bando)continue;s.add(q);}}return s;},[moviendo,mueve?.posicion.x,mueve?.posicion.y,mueve?.bando,alcanzables,columnas,filas,mapa,porCasilla]);
 // Quien golpea embiste hacia el objetivo; se deduce del evento confirmado, sin reglas nuevas.
 const atacante=evento?.desde&&evento.hasta&&!evento.movimientos?.length&&(evento.desde.x!==evento.hasta.x||evento.desde.y!==evento.hasta.y)&&cambios.some(c=>c.delta<0)?porCasilla.get(`${evento.desde.x},${evento.desde.y}`):undefined;
 const enfocadaBruta=(cursor&&porCasilla.get(`${cursor.x},${cursor.y}`))||fichaObjetivo||fichas.find(f=>f.id===actual),turno=fichas.find(f=>f.id===actual);
 const terreno=cursor?TERRENOS[mapa?.celdas[`${cursor.x},${cursor.y}`]||'libre']:undefined;
 // Al cambiar de actor o habilidad no conservamos un destino de la selección anterior.
 // «Segundo clic»: el primer toque deja la jugada pendiente (previsualizada); el segundo sobre lo mismo la ejecuta.
 const [segundoClic,setSegundoClic]=useSegundoClic(),[pendiente,setPendiente]=useState<string|null>(null);
 useEffect(()=>{setDestino(null);setHover(null);setPendiente(null);},[lanzador,habilidad?.id,moviendo]);
 const propio=fichas.find(f=>f.id===perspectiva),herida=intensidadHerida(propio?.vida,propio?.max_vida);
 const golpePropio=cambios.some(c=>c.id===perspectiva&&c.delta<0);
 // Capas: se deducen de los estados del motor. Al cambiar de capa se reproduce la transición (nubes, tierra, ondas, halo).
 const capas=useMemo(()=>new Map(fichas.map(f=>[f.id,capaDe(f.estados)])),[fichas]);
 const capasPrevias=useRef(new Map<string,Capa>()),[transiciones,setTransiciones]=useState<Record<string,string>>({});
 useEffect(()=>{
  const nuevas:Record<string,string>={};
  for(const [id,capa] of capas){const antes=capasPrevias.current.get(id);if(antes&&antes!==capa)nuevas[id]=`${antes}-${capa}-${Date.now()}`;capasPrevias.current.set(id,capa);}
  if(!Object.keys(nuevas).length)return;
  setTransiciones(t=>({...t,...nuevas}));const timer=setTimeout(()=>setTransiciones({}),950);return()=>clearTimeout(timer);
 },[capas]);
 const bandoPropio=propio?.bando||fichas.find(f=>f.id===lanzador)?.bando;
 // Quien está bajo tierra y no es de tu bando solo deja una marca: no se ve su nombre ni su vida.
 const oculto=(f?:FichaTablero)=>!!f&&capas.get(f.id)==='subsuelo'&&!!bandoPropio&&f.bando!==bandoPropio&&!ocular?.objetivos[f.id]?.revela_oculto;
 // Visión ocular: casillas desde las que golpear un punto débil y casillas que amenazan los enemigos vistos.
 const debiles=useMemo(()=>casillasDebiles(ocular,fichas,columnas,filas),[ocular,fichas,columnas,filas]);
 const [verAmenazas,setVerAmenazas]=useState(false);
 const amenazaOcular=useMemo(()=>new Set(ocular?.amenaza||[]),[ocular?.amenaza]);
 const visible=(f:FichaTablero)=>oculto(f)?{...f,nombre:'Marca bajo tierra',vida:undefined,max_vida:undefined}:f;
 const enfocada=oculto(enfocadaBruta)?undefined:enfocadaBruta;
 // Tutorial contextual: la primera vez que aparece una capa o un tipo de alcance, una nota breve sobre el tablero.
 const clavesNota=useMemo(()=>[...new Set([...capas.values()].filter(c=>c!=='suelo').map(c=>'capa:'+c)),...(t?[t.origen_area==='lanzador'?'alcance:lanzador':'alcance:'+t.forma]:[])].filter(k=>k.startsWith('capa:')||TUTORIAL_ALCANCE[k.slice(8)]),[capas,t?.forma,t?.origen_area]);
 const [nota,setNota]=useState<string|null>(null);
 useEffect(()=>{setNota(notaPendiente(clavesNota));},[clavesNota.join('|')]);
 const textoNota=nota?.startsWith('capa:')?CAPAS[nota.slice(5) as Capa]?.tutorial:nota?TUTORIAL_ALCANCE[nota.slice(8)]:'';
 // Pulsación larga en móvil: muestra la previsualización sin ejecutar.
 const presion=useRef<{timer?:ReturnType<typeof setTimeout>;larga?:boolean}>({});
 const directo=!!onEjecutar&&!ocupado&&puedeEjecutar;
 const gasto={ph:habilidad?.coste_ph,fatiga:habilidad?.coste_fatiga};
 const ejecutarSi=(clave:string,accion:()=>void)=>{if(segundoClic&&pendiente!==clave){setPendiente(clave);return;}setPendiente(null);accion();};
 const bajoCursor=cursor?porCasilla.get(`${cursor.x},${cursor.y}`):undefined;
 // Previsualización de lo que hará el clic sobre la casilla o la ficha bajo el cursor (o la pendiente en móvil).
 const vista:Previsualizacion|null=useMemo(()=>{
  if(moviendo){const meta=metaRuta;if(!meta)return null;const k=`${meta.x},${meta.y}`;return {titulo:`Mover ${alcanzables[k]} casillas`,lineas:['Conservas tu acción.',...(amenaza.size?['Rojo: casillas que quedarían a tu alcance cuerpo a cuerpo.']:[])],pista:segundoClic?(pendiente==='mov:'+k?'Toca otra vez para moverte.':'Toca para ver la ruta; otra vez para moverte.'):'Clic para moverte.'};}
  if(!habilidad||!origen||!onEjecutar)return null;
  if(t&&habilidad.efecto==='desplazamiento')return {titulo:habilidad.nombre,lineas:[`Hasta ${t.alcance} casillas sin gastar movimiento.`],pista:'Elige una casilla libre resaltada.'};
  if(t){if(t.origen_area==='lanzador'||!punto)return null;const sobre=porCasilla.get(`${punto.x},${punto.y}`);return previsualizar({accion:habilidad.nombre,efecto:habilidad,victimas:victimas.map(f=>visible(f).nombre),casillas:area.length,capa:sobre?capas.get(sobre.id):undefined,coste:gasto,segundoClic,pendiente:pendiente==='cel:'+`${punto.x},${punto.y}`});}
  const f=bajoCursor||(pendiente?.startsWith('obj:')?fichas.find(x=>'obj:'+x.id===pendiente):undefined);
  if(!f||f.id===origen.id||esAccionPropia(habilidad.id||'',habilidad))return null;
  if(!objetivoValido(habilidad,origen,f))return {titulo:habilidad.nombre,lineas:[`${visible(f).nombre} no es un objetivo para esta acción.`],pista:'Clic para seleccionar.'};
  const base=previsualizar({accion:habilidad.nombre,efecto:habilidad,objetivo:visible(f),capa:capas.get(f.id),coste:gasto,segundoClic,pendiente:pendiente==='obj:'+f.id});
  const ojo=habilidad.efecto==='dano'?lineaOcular(ocular,f,origen.posicion):null;
  return ojo?{...base,lineas:[...base.lineas,ojo]}:base;
 },[ocular,moviendo,metaRuta?.x,metaRuta?.y,alcanzables,amenaza,habilidad,origen,onEjecutar,t,punto?.x,punto?.y,victimas,area,capas,segundoClic,pendiente,bajoCursor,fichas,gasto.ph,gasto.fatiga]);
 function pulsar(p:Posicion,f?:FichaTablero){
  const k=`${p.x},${p.y}`,disponible=moviendo&&!!alcanzables[k];
  if(moviendo){
   if(f){onObjetivo(f.id);return;}
   if(!disponible||ocupado)return;
   setDestino(p);ejecutarSi('mov:'+k,()=>{onMover(p);setDestino(null);});return;
  }
  if(t){
   if(!blancas.has(k)||!puedeApuntar)return;
   onApuntar?.(p,f?.id);
   if(directo&&t.origen_area!=='lanzador'&&!(f&&!alcanzaCapa(habilidad,capas.get(f.id)||'suelo').ok))ejecutarSi('cel:'+k,()=>onEjecutar!({centro:p,objetivo:f?.id}));
   return;
  }
  if(!f)return;
  onObjetivo(f.id);
  if(directo&&habilidad&&origen&&f.id!==origen.id&&!esAccionPropia(habilidad.id||'',habilidad)&&objetivoValido(habilidad,origen,f)&&alcanzaCapa(habilidad,capas.get(f.id)||'suelo').ok)
   ejecutarSi('obj:'+f.id,()=>onEjecutar!({objetivo:f.id}));
 }
 // Esc cancela la jugada pendiente del tablero.
 useEffect(()=>{
  if(typeof window==='undefined'||!pendiente)return;
  const tecla=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!editable(e.target)){setPendiente(null);setDestino(null);}};
  window.addEventListener?.('keydown',tecla);return()=>window.removeEventListener?.('keydown',tecla);
 },[pendiente]);
 const ayuda=moviendo?(segundoClic?'Toca una casilla verde para ver la ruta; otra vez para moverte.':'Pasa el cursor para ver la ruta y haz clic para moverte.'):t?.origen_area==='lanzador'?`Rugido: nace de ${origen?.nombre||'tu personaje'} y afecta alrededor. Ejecútalo desde la barra.`:t?`Alcance blanco: ${t.alcance} casillas desde ${origen?.nombre||'el personaje'}. ${onEjecutar?(segundoClic?'Toca para apuntar; otra vez para lanzar.':'Clic para lanzar.'):''}`:habilidad&&onEjecutar?(segundoClic?`${habilidad.nombre}: toca un objetivo para previsualizar; otra vez para ejecutar.`:`${habilidad.nombre}: clic sobre un objetivo para ejecutar.`):'Toca un retrato para elegir objetivo';
 return <section style={{'--herida':herida,...estiloOcular(ocular)} as React.CSSProperties} className={`tactical-field campo area-${t?.color||'azul'}`} aria-label="Tablero de combate">
  {perspectiva&&<div className="tactical-danger-border" aria-hidden="true"/>}
  {golpePropio&&<span key={evento?.id} className="tactical-player-hit" aria-hidden="true"/>}
  <header className="tactical-field-header"><span><Crosshair size={16}/>{ayuda}</span>
   <div className="tactical-field-tools">
    {mapa?.procedural?.objetos?.some(o=>o.capa==='techos')&&<button type="button" className="tactical-roof-toggle" aria-pressed={mostrarTechos} onClick={()=>setMostrarTechos(v=>!v)}>{mostrarTechos?'Ocultar techos':'Mostrar techos'}</button>}
    {onEjecutar&&<label className="tactical-second-click" title="Si está activo, el primer clic solo previsualiza y el segundo ejecuta."><input type="checkbox" checked={segundoClic} onChange={e=>{setSegundoClic(e.target.checked);setPendiente(null);}}/> Confirmar con segundo clic</label>}
    <button type="button" className="arena-full" aria-pressed={vistaCompleta} onClick={()=>setVistaCompleta(v=>!v)}>{vistaCompleta?"Ampliar casillas":"Ver mapa completo"}</button>
    <small>Aliados <i className="tactical-dot ally"/> Enemigos <i className="tactical-dot enemy"/></small>
   </div></header>
  <div className="campo-escenario">
  {ocular&&<HudOcular vista={ocular} turnoPropio={turnoPropio} verAmenazas={verAmenazas} onAmenazas={()=>setVerAmenazas(v=>!v)}/>}
  {t&&!vista&&<div className="tactical-area-summary" role="status"><strong>{habilidad?.nombre}</strong><span>{punto?`${area.length} casillas · ${victimas.length} objetivos: ${victimas.map(f=>visible(f).nombre).join(', ')||'ninguno'}`:t?.origen_area==='lanzador'?'Ejecútalo desde la barra: el área nace del atacante.':'Toca una casilla blanca para centrar el efecto.'}</span>{centro&&<button onClick={()=>onApuntar?.(centro)}>Centro: {centro.x+1}, {centro.y+1}</button>}</div>}
  <div className="tactical-scroll"><div ref={tableroRef} onMouseMove={e=>{const r=e.currentTarget.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*columnas),y=Math.floor((e.clientY-r.top)/r.height*filas);if(x>=0&&y>=0&&x<columnas&&y<filas&&(cursor?.x!==x||cursor?.y!==y))setCursor({x,y});}} onMouseLeave={()=>{setHover(null);setCursor(null);}} className={`tactical-board ${vistaCompleta?"arena-vista-completa":""} ${mapa?.procedural?'has-procedural-map':''}`} style={{gridTemplateColumns:`repeat(${columnas}, minmax(${vistaCompleta?0:48}px, 1fr))`,'--cols':columnas,'--rows':filas} as React.CSSProperties}>
   {mapa?.procedural&&<FondoMapaProcedural mapa={mapa} techos={mostrarTechos}/>}
   {ocular&&turnoPropio&&ocular.visiones[0].apariencia.velo>0&&<div className="ocular-velo" aria-hidden="true"/>}
   {casillas.map(p=>{const k=`${p.x},${p.y}`,f=porCasilla.get(k),disponible=moviendo&&!!alcanzables[k],enRango=blancas.has(k),enArea=afectadas.has(k),elegida=!!destino&&destino.x===p.x&&destino.y===p.y,esCentro=centro?.x===p.x&&centro?.y===p.y,capa=f?capas.get(f.id)||'suelo':'suelo',oculta=capa==='subsuelo'&&!!bandoPropio&&f?.bando!==bandoPropio&&!ocular?.objetivos[f?.id||'']?.revela_oculto,enEspera=pendiente===(moviendo?'mov:'+k:t?'cel:'+k:f?'obj:'+f.id:''),sombraObjetivo=!moviendo&&!!f&&f.id===objetivo&&capa==='aire';
    return <button type="button" key={k} disabled={!f&&(ocupado||(!disponible&&!(t&&enRango&&puedeApuntar)))} aria-pressed={t?esCentro:f?objetivo===f.id:elegida} title={mapa?.celdas[k]} aria-label={f?oculta?`Marca en el suelo de algo bajo tierra, casilla ${p.x+1}, ${p.y+1}`:`${f.nombre}, ${f.bando==='jugador'?'aliado':'enemigo'}${capa!=='suelo'?`, en ${CAPAS[capa].nombre.toLowerCase()}`:''}${f.vida!==undefined?`, vida ${f.vida}/${f.max_vida}`:''}${f.id===actual?', turno actual':''}${t?enRango?', dentro del alcance':', fuera de alcance':''}`:`Casilla ${p.x+1}, ${p.y+1}${debiles.has(k)?`, punto débil de ${debiles.get(k)}`:''}${disponible?`, ${alcanzables[k]} pasos`:enRango?', dentro del alcance':''}`} className={`tactical-cell terrain-${mapa?.celdas[k]||'libre'} ${evento?.hasta?.x===p.x&&evento?.hasta?.y===p.y?'animation-'+(evento.animacion||'impacto'):''} ${enRango?'spell-range':''} ${enArea?'spell-area':''} ${esCentro?'spell-center':''} ${f?.id===lanzador&&t?'spell-origin':''} ${disponible?'reachable':''} ${amenaza.has(k)?'threat':''} ${cursor?.x===p.x&&cursor?.y===p.y?'cursor':''} ${elegida&&disponible?'destination':''} ${f?`occupied ${f.bando==='jugador'?'ally':'enemy'} ${f.id===actual?'current':''} ${!t&&objetivo===f.id?'target':''} ${f.vida===0?'down':''} capa-${capa} ${oculta?'capa-oculta':''}`:''} ${enEspera?'pending':''} ${sombraObjetivo?'shadow-target':''}`} onMouseEnter={()=>{if(!centro)setHover(t&&enRango?p:null);}} onFocus={()=>{setCursor(p);if(t&&enRango&&!centro)setHover(p);}} onPointerDown={e=>{if(e.pointerType!=='touch')return;clearTimeout(presion.current.timer);presion.current.larga=false;presion.current.timer=setTimeout(()=>{presion.current.larga=true;setCursor(p);if(t&&enRango&&!centro)setHover(p);if(moviendo&&disponible)setDestino(p);},450);}}
     onPointerUp={()=>clearTimeout(presion.current.timer)} onPointerLeave={()=>clearTimeout(presion.current.timer)} onContextMenu={e=>{if(presion.current.larga)e.preventDefault();}}
     onClick={()=>{if(presion.current.larga){presion.current.larga=false;return;}pulsar(p,f);}}>
    {f&&capa!=='suelo'&&<><span className="capa-sombra" aria-hidden="true"/>{transiciones[f.id]&&<span key={transiciones[f.id]} className={`capa-transicion capa-transicion-${capa}`} aria-hidden="true"><i/><i/><i/></span>}</>}
    {sombraObjetivo&&<span className="capa-punto" aria-hidden="true"><Crosshair size={16}/></span>}
    {evento?.hasta?.x===p.x&&evento?.hasta?.y===p.y&&evento.animacion!=='ninguna'&&!pixelArt&&<span key={'spell:'+evento.id} aria-hidden="true" className={`confirmed-spell spell-${evento.animacion||'impacto'}`}/>}
    {f&&cambios.filter(c=>c.id===f.id).map(c=><span key={`${evento?.id}:${f.id}`} aria-hidden="true" className={`tactical-life-float ${c.delta<0?'damage':'healing'}`}>{c.delta>0?'+':'−'}{Number(Math.abs(c.delta).toFixed(2))}</span>)}
    {debiles.has(k)&&<span className="ocular-celda" title={`Punto débil de ${debiles.get(k)}`} aria-hidden="true"/>}
    {verAmenazas&&amenazaOcular.has(k)&&<span className="ocular-amenaza" aria-hidden="true"/>}
    {f&&!oculta&&<MarcasOculares objetivo={ocular?.objetivos[f.id]}/>}
    {f?<FichaAnimada key={f.id} ficha={f} fichas={fichas} evento={evento} columnas={columnas} filas={filas} mapa={mapa}>{(()=>{const golpe=cambios.some(c=>c.id===f.id&&c.delta<0),cura=cambios.some(c=>c.id===f.id&&c.delta>0),embiste=atacante?.id===f.id,ref=embiste?evento?.hasta:evento?.desde,signo=embiste?1:-1,vida=`${Math.max(0,Math.min(100,100*(f.vida||0)/Math.max(1,f.max_vida||1)))}%`;
     return <><span key={golpe||cura||embiste?evento?.id:'reposo'} className={`ficha-cuerpo ${golpe?'golpeada':''} ${cura?'curada':''} ${embiste?'embiste':''}`} style={{'--lx':ref?signo*Math.sign(ref.x-f.posicion.x):0,'--ly':ref?signo*Math.sign(ref.y-f.posicion.y):0} as React.CSSProperties}>{f.vida!==0&&<AuraTransformacion id={f.vfx?.aura} escala={f.vfx?.escala}/>}<RetratoCombate nombre={f.nombre} src={f.imagen_url} circular/></span><span className="tactical-token-name">{f.nombre}</span>{f.vida!==undefined&&<span className="tactical-health"><span className="estela" style={{width:vida}}/><span style={{width:vida}}/></span>}</>;})()}{f.id===actual&&<span className="tactical-turn-marker">◆</span>}{!!f.estados?.length&&<span className="tactical-states" title={f.estados.join(', ')}>{f.estados.some(e=>e.includes('Derribado'))?'↘':`${f.estados.length} ✦`}</span>}{cambios.some(c=>c.id===f.id&&c.delta<0)&&<span key={evento?.id} className="tactical-hit-flash" aria-hidden="true"/>}<span className="tactical-token-danger" style={{opacity:intensidadHerida(f.vida,f.max_vida)}} aria-hidden="true"/></FichaAnimada>:disponible?<span>{elegida?'✓':alcanzables[k]}</span>:esCentro?<Crosshair size={18}/>:<span className="tactical-coordinate">{mapa?.celdas[k]==='muro'?'■':mapa?.celdas[k]==='peligro'?'⚠':`${p.x+1}·${p.y+1}`}</span>}
    </button>;
   })}
  {ruta.length>1&&<svg className="campo-ruta" viewBox={`0 0 ${columnas*100} ${filas*100}`} preserveAspectRatio="none" aria-hidden="true"><polyline points={ruta.map(p=>`${p.x*100+50},${p.y*100+50}`).join(' ')}/>{(()=>{const a=ruta[ruta.length-2],b=ruta[ruta.length-1],g=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;return <polygon points="-4,-26 34,0 -4,26" transform={`translate(${b.x*100+50} ${b.y*100+50}) rotate(${g})`}/>;})()}</svg>}
  {turno&&<div key={actual} className={`campo-turno ${turno.bando==='jugador'?'ally':'enemy'}`} aria-hidden="true"><span>Turno de</span><strong>{turno.nombre}</strong></div>}
  <EfectosCombate evento={evento} columnas={columnas} filas={filas}/>
  <AnimacionesArmas evento={evento} columnas={columnas} filas={filas}/>
  {evento?.desde&&evento.hasta&&!pixelArt&&!evento.arma_visual&&['proyectil','trayectoria','desplazamiento'].includes(evento.animacion||'')&&<svg key={evento.id} className="tactical-projectile" viewBox={`0 0 ${columnas*100} ${filas*100}`} preserveAspectRatio="none" aria-hidden="true"><line x1={evento.desde.x*100+50} y1={evento.desde.y*100+50} x2={evento.hasta.x*100+50} y2={evento.hasta.y*100+50}/></svg>}
  </div></div>
  {vista&&<div className={`campo-preview ${vista.bloqueo?'is-bloqueada':''}`} role="status" aria-live="polite"><strong>{vista.titulo}</strong>{vista.lineas.map((l,i)=><span key={i}>{l}</span>)}{vista.bloqueo&&<em>{vista.bloqueo}</em>}<small>{vista.pista}</small></div>}
  {moviendo&&!vista&&<div className="tactical-move-hint" role="status">Verde: puedes llegar. Rojo: quedaría a tu alcance cuerpo a cuerpo.</div>}
  {textoNota&&!vista&&<div className="campo-nota" role="note"><Sparkles size={15} aria-hidden="true"/><span>{textoNota}</span><button type="button" onClick={()=>{if(nota)marcarNota(nota);setNota(notaPendiente(clavesNota.filter(k=>k!==nota)));}}>Entendido</button></div>}
  </div>

  <div className={`campo-info ${enfocada?enfocada.bando==='jugador'?'ally':'enemy':''}`}>
   {enfocada?<><RetratoCombate nombre={enfocada.nombre} src={enfocada.imagen_url}/><div className="campo-info-nombre"><small>{enfocada.bando==='jugador'?'Aliado':'Enemigo'}{enfocada.id===actual?' · en turno':''}{enfocada.id===objetivo?' · objetivo':''}</small><strong>{enfocada.nombre}</strong></div>
    {enfocada.vida!==undefined&&<div className="campo-info-vida"><small>Vida</small><strong>{Number(enfocada.vida.toFixed(1))}<i>/{enfocada.max_vida}</i></strong><span className="tactical-health"><span className="estela" style={{width:`${Math.max(0,Math.min(100,100*enfocada.vida/Math.max(1,enfocada.max_vida||1)))}%`}}/><span style={{width:`${Math.max(0,Math.min(100,100*enfocada.vida/Math.max(1,enfocada.max_vida||1)))}%`}}/></span></div>}
    <div className="campo-info-estados">{enfocada.vida===0?<span className="caido">Fuera de combate</span>:enfocada.estados?.length?enfocada.estados.map(e=><span key={e}>{e}</span>):<small>Sin estados activos</small>}</div></>:<small>Pasa el cursor por una unidad para ver su estado.</small>}
   {terreno&&<div className="campo-info-terreno"><small>Casilla {cursor!.x+1}·{cursor!.y+1}</small><strong>{terreno[0]}</strong><span>{terreno[1]}{moviendo&&alcanzables[`${cursor!.x},${cursor!.y}`]?` · ${alcanzables[`${cursor!.x},${cursor!.y}`]} de movimiento`:''}</span></div>}
  </div>
  {enfocada&&ocular?.objetivos[enfocada.id]&&<PanelOcular nombre={enfocada.nombre} objetivo={ocular.objetivos[enfocada.id]} posicion={enfocada.posicion} origen={(fichas.find(f=>f.id===lanzador)||propio)?.posicion}/>}
  <span className="sr-only" role="status">{cambios.map(c=>`${fichas.find(f=>f.id===c.id)?.nombre||'Participante'}: ${c.delta>0?'+':'−'}${Math.abs(c.delta)} de vida`).join('. ')}</span>
 </section>;
}
export type RecursoBarra={id:string;nombre:string;saldo:number;tope:number;color?:string};
export type EstadoBarra={id:string;nombre:string;icono:string;restantes:number;frase:string;categoria?:string};
export type ActorBarra={nombre:string;vida:number;max_vida:number;ph:number;fatiga:number;accion_usada:boolean;derribado?:boolean;agotado?:boolean;stats?:Record<string,number>;imagen_url?:string;estados?:string[];
 /** Estados con icono, duración y la frase del Yunque (tooltip). */
 estados_detalle?:EstadoBarra[];
 /** Recursos del catálogo (Carga Bioeléctrica, Furia…) con su nombre configurado. */
 recursos?:RecursoBarra[];
 /** Guardia configurada (concepto básico): nombre y frase. */
 guardia?:{nombre:string;frase:string}};
/** Consumible en la barra: pociones y pergaminos con su cantidad y enfriamiento. */
export type ConsumibleBarra={id:string;nombre:string;cantidad:number;detalle?:string;enfriamiento?:number;bloqueada?:string;imagen_url?:string};

/** Panel fijo del héroe que tiene el turno: retrato, recursos, estados y acción. Cambia con una transición corta. */
export function PanelHeroe({actor,phReal,puede}:{actor:ActorBarra;phReal:number;puede:boolean}){
 const maxPh=actor.stats&&Number.isFinite(actor.stats.ph)?actor.stats.ph:Math.max(phReal,0),maxFatiga=actor.stats?.fatiga||0;
 const estados=actor.estados||[],capa=capaDe(estados);
 return <div key={actor.nombre} className={`heroe-activo ${puede?'en-turno':''}`} aria-label={`Héroe activo: ${actor.nombre}`}>
  <div className="heroe-retrato"><RetratoCombate nombre={actor.nombre} src={actor.imagen_url} activo={puede}/><span className={`tactical-action-pip ${actor.accion_usada?'spent':''}`} title={actor.accion_usada?'Acción utilizada':'Una acción disponible'}>◆</span></div>
  <div className="heroe-datos">
   <strong className="heroe-nombre">{actor.nombre}{capa!=='suelo'&&<small className={`heroe-capa capa-${capa}`}>{CAPAS[capa].nombre}</small>}</strong>
   <BarraVital etiqueta="Vida" valor={Number(actor.vida.toFixed(1))} max={actor.max_vida} tipo="vida"/>
   <div className="heroe-reservas"><BarraVital etiqueta="PH" valor={phReal} max={maxPh} tipo="ph"/>{maxFatiga>0&&<BarraVital etiqueta="Fatiga" valor={actor.fatiga} max={maxFatiga} tipo="fatiga"/>}</div>
   {!!actor.recursos?.length&&<div className="heroe-recursos">{actor.recursos.map(r=><RecursoGemas key={r.id} r={r}/>)}</div>}
   {actor.estados_detalle?.length?<ul className="heroe-estados heroe-estados--detalle" aria-label="Estados">{actor.estados_detalle.map(e=><li key={e.id} className={`estado-chip estado-${e.categoria||'narrativo'}`} title={e.frase} aria-label={e.frase} tabIndex={0}><IconoYugen id={e.icono} size={14}/><span>{e.nombre.split(':')[0]}</span>{e.restantes>0&&<b>{e.restantes}</b>}</li>)}</ul>:
   <div className="heroe-estados">{estados.length?<>{estados.slice(0,3).map(e=><span key={e}>{e}</span>)}{estados.length>3&&<span title={estados.slice(3).join(', ')}>+{estados.length-3}</span>}</>:<small>{actor.accion_usada?'Acción utilizada':'Acción disponible'}</small>}</div>}
  </div>
 </div>;
}

/** Recurso del catálogo como gemas que se encienden (o barra si el tope es grande). */
function RecursoGemas({r}:{r:RecursoBarra}){
 const color={['--recurso' as string]:r.color||'var(--color-gold)'};
 return <div className="recurso-barra" style={color} role="meter" aria-label={r.nombre} aria-valuemin={0} aria-valuemax={r.tope} aria-valuenow={r.saldo} title={`${r.nombre}: ${r.saldo} / ${r.tope}`}>
  <span className="recurso-nombre">{r.nombre}</span>
  {r.tope<=10?<span className="recurso-gemas">{Array.from({length:r.tope},(_,i)=><i key={i} className={i<r.saldo?'llena':undefined}/>)}</span>
   :<span className="recurso-linea"><i style={{width:`${Math.round(100*r.saldo/Math.max(1,r.tope))}%`}}/></span>}
  <b>{r.saldo}</b>
 </div>;
}
function ArteRanura({src,respaldo}:{src?:string;respaldo:React.ReactNode}){
 return src ? <span className="tactical-slot-arte" aria-hidden="true"><FotoEncuadrada src={src} fallback={respaldo}/></span> : respaldo;
}

export function BarraCombate({actor,acciones,seleccion,onSeleccion,onResolver,onPasar,onInventario,objetivo,puede,ocupado,moviendo,onMovimiento,movimiento,forzar,onForzar,dados=[],resultado,extras,onLevantarse,inventario,consumibles=[],onConsumible,onSiguiente}:{actor:ActorBarra;acciones:Accion[];seleccion:string;onSeleccion:(id:string)=>void;
 /** Ejecuta la acción indicada (o la seleccionada). Las acciones propias se ejecutan desde la barra; las demás, con un clic en el tablero. */
 onResolver:(accionId?:string)=>void;onPasar:()=>void;onInventario:()=>void;objetivo?:string;puede:boolean;ocupado:boolean;moviendo:boolean;onMovimiento:()=>void;movimiento:number;forzar:boolean;onForzar:(v:boolean)=>void;dados?:TiradaVisual[];resultado?:string;extras?:React.ReactNode;onLevantarse?:()=>void;inventario?:{nombre:string;detalle:string;titulo?:string;oculto?:boolean};
 consumibles?:ConsumibleBarra[];onConsumible?:(id:string)=>void;
 /** Tab (sin foco en un control): pasar al siguiente personaje propio de la party. */
 onSiguiente?:()=>void}){
 const [categoria,setCategoria]=useState('todas'),[enfoque,setEnfoque]=useState<string|null>(null),[pendiente,setPendiente]=useState<string|null>(null);
 const [segundoClic]=useSegundoClic();
 const phReal=Number.isFinite(actor.ph)?Math.max(0,Math.min(actor.ph,actor.stats?(Number.isFinite(actor.stats.ph)?actor.stats.ph:0):actor.ph)):0;
 const motivoDe=(a?:Accion)=>a?.bloqueada||((a?.efecto.coste_fatiga||0)>0&&(actor.agotado||actor.stats&&actor.fatiga+(a?.efecto.coste_fatiga||0)>(actor.stats.fatiga||0))&&(!forzar||!!a?.regla)?'Fatiga insuficiente.':a?.enfriamiento?`Espera ${a.enfriamiento} turnos`:a&&phReal<a.efecto.coste_ph?'PH insuficientes':'');
 const visibles=acciones.filter(a=>categoria==='axioma'?a.efecto.axioma:!a.efecto.axioma&&(categoria==='todas'||a.id!=='ataque'));
 const libre=puede&&!ocupado&&!actor.accion_usada;
 // Ranuras numeradas (teclas 1–9): acciones, guardia y consumibles, en el orden en que se ven.
 type Ranura={id:string;tipo:'accion'|'guardia'|'consumible';propia:boolean;deshabilitada:boolean};
 const ranuras:Ranura[]=[
  ...visibles.map(a=>({id:a.id,tipo:'accion' as const,propia:esAccionPropia(a.id,a.efecto),deshabilitada:!libre||a.enfriamiento>0||!!a.bloqueada||phReal<(a.efecto.coste_ph||0)})),
  {id:'guardia',tipo:'guardia',propia:true,deshabilitada:!libre},
  ...consumibles.map(c=>({id:c.id,tipo:'consumible' as const,propia:true,deshabilitada:!libre||!onConsumible||!!c.enfriamiento||!!c.bloqueada||c.cantidad<1})),
 ];
 useEffect(()=>{setPendiente(null);},[seleccion,actor.nombre,puede]);
 function activar(r:Ranura){
  if(r.deshabilitada)return;
  const ejecutarSi=(accion:()=>void)=>{if(segundoClic&&pendiente!==r.tipo+':'+r.id){setPendiente(r.tipo+':'+r.id);return;}setPendiente(null);accion();};
  setEnfoque(r.tipo+':'+r.id);
  if(r.tipo==='consumible'){ejecutarSi(()=>onConsumible?.(r.id));return;}
  onSeleccion(r.id);
  const a=acciones.find(x=>x.id===r.id);
  if(r.propia&&!motivoDe(a))ejecutarSi(()=>onResolver(r.id));else setPendiente(null);
 }
 // Atajos: 1–9 acciones, Tab siguiente personaje, Esc cancela la selección.
 const teclas=useRef<(e:KeyboardEvent)=>void>(()=>{});
 useEffect(()=>{teclas.current=e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||editable(e.target))return;
  if(e.key==='Escape'){setPendiente(null);if(moviendo)onMovimiento();else if(seleccion)onSeleccion('');return;}
  if(e.key==='Tab'&&onSiguiente&&!e.shiftKey&&(e.target===document.body||e.target===document.documentElement)){e.preventDefault();onSiguiente();return;}
  const i=ranuraDeTecla(e.key);if(i===null||e.repeat)return;
  const r=ranuras[i];if(r){e.preventDefault();activar(r);}
 };});
 useEffect(()=>{if(typeof window==='undefined')return;const f=(e:KeyboardEvent)=>teclas.current(e);window.addEventListener('keydown',f);return()=>window.removeEventListener('keydown',f);},[]);
 // Resumen de turno: se toma una instantánea al empezar y se compara con el último estado visto al terminar.
 const instantanea=():Instantanea=>({vida:actor.vida,max_vida:actor.max_vida,ph:phReal,fatiga:actor.fatiga,accion_usada:actor.accion_usada,estados:actor.estados,capa:capaDe(actor.estados),movimiento});
 const turno=useRef<{nombre:string;inicio:Instantanea;ultimo:Instantanea}|null>(null),[resumen,setResumen]=useState<{nombre:string;lineas:string[]}|null>(null);
 useEffect(()=>{
  const previo=turno.current;
  if(previo&&(!puede||previo.nombre!==actor.nombre)){turno.current=null;setResumen({nombre:previo.nombre,lineas:resumenTurno(previo.inicio,previo.ultimo)});}
  if(puede){const ahora=instantanea();if(!turno.current)turno.current={nombre:actor.nombre,inicio:ahora,ultimo:ahora};else turno.current.ultimo=ahora;}
 });
 useEffect(()=>{if(!resumen)return;const t=setTimeout(()=>setResumen(null),8000);return()=>clearTimeout(t);},[resumen]);
 // Panel de información: lo que está bajo el cursor (o enfocado) o, si no, lo seleccionado. Altura fija.
 const clave=enfoque||(moviendo?'mover':seleccion?(seleccion==='guardia'?'guardia:guardia':'accion:'+seleccion):'');
 const [tipoInfo,idInfo]=clave.includes(':')?[clave.slice(0,clave.indexOf(':')),clave.slice(clave.indexOf(':')+1)]:[clave,''];
 const accionInfo=tipoInfo==='accion'?acciones.find(a=>a.id===idInfo):undefined,consumibleInfo=tipoInfo==='consumible'?consumibles.find(c=>c.id===idInfo):undefined;
 const ayuda=useMemo(()=>accionInfo?.regla_detalle?describirRegla(accionInfo.regla_detalle):accionInfo?describirEfecto(accionInfo.efecto,accionInfo.nombre):null,[accionInfo]);
 const motivo=accionInfo?motivoDe(accionInfo):'';
 const propiaInfo=tipoInfo==='guardia'||tipoInfo==='consumible'||(!!accionInfo&&esAccionPropia(accionInfo.id,accionInfo.efecto));
 const enEspera=pendiente===clave&&!!pendiente;
 const pista=!puede?'Espera tu turno.':actor.accion_usada&&tipoInfo!=='mover'?'Ya usaste tu acción este turno.':motivo?motivo:tipoInfo==='mover'?'Clic en una casilla verde para moverte.':propiaInfo?(enEspera?'Pulsa otra vez para ejecutar.':segundoClic?'Pulsa para previsualizar; otra vez para ejecutar.':'Clic en la ranura para ejecutar.'):accionInfo?(objetivo?`Objetivo: ${objetivo}. Clic sobre él en el tablero para ejecutar.`:'Clic sobre un objetivo en el tablero para ejecutar.'):'';
 const titulo=tipoInfo==='mover'?'Mover':tipoInfo==='guardia'?(actor.guardia?.nombre||'Guardia'):consumibleInfo?.nombre||accionInfo?.nombre||'Elige una acción';
 const texto=tipoInfo==='mover'?`Te quedan ${movimiento} casillas. Moverte no consume tu acción.`:tipoInfo==='guardia'?(actor.guardia?.frase||'Te proteges y obtienes +2 ARM hasta tu siguiente turno.'):consumibleInfo?`${consumibleInfo.detalle||'Objeto consumible.'} Quedan ${consumibleInfo.cantidad}.${objetivo?` Se usa sobre ${objetivo}.`:' Se usa sobre ti.'}`:ayuda?.resumen||'Pasa el cursor por una ranura para ver qué hace. Teclas 1–9.';
 const numero=(id:string,tipo:string)=>{const i=ranuras.findIndex(r=>r.id===id&&r.tipo===tipo);return i>=0&&i<9?i+1:null;};
 const ranuraDe=(id:string,tipo:Ranura['tipo'])=>ranuras.find(r=>r.id===id&&r.tipo===tipo)!;
 const hover=(k:string)=>({onMouseEnter:()=>setEnfoque(k),onMouseLeave:()=>setEnfoque(null),onFocus:()=>setEnfoque(k),onBlur:()=>setEnfoque(null)});
 return <section className="tactical-hud" aria-label="Acciones del turno">
  <div className="tactical-die" aria-live="polite"><Dado3D caras={dados[0]?.caras||20} valor={dados[0]?.valor} animar={!!dados.length} key={JSON.stringify(dados)}/><div><strong>{resultado||'DADOS'}</strong><span>{dados.length?dados.map(d=>`d${d.caras}: ${d.valor}`).join(' · '):'Las tiradas aparecen aquí'}</span></div></div>
  {resumen&&<div className="resumen-turno" role="status"><header><strong>Fin del turno de {resumen.nombre}</strong><button type="button" aria-label="Cerrar resumen" onClick={()=>setResumen(null)}><X size={14}/></button></header><ul>{resumen.lineas.map(l=><li key={l}>{l}</li>)}</ul></div>}
  <div className="tactical-dock">
   <PanelHeroe actor={actor} phReal={phReal} puede={puede}/>
   <div className="tactical-controls">
    <div className="tactical-tabs"><button aria-pressed={categoria==='todas'} onClick={()=>setCategoria('todas')}>Todas</button><button aria-pressed={categoria==='habilidades'} onClick={()=>setCategoria('habilidades')}>Habilidades</button><span>{!puede?'Espera tu turno':actor.accion_usada?'Acción utilizada':'1 acción disponible'}</span></div>
    <div className="tactical-slots" role="group" aria-label="Barra de acciones">
     <button className={moviendo?'chosen':''} disabled={!puede||ocupado||movimiento<=0||actor.derribado} aria-pressed={moviendo} onClick={onMovimiento} {...hover('mover')}><Footprints/><strong>Mover</strong><small>{movimiento} casillas</small></button>
     {actor.derribado&&<button disabled={!puede||ocupado} onClick={onLevantarse}><Footprints/><strong>Levantarse</strong><small>½ movimiento</small></button>}
     {acciones.some(a=>a.efecto.axioma)&&<button type="button" aria-pressed={categoria==='axioma'} onClick={()=>setCategoria(categoria==='axioma'?'todas':'axioma')}><Sparkles/><strong>Axioma</strong><small>{categoria==='axioma'?'Volver':'Elegir técnica'}</small></button>}
     {visibles.map(a=>{const r=ranuraDe(a.id,'accion'),n=numero(a.id,'accion'),elegida=!moviendo&&seleccion===a.id;return <button key={a.id} disabled={r.deshabilitada} aria-pressed={elegida} aria-keyshortcuts={n?String(n):undefined} title={phReal<(a.efecto.coste_ph||0)?`PH insuficientes: necesitas ${a.efecto.coste_ph}, tienes ${phReal}.`:a.bloqueada||a.nombre} className={`${elegida?'chosen':''} ${pendiente==='accion:'+a.id?'pending':''}`} onClick={()=>activar(r)} {...hover('accion:'+a.id)}>{n&&<span className="tactical-key">{n}</span>}{a.enfriamiento>0&&<span className="tactical-cooldown" aria-hidden="true">{a.enfriamiento}</span>}<ArteRanura src={imagenCreacion(a.ilustracion?.forja_id || /^(?:regla:)?(?:hab|pasiva|equipo):([^:]+)/.exec(a.id)?.[1], a.ilustracion?.imagen_url)} respaldo={a.efecto.efecto==='dano'?<Swords/>:<Sparkles/>}/><strong>{a.nombre}</strong><small>{phReal<(a.efecto.coste_ph||0)?'PH insuficientes':a.enfriamiento?`${a.enfriamiento} turnos`:a.efecto.coste_ph?`${a.efecto.coste_ph} PH`:a.efecto.coste_fatiga?`${a.efecto.coste_fatiga} Fatiga`:'1 acción'}</small></button>;})}
     {(()=>{const r=ranuraDe('guardia','guardia'),n=numero('guardia','guardia');return <button disabled={r.deshabilitada} className={`${!moviendo&&seleccion==='guardia'?'chosen':''} ${pendiente==='guardia:guardia'?'pending':''}`} aria-pressed={!moviendo&&seleccion==='guardia'} aria-keyshortcuts={n?String(n):undefined} onClick={()=>activar(r)} {...hover('guardia:guardia')}>{n&&<span className="tactical-key">{n}</span>}<Shield/><strong>{actor.guardia?.nombre||'Guardia'}</strong><small>{actor.guardia?.frase.split(': ').slice(1).join(': ').replace(/\.$/,'')||'+2 ARM'}</small></button>;})()}
     {!!consumibles.length&&<span className="tactical-slots-sep" aria-hidden="true"/>}
     {consumibles.map(c=>{const r=ranuraDe(c.id,'consumible'),n=numero(c.id,'consumible');return <button key={'c:'+c.id} className={`tactical-consumable ${pendiente==='consumible:'+c.id?'pending':''}`} disabled={r.deshabilitada} aria-keyshortcuts={n?String(n):undefined} title={c.bloqueada||c.nombre} aria-label={`${c.nombre}, quedan ${c.cantidad}${c.enfriamiento?`, espera ${c.enfriamiento} turnos`:''}`} onClick={()=>activar(r)} {...hover('consumible:'+c.id)}>{n&&<span className="tactical-key">{n}</span>}<span className="tactical-count">×{c.cantidad}</span>{!!c.enfriamiento&&<span className="tactical-cooldown" aria-hidden="true">{c.enfriamiento}</span>}<ArteRanura src={c.imagen_url} respaldo={<FlaskConical/>}/><strong>{c.nombre}</strong><small>{c.bloqueada?'No disponible':'Consumible'}</small></button>;})}
     {!inventario?.oculto&&<button disabled={ocupado} onClick={onInventario} title={inventario?.titulo}><Backpack/><strong>{inventario?.nombre||'Inventario'}</strong><small>{inventario?.detalle||'Solo lo ves tú'}</small></button>}{extras}
    </div>
   </div>
   <button className="tactical-end" disabled={!puede||ocupado} onClick={onPasar}><ChevronRight/><strong>Terminar turno</strong></button>
  </div>
  <div className="tactical-description" aria-live="polite"><div><strong>{titulo}</strong><p>{texto}</p>{ayuda&&!!ayuda.detalles.length&&<details><summary>Detalles</summary>{ayuda.detalles.map((d,i)=><p key={i}>{d}</p>)}</details>}</div>
   <div>{pista&&<span className={enEspera?'is-pendiente':''}><Crosshair size={14}/> {pista}</span>}{!!accionInfo?.efecto.coste_fatiga&&<label><input type="checkbox" checked={forzar} onChange={e=>onForzar(e.target.checked)}/> Forzar natural al agotarte: sufres 1d4.</label>}</div></div>
 </section>;
}
