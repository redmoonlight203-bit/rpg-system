'use client';
import {useCallback,useEffect,useState} from 'react';
import {Crown,Sparkles} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {mensajeError} from '../lib/errores';
import {useTiempoReal} from '../lib/useTiempoReal';
import {describirRegla} from '../lib/descripciones';
import type {Regla} from '../lib/reglas';
import ImagenIconoLogro from './ImagenIconoLogro';

export type TituloCuenta={id:string;nombre:string;descripcion:string;imagen_url:string|null;icono:string|null;stats:Record<string,number>;reglas:Regla[]|null;reglas_pasivas:{nombre:string}[]|null;especial:boolean;efecto_narrativo:string;origen:string};
type PersonajeCuenta={id:number;nombre:string;titulo_activo:string|null;es_companero:boolean|null;estado_vida:string|null};

const NO_STATS=new Set(['peso','durabilidad','dados_dano','caras_dano','dano']);
export function efectosTitulo(t:Pick<TituloCuenta,'stats'|'reglas'|'reglas_pasivas'>):string[]{
 return [...Object.entries(t.stats||{}).filter(([k,v])=>typeof v==='number'&&v!==0&&!NO_STATS.has(k)).map(([k,v])=>`${k.replaceAll('_',' ')} ${v>0?'+':''}${v}`),
  ...(t.reglas_pasivas||[]).map(p=>p.nombre).filter(Boolean),
  ...(t.reglas||[]).map(r=>{try{return describirRegla(r).resumen;}catch{return r.nombre;}}).filter(Boolean)];
}

/** Carga los títulos de una cuenta con su configuración (especial / efecto narrativo). */
export async function cargarTitulosCuenta(usuario:string):Promise<TituloCuenta[]>{
 const o=await supabase.from('titulos_obtenidos').select('titulo_forja_id,origen').eq('user_id',usuario);
 if(o.error)throw o.error;
 const ids=(o.data||[]).map(x=>x.titulo_forja_id);if(!ids.length)return [];
 const [f,a]=await Promise.all([supabase.from('forja_maestra').select('id,nombre,descripcion,imagen_url,icono,stats,reglas,reglas_pasivas').in('id',ids),supabase.from('titulos_ajustes').select('titulo_forja_id,especial,efecto_narrativo').in('titulo_forja_id',ids)]);
 if(f.error)throw f.error;if(a.error)throw a.error;
 const aj=new Map((a.data||[]).map(x=>[x.titulo_forja_id,x]));
 return (f.data||[]).map(t=>({...t,stats:t.stats||{},especial:!!aj.get(t.id)?.especial,efecto_narrativo:aj.get(t.id)?.efecto_narrativo||'',origen:o.data?.find(x=>x.titulo_forja_id===t.id)?.origen||''}))
  .sort((x,y)=>Number(y.especial)-Number(x.especial)||x.nombre.localeCompare(y.nombre));
}

/**
 * Colección de títulos de la cuenta. Un título normal se activa en cualquier personaje
 * (uno activo por personaje); un título especial está siempre activo en todos.
 */
export default function ColeccionTitulos(){
 const [titulos,setTitulos]=useState<TituloCuenta[]>([]),[personajes,setPersonajes]=useState<PersonajeCuenta[]>([]),[error,setError]=useState(''),[aviso,setAviso]=useState(''),[ocupado,setOcupado]=useState(''),[cargado,setCargado]=useState(false);
 const cargar=useCallback(async()=>{try{
  const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error('Inicia sesión.');
  const [t,p]=await Promise.all([cargarTitulosCuenta(user.id),supabase.from('personajes').select('id,nombre,titulo_activo,es_companero,estado_vida').eq('user_id',user.id).order('es_companero').order('nombre')]);
  if(p.error)throw p.error;setTitulos(t);setPersonajes((p.data||[]).filter(x=>x.estado_vida!=='muerto'));setCargado(true);
 }catch(e){setError(mensajeError(e,'No se pudieron cargar tus títulos.'));}},[]);
 useEffect(()=>{const t=setTimeout(()=>void cargar(),0);return()=>clearTimeout(t);},[cargar]);
 useTiempoReal(cargar);
 async function activar(pj:PersonajeCuenta,t:TituloCuenta){
  const quitar=pj.titulo_activo===t.id;setOcupado(`${pj.id}:${t.id}`);setError('');setAviso('');
  try{const r=await supabase.rpc('titulo_activar',{p_personaje:pj.id,p_titulo:quitar?null:t.id});if(r.error)throw r.error;
   const anterior=titulos.find(x=>x.id===pj.titulo_activo);
   setAviso(quitar?`${pj.nombre} ya no lleva «${t.nombre}».`:`${pj.nombre} lleva ahora «${t.nombre}»${anterior?` (sustituye a «${anterior.nombre}»)`:''}.`);await cargar();}
  catch(e){setError(mensajeError(e,'No se pudo cambiar el título.'));}finally{setOcupado('');}
 }
 const especiales=titulos.filter(t=>t.especial),normales=titulos.filter(t=>!t.especial);
 return <section className="space-y-4" aria-labelledby="coleccion-titulos">
  <div><h2 id="coleccion-titulos" className="text-xl font-semibold">Tus títulos</h2>
   <p className="text-neutral-400">Los títulos pertenecen a tu cuenta. Cada personaje puede llevar un título activo a la vez; los títulos especiales aplican su efecto a todos tus personajes desde que los desbloqueas.</p></div>
  {error&&<p role="alert" className="text-red-400">{error}</p>}{aviso&&<p role="status" className="text-green-300">{aviso}</p>}
  {cargado&&!titulos.length&&<p className="text-neutral-400">Todavía no has obtenido títulos. Completa logros para conseguirlos.</p>}
  <div className="yt-coleccion">
   {[...especiales,...normales].map(t=>{const efectos=efectosTitulo(t),portadores=personajes.filter(p=>p.titulo_activo===t.id);return <article key={t.id} className={`yt-placa ${t.especial?'is-especial':''}`}>
    <div className="yt-cabeza"><ImagenIconoLogro icono={t.icono||'corona'} imagen={t.imagen_url} nombre={t.nombre}/><div><h3>{t.nombre}</h3><span className="yt-etiqueta">{t.especial?<><Sparkles size={11} aria-hidden="true"/> Especial · siempre activo</>:<><Crown size={11} aria-hidden="true"/> Título</>}</span></div></div>
    {t.descripcion&&<p className="text-sm text-neutral-300 whitespace-pre-wrap">{t.descripcion}</p>}
    {t.efecto_narrativo&&<p className="yt-narrativo">{t.efecto_narrativo}</p>}
    {!!efectos.length&&<div className="yt-efectos" aria-label="Efectos">{efectos.map((e,i)=><span key={i}>{e}</span>)}</div>}
    {t.especial?<p className="yt-activo">Activo en todos tus personajes{personajes.length?`: ${personajes.map(p=>p.nombre).join(', ')}`:''}.</p>:<>
     <p className="yt-activo">{portadores.length?`Lo llevan: ${portadores.map(p=>p.nombre).join(', ')}`:'Ningún personaje lo lleva.'}</p>
     {!!personajes.length&&<div className="yt-personajes" role="group" aria-label={`Personajes que llevan ${t.nombre}`}>{personajes.map(p=><button key={p.id} type="button" className="yb-boton" aria-pressed={p.titulo_activo===t.id} disabled={!!ocupado} onClick={()=>void activar(p,t)} title={p.titulo_activo===t.id?'Quitar el título':p.titulo_activo?'Sustituye su título actual':'Activar en este personaje'}>{ocupado===`${p.id}:${t.id}`?'…':p.nombre}</button>)}</div>}
    </>}
   </article>;})}
  </div>
 </section>;
}

/** Efectos narrativos de títulos que el GM debe tener en cuenta durante una negociación. */
export function VentajasTitulos({usuario,contexto='negociación'}:{usuario:string|null|undefined;contexto?:string}){
 const [lista,setLista]=useState<{nombre:string;efecto:string;quien:string}[]>([]);
 useEffect(()=>{if(!usuario)return;let vivo=true;void (async()=>{try{
  const [t,p]=await Promise.all([cargarTitulosCuenta(usuario),supabase.from('personajes').select('nombre,titulo_activo').eq('user_id',usuario)]);
  const pjs=(p.data||[]) as {nombre:string;titulo_activo:string|null}[];
  const r=t.filter(x=>x.efecto_narrativo).map(x=>({nombre:x.nombre,efecto:x.efecto_narrativo,quien:x.especial?'todos sus personajes':pjs.filter(q=>q.titulo_activo===x.id).map(q=>q.nombre).join(', ')})).filter(x=>x.quien);
  if(vivo)setLista(r);
 }catch{/* los títulos son informativos: la negociación sigue sin ellos */}})();return()=>{vivo=false;};},[usuario]);
 if(!lista.length)return null;
 return <div className="yt-negociacion" aria-label={`Títulos relevantes para la ${contexto}`}><strong><Crown size={13} aria-hidden="true"/> Títulos con efecto narrativo</strong>{lista.map(x=><p key={x.nombre}><strong>{x.nombre}</strong> ({x.quien}): {x.efecto}</p>)}</div>;
}
