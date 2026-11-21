'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Crown} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {useTiempoReal} from '../lib/useTiempoReal';
import CofreBotin,{type ObjetoBotin} from './CofreBotin';

type Evento={id:string;tipo:string;clave:string;datos:Record<string,unknown>};
type Cofre={titulo:string;tirada:number|null;banda:number;objetos:ObjetoBotin[]};
type Titulo={nombre:string;imagen_url?:string|null;especial:boolean};
type EntradaBotin={tipo:string;cantidad:number;forja_id?:string;moneda_id?:string};

async function prepararCofre(e:Evento):Promise<Cofre>{
 const datos=e.datos as {personaje?:string;ids?:string[];botin?:EntradaBotin[]};
 const ids=(datos.ids||[]).filter(x=>typeof x==='string').slice(0,100),botin=datos.botin||[];
 const saqueo=e.clave.startsWith('saqueo:')?e.clave.slice(7):'';
 const [inv,mon,saq]=await Promise.all([
  ids.length?supabase.from('inventario_jugador').select('forja_id,nombre,imagen_url').in('id',ids):Promise.resolve({data:[],error:null}),
  botin.some(b=>b.moneda_id)?supabase.from('monedas').select('id,nombre').in('id',botin.map(b=>b.moneda_id).filter(Boolean) as string[]):Promise.resolve({data:[],error:null}),
  saqueo?supabase.from('saqueos_encuentro').select('nombre,tirada,banda').eq('id',saqueo).maybeSingle():Promise.resolve({data:null,error:null}),
 ]);
 const items=(inv.data||[]) as {forja_id:string|null;nombre:string;imagen_url:string|null}[],monedas=(mon.data||[]) as {id:string;nombre:string}[];
 const objetos:ObjetoBotin[]=botin.map((b,i)=>{
  if(b.tipo==='moneda'||b.moneda_id)return {clave:`m${i}`,nombre:monedas.find(m=>m.id===b.moneda_id)?.nombre||'Monedas',cantidad:b.cantidad,moneda:true};
  const it=items.find(x=>x.forja_id===b.forja_id);
  return {clave:`o${i}`,nombre:it?.nombre||'Objeto',cantidad:b.cantidad,imagen_url:it?.imagen_url};
 });
 const s=saq.data as {nombre:string;tirada:number;banda:number}|null;
 return {titulo:s?.nombre?`Botín de ${s.nombre}`:'Has recibido botín',tirada:s?.tirada??null,banda:s?.banda??2,objetos};
}

export default function ProgresoJugador(){
 const [titulo,setTitulo]=useState<string|null>(null),[aviso,setAviso]=useState<{id:string;texto:string;usuario:string}|null>(null),[cofre,setCofre]=useState<(Cofre&{id:string;usuario:string;personaje:string})|null>(null),[revelado,setRevelado]=useState<(Titulo&{id:string;usuario:string})|null>(null);
 const preparando=useRef('');
 const visto=(usuario:string,id:string)=>{try{localStorage.setItem('yugen:progreso:'+usuario,id);}catch{/* sin almacenamiento */}};
 async function cargar(){
  const {data:{user}}=await supabase.auth.getUser();if(!user)return;
  let activo='';try{activo=localStorage.getItem('personaje_activo_id')||'';}catch{/* sin almacenamiento */}
  const [pj,e]=await Promise.all([
   activo?supabase.from('personajes').select('titulo_activo').eq('id',activo).eq('user_id',user.id).maybeSingle():Promise.resolve({data:null,error:null}),
   supabase.from('eventos_dominio').select('id,tipo,clave,datos').eq('user_id',user.id).in('tipo',['nivel_alcanzado','objeto_adjudicado','titulo_obtenido']).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  ]);
  const idTitulo=(pj.data as {titulo_activo?:string|null}|null)?.titulo_activo;
  if(idTitulo){const t=await supabase.from('forja_maestra').select('nombre').eq('id',idTitulo).maybeSingle();setTitulo(t.data?.nombre||null);}else setTitulo(null);
  if(e.error||!e.data)return;
  const ev=e.data as Evento;let previo='';try{previo=localStorage.getItem('yugen:progreso:'+user.id)||'';}catch{/* sin almacenamiento */}
  if(previo===ev.id||preparando.current===ev.id)return;
  preparando.current=ev.id;
  if(ev.tipo==='objeto_adjudicado'){try{const c=await prepararCofre(ev);setCofre({...c,id:ev.id,usuario:user.id,personaje:String(ev.datos.personaje||'')});}catch{setAviso({id:ev.id,usuario:user.id,texto:'Has recibido botín. Revisa tu inventario o el baúl del alma.'});}}
  else if(ev.tipo==='titulo_obtenido')setRevelado({id:ev.id,usuario:user.id,nombre:String(ev.datos.titulo||'Nuevo título'),imagen_url:ev.datos.imagen_url as string|null,especial:!!ev.datos.especial});
  else setAviso({id:ev.id,usuario:user.id,texto:`Nivel ${ev.datos.nivel}: +${ev.datos.puntos_anadidos} puntos de árbol.`});
 }
 useEffect(()=>{const t=setTimeout(()=>void cargar(),0);return()=>clearTimeout(t);},[]);
 useTiempoReal(cargar);
 return <>
  {titulo&&<p className="px-4 py-2 font-semibold text-amber-200 inline-flex items-center gap-2"><Crown size={14} aria-hidden="true"/>{titulo}</p>}
  {aviso&&<aside className="fixed z-50 bottom-24 left-4 right-4 sm:left-auto sm:w-80 rounded-xl border border-amber-500 bg-neutral-950 p-4 shadow-xl" role="status"><p>{aviso.texto}</p><Link className="text-amber-300 underline" href="/ficha/logros">Ver progreso</Link><button className="ml-4" onClick={()=>{visto(aviso.usuario,aviso.id);setAviso(null);}}>Entendido</button></aside>}
  {cofre&&<CofreBotin titulo={cofre.titulo} subtitulo={cofre.personaje?`Para ${cofre.personaje}`:undefined} tirada={cofre.tirada} banda={cofre.banda} objetos={cofre.objetos} textoCerrar="Guardar en el inventario" onCerrar={()=>{visto(cofre.usuario,cofre.id);setCofre(null);}} acciones={<Link className="text-amber-300 underline text-sm" href="/ficha/inventario" onClick={()=>visto(cofre.usuario,cofre.id)}>Ver inventario</Link>}/>}
  {revelado&&<div className="yt-revelacion"><div className="yb-modal" role="dialog" aria-modal="true" aria-labelledby="yt-revelado" onKeyDown={e=>{if(e.key==='Escape'){visto(revelado.usuario,revelado.id);setRevelado(null);}}}><div className="yb-escena">
   <p className="yb-sub">Nuevo título desbloqueado</p>
   <span className="yt-corona">{revelado.imagen_url?<img src={revelado.imagen_url} alt=""/>:<Crown size={48} aria-hidden="true"/>}</span>{/* eslint-disable-line @next/next/no-img-element */}
   <h2 id="yt-revelado">{revelado.nombre}</h2>
   <p className="yb-sub">{revelado.especial?'Título especial: su efecto ya está activo en todos tus personajes.':'Pertenece a tu cuenta. Actívalo en el personaje que quieras.'}</p>
   <div className="yb-acciones"><Link className="yb-boton is-principal" href="/ficha/logros" onClick={()=>{visto(revelado.usuario,revelado.id);setRevelado(null);}} autoFocus>{revelado.especial?'Ver mis títulos':'Elegir personaje'}</Link><button type="button" className="yb-boton" onClick={()=>{visto(revelado.usuario,revelado.id);setRevelado(null);}}>Más tarde</button></div>
  </div></div></div>}
 </>;
}
