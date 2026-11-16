'use client';
import {useEffect,useRef,useState} from 'react';
import {Sello} from './ui/Juego';

/**
 * Celebración de subida de nivel (design.md v3 §5: una sola vez, 400–900 ms de animación).
 * Recuerda en este navegador el último nivel visto por personaje; la primera visita solo lo guarda.
 */
export default function CelebracionNivel({personajeId,nivel,nombre}:{personajeId:number|string;nivel:number;nombre:string}){
 const [mostrar,setMostrar]=useState<number|null>(null),boton=useRef<HTMLButtonElement>(null),clave=`yugen_nivel_visto_${personajeId}`;
 const guardar=(n:number)=>{try{localStorage.setItem(`yugen_nivel_visto_${personajeId}`,String(n));}catch{/* sin almacenamiento */}};
 const cerrar=()=>{if(mostrar!==null)guardar(mostrar);setMostrar(null);};
 useEffect(()=>{
  let previo:number|null=null;
  try{const v=localStorage.getItem(clave);previo=v===null?null:Number(v);}catch{return;/* sin almacenamiento: no se celebra */}
  // Se celebra solo si ya conocíamos un nivel menor; el nuevo nivel se guarda al cerrar (o ya, si no hay nada que celebrar).
  if(previo!==null&&Number.isFinite(previo)&&nivel>previo){const t=setTimeout(()=>setMostrar(nivel),0);return()=>clearTimeout(t);}
  try{localStorage.setItem(clave,String(nivel));}catch{/* sin almacenamiento */}
 },[clave,nivel]);
 useEffect(()=>{if(mostrar!==null)boton.current?.focus();},[mostrar]);
 if(mostrar===null)return null;
 return <div className="y3-celebracion" role="dialog" aria-modal="true" aria-labelledby="y3-celebracion-titulo" onKeyDown={e=>{if(e.key==='Escape')cerrar();}}>
  <div className="y3-celebracion-destello" aria-hidden="true"/>
  <div className="y3-celebracion-carta">
   <p className="y3-carta-linaje">{nombre} ha crecido</p>
   <p className="y3-celebracion-nivel" aria-hidden="true">{mostrar}</p>
   <h2 id="y3-celebracion-titulo" className="y3-display">¡Nivel {mostrar} alcanzado!</h2>
   <p className="y-nota">Tienes nuevos puntos para tu árbol de habilidades.</p>
   <Sello texto="Ascensión" runa="/arte/runas/experiencia.png" celebrar/>
   <button ref={boton} type="button" className="y3-boton-principal" onClick={cerrar}>Continuar</button>
  </div>
 </div>;
}
