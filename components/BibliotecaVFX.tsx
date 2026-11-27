'use client';
import {useEffect,useRef,useState} from 'react';
import {buscarVFX} from '../lib/vfx';
import MiniaturaVFX from './MiniaturaVFX';

export default function BibliotecaVFX({elegir,previsualizar=false}:{elegir:(id:string)=>void;previsualizar?:boolean}){
 const [ids,setIds]=useState<string[]>([]),[archivo,setArchivo]=useState<File>();
 const [nombre,setNombre]=useState(''),[duracion,setDuracion]=useState(900),[ocupado,setOcupado]=useState(false);
 const [error,setError]=useState(''),[carga,setCarga]=useState(0),[leyendo,setLeyendo]=useState(true);
 const muestra=useRef<HTMLImageElement>(null);
 const vigente=useRef(false),subiendo=useRef(false);
 useEffect(()=>{
  vigente.current=true;
  return ()=>{vigente.current=false;};
 },[]);
 useEffect(()=>{
  let activo=true;
  import('../lib/vfx-storage').then(m=>m.listarEfectosPropios()).then(lista=>{if(activo)setIds(lista);})
   .catch(e=>{if(activo)setError(e.message);}).finally(()=>{if(activo)setLeyendo(false);});
  return ()=>{activo=false;};
 },[carga]);
 useEffect(()=>{
  if(!archivo||!muestra.current)return;
  const url=URL.createObjectURL(archivo);
  muestra.current.src=url;
  return ()=>URL.revokeObjectURL(url);
 },[archivo]);
 async function subir(){
  if(!archivo||subiendo.current)return;
  subiendo.current=true;setOcupado(true);setError('');
  try{
   const {subirEfecto}=await import('../lib/vfx-storage');
   const id=await subirEfecto(archivo,nombre,duracion);
   if(vigente.current)elegir(id);
  }catch(e){if(vigente.current)setError(e instanceof Error?e.message:'Error al subir el efecto.');}
  finally{subiendo.current=false;if(vigente.current)setOcupado(false);}
 }
 return <section className="vfx-personal">
  {leyendo?<p>Cargando tus efectos…</p>:ids.length>0?previsualizar?<div className="yq-animacion-recursos">{ids.map(id=><button type="button" key={id} onClick={()=>elegir(id)}>
   <MiniaturaVFX clip={id}/><span>{buscarVFX(id)?.nombre}</span>
  </button>)}</div>:<label>Efectos subidos<select defaultValue="" onChange={e=>elegir(e.target.value)}><option value="" disabled>Elegir un efecto</option>{ids.map(id=><option key={id} value={id}>{buscarVFX(id)?.nombre} · {buscarVFX(id)?.duracion} ms</option>)}</select></label>:<p>Tu biblioteca está vacía.</p>}
  <fieldset disabled={ocupado}><legend>Subir un efecto</legend>
   <label>Archivo PNG, APNG o WebP · máximo 500 KB<input type="file" accept=".png,.apng,.webp" onChange={e=>{
    const f=e.target.files?.[0];setArchivo(f);setNombre(f?.name.replace(/\.[^.]+$/,'').slice(0,18)||'');setError('');
   }}/></label>
   {archivo&&<><img className="vfx-muestra" ref={muestra} alt="Vista previa del archivo"/>
    <label>Nombre<input maxLength={18} value={nombre} onChange={e=>setNombre(e.target.value)}/></label>
    <label>Tiempo en pantalla (ms)<input type="number" min={100} max={2400} value={duracion||''} onChange={e=>setDuracion(Number(e.target.value))}/></label>
    <button type="button" disabled={!nombre.trim()} onClick={()=>void subir()}>{ocupado?'Subiendo…':'Subir y seleccionar'}</button></>}
  </fieldset>
  {error&&<p role="alert">{error} <button type="button" onClick={()=>{setLeyendo(true);setError('');setCarga(c=>c+1);}}>Recargar biblioteca</button></p>}
 </section>;
}
