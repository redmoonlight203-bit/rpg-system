'use client';
// Taller del Yunque: barra superior + tres paneles (grimorio, lienzo, arena). El Borrador es la única fuente
// de verdad; cada gesto es una Operacion pura (`aplicar`) y sus errores se muestran como aviso, nunca rompen.
import {useCallback,useEffect,useMemo,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {Hammer} from 'lucide-react';
import IconoYugen from '../IconoYugen';
import {BarraVital,Runa} from '../ui/Juego';
import Lienzo,{type ContenidoNodo,type GuiaPieza,type LienzoAPI} from './Lienzo';
import Grimorio,{type PistaSoltar} from './Grimorio';
import {NOMBRE_TIPO,familiaDe} from './NodoYunque';
import EditorNucleo,{ICONO_CREACION} from './editores/EditorNucleo';
import EditorAccion from './editores/EditorAccion';
import EditorCuando from './editores/EditorCuando';
import EditorSi from './editores/EditorSi';
import EditorEntonces from './editores/EditorEntonces';
import EditorPasivaNodo from './editores/EditorPasivaNodo';
import EditorModulo from './editores/EditorModulo';
import {claseDe,type ContextoTaller} from './contexto';
import {CLASES_YUGEN,UMBRALES_CLASE} from '../../lib/clases';
import {TIPOS,type Efecto} from '../../lib/creacion';
import type {CondicionRegla,EfectoRegla} from '../../lib/reglas';
import {ICONO_EFECTO_REGLA,ICONO_EVENTO,planSoltar,probarSoltar,type Destino,type Pieza} from '../../lib/yunque-grimorio';
import {mensajeError} from '../../lib/errores';
import {aGrafo,leerRuta,type Nodo,type TipoNodo} from '../../lib/yunque-grafo';
import {aplicar,copiar,type Operacion} from '../../lib/yunque-operaciones';
import {NODO,disponer,guardarPosiciones,leerPosiciones,type Punto} from '../../lib/yunque-disposicion';
import type {Borrador} from '../../lib/yunque-borrador';
import './yunque.css';

export type {ContextoTaller} from './contexto';
type Props={b:Borrador;setB:Dispatch<SetStateAction<Borrador>>;ctx:ContextoTaller;onGuardar:()=>void|Promise<void>;guardando:boolean;error:string};
const ICONO_EFECTO:Record<Efecto['efecto'],string>={dano:'espada',curacion:'pocion',estado:'fuego',crear_arma:'arco',transformacion:'alma',recuperar_ph:'agua',reducir_fatiga:'vida'};
const MODULOS:TipoNodo[]=['alcance','salvacion','estado','reaccion','transformacion','recurso','vfx','tabla_armas'];
const NUCLEO_LLEVA:Record<string,TipoNodo[]>={personaje:['cuando'],pasiva:['pasiva','cuando'],objeto:['accion','cuando','pasiva'],habilidad:['accion','cuando'],titulo:['accion','cuando'],otro:['accion','cuando','pasiva']};
const claveDe=(b:Borrador)=>`yunque:posiciones:${b.id||'nuevo'}`;
const ICONO_SI:Record<CondicionRegla['tipo'],string>={siempre:'yugen',comparar:'vida',estado:'alma',elemento:'fuego',probabilidad:'ojo',estado_terminado:'libro',todas:'corona',alguna:'corona',no:'ojo'};
const leer=leerRuta;
/** Pieza soltada en el vacío que aún no puede vivir en el borrador: solo existe en la interfaz hasta que se conecta. */
type Suelto={id:string;pieza:Pieza;p:Punto};
const FRASE_SUELTO='Sin conectar: arrastra un cable desde un puerto compatible hasta aquí, o arrastra esta pieza sobre su nodo.';

export default function TallerYunque({b,setB,ctx,onGuardar,guardando,error}:Props){
 const contextoGrafo=useMemo(()=>({creaciones:ctx.creaciones}),[ctx.creaciones]);
 const grafo=useMemo(()=>aGrafo(b,contextoGrafo),[b,contextoGrafo]);
 const clave=claveDe(b);
 const [guardadas,setGuardadas]=useState(()=>({clave,p:leerPosiciones(clave)}));
 if(guardadas.clave!==clave)setGuardadas({clave,p:leerPosiciones(clave)});
 const posiciones=useMemo(()=>disponer(grafo,guardadas.p),[grafo,guardadas.p]);
 const [eleccion,setSeleccion]=useState<string|null>('nucleo');
 // Piezas sueltas (por creación): se descartan al cambiar de creación o al forjar.
 const [sueltosDe,setSueltosDe]=useState<{clave:string;lista:Suelto[]}>({clave,lista:[]});
 const sueltos=useMemo(()=>sueltosDe.clave===clave?sueltosDe.lista:[],[sueltosDe,clave]);
 const setSueltos=useCallback((f:(l:Suelto[])=>Suelto[])=>setSueltosDe(s=>({clave,lista:f(s.clave===clave?s.lista:[])})),[clave]);
 const contador=useRef(0);
 const seleccion=eleccion&&(grafo.nodos.some(n=>n.id===eleccion)||sueltos.some(x=>x.id===eleccion))?eleccion:null;
 const lienzo=useRef<LienzoAPI>(null);
 const [arrastre,setArrastre]=useState<{pieza:Pieza;compatibles:ReadonlySet<string>;sobre:Destino|null;dentro:boolean;punto:Punto|null}|null>(null);
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
 // Al pasar a otra creación, las piezas sueltas de la anterior se descartan con un aviso.
 const descartadas=sueltosDe.clave!==clave?sueltosDe.lista.length:0;
 useEffect(()=>{
  if(!descartadas)return;
  avisar(`${descartadas===1?'Se descartó 1 pieza':`Se descartaron ${descartadas} piezas`} sin conectar de la creación anterior.`,'info');
  setSueltosDe({clave,lista:[]});
 },[descartadas,clave,avisar]);
 const fijarPosicion=useCallback((cambios:Record<string,Punto>)=>{
  setGuardadas(g=>{const p={...g.p,...cambios};guardarPosiciones(g.clave,p);return {clave:g.clave,p};});
 },[]);
 const mover=useCallback((id:string,p:Punto)=>{
  if(id.startsWith('suelto:'))setSueltos(l=>l.map(x=>x.id===id?{...x,p}:x));else fijarPosicion({[id]:p});
 },[fijarPosicion,setSueltos]);

 /**
  * Aplica operaciones en orden sobre el último borrador; si una falla, no cambia nada, avisa y devuelve false.
  * Los nodos creados se animan y se eligen; con `marcar` (soltar una pieza) se destella el destino si no se creó nada.
  */
 function ejecutar(ops:Operacion[],punto?:Punto,info?:string,marcar?:string):boolean{
  const antes=bRef.current;let nuevo=antes;
  try{for(const o of ops)nuevo=aplicar(nuevo,o);}catch(e){avisar(mensajeError(e,'No se pudo hacer ese cambio.'));return false;}
  bRef.current=nuevo;setB(nuevo);
  if(info)avisar(info,'info');
  if(!marcar&&ops.every(o=>o.op==='fijar'))return true;
  const previos=new Set(aGrafo(antes,contextoGrafo).nodos.map(n=>n.id));
  const creados=aGrafo(nuevo,contextoGrafo).nodos.filter(n=>!previos.has(n.id)).map(n=>n.id);
  if(!creados.length&&marcar)creados.push(marcar);
  if(!creados.length)return true;
  if(punto&&creados[0]!==marcar){
   // Los nodos nuevos conservan entre sí la disposición automática, con el primero en el punto de destino.
   // Los demás bajan lo justo para no caer encima de otro nodo.
   const auto=disponer(aGrafo(nuevo,contextoGrafo),guardadas.p),a0=auto[creados[0]];
   const ocupados=Object.entries(posiciones).filter(([id])=>!creados.includes(id)).map(([,p])=>p);
   const choca=(p:Punto)=>ocupados.some(q=>Math.abs(q.x-p.x)<NODO.ancho+20&&Math.abs(q.y-p.y)<NODO.alto);
   const sitio:Record<string,Punto>={};
   creados.forEach((id,k)=>{
    let p=k===0||!a0||!auto[id]?punto:{x:Math.round(auto[id].x-a0.x+punto.x),y:Math.round(auto[id].y-a0.y+punto.y)};
    for(let n=0;k>0&&n<30&&choca(p);n++)p={x:p.x,y:p.y+NODO.alto/2};
    sitio[id]=p;ocupados.push(p);
   });
   fijarPosicion(sitio);
  }
  const conjunto=new Set(creados);setNuevos(conjunto);setSeleccion(creados[0]);
  despues(700,()=>setNuevos(s=>s===conjunto?new Set():s));
  return true;
 }
 const operar=(o:Operacion,punto?:Punto)=>ejecutar([o],punto);

 /** Soltar una pieza del Grimorio: sobre un nodo, se engancha; en el vacío, se une al núcleo o queda suelta. */
 function soltarPieza(pieza:Pieza,destino:Destino|null,punto:Punto|null,puntoSuelto=punto){
  let ops:Operacion[]|null;
  try{ops=planSoltar(bRef.current,pieza,destino);}catch(e){avisar(mensajeError(e,'Esa pieza no encaja ahí.'));return;}
  if(ops){ejecutar(ops,destino?undefined:punto??undefined,undefined,destino?.nodo??'nucleo');return;}
  const id=`suelto:${++contador.current}`;
  setSueltos(l=>[...l,{id,pieza,p:puntoSuelto??{x:0,y:0}}]);
  setSeleccion(id);
  avisar(`«${pieza.nombre}» queda sin conectar: llévala hasta ${pieza.tipo==='si'?'una regla':pieza.tipo==='entonces'?'una regla o un efecto':'una acción'} para que forme parte de la creación.`,'info');
 }
 /** El Grimorio suelta una pieza (con posición de pantalla) o la pide con un clic (sin posición). */
 function alSoltar(pieza:Pieza,pantalla:Punto|null){
  setArrastre(null);
  const api=lienzo.current;if(!api)return;
  if(!pantalla){
   const sel=seleccion&&!seleccion.startsWith('suelto:')?{nodo:seleccion}:null;
   // Sin posición: los nodos conectados van a su sitio automático; una pieza suelta aparece en el centro de la vista.
   const c=api.centro();
   soltarPieza(pieza,sel&&probarSoltar(bRef.current,pieza,sel)?sel:null,null,{x:Math.round(c.x-130),y:Math.round(c.y-60)});
   return;
  }
  if(!api.dentro(pantalla.x,pantalla.y))return;
  const m=api.aMundo(pantalla.x,pantalla.y);
  soltarPieza(pieza,api.destinoEn(pantalla.x,pantalla.y),{x:Math.round(m.x-24),y:Math.round(m.y-20)});
 }
 /** Mientras se arrastra: qué nodos la admiten (se calcula una vez por pieza) y cuál está debajo. */
 function alArrastrar(pieza:Pieza|null,pantalla:Punto|null){
  const api=lienzo.current;
  if(!pieza||!pantalla||!api){setArrastre(null);return;}
  setArrastre(a=>{
   const compatibles=a?.pieza===pieza?a.compatibles:new Set(grafo.nodos.filter(n=>probarSoltar(bRef.current,pieza,{nodo:n.id})).map(n=>n.id));
   const dentro=api.dentro(pantalla.x,pantalla.y);
   return {pieza,compatibles,dentro,sobre:dentro?api.destinoEn(pantalla.x,pantalla.y):null,punto:dentro?api.aMundo(pantalla.x,pantalla.y):null};
  });
 }
 /** Conectar una pieza suelta: el nodo nace donde estaba la pieza. */
 function conectarSuelto(id:string,destino:Destino){
  const s=sueltos.find(x=>x.id===id);if(!s)return;
  let ops:Operacion[]|null;
  try{ops=planSoltar(bRef.current,s.pieza,destino);}catch(e){avisar(mensajeError(e,'Esa pieza no encaja ahí.'));return;}
  if(!ops)return;
  if(ejecutar(ops,s.p,undefined,destino.nodo))setSueltos(l=>l.filter(x=>x.id!==id));
 }
 /** Forjar: las piezas sin conectar no pertenecen a ninguna regla ni acción y se descartan con un aviso. */
 function forjar(){
  if(sueltos.length){
   setSueltos(()=>[]);
   avisar(`${sueltos.length===1?'Se descartó 1 pieza sin conectar':`Se descartaron ${sueltos.length} piezas sin conectar`}: ${sueltos.map(x=>`«${x.pieza.nombre}»`).join(', ')}.`,'info');
  }
  void onGuardar();
 }

 /** Soltar un cable sobre un nodo compatible: un módulo cambia de acción (se copia y se quita del origen). */
 function conectar(origen:{nodo:string;puerto:string},destino:string){
  if(destino.startsWith('suelto:')){conectarSuelto(destino,{nodo:origen.nodo,puerto:origen.puerto});return;}
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
 const avisoInfo=useCallback((t:string)=>avisar(t,'info'),[avisar]);
 const nodosSueltos=useMemo<Nodo[]>(()=>sueltos.map(s=>({id:s.id,tipo:s.pieza.tipo,ruta:[],titulo:s.pieza.nombre,frase:FRASE_SUELTO,error:null,puertos:[{id:'entrada',lado:'entrada',acepta:[]}]})),[sueltos]);
 const compatiblesSuelto=useMemo(()=>Object.fromEntries(sueltos.map(x=>[x.id,new Set(grafo.nodos.filter(n=>probarSoltar(b,x.pieza,{nodo:n.id})).map(n=>n.id))])),[sueltos,grafo,b]);
 const posicionesLienzo=useMemo(()=>sueltos.length?{...posiciones,...Object.fromEntries(sueltos.map(s=>[s.id,s.p]))}:posiciones,[posiciones,sueltos]);
 // Guía del arrastre: el nodo bajo el cursor (si la admite) o el núcleo (si la pieza se une a él en el vacío).
 const guia=useMemo<GuiaPieza|null>(()=>{
  if(!arrastre)return null;
  const {pieza,sobre,compatibles,punto,dentro}=arrastre;
  let cable:GuiaPieza['cable']=null;
  if(dentro&&!sobre){
   let alNucleo=false;try{alNucleo=!!planSoltar(b,pieza,null);}catch{/* no aplica */}
   const puerto=grafo.nodos[0]?.puertos.find(q=>q.lado==='salida'&&q.acepta.includes(pieza.tipo));
   if(alNucleo&&puerto)cable={nodo:'nucleo',puerto:puerto.id};
  }
  return {compatibles,sobre:sobre?.nodo??null,cable,punto};
 },[arrastre,b,grafo]);
 const pista=useMemo<PistaSoltar|null>(()=>{
  if(!arrastre)return null;
  const {pieza,sobre,compatibles,dentro}=arrastre;
  if(!dentro)return {texto:'Suéltala en el lienzo',tono:'neutro'};
  if(sobre){
   const n=grafo.nodos.find(x=>x.id===sobre.nodo);if(!n)return null;
   if(!compatibles.has(n.id))return {texto:`«${n.titulo}» no la admite`,tono:'mal'};
   if(pieza.tipo==='cuando'&&n.tipo==='cuando')return {texto:`Cambia el evento de «${n.titulo}»`,tono:'bien'};
   return {texto:`Engancha a «${n.titulo}»${sobre.puerto==='fallo'?' · fallo':sobre.puerto==='exito'?' · éxito':''}`,tono:'bien'};
  }
  let alNucleo=false;try{alNucleo=!!planSoltar(b,pieza,null);}catch{/* no aplica */}
  return alNucleo?{texto:'Se une al núcleo',tono:'bien'}:{texto:'Quedará sin conectar',tono:'neutro'};
 },[arrastre,b,grafo]);

 const contenido=(n:Nodo):ContenidoNodo=>{
  if(n.tipo==='nucleo')return {
   icono:b.icono||(b.ramaMonstruo?'bestia':ICONO_CREACION[b.tipo]),
   pie:<div className="yq-forjar-rapido">{lleva.map(t=><button type="button" key={t} data-familia={familiaDe(t)} onClick={()=>agregar(t)}>+ {t==='cuando'?'Regla':NOMBRE_TIPO[t]}</button>)}</div>,
   editor:<EditorNucleo b={b} nodo={n} operar={o=>operar(o)} ctx={ctx}/>,
  };
  if(n.id.startsWith('suelto:')){const s=sueltos.find(x=>x.id===n.id);return {icono:s?.pieza.icono,pie:<button type="button" className="yq-boton is-peligro" onClick={()=>setSueltos(l=>l.filter(x=>x.id!==n.id))}>Descartar</button>};}
  const props={b,nodo:n,operar:(o:Operacion)=>operar(o)};
  switch(n.tipo){
   case 'accion':{const e=b.efectos[n.ruta[1] as number];return {icono:e?ICONO_EFECTO[e.efecto]:undefined,editor:<EditorAccion {...props}/>};}
   case 'cuando':{const r=b.reglas[n.ruta[1] as number];return {icono:r?ICONO_EVENTO[r.evento]:undefined,editor:<EditorCuando {...props}/>};}
   case 'si':{const c=leer(b,n.ruta) as CondicionRegla|undefined;return {icono:c?ICONO_SI[c.tipo]:undefined,editor:<EditorSi {...props}/>};}
   case 'entonces':{const e=leer(b,n.ruta) as EfectoRegla|undefined;return {icono:e?ICONO_EFECTO_REGLA[e.tipo]:undefined,editor:<EditorEntonces {...props}/>};}
   case 'pasiva':return {editor:<EditorPasivaNodo {...props}/>};
   case 'vinculo':return {};
   default:return {editor:<EditorModulo {...props} ctx={ctx} avisar={avisoInfo}/>};
  }
 };

 return <div className="yq-taller">
  <header className="yq-barra">
   <span className="yq-barra-runa"><Runa seccion="forja" size={30}/></span>
   <div className="yq-barra-titulo"><small>El Yunque</small><h1>{b.nombre.trim()||'Nueva creación'}</h1></div>
   <span className="yq-barra-tipo"><IconoYugen id={b.ramaMonstruo?'bestia':ICONO_CREACION[b.tipo]} size={16}/>{b.ramaMonstruo?'Monstruo':TIPOS.find(t=>t.valor===b.tipo)?.nombre}</span>
   <span className="yq-barra-clase" title="Clase calculada con los atributos, la acción más potente, los bonos pasivos y las reglas"><b>{clase.clase}</b><span>Clase · {clase.puntuacion} pts</span></span>
   {errores.length>0&&<button type="button" className="yq-barra-errores" onClick={()=>setSeleccion(errores[0].id)}><span aria-hidden="true">!</span>{errores.length===1?'1 nodo por revisar':`${errores.length} nodos por revisar`}</button>}
   <button type="button" className="yq-forjar" disabled={guardando} onClick={forjar}><Hammer size={16} aria-hidden="true"/>{guardando?'Forjando…':'Forjar'}</button>
  </header>
  {error&&<p role="alert" className="yq-error-global">{error}</p>}
  <Grimorio filtro={lleva} creaciones={ctx.creaciones} excluir={b.id} onSoltar={alSoltar} onArrastrar={alArrastrar} pista={pista}>
   <h3 className="yq-indice-titulo">En el lienzo</h3>
   <ol className="yq-indice">{grafo.nodos.map(n=><li key={n.id}><button type="button" data-indice={n.id} aria-current={seleccion===n.id||undefined} data-familia={familiaDe(n.tipo)} onClick={()=>setSeleccion(n.id)} style={{paddingLeft:8+Math.min(3,n.ruta.length>2?2:n.tipo==='nucleo'?0:1)*12}}>
    <span className="yq-indice-punto" aria-hidden="true"/><span>{n.titulo}</span>{n.error&&<b aria-label="con error">!</b>}
   </button></li>)}
    {sueltos.map(s=><li key={s.id}><button type="button" className="is-suelto" aria-current={seleccion===s.id||undefined} data-familia={familiaDe(s.pieza.tipo)} onClick={()=>setSeleccion(s.id)} style={{paddingLeft:20}}>
     <span className="yq-indice-punto" aria-hidden="true"/><span>{s.pieza.nombre}</span><i>sin conectar</i>
    </button></li>)}</ol>
  </Grimorio>
  <section className="yq-centro" aria-label="Lienzo">
   <Lienzo api={lienzo} grafo={grafo} posiciones={posicionesLienzo} seleccion={seleccion} nuevos={nuevos} sueltos={nodosSueltos} guia={guia}
    onMover={mover} onSeleccionar={setSeleccion} onConectar={conectar} onOperar={operar} contenido={contenido} onSoltarSuelto={conectarSuelto} compatiblesSuelto={compatiblesSuelto}/>
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
