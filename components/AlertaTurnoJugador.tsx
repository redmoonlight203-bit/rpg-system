"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useSincronizacionCombate} from '../lib/useSincronizacionCombate';
import {consultarCombateJugador} from '../lib/jugador';
import './alerta-turno.css';
export default function AlertaTurnoJugador(){
 const[nombres,setNombres]=useState(''),[aviso,setAviso]=useState(false),anterior=useRef('');
 const pathname=usePathname(),activo=pathname!=='/ficha/combate';
 const cierre=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const vivo=useRef(true);
 useEffect(()=>{vivo.current=true;return()=>{vivo.current=false;clearTimeout(cierre.current);};},[]);
 useSincronizacionCombate(async()=>{
  const data=await consultarCombateJugador();if(!vivo.current)return;
  const turnos=data.encuentros.filter((e:{fase:string})=>e.fase==='en_curso').flatMap((e:{id:string;personajes:{id:string;nombre:string;es_turno:boolean}[]})=>e.personajes.filter(p=>p.es_turno).map(p=>({clave:`${e.id}:${p.id}`,nombre:p.nombre})));
  const clave=turnos.map((p:{clave:string})=>p.clave).join(',');
  setNombres(turnos.map((p:{nombre:string})=>p.nombre).join(', '));
  if(clave&&clave!==anterior.current){setAviso(true);clearTimeout(cierre.current);cierre.current=setTimeout(()=>setAviso(false),2400);}anterior.current=clave;
 },undefined,activo);
 if(!activo||!nombres)return null;
 return <>{aviso&&<div className="player-turn-flash" role="status">TU TURNO<span>{nombres}</span></div>}<aside className="player-turn-notice" role="status"><strong>Tu turno · {nombres}</strong><Link href="/ficha/combate" style={{pointerEvents:'auto'}}>Entrar al combate →</Link></aside></>;
}
