'use client';
// Artefacto con nivel: los niveles se editan como una senda (gema por nivel); la condición de subida es un contador
// (p. ej. armas devoradas) o un evento narrativo. Las demás pestañas (formas, absorción, voces, espejo) se añaden aquí.
import {useState} from 'react';
import {Plus,Trash2} from 'lucide-react';
import {artefactoVacio,nivelVacio,statsDeNivel,validarArtefacto,type ConfiguracionArtefacto,type NivelArtefacto} from '../../../lib/artefactos';
import './artefacto.css';

type Props={valor:ConfiguracionArtefacto|null|undefined;onChange:(a:ConfiguracionArtefacto|null)=>void;atributos:{clave:string;etiqueta:string}[]};
export type PestanaArtefacto={id:string;nombre:string;contenido:(a:ConfiguracionArtefacto,set:(p:Partial<ConfiguracionArtefacto>)=>void)=>React.ReactNode};

function EditorNivel({n,atributos,onChange}:{n:NivelArtefacto;atributos:Props['atributos'];onChange:(n:NivelArtefacto)=>void}){
 const c=n.condicion_subida;
 const stats=Object.entries(n.cambios.stats||{});
 const setStats=(s:Record<string,number>)=>onChange({...n,cambios:{...n.cambios,stats:Object.keys(s).length?s:undefined}});
 const libres=atributos.filter(a=>!(a.clave in (n.cambios.stats||{})));
 return <div className="ya-nivel-cuerpo">
  <label className="yq-campo"><span>Nombre del nivel</span><input value={n.nombre} maxLength={120} onChange={e=>onChange({...n,nombre:e.target.value})}/></label>
  {c&&<div className="ya-condicion">
   <label className="yq-campo"><span>Sube cuando</span><select value={c.tipo} onChange={e=>onChange({...n,condicion_subida:e.target.value==='evento'?{tipo:'evento',evento:'Un juramento cumplido'}:{tipo:'contador',contador:'armas devoradas',meta:3}})}><option value="contador">Un contador llega a una meta</option><option value="evento">Ocurre un evento</option></select></label>
   {c.tipo==='contador'?<>
    <label className="yq-campo"><span>Contador</span><input value={c.contador} maxLength={60} onChange={e=>onChange({...n,condicion_subida:{...c,contador:e.target.value}})}/></label>
    <label className="yq-campo ya-corto"><span>Meta</span><input type="number" min={1} value={c.meta} onChange={e=>onChange({...n,condicion_subida:{...c,meta:Math.max(1,Math.round(Number(e.target.value))||1)}})}/></label>
   </>:<label className="yq-campo"><span>Evento</span><input value={c.evento} maxLength={120} onChange={e=>onChange({...n,condicion_subida:{...c,evento:e.target.value}})}/></label>}
  </div>}
  <div className="ya-stats">
   {stats.map(([k,v])=><label key={k} className="ya-stat"><span>{atributos.find(a=>a.clave===k)?.etiqueta||k}</span>
    <input type="number" value={v} onChange={e=>setStats({...n.cambios.stats,[k]:Math.round(Number(e.target.value))||0})}/>
    <button type="button" aria-label={`Quitar ${k}`} onClick={()=>{const s={...n.cambios.stats};delete s[k];setStats(s);}}><Trash2 size={13}/></button></label>)}
   {libres.length>0&&<select aria-label="Añadir estadística al nivel" value="" onChange={e=>{if(e.target.value)setStats({...n.cambios.stats,[e.target.value]:1});}}><option value="">+ Estadística</option>{libres.map(a=><option key={a.clave} value={a.clave}>{a.etiqueta}</option>)}</select>}
  </div>
  <label className="yq-campo"><span>Qué cambia (para la mesa)</span><textarea rows={2} maxLength={2000} value={n.cambios.descripcion||''} onChange={e=>onChange({...n,cambios:{...n.cambios,descripcion:e.target.value||undefined}})}/></label>
 </div>;
}

export default function EditorArtefacto({valor,onChange,atributos,pestanas=[]}:Props&{pestanas?:PestanaArtefacto[]}){
 const [pestana,setPestana]=useState('niveles');
 const [abierto,setAbierto]=useState(1);
 if(!valor)return <section className="yq-ficha-seccion ya-artefacto" id="yq-ficha-artefacto">
  <h3 className="yq-ficha-titulo">Artefacto con nivel</h3>
  <p className="yq-nota">Un objeto que crece con quien lo porta: niveles, forma propia por portador, absorción, voces.</p>
  <button type="button" className="ya-despertar" onClick={()=>onChange(artefactoVacio())}>Despertar como artefacto</button>
 </section>;
 const a=valor,set=(p:Partial<ConfiguracionArtefacto>)=>onChange({...a,...p});
 const fallo=validarArtefacto(a);
 const setNivel=(i:number,n:NivelArtefacto)=>set({niveles:a.niveles.map((x,j)=>j===i?n:x)});
 const todas:PestanaArtefacto[]=[{id:'niveles',nombre:'Niveles',contenido:()=>null},...pestanas];
 return <section className="yq-ficha-seccion ya-artefacto" id="yq-ficha-artefacto">
  <header className="ya-cab"><h3 className="yq-ficha-titulo">Artefacto con nivel</h3>
   <button type="button" className="ya-quitar" onClick={()=>onChange(null)}>Dormir el artefacto</button></header>
  <div className="ya-pestanas" role="tablist">{todas.map(p=><button key={p.id} type="button" role="tab" aria-selected={pestana===p.id} onClick={()=>setPestana(p.id)}>{p.nombre}</button>)}</div>
  {pestana==='niveles'?<>
   <ol className="ya-senda">{a.niveles.map((n,i)=><li key={n.nivel} className={abierto===n.nivel?'is-abierto':undefined}>
    <button type="button" className="ya-gema" aria-expanded={abierto===n.nivel} onClick={()=>setAbierto(abierto===n.nivel?0:n.nivel)}>
     <span className="ya-gema-num"><b>{n.nivel}</b></span>
     <span className="ya-gema-texto"><strong>{n.nombre||'Sin nombre'}</strong>
      <small>{n.condicion_subida?n.condicion_subida.tipo==='contador'?`${n.condicion_subida.meta} ${n.condicion_subida.contador}`:n.condicion_subida.evento:'Al empuñarlo'}{Object.keys(statsDeNivel(a,n.nivel)).length?' · '+Object.entries(statsDeNivel(a,n.nivel)).map(([k,v])=>`${k} ${v>0?'+':''}${v}`).join(', '):''}</small></span>
    </button>
    {abierto===n.nivel&&<EditorNivel n={n} atributos={atributos} onChange={x=>setNivel(i,x)}/>}
   </li>)}</ol>
   <div className="ya-acciones">
    <button type="button" onClick={()=>{set({niveles:[...a.niveles,nivelVacio(a.niveles.length+1)]});setAbierto(a.niveles.length+1);}} disabled={a.niveles.length>=30}><Plus size={15}/>Añadir nivel</button>
    {a.niveles.length>1&&<button type="button" className="is-peligro" onClick={()=>set({niveles:a.niveles.slice(0,-1)})}><Trash2 size={15}/>Quitar el nivel {a.niveles.length}</button>}
   </div>
  </>:todas.find(p=>p.id===pestana)?.contenido(a,set)}
  {fallo&&<p className="yq-nota is-aviso" role="alert">{fallo}</p>}
 </section>;
}
