'use client';
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {Plus,RefreshCw,Trash2,UserMinus,UserPlus} from 'lucide-react';
import {supabase} from '../../../lib/supabase';
import {mensajeError} from '../../../lib/errores';
import {useTiempoReal} from '../../../lib/useTiempoReal';
import {Cabecera} from '../../../components/layout/Cabecera';

type Clan={id:string;nombre:string;descripcion:string;color:string};
type Miembro={clan_id:string;personaje_id:number};
type Personaje={id:number;nombre:string;raza:string|null;estado_vida:string|null;es_companero:boolean|null};
type Heredable={id:string;nombre:string;tipo_creacion:string;requisitos_uso:{razas?:string[];clanes?:string[];nivel_minimo?:number}};
type Categoria={clave:string;nombre:string};
const input='block w-full min-h-11 bg-well border border-neutral-700 rounded-xs px-3 py-2 my-1 text-text focus:border-gold focus:outline-none';
const boton='inline-flex min-h-11 items-center justify-center gap-2 rounded-xs border border-gold px-4 py-2 text-sm font-semibold text-gold-soft hover:bg-ember disabled:opacity-45';
const principal='inline-flex min-h-11 items-center justify-center gap-2 rounded-xs border border-gold bg-gold px-4 py-2 text-sm font-semibold text-ink disabled:opacity-45';

export default function Clanes(){
 const [clanes,setClanes]=useState<Clan[]>([]),[miembros,setMiembros]=useState<Miembro[]>([]),[personajes,setPersonajes]=useState<Personaje[]>([]),[heredables,setHeredables]=useState<Heredable[]>([]),[categorias,setCategorias]=useState<Categoria[]>([]);
 const [elegido,setElegido]=useState(''),[form,setForm]=useState<Omit<Clan,'id'>&{id?:string}>({nombre:'',descripcion:'',color:'#c0263a'}),[nuevo,setNuevo]=useState(''),[error,setError]=useState(''),[aviso,setAviso]=useState(''),[ocupado,setOcupado]=useState(false);
 const cargar=useCallback(async()=>{try{
  const rs=await Promise.all([supabase.from('clanes').select('id,nombre,descripcion,color').order('nombre'),supabase.from('clan_miembros').select('clan_id,personaje_id'),
   supabase.from('personajes').select('id,nombre,raza,estado_vida,es_companero').eq('estado_aprobacion','aprobado').order('nombre'),
   supabase.from('forja_maestra').select('id,nombre,tipo_creacion,requisitos_uso').eq('estado','aprobado').eq('requisitos_uso->>herencia','true').order('nombre'),
   supabase.from('categorias_forja').select('clave,nombre')]);
  for(const r of rs)if(r.error)throw r.error;
  setClanes(rs[0].data||[]);setMiembros(rs[1].data||[]);setPersonajes(rs[2].data||[]);setHeredables((rs[3].data||[]) as Heredable[]);setCategorias(rs[4].data||[]);
 }catch(e){setError(mensajeError(e,'No se pudieron cargar los clanes.'));}},[]);
 useEffect(()=>{const t=setTimeout(()=>void cargar(),0);return()=>clearTimeout(t);},[cargar]);
 useTiempoReal(cargar);
 const clan=clanes.find(c=>c.id===elegido);
 const suyos=useMemo(()=>new Set(miembros.filter(m=>m.clan_id===elegido).map(m=>m.personaje_id)),[miembros,elegido]);
 const nombreRaza=(k:string)=>categorias.find(c=>c.clave===k)?.nombre||k;
 async function operar(fn:()=>PromiseLike<{error:unknown}>,texto:string){setOcupado(true);setError('');setAviso('');try{const r=await fn();if(r.error)throw r.error;setAviso(texto);await cargar();}catch(e){setError(mensajeError(e,'No se pudo guardar.'));}finally{setOcupado(false);}}
 function elegir(id:string){setElegido(id);const c=clanes.find(x=>x.id===id);setForm(c?{...c}:{nombre:'',descripcion:'',color:'#c0263a'});setAviso('');}
 function guardar(e:FormEvent){e.preventDefault();const datos={nombre:form.nombre.trim(),descripcion:form.descripcion,color:form.color};
  void operar(()=>form.id?supabase.from('clanes').update(datos).eq('id',form.id):supabase.from('clanes').insert(datos),form.id?'Clan actualizado.':'Clan creado. Añade sus miembros.');}
 const linajes=heredables.filter(h=>h.requisitos_uso.razas?.length);
 return <main className="space-y-6">
  <Cabecera kanji="族" migas="Kuroi · Clanes" titulo="Clanes y linajes" subtitulo="Un linaje es una raza o subraza de la Forja. Un clan reúne personajes de cualquier raza. Las habilidades con herencia se entregan solas a sus miembros y se retiran cuando dejan de serlo."
   acciones={<button type="button" className={boton} disabled={ocupado} onClick={()=>void operar(()=>supabase.rpc('herencia_recalcular'),'Herencias recalculadas.')}><RefreshCw size={16} aria-hidden="true"/>Recalcular herencias</button>}/>
  {error&&<p role="alert" className="text-red-300">{error}</p>}{aviso&&<p role="status" className="text-green-300">{aviso}</p>}
  <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
   <nav aria-label="Clanes" className="space-y-2">
    <button type="button" className={`${boton} w-full`} aria-pressed={!elegido} onClick={()=>elegir('')}><Plus size={16} aria-hidden="true"/>Nuevo clan</button>
    {clanes.map(c=><button type="button" key={c.id} aria-pressed={elegido===c.id} onClick={()=>elegir(c.id)} className="flex w-full items-center justify-between gap-2 rounded-xs border border-neutral-700 px-3 py-2 text-left aria-pressed:border-gold"><span><span style={{color:c.color}} aria-hidden="true">◆</span> {c.nombre}</span><small className="text-neutral-400">{miembros.filter(m=>m.clan_id===c.id).length}</small></button>)}
    {!clanes.length&&<p className="text-sm text-neutral-400">Todavía no hay clanes.</p>}
   </nav>
   <section className="space-y-6">
    <form onSubmit={guardar} className="space-y-3 rounded-xs border border-neutral-700 p-4">
     <h2 className="text-xl font-semibold">{form.id?`Editar ${clan?.nombre||'clan'}`:'Nuevo clan'}</h2>
     <label className="block">Nombre<input className={input} required maxLength={80} value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></label>
     <label className="block">Descripción<textarea className={input} maxLength={4000} value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})}/></label>
     <label className="inline-flex items-center gap-3">Color<input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></label>
     <div className="flex flex-wrap gap-3"><button className={principal} disabled={ocupado||!form.nombre.trim()}>{form.id?'Guardar clan':'Crear clan'}</button>
      {form.id&&<button type="button" className={boton} disabled={ocupado} onClick={()=>{if(window.confirm(`¿Borrar el clan «${clan?.nombre}»? Sus miembros perderán lo heredado de él.`))void operar(()=>supabase.from('clanes').delete().eq('id',form.id!),'Clan borrado.').then(()=>elegir(''));}}><Trash2 size={16} aria-hidden="true"/>Borrar</button>}</div>
    </form>
    {clan&&<>
     <section className="space-y-3 rounded-xs border border-neutral-700 p-4">
      <h2 className="text-xl font-semibold">Miembros</h2>
      <div className="flex flex-wrap gap-3"><select aria-label="Personaje para añadir al clan" className={`${input} max-w-sm`} value={nuevo} onChange={e=>setNuevo(e.target.value)}><option value="">Elegir personaje…</option>{personajes.filter(p=>!suyos.has(p.id)&&p.estado_vida!=='muerto').map(p=><option key={p.id} value={p.id}>{p.nombre}{p.raza?` · ${nombreRaza(p.raza)}`:''}{p.es_companero?' · compañero':''}</option>)}</select>
       <button type="button" className={boton} disabled={ocupado||!nuevo} onClick={()=>void operar(()=>supabase.from('clan_miembros').insert({clan_id:clan.id,personaje_id:Number(nuevo)}),'Miembro añadido: recibe lo heredado del clan.').then(()=>setNuevo(''))}><UserPlus size={16} aria-hidden="true"/>Añadir</button></div>
      <ul className="divide-y divide-neutral-800">{personajes.filter(p=>suyos.has(p.id)).map(p=><li key={p.id} className="flex items-center justify-between gap-3 py-2"><span>{p.nombre} <small className="text-neutral-400">{p.raza?nombreRaza(p.raza):''}</small></span>
       <button type="button" className={boton} disabled={ocupado} onClick={()=>void operar(()=>supabase.from('clan_miembros').delete().eq('clan_id',clan.id).eq('personaje_id',p.id),`${p.nombre} sale del clan.`)}><UserMinus size={16} aria-hidden="true"/>Quitar</button></li>)}</ul>
      {!suyos.size&&<p className="text-sm text-neutral-400">El clan no tiene miembros.</p>}
     </section>
     <section className="space-y-2 rounded-xs border border-neutral-700 p-4">
      <h2 className="text-xl font-semibold">Lo que hereda el clan</h2>
      {heredables.filter(h=>h.requisitos_uso.clanes?.includes(clan.id)).map(h=><p key={h.id}><strong>{h.nombre}</strong> <small className="text-neutral-400">{h.tipo_creacion}{h.requisitos_uso.razas?.length?` · además exige linaje ${h.requisitos_uso.razas.map(nombreRaza).join(' o ')}`:''}{h.requisitos_uso.nivel_minimo?` · desde nivel ${h.requisitos_uso.nivel_minimo}`:''}</small></p>)}
      {!heredables.some(h=>h.requisitos_uso.clanes?.includes(clan.id))&&<p className="text-sm text-neutral-400">Nada todavía. En el Yunque, abre una habilidad, ve a Requisitos, marca este clan y activa «Se hereda».</p>}
      <Link className="text-amber-300 underline" href="/dm/forja">Abrir la Forja</Link>
     </section>
    </>}
    <section className="space-y-2 rounded-xs border border-neutral-700 p-4">
     <h2 className="text-xl font-semibold">Herencias por linaje</h2>
     <p className="text-sm text-neutral-400">Se entregan a cada personaje cuya raza o subraza esté marcada, sin necesidad de clan.</p>
     {linajes.map(h=><p key={h.id}><strong>{h.nombre}</strong> <small className="text-neutral-400">{h.requisitos_uso.razas!.map(nombreRaza).join(' o ')} · {personajes.filter(p=>p.raza&&h.requisitos_uso.razas!.includes(p.raza)).length} personaje(s) directos</small></p>)}
     {!linajes.length&&<p className="text-sm text-neutral-400">Ninguna habilidad se hereda por linaje todavía.</p>}
    </section>
   </section>
  </div>
 </main>;
}
