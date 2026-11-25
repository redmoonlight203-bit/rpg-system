'use client';
// Golpe de prueba: el elemento golpea a un muñeco con 4 de ARM que está en contacto con otro.
import {useState,type CSSProperties} from 'react';
import {Zap} from 'lucide-react';
import {simularGolpe,type GolpePrueba as Resultado} from '../../lib/estados-biblioteca';
import type {DefinicionElemento} from '../../lib/elementos';

export default function GolpePrueba({def,color}:{def:DefinicionElemento;color:string}){
 const [r,setR]=useState<Resultado|null>(null),[n,setN]=useState(0);
 const golpear=()=>{setR(simularGolpe(def));setN(x=>x+1);};
 return <section className="ge-muneco" style={{'--aura':color} as CSSProperties} aria-label="Golpe de prueba">
  <header><h3>Golpe de prueba</h3><button type="button" className="ge-lanzar" onClick={golpear}><Zap size={15} aria-hidden="true"/>{r?'Otra vez':'Golpear'}</button></header>
  <div className="ge-arena ge-arena-doble">
   {[0,1].map(i=><div key={`${n}-${i}`} className={`ge-dummy${r&&(i===0||r.cadena)?' is-golpe is-afectado':''}`}>
    <svg viewBox="0 0 80 120" width={i?60:84} height={i?90:126} aria-hidden="true">
     <rect x="37" y="70" width="6" height="44" rx="2" className="ge-madera"/><rect x="22" y="110" width="36" height="6" rx="3" className="ge-madera"/>
     <rect x="14" y="44" width="52" height="8" rx="4" className="ge-madera"/><ellipse cx="40" cy="62" rx="16" ry="20" className="ge-saco"/><circle cx="40" cy="28" r="14" className="ge-saco"/>
     <path d="M33 26l4 4M37 26l-4 4M43 26l4 4M47 26l-4 4" className="ge-ojos"/><path d="M30 62h20M40 52v20" className="ge-diana"/>
    </svg>
    {r&&n>0&&(i===0?<span className="ge-flota is-dano" aria-hidden="true">−{r.total}</span>:r.cadena?<span className="ge-flota is-dano" aria-hidden="true">−{r.cadena}</span>:null)}
    {r&&i===0&&<span className="ge-estallido" aria-hidden="true"/>}
   </div>)}
   {r?.cadena&&<span key={n} className="ge-arco" aria-hidden="true"/>}
  </div>
  {!r&&<p className="ge-pista">Arma 1d8 + los dados del elemento contra un muñeco con 4 de ARM, junto a otro muñeco.</p>}
  {r&&<ul className="ge-desglose" aria-live="polite">
   <li>Arma 1d8: <b>{r.arma}</b>{r.extra.length>0&&<> · elemento: <b>{r.extra.join(' + ')}</b></>}</li>
   <li>ARM {r.armadura}{r.ignorada?<> − ignora <b>{r.ignorada}</b></>:''} → <b className="is-dano">{r.total} de daño</b></li>
   {r.estados.map((e,i)=><li key={i} className={e.aplicado?'is-pierde':''}>{e.nombre}: {e.salvacion!==undefined?`salvación ${e.salvacion} vs CD ${e.cd} → `:''}<b>{e.aplicado?'¡aplicado!':'resiste'}</b></li>)}
   {r.cadena&&<li>Chispa al muñeco vecino: <b className="is-dano">{r.cadena}</b></li>}
   {r.reacciones.map((x,i)=><li key={'r'+i} className="ge-nota">{x}</li>)}
  </ul>}
 </section>;
}
