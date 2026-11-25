"use client";
import {mensajeError} from '../../../lib/errores';
import MetricasCombate from "../../../components/MetricasCombate";
import PantallaCombate from "../../../components/PantallaCombate";
import EstadoAccionCombate from '../../../components/EstadoAccionCombate';
import {useAccionSegura} from '../../../lib/useAccionSegura';
import {recibirEvento} from "../../../lib/combate-transferencia";
import {useSincronizacionCombate} from "../../../lib/useSincronizacionCombate";
import {useCallback,useEffect,useRef,useState} from 'react';
import {consultarCombateJugador} from '../../../lib/jugador';
import {accionUsableAhora,presupuestoEstimado,type Accion,type Posicion,type EventoVisual} from '../../../lib/combate';
import type {TiradaVisual} from '../../../components/AnimacionDados';
import {TableroCombate,BarraCombate,type FichaTablero,type ActorBarra} from '../../../components/TableroCombate';
import VentanaInventario from '../../../components/VentanaInventario';
import {EditorEquipoCombate,consultarEquipo,type ContextoEquipo} from '../../../components/EditorEquipoCombate';
import {consumiblesBarra,esAccionPropia,guardarFijados,leerFijados} from '../../../lib/combate-interfaz';
import '../../../app/dm/combate/combate.css';
import MenuReaccion,{EsperandoReaccion,ListaReacciones,type ReaccionFicha} from '../../../components/MenuReaccion';
import MenuVoz,{AvisoEspejo,type VozJugador} from '../../../components/MenuVoz';
import {useDialogo} from '../../../components/Dialogo';
import '../../../components/control-artefacto.css';
import MenuPotenciador from '../../../components/MenuPotenciador';
import type {EleccionPotenciador} from '../../../lib/rasgos';
import VentanaInvocacion from '../../../components/InvocarCombate';
import type {InvocacionEditor} from '../../../components/EditorInvocacion';
import type {PropuestaInvocacion} from '../../../lib/invocaciones';
type Encuentro={id:string;nombre:string;fase:string;personajes:{id:string;personaje_id:string;nombre:string;es_turno:boolean}[]};
type Estado={espejo?:{aviso?:string;confirmar?:boolean;reflejado?:boolean};reaccion?:import("../../../lib/combate").OfertaReaccion;reaccion_esperando?:string;mapa?:import("../../../lib/combate").MapaCombate;cierre?:import("../../../lib/combate").CierreEncuentro;modo?:string;propios?:Encuentro["personajes"];evento_visual?:EventoVisual;id:string;nombre:string;version:number;fase:string;ronda:number;actual:string;actual_id:string;es_turno:boolean;/** Fuera de su turno, con acciones legendarias disponibles. */puede_legendaria?:boolean;actor:ActorBarra&{reacciones?:ReaccionFicha[];voz?:VozJugador;dominado?:boolean;id:string;personaje_id:string;estados:string[];controlado_por?:'gm'|'fuente';controlados?:{id:string;nombre:string;turno:boolean;acciones:Accion[];/** Su propia invocación: la maneja entera en su turno. */invocada?:boolean;restantes?:number;derribado?:boolean;vida?:number;max_vida?:number;movimiento_restante?:number;alcanzables?:Record<string,number>}[]};acciones:Accion[];/** Sus habilidades de invocar, con la configuración que necesita la ventana. */invocaciones?:{id:string;nombre:string;config:InvocacionEditor}[];/** Su invocación esperando a que la pantalla del GM la valide. */solicitud_invocacion?:{id:string;habilidad:string}|null;invocacion_rechazada?:{id:string;motivo:string}|null;objetivos:(FichaTablero&{caido:boolean})[];dados:TiradaVisual[];resultado?:string;tablero?:{columnas:number;filas:number};alcanzables?:Record<string,number>;movimiento_restante?:number;registro?:string[];ocular?:import('../../../lib/combate').VistaOcular|null};
type Sel={objetivo?:string;centro?:Posicion;respuesta?:string;potenciadores?:EleccionPotenciador[];controlado?:string;habilidad?:string;propuesta?:PropuestaInvocacion};
export default function CombateJugador(){
 const dialogo=useDialogo();
 const[centro,setCentro]=useState<Posicion|null>(null);
 const[encuentros,setEncuentros]=useState<Encuentro[]>([]),[seleccion,setSeleccion]=useState<{combate_id:string;actor_id:string}|null>(null),[estado,setEstado]=useState<Estado|null>(null),[error,setError]=useState(''),[ocupado,setOcupado]=useState(false),[cargando,setCargando]=useState(true),[objetivo,setObjetivo]=useState(''),[accion,setAccion]=useState('ataque'),[potenciando,setPotenciando]=useState<{id:string;sel:Sel}|null>(null),[moviendo,setMoviendo]=useState(false),[forzar,setForzar]=useState(false),[tirada,setTirada]=useState<{dados:TiradaVisual[];resultado?:string}|null>(null);
 const bloqueo=useRef(false),consulta=useRef(0),estadoRef=useRef<Estado|null>(null);
 // Invocación: la ventana abierta (id de la habilidad), mover a la criatura propia y el último rechazo ya leído.
 const [invocando,setInvocando]=useState<string|null>(null),[moverCriatura,setMoverCriatura]=useState(false),[rechazoVisto,setRechazoVisto]=useState('');
 const [conexion,setConexion]=useState('conectando');
 // Inventario privado: se consulta solo para quien lo abre y no pasa por la sincronización del combate.
 const [inventario,setInventario]=useState<ContextoEquipo|null>(null),[mochila,setMochila]=useState<ContextoEquipo|null>(null),[fijados,setFijados]=useState<string[]>([]);
 const solicitud=seleccion?{combate_id:seleccion.combate_id,actor_id:seleccion.actor_id}:null;
 const segura=useAccionSegura<Estado>({clave:'jugador:'+seleccion?.combate_id+':'+seleccion?.actor_id,
  enviar:comando=>consultarCombateJugador(comando),
  consultar:action_id=>consultarCombateJugador({...seleccion,operacion:'consultar_accion',action_id}),
  recuperar:()=>consultarCombateJugador({...seleccion}),
  onRecuperado:e=>{++consulta.current;aplicar(e);setError('');bloqueo.current=false;setOcupado(false);}
 });
 const bloqueado=ocupado||segura.pendiente;

 function aplicar(e:Estado){
  if(estadoRef.current?.id===e.id&&estadoRef.current.actor.id===e.actor.id&&estadoRef.current.version>e.version)return;
  if(estadoRef.current&&estadoRef.current.evento_visual?.id!==e.evento_visual?.id)e=recibirEvento(e);
  estadoRef.current=e;setEstado(e);setObjetivo(old=>e.objetivos.some(x=>x.id===old)?old:'');
  if(e.propios)setEncuentros(old=>old.map(x=>x.id===e.id?{...x,fase:e.fase,personajes:e.propios!}:x));
 }
 const cargar=useCallback(async(recuperar=false)=>{
  if(bloqueo.current)return false;
  const numero=consulta.current;
  try{
   if(seleccion){
    const actual=estadoRef.current;
    const e=await consultarCombateJugador({...seleccion,version:!recuperar&&actual?.id===seleccion.combate_id&&actual.actor.id===seleccion.actor_id?actual.version:undefined});
    if(numero!==consulta.current||bloqueo.current)return;
    if(!e.sin_cambios)aplicar(e);
   }else{
    const lista=await consultarCombateJugador();if(numero!==consulta.current||bloqueo.current)return;setEncuentros(lista.encuentros);
   }
   setError('');
  }catch(e){if(numero===consulta.current)setError(mensajeError(e,'No se pudo cargar.'));}
  finally{if(numero===consulta.current)setCargando(false);}
 },[seleccion]);
 const refrescar=useSincronizacionCombate(cargar,seleccion?.combate_id,true,setConexion);
 useEffect(()=>{refrescar();return()=>{++consulta.current;};},[cargar,refrescar]);
 useEffect(()=>{setMoviendo(false);setMoverCriatura(false);setForzar(false);setCentro(null);},[estado?.actual_id,seleccion?.actor_id]);
 async function ejecutar(operacion:string,accion_id?:string,destino?:Posicion,sel?:Sel){if(!seleccion||!estado||bloqueo.current)return;if(operacion==='actuar'&&estado.espejo?.confirmar){const t=estado.objetivos.find(o=>o.id===(sel?.objetivo??objetivo));if(t&&t.bando==='enemigo'&&t.id!==estado.actor.id&&!(await dialogo.confirmar({titulo:'¿Atacar?',mensaje:`¿Atacar a ${t.nombre}?`,aceptar:'Atacar'})))return;}bloqueo.current=true;const numero=++consulta.current;setOcupado(true);setError('');try{const elegida=(sel?.controlado?estado.actor.controlados?.find(x=>x.id===sel.controlado)?.acciones:estado.acciones)?.find(a=>a.id===accion_id)?.efecto;const propia=esAccionPropia(accion_id||'',elegida);const next:Estado=await segura.ejecutar({...seleccion,version:estado.version,operacion,accion_id,objetivo_id:propia?(sel?.controlado||estado.actor.id):(sel?.objetivo??objetivo),forzar,destino,centro:sel?.centro||centro||undefined,respuesta:sel?.respuesta,potenciadores:sel?.potenciadores,controlado_id:sel?.controlado,habilidad_id:sel?.habilidad,propuesta:sel?.propuesta},operacion==='mover'?'movimiento':operacion==='pasar'?'fin de turno':'acción');if(numero!==consulta.current)return;aplicar(next);if(next.dados.length||next.resultado)setTirada({dados:next.dados,resultado:next.resultado});}catch(e){if(numero===consulta.current)setError(mensajeError(e,'No se pudo actuar.'));}finally{if(numero===consulta.current){bloqueo.current=false;setOcupado(false);refrescar();}}}
 /** Una técnica con potenciadores abre primero su menú; cancelar no gasta nada. */
 function lanzar(id:string,sel:Sel={}){if(id.startsWith('invocar:')&&!sel.controlado){setInvocando(id.slice('invocar:'.length));return;}const lista=sel.controlado?estado?.actor.controlados?.find(x=>x.id===sel.controlado)?.acciones:estado?.acciones;if(!estado?.actor.rafaga&&lista?.find(a=>a.id===id)?.potenciadores?.length){setPotenciando({id,sel});return;}void ejecutar('actuar',id,undefined,sel);}
 const puede=!!estado?.es_turno&&estado.actor.vida>0;
 const criaturaEnTurno=estado?.actor.controlados?.find(x=>x.turno&&x.invocada);
 // Fuera de su turno solo valen sus acciones legendarias (el servidor confirma lo que le queda en la ronda).
 const legendariaFuera=!puede&&!!estado?.puede_legendaria;
 // Cada acción se habilita según su propio presupuesto (la adicional vale antes o después de la principal).
 const puedeAccion=!!estado&&(puede||legendariaFuera&&estado.acciones.find(a=>a.id===accion)?.presupuesto==='legendaria')&&accionUsableAhora(estado.acciones.find(a=>a.id===accion)?.presupuesto,estado.actor,estado.actor.presupuesto||(estado.actor.stats?presupuestoEstimado(estado.actor.stats,estado.actor.accion_usada):null));
 const enCurso=estado?.fase==='en_curso';
 useEffect(()=>{setFijados(leerFijados(seleccion?.actor_id||''));setInventario(null);},[seleccion?.actor_id]);
 // Consumibles de la barra: se leen al empezar cada turno propio (lectura privada, sin eventos para el resto).
 useEffect(()=>{
  if(!solicitud||!enCurso){setMochila(null);return;}
  let vivo=true;consultarEquipo({...solicitud,consultar:true}).then(c=>{if(vivo)setMochila(c);},()=>{if(vivo)setMochila(null);});
  return()=>{vivo=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[seleccion?.combate_id,seleccion?.actor_id,enCurso,estado?.es_turno]);
 const consumibles=mochila?consumiblesBarra(mochila.fuentes,fijados):[];
 async function abrirInventario(){
  if(!solicitud||bloqueo.current)return;
  try{setInventario(await consultarEquipo({...solicitud,consultar:true}));}catch(e){setError(mensajeError(e,'No se pudo abrir el inventario.'));}
 }
 async function usarConsumible(piezaId:string){
  if(!solicitud||!estado||bloqueo.current)return;
  bloqueo.current=true;const numero=++consulta.current;setOcupado(true);setError('');
  try{
   const ctx=await consultarEquipo({...solicitud,consultar:true});
   const nombre=mochila?.fuentes.find(f=>f.id===piezaId)?.nombre;
   const pieza=ctx.fuentes.find(f=>f.id===piezaId)||ctx.fuentes.find(f=>f.consumible&&f.nombre===nombre);
   const accion=pieza?.acciones?.find(a=>!a.bloqueada);
   if(!pieza||!accion)throw Error('Este objeto ya no está disponible.');
   const objetivo_id=objetivo&&ctx.objetivos?.some(o=>o.id===objetivo)?objetivo:solicitud.actor_id;
   setMochila(await consultarEquipo({...solicitud,combate_esperado:ctx.combate_id,version:ctx.version,firma:ctx.firma,operacion:'usar_objeto',objeto_id:pieza.id,efecto_id:accion.id,objetivo_id}));
  }catch(e){if(numero===consulta.current)setError(mensajeError(e,'No se pudo usar el objeto.'));}
  finally{if(numero===consulta.current){bloqueo.current=false;setOcupado(false);refrescar();}}
 }
 function elegirPersonaje(combate_id:string,p:Encuentro['personajes'][number]){++consulta.current;estadoRef.current=null;setSeleccion({combate_id,actor_id:p.id});setEstado(null);setObjetivo('');setAccion('ataque');setTirada(null);localStorage.setItem('personaje_activo_id',p.personaje_id);}
 // Tab: siguiente personaje propio del mismo encuentro (party).
 const party=encuentros.find(e=>e.id===seleccion?.combate_id)?.personajes||[];
 const siguiente=party.length>1&&seleccion?()=>{const i=party.findIndex(p=>p.id===seleccion.actor_id);elegirPersonaje(seleccion.combate_id,party[(i+1)%party.length]);}:undefined;
 return <main className="tactical-player"><div className="tactical-player-inner"><header><PantallaCombate/><h1 className="text-2xl font-bold">Campo de batalla</h1><p className="text-sm text-neutral-400">Elige tu personaje. Las acciones están debajo del tablero.</p></header>{estado?.reaccion&&<MenuReaccion oferta={estado.reaccion} ocupado={ocupado||segura.pendiente} onDecidir={si=>void ejecutar(si?'aceptar_reaccion':'rechazar_reaccion')}/>}{!estado?.reaccion&&estado?.reaccion_esperando&&<EsperandoReaccion nombre={estado.reaccion_esperando}/>}<EstadoAccionCombate estado={segura.estado} revisando={segura.revisando} onComprobar={segura.comprobar} onReintentar={segura.reintentar} conexion={conexion}/>{error&&<p role="alert" className="text-red-400">{error}</p>}{cargando?<p>Buscando encuentros…</p>:!encuentros.length&&<p>El GM todavía no ha añadido tus personajes a un encuentro activo.</p>}<div className="tactical-encounters">{encuentros.flatMap(e=>e.personajes.map(p=><button key={`${e.id}:${p.id}`} disabled={bloqueado} aria-pressed={seleccion?.actor_id===p.id&&seleccion.combate_id===e.id} onClick={()=>elegirPersonaje(e.id,p)}><strong>{p.nombre}{p.es_turno&&e.fase==='en_curso'?' · Tu turno':''}</strong><small>{e.nombre} · {e.fase==='preparacion'?'Preparando':'En curso'}</small></button>))}</div>{estado&&<><div className={`tactical-turn-banner ${puede?'your-turn':''}`} role="status"><strong>{estado.fase==='finalizado'?'Combate finalizado':estado.fase==='preparacion'?'El GM está preparando el combate':puede?'TU TURNO · Elige una acción':`Turno de ${estado.actual}`}</strong><span>Ronda {estado.ronda}</span></div>{estado.fase==='finalizado'&&<section className="p-4 border border-amber-600 rounded my-4"><h2>Encuentro terminado</h2><p>{estado.cierre?.motivo}</p><p>{estado.modo==='entrenamiento'?'Entrenamiento: tu campaña conserva sus recursos originales.':'El GM revisará las recompensas. Puedes ver tus entregas en Logros e historial.'}</p><a className="text-amber-300 underline" href="/ficha/logros">Ver mis recompensas</a></section>}{estado.objetivos.every(o=>o.posicion)?<TableroCombate reflejado={estado.espejo?.reflejado} ocular={estado.ocular} turnoPropio={puede} perspectiva={estado.actor.id} mapa={estado.mapa} key={estado.id} habilidad={estado.acciones.find(a=>a.id===accion)?.efecto} lanzador={estado.actor.id} centro={centro} puedeApuntar={puedeAccion} onApuntar={(p,id)=>{setCentro(p);setObjetivo(id||'');}} evento={estado.evento_visual} fichas={estado.objetivos} {...estado.tablero} actual={estado.actual_id} objetivo={objetivo} moviendo={(moviendo&&puede)||(moverCriatura&&!!criaturaEnTurno)} alcanzables={moverCriatura&&criaturaEnTurno?criaturaEnTurno.alcanzables||{}:estado.alcanzables} ocupado={bloqueado} onObjetivo={setObjetivo} onMover={p=>{if(moverCriatura&&criaturaEnTurno){setMoverCriatura(false);void ejecutar('mover',undefined,p,{controlado:criaturaEnTurno.id});}else void ejecutar('mover',undefined,p);}} puedeEjecutar={puedeAccion} onEjecutar={sel=>{if(sel.objetivo)setObjetivo(sel.objetivo);if(sel.centro)setCentro(sel.centro);lanzar(accion,sel);}}/>:<p role="status">El servidor de combate necesita actualizarse para mostrar el tablero.</p>}{estado.espejo?.aviso&&<AvisoEspejo texto={estado.espejo.aviso}/>}{estado.actor.dominado&&<p className="mv-eco" role="status">{estado.actor.controlado_por==='fuente'?'Tu mente está controlada: un rival decide tus actos.':'Estás dominado: el GM decide tus actos.'}</p>}{potenciando&&estado.acciones.concat(...(estado.actor.controlados||[]).map(x=>x.acciones)).find(a=>a.id===potenciando.id)&&<MenuPotenciador accion={estado.acciones.concat(...(estado.actor.controlados||[]).map(x=>x.acciones)).find(a=>a.id===potenciando.id)!} ocupado={bloqueado} onCancelar={()=>setPotenciando(null)} onConfirmar={el=>{const p=potenciando;setPotenciando(null);void ejecutar('actuar',p.id,undefined,{...p.sel,potenciadores:el.length?el:undefined});}}/>}{estado.actor.controlados?.filter(x=>x.turno).map(x=><section key={x.id} className="control-mental" aria-label={`Controlas a ${x.nombre}`}><h2>{x.invocada?`Turno de tu invocación: ${x.nombre}`:`Controlas a ${x.nombre}`}</h2><p>{x.invocada?`Vida ${x.vida}/${x.max_vida}${x.restantes!==undefined?` · se va en ${x.restantes} ${x.restantes===1?'turno':'turnos'}`:''}. Elige un objetivo en el tablero y una acción, muévela o termina su turno.`:'Elige un objetivo en el tablero y una acción. Sus PH y su Fatiga salen de su ficha.'}</p><div>{x.acciones.map(a=><button key={a.id} type="button" disabled={bloqueado} onClick={()=>lanzar(a.id,{objetivo,controlado:x.id})}>{a.nombre}</button>)}{x.invocada&&<>{x.derribado?<button type="button" disabled={bloqueado} onClick={()=>void ejecutar('levantarse',undefined,undefined,{controlado:x.id})}>Levantarse</button>:<button type="button" aria-pressed={moverCriatura} disabled={bloqueado||!(x.movimiento_restante||0)} onClick={()=>setMoverCriatura(v=>!v)}>{moverCriatura?'Elige casilla…':`Mover (${x.movimiento_restante||0})`}</button>}<button type="button" disabled={bloqueado} onClick={()=>{setMoverCriatura(false);void ejecutar('pasar',undefined,undefined,{controlado:x.id});}}>Terminar su turno</button></>}</div></section>)}{estado.solicitud_invocacion&&<section className="control-mental" role="status" aria-label="Invocación en curso"><h2>Invocando…</h2><p>La pantalla del GM está validando tu criatura. Aparecerá en el tablero en unos segundos.</p><div><button type="button" disabled={bloqueado} onClick={()=>void ejecutar('cancelar_invocacion')}>Cancelar invocación</button></div></section>}{estado.invocacion_rechazada&&estado.invocacion_rechazada.id!==rechazoVisto&&!estado.solicitud_invocacion&&<section className="control-mental" role="alert" aria-label="Invocación rechazada"><h2>La invocación no se completó</h2><p>{estado.invocacion_rechazada.motivo}</p><div><button type="button" onClick={()=>setRechazoVisto(estado.invocacion_rechazada!.id)}>Entendido</button></div></section>}{invocando&&(()=>{const inv=estado.invocaciones?.find(x=>x.id===invocando);if(!inv)return null;return <VentanaInvocacion key={inv.id} titulo={inv.nombre} config={inv.config} nivel={estado.actor.stats?.nivel||1} disenar={inv.config.modo==='jugador_en_combate'} textoConfirmar="Invocar" nota="La pantalla del GM comprobará la clase y la pondrá en el tablero automáticamente. Se paga al aparecer." onCerrar={()=>setInvocando(null)} onConfirmar={async p=>{setInvocando(null);await ejecutar('invocar',undefined,undefined,{habilidad:inv.id,propuesta:p});}}/>;})()}{estado.actor.voz&&<MenuVoz voz={estado.actor.voz} ocupado={ocupado||segura.pendiente} onResponder={r=>void ejecutar('responder_voz',undefined,undefined,{respuesta:r})} onResistir={()=>void ejecutar('resistir_voz')}/>}<ListaReacciones reacciones={estado.actor.reacciones||[]}/><BarraCombate legendariaFuera={legendariaFuera} onLevantarse={()=>void ejecutar('levantarse')} actor={estado.actor} acciones={estado.acciones} seleccion={accion} onSeleccion={id=>{setAccion(id);setCentro(null);setMoviendo(false);}} onResolver={id=>lanzar(id||accion)} onPasar={()=>void ejecutar('pasar')} onInventario={()=>void abrirInventario()} consumibles={consumibles} onConsumible={id=>void usarConsumible(id)} onSiguiente={siguiente} objetivo={estado.acciones.find(a=>a.id===accion)?.efecto.tablero?(centro?`Casilla ${centro.x+1}, ${centro.y+1}`:undefined):estado.objetivos.find(o=>o.id===objetivo)?.nombre} puede={puede} ocupado={bloqueado} moviendo={moviendo} onMovimiento={()=>setMoviendo(v=>!v)} movimiento={estado.movimiento_restante??0} forzar={forzar} onForzar={setForzar} dados={estado.evento_visual?.dados||tirada?.dados} resultado={estado.evento_visual?.resultado||tirada?.resultado}/><VentanaInventario abierta={!!inventario} onCerrar={()=>setInventario(null)} titulo={`Inventario de ${estado.actor.nombre}`} consumibles={mochila?consumiblesBarra(mochila.fuentes,[]).map(c=>({id:c.nombre,nombre:c.nombre,cantidad:c.cantidad,imagen_url:c.imagen_url})):[]} fijados={fijados} onFijados={ids=>{setFijados(ids);guardarFijados(seleccion?.actor_id||'',ids);}}>{inventario&&solicitud&&<EditorEquipoCombate key={inventario.version} contexto={inventario} solicitud={solicitud} onCerrar={()=>setInventario(null)} onGuardado={async()=>{setInventario(null);refrescar();}}/>}</VentanaInventario><details className="tactical-public-log"><summary>Qué está pasando · Registro del combate</summary>{estado.registro?.map((l,i)=><p key={i}>{l}</p>)}</details></>}<MetricasCombate/></div></main>;
}
