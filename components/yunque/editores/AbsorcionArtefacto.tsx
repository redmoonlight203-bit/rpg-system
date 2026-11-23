'use client';
// Tramos de absorción: una barra d100 con un color por tramo y la lista editable debajo.
import {TRAMOS_BASE,validarTramos,type ConfiguracionArtefacto,type TramoAbsorcion} from '../../../lib/artefactos';

const COLORES=['#9d8ae0','#6cc3a0','#e3c58f','#d98a5a','#f2707d','#f4dfae'];
export default function AbsorcionArtefacto({a,set}:{a:ConfiguracionArtefacto;set:(p:Partial<ConfiguracionArtefacto>)=>void}){
 const tramos=a.tramos||TRAMOS_BASE;
 const fallo=validarTramos(tramos);
 const cambiar=(i:number,p:Partial<TramoAbsorcion>)=>set({tramos:tramos.map((t,j)=>j===i?{...t,...p}:t)});
 const num=(v:string,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(Number(v))||min));
 return <div className="ya-absorcion">
  <p className="yq-nota">Al devorar un arma, 1d100 elige el tramo: decide cuántas estadísticas, habilidades y pasivas pasan al artefacto.</p>
  <div className="ya-barra-d100" role="img" aria-label={tramos.map(t=>`${t.desde}–${t.hasta}: ${t.nombre}`).join('; ')}>
   {tramos.map((t,i)=><span key={i} style={{flexGrow:Math.max(1,t.hasta-t.desde+1),background:COLORES[i%COLORES.length]}} title={`${t.desde}–${t.hasta} · ${t.nombre}`}>{t.desde}</span>)}
  </div>
  <ol className="ya-tramos">{tramos.map((t,i)=><li key={i} style={{borderLeftColor:COLORES[i%COLORES.length]}}>
   <div className="ya-rango"><label>Desde<input type="number" min={1} max={100} value={t.desde} onChange={e=>cambiar(i,{desde:num(e.target.value,1,100)})}/></label><label>Hasta<input type="number" min={1} max={100} value={t.hasta} onChange={e=>cambiar(i,{hasta:num(e.target.value,1,100)})}/></label></div>
   <label className="yq-campo"><span>Nombre</span><input value={t.nombre} maxLength={120} onChange={e=>cambiar(i,{nombre:e.target.value})}/></label>
   <div className="ya-rango">
    <label>Estadísticas<select value={t.estadisticas==='todas'?'todas':'rango'} onChange={e=>cambiar(i,{estadisticas:e.target.value==='todas'?'todas':{min:1,max:1}})}><option value="rango">De … a …</option><option value="todas">Todas</option></select></label>
    {t.estadisticas!=='todas'&&<><label>Mín.<input type="number" min={0} max={50} value={t.estadisticas.min} onChange={e=>cambiar(i,{estadisticas:{...(t.estadisticas as {min:number;max:number}),min:num(e.target.value,0,50)}})}/></label>
    <label>Máx.<input type="number" min={0} max={50} value={t.estadisticas.max} onChange={e=>cambiar(i,{estadisticas:{...(t.estadisticas as {min:number;max:number}),max:num(e.target.value,0,50)}})}/></label></>}
    <label>Habilidades<select value={t.habilidades==='todas'?'todas':String(t.habilidades)} onChange={e=>cambiar(i,{habilidades:e.target.value==='todas'?'todas':Number(e.target.value)})}>{[0,1,2,3].map(n=><option key={n} value={n}>{n}</option>)}<option value="todas">Todas</option></select></label>
    <label className="ya-check"><input type="checkbox" checked={t.pasivas} onChange={e=>cambiar(i,{pasivas:e.target.checked})}/>Pasivas</label>
   </div>
  </li>)}</ol>
  {!a.tramos&&<p className="yq-nota">Son los tramos base; al cambiar uno, el artefacto guarda los suyos.</p>}
  {fallo&&<p className="yq-nota is-aviso" role="alert">{fallo}</p>}
 </div>;
}
