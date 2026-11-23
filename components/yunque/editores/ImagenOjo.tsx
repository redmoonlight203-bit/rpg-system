'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import {Texto} from '../Controles';

type Ajuste = 'completa'|'iris';
type Props = {valor:string; ajuste?:Ajuste; onChange:(url:string,ajuste:Ajuste|undefined)=>void};

export default function ImagenOjo({valor,ajuste,onChange}:Props) {
 const [estado,setEstado]=useState<'subiendo'|'lista'|null>(null);
 const [error,setError]=useState('');
 const vigente=useRef({valor,onChange});
 const intento=useRef(0);
 const idArchivo=useRef<HTMLInputElement>(null);
 useLayoutEffect(()=>{ vigente.current={valor,onChange}; },[valor,onChange]);
 useLayoutEffect(()=>()=>{ intento.current++; },[]);

 function ajusteParaEnlace():Ajuste { return ajuste ?? (valor ? 'iris' : 'completa'); }

 function cambiar(url:string) {
  intento.current++;
  setEstado(null);
  setError('');
  const nueva=url.trim();
  onChange(nueva,nueva?ajusteParaEnlace():undefined);
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
    vigente.current.onChange(url,'completa');
    setEstado('lista');
   } else setEstado(null);
  } catch(e) {
   if(n!==intento.current)return;
   setEstado(null);
   if(vigente.current.valor===previo)setError(e instanceof Error?e.message:'No se pudo subir la imagen.');
  }
 }

 return <fieldset className="yq-vision-imagen">
  <legend>Imagen propia del ojo (opcional)</legend>
  <div className="yq-vision-imagen-acciones">
   <input ref={idArchivo} type="file" hidden accept="image/png,image/jpeg,image/webp" aria-label="Archivo de imagen del ojo"
    onChange={e=>{void subir(e.currentTarget.files?.[0]);e.currentTarget.value='';}}/>
   <button type="button" className="yq-boton" disabled={estado==='subiendo'} onClick={()=>idArchivo.current?.click()}>Subir imagen</button>
   {(valor||estado==='subiendo')&&<button type="button" className="yq-boton" onClick={()=>cambiar('')}>Quitar imagen</button>}
  </div>
  <Texto etiqueta="Enlace directo (opcional)" valor={valor} max={2048} placeholder="https://…"
   ayuda="Usa el enlace del archivo, no el de un álbum. PNG, JPG o WebP, hasta 10 MB. Al subir un archivo, su enlace será público."
   onChange={cambiar}/>
  {valor&&<label className="yq-campo"><span>Ajuste de la imagen</span>
    <select value={ajuste??'iris'} disabled={estado==='subiendo'} onChange={e=>onChange(valor,e.target.value==='iris'?'iris':'completa')}>
     <option value="completa">Ojo completo (sin recorte)</option><option value="iris">Solo el iris (recortado)</option>
    </select>
  </label>}
  <p className="yq-nota">La imagen completa se centra y se ajusta sin estirar ni recortar. Para evitar un fondo visible, usa una imagen transparente.</p>
  {estado&&<p role="status">{estado==='subiendo'?'Subiendo imagen…':'Imagen lista. Guarda la creación para conservarla.'}</p>}
  {error&&<p className="yq-error" role="alert">{error}</p>}
 </fieldset>;
}
