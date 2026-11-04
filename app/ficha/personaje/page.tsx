"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Package,Sparkles,Shield,Flame,ArrowLeft} from 'lucide-react';
import {supabase} from '../../../lib/supabase';
import SiluetaYugen from '../../../components/SiluetaYugen';
type Personaje={id:number;nombre:string;raza:string;estado_vida:string;atributos:Record<string,number>};
export default function PersonajeJugador(){
 const[pj,setPj]=useState<Personaje|null>(null),[error,setError]=useState('');
 useEffect(()=>{let vivo=true;void(async()=>{const id=localStorage.getItem('personaje_activo_id');if(!id){setError('Elige un personaje para entrar a su ficha.');return;}const {data,error}=await supabase.from('personajes').select('id,nombre,raza,estado_vida,atributos').eq('id',id).single();if(!vivo)return;if(error)setError('No se pudo cargar tu personaje.');else setPj(data);})();return()=>{vivo=false;};},[]);
 const opciones=[{titulo:'Constelación de habilidades',descripcion:'Explora los poderes que nacen de tu personaje.',icon:Sparkles,ruta:'/ficha/habilidades'},{titulo:'La armería',descripcion:'Prepara cada pieza de tu equipo sobre el cuerpo.',icon:Shield,ruta:'/ficha/equipamiento'},{titulo:'Tus pertenencias',descripcion:'Armas, reliquias y objetos que llevas en el viaje.',icon:Package,ruta:'/ficha/inventario'},{titulo:'El alma',descripcion:'Tu bóveda compartida, más allá de cualquier cuerpo.',icon:Flame,ruta:'/ficha/alma'}];
 return <main className="y-page"><Link className="y-breadcrumb" href="/ficha/personajes"><ArrowLeft size={13}/>CAMBIAR PERSONAJE</Link>{error?<p className="y-error">{error}</p>:!pj?<p className="y-empty">Invocando tu personaje…</p>:<><section className="y-panel y-character-hero"><SiluetaYugen/><div><span className="y-eyebrow">{pj.raza} / {pj.estado_vida}</span><h1>{pj.nombre}</h1><p style={{color:'#a69a83',fontSize:12}}>Un cuerpo para el alma. Un lugar para tu historia.</p></div></section><div className="y-stat-strip">{Object.entries(pj.atributos||{}).slice(0,6).map(([clave,valor])=><div key={clave}><small>{clave.replaceAll('_',' ')}</small><strong>{valor}</strong></div>)}</div><div className="y-home-cards">{opciones.map((o,i)=><Link className="y-home-card" key={o.ruta} href={o.ruta}><o.icon size={29}/><div><small className="y-home-number">0{i+1} / {pj.nombre}</small><h2>{o.titulo}</h2><p>{o.descripcion}</p></div><span>↗</span></Link>)}</div></>}</main>;
}
