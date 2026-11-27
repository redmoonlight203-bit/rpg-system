'use client';
import {lazy,Suspense,useState,type ReactNode} from 'react';
import type {Efecto} from '../../../lib/creacion';
import type {AnimacionEtapa,AnimacionRegla} from '../../../lib/vfx';
import type {EtapaAnimable} from './EditorAnimacion';
import './editor-animacion.css';

const Accion=lazy(()=>import('./EditorAnimacion'));
const Etapas=lazy(()=>import('./EditorAnimacion').then(m=>({default:m.EditorAnimacionEtapas})));
const Pulso=lazy(()=>import('./EditorAnimacion').then(m=>({default:m.EditorAnimacionPulso})));

function Boton({texto,editor}:{texto:string;editor:(cerrar:()=>void)=>ReactNode}){
 const [abierto,setAbierto]=useState(false);
 return <>
  <button type="button" className="yq-boton yq-editor-abrir" onClick={()=>setAbierto(true)}>{texto}</button>
  {abierto&&<Suspense fallback={<span role="status">Abriendo editor de animaciones…</span>}>{editor(()=>setAbierto(false))}</Suspense>}
 </>;
}

export function BotonAnimacionAccion({efecto,onChange}:{efecto:Efecto;onChange:(v:Partial<Efecto>)=>void}){
 return <Boton texto="Editar animación" editor={onCerrar=><Accion efecto={efecto} acciones={[]} onElegir={()=>{}} onChange={onChange} onCerrar={onCerrar}/>}/>;
}

export function BotonAnimacionEtapa({etapa,titulo,onChange,onRegla}:{
 etapa:EtapaAnimable;titulo:string;onChange:(v:AnimacionEtapa|undefined)=>void;onRegla?:(id:string,v:AnimacionRegla|undefined)=>void;
}){
 return <Boton texto="Editar animaciones de la etapa" editor={onCerrar=><Etapas titulo={titulo} etapas={[etapa]}
  onChange={(_,v)=>onChange(v)} onRegla={onRegla?(_,id,v)=>onRegla(id,v):undefined} onCerrar={onCerrar}/>}/>;
}

export function BotonAnimacionRegla({titulo,valor,onChange}:{
 titulo:string;valor?:AnimacionRegla;onChange:(v:AnimacionRegla|undefined)=>void;
}){
 return <Boton texto="Editar animación de la regla" editor={onCerrar=><Pulso titulo={titulo} valor={valor} onChange={onChange} onCerrar={onCerrar}/>}/>;
}
