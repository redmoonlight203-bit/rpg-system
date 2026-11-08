'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '../lib/supabase';
import {useTiempoReal} from '../lib/useTiempoReal';
export default function ProgresoJugador(){
 const [titulo,setTitulo]=useState<{titulo:string;color:string}|null>(null),[aviso,setAviso]=useState<{id:string;texto:string;usuario:string}|null>(null);
 async function cargar(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const [t,e]=await Promise.all([supabase.from('progreso_logros').select('titulo,color').eq('user_id',user.id).eq('mostrado',true).eq('desbloqueado',true).limit(1).maybeSingle(),supabase.from('eventos_dominio').select('id,tipo,datos').eq('user_id',user.id).in('tipo',['nivel_alcanzado','objeto_adjudicado']).order('created_at',{ascending:false}).limit(1).maybeSingle()]);if(!t.error)setTitulo(t.data);if(!e.error&&e.data){let visto='';try{visto=localStorage.getItem('yugen:progreso:'+user.id)||'';}catch{}if(visto!==e.data.id)setAviso({id:e.data.id,usuario:user.id,texto:e.data.tipo==='nivel_alcanzado'?`Nivel ${e.data.datos.nivel}: +${e.data.datos.puntos_anadidos} puntos de árbol.`:'Has recibido botín. Revisa tu inventario o el baúl del alma.'});else setAviso(null);}}
 useEffect(()=>{const t=setTimeout(()=>void cargar(),0);return()=>clearTimeout(t);},[]);useTiempoReal(cargar);
 return <>{titulo&&<p className="px-4 py-2 font-semibold" style={{color:titulo.color}}>◆ {titulo.titulo}</p>}{aviso&&<aside className="fixed z-50 bottom-24 left-4 right-4 sm:left-auto sm:w-80 rounded-xl border border-amber-500 bg-neutral-950 p-4 shadow-xl" role="status"><p>{aviso.texto}</p><Link className="text-amber-300 underline" href="/ficha/logros">Ver progreso</Link><button className="ml-4" onClick={()=>{try{localStorage.setItem('yugen:progreso:'+aviso.usuario,aviso.id);}catch{}setAviso(null);}}>Entendido</button></aside>}</>;
}
