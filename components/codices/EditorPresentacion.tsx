"use client";
import {useEffect,useRef,useState} from "react";
import {ImageOff,ImagePlus,Link2,Save,Upload} from "lucide-react";
import {mensajeError} from "../../lib/errores";
import {validarPortada} from "../../lib/imagenes-creacion";
import {imagenCreacion} from "../../lib/arte-creacion";
import {publicarArchivoImagen} from "../../lib/imagenes-storage";
import SelectorIconoYugen from "../SelectorIconoYugen";
import {Carta,Portada,type PiezaGaleria,type PropsGaleria} from "../GaleriaCreacion";
import type {ContextoCodice} from "./tipos";

export type EstadoPresentacion={
  imagen:string;
  setImagen:(v:string)=>void;
  icono:string;
  setIcono:(v:string)=>void;
  procesando:boolean;
  guardando:boolean;
  setGuardando:(v:boolean)=>void;
  error:string;
  setError:(v:string)=>void;
  aviso:string;
  editando:boolean;
  setEditando:(v:boolean)=>void;
  dirty:boolean;
  ocupado:boolean;
  archivo:(file?:File)=>Promise<void>;
  guardar:()=>Promise<void>;
  cancelar:()=>void;
};

/** Estado de la imagen e icono de una creación (antes vivía en el Detalle de la galería). */
export function usePresentacion<T extends PiezaGaleria>(item:T,props:PropsGaleria<T>):EstadoPresentacion{
  const [imagen,setImagen]=useState(item.imagen_url||"");
  const [icono,setIcono]=useState(item.icono||"");
  const [procesando,setProcesando]=useState(false);
  const [guardando,setGuardando]=useState(false);
  const [error,setError]=useState("");
  const [aviso,setAviso]=useState("");
  const [editando,setEditando]=useState(false);
  const bloqueo=useRef(false);
  const dirty=imagen!==(item.imagen_url||"")||icono!==(item.icono||"");
  const ocupado=procesando||guardando;
  useEffect(()=>{
    if(!dirty)return;
    const salir=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};
    window.addEventListener("beforeunload",salir);
    return ()=>window.removeEventListener("beforeunload",salir);
  },[dirty]);
  async function archivo(file?:File){
    if(!file||bloqueo.current)return;
    bloqueo.current=true;setProcesando(true);setError("");setAviso("");
    try{setImagen(await publicarArchivoImagen(file));}
    catch(e){setError(mensajeError(e,"No se pudo leer la imagen."));}
    finally{bloqueo.current=false;setProcesando(false);}
  }
  async function guardar(){
    if(bloqueo.current)return;
    const value=imagen.trim(),fallo=validarPortada(value);
    if(fallo){setError(fallo);return;}
    bloqueo.current=true;setGuardando(true);setError("");setAviso("");
    try{await props.onImagen(item.id,value,icono);setImagen(value);setAviso("Presentación guardada en la creación.");setEditando(false);}
    catch(e){setError(mensajeError(e,"No se pudo guardar la imagen."));}
    finally{bloqueo.current=false;setGuardando(false);}
  }
  function cancelar(){setImagen(item.imagen_url||"");setIcono(item.icono||"");setError("");setEditando(false);}
  return {imagen,setImagen,icono,setIcono,procesando,guardando,setGuardando,error,setError,aviso,editando,setEditando,dirty,ocupado,archivo,guardar,cancelar};
}

/** Botón «Elegir/Cambiar imagen o icono» y su editor desplegable. */
export function EditorPresentacion<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  const {item,props,presentacion:p,tipo}=ctx;
  const editor=<div className="cg-image-editor"><h3>Imagen o emblema</h3>
    <div className="cg-encuadres">
      <figure><Carta item={{...item,imagen_url:p.imagen,icono:p.icono}} props={props} dueno={null} orden={0}/><figcaption>Tarjeta</figcaption></figure>
      <figure><div className="cg-vista-ficha"><Portada src={ctx.imagenVisible} tipo={tipo} icono={ctx.iconoVisible} circular/></div><figcaption>Ficha circular</figcaption></figure>
    </div>
    <fieldset disabled={p.ocupado}>
      <div className="cg-symbol-editor"><h4>Icono de Yugen</h4><p>Se usa cuando no hay imagen o no se puede cargar. Automático utiliza el símbolo de la raza o categoría.</p><SelectorIconoYugen value={p.icono} onChange={p.setIcono} automatico={props.iconoDe({...item,icono:null})} disabled={p.ocupado}/></div>
      <label><Link2 size={14}/>URL de la imagen<input type="text" placeholder="https://…" value={p.imagen.startsWith("data:")?"":p.imagen} onChange={e=>{p.setImagen(e.target.value);p.setError("");}}/></label>
      <span className="cg-or">o selecciona un archivo</span>
      <label className="cg-upload"><Upload size={20}/><strong>Publicar imagen</strong><span>PNG, JPG o WebP · visible mediante enlace público</span><input aria-label="Insertar imagen desde archivo" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{void p.archivo(e.target.files?.[0]);e.target.value="";}}/></label>
      {p.imagen.startsWith("data:")&&<p className="cg-local-image">Imagen de archivo lista para guardar.</p>}
      <div className="cg-image-actions">
        <button type="button" className="cg-button" disabled={!p.imagen} onClick={()=>{p.setImagen("");p.setError("");}}><ImageOff size={14}/>{imagenCreacion(item.id)?"Restaurar ilustración":"Quitar imagen"}</button>
        <button type="button" className="cg-button" onClick={p.cancelar}>Cancelar</button>
      </div>
      <button type="button" className="cg-button cg-primary" disabled={!p.dirty} onClick={()=>void p.guardar()}><Save size={16}/>Guardar presentación</button>
    </fieldset>
    <small>Los archivos se optimizan y publican en Storage; cualquiera con el enlace podrá verlos.</small>
  </div>;
  return <div className="cx-presentacion">
    <button type="button" className="cg-button cg-image-toggle" disabled={p.ocupado} onClick={()=>p.setEditando(!p.editando)} aria-expanded={p.editando}>
      <ImagePlus size={16}/>{imagenCreacion(item.id,item.imagen_url)?"Cambiar imagen o icono":"Elegir imagen o icono"}
    </button>
    {p.editando&&editor}
  </div>;
}

/** Mensajes de estado de la presentación (procesando, error, aviso, cambios sin guardar). */
export function EstadoPresentacionAvisos({p}:{p:EstadoPresentacion}){
  return <>
    {p.ocupado&&<p role="status">{p.procesando?"Preparando imagen…":"Guardando imagen…"}</p>}
    {p.error&&<p className="cg-error" role="alert">{p.error}</p>}
    {p.aviso&&<p className="cg-success" role="status">{p.aviso}</p>}
    {p.dirty&&<p className="cg-unsaved">Presentación sin guardar</p>}
  </>;
}
