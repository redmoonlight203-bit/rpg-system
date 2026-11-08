"use client";
import {useEffect,useRef,useState} from 'react';
import {Upload,ImageOff} from 'lucide-react';
import IconoYugen from './IconoYugen';
import SelectorIconoYugen from './SelectorIconoYugen';
import {prepararPortada,validarPortada} from '../lib/imagenes-creacion';
export default function PortadaYunque({nombre,imagen,icono,onChange,onProcesando}:{nombre:string;imagen:string;icono:string;onChange:(p:{imagen?:string;icono?:string})=>void;onProcesando?:(v:boolean)=>void}){
 const vivo=useRef(true);useEffect(()=>{vivo.current=true;return()=>{vivo.current=false;};},[]);
 const [ocupado,setOcupado]=useState(false),[error,setError]=useState('');
 async function subir(file?:File){if(!file||ocupado)return;setOcupado(true);onProcesando?.(true);try{const imagen=await prepararPortada(file);if(vivo.current){onChange({imagen});setError('');}}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar la imagen.');}finally{setOcupado(false);onProcesando?.(false);}}
 return <section className="yunque-portada" aria-label="Imagen y emblema"><div className="yunque-portada-preview" onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();}} onDrop={e=>{if(e.dataTransfer.files.length){e.preventDefault();void subir(e.dataTransfer.files[0]);}}}>
 {imagen&&!validarPortada(imagen)?/* eslint-disable-next-line @next/next/no-img-element */<img src={imagen} alt={nombre||'Vista previa de la creación'} decoding="async"/>:<IconoYugen id={icono||'yugen'} size={82}/>}<span>{nombre||'Tu creación'}</span></div><div><h3>Su imagen y emblema</h3><p>Arrastra una imagen al recuadro, súbela o elige un símbolo de Yugen.</p><label className="yunque-cargar"><Upload size={16}/>{ocupado?'Preparando imagen…':'Subir imagen'}<input type="file" disabled={ocupado} accept="image/png,image/jpeg,image/webp" onChange={e=>{void subir(e.target.files?.[0]);e.target.value='';}}/></label>{imagen&&<button type="button" onClick={()=>onChange({imagen:''})}><ImageOff size={16}/> Quitar imagen</button>}<details><summary>Usar un enlace de imagen</summary><label>Enlace<input type="url" value={imagen.startsWith('data:')?'':imagen} onChange={e=>onChange({imagen:e.target.value})}/></label></details><details><summary>Elegir un emblema</summary><SelectorIconoYugen value={icono} onChange={icono=>onChange({icono})}/></details>{error&&<p role="alert" className="yunque-error">{error}</p>}</div></section>;
}
