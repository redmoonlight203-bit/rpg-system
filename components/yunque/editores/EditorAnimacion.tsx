'use client';

import {useEffect,useId,useRef,useState,type DragEvent,type ReactNode,type CSSProperties} from 'react';
import {Play,X} from 'lucide-react';
import AnimacionesDelTablero from '../../AnimacionesDelTablero';
import IconoYugen from '../../IconoYugen';
import BibliotecaVFX from '../../BibliotecaVFX';
import MiniaturaVFX from '../../MiniaturaVFX';
import EditorEsqueleto,{VistaGesto} from './EditorEsqueleto';
import {Fichas} from '../Controles';
import {ESQUELETOS_BASE,esqueletoBase} from '../../../lib/esqueletos';
import {areaDesdeFicha,esqueletoVisual,type EventoVisual,type Posicion} from '../../../lib/combate';
import {EFECTOS_NOMBRE,type Efecto} from '../../../lib/creacion';
import {DIRECCIONES_PATRON,MAX_RADIO_PATRON} from '../../../lib/patron-area';
import {buscarVFX,CATALOGO_VFX,clipsDeConfiguracion,separarVFX,orientarVFX,transformacionVFX,type AnimacionEtapa,type AnimacionRegla} from '../../../lib/vfx';
import {casillaDeClip,casillaRelativaVFX,DISPARADORES_VFX,MAX_CLIPS_VFX,MAX_DURACION_VFX,MAX_INICIO_VFX,rutasVFX,type DisparadorVFX,type GeometriaVFX,type PasoVFX} from '../../../lib/secuencia-vfx';
import './editor-animacion.css';

const radio=MAX_RADIO_PATRON;
const lado=2*radio+1;
const dimensiones={columnas:lado,filas:lado};
const origen={x:radio,y:radio};
const casillas=Array.from({length:lado*lado},(_,i)=>({x:i%lado,y:Math.floor(i/lado)}));
const clave=({x,y}:{x:number;y:number})=>`${x},${y}`;
const nombre=(e:Efecto)=>e.nombre.trim()||EFECTOS_NOMBRE[e.efecto];

type Props={
 efecto?:Efecto;
 acciones:Efecto[];
 onElegir:(id:string)=>void;
 onCerrar:()=>void;
 onChange:(cambio:Partial<Efecto>)=>void;
};

export default function EditorAnimacion({efecto,acciones,onElegir,onCerrar,onChange}:Props){
 return <MarcoAnimacion titulo={efecto?nombre(efecto):'Elige una acción'} onCerrar={onCerrar}>
  {efecto?<Compositor efecto={efecto} onChange={onChange}/>:<div className="yq-animacion-elegir">
   {acciones.length?acciones.map(e=><button key={e.id} type="button" className="yq-boton" onClick={()=>onElegir(e.id)}>{nombre(e)}</button>)
    :<p>Crea una acción en el Yunque y vuelve a colocar el nodo Animación.</p>}
  </div>}
 </MarcoAnimacion>;
}

function MarcoAnimacion({titulo:etiqueta,onCerrar,children}:{titulo:string;onCerrar:()=>void;children:ReactNode}){
 const modal=useRef<HTMLDialogElement>(null);
 const titulo=useId();
 useEffect(()=>{
  const dialogo=modal.current;
  dialogo?.showModal();
  return ()=>dialogo?.close();
 },[]);

 return <dialog ref={modal} aria-labelledby={titulo} className="yq-animacion yq-desplazable" data-familia="modulo"
  onCancel={e=>{e.preventDefault();onCerrar();}}>
  <header className="yq-cajon-cab">
   <IconoYugen id="rayo" size={24}/>
   <div><small>Editor de animaciones</small><h2 id={titulo}>{etiqueta}</h2></div>
   <button type="button" aria-label="Cerrar el editor de animaciones" onClick={onCerrar}><X size={18} aria-hidden="true"/></button>
  </header>
  {children}
 </dialog>;
}

const DATO_RECURSO='application/x-yugen-vfx';
const DATO_CLIP='application/x-yugen-clip';
const NORMAL=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const MARCAS=Array.from({length:7},(_,i)=>i);
const CASILLA_CERO={x:0,y:0};
const LIMITE_GALERIA=15;
type DestinoArrastre={tipo:'casilla';p:Posicion}|{tipo:'tiempo';inicio:number};

function clipNuevo(recurso:string,id:string):PasoVFX{
 return {id,recurso,disparador:'lanzador',inicio:0,duracion:buscarVFX(recurso)?.duracion??600,escala:1.5,giro:0};
}

function Compositor({efecto,onChange}:{efecto:Efecto;onChange:Props['onChange']}){
 const tablero=useRef<HTMLDivElement>(null);
 const [direccion,setDireccion]=useState(0);
 const [distancia,setDistancia]=useState(3);
 const [eventos,setEventos]=useState<EventoVisual[]>([]);
 const evento=eventos.at(-1);
 const [pruebas,setPruebas]=useState<Posicion[]>([]);
 const [recurso,setRecurso]=useState<string>();
 const [seleccion,setSeleccion]=useState<string>();
 const [modo,setModo]=useState<'clips'|'objetivos'>('clips');
 const [aviso,setAviso]=useState('');
 const [donde,setDonde]=useState<DestinoArrastre>();
 const vfx=efecto.vfx;
 const clips=clipsDeConfiguracion(vfx);
 const actual=clips.find(c=>c.id===seleccion);
 const alcance=efecto.tablero;
 const {x,y}=DIRECCIONES_PATRON[direccion];
 const blanco={x:origen.x+x*distancia,y:origen.y+y*distancia};
 const propio=efecto.efecto==='transformacion'||alcance?.afecta==='yo'||efecto.vision?.modo==='abrir';
 const patron=alcance?.forma==='personalizada';
 const areaResuelta=alcance?areaDesdeFicha({},origen,alcance.origen_area==='lanzador'&&!['personalizada','linea','cono'].includes(alcance.forma)?origen:blanco,alcance,dimensiones):[];
 const area=new Set(areaResuelta.map(clave));
 const geometria:GeometriaVFX={
  origen,objetivo:propio?origen:blanco,area:areaResuelta,patron:patron||alcance?.forma==='linea',
  girar:patron&&alcance?.patron?.orientacion==='apuntar',impactos:pruebas.filter(p=>!alcance||area.has(clave(p))).map(p=>[p]),tablero:dimensiones,
 };
 const ramas=rutasVFX(geometria);
 const esqueleto=esqueletoVisual(efecto);
 const desarmado=efecto.concepto?.id==='desarmado'?efecto.concepto:undefined;
 const gestoDesarmado=esqueletoBase(desarmado?.animacion);
 const arma=esqueleto?.id??efecto.esqueleto;
 const divino=clips.find(c=>separarVFX(c.recurso).base==='foundry-divine-beam'&&c.disparador==='lanzador');
 const fin=Math.max(3000,Math.ceil(Math.max(0,...clips.map(c=>c.inicio+c.duracion))/1000)*1000);
 const guardar=(siguientes:PasoVFX[])=>{
  if(siguientes.length>MAX_CLIPS_VFX){setAviso(`La secuencia admite ${MAX_CLIPS_VFX} clips.`);return false;}
  onChange({vfx:{...vfx,secuencia:{version:1,clips:siguientes}}});
  setAviso('');
  return true;
 };
 const ajustar=(id:string,cambio:Partial<PasoVFX>)=>guardar(clips.map(c=>c.id===id?{...c,...cambio}:c));
 function agregar(id:string,disparador:DisparadorVFX='lanzador',inicio=0,casilla?:Posicion){
  if(!buscarVFX(id))return;
  const clip={...clipNuevo(id,crypto.randomUUID()),disparador,inicio,casilla};
  if(guardar([...clips,clip]))setSeleccion(clip.id);
 }
 function moverAlTablero(clip:PasoVFX,p:Posicion):Partial<PasoVFX>{
  const direccionRama=ramas.find(rama=>rama.some(q=>clave(q)===clave(p)))?.[0];
  if(direccionRama&&patron&&['trayecto','haz','final'].includes(clip.disparador))
   return {rama:casillaRelativaVFX(geometria,direccionRama)};
  return {disparador:'casilla',casilla:casillaRelativaVFX(geometria,p),rama:undefined};
 }
 function apuntarClip(p:Posicion,id?:string,clipId?:string){
  if(id)agregar(id,'casilla',0,casillaRelativaVFX(geometria,p));
  else if(clipId){
   const clip=clips.find(c=>c.id===clipId);
   if(!clip)return;
   ajustar(clipId,moverAlTablero(clip,p));setSeleccion(clipId);
  }
 }
 function finArrastre(){
  setDonde(undefined);
 }
 function soltar(e:DragEvent,accion:(id:string,esClip:boolean)=>void){
  const existente=e.dataTransfer.getData(DATO_CLIP),nuevo=e.dataTransfer.getData(DATO_RECURSO);
  if(!existente&&!nuevo)return;
  e.preventDefault();
  finArrastre();
  accion(existente||nuevo,!!existente);
 }
 function indicar(e:DragEvent,destino:DestinoArrastre){
  if(!e.dataTransfer.types.includes(DATO_RECURSO)&&!e.dataTransfer.types.includes(DATO_CLIP))return;
  e.preventDefault();
  setDonde(actual=>(
   actual?.tipo==='casilla'&&destino.tipo==='casilla'&&clave(actual.p)===clave(destino.p)||
   actual?.tipo==='tiempo'&&destino.tipo==='tiempo'&&actual.inicio===destino.inicio
  )?actual:destino);
 }
 function salir(e:DragEvent,tipo:DestinoArrastre['tipo']){
  const siguiente=e.relatedTarget;
  if(siguiente instanceof Node&&e.currentTarget.contains(siguiente))return;
  setDonde(actual=>actual?.tipo===tipo?undefined:actual);
 }
 function instante(e:DragEvent){
  const caja=e.currentTarget.getBoundingClientRect();
  return Math.max(0,Math.min(fin,MAX_INICIO_VFX,Math.round(fin*(e.clientX-caja.left)/Math.max(1,caja.width)/25)*25));
 }
 function perfilarHaz(clip:PasoVFX){
  const impactar=buscarVFX('foundry-hit-spark')!;
  const impacto:PasoVFX={id:crypto.randomUUID(),recurso:impactar.id,disparador:'impacto',inicio:0,duracion:impactar.duracion,escala:1,giro:0};
  const siguientes=clips.map(c=>c.id===clip.id?{...c,recurso:separarVFX(c.recurso).base,disparador:'haz' as const,escala:1.35}:c);
  if(!siguientes.some(c=>c.disparador==='impacto'))siguientes.push(impacto);
  if(guardar(siguientes))setSeleccion(clip.id);
 }
 function moverCapa(id:string,desplazamiento:number){
  const indice=clips.findIndex(c=>c.id===id),destino=indice+desplazamiento;
  if(destino<0||destino>=clips.length)return;
  const siguientes=[...clips];
  const [clip]=siguientes.splice(indice,1);
  siguientes.splice(destino,0,clip);
  guardar(siguientes);
 }
 function reproducir(creado_en:number,id:string){
  setEventos(previos=>[...previos.slice(-249),{
   id,creado_en,nombre:nombre(efecto),dados:[],emisor:'ensayo',
   desde:origen,hasta:propio||patron?origen:blanco,vfx,arma_visual:arma,esqueleto,geometria_vfx:geometria,
  }]);
 }
 return <div className="yq-compositor">
  <GaleriaAnimaciones seleccion={recurso} onElegir={id=>{setRecurso(id);setModo('clips');}}
   onAgregar={agregar} onPersonal={id=>{setRecurso(id);agregar(id);}}
   onArrastrar={(e,id)=>{e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData(DATO_RECURSO,id);}} onFinArrastre={finArrastre}/>

  <section className="yq-animacion-ensayo" aria-label="Vista previa de la acción">
   <div className="yq-animacion-controles">
    <label>Dirección<select value={direccion} onChange={e=>setDireccion(Number(e.target.value))}>
     {DIRECCIONES_PATRON.map((d,i)=><option value={i} key={d.nombre}>{d.signo} {d.nombre}</option>)}
    </select></label>
    <label>Distancia · {distancia}<input type="range" min={1} max={radio} value={distancia} onChange={e=>setDistancia(Number(e.target.value))}/></label>
    <button className="yq-boton" type="button" disabled={!clips.length&&!arma&&!vfx?.pantalla} onClick={e=>reproducir(Math.round(performance.timeOrigin+e.timeStamp),crypto.randomUUID())}><Play size={15} aria-hidden="true"/> Probar animación</button>
   </div>
   <div className="yq-animacion-controles" role="group" aria-label="Herramientas del tablero">
    <button type="button" className="yq-boton" aria-pressed={modo==='clips'} onClick={()=>setModo('clips')}>Colocar clips</button>
    <button type="button" className="yq-boton" aria-pressed={modo==='objetivos'} onClick={()=>setModo('objetivos')}>Objetivos de prueba</button>
    {!!pruebas.length&&<button type="button" className="yq-boton" onClick={()=>setPruebas([])}>Limpiar objetivos</button>}
    {!!ramas.length&&<button type="button" className="yq-boton" onClick={()=>{
     const rama=ramas.find(r=>r.some(p=>clave(p)===clave(blanco)))??ramas[0];
     setPruebas(rama.slice(0,3));setModo('objetivos');
    }}>Probar con objetivos en fila</button>}
   </div>
   <div ref={tablero} className="yq-animacion-tablero" onDragLeave={e=>salir(e,'casilla')} style={{gridTemplateColumns:`repeat(${lado}, minmax(0, 1fr))`}}>
    {casillas.map(p=>{
     const id=clave(p),enOrigen=id===clave(origen),objetivo=pruebas.some(q=>clave(q)===id);
     const unidos=clips.filter(c=>c.disparador==='casilla'&&c.casilla&&clave(casillaDeClip(geometria,c.casilla))===id);
     return <button type="button" key={id} data-casilla={id} data-alcance={area.has(id)||undefined} data-previa={donde?.tipo==='casilla'&&clave(donde.p)===id||undefined}
      tabIndex={enOrigen?0:-1} className="yq-animacion-casilla" aria-label={`Casilla ${p.x+1}, ${p.y+1}${enOrigen?' · Lanzador':''}${objetivo?' · Objetivo':''}`}
      onKeyDown={e=>{
       const desplazamiento={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
       if(!desplazamiento)return;
       e.preventDefault();
       tablero.current?.querySelector<HTMLButtonElement>(`[data-casilla="${p.x+desplazamiento[0]},${p.y+desplazamiento[1]}"]`)?.focus();
      }}
      onDragEnter={e=>indicar(e,{tipo:'casilla',p})} onDragOver={e=>indicar(e,{tipo:'casilla',p})} onDrop={e=>soltar(e,(dato,esClip)=>apuntarClip(p,esClip?undefined:dato,esClip?dato:undefined))}
      onClick={()=>{
       if(modo==='objetivos'){if(!enOrigen)setPruebas(objetivo?pruebas.filter(q=>clave(q)!==id):[...pruebas,p]);}
       else if(recurso)apuntarClip(p,recurso);
       else if(unidos.length)setSeleccion(unidos[0].id);
       else if(actual)apuntarClip(p,undefined,actual.id);
      }}>
      {enOrigen&&<span className="yq-animacion-ficha" data-ficha="ensayo" title="Lanzador"><IconoYugen id="alma" size={18}/></span>}
      {objetivo&&<span className="yq-animacion-ficha is-blanco" title="Objetivo de prueba"><IconoYugen id="bestia" size={18}/></span>}
      {!enOrigen&&!objetivo&&id===clave(blanco)&&<span className="yq-animacion-puntero" aria-hidden="true"/>}
      {!!unidos.length&&<b className="yq-animacion-marca" title={unidos.map(c=>buscarVFX(c.recurso)?.nombre).join(', ')}>{unidos.length}</b>}
     </button>;
    })}
    <AnimacionesDelTablero evento={evento} eventos={eventos} tablero={tablero} {...dimensiones}/>
   </div>
   {modo==='objetivos'&&<p className="yq-nota">Toca las casillas para colocar o quitar objetivos de prueba.</p>}
  </section>

  <section className="yq-compositor-inspector" aria-label="Configuración de clip">
   <h3>Configuración</h3>
   {divino&&patron&&<button type="button" className="yq-boton" onClick={()=>perfilarHaz(divino)}>Rayo divino en todas las ramas</button>}
   {!actual&&<p className="yq-nota">Selecciona un clip para ajustar dónde y cuándo se reproduce.</p>}
   {actual&&<>
    <h4>{buscarVFX(actual.recurso)?.nombre||actual.recurso}</h4>
    <label className="yq-animacion-campo">Disparador<select value={actual.disparador}
     onChange={e=>ajustar(actual.id,{disparador:e.target.value as DisparadorVFX,casilla:actual.casilla??CASILLA_CERO})}>
     {Object.entries(DISPARADORES_VFX).map(([id,texto])=><option key={id} value={id}>{texto}</option>)}
    </select></label>
    {patron&&ramas.length>1&&['trayecto','haz','final'].includes(actual.disparador)&&<label className="yq-animacion-campo">Rama
     <select value={actual.rama?clave(actual.rama):''} onChange={e=>{
      const [x,y]=e.target.value.split(',').map(Number);
      ajustar(actual.id,{rama:e.target.value?{x,y}:undefined});
     }}>
      <option value="">Todas las ramas</option>
      {ramas.map(rama=>{
       const p=rama[0],r=casillaRelativaVFX(geometria,p),d=DIRECCIONES_PATRON.find(d=>d.x===p.x-origen.x&&d.y===p.y-origen.y);
       return <option key={clave(r)} value={clave(r)}>{d?.signo} {d?.nombre}</option>;
      })}
     </select>
    </label>}
    {actual.disparador==='casilla'&&<p className="yq-nota">Desplazamiento desde el lanzador ({actual.casilla?.x??0}, {actual.casilla?.y??0}). Arrastra el clip a otra casilla para moverlo.</p>}
    <div className="yq-animacion-numeros">
     <Ajuste claveClip={actual.id} etiqueta="Inicio (ms)" valor={actual.inicio} min={0} max={MAX_INICIO_VFX} paso={1} onChange={inicio=>ajustar(actual.id,{inicio})}/>
     <Ajuste claveClip={actual.id} etiqueta="Duración (ms)" valor={actual.duracion} min={60} max={MAX_DURACION_VFX} paso={1} onChange={duracion=>ajustar(actual.id,{duracion})}/>
     <Ajuste claveClip={actual.id} etiqueta="Tamaño" valor={actual.escala} min={.25} max={8} paso={.05} onChange={escala=>ajustar(actual.id,{escala})}/>
     <Ajuste claveClip={actual.id} etiqueta="Giro (°)" valor={actual.giro} min={-360} max={360} paso={1} onChange={giro=>ajustar(actual.id,{giro})}/>
    </div>
    <label><input type="checkbox" checked={!!actual.horizontal} onChange={e=>ajustar(actual.id,{horizontal:e.target.checked})}/> Reflejo horizontal</label>
    <label><input type="checkbox" checked={!!actual.vertical} onChange={e=>ajustar(actual.id,{vertical:e.target.checked})}/> Reflejo vertical</label>
    <div className="yq-animacion-acciones">
     <button type="button" className="yq-boton" onClick={()=>{const id=crypto.randomUUID();if(guardar([...clips,{...actual,id}]))setSeleccion(id);}}>Duplicar</button>
     <button type="button" className="yq-boton" disabled={clips[0]?.id===actual.id} onClick={()=>moverCapa(actual.id,-1)}>Enviar atrás</button>
     <button type="button" className="yq-boton" disabled={clips.at(-1)?.id===actual.id} onClick={()=>moverCapa(actual.id,1)}>Traer al frente</button>
     <button type="button" className="yq-boton" onClick={()=>guardar(clips.filter(c=>c.id!==actual.id))}>Quitar clip</button>
    </div>
   </>}
   {aviso&&<p role="status" className="yq-nota">{aviso}</p>}
   {desarmado&&<details className="yq-legado">
    <summary>Gesto del ataque desarmado</summary>
    <Fichas etiqueta="Esqueleto del ataque desarmado" opciones={ESQUELETOS_BASE.map(e=>({valor:e.id,nombre:e.nombre}))}
     valor={desarmado.animacion} onChange={animacion=>onChange({concepto:{...desarmado,animacion}})} columnas={3}/>
    {gestoDesarmado&&<VistaGesto esqueleto={gestoDesarmado}/>}
   </details>}
   <label className="yq-animacion-campo">Animación básica<select value={efecto.animacion??'impacto'} onChange={e=>onChange({animacion:e.target.value as Efecto['animacion']})}>
    {['proyectil','destello','aura','impacto','trayectoria','desplazamiento','ninguna'].map(a=><option key={a}>{a}</option>)}
   </select></label>
   <label><input type="checkbox" checked={!!vfx?.pantalla} onChange={e=>onChange({vfx:{...vfx,pantalla:e.target.checked}})}/> Paradoja a pantalla completa</label>
   {(efecto.efecto==='dano'||efecto.efecto==='crear_arma'||efecto.esqueleto||efecto.esqueleto_def)&&<details className="yq-legado">
    <summary>Gesto y esqueleto</summary>
    <EditorEsqueleto valor={efecto.esqueleto} definicion={efecto.esqueleto_def} ajustes={efecto.esqueleto_ajustes} onChange={onChange}/>
   </details>}
  </section>

  <section className="yq-compositor-tiempo" aria-label="Línea de tiempo">
   <h3>Línea de tiempo</h3>
   <p className="yq-nota">Arrastra un efecto a la línea de tiempo o al tablero. Los clips pueden coincidir.</p>
   <div className="yq-animacion-regla" aria-hidden="true">{MARCAS.map(t=><span key={t}>{(t*fin/6000).toFixed(1)} s</span>)}</div>
   <div className="yq-animacion-pistas" role="group" aria-label="Pistas de animación"
    onDragEnter={e=>indicar(e,{tipo:'tiempo',inicio:instante(e)})} onDragOver={e=>indicar(e,{tipo:'tiempo',inicio:instante(e)})} onDragLeave={e=>salir(e,'tiempo')} onDrop={e=>{
     const inicio=instante(e);
     soltar(e,(id,esClip)=>{if(esClip){ajustar(id,{inicio});setSeleccion(id);}else agregar(id,'lanzador',inicio);});
    }}>
    {donde?.tipo==='tiempo'&&<div className="yq-animacion-previa-tiempo" aria-hidden="true"
     style={{left:`${Math.min(99,donde.inicio/fin*100)}%`}}><span>{donde.inicio} ms</span></div>}
    {clips.map(c=><div className="yq-animacion-pista" key={c.id}><button type="button" draggable
     onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData(DATO_CLIP,c.id);}} onDragEnd={finArrastre}
     data-clip-editor={c.id} aria-pressed={actual?.id===c.id} onClick={()=>{setSeleccion(c.id);setRecurso(undefined);}}
     style={{left:`${c.inicio/fin*100}%`,width:`${c.duracion/fin*100}%`}}>
     {buscarVFX(c.recurso)?.nombre||c.recurso} · {DISPARADORES_VFX[c.disparador]}
    </button></div>)}
    {!clips.length&&<p className="yq-nota">Suelta un efecto aquí para crear el primer clip.</p>}
   </div>
  </section>
 </div>;
}

function GaleriaAnimaciones({seleccion,onElegir,onAgregar,onPersonal,onArrastrar,onFinArrastre}:{
 seleccion?:string;onElegir:(id:string)=>void;onAgregar?:(id:string)=>void;onPersonal?:(id:string)=>void;
 onArrastrar?:(e:DragEvent,id:string)=>void;onFinArrastre?:()=>void;
}){
 const [busqueda,setBusqueda]=useState('');
 const [pagina,setPagina]=useState(0);
 const [personales,setPersonales]=useState(false);
 const biblioteca=CATALOGO_VFX.filter(a=>NORMAL(a.nombre+' '+a.categoria+' '+a.paquete).includes(NORMAL(busqueda.trim())));
 const paginas=Math.max(1,Math.ceil(biblioteca.length/LIMITE_GALERIA));
 return <section className="yq-compositor-galeria" aria-label="Galería de efectos">
  <h3>Galería</h3>
  <label className="yq-animacion-campo">Buscar efectos<input type="search" value={busqueda} onChange={e=>{setBusqueda(e.target.value);setPagina(0);}}/></label>
  <div className="yq-animacion-recursos">
   {biblioteca.slice(pagina*LIMITE_GALERIA,(pagina+1)*LIMITE_GALERIA).map(a=><button key={a.id} type="button"
    draggable={!!onArrastrar} aria-pressed={seleccion===a.id} data-recurso={a.id} onClick={()=>onElegir(a.id)}
    onDragStart={e=>onArrastrar?.(e,a.id)} onDragEnd={onFinArrastre}>
    <MiniaturaVFX clip={a.id}/><span>{a.nombre}</span>
   </button>)}
  </div>
  {!biblioteca.length&&<p className="yq-nota">Sin efectos para esa búsqueda.</p>}
  {paginas>1&&<div className="yq-animacion-paginas">
   <button type="button" className="yq-boton" onClick={()=>setPagina(pagina-1)} disabled={pagina===0}>Anterior</button>
   <span>{pagina+1} / {paginas}</span>
   <button type="button" className="yq-boton" onClick={()=>setPagina(pagina+1)} disabled={pagina+1===paginas}>Siguiente</button>
  </div>}
  {seleccion&&onAgregar&&<button type="button" className="yq-boton" onClick={()=>onAgregar(seleccion)}>Añadir {buscarVFX(seleccion)?.nombre}</button>}
  <details onToggle={e=>setPersonales(e.currentTarget.open)}><summary>Mis efectos y subidas</summary>
   {personales&&<BibliotecaVFX elegir={onPersonal??onElegir} previsualizar/>}
  </details>
  <details><summary>Créditos de los efectos</summary><p>Kitsuwick: NogitsuneGurl. Foundry: pvfx.foundry (CC0). Warlock: Frostwindz. Magic VFX: Thundersnow Pixel. Smoke N Dust: material aportado por el GM.</p>
   <p><a href="https://heyheythere.itch.io/combat-fx-free" target="_blank" rel="noreferrer">Combat FX Free by heyheythere</a> · CC BY 4.0. Adaptado a animaciones PNG para YUGEN.</p>
  </details>
 </section>;
}

export type EtapaAnimable={id:string;nombre:string;vfx?:AnimacionEtapa;reglas?:{id:string;nombre:string;animacion?:AnimacionRegla}[]};

export function EditorAnimacionEtapas({titulo,etapas,inicial,onChange,onRegla,onCerrar}:{
 titulo:string;etapas:EtapaAnimable[];inicial?:string;onChange:(id:string,v:AnimacionEtapa|undefined)=>void;
 onRegla?:(etapa:string,regla:string,v:AnimacionRegla|undefined)=>void;onCerrar:()=>void;
}){
 const [id,setId]=useState(inicial??etapas[0]?.id);
 const [campo,setCampo]=useState<'entrada'|'aura'>('entrada');
 const [idRegla,setIdRegla]=useState('');
 const etapa=etapas.find(e=>e.id===id)??etapas[0];
 const regla=onRegla?etapa?.reglas?.find(r=>r.id===idRegla):undefined;
 const valor=regla?regla.animacion?.id:etapa?.vfx?.[campo];
 const escala=regla?regla.animacion?.escala:etapa?.vfx?.escala;
 return <MarcoAnimacion titulo={titulo} onCerrar={onCerrar}>
  {etapa?<EditorVisualSimple
   nombre={regla?regla.nombre:campo==='entrada'?'Entrada de la etapa':'Aura de la etapa'}
   valor={valor} escala={escala??1.5}
   controles={<>
    <label className="yq-animacion-campo">Etapa<select aria-label="Etapa" value={etapa.id} onChange={e=>{setId(e.target.value);setIdRegla('');}}>
     {etapas.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
    </select></label>
    <div className="yq-animacion-acciones" role="group" aria-label="Tipo de animación">
     <button type="button" aria-pressed={!regla&&campo==='entrada'} className="yq-boton" onClick={()=>{setCampo('entrada');setIdRegla('');}}>Entrada</button>
     <button type="button" aria-pressed={!regla&&campo==='aura'} className="yq-boton" onClick={()=>{setCampo('aura');setIdRegla('');}}>Aura</button>
    </div>
    {onRegla&&!!etapa.reglas?.length&&<label className="yq-animacion-campo">Reglas de la etapa
     <select value={regla?.id??''} onChange={e=>setIdRegla(e.target.value)}>
      <option value="">Entrada o aura</option>
      {etapa.reglas.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}
     </select>
    </label>}
   </>}
   onElegir={recurso=>{
    if(regla){onRegla?.(etapa.id,regla.id,recurso?{id:recurso,escala}:undefined);return;}
    const siguiente={...etapa.vfx,[campo]:recurso};
    onChange(etapa.id,siguiente.entrada||siguiente.aura?siguiente:undefined);
   }}
   onEscala={n=>{
    if(regla){if(valor)onRegla?.(etapa.id,regla.id,{id:valor,escala:n});return;}
    onChange(etapa.id,{...etapa.vfx,escala:n});
   }}
   onAutomatica={regla&&valor&&escala!==undefined?()=>onRegla?.(etapa.id,regla.id,{id:valor}):undefined}
  />:<p className="yq-animacion-elegir">Agrega una etapa para configurar sus animaciones.</p>}
 </MarcoAnimacion>;
}

export function EditorAnimacionPulso({titulo,valor,onChange,onCerrar,esReaccion=false}:{
 titulo:string;valor?:AnimacionRegla;onChange:(v:AnimacionRegla|undefined)=>void;onCerrar:()=>void;esReaccion?:boolean;
}){
 return <MarcoAnimacion titulo={titulo} onCerrar={onCerrar}>
  <EditorVisualSimple nombre={esReaccion?'Al activar la reacción':'Al activarse la regla'} valor={valor?.id}
   escala={valor?.escala??(esReaccion?2.8:1.5)}
   onElegir={id=>onChange(id?{id,escala:valor?.escala}:undefined)}
   onEscala={esReaccion?undefined:escala=>{if(valor)onChange({...valor,escala});}}
   onAutomatica={esReaccion||valor?.escala===undefined?undefined:()=>onChange({id:valor.id})}/>
 </MarcoAnimacion>;
}

function EditorVisualSimple({nombre,valor,escala,controles,onElegir,onEscala,onAutomatica}:{
 nombre:string;valor?:string;escala:number;controles?:ReactNode;onElegir:(id?:string)=>void;
 onEscala?:(escala:number)=>void;onAutomatica?:()=>void;
}){
 const orientacion=separarVFX(valor||'');
 const ajustar=(cambio:Partial<typeof orientacion>)=>{if(valor)onElegir(orientarVFX(valor,{...orientacion,...cambio}));};
 return <div className="yq-compositor yq-animacion-contexto">
  <GaleriaAnimaciones seleccion={valor?orientacion.base:undefined} onElegir={id=>onElegir(id)}/>
  <section className="yq-compositor-inspector" aria-label="Configuración de la animación">
   {controles}
   <h3>{nombre}</h3>
   {valor&&<>
    <div className="yq-animacion-muestra" style={{'--escala-previa':Math.min(1.25,escala/2)} as CSSProperties}>
     <MiniaturaVFX clip={valor} giro={transformacionVFX(valor)}/>
    </div>
    <p>{buscarVFX(valor)?.nombre??valor}</p>
    <div className="yq-animacion-acciones">
     <button type="button" className="yq-boton" onClick={()=>ajustar({cuartos:(orientacion.cuartos+1)%4})}>Girar · {orientacion.cuartos*90}°</button>
     <button type="button" className="yq-boton" aria-pressed={orientacion.horizontal} onClick={()=>ajustar({horizontal:!orientacion.horizontal})}>Reflejo horizontal</button>
     <button type="button" className="yq-boton" aria-pressed={orientacion.vertical} onClick={()=>ajustar({vertical:!orientacion.vertical})}>Reflejo vertical</button>
     <button type="button" className="yq-boton" onClick={()=>onElegir(undefined)}>Quitar efecto</button>
    </div>
    {onEscala&&<label className="yq-animacion-campo">Tamaño visual · {escala} casillas<input type="range" min={.5} max={4} step={.5} value={escala} onChange={e=>onEscala(Number(e.target.value))}/></label>}
    {onAutomatica&&<button type="button" className="yq-boton" onClick={onAutomatica}>Ajustar a la ficha automáticamente</button>}
   </>}
   {!valor&&<p className="yq-nota">Elige un efecto de la Galería.</p>}
  </section>
 </div>;
}

function Ajuste({claveClip,etiqueta,valor,min,max,paso,onChange}:{claveClip:string;etiqueta:string;valor:number;min:number;max:number;paso:number;onChange:(valor:number)=>void}){
 return <label className="yq-animacion-campo">{etiqueta}<input key={claveClip+':'+valor} type="number" min={min} max={max} step={paso} defaultValue={valor}
  onBlur={e=>{
   const dato=e.currentTarget.valueAsNumber;
   const siguiente=Number.isFinite(dato)?Math.max(min,Math.min(max,paso===1?Math.round(dato):dato)):valor;
   e.currentTarget.value=String(siguiente);
   if(siguiente!==valor)onChange(siguiente);
  }} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label>;
}
