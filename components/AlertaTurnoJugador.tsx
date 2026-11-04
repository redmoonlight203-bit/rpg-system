"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {consultarCombateJugador} from '../lib/jugador';
import './alerta-turno.css';
export default function AlertaTurnoJugador(){
 const[nombres,setNombres]=useState(''),[aviso,setAviso]=useState(false),anterior=useRef('');
 useEffect(()=>{let vivo=true,leyendo=false;let cierre:ReturnType<typeof setTimeout>;async function consultar(){if(leyendo||document.hidden)return;leyendo=true;try{const data=await consultarCombateJugador();if(!vivo)return;const turnos=data.encuentros.filter((e:{fase:string})=>e.fase==='en_curso').flatMap((e:{id:string;personajes:{id:string;nombre:string;es_turno:boolean}[]})=>e.personajes.filter(p=>p.es_turno).map(p=>({clave:`${e.id}:${p.id}`,nombre:p.nombre})));const clave=turnos.map((p:{clave:string})=>p.clave).join(',');setNombres(turnos.map((p:{nombre:string})=>p.nombre).join(', '));if(clave&&clave!==anterior.current){setAviso(true);clearTimeout(cierre);cierre=setTimeout(()=>setAviso(false),2400);}anterior.current=clave;}catch{/* Se reintenta al reconectar. */}finally{leyendo=false;}}void consultar();const t=setInterval(()=>void consultar(),3000);document.addEventListener('visibilitychange',consultar);return()=>{vivo=false;clearInterval(t);clearTimeout(cierre);document.removeEventListener('visibilitychange',consultar);};},[]);
 if(!nombres)return null;
 return <>{aviso&&<div className="player-turn-flash" role="status">TU TURNO<span>{nombres}</span></div>}<aside className="player-turn-notice" role="status"><strong>Tu turno · {nombres}</strong><Link href="/ficha/combate" style={{pointerEvents:'auto'}}>Entrar al combate →</Link></aside></>;
}
