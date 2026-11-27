'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {Play,X} from 'lucide-react';
import AnimacionesDelTablero from '../../AnimacionesDelTablero';
import IconoYugen from '../../IconoYugen';
import SelectorVFX from '../../SelectorVFX';
import EditorEsqueleto from './EditorEsqueleto';
import {areaDesdeFicha,esqueletoVisual,type EventoVisual} from '../../../lib/combate';
import {EFECTOS_NOMBRE,type Efecto} from '../../../lib/creacion';
import {DIRECCIONES_PATRON,MAX_RADIO_PATRON} from '../../../lib/patron-area';
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
  {efecto?<div className="yq-animacion-contenido">
   <VistaAnimacion efecto={efecto}/>
   <div className="yq-legado yq-animacion-ajustes">
    <SelectorVFX valor={efecto.vfx} onChange={vfx=>onChange({vfx})}/>
    {(efecto.efecto==='dano'||efecto.efecto==='crear_arma'||efecto.esqueleto||efecto.esqueleto_def)&&
     <EditorEsqueleto valor={efecto.esqueleto} definicion={efecto.esqueleto_def} ajustes={efecto.esqueleto_ajustes} onChange={onChange}/>}
   </div>
  </div>:<div className="yq-animacion-elegir">
   {acciones.length?acciones.map(e=><button key={e.id} type="button" className="yq-boton" onClick={()=>onElegir(e.id)}>{nombre(e)}</button>)
    :<p>Crea una acción en el Yunque y vuelve a colocar el nodo Animación.</p>}
  </div>}
 </dialog>;
}

function VistaAnimacion({efecto}:{efecto:Efecto}){
 const tablero=useRef<HTMLDivElement>(null);
 const [direccion,setDireccion]=useState(0);
 const [distancia,setDistancia]=useState(3);
 const [evento,setEvento]=useState<EventoVisual>();
 const {x,y}=DIRECCIONES_PATRON[direccion];
 const blanco={x:origen.x+x*distancia,y:origen.y+y*distancia};
 const alcance=efecto.tablero;
 const propio=efecto.efecto==='transformacion'||alcance?.afecta==='yo'||efecto.vision?.modo==='abrir';
 const hasta=propio||alcance?.forma==='personalizada'?origen:blanco;
 const area=new Set((alcance?areaDesdeFicha({},origen,alcance.origen_area==='lanzador'&&!['personalizada','linea','cono'].includes(alcance.forma)?origen:blanco,alcance,dimensiones):[]).map(clave));
 const gesto=esqueletoVisual(efecto);
 const arma=gesto?.id??efecto.esqueleto;
 const vfx=efecto.vfx;
 const tieneVisual=!!(arma||vfx?.lanzamiento||vfx?.recorrido||vfx?.impacto||vfx?.pantalla);
 const reproducir=()=>setEvento({
  id:crypto.randomUUID(),creado_en:Date.now(),nombre:nombre(efecto),dados:[],emisor:'ensayo',
  desde:origen,hasta,vfx,arma_visual:arma,esqueleto:gesto,
 });
 return <section className="yq-animacion-ensayo" aria-label="Vista previa de la acción">
  <div className="yq-animacion-controles">
   <label>Dirección<select value={direccion} onChange={e=>setDireccion(Number(e.target.value))}>
    {DIRECCIONES_PATRON.map((d,i)=><option value={i} key={d.nombre}>{d.signo} {d.nombre}</option>)}
   </select></label>
   <label>Distancia · {distancia} casillas<input type="range" min={1} max={radio} value={distancia} onChange={e=>setDistancia(Number(e.target.value))}/></label>
   <button className="yq-boton" type="button" disabled={!tieneVisual} onClick={reproducir}><Play size={16} aria-hidden="true"/> Probar animación</button>
  </div>
  <div ref={tablero} className="yq-animacion-tablero" style={{gridTemplateColumns:`repeat(${lado}, minmax(0, 1fr))`}}>
   {casillas.map(p=>{
    const id=clave(p);
    return <span key={id} data-casilla={id} data-alcance={area.has(id)||undefined} className="yq-animacion-casilla">
     {id===clave(origen)&&<span className="yq-animacion-ficha" data-ficha="ensayo" title="Lanzador"><IconoYugen id="alma" size={18}/></span>}
     {id===clave(blanco)&&<span className="yq-animacion-ficha is-blanco" title="Objetivo de prueba"><IconoYugen id="bestia" size={18}/></span>}
    </span>;
   })}
   <AnimacionesDelTablero evento={evento} tablero={tablero} {...dimensiones}/>
  </div>
  {!tieneVisual&&<p className="yq-nota">Elige un efecto o un esqueleto para probar la acción.</p>}
 </section>;
}
