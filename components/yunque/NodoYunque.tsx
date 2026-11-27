'use client';
// Nodo del lienzo del Yunque: un Marco con cabecera teñida por familia, frase en cursiva y puertos.
// La geometría de los puertos es fija (GEO) para que el lienzo pueda trazar los cables sin medir el DOM.
import type {ReactNode} from 'react';
import {Copy,Trash2} from 'lucide-react';
import IconoYugen from '../IconoYugen';
import type {Nodo,TipoNodo} from '../../lib/yunque-grafo';
import type {Operacion} from '../../lib/yunque-operaciones';

export type Familia='nucleo'|'accion'|'modulo'|'regla'|'pasiva'|'vinculo';
const FAMILIA:Record<TipoNodo,Familia>={nucleo:'nucleo',accion:'accion',alcance:'modulo',salvacion:'modulo',estado:'modulo',reaccion:'modulo',transformacion:'modulo',recurso:'modulo',vfx:'modulo',tabla_armas:'modulo',vision:'modulo',invocacion:'accion',cuando:'regla',si:'regla',entonces:'regla',pasiva:'pasiva',vinculo:'vinculo',requisitos:'vinculo'};
export const familiaDe=(t:TipoNodo):Familia=>FAMILIA[t]??'modulo';
export const NOMBRE_TIPO:Record<TipoNodo,string>={nucleo:'Núcleo',accion:'Acción',alcance:'Alcance',salvacion:'Salvación',estado:'Estado',reaccion:'Reacción',transformacion:'Transformación',recurso:'Recurso',vfx:'Animación',tabla_armas:'Tabla de armas',vision:'Visión',cuando:'Cuándo',si:'Si',entonces:'Entonces',pasiva:'Pasiva',vinculo:'Vínculo',invocacion:'Invocación',requisitos:'Requisitos'};
export const ICONO_TIPO:Record<TipoNodo,string>={nucleo:'yugen',accion:'espada',alcance:'ojo',salvacion:'escudo',estado:'fuego',reaccion:'escudo',transformacion:'alma',recurso:'pocion',vfx:'rayo',tabla_armas:'espada',vision:'ojo',cuando:'libro',si:'ojo',entonces:'rayo',pasiva:'vida',vinculo:'anillo',invocacion:'espectro',requisitos:'corona'};

/** Geometría fija: la cabecera mide `cab`; la entrada está a media cabecera; las salidas, en filas de `fila` px. */
export const GEO={cab:40,entradaY:20,salidaY0:50,fila:24};
export const salidas=(n:Nodo)=>n.puertos.filter(p=>p.lado==='salida');
/** Punto local (respecto a la esquina del nodo) de un puerto. */
export function puertoLocal(n:Nodo,puerto:string,ancho:number):{x:number;y:number}{
 if(puerto==='entrada')return {x:0,y:GEO.entradaY};
 const i=Math.max(0,salidas(n).findIndex(p=>p.id===puerto));
 return {x:ancho,y:GEO.salidaY0+i*GEO.fila+GEO.fila/2};
}

type Props={nodo:Nodo;seleccionado:boolean;encendido?:boolean;nuevo?:boolean;icono?:string;conectados?:Set<string>;pie?:ReactNode;onOperar?:(o:Operacion)=>void;children?:ReactNode};
export default function NodoYunque({nodo,seleccionado,encendido=false,nuevo=false,icono,conectados,pie,onOperar,children}:Props){
 const familia=familiaDe(nodo.tipo),outs=salidas(nodo),entrada=nodo.puertos.find(p=>p.lado==='entrada');
 const suelto=nodo.id.startsWith('suelto:');
 const editable=nodo.tipo!=='nucleo'&&!suelto&&!nodo.animacionContexto;
 const duplicable=['accion','cuando','pasiva','entonces'].includes(nodo.tipo)||(nodo.tipo==='si'&&!(nodo.ruta.length===3&&nodo.ruta[2]==='condicion'));
 return <article data-nodo={nodo.id} data-familia={familia} data-tipo={nodo.tipo} aria-label={`${NOMBRE_TIPO[nodo.tipo]}: ${nodo.titulo}${suelto?' (sin conectar)':''}`} aria-current={seleccionado||undefined} data-encendido={encendido||undefined} tabIndex={0}
  className={['yq-nodo',`yq-nodo--${familia}`,seleccionado&&'is-seleccionado',encendido&&'is-encendido',nuevo&&'is-nuevo',nodo.error&&'is-error',suelto&&'is-suelto'].filter(Boolean).join(' ')}>
  {/* Esquinas sin transform ni opacity propios (el rombo y la esquina opuesta ya van dibujados): con 150+ nodos, cada
      transform u opacity era una capa más de propiedades que el navegador recomponía en cada fotograma. */}
  <svg className="yq-nodo-esquina is-ti" viewBox="0 0 18 18" aria-hidden="true"><path d="M1 17V7Q1 1 7 1h10" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M3.9 1.78 6.02 3.9 3.9 6.02 1.78 3.9Z" fill="currentColor"/></svg>
  <svg className="yq-nodo-esquina is-bd" viewBox="0 0 18 18" aria-hidden="true"><path d="M17 1V11Q17 17 11 17H1" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M14.1 11.98 16.22 14.1 14.1 16.22 11.98 14.1Z" fill="currentColor"/></svg>
  <header className="yq-nodo-cab" data-asa="">
   <span className="yq-nodo-icono"><IconoYugen id={icono||ICONO_TIPO[nodo.tipo]} size={22}/></span>
   <span className="yq-nodo-titulos"><small>{NOMBRE_TIPO[nodo.tipo]}</small><strong>{nodo.titulo}</strong>
    {nodo.plantilla&&<em className="yq-nodo-plantilla" data-huerfana={nodo.plantilla.huerfana||undefined} title={nodo.plantilla.huerfana?'La plantilla ya no existe en el catálogo.':'Este nodo sigue a su plantilla.'}>{nodo.plantilla.huerfana?`Plantilla perdida: ${nodo.plantilla.nombre}`:`Plantilla · ${nodo.plantilla.nombre} v${nodo.plantilla.version}`}</em>}</span>
   {seleccionado&&editable&&onOperar&&<span className="yq-nodo-herramientas">
    {duplicable&&<button type="button" title="Duplicar" aria-label="Duplicar nodo" onClick={()=>onOperar({op:'duplicar',nodo:nodo.id})}><Copy size={14}/></button>}
    <button type="button" title="Quitar" aria-label="Quitar nodo" className="is-peligro" onClick={()=>onOperar({op:'quitar',nodo:nodo.id})}><Trash2 size={14}/></button>
   </span>}
   {suelto&&<span className="yq-nodo-suelto">sin conectar</span>}
   {nodo.error&&<span className="yq-nodo-sello" role="img" aria-label={`Error: ${nodo.error}`} title={nodo.error}>!</span>}
  </header>
  <div className="yq-nodo-cuerpo" style={{minHeight:outs.length?outs.length*GEO.fila+(GEO.salidaY0-GEO.cab)+6:undefined,paddingRight:outs.length?104:undefined}}>
   <p className="yq-nodo-frase">{nodo.frase||'—'}</p>
   {nodo.insignia&&<p className="yq-nodo-insignia" title="Coste, usos y enfriamiento"><span aria-hidden="true">◈</span>{nodo.insignia}</p>}
   {nodo.error&&<p className="yq-nodo-error">{nodo.error}</p>}
  </div>
  {entrada&&<span className="yq-puerto yq-puerto--entrada" data-puerto="entrada" data-lado="entrada" style={{top:GEO.entradaY}} aria-hidden="true"/>}
  {outs.length>0&&<ul className="yq-nodo-salidas" style={{top:GEO.salidaY0}} aria-label="Salidas">
   {outs.map(p=><li key={p.id} data-salida={p.id} style={{height:GEO.fila}} className={conectados?.has(p.id)?'is-conectado':undefined}>
    <span>{p.etiqueta||p.id}</span><span className="yq-puerto yq-puerto--salida" data-puerto={p.id} data-lado="salida" title={`Arrastra para crear o conectar: ${p.etiqueta||p.id}`}/>
   </li>)}
  </ul>}
  {pie&&<div className="yq-nodo-pie">{pie}</div>}
  {seleccionado&&children&&<div className="yq-nodo-editor yq-desplazable">{children}</div>}
 </article>;
}
