'use client';
// Arena de dolls del Yunque: un mini combate con el mismo tablero (TableroCombate) y la misma barra de acciones
// (BarraCombate) que el combate de la app. El doll portador lleva la creación del borrador; los sacos de golpes
// (hasta tres) solo reciben, y el primero devuelve un golpe cuando se pulsa «Golpéame». Todo vive en el navegador
// sobre `lib/yunque-arena.ts` y `lib/combate.ts`; nunca guarda nada. Cada paso enciende en el lienzo los nodos
// que actuaron (`activados`).
import {memo,useEffect,useMemo,useRef,useState} from 'react';
import {OPCIONES_ELEMENTO} from '../../lib/catalogos';
import {createPortal} from 'react-dom';
import {Maximize2,Minimize2,Move,Plus,RotateCcw,Swords,Trash2,Undo2} from 'lucide-react';
import IconoYugen from '../IconoYugen';
import LogoYugen from '../LogoYugen';
import {TableroCombate,BarraCombate,type FichaTablero} from '../TableroCombate';
import type {TiradaVisual} from '../AnimacionDados';
import {crearArena,usar,golpeame,turno,mover,levantar,agregarSaco,quitarSaco,alternarPieza,piezaEquipada,nombrePieza,colocar,sacosDe,activados,esSaco,SACOS,DOLL_BASE,SACO_BASE,pasoConReacciones,pasoInvocacion,
 type PausaArena,type AjustesDoll,type ContextoArena,type Golpe} from '../../lib/yunque-arena';
import {capaCombatiente,estadosVisibles,recursosVisibles,vistaOcular,acciones,deshacer,reaccionesDe,estadisticas,maxVida,dadoSeguro,posicionesTablero,dimensionesTablero,casillasAlcanzables,movimientoRestante,phDisponibles,
 accionUsableAhora,presupuestoRestante,huellaReserva,accionesEnCombate,type Fuente,type Accion,type Combate,type OfertaReaccion,type Posicion,type RNG} from '../../lib/combate';
import {huellaDe} from '../../lib/huellas-combate';
import MenuReaccion,{ListaReacciones} from '../MenuReaccion';
import MenuPotenciador from '../MenuPotenciador';
import VentanaInvocacion,{cargarCatalogoInvocacion,disenaEnCombate,materializarInvocacion} from '../InvocarCombate';
import type {InvocacionEditor} from '../EditorInvocacion';
import type {EleccionPotenciador} from '../../lib/rasgos';
import type {Efecto} from '../../lib/creacion';
import type {ProcedenciaMapa,SuperficieMapa} from '../../lib/mapas-procedurales';
import {atlasYugen} from '../../lib/tileset-yugen';
import {mensajeError} from '../../lib/errores';
import type {Grafo} from '../../lib/yunque-grafo';
import type {Borrador} from '../../lib/yunque-borrador';
import {valoresBorrador,type ContextoTaller} from './contexto';
import '../../app/ficha/jugador.css';
import './arena.css';

type Props={b:Borrador;ctx:ContextoTaller;grafo:Grafo;onEncender:(ids:string[])=>void};
type Ajustes=Partial<AjustesDoll>;
type Entrada={b:Borrador;creaciones:ContextoTaller['creaciones'];firma:string;doll:Ajustes;saco:Ajustes};
type Estado=Entrada&{combate:Combate|null;error:string};

const DOLL='doll',SACO='saco';
const IMAGEN_DOLL='/arte/dolls/portador.webp',IMAGEN_SACO='/arte/dolls/saco.webp';
const ELEMENTOS_GOLPE=[{valor:'',nombre:'Sin elemento'},...OPCIONES_ELEMENTO];
const CARAS=[4,6,8,10,12,20,100];
const AJUSTES:{clave:keyof AjustesDoll;nombre:string;saco:boolean}[]=[{clave:'vida',nombre:'Vida',saco:true},{clave:'ph',nombre:'PH',saco:false},{clave:'armadura',nombre:'Armadura',saco:true},{clave:'salvacion',nombre:'Salvación',saco:true}];
const REGISTRO=12;
const SIN_AJUSTES:Ajustes={};
/** «Colocar saco» reutiliza el apuntado del tablero: toda casilla queda al alcance y un clic la elige. */
const COLOCAR:Efecto={id:'colocar-saco',nombre:'Colocar saco',efecto:'estado',cantidad:0,caras:0,modificador:0,tipo_dano:'',estado:'',duracion:0,coste_ph:0,animacion:'ninguna',
 tablero:{alcance:60,forma:'individual',tamano:0,afecta:'todos',color:'dorado'}};

/**
 * Suelo del patio con el mismo atlas que los mapas del combate: solo dibujo (las casillas siguen libres de terreno),
 * adoquín con un borde de tierra. Se calcula una vez por tamaño y no viaja en el estado del combate.
 */
const suelos=new Map<string,ProcedenciaMapa>();
function sueloArena(columnas:number,filas:number):ProcedenciaMapa{
 const k=`${columnas}x${filas}`;
 let s=suelos.get(k);
 if(!s){
  const superficies:Record<string,SuperficieMapa>={};
  for(let y=0;y<filas;y++)for(let x=0;x<columnas;x++)superficies[`${x},${y}`]=x===0||y===0||x===columnas-1||y===filas-1?'tierra':'adoquin';
  s={schemaVersion:1,generatorVersion:'3.0.0',semilla:'arena-yunque',perfil:'pueblo',densidad:0,protegidas:[],atlas:atlasYugen(),superficies,objetos:[]};
  suelos.set(k,s);
 }
 return s;
}

/**
 * Lo que la prueba usa de la Colección: solo un personaje toma de ella sus habilidades, pasivas y equipo. Si la lista
 * se vuelve a cargar sin cambiar esas piezas, la prueba en curso no se reinicia.
 */
function firmaCreaciones(b:Borrador,creaciones:ContextoTaller['creaciones']):string{
 if(b.tipo!=='personaje')return '';
 const ids=new Set([...b.habilidades,...b.pasivas,...Object.values(b.equipamiento||{})].filter(Boolean));
 return JSON.stringify(creaciones.filter(c=>ids.has(c.id)));
}
function construir(e:Entrada,ctx:ContextoTaller,sacos:Posicion[]):Estado{
 const arena:ContextoArena={creaciones:e.creaciones,stats:e.b.tipo==='personaje'?valoresBorrador(e.b,ctx):{}};
 const r=crearArena(e.b,arena,e.doll,e.saco,{sacos});
 return 'error' in r?{...e,combate:null,error:r.error}:{...e,combate:r.combate,error:''};
}
const miembro=(c:Combate|null,id:string)=>c?.miembros.find(m=>m.id===id);
const kuroi=(e:unknown,respaldo:string)=>mensajeError(e,respaldo).replace(/\.?$/,'.');
const seguro=<T,>(f:()=>T,respaldo:T):T=>{try{return f();}catch{return respaldo;}};

function ArenaDolls({b,ctx,grafo,onEncender}:Props){
 // Una reacción ofrecida muestra el menú de decisión; el paso espera la respuesta.
 const [ofertaPendiente,setOfertaPendiente]=useState<{oferta:OfertaReaccion;responder:(si:boolean)=>void}|null>(null);
 const decidirReaccion=(oferta:OfertaReaccion)=>new Promise<boolean>(resolver=>setOfertaPendiente({oferta,responder:si=>{setOfertaPendiente(null);resolver(si);}}));
 const [doll,setDoll]=useState<Ajustes>(SIN_AJUSTES);
 const [saco,setSaco]=useState<Ajustes>(SIN_AJUSTES);
 // Dónde puso el GM los sacos: se conserva al reiniciar y al reconstruir la prueba con cambios del borrador.
 const disposicion=useRef<Posicion[]>([]);
 const firma=useMemo(()=>firmaCreaciones(b,ctx.creaciones),[b,ctx.creaciones]);
 const [estado,setEstado]=useState<Estado>(()=>construir({b,creaciones:ctx.creaciones,firma,doll:SIN_AJUSTES,saco:SIN_AJUSTES},ctx,[]));
 const combateActual=useRef(estado.combate);
 const [revisionVisual,setRevisionVisual]=useState(0);
 const [eventosVisuales,setEventosVisuales]=useState<NonNullable<Combate['evento_visual']>[]>([]);
 const [golpe,setGolpe]=useState<Golpe>({cantidad:1,caras:6,naturaleza:'fisica'});
 const [voz,setVoz]=useState('');
 // Invocación en pruebas: la habilidad cuya ventana está abierta (la misma ventana que en el combate).
 const [invocando,setInvocando]=useState<Fuente|null>(null);
 const [reinicio,setReinicio]=useState<{n:number;texto:string}|null>(null);
 // Estado de la jugada, como en la página de combate: acción elegida, objetivo, casilla apuntada y modos.
 const [accion,setAccion]=useState('');
 const [potenciando,setPotenciando]=useState<{accion:string;sel:{accion?:string;objetivo?:string;centro?:Posicion}}|null>(null);
 const [objetivo,setObjetivo]=useState('');
 const [centro,setCentro]=useState<Posicion|null>(null);
 const [moviendo,setMoviendo]=useState(false);
 const [colocando,setColocando]=useState(false);
 const [sacoElegido,setSacoElegido]=useState<string>(SACO);
 const [forzar,setForzar]=useState(false);
 const [ampliada,setAmpliada]=useState(false);
 const [raiz,setRaiz]=useState<HTMLElement|null>(null);
 const contador=useRef(0);
 const caja=useRef<HTMLDivElement>(null),botonAmpliar=useRef<HTMLButtonElement>(null),botonVolver=useRef<HTMLButtonElement>(null),ajustesRef=useRef<HTMLDetailsElement>(null);
 const ctxRef=useRef(ctx);
 useEffect(()=>{ctxRef.current=ctx;},[ctx]);

 const limpiarJugada=()=>{setCentro(null);setObjetivo('');setMoviendo(false);setColocando(false);setVoz('');};
 // Un borrador nuevo llega ya con su pausa (ArenaPausada): la prueba se reconstruye enseguida. Los ajustes de los dolls,
 // a los 300 ms.
 useEffect(()=>{
  if(estado.b===b&&estado.firma===firma&&estado.doll===doll&&estado.saco===saco)return;
  const borrador=estado.b!==b;
  const t=window.setTimeout(()=>{
   const nuevo=construir({b,creaciones:ctx.creaciones,firma,doll,saco},ctxRef.current,disposicion.current);
   combateActual.current=nuevo.combate;setEventosVisuales([]);setRevisionVisual(v=>v+1);setEstado(nuevo);
   setCentro(null);setObjetivo('');setMoviendo(false);setVoz('');
   const n=++contador.current;
   setReinicio({n,texto:borrador?'La prueba se reinició con los cambios':'Los dolls se ajustaron: la prueba empieza de nuevo'});
  },borrador?0:300);
  return ()=>window.clearTimeout(t);
 },[b,ctx.creaciones,firma,doll,saco,estado.b,estado.firma,estado.doll,estado.saco]);
 useEffect(()=>{
  if(!reinicio)return;
  const t=window.setTimeout(()=>setReinicio(r=>r?.n===reinicio.n?null:r),2600);
  return ()=>window.clearTimeout(t);
 },[reinicio]);
 // «Ampliar»: la arena cubre el Grimorio y el lienzo (se monta en .yq-taller); Escape (o «Volver») la devuelve al panel con el foco en «Ampliar».
 // Mientras está abierta, el Grimorio y el lienzo que cubre quedan inertes (ni foco ni clics por debajo).
 useEffect(()=>{
  if(!ampliada||!raiz)return;
  botonVolver.current?.focus();
  const tapados=[...raiz.querySelectorAll<HTMLElement>(':scope>.yq-grimorio,:scope>.yq-centro')].filter(el=>!el.inert);
  for(const el of tapados)el.inert=true;
  return ()=>{for(const el of tapados)el.inert=false;};
 },[ampliada,raiz]);
 // Escape primero cancela «Colocar saco» o «Mover»; si no hay ningún modo activo, cierra la vista ampliada.
 useEffect(()=>{
  if(!ampliada)return;
  const tecla=(e:KeyboardEvent)=>{
   if(e.key!=='Escape'||e.defaultPrevented)return;
   if(colocando)setColocando(false);
   else if(moviendo)setMoviendo(false);
   else cerrarAmpliada();
  };
  window.addEventListener('keydown',tecla);
  return ()=>window.removeEventListener('keydown',tecla);
 },[ampliada,colocando,moviendo]);
 function abrirAmpliada(){setRaiz(caja.current?.closest<HTMLElement>('.yq-taller')||document.body);setAmpliada(true);}
 function cerrarAmpliada(){setAmpliada(false);window.requestAnimationFrame(()=>botonAmpliar.current?.focus());}

 const c=estado.combate;
 const portador=miembro(c,DOLL);
 const caido=!!c&&(c.fase==='finalizado'||!portador||portador.vida<=0);
 const enCurso=!!c&&c.fase==='en_curso'&&!caido;
 const propias=useMemo(()=>new Set(b.efectos.map(e=>e.id)),[b.efectos]);
 // Las acciones de la creación van primero; luego las del motor (ataque básico, reglas…).
 const lista=useMemo<Accion[]>(()=>{
  if(!portador)return [];
  return seguro(()=>{
   const mia=(a:Accion)=>propias.has(a.efecto.id)||a.id.startsWith('regla:')?0:1;
   return (c?accionesEnCombate(c,portador):acciones(portador)).map((a,i)=>({a,i})).sort((x,y)=>mia(x.a)-mia(y.a)||x.i-y.i).map(x=>x.a);
  },[]);
 },[c,portador,propias]);
 const elegida=lista.some(a=>a.id===accion)||accion==='guardia'?accion:lista[0]?.id||'ataque';
 const efecto=lista.find(a=>a.id===elegida)?.efecto;
 const destino=c?.miembros.some(m=>m.id===objetivo)?objetivo:'';
 const imagenDoll=b.tipo==='personaje'&&b.imagen.trim()?b.imagen.trim():IMAGEN_DOLL;
 const fichas=useMemo<FichaTablero[]>(()=>{
  if(!c)return [];
  const p=seguro(()=>posicionesTablero(c),{} as Record<string,Posicion>);
  return c.miembros.filter(m=>p[m.id]).map(m=>({vfx:m.transformacion?.vfx,id:m.id,nombre:m.nombre,bando:m.bando,vida:m.vida,max_vida:seguro(()=>maxVida(m),m.vida),
   imagen_url:m.transformacion?.imagen_etapa||(m.id===DOLL?imagenDoll:m.invocacion?m.configuracion.imagen_url||IMAGEN_SACO:IMAGEN_SACO),estados:m.estados.map(e=>e.nombre),capa:capaCombatiente(m),estados_detalle:estadosVisibles(m),posicion:p[m.id],huella:huellaDe(m),huella_reserva:huellaDe(huellaReserva(m))}));
 },[c,imagenDoll]);
 const columnas=c?.mapa?.columnas,filas=c?.mapa?.filas;
 const mapa=useMemo(()=>columnas&&filas?{id:'arena-yunque',version:1 as const,nombre:'Arena del Yunque',columnas,filas,celdas:{},procedural:sueloArena(columnas,filas)}:undefined,[columnas,filas]);
 const alcanzables=useMemo(()=>c&&enCurso&&moviendo?seguro(()=>casillasAlcanzables(c,DOLL),{}):{},[c,enCurso,moviendo]);
 const sacos=c?.miembros.filter(m=>esSaco(m.id))||[];
 // El saco elegido para colocar puede haber desaparecido (Deshacer, Reiniciar, «Quitar saco»): entonces, el primero.
 const elegido=c?.miembros.some(m=>m.id===sacoElegido)?sacoElegido:SACO;
 // Lo que la barra lee del doll; si el motor lanzara, la barra se retira en vez de dejar el taller en blanco.
 const barra=useMemo(()=>portador?seguro(()=>({ph:phDisponibles(portador),stats:estadisticas(portador),max_vida:maxVida(portador),movimiento:movimientoRestante(portador)}),null):null,[portador]);
 // Habilidad, pasiva, personaje u otro: nada que quitar o poner (null) y el control se oculta.
 const equipada=c?seguro(()=>piezaEquipada(c),null):null;
 const reaccionSinEfecto=b.tipo!=='habilidad'&&b.tipo!=='personaje'&&b.efectos.some(e=>e.reaccion||e.defensa);

 const esperandoReaccion=useRef(false);
 function actualizarCombate(combate:Combate){
  const visual=combate.evento_visual;
  if(visual&&visual.id!==combateActual.current?.evento_visual?.id)
   setEventosVisuales(previos=>[...previos.slice(-249),visual]);
  combateActual.current=combate;
  setEstado(s=>({...s,combate}));
 }

 /** Un paso de la prueba: aplica, recoge los dados para la barra y enciende los nodos que actuaron. */
 function paso(f:(c:Combate,rng:RNG)=>Combate,respaldo:string,despues?:(n:Combate)=>void,previa?:PausaArena,respuesta?:boolean){
  const c=combateActual.current;
  if(!c||esperandoReaccion.current)return;
  let r:ReturnType<typeof pasoConReacciones>;
  try{r=pasoConReacciones(f,c,dadoSeguro,previa,respuesta);}catch(e){setVoz(kuroi(e,respaldo));return;}
  // Una reacción ofrecida espera la decisión en pantalla; el golpe se repite con las mismas tiradas.
  if('pausa' in r){
   const pausa=r.pausa;esperandoReaccion.current=true;
   void decidirReaccion(pausa.oferta).then(si=>{
    esperandoReaccion.current=false;
    if(combateActual.current===c)paso(f,respaldo,despues,pausa,si);
   });
   return;
  }
  const dados:TiradaVisual[]=r.tiradas.slice(0,8);
  let n=r.combate;
  if(n.evento_visual&&!n.evento_visual.dados?.length&&dados.length)n={...n,evento_visual:{...n.evento_visual,dados}};
  actualizarCombate(n);setVoz('');
  let ids:string[]=[];try{ids=activados(c,n,grafo);}catch{/* encender es solo visual */}
  if(ids.length)onEncender(ids);
  despues?.(n);
 }
 const recordar=(n:Combate)=>{disposicion.current=seguro(()=>sacosDe(n),disposicion.current);};
 // Un clic ejecuta: la barra pasa la acción propia y el tablero, el objetivo o el centro del mismo clic.
 function resolver(sel:{accion?:string;objetivo?:string;centro?:Posicion}={},potenciadores?:EleccionPotenciador[]){
  const id=sel.accion||elegida,ef=lista.find(a=>a.id===id)?.efecto;
  // Invocar abre su ventana (diseño o confirmación); al aceptar aparece la criatura en la arena.
  const fuente=lista.find(a=>a.id===id)?.invocacion;
  if(fuente){setInvocando(fuente);return;}
  // Técnica con potenciadores compatibles: primero el menú (cancelar no gasta nada).
  if(potenciadores===undefined&&!portador?.rafaga&&lista.find(a=>a.id===id)?.potenciadores?.length){setPotenciando({accion:id,sel});return;}
  // Igual que la página de combate: guardia, armas creadas, transformaciones y rugidos se lanzan sobre uno mismo.
  const propio=id==='guardia'||['crear_arma','transformacion'].includes(ef?.efecto||'')||ef?.tablero?.origen_area==='lanzador'||ef?.vision?.modo==='abrir';
  paso((x,rng)=>usar(x,id,propio?DOLL:(sel.objetivo??destino),rng,forzar,sel.centro||centro||undefined,potenciadores),'Esa acción no se pudo usar.',()=>{setCentro(null);setObjetivo('');setMoviendo(false);});
 }
 function atras(){
  const c=combateActual.current;
  if(!c)return;
  try{const n=deshacer(c);actualizarCombate(n);recordar(n);limpiarJugada();}
  catch(e){setVoz(kuroi(e,'No hay nada que deshacer.'));}
 }
 function reiniciar(){
  const nuevo=construir({b,creaciones:ctx.creaciones,firma,doll,saco},ctx,disposicion.current);
  combateActual.current=nuevo.combate;setEventosVisuales([]);setRevisionVisual(v=>v+1);setEstado(nuevo);
  limpiarJugada();
 }
 function alApuntar(p:Posicion,id?:string){
  if(!colocando){setCentro(p);setObjetivo(id||'');return;}
  if(id){if(esSaco(id))setSacoElegido(id);return;}
  paso(x=>colocar(x,elegido,p),'Ese saco no se pudo colocar.',recordar);
 }
 function nuevoSaco(){
  paso(x=>agregarSaco(x,saco),'No caben más sacos.',n=>{recordar(n);const id=SACOS.find(s=>n.miembros.some(m=>m.id===s)&&!c?.miembros.some(m=>m.id===s));if(id)setSacoElegido(id);});
 }
 function retirarSaco(){
  const id=[...SACOS].reverse().find(s=>s!==SACO&&c?.miembros.some(m=>m.id===s));
  if(id)paso(x=>quitarSaco(x,id),'Ese saco no se pudo retirar.',n=>{recordar(n);setSacoElegido(SACO);});
 }
 const ajustar=(quien:'doll'|'saco',clave:keyof AjustesDoll,valor:string)=>{
  const set=quien==='doll'?setDoll:setSaco;
  set(a=>{const n={...a};if(valor.trim()===''||!Number.isFinite(Number(valor)))delete n[clave];else n[clave]=Math.max(0,Math.round(Number(valor)));return n;});
 };
 const baseDe=(quien:'doll'|'saco',clave:keyof AjustesDoll)=>{
  if(quien==='saco')return SACO_BASE[clave];
  if(b.tipo==='personaje'){const v=valoresBorrador(b,ctx)[clave];return typeof v==='number'?v:0;}
  return DOLL_BASE[clave];
 };
 // Con el doll caído el motor sigue en curso: un golpe mortal se puede deshacer (no solo reiniciar).
 const deshacible=!!c&&c.fase!=='finalizado'&&(c.historial?.length||0)>0;
 const nombreElegido=miembro(c,elegido)?.nombre||'el saco';

 // «Golpéame», junto a la barra con los dados, la naturaleza y el elemento del golpe (siempre a la vista, sin desplazar las ranuras).
 const botonGolpe=<button type="button" className="yq-arena-golpeame" onClick={()=>paso((x,rng)=>golpeame(x,golpe,rng),'El saco no pudo golpear.',()=>{setCentro(null);setObjetivo('');})}>
  <Swords aria-hidden="true"/><strong>Golpéame</strong><small>{golpe.cantidad}d{golpe.caras}{golpe.naturaleza==='magica'?' mágico':''}</small></button>;
 const combate=c&&<div className={`yq-arena-combate ${ampliada?'is-ampliada':'is-compacta'}`}>
  <div className="yq-arena-herramientas" role="toolbar" aria-label="Herramientas de la arena">
   <div className="yq-arena-grupo">
   <button type="button" onClick={nuevoSaco} disabled={!enCurso||sacos.length>=SACOS.length} title="Añadir un saco al tablero (hasta 3)"><Plus size={14} aria-hidden="true"/>Saco <small>{sacos.length}/{SACOS.length}</small></button>
   <button type="button" aria-pressed={colocando} onClick={()=>{setColocando(v=>!v);setMoviendo(false);setCentro(null);setObjetivo('');}} disabled={!enCurso}><Move size={14} aria-hidden="true"/>Colocar<span className="yq-etiqueta"> saco</span></button>
   <button type="button" onClick={retirarSaco} disabled={!enCurso||sacos.length<2} title="Retirar el último saco añadido"><Trash2 size={14} aria-hidden="true"/><span className="sr-only">Quitar saco</span></button>
   </div>
   <div className="yq-arena-grupo">
   <button type="button" disabled={!deshacible} onClick={atras} title="Deshacer el último paso de la prueba"><Undo2 size={14} aria-hidden="true"/><span className="yq-etiqueta">Deshacer</span></button>
   <button type="button" className="yq-arena-reiniciar" onClick={reiniciar} title="Empezar la prueba de nuevo (los sacos se quedan donde están)"><RotateCcw size={14} aria-hidden="true"/><span className="yq-etiqueta">Reiniciar</span></button>
   {ampliada?<button ref={botonVolver} type="button" className="yq-arena-ampliar" onClick={cerrarAmpliada}><Minimize2 size={14} aria-hidden="true"/>Volver</button>
    :<button ref={botonAmpliar} type="button" className="yq-arena-ampliar" onClick={abrirAmpliada}><Maximize2 size={14} aria-hidden="true"/>Ampliar</button>}
   </div>
  </div>
  {colocando&&<p className="yq-arena-colocar" role="status">Colocando <b>{nombreElegido}</b>: toca una casilla libre. Toca otro saco para elegirlo; pulsa «Colocar saco» para terminar.</p>}
  <div className="yq-arena-tablero">
   {/* El aviso de reinicio flota sobre el tablero: no empuja la barra ni los botones mientras se juega. */}
   {reinicio&&<p key={reinicio.n} role="status" className="yq-arena-reinicio">{reinicio.texto}</p>}
   <TableroCombate key={`arena:${revisionVisual}`} ocular={colocando?null:vistaOcular(c,DOLL)} turnoPropio={enCurso&&c.actual===DOLL} mapa={mapa} habilidad={colocando?{...COLOCAR,nombre:`Colocar ${nombreElegido}`}:enCurso?efecto:undefined} lanzador={colocando?elegido:DOLL}
    centro={colocando?null:centro} puedeApuntar={enCurso&&(colocando||!portador||accionUsableAhora(lista.find(a=>a.id===elegida)?.presupuesto,portador,presupuestoRestante(c,portador)))} onApuntar={alApuntar}
    evento={c.evento_visual} eventosVisuales={eventosVisuales} fichas={fichas} {...dimensionesTablero(c)} actual={c.actual} objetivo={destino}
    moviendo={moviendo&&enCurso&&!colocando} alcanzables={alcanzables} ocupado={!enCurso}
    onObjetivo={id=>{if(colocando&&esSaco(id))setSacoElegido(id);else setObjetivo(id);}}
    onMover={p=>paso(x=>mover(x,p),'El doll no puede moverse ahí.')}
    puedeEjecutar={enCurso&&!colocando&&!!portador&&portador.vida>0&&accionUsableAhora(lista.find(a=>a.id===elegida)?.presupuesto,portador,presupuestoRestante(c,portador))&&c.actual===DOLL} onEjecutar={colocando?undefined:sel=>resolver(sel)}/>
   {caido&&<div className="yq-arena-fin" role="status"><strong>El doll cayó</strong><span>Deshaz el golpe o reinicia para seguir probando.</span>
    <div className="yq-arena-fin-botones">
     {deshacible&&<button type="button" className="yq-arena-reiniciar is-grande is-secundario" onClick={atras}><Undo2 size={16} aria-hidden="true"/>Deshacer el golpe</button>}
     <button type="button" className="yq-arena-reiniciar is-grande" onClick={reiniciar}><RotateCcw size={16} aria-hidden="true"/>Reiniciar la prueba</button>
    </div></div>}
  </div>
  <div className="yq-arena-lado">
  {voz&&<div className="yq-arena-kuroi is-breve" role="alert"><LogoYugen size={32}/><p><b>Kuroi detiene la prueba.</b>{voz}</p></div>}
  {enCurso&&portador&&!barra&&<p className="yq-panel-voz">Kuroi no puede leer las estadísticas del doll: revisa sus ajustes o reinicia la prueba.</p>}
  {potenciando&&lista.find(a=>a.id===potenciando.accion)&&<MenuPotenciador accion={lista.find(a=>a.id===potenciando.accion)!} onCancelar={()=>setPotenciando(null)} onConfirmar={el=>{const p=potenciando;setPotenciando(null);resolver(p.sel,el);}}/>}
  {enCurso&&portador&&barra&&<>
   <BarraCombate restante={presupuestoRestante(c,portador)} actor={{...portador,estados:portador.estados.map(e=>e.nombre),estados_detalle:estadosVisibles(portador),recursos:recursosVisibles(portador,true),ph:barra.ph,derribado:portador.estados.some(e=>e.tipo==='derribado'),stats:barra.stats,max_vida:barra.max_vida,imagen_url:portador.transformacion?.imagen_etapa||imagenDoll}}
    acciones={lista.map(a=>({...a,enfriamiento:a.regla?Math.max(0,(portador.motor?.proximos[a.regla]||0)-portador.turnos):portador.cooldowns[a.id]||0}))}
    seleccion={elegida} onSeleccion={id=>{setAccion(id);setCentro(null);setMoviendo(false);setColocando(false);}}
    onResolver={id=>resolver({accion:id})} onPasar={()=>paso((x,rng)=>turno(x,rng),'No se pudo pasar el turno.',()=>{limpiarJugada();setForzar(false);})}
    onInventario={()=>paso((x,rng)=>alternarPieza(x,rng),'No se pudo cambiar la pieza.')}
    inventario={equipada===null?{nombre:'Inventario',detalle:'',oculto:true}:{nombre:equipada?'Quitar':'Equipar',detalle:`«${nombrePieza(c)}»`,titulo:`${equipada?'Quitar':'Equipar'} «${nombrePieza(c)}»`}} objetivo={efecto?.tablero?(centro?`Casilla ${centro.x+1}, ${centro.y+1}`:undefined):miembro(c,destino)?.nombre}
    puede={portador.vida>0&&c.actual===DOLL} ocupado={false} moviendo={moviendo} onMovimiento={()=>{setMoviendo(v=>!v);setColocando(false);}}
    movimiento={barra.movimiento} forzar={forzar} onForzar={setForzar} dados={c.evento_visual?.dados} resultado={c.evento_visual?.resultado}
    onLevantarse={()=>paso(x=>levantar(x),'El doll no puede levantarse.')}
    />
   <ListaReacciones reacciones={seguro(()=>reaccionesDe(c,portador),[])}/>
   {invocando&&c&&(invocando.configuracion_invocacion as InvocacionEditor|undefined)&&<VentanaInvocacion key={invocando.id} titulo={invocando.nombre} config={invocando.configuracion_invocacion as InvocacionEditor} nivel={estadisticas(portador).nivel||1} disenar={disenaEnCombate((invocando.configuracion_invocacion as InvocacionEditor).modo)}
    nota="Prueba en la arena: la criatura aparece junto al doll y pasa sus turnos sola, como los sacos. Deshacer la retira."
    onCerrar={()=>setInvocando(null)}
    onConfirmar={async p=>{const n=await materializarInvocacion({combate:c,actorId:portador.id,habilidad:invocando,propuesta:p,datos:await cargarCatalogoInvocacion()});if(combateActual.current===c)actualizarCombate(pasoInvocacion(c,n));setVoz('');setInvocando(null);}}/>}
   <div className="yq-arena-golpe" role="group" aria-label="Golpe del saco">
    <span>Golpe del saco</span>
    {botonGolpe}
    <div className="yq-arena-golpe-dados">
     <label><span className="sr-only">Cuántos dados</span><input type="number" min={1} max={100} value={golpe.cantidad} onChange={e=>setGolpe(g=>({...g,cantidad:Math.max(1,Math.min(100,Math.round(Number(e.target.value)||1)))}))}/></label>
     <label><span className="sr-only">Caras del dado</span><select value={golpe.caras} onChange={e=>setGolpe(g=>({...g,caras:Number(e.target.value)}))}>{CARAS.map(k=><option key={k} value={k}>d{k}</option>)}</select></label>
    </div>
    <div className="yq-arena-naturaleza" role="group" aria-label="Naturaleza del golpe">
     {(['fisica','magica'] as const).map(n=><button key={n} type="button" aria-pressed={golpe.naturaleza===n} onClick={()=>setGolpe(g=>({...g,naturaleza:n}))}>{n==='fisica'?'Física':'Mágica'}</button>)}
    </div>
    <label className="yq-arena-elemento"><span className="sr-only">Elemento del golpe</span>
     <select value={golpe.elemento||''} onChange={e=>setGolpe(g=>({...g,elemento:e.target.value||undefined}))}>{ELEMENTOS_GOLPE.map(x=><option key={x.valor} value={x.valor}>{x.nombre}</option>)}</select>
    </label>
   </div>
  </>}
  </div>
 </div>;

 return <div ref={caja} className="yq-arena-juego">
  {ofertaPendiente&&<MenuReaccion oferta={ofertaPendiente.oferta} onDecidir={ofertaPendiente.responder}/>}
  {reinicio&&!combate&&<p key={reinicio.n} role="status" className="yq-arena-reinicio">{reinicio.texto}</p>}
  {estado.error?<div className="yq-arena-kuroi" role="alert">
   <LogoYugen size={40}/>
   <p><b>Kuroi no deja entrar a los dolls.</b>{estado.error}</p>
  </div>:<>
   {ampliada&&raiz?<>
    <div className="yq-arena-en-lienzo"><p>La arena está ampliada sobre el lienzo.</p><button type="button" onClick={cerrarAmpliada}><Minimize2 size={14} aria-hidden="true"/>Volver al panel</button></div>
    {createPortal(<section className="yq-arena-ampliada" role="dialog" aria-modal="true" aria-label="Arena ampliada">
     <header><h2><IconoYugen id="espada" size={18}/>Arena de dolls</h2><small>Escape vuelve al panel</small></header>
     {combate}
    </section>,raiz)}
   </>:combate}
   {reaccionSinEfecto&&<p className="yq-arena-pista"><IconoYugen id="escudo" size={14}/>Las reacciones solo actúan en habilidades: aquí no se dispararán.</p>}
   <details ref={ajustesRef} className="yq-arena-ajustes">
    <summary>Ajustes de los dolls</summary>
    {(['doll','saco'] as const).map(q=><fieldset key={q}>
     <legend>{q==='doll'?'Doll portador':'Sacos de golpes'}</legend>
     {AJUSTES.filter(a=>q==='doll'||a.saco).map(a=>{const actual=(q==='doll'?doll:saco)[a.clave];return <label key={a.clave}>
      <span>{a.nombre}</span>
      <input type="number" min={0} inputMode="numeric" value={actual??baseDe(q,a.clave)} onChange={e=>ajustar(q,a.clave,e.target.value)} aria-label={`${a.nombre} del ${q==='doll'?'doll':'saco'}`}/>
     </label>;})}
    </fieldset>)}
   </details>
   {c&&<>
    <h3>Registro</h3>
    <ol className="yq-arena-registro">{c.registro.slice(0,REGISTRO).map((l,i)=><li key={`${c.registro.length-i}`} className={i===0?'is-reciente':undefined}>{l}</li>)}</ol>
    {/* Solo se anuncia la entrada más reciente, no la lista entera. */}
    <p className="sr-only" aria-live="polite">{c.registro[0]??''}</p>
   </>}
  </>}
 </div>;
}

const Arena=memo(ArenaDolls);
/**
 * La arena recibe el borrador cuando se deja de teclear (350 ms) y el navegador está libre (como mucho 300 ms más):
 * con creaciones grandes, repintarla y reconstruir el combate en cada tecla frenaba la escritura en el lienzo.
 */
export default function ArenaPausada({b,ctx,grafo,onEncender}:Props){
 const [vista,setVista]=useState({b,grafo});
 // Solo el grafo cambió (p. ej. otra lista de creaciones): se pasa sin esperar.
 if(vista.b===b&&vista.grafo!==grafo)setVista({b,grafo});
 useEffect(()=>{
  if(vista.b===b)return;
  let ocioso=0;
  const pasar=()=>setVista({b,grafo});
  const t=window.setTimeout(()=>{
   if(typeof window.requestIdleCallback==='function')ocioso=window.requestIdleCallback(pasar,{timeout:300});
   else pasar();
  },350);
  return ()=>{window.clearTimeout(t);if(ocioso)window.cancelIdleCallback(ocioso);};
 },[b,grafo,vista]);
 return <Arena b={vista.b} ctx={ctx} grafo={vista.grafo} onEncender={onEncender}/>;
}
