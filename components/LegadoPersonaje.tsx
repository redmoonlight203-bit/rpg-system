"use client";
// Evolución y legado de un personaje concreto (instancia). El GM ve y edita todo; el jugador ve su historia,
// su etapa actual y solo los siguientes pasos que no son secretos. Todas las transiciones pasan por RPC atómicas.
import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import {mensajeError} from '../lib/errores';
import EvolucionLegado,{FichaEtapa,LineaTemporal,type OpcionCatalogo} from './EvolucionLegado';
import {REQUISITOS,etapaDe,type EtapaEvolutiva,type Hitos,type LineaEvolutiva,type RegistroEtapa,type RequisitoEvolucion,type TransicionEvolutiva} from '../lib/evolucion';

type VistaGM={gm:true;linea:LineaEvolutiva;etapa_actual:string;hitos:Hitos;version:number;historial:RegistroEtapa[];solicitudes:{id:string;transicion_id:string;created_at:string}[]};
type VistaJugador={gm:false;etapa_actual:string;actual:EtapaEvolutiva;historial:RegistroEtapa[];siguientes:{transicion_id:string;modo:string;requisito:RequisitoEvolucion;cumple:boolean;etapa:Pick<EtapaEvolutiva,'id'|'nombre'|'tipo'|'retrato'|'edad'|'descripcion'>}[];solicitudes:{transicion_id:string;estado:string}[]};
type Vista=VistaGM|VistaJugador;

/** Resumen legible de un requisito para el jugador (sin revelar nada fuera del siguiente paso). */
function leer(r:RequisitoEvolucion):string{
 switch(r.tipo){
  case 'todas':return r.condiciones.map(leer).join(' y ');
  case 'alguna':return r.condiciones.map(leer).join(' o ');
  case 'no':return 'no '+leer(r.condicion);
  case 'nivel':case 'edad':case 'experiencia':return `${REQUISITOS[r.tipo]} (${r.minimo})`;
  case 'comparar':return `${r.atributo} ${r.operador} ${r.valor}`;
  case 'mision':case 'evento':return `${REQUISITOS[r.tipo]}: ${r.clave}`;
  case 'energia':case 'nucleo':return `${r.clave} ≥ ${r.minimo}`;
  case 'salvacion':return `Salvación de ${r.atributo} CD ${r.cd}`;
  case 'derrotar':return `Derrotar ${r.cantidad} ${r.cantidad===1?'vez':'veces'} a un enemigo concreto`;
  default:return REQUISITOS[r.tipo];
 }
}

export default function LegadoPersonaje({personajeId,nombre,gm=false}:{personajeId:number|string;nombre:string;gm?:boolean}){
 const [vista,setVista]=useState<Vista|null|undefined>(undefined);
 const [borrador,setBorrador]=useState<LineaEvolutiva|null>(null);
 const [catalogo,setCatalogo]=useState<OpcionCatalogo[]>([]);
 const [atributos,setAtributos]=useState<{clave:string;etiqueta:string}[]>([]);
 const [ocupado,setOcupado]=useState(false);
 const [error,setError]=useState('');const [aviso,setAviso]=useState('');
 const [consulta,setConsulta]=useState<string|null>(null);
 const [hito,setHito]=useState({tipo:'mision',clave:'',valor:1});
 // Un mismo intento reutiliza su action_id hasta confirmarse: clics repetidos o reconexiones no evolucionan dos veces.
 const pendientes=useRef(new Map<string,string>());
 const idAccion=(clave:string)=>{let id=pendientes.current.get(clave);if(!id){id=crypto.randomUUID();pendientes.current.set(clave,id);}return id;};
 const mostrar=useCallback((r:{data:unknown;error:{message:string}|null})=>{
  if(r.error){setError(r.error.message);setVista(null);return;}
  const v=r.data as Vista|null;setVista(v);setBorrador(v?.gm?v.linea:null);
 },[]);
 const cargar=useCallback(async()=>mostrar(await supabase.rpc('evolucion_vista',{p_personaje:personajeId})),[personajeId,mostrar]);
 useEffect(()=>{
  let vivo=true;
  void supabase.rpc('evolucion_vista',{p_personaje:personajeId}).then(r=>{if(vivo)mostrar(r);});
  void Promise.all([
   supabase.from('forja_maestra').select('id,nombre,tipo_creacion,imagen_url,descripcion,clase,slot_tipo,configuracion_dados').eq('estado','aprobado').in('tipo_creacion',['habilidad','pasiva','objeto','personaje']),
   supabase.from('config_estadisticas').select('clave,etiqueta'),
  ]).then(([c,a])=>{if(!vivo)return;if(!c.error)setCatalogo(c.data as OpcionCatalogo[]);if(!a.error)setAtributos([...new Map((a.data||[]).map(x=>[x.clave,x])).values()]);});
  return ()=>{vivo=false;};
 },[personajeId,mostrar]);
 async function ejecutar(f:()=>Promise<string|void>){
  setOcupado(true);setError('');setAviso('');
  try{const m=await f();if(m)setAviso(m);await cargar();}catch(e){setError(mensajeError(e,'No se pudo completar.'));}finally{setOcupado(false);}
 }
 const rpc=async(nombreRpc:string,args:Record<string,unknown>)=>{const r=await supabase.rpc(nombreRpc,args);if(r.error)throw Error(r.error.message);return r.data;};
 if(vista===undefined)return <p className="evo-nota" role="status">Cargando evolución y legado…</p>;
 const mensajes=<>{error&&<p role="alert" className="evo-aviso">{error}</p>}{aviso&&<p role="status" className="evo-nota">{aviso}</p>}</>;
 if(vista===null&&!gm)return <section className="evo">{mensajes}<p className="evo-nota">Tu historia todavía no tiene etapas registradas. Cuando el GM la abra, aquí verás quién fuiste y en quién te puedes convertir.</p></section>;
 if(vista===null)return <section className="evo">{mensajes}
  <p className="evo-nota">{nombre} todavía no tiene línea de evolución. Se copiará la de su plantilla (o sus formas antiguas); la plantilla de la Forja no se modifica.</p>
  <button type="button" className="evo-boton is-primario" disabled={ocupado} onClick={()=>void ejecutar(async()=>{await rpc('evolucion_inicializar',{p_personaje:personajeId});return 'Línea evolutiva creada.';})}>Iniciar evolución y legado</button>
 </section>;
 const registro=consulta?vista.historial.find(h=>h.id===consulta):null;
 if(!vista.gm){
  const v=vista;const vividas=new Set(v.historial.map(h=>h.etapa_id));
  const linea:LineaEvolutiva={version:1,inicial:v.historial[0]?.etapa_id||v.etapa_actual,etapas:[...new Map([...v.historial.map(h=>[h.etapa_id,h.snapshot] as const),[v.etapa_actual,v.actual] as const]).values()],transiciones:[]};
  return <section className="evo" aria-label={`Legado de ${nombre}`}>{mensajes}
   <div className="evo-cab"><h3>Legado de {nombre}</h3></div>
   <LineaTemporal linea={linea} actual={v.etapa_actual} vividas={vividas} sel={registro?.etapa_id??v.etapa_actual} historial={v.historial} onSel={id=>setConsulta(v.historial.filter(h=>h.etapa_id===id).at(-1)?.id||null)}/>
   {registro&&registro.etapa_id!==v.etapa_actual?<><p className="evo-nota">Consultando el pasado: tu etapa activa sigue siendo «{v.actual.nombre}».</p><FichaEtapa etapa={registro.snapshot} registro={registro} catalogo={catalogo} atributos={atributos}/></>
    :<FichaEtapa etapa={v.actual} catalogo={catalogo} atributos={atributos}/>}
   {v.siguientes.length>0&&<div className="evo-panel"><h4>Caminos que se abren</h4>
    {v.siguientes.map(s=>{const pedida=v.solicitudes.some(x=>x.transicion_id===s.transicion_id&&x.estado==='pendiente');
     return <div key={s.transicion_id} className="evo-acciones" style={{alignItems:'center'}}>
      <span><b>{s.etapa.nombre}</b> · {leer(s.requisito)}</span>
      {s.modo==='solicitud_jugador'&&<button type="button" className="evo-boton is-primario" disabled={ocupado||!s.cumple||pedida} onClick={()=>void ejecutar(async()=>{await rpc('evolucion_solicitar',{p_personaje:personajeId,p_transicion:s.transicion_id,p_action_id:idAccion('sol:'+s.transicion_id)});pendientes.current.delete('sol:'+s.transicion_id);return 'Solicitud enviada al GM.';})}>{pedida?'Solicitud enviada':s.cumple?'Solicitar evolución':'Requisitos pendientes'}</button>}
      {s.modo==='automatica'&&<button type="button" className="evo-boton" disabled={ocupado||!s.cumple} onClick={()=>void ejecutar(async()=>{const r=await rpc('evolucion_comprobar',{p_personaje:personajeId});return r?.length?'¡Has evolucionado!':'Aún no se cumplen los requisitos.';})}>Comprobar</button>}
     </div>;})}
   </div>}
  </section>;
 }
 const v=vista;const l=borrador||v.linea;
 const cambiada=JSON.stringify(borrador)!==JSON.stringify(v.linea);
 const aplicar=(t:TransicionEvolutiva,forzar:boolean)=>void ejecutar(async()=>{
  if(cambiada)throw Error('Guarda antes los cambios de la línea.');
  const clave='ap:'+t.id+':'+v.etapa_actual;
  await rpc('evolucion_aplicar',{p_personaje:personajeId,p_transicion:t.id,p_action_id:idAccion(clave),p_forzar:forzar});
  pendientes.current.delete(clave);return `${nombre} evoluciona: ${etapaDe(l,t.hasta).nombre}.`;
 });
 return <section className="evo" aria-label={`Evolución y legado de ${nombre}`}>{mensajes}
  <EvolucionLegado linea={l} onChange={x=>x&&setBorrador(x)} catalogo={catalogo} atributos={atributos} statsBase={etapaDe(l,v.etapa_actual).stats} nombre={nombre}
   instancia={{etapa_actual:v.etapa_actual,historial:v.historial,hitos:v.hitos}} onAplicar={aplicar} ocupado={ocupado}/>
  <div className="evo-acciones">
   <button type="button" className="evo-boton is-primario" disabled={ocupado||!cambiada} onClick={()=>void ejecutar(async()=>{await rpc('evolucion_guardar_linea',{p_personaje:personajeId,p_linea:borrador,p_version:v.version});return 'Línea guardada para este personaje.';})}>Guardar línea de {nombre}</button>
   <button type="button" className="evo-boton" disabled={ocupado||!cambiada} onClick={()=>setBorrador(v.linea)}>Descartar cambios</button>
  </div>
  {v.solicitudes.length>0&&<div className="evo-panel"><h4>Solicitudes del jugador</h4>{v.solicitudes.map(s=>{const t=v.linea.transiciones.find(x=>x.id===s.transicion_id);
   return <div key={s.id} className="evo-acciones" style={{alignItems:'center'}}><span>{t?`${etapaDe(v.linea,t.desde).nombre} → ${etapaDe(v.linea,t.hasta).nombre}`:'Conexión eliminada'}</span>
    <button type="button" className="evo-boton is-primario" disabled={ocupado||!t} onClick={()=>void ejecutar(async()=>{await rpc('evolucion_resolver_solicitud',{p_solicitud:s.id,p_aprobar:true});return 'Evolución aprobada.';})}>Aprobar</button>
    <button type="button" className="evo-boton" disabled={ocupado} onClick={()=>void ejecutar(async()=>{await rpc('evolucion_resolver_solicitud',{p_solicitud:s.id,p_aprobar:false});return 'Solicitud rechazada.';})}>Rechazar</button></div>;})}</div>}
  <div className="evo-panel"><h4>Hitos de campaña</h4>
   <p className="evo-nota">Lo que el juego no deduce de la ficha. Tras anotarlo se aplican las evoluciones automáticas que ya se cumplan.</p>
   <div className="evo-req-fila">
    <select aria-label="Tipo de hito" value={hito.tipo} onChange={e=>setHito({...hito,tipo:e.target.value})}>{(['mision','evento','derrotar','energia','nucleo','salvacion','edad'] as const).map(k=><option key={k} value={k}>{REQUISITOS[k]}</option>)}</select>
    {hito.tipo!=='edad'&&<input aria-label="Clave del hito" placeholder={hito.tipo==='derrotar'?'Id del enemigo en la Forja':hito.tipo==='salvacion'?'atributo:CD (p. ej. voluntad:15)':'Nombre'} value={hito.clave} onChange={e=>setHito({...hito,clave:e.target.value})}/>}
    {!['mision','evento'].includes(hito.tipo)&&<input aria-label="Valor del hito" type="number" value={hito.valor} onChange={e=>setHito({...hito,valor:Number(e.target.value)})}/>}
    <button type="button" className="evo-boton" disabled={ocupado||(hito.tipo!=='edad'&&!hito.clave.trim())} onClick={()=>void ejecutar(async()=>{const r=await rpc('evolucion_registrar_hito',{p_personaje:personajeId,p_tipo:hito.tipo,p_clave:hito.clave,p_valor:hito.valor});setHito({...hito,clave:''});return r?.automaticas?.length?'Hito anotado y evolución automática aplicada.':'Hito anotado.';})}>Anotar hito</button>
   </div>
  </div>
  <div className="evo-panel"><h4>Historial y legado</h4>
   <ol className="evo-nota">{v.historial.map(h=><li key={h.id}><button type="button" className="evo-boton" aria-pressed={consulta===h.id} onClick={()=>setConsulta(consulta===h.id?null:h.id)}>{h.snapshot.nombre}</button> · {h.created_at?new Date(h.created_at).toLocaleString('es-DO'):''} · {h.origen}{h.condiciones?.length?` · ${h.condiciones.join(', ')}`:''}</li>)}</ol>
   {registro&&<><p className="evo-nota">Ficha de ese momento. Consultarla no cambia la etapa activa.</p><FichaEtapa etapa={registro.snapshot} registro={registro} catalogo={catalogo} atributos={atributos}/></>}
  </div>
 </section>;
}
