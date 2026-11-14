"use client";
import {useEffect,useRef,useState} from 'react';
import {Maximize,Minimize} from 'lucide-react';

export default function PantallaCombate(){
  const boton=useRef<HTMLButtonElement>(null);
  const [nativa,setNativa]=useState(false);
  const [ampliada,setAmpliada]=useState(false);
  useEffect(()=>{
    const cambio=()=>setNativa(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange',cambio);
    cambio();
    return ()=>document.removeEventListener('fullscreenchange',cambio);
  },[]);
  useEffect(()=>{
    if(!ampliada)return;
    const vista=boton.current?.closest('main');
    vista?.classList.add('arena-ampliada');
    const cerrar=(e:KeyboardEvent)=>{if(e.key==='Escape')setAmpliada(false)};
    window.addEventListener('keydown',cerrar);
    return ()=>{vista?.classList.remove('arena-ampliada');window.removeEventListener('keydown',cerrar)};
  },[ampliada]);
  async function alternar(){
    if(ampliada){setAmpliada(false);return}
    if(document.fullscreenElement){await document.exitFullscreen();return}
    try{await document.documentElement.requestFullscreen()}catch{setAmpliada(true)}
  }
  const activa=ampliada||nativa;
  return <button ref={boton} className="arena-full" type="button" aria-pressed={activa} onClick={()=>void alternar()}>{activa?<Minimize size={16}/>:<Maximize size={16}/>} {activa?'Salir de pantalla completa':'Pantalla completa'}</button>;
}
