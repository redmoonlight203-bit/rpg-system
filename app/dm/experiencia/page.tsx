"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,GitBranch,Sparkles,TrendingUp,TriangleAlert} from 'lucide-react';
import {supabase} from '../../../lib/supabase';
import {experienciaParaNivel} from '../../../lib/progresion';
import '../../../components/arbol.css';
type Ser={id:string;nombre:string;nivel:number;exp_total:number;puntos_habilidad?:number;tipo:'jugador'|'creacion';malla?:boolean;maximo?:number;user_id?:string};
type Prevision={nombre:string;nivel_anterior:number;nivel:number;puntos_anadidos:number;avisos:{nivel:number;mensaje:string}[]};
export default function ExperienciaGM(){
 const [seres,setSeres]=useState<Ser[]>([]),[cuentas,setCuentas]=useState<Record<string,string>>({}),[cantidades,setCantidades]=useState<Record<string,string>>({}),[error,setError]=useState(''),[aviso,setAviso]=useState(''),[ocupado,setOcupado]=useState(false),[cargando,setCargando]=useState(true),[alerta,setAlerta]=useState<{ser:Ser;valor:number;prev:Prevision}|null>(null);
 const bloqueo=useRef(false),dialogo=useRef<HTMLDialogElement>(null);
 async function cargar(){try{
  const [p,f,u]=await Promise.all([supabase.from('personajes').select('id,nombre,user_id,nivel,exp_total,puntos_habilidad').eq('estado_vida','vivo').eq('estado_aprobacion','aprobado').order('nombre'),supabase.from('forja_maestra').select('id,nombre,nivel,exp_total,nivel_maximo,es_grupo').eq('tipo_creacion','personaje').eq('estado','aprobado').order('nombre'),supabase.from('perfiles').select('id,email')]);
  if(p.error||f.error||u.error)throw p.error||f.error||u.error;
  setCuentas(Object.fromEntries((u.data||[]).map(p=>[p.id,p.email])));
  setSeres([...(p.data||[]).map(x=>({...x,id:String(x.id),tipo:'jugador' as const})),...(f.data||[]).map(x=>({...x,tipo:'creacion' as const,malla:!!x.es_grupo,maximo:x.nivel_maximo||20}))]);
 }catch(e){setError((e as Error).message);}finally{setCargando(false);}}
 useEffect(()=>{void cargar();},[]);
 useEffect(()=>{if(alerta)dialogo.current?.showModal();else dialogo.current?.close();},[alerta]);
 async function otorgar(s:Ser,valor:number,confirmar=false){if(bloqueo.current)return;if(!Number.isInteger(valor)||valor<1||valor>1000000){setError('La experiencia debe ser un entero de 1 a 1 000 000.');return;}
  bloqueo.current=true;setOcupado(true);setError('');setAviso('');try{
   if(s.tipo==='jugador'&&!confirmar){const r=await supabase.rpc('arbol_prever_experiencia',{p_personaje:Number(s.id),p_cantidad:valor});if(r.error)throw r.error;const prev=r.data as Prevision;if(prev.avisos.length){setAlerta({ser:s,valor,prev});return;}}
   const r=await supabase.rpc(s.tipo==='jugador'?'arbol_dar_experiencia':'progresion_dar_experiencia_creacion',s.tipo==='jugador'?{p_personaje:Number(s.id),p_cantidad:valor,p_confirmar_sin_habilidades:confirmar}:{p_forja:s.id,p_cantidad:valor});if(r.error)throw r.error;
   setAlerta(null);setAviso(`${s.nombre} recibió ${valor} XP. Nivel ${r.data.nivel}${r.data.puntos_anadidos?` · +${r.data.puntos_anadidos} puntos para su árbol`:''}.`);setCantidades(p=>({...p,[s.tipo+':'+s.id]:''}));await cargar();
  }catch(e){setError((e as Error).message);setAlerta(null);}finally{bloqueo.current=false;setOcupado(false);}
 }
 return <main className="arbol-page"><Link className="arbol-back" href="/dm/combate"><ArrowLeft size={15}/>Volver al combate</Link><header className="arbol-heading"><div><span className="arbol-eyebrow">KUROI / PROGRESIÓN</span><h1>Experiencia y niveles</h1><p>Cada nivel ganado concede 3 puntos al árbol individual de ese personaje. Prepara sus habilidades y estadísticas antes de conceder experiencia.</p></div><Link className="xp-tree-link" href="/dm/arbol"><GitBranch size={18}/>Editar árboles</Link></header>
 {error&&<p role="alert" className="arbol-error">{error}</p>}{aviso&&<p role="status" className="arbol-notice">{aviso}</p>}
 {cargando?<p className="arbol-empty">Cargando progresión…</p>:<div className="xp-grid">{seres.map(s=>{const key=s.tipo+':'+s.id,tope=s.tipo==='creacion'?(s.maximo||100):100;return <article key={key} className="xp-card"><span className="arbol-eyebrow">{s.tipo==='jugador'?`PERSONAJE #${s.id}`:s.malla?'MONSTRUO / MALLA':'CREACIÓN'}</span><h2>{s.nombre}<small>Nv. {s.nivel}</small></h2>{s.user_id&&<p className="xp-owner">{cuentas[s.user_id]||'Jugador'}</p>}<p>{s.exp_total.toLocaleString('es-DO')} XP acumulados{s.nivel<Math.min(100,tope)?` · Próximo nivel: ${experienciaParaNivel(s.nivel+1).toLocaleString('es-DO')} XP`:' · Nivel máximo'}</p>{s.tipo==='jugador'&&<><p className="xp-points"><Sparkles size={16}/>{s.puntos_habilidad||0} puntos disponibles</p><Link className="xp-tree-link" href={`/dm/arbol?personaje=${s.id}`}><GitBranch size={16}/>Preparar árbol de {s.nombre}</Link></>}{s.malla&&<p>Al entrar al combate puedes fijar un nivel entre 1 y {tope}.</p>}
 <form className="xp-form" onSubmit={e=>{e.preventDefault();void otorgar(s,Number(cantidades[key]));}}><input required aria-label={`XP para ${s.nombre}`} type="number" min="1" max="1000000" step="1" placeholder="XP a otorgar" disabled={ocupado} value={cantidades[key]||''} onChange={e=>setCantidades(p=>({...p,[key]:e.target.value}))}/><button disabled={ocupado} className="arbol-primary"><TrendingUp size={16}/>Dar XP</button></form></article>;})}</div>}
 <dialog ref={dialogo} className="xp-dialog" onCancel={()=>setAlerta(null)} aria-labelledby="xp-aviso-titulo">{alerta&&<><TriangleAlert size={28}/><h2 id="xp-aviso-titulo">Faltan habilidades en el árbol de {alerta.ser.nombre}</h2><p>Esta experiencia lo llevará del nivel {alerta.prev.nivel_anterior} al {alerta.prev.nivel} y añadirá {alerta.prev.puntos_anadidos} puntos.</p><ul>{alerta.prev.avisos.map(a=><li key={a.nivel}>Nivel {a.nivel}: no hay habilidades nuevas preparadas para este personaje.</li>)}</ul><p>Los puntos se conservarán aunque decidas continuar. Puedes preparar sus ramas primero.</p><div><button autoFocus disabled={ocupado} onClick={()=>setAlerta(null)}>Volver sin conceder XP</button><Link className="xp-tree-link" href={`/dm/arbol?personaje=${alerta.ser.id}`}><GitBranch size={16}/>Preparar su árbol</Link><button className="arbol-primary" disabled={ocupado} onClick={()=>void otorgar(alerta.ser,alerta.valor,true)}>Conceder XP de todos modos</button></div></>}</dialog>
 </main>;
}
