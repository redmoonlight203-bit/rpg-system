"use client";
import{useEffect,useState}from'react';
import{supabase}from'../lib/supabase';
import'./alerta-turno.css';
type Estado={nombre:string;vida:number;max_vida:number;es_turno:boolean;fase:string;encuentro:string};
export default function AlertaTurnoJugador(){
 const[estado,setEstado]=useState<Estado|null>(null);
 useEffect(()=>{
  let vivo=true,consultando=false;
  async function consultar(){if(consultando||document.hidden)return;consultando=true;
   try{const id=localStorage.getItem('personaje_activo_id');if(!id){if(vivo)setEstado(null);return;}
    const r=await supabase.rpc('combate_estado_jugador',{p_personaje:id});
    if(vivo)setEstado(!r.error?r.data:null);
   }catch{if(vivo)setEstado(null);}finally{consultando=false;}
  }
  void consultar();const t=setInterval(()=>void consultar(),3000);
  const visible=()=>void consultar();document.addEventListener('visibilitychange',visible);
  return()=>{vivo=false;clearInterval(t);document.removeEventListener('visibilitychange',visible);};
 },[]);
 if(!estado?.es_turno||estado.fase!=='en_curso')return null;
 const critico=estado.vida>0&&estado.vida/Math.max(1,estado.max_vida)<=.25;
 return <><div className={critico?'player-turn-vignette':''} aria-hidden="true"/><aside className={`player-turn-notice ${critico?'critical':''}`} role="status" aria-live="polite"><strong>Es tu turno · {estado.nombre}</strong><span>{critico?'Vida crítica · ':''}{estado.vida} / {estado.max_vida} vida · {estado.encuentro}</span></aside></>;
}
