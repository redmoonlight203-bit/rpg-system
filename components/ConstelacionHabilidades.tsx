"use client";
import IconoYugen from './IconoYugen';
import RetratoRaza from './RetratoRaza';
export type NodoHabilidad={id:string;nombre:string;imagen_url?:string;icono:string;pasiva:boolean;clase?:string;activo?:boolean};

/**
 * Constelación de habilidades (design.md v3): la figura de la raza en el centro de un mapa estelar.
 * Cada habilidad es una estrella unida al pecho; las activas brillan y su trazo se ilumina.
 */
export default function ConstelacionHabilidades({nodos,seleccion,onElegir,imagenRaza,nombreRaza}:{nodos:NodoHabilidad[];seleccion?:string;onElegir:(id:string)=>void;imagenRaza?:string;nombreRaza?:string}){
 const alto=Math.max(600,Math.ceil(nodos.length/2)*120+140),pecho=alto*0.27;
 const pos=(n:number)=>({x:n%2===0?210:790,y:110+Math.floor(n/2)*120});
 return <section className="y3-constelacion" aria-label="Constelación de habilidades del personaje" style={{height:alto}}>
  <div className="y3-constelacion-cielo" aria-hidden="true"/>
  <div className="y3-constelacion-figura" aria-hidden="true"><RetratoRaza src={imagenRaza} nombre={nombreRaza}/></div>
  <svg className="y3-constelacion-trazos" viewBox={`0 0 1000 ${alto}`} preserveAspectRatio="none" aria-hidden="true">
   {nodos.map((i,n)=>{const p=pos(n);return <path key={i.id} className={i.activo===false?'is-apagado':seleccion===i.id?'is-elegido':''} d={`M500 ${pecho} C${n%2===0?380:620} ${pecho},${p.x} ${p.y},${p.x} ${p.y}`}/>;})}
   <circle className="y3-constelacion-corazon" cx="500" cy={pecho} r="6"/>
  </svg>
  {nodos.map((i,n)=>{const p=pos(n);return <button key={i.id} type="button" className={`y3-estrella ${i.activo===false?'is-apagada':''} ${seleccion===i.id?'is-elegida':''}`} style={{left:`${p.x/10}%`,top:p.y}} aria-pressed={seleccion===i.id} onClick={()=>onElegir(i.id)}>
   <span className="y3-estrella-astro" aria-hidden="true">{i.imagen_url
    // eslint-disable-next-line @next/next/no-img-element -- icono pequeño de la creación (URL pública), tamaño fijo
    ?<img src={i.imagen_url} alt="" width={30} height={30}/>:<IconoYugen id={i.icono} size={26}/>}</span>
   <span className="y3-estrella-texto"><strong>{i.nombre}</strong><small>{i.pasiva?'Pasiva':'Habilidad'} · clase {i.clase||'D'}{i.activo===false?' · inactiva':''}</small></span>
  </button>;})}
  {!nodos.length&&<p className="y-vacio y3-constelacion-vacio"><strong>Tu cielo aún está vacío</strong>Kuroi te otorgará habilidades cuando las ganes.</p>}
  <span className="y3-constelacion-lema">El cuerpo es el canal · El alma es el origen</span>
 </section>;
}
