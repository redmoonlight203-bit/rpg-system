"use client";
import {recibirEvento} from "../../../lib/combate-transferencia";
import {useSincronizacionCombate} from "../../../lib/useSincronizacionCombate";
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {consultarCombateJugador} from '../../../lib/jugador';
import type {Accion,Posicion,EventoVisual} from '../../../lib/combate';
import type {TiradaVisual} from '../../../components/AnimacionDados';
import {TableroCombate,BarraCombate,type FichaTablero,type ActorBarra} from '../../../components/TableroCombate';
import '../../../app/dm/combate/combate.css';
type Encuentro={id:string;nombre:string;fase:string;personajes:{id:string;personaje_id:string;nombre:string;es_turno:boolean}[]};
type Estado={mapa?:import("../../../lib/combate").MapaCombate;cierre?:import("../../../lib/combate").CierreEncuentro;modo?:string;propios?:Encuentro["personajes"];evento_visual?:EventoVisual;id:string;nombre:string;version:number;fase:string;ronda:number;actual:string;actual_id:string;es_turno:boolean;actor:ActorBarra&{id:string;personaje_id:string;estados:string[]};acciones:Accion[];objetivos:(FichaTablero&{caido:boolean})[];dados:TiradaVisual[];resultado?:string;tablero?:{columnas:number;filas:number};alcanzables?:Record<string,number>;movimiento_restante?:number;registro?:string[]};
export default function CombateJugador(){
 const router=useRouter();
 const[centro,setCentro]=useState<Posicion|null>(null);
 const[encuentros,setEncuentros]=useState<Encuentro[]>([]),[seleccion,setSeleccion]=useState<{combate_id:string;actor_id:string}|null>(null),[estado,setEstado]=useState<Estado|null>(null),[error,setError]=useState(''),[ocupado,setOcupado]=useState(false),[cargando,setCargando]=useState(true),[objetivo,setObjetivo]=useState(''),[accion,setAccion]=useState('ataque'),[moviendo,setMoviendo]=useState(false),[forzar,setForzar]=useState(false),[tirada,setTirada]=useState<{dados:TiradaVisual[];resultado?:string}|null>(null);
 const bloqueo=useRef(false),consulta=useRef(0),estadoRef=useRef<Estado|null>(null);
 function aplicar(e:Estado){
  if(estadoRef.current?.id===e.id&&estadoRef.current.actor.id===e.actor.id&&estadoRef.current.version>e.version)return;
  if(estadoRef.current&&estadoRef.current.evento_visual?.id!==e.evento_visual?.id)e=recibirEvento(e);
  estadoRef.current=e;setEstado(e);setObjetivo(old=>e.objetivos.some(x=>x.id===old)?old:'');
  if(e.propios)setEncuentros(old=>old.map(x=>x.id===e.id?{...x,fase:e.fase,personajes:e.propios!}:x));
 }
 const cargar=useCallback(async()=>{
  if(bloqueo.current)return false;
  const numero=consulta.current;
  try{
   if(seleccion){
    const actual=estadoRef.current;
    const e=await consultarCombateJugador({...seleccion,version:actual?.id===seleccion.combate_id&&actual.actor.id===seleccion.actor_id?actual.version:undefined});
    if(numero!==consulta.current||bloqueo.current)return;
    if(!e.sin_cambios)aplicar(e);
   }else{
    const lista=await consultarCombateJugador();if(numero!==consulta.current||bloqueo.current)return;setEncuentros(lista.encuentros);
   }
   setError('');
  }catch(e){if(numero===consulta.current)setError(e instanceof Error?e.message:'No se pudo cargar.');}
  finally{if(numero===consulta.current)setCargando(false);}
 },[seleccion]);
 const refrescar=useSincronizacionCombate(cargar,seleccion?.combate_id);
 useEffect(()=>{refrescar();return()=>{++consulta.current;};},[cargar,refrescar]);
 useEffect(()=>{setMoviendo(false);setForzar(false);setCentro(null);},[estado?.actual_id,seleccion?.actor_id]);
 async function ejecutar(operacion:string,accion_id?:string,destino?:Posicion){if(!seleccion||!estado||bloqueo.current)return;bloqueo.current=true;++consulta.current;setOcupado(true);setError('');try{const propia=accion_id==='guardia'||['crear_arma','transformacion'].includes(estado.acciones.find(a=>a.id===accion_id)?.efecto.efecto||'');const next:Estado=await consultarCombateJugador({...seleccion,version:estado.version,operacion,accion_id,objetivo_id:propia?estado.actor.id:objetivo,forzar,destino,centro:centro||undefined});aplicar(next);if(next.dados.length||next.resultado)setTirada({dados:next.dados,resultado:next.resultado});}catch(e){setError(e instanceof Error?e.message:'No se pudo actuar.');}finally{bloqueo.current=false;setOcupado(false);refrescar();}}
 const puede=!!estado?.es_turno&&estado.actor.vida>0;
 return <main className="tactical-player"><div className="tactical-player-inner"><header><h1 className="text-2xl font-bold">Campo de batalla</h1><p className="text-sm text-neutral-400">Elige tu personaje. Las acciones están debajo del tablero.</p></header>{error&&<p role="alert" className="text-red-400">{error}</p>}{cargando?<p>Buscando encuentros…</p>:!encuentros.length&&<p>El GM todavía no ha añadido tus personajes a un encuentro activo.</p>}<div className="tactical-encounters">{encuentros.flatMap(e=>e.personajes.map(p=><button key={`${e.id}:${p.id}`} disabled={ocupado} aria-pressed={seleccion?.actor_id===p.id&&seleccion.combate_id===e.id} onClick={()=>{++consulta.current;estadoRef.current=null;setSeleccion({combate_id:e.id,actor_id:p.id});setEstado(null);setObjetivo('');setAccion('ataque');setTirada(null);localStorage.setItem('personaje_activo_id',p.personaje_id);}}><strong>{p.nombre}{p.es_turno&&e.fase==='en_curso'?' · Tu turno':''}</strong><small>{e.nombre} · {e.fase==='preparacion'?'Preparando':'En curso'}</small></button>))}</div>{estado&&<><div className={`tactical-turn-banner ${puede?'your-turn':''}`} role="status"><strong>{estado.fase==='finalizado'?'Combate finalizado':estado.fase==='preparacion'?'El GM está preparando el combate':puede?'TU TURNO · Elige una acción':`Turno de ${estado.actual}`}</strong><span>Ronda {estado.ronda}</span></div>{estado.fase==='finalizado'&&<section className="p-4 border border-amber-600 rounded my-4"><h2>Encuentro terminado</h2><p>{estado.cierre?.motivo}</p><p>{estado.modo==='entrenamiento'?'Entrenamiento: tu campaña conserva sus recursos originales.':'El GM revisará las recompensas. Puedes ver tus entregas en Logros e historial.'}</p><a className="text-amber-300 underline" href="/ficha/logros">Ver mis recompensas</a></section>}{estado.objetivos.every(o=>o.posicion)?<TableroCombate mapa={estado.mapa} key={estado.id} habilidad={estado.acciones.find(a=>a.id===accion)?.efecto} lanzador={estado.actor.id} centro={centro} puedeApuntar={puede&&!estado.actor.accion_usada} onApuntar={(p,id)=>{setCentro(p);setObjetivo(id||'');}} evento={estado.evento_visual} fichas={estado.objetivos} {...estado.tablero} actual={estado.actual_id} objetivo={objetivo} moviendo={moviendo&&puede} alcanzables={estado.alcanzables} ocupado={ocupado} onObjetivo={setObjetivo} onMover={p=>void ejecutar('mover',undefined,p)}/>:<p role="status">El servidor de combate necesita actualizarse para mostrar el tablero.</p>}<BarraCombate onLevantarse={()=>void ejecutar('levantarse')} actor={estado.actor} acciones={estado.acciones} seleccion={accion} onSeleccion={id=>{setAccion(id);setCentro(null);setMoviendo(false);}} onResolver={()=>void ejecutar('actuar',accion)} onPasar={()=>void ejecutar('pasar')} onInventario={()=>router.push('/ficha/equipamiento')} objetivo={estado.acciones.find(a=>a.id===accion)?.efecto.tablero?(centro?`Casilla ${centro.x+1}, ${centro.y+1}`:undefined):estado.objetivos.find(o=>o.id===objetivo)?.nombre} puede={puede} ocupado={ocupado} moviendo={moviendo} onMovimiento={()=>setMoviendo(v=>!v)} movimiento={estado.movimiento_restante??0} forzar={forzar} onForzar={setForzar} dados={estado.evento_visual?.dados||tirada?.dados} resultado={estado.evento_visual?.resultado||tirada?.resultado}/><details className="tactical-public-log"><summary>Qué está pasando · Registro del combate</summary>{estado.registro?.map((l,i)=><p key={i}>{l}</p>)}</details></>}</div></main>;
}
