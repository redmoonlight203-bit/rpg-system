'use client';
// Tabla d100 de formas del artefacto (100 filas, búsqueda) y entrega a un portador: el GM elige personaje y el d100
// se revela con una animación; el mismo portador siempre recupera su forma (RPC artefacto_portar).
import {useEffect,useMemo,useState} from 'react';
import {Search} from 'lucide-react';
import {formaDe,formasVacias,type ConfiguracionArtefacto} from '../../../lib/artefactos';
import {supabase} from '../../../lib/supabase';
import {mensajeError} from '../../../lib/errores';

export default function FormasArtefacto({a,set,artefactoId}:{a:ConfiguracionArtefacto;set:(p:Partial<ConfiguracionArtefacto>)=>void;artefactoId?:string}){
 const formas=a.formas||formasVacias();
 const [busca,setBusca]=useState('');
 const filas=useMemo(()=>formas.map((f,i)=>({i,f})).filter(({i,f})=>!busca.trim()||String(i+1)===busca.trim()||f.toLowerCase().includes(busca.trim().toLowerCase())),[formas,busca]);
 const llenas=formas.filter(f=>f.trim()).length;
 return <div className="ya-formas">
  <p className="yq-nota">Cada portador tira 1d100 la primera vez que lo empuña y el artefacto toma esa forma. {llenas}/100 formas escritas.</p>
  <label className="yq-busqueda ya-buscar"><Search size={15} aria-hidden="true"/><input type="search" aria-label="Buscar forma" placeholder="Buscar por número o texto…" value={busca} onChange={e=>setBusca(e.target.value)}/></label>
  <ol className="ya-tabla" aria-label="Tabla de formas d100">{filas.map(({i,f})=><li key={i}>
   <span className="ya-tirada">{String(i+1).padStart(2,'0')}</span>
   <input aria-label={`Forma ${i+1}`} value={f} maxLength={120} placeholder={`Forma ${i+1}`} onChange={e=>{const n=[...formas];n[i]=e.target.value;set({formas:n});}}/>
  </li>)}</ol>
  {!filas.length&&<p className="yq-nota">Ninguna forma coincide.</p>}
  <Portadores a={a} artefactoId={artefactoId}/>
 </div>;
}

type Portador={personaje_id:number;forma_tirada:number;nivel:number};
function Portadores({a,artefactoId}:{a:ConfiguracionArtefacto;artefactoId?:string}){
 const [personajes,setPersonajes]=useState<{id:number;nombre:string}[]>([]);
 const [portadores,setPortadores]=useState<Portador[]>([]);
 const [elegido,setElegido]=useState('');
 const [revelando,setRevelando]=useState<{nombre:string;tirada:number;nueva:boolean}|null>(null);
 const [cifra,setCifra]=useState(0);
 const [error,setError]=useState('');
 useEffect(()=>{if(!artefactoId)return;let vivo=true;void (async()=>{
  const [p,q]=await Promise.all([supabase.from('personajes').select('id,nombre').order('nombre'),supabase.from('portadores_artefacto').select('personaje_id,forma_tirada,nivel').eq('artefacto_id',artefactoId)]);
  if(!vivo)return;setPersonajes(p.data||[]);setPortadores(q.data||[]);if(p.error||q.error)setError(mensajeError(p.error||q.error,'No se pudieron leer los portadores.'));
 })();return()=>{vivo=false;};},[artefactoId]);
 // El dado gira unos instantes antes de mostrar la tirada real.
 useEffect(()=>{if(!revelando)return;let n=0;const t=setInterval(()=>{n++;setCifra(n<14?1+Math.floor(Math.random()*100):revelando.tirada);if(n>=14)clearInterval(t);},60);return()=>clearInterval(t);},[revelando]);
 if(!artefactoId)return <p className="yq-nota">Guarda el artefacto para entregarlo a un portador.</p>;
 async function empunar(){
  setError('');const pj=personajes.find(p=>String(p.id)===elegido);if(!pj)return;
  const r=await supabase.rpc('artefacto_portar',{p_artefacto:artefactoId,p_personaje:pj.id});
  if(r.error){setError(mensajeError(r.error,'No se pudo entregar.'));return;}
  setRevelando({nombre:pj.nombre,tirada:r.data.forma_tirada,nueva:r.data.nueva});
  setPortadores(v=>v.some(x=>x.personaje_id===pj.id)?v:[...v,{personaje_id:pj.id,forma_tirada:r.data.forma_tirada,nivel:r.data.nivel}]);
 }
 const listo=revelando&&cifra===revelando.tirada;
 return <section className="ya-portadores" aria-label="Portadores">
  <h4 className="yq-ficha-titulo">Portadores</h4>
  <div className="ya-empunar"><select aria-label="Personaje que empuña" value={elegido} onChange={e=>setElegido(e.target.value)}><option value="">Elegir portador…</option>{personajes.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
   <button type="button" className="ya-despertar" disabled={!elegido} onClick={()=>void empunar()}>Empuñar · d100</button></div>
  {revelando&&<div className={`ya-revelado${listo?' is-listo':''}`} role="status" aria-live="polite">
   <span className="ya-d100" aria-hidden="true">{cifra}</span>
   <p>{listo?<><strong>{revelando.nombre}</strong> {revelando.nueva?'despierta':'recupera'} la forma <strong>{formaDe(a,revelando.tirada)}</strong> ({revelando.tirada}).</>:'El artefacto busca su forma…'}</p>
  </div>}
  {portadores.length>0&&<ul className="ya-lista-portadores">{portadores.map(p=><li key={p.personaje_id}><strong>{personajes.find(x=>x.id===p.personaje_id)?.nombre||'#'+p.personaje_id}</strong><span>{formaDe(a,p.forma_tirada)} · d100 {p.forma_tirada} · nivel {p.nivel}</span></li>)}</ul>}
  {error&&<p className="yq-nota is-aviso" role="alert">{error}</p>}
 </section>;
}
