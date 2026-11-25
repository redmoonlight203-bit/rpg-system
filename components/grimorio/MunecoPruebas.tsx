'use client';
// Muñeco de pruebas: lanza el estado sobre un muñeco de madera y lo reproduce turno a turno con números
// flotantes, sacudidas y desplazamientos. El padre lo monta con key=definición: si el estado cambia, la prueba se reinicia.
// Simulación aproximada (lib/estados-biblioteca · simularEstado).
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Play,RotateCcw} from 'lucide-react';
import {simularEstado,type ResultadoPrueba,type EventoPrueba} from '../../lib/estados-biblioteca';
import type {DefinicionEstado} from '../../lib/estados';

const ICONO_EVENTO:Record<EventoPrueba['tipo'],string>={dano:'✦',cura:'✚',pierde:'☾',mueve:'➜',control:'⛓',percepcion:'◎',salvacion:'⚄',fin:'✧',actua:'⚔'};
const reducido=()=>typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function MunecoPruebas({def,color}:{def:DefinicionEstado;color:string}){
 const [res,setRes]=useState<ResultadoPrueba|null>(null),[paso,setPaso]=useState(0),[tirada,setTirada]=useState(0);
 const timer=useRef<ReturnType<typeof setInterval>|undefined>(undefined);
 useEffect(()=>()=>clearInterval(timer.current),[]);
 function lanzar(){
  clearInterval(timer.current);
  const r=simularEstado(def,{vida:30});setRes(r);setTirada(t=>t+1);
  if(reducido()){setPaso(r.turnos.length);return;}
  setPaso(0);let i=0;
  timer.current=setInterval(()=>{i++;setPaso(i);if(i>=r.turnos.length)clearInterval(timer.current);},950);
 }
 const actual=res&&paso>0?res.turnos[Math.min(paso,res.turnos.length)-1]:null;
 const vida=actual?actual.vida:30,pct=Math.round(vida/30*100);
 const ultimo=actual?.eventos||[];
 const sacude=ultimo.some(e=>e.tipo==='dano'),duerme=ultimo.some(e=>e.tipo==='pierde'),mueve=ultimo.find(e=>e.tipo==='mueve'),cae=vida<=0;
 const flotantes=ultimo.filter(e=>e.tipo==='dano'||e.tipo==='cura');
 return <section className="ge-muneco" style={{'--aura':color} as CSSProperties} aria-label="Muñeco de pruebas">
  <header><h3>Muñeco de pruebas</h3><button type="button" className="ge-lanzar" onClick={lanzar}>{res?<><RotateCcw size={15} aria-hidden="true"/>Otra vez</>:<><Play size={15} aria-hidden="true"/>Lanzar estado</>}</button></header>
  <div className="ge-arena">
   <div key={`${tirada}-${paso}`} className={`ge-dummy${sacude?' is-golpe':''}${duerme?' is-dormido':''}${cae?' is-caido':''}${res&&paso>0&&actual?.activo!==false&&!cae?' is-afectado':''}`} style={mueve?{'--desliz':`${Math.min(mueve.valor||1,4)*10}px`} as CSSProperties:undefined}>
    <svg viewBox="0 0 80 120" width="88" height="132" aria-hidden="true">
     <rect x="37" y="70" width="6" height="44" rx="2" className="ge-madera"/><rect x="22" y="110" width="36" height="6" rx="3" className="ge-madera"/>
     <rect x="14" y="44" width="52" height="8" rx="4" className="ge-madera"/>
     <ellipse cx="40" cy="62" rx="16" ry="20" className="ge-saco"/>
     <circle cx="40" cy="28" r="14" className="ge-saco"/>
     <path d="M33 26l4 4M37 26l-4 4M43 26l4 4M47 26l-4 4" className="ge-ojos"/>
     <path d="M30 62h20M40 52v20" className="ge-diana"/>
    </svg>
    {duerme&&<span className="ge-zzz" aria-hidden="true">z<small>z</small>z</span>}
    {flotantes.map((e,i)=><span key={i} className={`ge-flota is-${e.tipo}`} style={{'--i':i} as CSSProperties} aria-hidden="true">{e.tipo==='dano'?'−':'+'}{e.valor}</span>)}
   </div>
   <div className="ge-vida" role="meter" aria-label="Vida del muñeco" aria-valuemin={0} aria-valuemax={30} aria-valuenow={vida}><span style={{width:`${pct}%`}}/><b>{vida} / 30</b></div>
  </div>
  {!res&&<p className="ge-pista">Pulsa «Lanzar estado» para verlo en acción durante unos turnos. Los dados son reales; el resultado cambia cada vez.</p>}
  {res&&<ol className="ge-cronica" aria-live="polite">
   {res.turnos.slice(0,paso).map(t=><li key={t.n} className="ge-turno"><span className="ge-turno-n">T{t.n}</span><ul>{t.eventos.map((e,i)=><li key={i} className={`is-${e.tipo}`}><span aria-hidden="true">{ICONO_EVENTO[e.tipo]}</span>{e.texto}</li>)}</ul></li>)}
   {paso>=res.turnos.length&&!res.turnos.length&&<li className="ge-turno"><span className="ge-turno-n">—</span><ul><li>El estado no hace nada por turno.</li></ul></li>}
  </ol>}
  {res&&!!res.pasivos.length&&paso>=res.turnos.length&&<div className="ge-pasivos"><h4>Mientras dura</h4><ul>{res.pasivos.map((p,i)=><li key={i}>{p}</li>)}</ul></div>}
 </section>;
}
