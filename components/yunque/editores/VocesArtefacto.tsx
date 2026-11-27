'use client';
// Voces de demonio: salvación al tomar el arma, duración y la lista de voces que el GM puede asignar.
import {Plus,Trash2} from 'lucide-react';
import {SelectorRegla} from '../../SelectorRegla';
import {NOMBRE_VOZ,validarVoces,vocesBase,type ConfigVoces,type VozDemonio} from '../../../lib/artefactos-voces';
import type {ConfiguracionArtefacto} from '../../../lib/artefactos';

export default function VocesArtefacto({a,set}:{a:ConfiguracionArtefacto;set:(p:Partial<ConfiguracionArtefacto>)=>void}){
 if(!a.voces)return <div className="ya-voces"><p className="yq-nota">El arma susurra a quien la toma. Si falla la salvación, el GM elige qué voz oye.</p>
  <button type="button" className="ya-despertar" onClick={()=>set({voces:vocesBase()})}>Dar voz al artefacto</button></div>;
 const v=a.voces,setV=(p:Partial<ConfigVoces>)=>set({voces:{...v,...p}});
 const setVoz=(i:number,p:Partial<VozDemonio>)=>setV({voces:v.voces.map((z,j)=>j===i?{...z,...p}:z)});
 const fallo=validarVoces(v);
 const num=(x:string,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(Number(x))||min));
 return <div className="ya-voces">
  <div className="ya-rango">
   <label>CD<input type="number" min={1} max={40} value={v.cd} onChange={e=>setV({cd:num(e.target.value,1,40)})}/></label>
   <SelectorRegla tipo="atributo" etiqueta="Salvación de" valor={v.atributo} onChange={atributo=>setV({atributo})}/>
   <label>Duración (turnos)<input type="number" min={1} max={20} value={v.duracion} onChange={e=>setV({duracion:num(e.target.value,1,20)})}/></label>
  </div>
  <ol className="ya-lista-voces">{v.voces.map((z,i)=><li key={z.id} className={`is-${z.tipo}`}>
   <div className="ya-rango"><label>Tipo<select value={z.tipo} onChange={e=>{const tipo=e.target.value as VozDemonio['tipo'];setVoz(i,{tipo,opciones:tipo==='pregunta'?z.opciones||['Sí','No']:undefined,habilidad:tipo==='negativa'?z.habilidad||'':undefined});}}>{(Object.keys(NOMBRE_VOZ) as VozDemonio['tipo'][]).map(t=><option key={t} value={t}>{NOMBRE_VOZ[t]}</option>)}</select></label>
    <button type="button" className="ya-quitar" aria-label="Quitar voz" onClick={()=>setV({voces:v.voces.filter((_,j)=>j!==i)})}><Trash2 size={14}/></button></div>
   <label className="yq-campo"><span>Lo que susurra</span><textarea rows={2} maxLength={300} value={z.texto} onChange={e=>setVoz(i,{texto:e.target.value})}/></label>
   {z.tipo==='pregunta'&&<label className="yq-campo"><span>Respuestas (una por línea)</span><textarea rows={3} value={(z.opciones||[]).join('\n')} onChange={e=>setVoz(i,{opciones:e.target.value.split('\n')})}/></label>}
   {z.tipo==='negativa'&&<label className="yq-campo"><span>Habilidad que niega (nombre o id)</span><input value={z.habilidad||''} onChange={e=>setVoz(i,{habilidad:e.target.value})}/></label>}
  </li>)}</ol>
  <div className="ya-acciones"><button type="button" onClick={()=>setV({voces:[...v.voces,{id:crypto.randomUUID().slice(0,8),tipo:'comentario',texto:'…'}]})}><Plus size={15}/>Añadir voz</button>
   <button type="button" className="is-peligro" onClick={()=>set({voces:undefined})}><Trash2 size={15}/>Silenciar el artefacto</button></div>
  {fallo&&<p className="yq-nota is-aviso" role="alert">{fallo}</p>}
 </div>;
}
