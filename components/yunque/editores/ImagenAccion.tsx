'use client';
// Imagen propia de una acción: la ranura de la barra de combate la muestra en lugar de la imagen de la creación,
// que se queda para la Forja (galería, códices). Sube el archivo al almacenamiento público o acepta un enlace directo.
import {useLayoutEffect,useRef,useState} from 'react';
import {Texto} from '../Controles';
import FotoEncuadrada from '../../FotoEncuadrada';

type Props = {valor:string; onChange:(url:string)=>void};

export default function ImagenAccion({valor,onChange}:Props) {
 const [estado,setEstado]=useState<'subiendo'|'lista'|null>(null);
 const [error,setError]=useState('');
 const vigente=useRef({valor,onChange});
 const intento=useRef(0);
 const idArchivo=useRef<HTMLInputElement>(null);
 useLayoutEffect(()=>{ vigente.current={valor,onChange}; },[valor,onChange]);
 useLayoutEffect(()=>()=>{ intento.current++; },[]);

 function cambiar(url:string) {
  intento.current++;
  setEstado(null);
  setError('');
  onChange(url.trim());
 }

 async function subir(file:File|undefined) {
  if(!file)return;
  const n=++intento.current;
  const previo=vigente.current.valor;
  setEstado('subiendo');
  setError('');
  try {
   const {publicarArchivoImagen}=await import('../../../lib/imagenes-storage');
   const url=await publicarArchivoImagen(file);
   if(n!==intento.current)return;
   if(vigente.current.valor===previo) {
    vigente.current.onChange(url);
    setEstado('lista');
   } else setEstado(null);
  } catch(e) {
   if(n!==intento.current)return;
   setEstado(null);
   if(vigente.current.valor===previo)setError(e instanceof Error?e.message:'No se pudo subir la imagen.');
  }
 }

 return <details className="yq-imagen-accion" open={!!valor||undefined}>
  <summary>Imagen en combate{valor?'':' (opcional)'}</summary>
  <div className="yq-imagen-accion-cuerpo">
   <span className="yq-imagen-accion-vista" aria-hidden="true">
    <FotoEncuadrada src={valor||undefined} fallback={<span className="yq-imagen-accion-vacia">Sin imagen</span>}/>
   </span>
   <div className="yq-imagen-accion-campos">
    <div className="yq-vision-imagen-acciones">
     <input ref={idArchivo} type="file" hidden accept="image/png,image/jpeg,image/webp" aria-label="Archivo de imagen de la acción"
      onChange={e=>{void subir(e.currentTarget.files?.[0]);e.currentTarget.value='';}}/>
     <button type="button" className="yq-boton" disabled={estado==='subiendo'} onClick={()=>idArchivo.current?.click()}>Subir imagen</button>
     {(valor||estado==='subiendo')&&<button type="button" className="yq-boton" onClick={()=>cambiar('')}>Quitar imagen</button>}
    </div>
    <Texto etiqueta="Enlace directo (opcional)" valor={valor} max={2048} placeholder="https://…"
     ayuda="PNG, JPG o WebP, hasta 10 MB. Al subir un archivo, su enlace será público."
     onChange={cambiar}/>
   </div>
  </div>
  <p className="yq-nota">Se ve en la barra de acciones del combate. Sin imagen propia, la acción usa la imagen de la creación.</p>
  {estado&&<p role="status">{estado==='subiendo'?'Subiendo imagen…':'Imagen lista. Guarda la creación para conservarla.'}</p>}
  {error&&<p className="yq-error" role="alert">{error}</p>}
 </details>;
}
