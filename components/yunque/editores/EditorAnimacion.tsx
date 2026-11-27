'use client';

import {useEffect,useId,useRef,useState,type DragEvent} from 'react';
import {Play,X} from 'lucide-react';
import AnimacionesDelTablero from '../../AnimacionesDelTablero';
import IconoYugen from '../../IconoYugen';
import BibliotecaVFX from '../../BibliotecaVFX';
import EditorEsqueleto from './EditorEsqueleto';
import {areaDesdeFicha,esqueletoVisual,type EventoVisual,type Posicion} from '../../../lib/combate';
import {EFECTOS_NOMBRE,type Efecto} from '../../../lib/creacion';
import {DIRECCIONES_PATRON,MAX_RADIO_PATRON} from '../../../lib/patron-area';
import {buscarVFX,CATALOGO_VFX,clipsDeConfiguracion,separarVFX} from '../../../lib/vfx';
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
   <div><small>Editor de animaciones</small><h2 id={titulo}>{efecto?nombre(efecto):'Elige una acción'}</h2></div>
   <button type="button" aria-label="Cerrar el editor de animaciones" onClick={onCerrar}><X size={18} aria-hidden="true"/></button>
  </header>
  {efecto?<Compositor efecto={efecto} onChange={onChange}/>:<div className="yq-animacion-elegir">
   {acciones.length?acciones.map(e=><button key={e.id} type="button" className="yq-boton" onClick={()=>onElegir(e.id)}>{nombre(e)}</button>)
    :<p>Crea una acción en el Yunque y vuelve a colocar el nodo Animación.</p>}
  </div>}
 </dialog>;
}

const DATO_RECURSO='application/x-yugen-vfx';
const DATO_CLIP='application/x-yugen-clip';
const NORMAL=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const MARCAS=Array.from({length:7},(_,i)=>i);
const CASILLA_CERO={x:0,y:0};
const LIMITE_GALERIA=15;

function Compositor({efecto,onChange}:{efecto:Efecto;onChange:Props['onChange']}){
 const tablero=useRef<HTMLDivElement>(null);
 const [direccion,setDireccion]=useState(0);
 const [distancia,setDistancia]=useState(3);
 const [evento,setEvento]=useState<EventoVisual>();
 const [pruebas,setPruebas]=useState<Posicion[]>([]);
 const [busqueda,setBusqueda]=useState('');
 const [pagina,setPagina]=useState(0);
 const [recurso,setRecurso]=useState<string>();
 const [seleccion,setSeleccion]=useState<string>();
 const [modo,setModo]=useState<'clips'|'objetivos'>('clips');
 const [aviso,setAviso]=useState('');
 const [personales,setPersonales]=useState(false);
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
 const biblioteca=CATALOGO_VFX.filter(a=>NORMAL(a.nombre+' '+a.categoria+' '+a.paquete).includes(NORMAL(busqueda.trim())));
 const paginas=Math.max(1,Math.ceil(biblioteca.length/LIMITE_GALERIA));
 const esqueleto=esqueletoVisual(efecto);
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
  const asset=buscarVFX(id);
  if(!asset)return;
  const clip:PasoVFX={id:crypto.randomUUID(),recurso:id,disparador,inicio,duracion:asset.duracion,escala:1.5,giro:0,casilla};
  if(guardar([...clips,clip]))setSeleccion(clip.id);
 }
 function apuntarClip(p:Posicion,id?:string,clipId?:string){
  const casilla=casillaRelativaVFX(geometria,p);
  if(id)agregar(id,'casilla',0,casilla);
  else if(clipId){
   const clip=clips.find(c=>c.id===clipId);
   if(!clip)return;
   const direccionRama=ramas.find(rama=>rama.some(q=>clave(q)===clave(p)))?.[0];
   if(direccionRama&&patron&&['trayecto','haz','final'].includes(clip.disparador))
    ajustar(clipId,{rama:casillaRelativaVFX(geometria,direccionRama)});
   else ajustar(clipId,{disparador:'casilla',casilla,rama:undefined});
   setSeleccion(clipId);
  }
 }
 function soltar(e:DragEvent,accion:(id:string,esClip:boolean)=>void){
  const existente=e.dataTransfer.getData(DATO_CLIP),nuevo=e.dataTransfer.getData(DATO_RECURSO);
  if(!existente&&!nuevo)return;
  e.preventDefault();
  accion(existente||nuevo,!!existente);
 }
 function permitir(e:DragEvent){
  if(e.dataTransfer.types.includes(DATO_RECURSO)||e.dataTransfer.types.includes(DATO_CLIP))e.preventDefault();
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
  setEvento({
   id,creado_en,nombre:nombre(efecto),dados:[],emisor:'ensayo',
   desde:origen,hasta:propio||patron?origen:blanco,vfx,arma_visual:arma,esqueleto,geometria_vfx:geometria,
  });
 }
 return <div className="yq-compositor">
  <section className="yq-compositor-galeria" aria-label="Galería de efectos">
   <h3>Galería</h3>
   <label className="yq-animacion-campo">Buscar efectos<input type="search" value={busqueda} onChange={e=>{setBusqueda(e.target.value);setPagina(0);}}/></label>
   <div className="yq-animacion-recursos">
    {biblioteca.slice(pagina*LIMITE_GALERIA,(pagina+1)*LIMITE_GALERIA).map(a=><button key={a.id} type="button" draggable
     aria-pressed={recurso===a.id} data-recurso={a.id} onClick={()=>{setRecurso(a.id);setModo('clips');}}
     onDragStart={e=>{e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData(DATO_RECURSO,a.id);}}>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={a.poster||a.bucle} draggable={false} loading="lazy" alt=""/><span>{a.nombre}</span>
    </button>)}
   </div>
   {!biblioteca.length&&<p className="yq-nota">Sin efectos para esa búsqueda.</p>}
   {paginas>1&&<div className="yq-animacion-paginas">
    <button type="button" className="yq-boton" onClick={()=>setPagina(pagina-1)} disabled={pagina===0}>Anterior</button>
    <span>{pagina+1} / {paginas}</span>
    <button type="button" className="yq-boton" onClick={()=>setPagina(pagina+1)} disabled={pagina+1===paginas}>Siguiente</button>
   </div>}
   {recurso&&<button type="button" className="yq-boton" onClick={()=>agregar(recurso)}>Añadir {buscarVFX(recurso)?.nombre}</button>}
   <details onToggle={e=>setPersonales(e.currentTarget.open)}><summary>Mis efectos y subidas</summary>
    {personales&&<BibliotecaVFX elegir={id=>{setRecurso(id);agregar(id);}}/>}
   </details>
  </section>

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
   <div ref={tablero} className="yq-animacion-tablero" style={{gridTemplateColumns:`repeat(${lado}, minmax(0, 1fr))`}}>
    {casillas.map(p=>{
     const id=clave(p),enOrigen=id===clave(origen),objetivo=pruebas.some(q=>clave(q)===id);
     const unidos=clips.filter(c=>c.disparador==='casilla'&&c.casilla&&clave(casillaDeClip(geometria,c.casilla))===id);
     return <button type="button" key={id} data-casilla={id} data-alcance={area.has(id)||undefined}
      tabIndex={enOrigen?0:-1} className="yq-animacion-casilla" aria-label={`Casilla ${p.x+1}, ${p.y+1}${enOrigen?' · Lanzador':''}${objetivo?' · Objetivo':''}`}
      onKeyDown={e=>{
       const desplazamiento={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
       if(!desplazamiento)return;
       e.preventDefault();
       tablero.current?.querySelector<HTMLButtonElement>(`[data-casilla="${p.x+desplazamiento[0]},${p.y+desplazamiento[1]}"]`)?.focus();
      }}
      onDragOver={permitir} onDrop={e=>soltar(e,(dato,esClip)=>apuntarClip(p,esClip?undefined:dato,esClip?dato:undefined))}
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
    <AnimacionesDelTablero key={evento?.id??'sin-reproduccion'} evento={evento} tablero={tablero} {...dimensiones}/>
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
   <div className="yq-animacion-pistas" role="group" aria-label="Pistas de animación" onDragOver={permitir} onDrop={e=>{
    const inicio=Math.max(0,Math.min(MAX_INICIO_VFX,Math.round(fin*(e.clientX-e.currentTarget.getBoundingClientRect().left)/e.currentTarget.clientWidth/25)*25));
    soltar(e,(id,esClip)=>{if(esClip){ajustar(id,{inicio});setSeleccion(id);}else agregar(id,'lanzador',inicio);});
   }}>
    {clips.map(c=><div className="yq-animacion-pista" key={c.id}><button type="button" draggable onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData(DATO_CLIP,c.id);}}
     data-clip-editor={c.id} aria-pressed={actual?.id===c.id} onClick={()=>{setSeleccion(c.id);setRecurso(undefined);}}
     style={{left:`${c.inicio/fin*100}%`,width:`${c.duracion/fin*100}%`}}>
     {buscarVFX(c.recurso)?.nombre||c.recurso} · {DISPARADORES_VFX[c.disparador]}
    </button></div>)}
    {!clips.length&&<p className="yq-nota">Suelta un efecto aquí para crear el primer clip.</p>}
   </div>
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
