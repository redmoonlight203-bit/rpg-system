"use client";
import FondoMapaProcedural from './FondoMapaProcedural';
import {useEffect,useMemo,useState} from 'react';
import {Footprints, Crosshair, Shield, Swords, Sparkles, Backpack, ChevronRight} from 'lucide-react';
import EfectosCombate,{AuraTransformacion} from './EfectosCombate';
import AnimacionesArmas from './AnimacionesArmas';
import type {AnimacionEtapa} from '../lib/vfx';
import {precargarVFX} from '../lib/precarga-vfx';
import FichaAnimada from './FichaAnimada';
import {intensidadHerida} from '../lib/movimiento-visual';
import RetratoCombate from './RetratoCombate';
import Dado3D from './Dado3D';
import {describirEfecto,describirRegla} from '../lib/descripciones';
import {lineaVisible,alcanceDesde,areaDesde, type MapaCombate,objetivoDelArea, type Accion, type Posicion, type EventoVisual, type CambioVida} from '../lib/combate';
import type {Efecto} from '../lib/creacion';
import type {TiradaVisual} from './AnimacionDados';
import '../app/ficha/jugador.css';
import './tablero-combate.css';

const eventosMostrados=new Set<string>();
export type FichaTablero={vfx?:AnimacionEtapa;id:string;nombre:string;bando:string;vida?:number;max_vida?:number;imagen_url?:string;estados?:string[];posicion:Posicion};
export function TableroCombate({fichas,columnas=12,filas=8,actual,objetivo,moviendo,alcanzables={},ocupado,onObjetivo,onMover,habilidad,lanzador,centro,onApuntar,puedeApuntar=false,evento,mapa,perspectiva}:{fichas:FichaTablero[];columnas?:number;filas?:number;actual?:string|null;objetivo:string;moviendo:boolean;alcanzables?:Record<string,number>;ocupado:boolean;onObjetivo:(id:string)=>void;onMover:(p:Posicion)=>void;habilidad?:Efecto;lanzador?:string;centro?:Posicion|null;onApuntar?:(p:Posicion,id?:string)=>void;puedeApuntar?:boolean;evento?:EventoVisual;mapa?:MapaCombate;perspectiva?:string}){
 const [mostrarTechos,setMostrarTechos]=useState(false);
 const [cambios,setCambios]=useState<CambioVida[]>([]);
 useEffect(()=>{
  if(!evento?.id||!evento.creado_en||Date.now()-(evento.recibido_en||evento.creado_en)>10000){setCambios([]);return;}
  if(!eventosMostrados.has(evento.id)){
   eventosMostrados.add(evento.id);if(eventosMostrados.size>200)eventosMostrados.delete(eventosMostrados.values().next().value!);
   setCambios(evento.cambios_vida||[]);
  }
  const timer=setTimeout(()=>setCambios([]),2600);return()=>clearTimeout(timer);
 },[evento?.id]);
 const [destino,setDestino]=useState<Posicion|null>(null),[hover,setHover]=useState<Posicion|null>(null);
 useEffect(()=>{const v=habilidad?.vfx;precargarVFX([v?.lanzamiento,v?.recorrido,v?.impacto,...(habilidad?.transformacion?.etapas.flatMap(e=>[e.vfx?.entrada,e.vfx?.aura])||[])]);},[habilidad?.id,habilidad?.vfx,habilidad?.transformacion]);
 const coste=destino?alcanzables[`${destino.x},${destino.y}`]:undefined,origen=fichas.find(f=>f.id===lanzador),t=!moviendo?habilidad?.tablero:undefined;
 const blancas=useMemo(()=>new Set((t&&origen?alcanceDesde(origen.posicion,t,{columnas,filas}).filter(p=>lineaVisible(origen.posicion,p,mapa)):[]).map(p=>`${p.x},${p.y}`)),[t,origen?.posicion.x,origen?.posicion.y,columnas,filas,mapa]);
 const punto=t?.origen_area==='lanzador'?origen?.posicion:centro||hover;
 const area=useMemo(()=>t&&origen&&punto?areaDesde(origen.posicion,punto,t,{columnas,filas}):[],[t,origen?.posicion.x,origen?.posicion.y,punto?.x,punto?.y,columnas,filas]);
 const afectadas=useMemo(()=>new Set(area.map(p=>`${p.x},${p.y}`)),[area]);
 const victimas=useMemo(()=>origen&&t?fichas.filter(f=>f.vida!==0&&afectadas.has(`${f.posicion.x},${f.posicion.y}`)&&objetivoDelArea(origen,f,habilidad!)):[],[fichas,origen,t,afectadas,habilidad]);
 const pixelArt=!!(evento?.vfx?.lanzamiento||evento?.vfx?.recorrido||evento?.vfx?.impacto);
 const fichaObjetivo=fichas.find(f=>f.id===objetivo);
 const porCasilla=useMemo(()=>new Map(fichas.map(f=>[`${f.posicion.x},${f.posicion.y}`,f])),[fichas]);
 const casillas=useMemo(()=>Array.from({length:columnas*filas},(_,i)=>({x:i%columnas,y:Math.floor(i/columnas)})),[columnas,filas]);
 // Al cambiar de actor o habilidad no conservamos un destino de la selección anterior.
 useEffect(()=>{setDestino(null);setHover(null);},[lanzador,habilidad?.id,moviendo]);
 const propio=fichas.find(f=>f.id===perspectiva),herida=intensidadHerida(propio?.vida,propio?.max_vida);
 const golpePropio=cambios.some(c=>c.id===perspectiva&&c.delta<0);
 return <section style={{'--herida':herida} as React.CSSProperties} className={`tactical-field area-${t?.color||'azul'}`} aria-label="Tablero de combate">
  {perspectiva&&<div className="tactical-danger-border" aria-hidden="true"/>}
  {golpePropio&&<span key={evento?.id} className="tactical-player-hit" aria-hidden="true"/>}
  <header className="tactical-field-header"><span><Crosshair size={16}/>{moviendo?'Doble clic en una casilla iluminada para moverte':t?.origen_area==='lanzador'?`Rugido: nace de ${origen?.nombre||'tu personaje'} y afecta alrededor`:t?`Alcance blanco: ${t.alcance} casillas desde ${origen?.nombre||'el personaje'}`:'Toca un retrato para elegir objetivo'}</span><small>Aliados <i className="tactical-dot ally"/> Enemigos <i className="tactical-dot enemy"/></small></header>
  {mapa?.procedural?.objetos?.some(o=>o.capa==='techos')&&<button type="button" className="tactical-roof-toggle" aria-pressed={mostrarTechos} onClick={()=>setMostrarTechos(v=>!v)}>{mostrarTechos?'Ocultar techos y ver interior':'Mostrar techos'}</button>}
  {t&&<div className="tactical-area-summary" role="status"><strong>{habilidad?.nombre}</strong><span>{punto?`${area.length} casillas · ${victimas.length} objetivos: ${victimas.map(f=>f.nombre).join(', ')||'ninguno'}`:t?.origen_area==='lanzador'?'Pulsa Confirmar acción: el área nace del atacante.':'Toca una casilla blanca para centrar el efecto.'}</span>{centro&&<button onClick={()=>onApuntar?.(centro)}>Centro: {centro.x+1}, {centro.y+1}</button>}</div>}
  <div className="tactical-scroll"><div onMouseLeave={()=>setHover(null)} className={`tactical-board ${mapa?.procedural?'has-procedural-map':''}`} style={{gridTemplateColumns:`repeat(${columnas}, minmax(48px, 1fr))`}}>
   {mapa?.procedural&&<FondoMapaProcedural mapa={mapa} techos={mostrarTechos}/>}
   {casillas.map(p=>{const k=`${p.x},${p.y}`,f=porCasilla.get(k),disponible=moviendo&&!!alcanzables[k],enRango=blancas.has(k),enArea=afectadas.has(k),elegida=!!destino&&destino.x===p.x&&destino.y===p.y,esCentro=centro?.x===p.x&&centro?.y===p.y;
    return <button type="button" key={k} disabled={!f&&(ocupado||(!disponible&&!(t&&enRango&&puedeApuntar)))} aria-pressed={t?esCentro:f?objetivo===f.id:elegida} title={mapa?.celdas[k]} aria-label={f?`${f.nombre}, ${f.bando==='jugador'?'aliado':'enemigo'}${f.vida!==undefined?`, vida ${f.vida}/${f.max_vida}`:''}${f.id===actual?', turno actual':''}${t?enRango?', dentro del alcance':', fuera de alcance':''}`:`Casilla ${p.x+1}, ${p.y+1}${disponible?`, ${alcanzables[k]} pasos`:enRango?', dentro del alcance':''}`} className={`tactical-cell terrain-${mapa?.celdas[k]||'libre'} ${evento?.hasta?.x===p.x&&evento?.hasta?.y===p.y?'animation-'+(evento.animacion||'impacto'):''} ${enRango?'spell-range':''} ${enArea?'spell-area':''} ${esCentro?'spell-center':''} ${f?.id===lanzador&&t?'spell-origin':''} ${disponible?'reachable':''} ${elegida&&disponible?'destination':''} ${f?`occupied ${f.bando==='jugador'?'ally':'enemy'} ${f.id===actual?'current':''} ${!t&&objetivo===f.id?'target':''} ${f.vida===0?'down':''}`:''}`} onMouseEnter={()=>{if(!centro)setHover(t&&enRango?p:null);}} onFocus={()=>{if(t&&enRango&&!centro)setHover(p);}} onDoubleClick={()=>{if(moviendo&&disponible&&!f&&!ocupado){onMover(p);setDestino(null);}}} onClick={()=>{
      if(moviendo){if(f)onObjetivo(f.id);else if(disponible)setDestino(p);}
      else if(t){if(enRango&&puedeApuntar)onApuntar?.(p,f?.id);}
      else if(f)onObjetivo(f.id);
    }}>
    {evento?.hasta?.x===p.x&&evento?.hasta?.y===p.y&&evento.animacion!=='ninguna'&&!pixelArt&&<span key={'spell:'+evento.id} aria-hidden="true" className={`confirmed-spell spell-${evento.animacion||'impacto'}`}/>}
    {f&&cambios.filter(c=>c.id===f.id).map(c=><span key={`${evento?.id}:${f.id}`} aria-hidden="true" className={`tactical-life-float ${c.delta<0?'damage':'healing'}`}>{c.delta>0?'+':'−'}{Number(Math.abs(c.delta).toFixed(2))}</span>)}
    {f?<FichaAnimada key={f.id} ficha={f} fichas={fichas} evento={evento} columnas={columnas} filas={filas} mapa={mapa}>{f.vida!==0&&<AuraTransformacion id={f.vfx?.aura} escala={f.vfx?.escala}/>}<RetratoCombate nombre={f.nombre} src={f.imagen_url}/><span className="tactical-token-name">{f.nombre}</span>{f.vida!==undefined&&<span className="tactical-health"><span style={{width:`${Math.max(0,Math.min(100,100*f.vida/Math.max(1,f.max_vida||1)))}%`}}/></span>}{f.id===actual&&<span className="tactical-turn-marker">◆</span>}{!!f.estados?.length&&<span className="tactical-states" title={f.estados.join(', ')}>{f.estados.some(e=>e.includes('Derribado'))?'↘':`${f.estados.length} ✦`}</span>}{cambios.some(c=>c.id===f.id&&c.delta<0)&&<span key={evento?.id} className="tactical-hit-flash" aria-hidden="true"/>}<span className="tactical-token-danger" style={{opacity:intensidadHerida(f.vida,f.max_vida)}} aria-hidden="true"/></FichaAnimada>:disponible?<span>{elegida?'✓':alcanzables[k]}</span>:esCentro?<Crosshair size={18}/>:<span className="tactical-coordinate">{mapa?.celdas[k]==='muro'?'■':mapa?.celdas[k]==='peligro'?'⚠':`${p.x+1}·${p.y+1}`}</span>}
    </button>;
   })}
  <EfectosCombate evento={evento} columnas={columnas} filas={filas}/>
  <AnimacionesArmas evento={evento} columnas={columnas} filas={filas}/>
  {evento?.desde&&evento.hasta&&!pixelArt&&!evento.arma_visual&&['proyectil','trayectoria','desplazamiento'].includes(evento.animacion||'')&&<svg key={evento.id} className="tactical-projectile" viewBox={`0 0 ${columnas*100} ${filas*100}`} preserveAspectRatio="none" aria-hidden="true"><line x1={evento.desde.x*100+50} y1={evento.desde.y*100+50} x2={evento.hasta.x*100+50} y2={evento.hasta.y*100+50}/></svg>}
  </div></div>

  {fichaObjetivo&&!t&&<div className="tactical-target-info"><strong>{fichaObjetivo.nombre}</strong><span>{fichaObjetivo.vida!==undefined?`Vida ${fichaObjetivo.vida}/${fichaObjetivo.max_vida}`:""}</span><span>{fichaObjetivo.estados?.join(" · ")||"Sin estados activos"}</span></div>}
  <span className="sr-only" role="status">{cambios.map(c=>`${fichas.find(f=>f.id===c.id)?.nombre||'Participante'}: ${c.delta>0?'+':'−'}${Math.abs(c.delta)} de vida`).join('. ')}</span>
  {moviendo&&<div className="tactical-move-confirm" role="status"><span>{coste?`Mover ${coste} casillas. Conservas tu acción.`:'Doble clic para moverte; en móvil, selecciona y confirma.'}</span><button disabled={ocupado||!coste} onClick={()=>{if(destino&&coste){onMover(destino);setDestino(null);}}}>Confirmar movimiento <ChevronRight size={15}/></button></div>}
 </section>;
}
export type ActorBarra={nombre:string;vida:number;max_vida:number;ph:number;fatiga:number;accion_usada:boolean;derribado?:boolean;agotado?:boolean;stats?:Record<string,number>;imagen_url?:string};
export function BarraCombate({actor,acciones,seleccion,onSeleccion,onResolver,onPasar,onInventario,objetivo,puede,ocupado,moviendo,onMovimiento,movimiento,forzar,onForzar,dados=[],resultado,extras,onLevantarse}:{actor:ActorBarra;acciones:Accion[];seleccion:string;onSeleccion:(id:string)=>void;onResolver:()=>void;onPasar:()=>void;onInventario:()=>void;objetivo?:string;puede:boolean;ocupado:boolean;moviendo:boolean;onMovimiento:()=>void;movimiento:number;forzar:boolean;onForzar:(v:boolean)=>void;dados?:TiradaVisual[];resultado?:string;extras?:React.ReactNode;onLevantarse?:()=>void}){
 const elegida=acciones.find(a=>a.id===seleccion),propio=seleccion==='guardia'||['crear_arma','transformacion'].includes(elegida?.efecto.efecto||'')||elegida?.efecto.tablero?.origen_area==='lanzador';
 const ayuda=useMemo(()=>elegida?.regla_detalle?describirRegla(elegida.regla_detalle):elegida?describirEfecto(elegida.efecto,elegida.nombre):null,[elegida]);
 const [categoria,setCategoria]=useState('todas');
 const phReal=Number.isFinite(actor.ph)?Math.max(0,Math.min(actor.ph,actor.stats?(Number.isFinite(actor.stats.ph)?actor.stats.ph:0):actor.ph)):0;
 const motivo=elegida?.bloqueada||((elegida?.efecto.coste_fatiga||0)>0&&(actor.agotado||actor.stats&&actor.fatiga+(elegida?.efecto.coste_fatiga||0)>(actor.stats.fatiga||0))&&(!forzar||!!elegida?.regla)?'Fatiga insuficiente.':elegida?.enfriamiento?`Espera ${elegida.enfriamiento} turnos`:elegida&&phReal<elegida.efecto.coste_ph?'PH insuficientes':'');
 return <section className="tactical-hud" aria-label="Acciones del turno">
  <div className="tactical-die" aria-live="polite"><Dado3D caras={dados[0]?.caras||20} valor={dados[0]?.valor} animar={!!dados.length} key={JSON.stringify(dados)}/><div><strong>{resultado||'DADOS'}</strong><span>{dados.length?dados.map(d=>`d${d.caras}: ${d.valor}`).join(' · '):'Las tiradas aparecen aquí'}</span></div></div>
  <div className="tactical-dock">
   <div className="tactical-actor"><RetratoCombate nombre={actor.nombre} src={actor.imagen_url}/><div><strong>{actor.nombre}</strong><span className="tactical-life">♥ {actor.vida}/{actor.max_vida}</span><small>PH {phReal} · Fatiga {actor.fatiga}</small></div><span className={`tactical-action-pip ${actor.accion_usada?'spent':''}`} title={actor.accion_usada?'Acción utilizada':'Una acción disponible'}>◆</span></div>
   <div className="tactical-controls">
    <div className="tactical-tabs"><button aria-pressed={categoria==='todas'} onClick={()=>setCategoria('todas')}>Todas</button><button aria-pressed={categoria==='habilidades'} onClick={()=>setCategoria('habilidades')}>Habilidades</button><span>{!puede?'Espera tu turno':actor.accion_usada?'Acción utilizada':'1 acción disponible'}</span></div>
    <div className="tactical-slots" role="group" aria-label="Barra de acciones">
     <button className={moviendo?'chosen':''} disabled={!puede||ocupado||movimiento<=0||actor.derribado} aria-pressed={moviendo} onClick={onMovimiento}><Footprints/><strong>Mover</strong><small>{movimiento} casillas</small></button>
     {actor.derribado&&<button disabled={!puede||ocupado} onClick={onLevantarse}><Footprints/><strong>Levantarse</strong><small>½ movimiento</small></button>}
     {acciones.some(a=>a.efecto.axioma)&&<button type="button" aria-pressed={categoria==='axioma'} onClick={()=>setCategoria(categoria==='axioma'?'todas':'axioma')}><Sparkles/><strong>Axioma</strong><small>{categoria==='axioma'?'Volver':'Elegir técnica'}</small></button>}
     {acciones.filter(a=>categoria==='axioma'?a.efecto.axioma:!a.efecto.axioma&&(categoria==='todas'||a.id!=='ataque')).map((a,i)=><button key={a.id} disabled={!puede||actor.accion_usada||(a.enfriamiento>0||!!a.bloqueada||phReal<(a.efecto.coste_ph||0))} aria-pressed={!moviendo&&seleccion===a.id} title={phReal<(a.efecto.coste_ph||0)?`PH insuficientes: necesitas ${a.efecto.coste_ph}, tienes ${phReal}.`:a.bloqueada||a.nombre} className={!moviendo&&seleccion===a.id?'chosen':''} onClick={()=>onSeleccion(a.id)}><span className="tactical-key">{i+1}</span>{a.efecto.efecto==='dano'?<Swords/>:<Sparkles/>}<strong>{a.nombre}</strong><small>{phReal<(a.efecto.coste_ph||0)?'PH insuficientes':a.enfriamiento?`${a.enfriamiento} turnos`:a.efecto.coste_ph?`${a.efecto.coste_ph} PH`:a.efecto.coste_fatiga?`${a.efecto.coste_fatiga} Fatiga`:'1 acción'}</small></button>)}
     <button disabled={!puede||ocupado||actor.accion_usada} className={!moviendo&&seleccion==='guardia'?'chosen':''} aria-pressed={!moviendo&&seleccion==='guardia'} onClick={()=>onSeleccion('guardia')}><Shield/><strong>Guardia</strong><small>+2 ARM</small></button>
     <button disabled={ocupado} onClick={onInventario}><Backpack/><strong>Inventario</strong><small>Equipo y objetos</small></button>{extras}
    </div>
   </div>
   <button className="tactical-end" disabled={!puede||ocupado} onClick={onPasar}><ChevronRight/><strong>Terminar turno</strong></button>
  </div>
  {!moviendo&&<div className="tactical-description"><div><strong>{seleccion==='guardia'?'Guardia':elegida?.nombre||'Elige una acción'}</strong><p>{seleccion==='guardia'?'Te proteges y obtienes +2 ARM hasta tu siguiente turno.':ayuda?.resumen}</p>{ayuda&&<details><summary>Detalles</summary>{ayuda.detalles.map((d,i)=><p key={i}>{d}</p>)}</details>}{!!elegida?.efecto.coste_fatiga&&<label><input type="checkbox" checked={forzar} onChange={e=>onForzar(e.target.checked)}/> Forzar natural al agotarte: sufres 1d4.</label>}</div><div><span><Crosshair size={14}/> {propio?actor.nombre:objetivo||'Elige un objetivo en el tablero'}</span>{motivo&&<small>{motivo}</small>}<button disabled={!puede||ocupado||actor.accion_usada||!seleccion||(!propio&&!objetivo)||!!motivo} onClick={onResolver}>Confirmar acción</button></div></div>}
 </section>;
}
