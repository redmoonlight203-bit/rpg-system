'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {supabase} from '../lib/supabase';
import {prepararPortada,validarPortada} from '../lib/imagenes-creacion';
import {nuevoLogro,DISPARADORES_LOGRO,condicionesParaEvento,type LogroYugen,type CondicionesLogro,type EventoLogro} from '../lib/logros';
import {describirRegla,describirEfecto} from '../lib/descripciones';
import type {Regla} from '../lib/reglas';
import type {Efecto} from '../lib/creacion';
import SelectorIconoYugen from './SelectorIconoYugen';
import ImagenIconoLogro from './ImagenIconoLogro';
type Titulo={id:string;nombre:string;descripcion:string;imagen_url:string;icono:string;stats:Record<string,number>;reglas:Regla[];reglas_pasivas:{nombre:string}[];configuracion_dados:Efecto[]};
type Entidad={id:string;nombre:string;tipo_creacion:string};
type Cuenta={id:string;email:string};
type Personaje={id:number;nombre:string;user_id:string};
const campo='mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-neutral-100';
const boton='rounded-lg border border-amber-700 px-4 py-2 disabled:opacity-40';
export default function LogrosYTitulos(){
 const [logros,setLogros]=useState<LogroYugen[]>([]),[titulos,setTitulos]=useState<Titulo[]>([]),[entidades,setEntidades]=useState<Entidad[]>([]),[cuentas,setCuentas]=useState<Cuenta[]>([]),[personajes,setPersonajes]=useState<Personaje[]>([]);
 const [form,setForm]=useState<LogroYugen>(nuevoLogro),[modo,setModo]=useState<'editar'|'entregar'>('editar'),[error,setError]=useState(''),[aviso,setAviso]=useState(''),[ocupado,setOcupado]=useState(false),[imagenPendiente,setImagenPendiente]=useState(false);
 const [logroManual,setLogroManual]=useState(''),[usuario,setUsuario]=useState(''),[personaje,setPersonaje]=useState(''),[completar,setCompletar]=useState(true),[cantidad,setCantidad]=useState(1),[motivo,setMotivo]=useState('');
 const bloqueo=useRef(false),solicitud=useRef<{clave:string;id:string}|null>(null),edicion=useRef(0);
 async function cargar(){
  const rs=await Promise.all([
   supabase.from('logros_yugen').select('*').order('nombre'),
   supabase.from('forja_maestra').select('id,nombre,descripcion,imagen_url,icono,stats,reglas,reglas_pasivas,configuracion_dados').eq('tipo_creacion','titulo').eq('estado','aprobado').order('nombre'),
   supabase.from('forja_maestra').select('id,nombre,tipo_creacion').eq('estado','aprobado').in('tipo_creacion',['personaje','objeto']).order('nombre'),
   supabase.from('perfiles').select('id,email').eq('rol','REENCARNADO').eq('estado','aprobado').order('email'),
   supabase.from('personajes').select('id,nombre,user_id').eq('estado_aprobacion','aprobado').order('nombre'),
  ]);
  for(const r of rs)if(r.error)throw r.error;
  setLogros(rs[0].data||[]);setTitulos(rs[1].data||[]);setEntidades(rs[2].data||[]);setCuentas(rs[3].data||[]);setPersonajes(rs[4].data||[]);
 }
 useEffect(()=>{const t=setTimeout(()=>void cargar().catch(e=>setError(e.message)),0);return()=>clearTimeout(t);},[]);
 const patch=(p:Partial<LogroYugen>)=>setForm(f=>({...f,...p}));
 function elegir(id:string){edicion.current++;setForm({...nuevoLogro(),...logros.find(l=>l.id===id)});setError('');setAviso('');}
 const titulo=titulos.find(t=>t.id===form.titulo_forja_id),evento=DISPARADORES_LOGRO.find(e=>e.id===form.evento)!;
 const seleccionado=logros.find(l=>l.id===logroManual);
 const condiciones=(p:Partial<CondicionesLogro>)=>patch({condiciones:{...form.condiciones,...p}});
 async function guardar(e:FormEvent){
  e.preventDefault();if(bloqueo.current||imagenPendiente)return;
  const fallo=validarPortada(form.imagen_url);if(fallo){setError(fallo);return;}
  if(!titulo){setError('Selecciona el título de la Forja que concederá este logro.');return;}
  bloqueo.current=true;setOcupado(true);setError('');setAviso('');
  try{
   const payload={nombre:form.nombre,descripcion:form.descripcion,icono:form.icono||'corona',imagen_url:form.imagen_url,evento:form.evento,objetivo:form.evento==='enemigo_derrotado'?form.objetivo:null,meta:form.meta,alcance:form.alcance,campana:form.campana,secreto:form.secreto,titulo:titulo.nombre,titulo_forja_id:titulo.id,color:form.color,activo:form.activo,criterio:form.criterio,condiciones:condicionesParaEvento(form.evento,form.condiciones)};
   const r=await (form.id?supabase.from('logros_yugen').update(payload).eq('id',form.id):supabase.from('logros_yugen').insert(payload)).select('*').single();
   if(r.error)throw r.error;setForm({...nuevoLogro(),...r.data});await cargar();setAviso('Logro guardado y asociado a '+titulo.nombre+'.');
  }catch(e){setError((e as Error).message);}finally{bloqueo.current=false;setOcupado(false);}
 }
 async function conceder(e:FormEvent){
  e.preventDefault();if(bloqueo.current||!seleccionado)return;
  const args={p_logro:logroManual,p_usuario:usuario,p_personaje:seleccionado.alcance==='personaje'?Number(personaje):null,p_cantidad:cantidad,p_completar:completar,p_motivo:motivo.trim()};
  const clave=JSON.stringify(args);if(solicitud.current?.clave!==clave)solicitud.current={clave,id:crypto.randomUUID()};
  bloqueo.current=true;setOcupado(true);setError('');setAviso('');
  try{const r=await supabase.rpc('logro_conceder',{...args,p_solicitud:solicitud.current.id});if(r.error)throw r.error;solicitud.current=null;setAviso(r.data.desbloqueado?'Logro concedido. El título está disponible en el baúl del alma del jugador.':`Progreso registrado: ${r.data.cantidad}/${seleccionado.meta}.`);}
  catch(e){setError((e as Error).message);}finally{bloqueo.current=false;setOcupado(false);}
 }
 return <section className="space-y-5">
  <div className="flex flex-wrap gap-3"><button className={boton} aria-pressed={modo==='editar'} onClick={()=>{setModo('editar');setAviso('');}}>Crear o editar logros</button><button className={boton} aria-pressed={modo==='entregar'} onClick={()=>{setModo('entregar');setAviso('');}}>Conceder logro como GM</button></div>
  {error&&<p role="alert" className="text-red-300">{error}</p>}{aviso&&<p role="status" className="text-green-300">{aviso}</p>}
  {modo==='entregar'?<form className="space-y-4 rounded-xl border border-amber-900 p-5" onSubmit={conceder}>
   <h2 className="text-xl font-bold">Conceder por una decisión del GM</h2><p className="text-neutral-400">Sirve para una sesión presencial, un hito narrativo o cualquier situación decidida por ti. No necesita un combate ni un evento de la app. También puedes conceder manualmente los logros automáticos.</p>
   <label className="block">Logro<select className={campo} required disabled={ocupado} value={logroManual} onChange={e=>{setLogroManual(e.target.value);setPersonaje('');}}><option value="">Elegir logro guardado…</option>{logros.map(l=><option key={l.id} value={l.id}>{l.nombre}{l.titulo_forja_id?'':' · Falta asociar título'}</option>)}</select></label>
   {seleccionado&&<div className="flex gap-3 rounded-lg bg-neutral-900 p-3"><ImagenIconoLogro icono={seleccionado.icono} imagen={seleccionado.imagen_url} nombre={seleccionado.nombre}/><div><strong>{seleccionado.nombre}</strong><p>{seleccionado.descripcion}</p><p className="text-amber-300">Título: {seleccionado.titulo}</p>{seleccionado.criterio&&<p>Referencia para el GM: {seleccionado.criterio}</p>}</div></div>}
   <label className="block">Jugador<select className={campo} required disabled={ocupado} value={usuario} onChange={e=>{setUsuario(e.target.value);setPersonaje('');}}><option value="">Elegir cuenta…</option>{cuentas.map(c=><option key={c.id} value={c.id}>{c.email}</option>)}</select></label>
   {seleccionado?.alcance==='personaje'&&<label className="block">Personaje que obtiene el logro<select className={campo} required disabled={ocupado} value={personaje} onChange={e=>setPersonaje(e.target.value)}><option value="">Elegir personaje…</option>{personajes.filter(p=>p.user_id===usuario).map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>}
   <label className="block">Entrega<select className={campo} disabled={ocupado} value={completar?'completar':'progreso'} onChange={e=>setCompletar(e.target.value==='completar')}><option value="completar">Desbloquear ahora y conceder el título</option><option value="progreso">Añadir progreso sin completar necesariamente</option></select></label>
   {!completar&&<label className="block">Cuánto progreso sumas<input className={campo} type="number" min={1} max={1000000} required disabled={ocupado} value={cantidad} onChange={e=>setCantidad(Number(e.target.value))}/></label>}
   <label className="block">Motivo de la concesión<textarea className={campo} required maxLength={500} disabled={ocupado} value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ej.: Rescató a los aldeanos durante la sesión presencial."/></label>
   <p className="text-sm text-neutral-400">Se registra quién lo concedió y por qué. Reintentar la misma entrega no duplica el progreso ni el título.</p>
   <button className={boton} disabled={ocupado||!seleccionado?.titulo_forja_id||!usuario||(seleccionado.alcance==='personaje'&&!personaje)}>{ocupado?'Guardando…':completar?'Conceder logro y título':'Añadir progreso'}</button>
  </form>:<form className="space-y-5" onSubmit={guardar}>
   <label className="block">Logro que vas a editar<select className={campo} disabled={ocupado||imagenPendiente} value={form.id||''} onChange={e=>elegir(e.target.value)}><option value="">Crear un logro nuevo</option>{logros.map(l=><option key={l.id} value={l.id}>{l.nombre}</option>)}</select></label>
   <div className="grid gap-4 sm:grid-cols-2"><label>Nombre del logro<input className={campo} required maxLength={100} value={form.nombre} disabled={ocupado} onChange={e=>patch({nombre:e.target.value})}/></label><label>Alcance<select className={campo} disabled={ocupado} value={form.alcance} onChange={e=>patch({alcance:e.target.value as LogroYugen['alcance']})}><option value="cuenta">Una vez por cuenta</option><option value="personaje">Una vez por personaje</option><option value="campana">Una vez por cuenta en esta campaña</option></select></label></div>
   <label className="block">Descripción para el jugador<textarea className={campo} maxLength={10000} value={form.descripcion} disabled={ocupado} onChange={e=>patch({descripcion:e.target.value})}/></label>
   {form.alcance==='campana'&&<label className="block">Campaña<input className={campo} required maxLength={100} value={form.campana} disabled={ocupado} onChange={e=>patch({campana:e.target.value})}/></label>}
   <fieldset className="space-y-3 rounded-xl border border-neutral-700 p-4" disabled={ocupado}>
    <legend className="px-2 font-semibold">Título que concede</legend><p>Elige un título ya creado en la Forja. Conserva su descripción, estadísticas, acciones y pasivas narrativas o de combate.</p>
    <p className="text-sm text-neutral-400">Si creas un título en otra pestaña, pulsa Actualizar títulos al volver.</p><button type="button" className={boton} onClick={()=>void cargar().catch(e=>setError(e.message))}>Actualizar títulos</button>{!titulos.length&&<p className="text-amber-200">Todavía no hay títulos aprobados. Crea uno en la Forja eligiendo el tipo Título.</p>}<select className={campo} aria-label="Título existente de la Forja" required value={form.titulo_forja_id||''} onChange={e=>patch({titulo_forja_id:e.target.value||null})}><option value="">Elegir título aprobado…</option>{titulos.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
    {titulo&&<article className="rounded-lg bg-neutral-900 p-4"><div className="flex gap-3"><ImagenIconoLogro icono={titulo.icono||'corona'} imagen={titulo.imagen_url} nombre={titulo.nombre}/><div><h3 className="font-bold text-amber-200">{titulo.nombre}</h3><p className="whitespace-pre-wrap">{titulo.descripcion||'Sin descripción narrativa.'}</p></div></div><div className="mt-3 flex flex-wrap gap-3">{Object.entries(titulo.stats||{}).map(([k,v])=><span key={k}>{k}: {v>0?'+':''}{v}</span>)}</div>{titulo.reglas?.map(r=><p className="mt-2 text-sm" key={r.id}>{describirRegla(r).resumen}</p>)}{titulo.reglas_pasivas?.map((p,i)=><p className="mt-2 text-sm" key={i}>{p.nombre}</p>)}{titulo.configuracion_dados?.map(e=><p className="mt-2 text-sm" key={e.id}>{describirEfecto(e,e.nombre).resumen}</p>)}</article>}
    <p className="text-sm text-neutral-400">Se entrega al baúl del alma. El jugador lo envía a un personaje y lo equipa en el espacio Título para activar sus efectos. Mostrarlo en el perfil no activa sus pasivas.</p>
    <Link href="/dm/forja" target="_blank" rel="noopener noreferrer" className="text-amber-300 underline">Abrir la Forja para crear o editar un título</Link>
   </fieldset>
   <fieldset className="space-y-3 rounded-xl border border-neutral-700 p-4" disabled={ocupado||imagenPendiente}>
    <legend className="px-2 font-semibold">Icono o fotografía del logro</legend>
    <div className="flex items-center gap-4"><ImagenIconoLogro icono={form.icono} imagen={form.imagen_url} nombre={form.nombre||'Vista previa del logro'} size={88}/><span>Así se verá en la colección del jugador.</span></div>
    <SelectorIconoYugen value={form.icono} automatico="corona" disabled={ocupado||imagenPendiente} onChange={icono=>patch({icono:icono||'corona',imagen_url:''})}/>
    <label className="block">Subir una foto desde tu dispositivo<input className={campo} type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{const input=e.currentTarget,file=input.files?.[0];if(!file)return;const revision=edicion.current;setImagenPendiente(true);setError('');try{const imagen=await prepararPortada(file);if(revision===edicion.current)patch({imagen_url:imagen});}catch(e){setError((e as Error).message);}finally{input.value='';setImagenPendiente(false);}}}/></label>
    {imagenPendiente&&<p role="status">Preparando la imagen…</p>}
    <label className="block">O usar una URL de imagen<input className={campo} type="url" value={form.imagen_url.startsWith('data:')?'':form.imagen_url} placeholder="https://…" onChange={e=>patch({imagen_url:e.target.value})}/></label>
    {form.imagen_url&&<button type="button" className={boton} onClick={()=>patch({imagen_url:''})}>Quitar foto y usar el icono</button>}
   </fieldset>
   <fieldset className="space-y-4 rounded-xl border border-neutral-700 p-4" disabled={ocupado}>
    <legend className="px-2 font-semibold">Cómo se consigue</legend>
    <label className="block">Disparador<select className={campo} value={form.evento} onChange={e=>{const evento=e.target.value as EventoLogro;patch({evento,objetivo:null,condiciones:condicionesParaEvento(evento,form.condiciones)});}}>{DISPARADORES_LOGRO.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label><p className="rounded-lg bg-neutral-900 p-3 text-sm text-neutral-300">{evento.descripcion}</p>
    <label className="block">Condición narrativa o criterio del GM<textarea className={campo} maxLength={5000} value={form.criterio} onChange={e=>patch({criterio:e.target.value})} placeholder="Describe lo que debe lograr el jugador, dentro o fuera de la app."/></label>
    <label className="block">Progreso necesario<input className={campo} type="number" min={1} max={1000000} required value={form.meta} onChange={e=>patch({meta:Number(e.target.value)})}/></label>
    {form.evento==='enemigo_derrotado'&&<><label className="block">Enemigo específico<select className={campo} value={form.objetivo||''} onChange={e=>patch({objetivo:e.target.value||null})}><option value="">Cualquier enemigo</option>{entidades.filter(e=>e.tipo_creacion==='personaje').map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label><label className="block">Nivel mínimo del enemigo<input className={campo} type="number" min={1} max={100} value={form.condiciones.enemigo_nivel_minimo||1} onChange={e=>condiciones({enemigo_nivel_minimo:Number(e.target.value)})}/></label></>}
    {form.evento!=='manual'&&<label className="block">Nivel mínimo del personaje<input className={campo} type="number" min={1} max={100} value={form.condiciones.nivel_minimo||1} onChange={e=>condiciones({nivel_minimo:Number(e.target.value)})}/></label>}
    {['enemigo_derrotado','encuentro_finalizado','sobrevivir_encuentro'].includes(form.evento)&&<><label className="block">Completar en un máximo de rondas (vacío = sin límite)<input className={campo} type="number" min={1} max={1000} value={form.condiciones.rondas_maximas||''} onChange={e=>condiciones({rondas_maximas:e.target.value?Number(e.target.value):undefined})}/></label><label className="block"><input type="checkbox" checked={!!form.condiciones.sin_caer} onChange={e=>condiciones({sin_caer:e.target.checked})}/> No haber caído a 0 HP durante el encuentro</label></>}
    {form.evento==='objeto_adjudicado'&&<label className="block">Objeto específico<select className={campo} value={form.condiciones.objeto_id||''} onChange={e=>condiciones({objeto_id:e.target.value||undefined})}><option value="">Cualquier entrega de botín</option>{entidades.filter(e=>e.tipo_creacion==='objeto').map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label>}
    <p className="text-sm text-amber-200">El GM siempre puede conceder este logro manualmente, independientemente de estas comprobaciones automáticas. Los entrenamientos no activan logros automáticos.</p>
   </fieldset>
   <div className="flex flex-wrap gap-4"><label><input type="checkbox" checked={form.secreto} disabled={ocupado} onChange={e=>patch({secreto:e.target.checked})}/> Secreto hasta desbloquear</label><label><input type="checkbox" checked={form.activo} disabled={ocupado} onChange={e=>patch({activo:e.target.checked})}/> Logro habilitado</label><label>Color en la colección<input className="ml-2" type="color" value={form.color} disabled={ocupado} onChange={e=>patch({color:e.target.value})}/></label></div>
   <button className={boton} disabled={ocupado||imagenPendiente||!form.nombre.trim()||!titulo}>{ocupado?'Guardando…':'Guardar logro'}</button>
  </form>}
 </section>;
}
