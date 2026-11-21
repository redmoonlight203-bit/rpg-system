'use client';
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {Coins,Gem} from 'lucide-react';

export const CALIDADES_BOTIN=['Muy pobre','Pobre','Normal','Bueno','Excepcional'];
export const claseCalidad=(banda:number)=>`yb-q${Math.max(0,Math.min(4,Math.round(banda||0)))}`;
export const nombreCalidad=(banda:number)=>CALIDADES_BOTIN[Math.max(0,Math.min(4,Math.round(banda||0)))];

export type ObjetoBotin={clave:string;nombre:string;cantidad:number;imagen_url?:string|null;moneda?:boolean;detalle?:string};

export function Calidad({banda}:{banda:number}){return <span className={`yb-calidad ${claseCalidad(banda)}`}>{nombreCalidad(banda)} · {Math.round(banda||0)+1}/5</span>;}

/** Cofre dibujado en SVG; el color de los herrajes sigue la calidad (--q del contenedor). */
export function Cofre({abierto=false}:{abierto?:boolean}){
 return <svg className={`yb-cofre ${abierto?'is-abierto':''}`} viewBox="0 0 120 100" aria-hidden="true">
  <ellipse className="yb-luz" cx="60" cy="44" rx="44" ry="14" fill="var(--q)" opacity=".7"/>
  <rect className="yb-madera" x="12" y="46" width="96" height="46" rx="3"/>
  <rect className="yb-madera-oscura" x="12" y="62" width="96" height="5"/>
  <rect className="yb-herraje" x="22" y="46" width="7" height="46"/>
  <rect className="yb-herraje" x="91" y="46" width="7" height="46"/>
  <g className="yb-tapa">
   <path className="yb-madera" d="M12 46 V30 Q12 14 60 14 Q108 14 108 30 V46 Z"/>
   <rect className="yb-herraje" x="22" y="18" width="7" height="28"/>
   <rect className="yb-herraje" x="91" y="18" width="7" height="28"/>
   <rect className="yb-madera-oscura" x="12" y="42" width="96" height="4"/>
  </g>
  <rect className="yb-cerradura" x="52" y="40" width="16" height="18" rx="2"/>
  <circle cx="60" cy="48" r="2.5" fill="var(--q)"/>
 </svg>;
}

function Arte({o}:{o:ObjetoBotin}){
 const [fallo,setFallo]=useState(false);
 if(o.imagen_url&&!fallo)return <img src={o.imagen_url} alt="" loading="lazy" onError={()=>setFallo(true)}/>; // eslint-disable-line @next/next/no-img-element
 return o.moneda?<Coins size={30}/>:<Gem size={30}/>;
}

/**
 * Apertura de un cofre de botín: el cofre cerrado muestra la tirada y la calidad;
 * al abrirlo se revelan los objetos uno a uno. `acciones` permite al GM elegir destinatario.
 */
export default function CofreBotin({titulo,subtitulo,tirada,banda,objetos,abiertoInicial=false,onCerrar,acciones,textoCerrar='Guardar y continuar'}:{titulo:string;subtitulo?:string;tirada?:number|null;banda:number;objetos:ObjetoBotin[];abiertoInicial?:boolean;onCerrar:()=>void;acciones?:ReactNode;textoCerrar?:string}){
 const [abierto,setAbierto]=useState(abiertoInicial),cofre=useRef<HTMLButtonElement>(null),cerrar=useRef<HTMLButtonElement>(null);
 useEffect(()=>{(abierto?cerrar:cofre).current?.focus();},[abierto]);
 return <div className={`yb-modal ${claseCalidad(banda)}`} role="dialog" aria-modal="true" aria-labelledby="yb-titulo" onKeyDown={e=>{if(e.key==='Escape')onCerrar();}}>
  <div className={`yb-escena ${abierto?'is-abierto':''}`}>
   <p className="yb-sub">{subtitulo||'Botín del encuentro'}</p>
   <h2 id="yb-titulo">{titulo}</h2>
   <div className="yb-tirada">{tirada!=null&&<span className="yb-d20" aria-label={`Tirada d20: ${tirada}`}>{tirada}</span>}<Calidad banda={banda}/></div>
   <button ref={cofre} type="button" className="yb-cofre-boton" disabled={abierto} onClick={()=>setAbierto(true)} aria-label={abierto?'Cofre abierto':'Abrir el cofre'}>
    <span className="yb-destello" aria-hidden="true"/>
    <Cofre abierto={abierto}/>
   </button>
   {!abierto?<p className="yb-pista">Toca el cofre para abrirlo</p>:<>
    {objetos.length?<ul className="yb-objetos" aria-label="Objetos obtenidos">{objetos.slice(0,24).map((o,i)=><li key={o.clave} className="yb-objeto" style={{'--i':Math.min(i,6)} as CSSProperties}>
     {o.cantidad>1&&<span className="yb-cantidad">×{o.cantidad}</span>}
     <span className="yb-objeto-arte"><Arte o={o}/></span>
     <strong>{o.nombre}</strong>{o.detalle&&<small>{o.detalle}</small>}
    </li>)}</ul>:<p className="yb-sub">El cofre estaba vacío.</p>}
    {acciones}
    <div className="yb-acciones"><button ref={cerrar} type="button" className="yb-boton is-principal" onClick={onCerrar}>{textoCerrar}</button></div>
   </>}
  </div>
 </div>;
}
