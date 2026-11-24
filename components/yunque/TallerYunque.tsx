'use client';
// Taller del Yunque: barra superior + tres paneles (grimorio, lienzo, arena). El Borrador es la única fuente
// de verdad; cada gesto es una Operacion pura (`aplicar`) y sus errores se muestran como aviso, nunca rompen.
import {memo,useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore,type Dispatch,type SetStateAction} from 'react';
import {BookOpen,Hammer,LayoutList,Redo2,Undo2,Workflow} from 'lucide-react';
import IconoYugen from '../IconoYugen';
import {Runa,Sello} from '../ui/Juego';
import Lienzo,{type ContenidoNodo,type GuiaPieza,type LienzoAPI} from './Lienzo';
import Grimorio,{type PistaSoltar} from './Grimorio';
import ArenaDolls from './ArenaDolls';
import VistaLista from './VistaLista';
import ResumenPlantillas from './ResumenPlantillas';
import type {CambioPlantilla} from '../../lib/yunque-plantillas-vivas';
import CajonFicha from './CajonFicha';
import {useBalanceBorrador} from './PruebaBalance';
import {claveDe as claveHistorial,useHistorial} from './useHistorial';
import EditorVinculo,{FiguraEquipo,iconoEnlazable,idDeVinculo,type EnlazableVista} from './editores/EditorVinculo';
import {NOMBRE_TIPO,familiaDe} from './NodoYunque';
import EditorNucleo,{ICONO_CREACION} from './editores/EditorNucleo';
import EditorAccion from './editores/EditorAccion';
import EditorCuando from './editores/EditorCuando';
import EditorSi from './editores/EditorSi';
import EditorEntonces from './editores/EditorEntonces';
import EditorPasivaNodo from './editores/EditorPasivaNodo';
import EditorModulo from './editores/EditorModulo';
import {activas,enlazables,esMonstruoB,faltantesDe,type ContextoTaller,type Creable} from './contexto';
import {imagenDeRaza} from '../../lib/estadisticas';
import {TIPOS,type Efecto} from '../../lib/creacion';
import type {CondicionRegla,EfectoRegla} from '../../lib/reglas';
import {ICONO_EFECTO_REGLA,ICONO_EVENTO,enlazableDe,piezasVinculo,planSoltar,probarSoltar,tipoPermitido,type Destino,type Pieza} from '../../lib/yunque-grimorio';
import {nombreHueco,planEnlazar,type Enlazable} from '../../lib/yunque-vinculos';
import {mensajeError} from '../../lib/errores';
import {aGrafo,estabilizar,leerRuta,type Grafo,type Nodo,type TipoNodo} from '../../lib/yunque-grafo';
import {aplicar,copiar,type Fragmento,type Operacion} from '../../lib/yunque-operaciones';
import {NODO,disponer,guardarPosiciones,leerPosiciones,type Punto} from '../../lib/yunque-disposicion';
import type {Borrador} from '../../lib/yunque-borrador';
import './yunque.css';

export type {ContextoTaller,Creable} from './contexto';
type Props={b:Borrador;setB:Dispatch<SetStateAction<Borrador>>;ctx:ContextoTaller;guardando:boolean;error:string;
 /** Guarda el borrador; resuelve `true` solo si la fila quedó guardada (si no, muestra su error en `error`). */
 documento:string;mesa:Map<string,Suelto[]>;navegacion:React.ReactNode;onNuevo:()=>void;onEditarVinculo:(id:string)=>void;
 onGuardar:()=>Promise<boolean>|boolean;
 /** Crear una pieza nueva dentro del personaje (flujo `padre` de la Forja). */
 crearDentro?:(tipo:Creable,slot?:string)=>void;
 /** El borrador es una pieza nueva creada dentro de un personaje (flujo `padre`): disposición propia y sin «Monstruos». */
 hijo?:boolean;
 /** Avisa a la Forja de que empieza otro borrador (p. ej. «Monstruos»): un guardado en curso ya no le da su `id`. */
 onNuevaSesion?:()=>void;
 /** Requisitos que el personaje no cumple para una creación de la colección (por defecto, el cálculo de la Forja). */
 faltantes?:(id:string)=>string[];
 /** Cambios que las plantillas trajeron al abrir esta creación; el panel se muestra mientras haya alguno. */
 cambiosPlantilla?:CambioPlantilla[];onCerrarCambios?:()=>void};
type Vista='lienzo'|'lista';
const ANCHO_LISTA=1024;
const suscribirAncho=(f:()=>void)=>{window.addEventListener('resize',f);return ()=>window.removeEventListener('resize',f);};
const esEstrecha=()=>window.innerWidth<ANCHO_LISTA;
const ICONO_EFECTO:Record<Efecto['efecto'],string>={desplazamiento:'ojo',dano:'espada',curacion:'pocion',estado:'fuego',crear_arma:'arco',transformacion:'alma',recuperar_ph:'agua',reducir_fatiga:'vida'};
const MODULOS:TipoNodo[]=['alcance','salvacion','estado','reaccion','transformacion','recurso','vfx','tabla_armas','vision'];
const NUCLEO_LLEVA:Record<string,TipoNodo[]>={personaje:['cuando','vinculo'],pasiva:['pasiva','cuando'],objeto:['accion','cuando','pasiva'],habilidad:['accion','cuando'],titulo:['accion','cuando'],otro:['accion','cuando','pasiva']};
/** Disposición guardada por creación; una pieza nueva creada dentro de un personaje no comparte la del personaje nuevo. */
const prefijoPosicion='yunque:posiciones:';
const mismaSesion=(desde:string,hasta:string)=>desde===hasta||
 (desde.startsWith(prefijoPosicion+'nuevo:')&&!hasta.startsWith(prefijoPosicion+'nuevo:'));
const ICONO_SI:Record<CondicionRegla['tipo'],string>={siempre:'yugen',comparar:'vida',estado:'alma',elemento:'fuego',probabilidad:'ojo',estado_terminado:'libro',todas:'corona',alguna:'corona',no:'ojo'};
const leer=leerRuta;
/** Pieza soltada en el vacío que aún no puede vivir en el borrador: solo existe en la interfaz hasta que se conecta. */
export type Suelto={id:string;pieza:Pieza;p:Punto};
const FRASE_SUELTO='Sin conectar: arrastra un cable desde un puerto compatible hasta aquí, o arrastra esta pieza sobre su nodo.';
/** Portapapeles del Yunque: vive mientras la página esté abierta, así Ctrl+C / Ctrl+V copian entre creaciones. */
let portapapeles:{fragmento:Fragmento;nombre:string}|null=null;
/** Los atajos se ignoran mientras se escribe en un campo. */
const escribiendo=(t:EventTarget|null)=>{
 if(!(t instanceof HTMLElement))return false;
 if(t.isContentEditable||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement)return true;
 return t instanceof HTMLInputElement&&!['checkbox','radio','button','submit','reset'].includes(t.type);
};
const PASO_FLECHA=20;

export default function TallerYunque({b,setB,ctx,documento,mesa,navegacion,onNuevo,onEditarVinculo,onGuardar,guardando,error,crearDentro,hijo=false,onNuevaSesion,faltantes:faltantesProp,cambiosPlantilla,onCerrarCambios}:Props){
 // Lista por defecto en pantallas estrechas (sigue al ancho hasta que el GM elige una vista).
 const estrecha=useSyncExternalStore(suscribirAncho,esEstrecha,()=>false);
 const [vistaElegida,setVista]=useState<Vista|null>(null);
 const vista:Vista=vistaElegida??(estrecha?'lista':'lienzo');
 const [ficha,setFicha]=useState(false);
 const [anclaFicha,setAnclaFicha]=useState<string|null>(null);
 const botonFicha=useRef<HTMLButtonElement>(null);
 const listaCaja=useRef<HTMLDivElement>(null);
 const piezasEnlace=useMemo(()=>enlazables(ctx,b.id),[ctx,b.id]);
 const porId=useMemo(()=>new Map<string,EnlazableVista>(piezasEnlace.map(p=>[p.id,p])),[piezasEnlace]);
 // Solo lo que sigue en La Creación (aprobado): un vínculo a algo archivado se ve roto.
 const contextoGrafo=useMemo(()=>({creaciones:activas(ctx)}),[ctx]);
 // El grafo conserva los nodos que no cambiaron (misma identidad): los nodos memorizados del lienzo no se repintan.
 const [derivado,setDerivado]=useState<{b:Borrador;ctx:typeof contextoGrafo;grafo:Grafo}>(()=>({b,ctx:contextoGrafo,grafo:aGrafo(b,contextoGrafo)}));
 let grafo=derivado.grafo;
 if(derivado.b!==b||derivado.ctx!==contextoGrafo){
  grafo=estabilizar(derivado.grafo,aGrafo(b,contextoGrafo));
  setDerivado({b,ctx:contextoGrafo,grafo});
 }
 const clave=prefijoPosicion+(b.id||'nuevo:'+documento+(hijo?':hijo':''));
 // `persistir`: la disposición cambió y se escribe en localStorage (en un efecto, nunca dentro de un actualizador).
 const [guardadas,setGuardadas]=useState(()=>({clave,p:leerPosiciones(clave),persistir:false}));
 // Al guardar por primera vez, la disposición de la creación nueva pasa a su `id` (si ese id aún no tenía una).
 if(guardadas.clave!==clave){
  const propias=leerPosiciones(clave);
  const heredar=mismaSesion(guardadas.clave,clave)&&!Object.keys(propias).length&&Object.keys(guardadas.p).length>0;
  setGuardadas({clave,p:heredar?guardadas.p:propias,persistir:heredar});
 }
 useEffect(()=>{if(guardadas.persistir)guardarPosiciones(guardadas.clave,guardadas.p);},[guardadas]);
 // Tamaño real (sin el editor desplegado) de cada nodo, medido por el lienzo: la disposición no los solapa.
 const [tamanos,setTamanos]=useState<Record<string,{w:number;h:number}>>({});
 const posiciones=useMemo(()=>disponer(grafo,guardadas.p,tamanos),[grafo,guardadas.p,tamanos]);
 const historial=useHistorial(b,setB,onNuevaSesion);
 const [eleccion,setSeleccion]=useState<string|null>('nucleo');
 // Las piezas sin conectar se conservan al navegar dentro de la misma página.
 const [sueltosDe,setSueltosDe]=useState<{clave:string;lista:Suelto[]}>(()=>({clave,lista:hijo?[]:mesa.get(b.id||documento)||[]}));
 const sueltos=useMemo(()=>mismaSesion(sueltosDe.clave,clave)?sueltosDe.lista:[],[sueltosDe,clave]);
 const setSueltos=useCallback((f:(l:Suelto[])=>Suelto[])=>setSueltosDe(s=>({clave,lista:f(mismaSesion(s.clave,clave)?s.lista:[])})),[clave]);
 useEffect(()=>{
  if(hijo)return;
  const id=b.id||documento;
  if(sueltos.length)mesa.set(id,sueltos);else mesa.delete(id);
 },[b.id,documento,hijo,mesa,sueltos]);
 const seleccion=eleccion&&(grafo.nodos.some(n=>n.id===eleccion)||sueltos.some(x=>x.id===eleccion))?eleccion:null;
 const lienzo=useRef<LienzoAPI>(null);
 const [arrastre,setArrastre]=useState<{pieza:Pieza;compatibles:ReadonlySet<string>;sobre:Destino|null;dentro:boolean;punto:Punto|null}|null>(null);
 const [nuevos,setNuevos]=useState<ReadonlySet<string>>(new Set());
 // Nodos que actuaron en la arena: se encienden 900 ms (si se repiten, el halo vuelve a empezar).
 const [encendidos,setEncendidos]=useState<ReadonlySet<string>>(new Set());
 const [aviso,setAviso]=useState<{texto:string;tono:'error'|'info';n:number}|null>(null);
 const [sello,setSello]=useState<number|null>(null);
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
 const descartadas=mismaSesion(sueltosDe.clave,clave)?0:sueltosDe.lista.length;
 useEffect(()=>{
  if(!descartadas)return;
  avisar(`${descartadas===1?'Se descartó 1 pieza':`Se descartaron ${descartadas} piezas`} sin conectar de la creación anterior.`,'info');
  setSueltosDe({clave,lista:[]});
 },[descartadas,clave,avisar]);
 const fijarPosicion=useCallback((cambios:Record<string,Punto>)=>{
  setGuardadas(g=>({clave:g.clave,p:{...g.p,...cambios},persistir:true}));
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
  bRef.current=nuevo;historial.confirmar(antes,nuevo,claveHistorial(ops));
  if(info)avisar(info,'info');
  if(!marcar&&ops.every(o=>o.op==='fijar'))return true;
  const previos=new Set(aGrafo(antes,contextoGrafo).nodos.map(n=>n.id));
  const creados=aGrafo(nuevo,contextoGrafo).nodos.filter(n=>!previos.has(n.id)).map(n=>n.id);
  if(!creados.length&&marcar)creados.push(marcar);
  if(!creados.length)return true;
  if(punto&&creados[0]!==marcar){
   // Los nodos nuevos conservan entre sí la disposición automática, con el primero en el punto de destino.
   // Los demás bajan lo justo para no caer encima de otro nodo.
   const auto=disponer(aGrafo(nuevo,contextoGrafo),guardadas.p,tamanos),a0=auto[creados[0]];
   const tam=(id:string)=>tamanos[id]??{w:NODO.ancho,h:NODO.alto};
   const ocupados=Object.entries(posiciones).filter(([id])=>!creados.includes(id)).map(([id,p])=>({...p,...tam(id)}));
   const choca=(p:Punto,t:{w:number;h:number})=>ocupados.some(q=>p.x<q.x+q.w+20&&q.x<p.x+t.w+20&&p.y<q.y+q.h&&q.y<p.y+t.h);
   const sitio:Record<string,Punto>={};
   creados.forEach((id,k)=>{
    let p=k===0||!a0||!auto[id]?punto:{x:Math.round(auto[id].x-a0.x+punto.x),y:Math.round(auto[id].y-a0.y+punto.y)};
    for(let n=0;k>0&&n<30&&choca(p,tam(id));n++)p={x:p.x,y:p.y+NODO.alto/2};
    sitio[id]=p;ocupados.push({...p,...tam(id)});
   });
   fijarPosicion(sitio);
  }
  const conjunto=new Set(creados);setNuevos(conjunto);setSeleccion(creados[0]);
  despues(700,()=>setNuevos(s=>s===conjunto?new Set():s));
  return true;
 }
 const operar=(o:Operacion,punto?:Punto)=>ejecutar([o],punto);
 /** Empieza un borrador nuevo como un único paso del historial (Ctrl+Z vuelve al anterior, con su `id`). */
 function reemplazar(nuevo:Borrador,info?:string){
  // Con un guardado en curso no se cambia de borrador: su `id` podría acabar en el nuevo.
  if(guardando)return;
  onNuevaSesion?.();
  const antes=bRef.current;
  bRef.current=nuevo;historial.confirmar(antes,nuevo,null,true);
  setSeleccion('nucleo');
  if(info)avisar(info,'info');
 }

 /** Soltar una pieza del Grimorio: sobre un nodo, se engancha; en el vacío, se une al núcleo o queda suelta. */
 function soltarPieza(pieza:Pieza,destino:Destino|null,punto:Punto|null,puntoSuelto=punto){
  const item=enlazableDe(pieza);
  if(item){enlazar(item,destino);return;}
  let ops:Operacion[]|null;
  try{ops=planSoltar(bRef.current,pieza,destino);}catch(e){avisar(mensajeError(e,'Esa pieza no encaja ahí.'));return;}
  if(ops){ejecutar(ops,destino?undefined:punto??undefined,undefined,destino?.nodo??'nucleo');return;}
  // En la lista no hay piezas sueltas: la pieza necesita un bloque que la admita.
  if(vista==='lista'){avisar(`Elige primero ${pieza.tipo==='si'?'una regla':pieza.tipo==='entonces'?'una regla o un efecto':'una acción'} y vuelve a pulsar «${pieza.nombre}».`,'info');return;}
  const id=`suelto:${crypto.randomUUID()}`;
  setSueltos(l=>[...l,{id,pieza,p:puntoSuelto??{x:0,y:0}}]);
  setSeleccion(id);
  avisar(`«${pieza.nombre}» queda sin conectar: llévala hasta ${pieza.tipo==='si'?'una regla':pieza.tipo==='entonces'?'una regla o un efecto':'una acción'} para que forme parte de la creación.`,'info');
 }
 const faltantes=useCallback((id:string)=>faltantesProp?faltantesProp(id):faltantesDe(bRef.current,ctx,id),[faltantesProp,ctx]);
 /** Enlazar una creación de la colección: sobre un hueco de la figura va a ese hueco; en el núcleo o el vacío, a su sitio. */
 function enlazar(item:Enlazable,destino:Destino|null){
  const slot=destino?.puerto?.startsWith('hueco:')?destino.puerto.slice(6):undefined;
  if(destino&&destino.nodo!=='nucleo'){avisar(`Suelta «${item.nombre}» sobre el núcleo o en un hueco de su figura.`);return;}
  const fallos=faltantes(item.id);
  if(fallos.length){avisar(`«${item.nombre}» no se puede enlazar: ${fallos.join('; ')}`);return;}
  let ops:Operacion[];
  try{ops=planEnlazar(bRef.current,item,slot,ctx.creaciones);}catch(e){avisar(mensajeError(e,'Esa creación no se puede enlazar.'));return;}
  const hueco=Object.entries((ops[0] as {valor:unknown}).valor as Record<string,string>).find(([,v])=>v===item.id)?.[0];
  ejecutar(ops,undefined,item.tipo==='habilidad'||item.tipo==='pasiva'?`«${item.nombre}» se suma a sus ${item.tipo==='habilidad'?'habilidades':'pasivas'}.`:`«${item.nombre}» equipada en ${nombreHueco(hueco??'')}.`,'nucleo');
 }
 function crear(tipo:Creable,slot?:string){
  if(crearDentro)crearDentro(tipo,slot);
  else avisar('Crear una pieza dentro del personaje solo funciona desde La Forja.','info');
 }
 /** La lista también recibe piezas arrastradas: el bloque (o hueco) bajo el cursor es el destino. */
 const apiLista=useMemo(()=>({
  dentro:(cx:number,cy:number)=>{const r=listaCaja.current?.getBoundingClientRect();return !!r&&cx>=r.left&&cx<=r.right&&cy>=r.top&&cy<=r.bottom;},
  destinoEn:(cx:number,cy:number)=>{
   for(const el of document.elementsFromPoint(cx,cy)){
    if(!(el instanceof HTMLElement)||!listaCaja.current?.contains(el))continue;
    const id=el.closest<HTMLElement>('[data-bloque]')?.dataset.bloque;if(!id)continue;
    const puerto=el.closest<HTMLElement>('[data-salida]')?.dataset.salida;
    return puerto?{nodo:id,puerto}:{nodo:id};
   }
   return null;
  },
  aMundo:()=>({x:0,y:0}),centro:()=>({x:0,y:0}),
 }),[]);
 const apiActual=()=>vista==='lista'?apiLista:lienzo.current;
 /** El Grimorio suelta una pieza (con posición de pantalla) o la pide con un clic (sin posición). */
 function alSoltar(pieza:Pieza,pantalla:Punto|null){
  setArrastre(null);
  const api=apiActual();if(!api)return;
  if(!pantalla){
   const sel=seleccion&&!seleccion.startsWith('suelto:')?{nodo:seleccion}:null;
   // Sin posición: los nodos conectados van a su sitio automático; una pieza suelta aparece en el centro de la vista.
   const c=api.centro();
   soltarPieza(pieza,sel&&!enlazableDe(pieza)&&probarSoltar(bRef.current,pieza,sel)?sel:null,null,{x:Math.round(c.x-130),y:Math.round(c.y-60)});
   return;
  }
  if(!api.dentro(pantalla.x,pantalla.y))return;
  const m=api.aMundo(pantalla.x,pantalla.y);
  soltarPieza(pieza,api.destinoEn(pantalla.x,pantalla.y),{x:Math.round(m.x-24),y:Math.round(m.y-20)});
 }
 /** Mientras se arrastra: qué nodos la admiten (se calcula una vez por pieza) y cuál está debajo. */
 function alArrastrar(pieza:Pieza|null,pantalla:Punto|null){
  const api=apiActual();
  if(!pieza||!pantalla||!api){setArrastre(null);return;}
  setArrastre(a=>{
   const compatibles=a?.pieza===pieza?a.compatibles:enlazableDe(pieza)?new Set(['nucleo']):new Set(grafo.nodos.filter(n=>probarSoltar(bRef.current,pieza,{nodo:n.id})).map(n=>n.id));
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
 /** Lleva la vista y el foco a un nodo (en el lienzo o en la lista) en cuanto se pinta elegido. */
 function enfocarNodo(id:string){
  setSeleccion(id);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const el=vista==='lista'
    ?document.querySelector<HTMLElement>(`.yq-vlista [data-bloque="${CSS.escape(id)}"] .yq-bloque-boton`)
    :document.querySelector<HTMLElement>(`.yq-lienzo .yq-nodo[data-nodo="${CSS.escape(id)}"]`);
   el?.focus({preventScroll:true});
  }));
 }
 /**
  * Forjar: guarda con la función de la Forja. Si sale bien, sello con destello y las piezas sin conectar
  * (que no pertenecen a ninguna regla ni acción) se descartan con un aviso. Si falla, el foco va al primer
  * nodo con error o, si el fallo es de la ficha (nombre, familia…), al núcleo; el error se ve arriba.
  */
 async function forjar(){
  const lista=sueltos;
  let guardado=false;
  try{guardado=await onGuardar();}catch(e){avisar(mensajeError(e,'No se pudo forjar.'));}
  if(!guardado){enfocarNodo(errores[0]?.id??'nucleo');return;}
  const n=Date.now();setSello(n);despues(1200,()=>setSello(s=>s===n?null:s));
  if(lista.length){
   const ids=new Set(lista.map(x=>x.id));
   setSueltos(l=>l.filter(x=>!ids.has(x.id)));
   avisar(`${lista.length===1?'Se descartó 1 pieza sin conectar':`Se descartaron ${lista.length} piezas sin conectar`}: ${lista.map(x=>`«${x.pieza.nombre}»`).join(', ')}.`,'info');
  }
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

 /** Deshacer / rehacer: el borrador vuelve atrás entero; la arena se reinicia sola con el cambio. */
 // Con un guardado en curso no se mueve el historial: el `id` que llegue debe ser del borrador que se guardó.
 function deshacer(){if(guardando)return;const r=historial.deshacer();if(r){bRef.current=r;avisar('Cambio deshecho.','info');}}
 function rehacer(){if(guardando)return;const r=historial.rehacer();if(r){bRef.current=r;avisar('Cambio rehecho.','info');}}
 /** Ctrl+C: el nodo elegido al portapapeles del Yunque (sirve también en otra creación). */
 function copiarNodo(id:string){
  const n=grafo.nodos.find(x=>x.id===id);if(!n)return;
  try{portapapeles={fragmento:copiar(bRef.current,id),nombre:n.titulo};}catch(e){avisar(mensajeError(e,'Ese nodo no se puede copiar.'));return;}
  avisar(`«${n.titulo}» copiado: pulsa Ctrl+V para pegarlo aquí o en otra creación.`,'info');
 }
 /** Ctrl+V: lo que cuelga del núcleo va al núcleo; el resto, al nodo elegido (con las mismas reglas que soltar una pieza). */
 function pegarNodo(){
  if(!portapapeles){avisar('No hay nada copiado: elige un nodo y pulsa Ctrl+C.','info');return;}
  const {fragmento,nombre}=portapapeles;
  if(!tipoPermitido(fragmento.tipo,lleva)){avisar(`«${nombre}» no cabe en ${b.tipo==='personaje'?'un personaje':'esta creación'}.`);return;}
  const pieza:Pieza={clave:'portapapeles',familia:'acciones',tipo:fragmento.tipo,nombre,ayuda:'',icono:'',fragmentos:[fragmento]};
  const alNucleo=['accion','cuando','pasiva'].includes(fragmento.tipo);
  const destino=alNucleo||!seleccion||seleccion.startsWith('suelto:')?null:{nodo:seleccion};
  let ops:Operacion[]|null;
  try{ops=planSoltar(bRef.current,pieza,destino);}catch(e){avisar(mensajeError(e,'No se puede pegar ahí.'));return;}
  if(!ops){avisar(`Elige primero dónde pegar «${nombre}» (${fragmento.tipo==='si'?'una regla':fragmento.tipo==='entonces'?'una regla o un efecto':'una acción'}).`,'info');return;}
  ejecutar(ops,undefined,undefined,destino?.nodo??'nucleo');
 }
 // Atajos de teclado (ignorados mientras se escribe en un campo).
 const teclas=useRef<(e:KeyboardEvent)=>void>(()=>{});
 useEffect(()=>{
  teclas.current=(e:KeyboardEvent)=>{
   if(e.defaultPrevented||e.altKey||escribiendo(e.target))return;
   const ctrl=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
   if(ctrl&&(k==='z'&&!e.shiftKey)){e.preventDefault();deshacer();return;}
   if(ctrl&&(k==='y'||(k==='z'&&e.shiftKey))){e.preventDefault();rehacer();return;}
   // El resto actúa sobre el nodo elegido: solo con el foco en el lienzo, la lista o fuera de los paneles.
   const t=e.target instanceof HTMLElement?e.target:null;
   if(ficha||(t&&t!==document.body&&!t.closest('.yq-centro')))return;
   // El nodo con el foco de teclado manda sobre el elegido.
   const sel=t?.matches('.yq-nodo[data-nodo]')?t.dataset.nodo!:seleccion;
   if(ctrl&&k==='v'){e.preventDefault();pegarNodo();return;}
   if(!sel)return;
   // Con texto seleccionado, Ctrl+C copia el texto como siempre.
   if(ctrl&&k==='c'){if(sel.startsWith('suelto:')||window.getSelection()?.toString())return;e.preventDefault();copiarNodo(sel);return;}
   if(ctrl&&k==='d'){e.preventDefault();if(!sel.startsWith('suelto:')&&sel!=='nucleo')ejecutar([{op:'duplicar',nodo:sel}]);return;}
   if(ctrl)return;
   if(e.key==='Delete'){
    e.preventDefault();
    if(sel.startsWith('suelto:')){setSueltos(l=>l.filter(x=>x.id!==sel));return;}
    if(sel!=='nucleo'&&ejecutar([{op:'quitar',nodo:sel}]))setSeleccion('nucleo');
    return;
   }
   const flecha:Record<string,Punto>={ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1}};
   // Las flechas mueven el nodo solo con el foco en un nodo o en el fondo (no en los controles de su editor).
   if(flecha[e.key]&&vista==='lienzo'&&(!t||t===document.body||t.matches('.yq-nodo[data-nodo],.yq-lienzo'))){
    const p=posicionesLienzo[sel];if(!p)return;
    e.preventDefault();
    const paso=e.shiftKey?PASO_FLECHA*4:PASO_FLECHA;
    mover(sel,{x:p.x+flecha[e.key].x*paso,y:p.y+flecha[e.key].y*paso});
   }
  };
 });
 useEffect(()=>{const f=(e:KeyboardEvent)=>teclas.current(e);window.addEventListener('keydown',f);return ()=>window.removeEventListener('keydown',f);},[]);

 const balance=useBalanceBorrador(b,ctx);
 /** Abre el cajón Ficha y lleva el foco dentro (o a la sección `ancla`); al cerrarlo, el foco vuelve a quien lo abrió. */
 const abridor=useRef<HTMLElement|null>(null);
 function abrirFicha(ancla?:string){
  if(!ficha)abridor.current=document.activeElement instanceof HTMLElement&&!document.activeElement.closest('#yq-ficha')?document.activeElement:null;
  setFicha(true);setAnclaFicha(ancla??null);
 }
 function cerrarCajon(){
  setFicha(false);
  const a=abridor.current;abridor.current=null;
  (a?.isConnected?a:botonFicha.current)?.focus();
 }
 const patchFicha=(p:Partial<Borrador>)=>{ejecutar(Object.entries(p).map(([k,v])=>({op:'fijar',ruta:[k],valor:v})));};
 const piezasColeccion=useMemo(()=>b.tipo==='personaje'?piezasVinculo(piezasEnlace,{id:b.id,nombre:b.nombre},ctx.creaciones):[],[b.tipo,b.id,b.nombre,piezasEnlace,ctx.creaciones]);
 const errores=grafo.nodos.filter(n=>n.error);
 const lleva=NUCLEO_LLEVA[b.tipo]||[];
 const agregar=(tipo:TipoNodo)=>operar({op:'agregar',tipo,padre:'nucleo'});
 const marco=useRef(0);
 useEffect(()=>()=>cancelAnimationFrame(marco.current),[]);
 const encender=useCallback((ids:string[])=>{
  const conjunto=new Set(ids);
  setEncendidos(new Set());
  cancelAnimationFrame(marco.current);
  marco.current=requestAnimationFrame(()=>{
   setEncendidos(conjunto);
   temporizadores.current.push(window.setTimeout(()=>setEncendidos(s=>s===conjunto?new Set():s),900));
  });
 },[]);
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
   let alNucleo=!!enlazableDe(pieza);try{alNucleo||=!!planSoltar(b,pieza,null);}catch{/* no aplica */}
   const puerto=grafo.nodos[0]?.puertos.find(q=>q.lado==='salida'&&q.acepta.includes(pieza.tipo));
   if(alNucleo&&puerto)cable={nodo:'nucleo',puerto:puerto.id};
  }
  return {compatibles,sobre:sobre?.nodo??null,cable,punto};
 },[arrastre,b,grafo]);
 const pista=useMemo<PistaSoltar|null>(()=>{
  if(!arrastre)return null;
  const {pieza,sobre,compatibles,dentro}=arrastre;
  if(!dentro)return {texto:vista==='lista'?'Suéltala sobre un bloque de la lista':'Suéltala en el lienzo',tono:'neutro'};
  const item=enlazableDe(pieza);
  if(item){
   if(sobre&&sobre.nodo!=='nucleo')return {texto:'Suéltala sobre el núcleo o en un hueco',tono:'mal'};
   const slot=sobre?.puerto?.startsWith('hueco:')?sobre.puerto.slice(6):undefined;
   try{planEnlazar(b,item,slot,ctx.creaciones);}catch(e){return {texto:mensajeError(e,'No encaja ahí'),tono:'mal'};}
   if(faltantes(item.id).length)return {texto:'No cumple sus requisitos',tono:'mal'};
   return {texto:slot?`Equipa en ${nombreHueco(slot)}`:item.tipo==='habilidad'||item.tipo==='pasiva'?'Se enlaza al personaje':'Se equipa en un hueco libre',tono:'bien'};
  }
  if(sobre){
   const n=grafo.nodos.find(x=>x.id===sobre.nodo);if(!n)return null;
   if(!compatibles.has(n.id))return {texto:`«${n.titulo}» no la admite`,tono:'mal'};
   if(pieza.tipo==='cuando'&&n.tipo==='cuando')return {texto:`Cambia el evento de «${n.titulo}»`,tono:'bien'};
   return {texto:`Engancha a «${n.titulo}»${sobre.puerto==='fallo'?' · fallo':sobre.puerto==='exito'?' · éxito':''}`,tono:'bien'};
  }
  let alNucleo=false;try{alNucleo=!!planSoltar(b,pieza,null);}catch{/* no aplica */}
  return alNucleo?{texto:'Se une al núcleo',tono:'bien'}:{texto:vista==='lista'?'Suéltala sobre un bloque':'Quedará sin conectar',tono:'neutro'};
 },[arrastre,b,grafo,vista,ctx.creaciones,faltantes]);

 /** Icono, pie y editor de un nodo. El editor solo se crea para el nodo elegido (el único que lo muestra). */
 const contenidoBase=(n:Nodo):ContenidoNodo=>{
  const conEditor=n.id===seleccion;
  if(n.tipo==='nucleo')return {
   icono:b.icono||(b.ramaMonstruo?'bestia':ICONO_CREACION[b.tipo]),
   pie:<>
    {b.tipo==='personaje'&&<FiguraEquipo b={b} figura={imagenDeRaza(ctx.categorias,b.clasificacion)} raza={ctx.categorias.find(c=>c.clave===b.clasificacion)?.nombre} piezas={porId}
     arrastrando={arrastre?enlazableDe(arrastre.pieza):null} sobre={arrastre?.sobre?.puerto?.startsWith('hueco:')?arrastre.sobre.puerto.slice(6):null}
     onElegir={setSeleccion} onQuitar={slot=>ejecutar([{op:'quitar',nodo:`vinculo:${slot}:${b.equipamiento[slot]}`}])} onCrear={crear}/>}
    <div className="yq-forjar-rapido">{lleva.filter(t=>t!=='vinculo').map(t=><button type="button" key={t} data-familia={familiaDe(t)} onClick={()=>agregar(t)}>+ {t==='cuando'?'Regla':NOMBRE_TIPO[t]}</button>)}
     {b.tipo==='personaje'&&<><button type="button" data-familia="vinculo" onClick={()=>crear('habilidad')}>Crear habilidad</button><button type="button" data-familia="vinculo" onClick={()=>crear('pasiva')}>Crear pasiva</button></>}
     {esMonstruoB(b,ctx)&&<button type="button" data-familia="vinculo" onClick={()=>abrirFicha('yq-ficha-especie')}>Especie y variantes</button>}
    </div>
   </>,
   editor:!conEditor?undefined:<EditorNucleo b={b} nodo={n} operar={o=>operar(o)} ejecutar={ops=>ejecutar(ops)} reemplazar={reemplazar} hijo={hijo} guardando={guardando} ctx={ctx}/>,
  };
  if(n.id.startsWith('suelto:')){const s=sueltos.find(x=>x.id===n.id);return {icono:s?.pieza.icono,pie:<button type="button" className="yq-boton is-peligro" onClick={()=>setSueltos(l=>l.filter(x=>x.id!==n.id))}>Descartar</button>};}
  const props={b,nodo:n,operar:(o:Operacion)=>operar(o)};
  switch(n.tipo){
   case 'accion':{const e=b.efectos[n.ruta[1] as number];return {icono:e?ICONO_EFECTO[e.efecto]:undefined,editor:!conEditor?undefined:<EditorAccion {...props}/>};}
   case 'cuando':{const r=b.reglas[n.ruta[1] as number];return {icono:r?ICONO_EVENTO[r.evento]:undefined,editor:!conEditor?undefined:<EditorCuando {...props}/>};}
   case 'si':{const c=leer(b,n.ruta) as CondicionRegla|undefined;return {icono:c?ICONO_SI[c.tipo]:undefined,editor:!conEditor?undefined:<EditorSi {...props}/>};}
   case 'entonces':{const e=leer(b,n.ruta) as EfectoRegla|undefined;return {icono:e?ICONO_EFECTO_REGLA[e.tipo]:undefined,editor:!conEditor?undefined:<EditorEntonces {...props} avisar={t=>avisar(t)}/>};}
   case 'pasiva':return {editor:!conEditor?undefined:<EditorPasivaNodo {...props}/>};
   case 'vinculo':{const p=porId.get(idDeVinculo(n.id));return {icono:iconoEnlazable(p),editor:!conEditor?undefined:<EditorVinculo onEditar={guardando||hijo?undefined:onEditarVinculo} b={b} nodo={n} ctx={ctx} ejecutar={ops=>ejecutar(ops)} avisar={t=>avisar(t)} faltantes={faltantes} onCrear={crear}/>};}
   default:return {editor:!conEditor?undefined:<EditorModulo {...props} ctx={ctx} avisar={avisoInfo}/>};
  }
 };
 /** Los nodos que vienen de una plantilla añaden «Convertir en nodo propio» (deshacible con Ctrl+Z). */
 const contenido=(n:Nodo):ContenidoNodo=>{
  const c=contenidoBase(n);
  if(!n.plantilla)return c;
  return {...c,pie:<>{c.pie}<button type="button" className="yq-boton yq-desvincular" onClick={()=>operar({op:'desvincular',nodo:n.id})}>Convertir en nodo propio</button></>};
 };

 const guiaLista=arrastre&&vista==='lista'?{compatibles:arrastre.compatibles,sobre:arrastre.sobre?.nodo??null}:null;
 return <div className={`yq-taller is-${vista}`} data-creacion={b.id||'nueva'}>
  <header className="yq-barra">
   <span className="yq-barra-runa"><Runa seccion="forja" size={30}/></span>
   <div className="yq-barra-titulo"><small>El Yunque</small><h1>{b.nombre.trim()||'Nueva creación'}</h1></div>
   <span className="yq-barra-tipo"><IconoYugen id={b.ramaMonstruo?'bestia':ICONO_CREACION[b.tipo]} size={16}/>{b.ramaMonstruo?'Monstruo':TIPOS.find(t=>t.valor===b.tipo)?.nombre}</span>
   <button type="button" className="yq-barra-clase" onClick={()=>abrirFicha()} title="Clase del borrador según la simulación. Pulsa para abrir el desglose."><b>{balance.informe?.clase??(balance.error?'—':'…')}</b><span>Clase del borrador</span></button>
   {errores.length>0&&<button type="button" className="yq-barra-errores" onClick={()=>setSeleccion(errores[0].id)}><span aria-hidden="true">!</span>{errores.length===1?'1 nodo por revisar':`${errores.length} nodos por revisar`}</button>}
   <div className="yq-historial" role="group" aria-label="Historial">
    <button type="button" onClick={deshacer} disabled={guardando||!historial.puedeDeshacer} aria-label="Deshacer" title="Deshacer (Ctrl+Z)" aria-keyshortcuts="Control+Z"><Undo2 size={15} aria-hidden="true"/></button>
    <button type="button" onClick={rehacer} disabled={guardando||!historial.puedeRehacer} aria-label="Rehacer" title="Rehacer (Ctrl+Y)" aria-keyshortcuts="Control+Y"><Redo2 size={15} aria-hidden="true"/></button>
   </div>
   <div className="yq-conmutador-vista" role="group" aria-label="Vista">
    <button type="button" aria-pressed={vista==='lienzo'} onClick={()=>setVista('lienzo')}><Workflow size={15} aria-hidden="true"/>Lienzo</button>
    <button type="button" aria-pressed={vista==='lista'} onClick={()=>setVista('lista')}><LayoutList size={15} aria-hidden="true"/>Lista</button>
   </div>
   <button ref={botonFicha} type="button" className="yq-barra-ficha" aria-expanded={ficha} aria-controls="yq-ficha" onClick={()=>ficha?cerrarCajon():abrirFicha()}><BookOpen size={15} aria-hidden="true"/>Ficha</button>
   {navegacion}
   <button type="button" className="yq-barra-ficha" disabled={guardando} onClick={()=>void forjar()}>{guardando?'Guardando…':'Guardar'}</button>
   <button type="button" className="yq-forjar" disabled={guardando||hijo} onClick={onNuevo} title="Abrir un lienzo vacío"><Hammer size={16} aria-hidden="true"/>Forjar</button>
  </header>
  {error&&<p role="alert" className="yq-error-global">{error}</p>}
  <Grimorio filtro={lleva} creaciones={ctx.creaciones} excluir={b.id} enlazar={piezasColeccion} onSoltar={alSoltar} onArrastrar={alArrastrar} pista={pista}>
   <h3 className="yq-indice-titulo">{vista==='lista'?'En la lista':'En el lienzo'}</h3>
   <ol className="yq-indice">{grafo.nodos.map(n=><EntradaIndice key={n.id} nodo={n} actual={seleccion===n.id} onElegir={setSeleccion}/>)}
    {vista==='lienzo'&&sueltos.map(s=><li key={s.id}><button type="button" className="is-suelto" aria-current={seleccion===s.id||undefined} data-familia={familiaDe(s.pieza.tipo)} onClick={()=>setSeleccion(s.id)} style={{paddingLeft:20}}>
     <span className="yq-indice-punto" aria-hidden="true"/><span>{s.pieza.nombre}</span><i>sin conectar</i>
    </button></li>)}</ol>
  </Grimorio>
  <section className="yq-centro" aria-label={vista==='lista'?'Lista':'Lienzo'}>
   {vista==='lienzo'?<Lienzo api={lienzo} onTamanos={setTamanos} grafo={grafo} posiciones={posicionesLienzo} seleccion={seleccion} nuevos={nuevos} encendidos={encendidos} sueltos={nodosSueltos} guia={guia}
    onMover={mover} onSeleccionar={setSeleccion} onConectar={conectar} onOperar={operar} contenido={contenido} onSoltarSuelto={conectarSuelto} compatiblesSuelto={compatiblesSuelto}/>
    :<div ref={listaCaja} className="yq-vlista-caja"><VistaLista grafo={grafo} seleccion={seleccion} onSeleccionar={setSeleccion} contenido={contenido} operar={o=>operar(o)} encendidos={encendidos} nuevos={nuevos} guia={guiaLista}/></div>}
   {/* Aviso y sello pueden nacer en el mismo milisegundo (al forjar): claves con prefijo para que no choquen. */}
   {cambiosPlantilla&&cambiosPlantilla.length>0&&onCerrarCambios&&<ResumenPlantillas cambios={cambiosPlantilla} onElegir={setSeleccion} onCerrar={onCerrarCambios}/>}
   {aviso&&<p key={`aviso:${aviso.n}`} role="status" className={`yq-aviso is-${aviso.tono}`}>{aviso.texto}</p>}
   {sello&&<div key={`sello:${sello}`} className="yq-sello" aria-hidden="true"><Sello texto="Creación forjada" runa="/arte/runas/forja.png" celebrar/></div>}
  </section>
  <aside className="yq-panel yq-arena" aria-label="Arena de dolls">
   <h2><IconoYugen id="espada" size={18}/>Arena de dolls</h2>
   {errores.length>0&&<ul className="yq-revisar">{errores.map(n=><li key={n.id}><button type="button" onClick={()=>setSeleccion(n.id)}><b>{n.titulo}</b><span>{n.error}</span></button></li>)}</ul>}
   <ArenaDolls b={b} ctx={ctx} grafo={grafo} onEncender={encender}/>
  </aside>
  <CajonFicha balance={balance} ancla={anclaFicha} b={b} patch={patchFicha} ctx={ctx} abierto={ficha} onCerrar={cerrarCajon}/>
 </div>;
}

/** Entrada del índice del Grimorio. Memorizada: al escribir en un nodo solo se repinta su propia entrada. */
const EntradaIndice=memo(function EntradaIndice({nodo:n,actual,onElegir}:{nodo:Nodo;actual:boolean;onElegir:(id:string)=>void}){
 return <li><button type="button" data-indice={n.id} aria-current={actual||undefined} data-familia={familiaDe(n.tipo)} onClick={()=>onElegir(n.id)} style={{paddingLeft:8+Math.min(3,n.ruta.length>2?2:n.tipo==='nucleo'?0:1)*12}}>
  <span className="yq-indice-punto" aria-hidden="true"/><span>{n.titulo}</span>{n.error&&<b aria-label="con error">!</b>}
 </button></li>;
});
