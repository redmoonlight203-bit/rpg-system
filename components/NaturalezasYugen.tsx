"use client";
import {useCallback,useEffect,useState} from 'react';
import {useTiempoReal} from '../lib/useTiempoReal';
import {EditorDados} from './EditorDados';
import {EditorPasivas} from './EditorPasivas';
import {EditorReglas} from './EditorReglas';
import {type Efecto,validarEfectos} from '../lib/creacion';
import {type ReglaPasiva,validarPasivas} from '../lib/pasivas';
import {type Regla,validarReglas} from '../lib/reglas';
import {supabase} from '../lib/supabase';

type Pasiva={id?:string;nombre:string;reglas?:ReglaPasiva[];reglas_motor?:Regla[];[key:string]:unknown};
type Habilidad={id?:string;nombre:string;stats?:Record<string,number>;efectos?:Efecto[];reglas?:Regla[];[key:string]:unknown};
type Naturaleza={id:string;clave:string;nombre:string;descripcion:string;modificadores:Record<string,number>;pasivas:(string|Pasiva)[];habilidades:(string|Habilidad)[];reglas:{motor?:Regla[];[key:string]:unknown}};
type Vinculo={id:string;naturaleza_id:string;activa:boolean;origen:string;metadata:Record<string,unknown>};
type Creacion={id:string;nombre:string;tipo_creacion:string};
const input='mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm text-white';
const btn='rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:border-emerald-500 disabled:opacity-40';
const panel='space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4';
const slug=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const pasos=['Identidad','Bonos','Poderes','Revisar y guardar'];
const descripcionKemono='Portador de una bestia sellada en su interior. Conserva su raza de origen y su pasiva racial. El vínculo con la bestia puede conceder energía, habilidades y transformaciones; sus poderes y el riesgo de perder el control dependen de la bestia y del sello.';

export default function NaturalezasYugen({personajeId,onCambio,soloCatalogo=false}:{personajeId?:number;onCambio?:()=>void;soloCatalogo?:boolean}){
 const [catalogo,setCatalogo]=useState<Creacion[]>([]),[naturalezas,setNaturalezas]=useState<Naturaleza[]>([]),[vinculos,setVinculos]=useState<Vinculo[]>([]);
 const [atributos,setAtributos]=useState<{clave:string;etiqueta:string}[]>([]);
 const [nombre,setNombre]=useState(''),[descripcion,setDescripcion]=useState(''),[mod,setMod]=useState<Record<string,number>>({});
 const [pasivas,setPasivas]=useState<(string|Pasiva)[]>([]),[habilidades,setHabilidades]=useState<(string|Habilidad)[]>([]),[reglas,setReglas]=useState<Naturaleza['reglas']>({});
 const [editId,setEditId]=useState(''),[paso,setPaso]=useState(0),[busqueda,setBusqueda]=useState('');
 const [elegida,setElegida]=useState(''),[origen,setOrigen]=useState(''),[bestia,setBestia]=useState(''),[sello,setSello]=useState(''),[notas,setNotas]=useState('');
 const [error,setError]=useState(''),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false);
 const cargar=useCallback(async()=>{
  const [n,v,f,a]=await Promise.all([
   supabase.from('naturalezas').select('*').order('nombre'),
   personajeId?supabase.from('personaje_naturalezas').select('*').eq('personaje_id',personajeId).order('adquirida_at'):Promise.resolve({data:[],error:null}),
   supabase.from('forja_maestra').select('id,nombre,tipo_creacion').eq('estado','aprobado').in('tipo_creacion',['habilidad','pasiva']).order('nombre'),
   supabase.from('config_estadisticas').select('clave,etiqueta').order('etiqueta'),
  ]);
  const fallo=n.error||v.error||f.error||a.error;if(fallo){setError(fallo.message);return;}
  setNaturalezas((n.data||[]) as Naturaleza[]);setVinculos((v.data||[]) as Vinculo[]);setCatalogo(f.data||[]);
  setAtributos([...new Map((a.data||[]).map(a=>[a.clave,a])).values()]);
 },[personajeId]);
 useTiempoReal(cargar);
 useEffect(()=>{void Promise.resolve().then(cargar);},[cargar]);
 const etiqueta=(k:string)=>atributos.find(a=>a.clave===k)?.etiqueta||k.replace(/_/g,' ');
 const disponibles=atributos.filter(a=>!(a.clave in mod));
 const poderNombre=(x:string|Pasiva|Habilidad)=>typeof x==='string'?catalogo.find(c=>c.id===x)?.nombre||'Creación vinculada':x.nombre;
 // Empty editor drafts must not create empty passive/ability sources on the server.
 const ps=pasivas.filter(p=>typeof p==='string'||!!p.reglas?.length||!!p.reglas_motor?.length);
 const hs=habilidades.filter(h=>typeof h==='string'||!!h.efectos?.length||!!h.reglas?.length);
 const elegidaInfo=naturalezas.find(n=>n.id===elegida);
 const esKemono=elegidaInfo?.clave==='kemono'||elegidaInfo?.nombre.toLowerCase().includes('kemono');
 async function ejecutar(fn:()=>Promise<void>){
  if(ocupado)return;setOcupado(true);setError('');setMensaje('');
  try{await fn();await cargar();onCambio?.();}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}finally{setOcupado(false);}
 }
 function editar(n?:Naturaleza){
  setEditId(n?.id||'');setNombre(n?.nombre||'');setDescripcion(n?.descripcion||'');setMod({...n?.modificadores});
  setPasivas(n?.pasivas||[]);setHabilidades(n?.habilidades||[]);setReglas(n?.reglas||{});setPaso(0);setError('');setMensaje('');
 }
 function kemono(){
  if((nombre||descripcion||Object.keys(mod).length||pasivas.length||habilidades.length||reglas.motor?.length)&&!window.confirm('¿Sustituir el borrador por el ejemplo de Kemono?'))return;
  editar();setNombre('Kemono');setDescripcion(descripcionKemono);setMensaje('Ejemplo preparado. Elige los bonos y poderes de tu bestia; todavía no se ha guardado.');
 }
 async function guardar(){
  await ejecutar(async()=>{
   const n=nombre.trim();if(!n){setPaso(0);throw Error('Ponle un nombre a la naturaleza.');}
   if(Object.values(mod).some(v=>!Number.isFinite(v)||Math.abs(v)>1000000))throw Error('Los bonos deben ser números entre -1 000 000 y 1 000 000.');
   for(const p of ps){if(typeof p==='string')continue;const fallo=validarPasivas(p.reglas||[])||validarReglas(p.reglas_motor||[]);if(fallo){setPaso(2);throw Error(`${p.nombre}: ${fallo}`);}}
   for(const h of hs){if(typeof h==='string')continue;const fallo=validarEfectos(h.efectos||[])||validarReglas(h.reglas||[]);if(fallo){setPaso(2);throw Error(`${h.nombre}: ${fallo}`);}}
   const fallo=validarReglas(reglas.motor||[]);if(fallo){setPaso(2);throw Error(fallo);}
   const data={nombre:n,descripcion,modificadores:mod,pasivas:ps,habilidades:hs,reglas};
   const q=editId?supabase.from('naturalezas').update(data).eq('id',editId).select('id').single():supabase.from('naturalezas').insert({...data,clave:slug(n)}).select('id').single();
   const res=await q;if(res.error)throw Error(res.error.message);
   const editando=!!editId;editar();setMensaje(editando?'Naturaleza actualizada. Los personajes que ya la adquirieron conservan sus bonos originales.':'Naturaleza creada. Ya puedes aplicarla desde Jugadores y personajes.');
  });
 }
 async function asignar(){
  if(!personajeId)return;
  await ejecutar(async()=>{
   if(!elegida)throw Error('Elige una naturaleza.');
   if(esKemono&&!bestia.trim())throw Error('Indica qué bestia tiene sellada este personaje.');
   const r=await supabase.from('personaje_naturalezas').insert({personaje_id:personajeId,naturaleza_id:elegida,origen,metadata:{...(bestia.trim()?{bestia:bestia.trim()}:{}),...(sello.trim()?{sello:sello.trim()}:{}),...(notas.trim()?{notas:notas.trim()}: {})}}).select('id').single();
   if(r.error)throw Error(r.error.message);
   setMensaje('Naturaleza adquirida. Conserva su raza y su pasiva racial.');setElegida('');setOrigen('');setBestia('');setSello('');setNotas('');
  });
 }
 async function activar(v:Vinculo){await ejecutar(async()=>{const r=await supabase.from('personaje_naturalezas').update({activa:!v.activa}).eq('id',v.id).select('id').single();if(r.error)throw Error(r.error.message);setMensaje(v.activa?'Naturaleza suspendida. Sus bonos se han retirado.':'Naturaleza reactivada.');});}
 async function retirar(v:Vinculo){if(!window.confirm('¿Retirar esta naturaleza y sus bonos del personaje?'))return;await ejecutar(async()=>{const r=await supabase.from('personaje_naturalezas').delete().eq('id',v.id).select('id').single();if(r.error)throw Error(r.error.message);setMensaje('Naturaleza retirada.');});}
 function quitarBono(k:string){setMod(prev=>Object.fromEntries(Object.entries(prev).filter(([clave])=>clave!==k)));}
 function cambiarEstadistica(anterior:string,nueva:string){if(!nueva||nueva===anterior)return;setMod(prev=>Object.fromEntries(Object.entries(prev).map(([k,v])=>[k===anterior?nueva:k,v])));}
 function vincular(id:string){const f=catalogo.find(c=>c.id===id);if(!f)return;if(f.tipo_creacion==='pasiva'){if(!pasivas.includes(id))setPasivas([...pasivas,id]);}else if(!habilidades.includes(id))setHabilidades([...habilidades,id]);}
 return <section className="space-y-5 rounded-xl border border-emerald-900/50 bg-neutral-950 p-4 text-neutral-100 sm:p-6">
  <header><h3 className="text-xl font-semibold">Naturalezas adquiridas</h3><p className="mt-2 text-sm text-neutral-400">Lo que le ocurre a un personaje puede darle nuevos poderes. Su raza y su pasiva racial se conservan.</p></header>
  {error&&<p role="alert" className="rounded-lg border border-red-900 p-3 text-sm text-red-300">{error}</p>}{mensaje&&<p role="status" className="rounded-lg border border-emerald-900 p-3 text-sm text-emerald-300">{mensaje}</p>}
  {!soloCatalogo&&personajeId&&<section className={panel} aria-label="Naturalezas de este personaje">
   <h4 className="font-semibold">Lo que ha adquirido este personaje</h4>
   {vinculos.map(v=><article key={v.id} className="space-y-2 rounded-lg border border-neutral-700 p-3"><div className="flex flex-wrap justify-between gap-3"><div><strong>{naturalezas.find(n=>n.id===v.naturaleza_id)?.nombre||'Naturaleza'}</strong><p className="text-xs text-neutral-400">{v.activa?'Activa':'Suspendida'} · {v.origen||'Sin origen registrado'}</p></div><div className="flex gap-2"><button type="button" className={btn} disabled={ocupado} onClick={()=>void activar(v)}>{v.activa?'Suspender':'Reactivar'}</button><button type="button" className={btn} disabled={ocupado} onClick={()=>void retirar(v)}>Retirar</button></div></div>{['bestia','sello','notas'].map(k=>typeof v.metadata?.[k]==='string'&&<p key={k} className="text-sm"><span className="capitalize text-neutral-400">{k}: </span>{v.metadata[k] as string}</p>)}</article>)}
   {!vinculos.length&&<p className="text-sm text-neutral-400">Todavía no tiene naturalezas adquiridas.</p>}
   <label className="block text-sm">Añadir naturaleza<select className={input} value={elegida} disabled={ocupado} onChange={e=>setElegida(e.target.value)}><option value="">Selecciona una naturaleza…</option>{naturalezas.filter(n=>!vinculos.some(v=>v.naturaleza_id===n.id)).map(n=><option key={n.id} value={n.id}>{n.nombre}</option>)}</select></label>
   {elegidaInfo&&<><p className="text-sm text-neutral-400">{elegidaInfo.descripcion}</p><label className="block text-sm">¿Cómo la adquirió?<input className={input} value={origen} onChange={e=>setOrigen(e.target.value)} placeholder="Un ritual, una maldición, un encuentro…"/></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">{esKemono?'Bestia sellada (obligatorio)':'Entidad vinculada, si tiene una'}<input className={input} value={bestia} onChange={e=>setBestia(e.target.value)} placeholder="Nombre de la bestia"/></label><label className="text-sm">Sello o marca<input className={input} value={sello} onChange={e=>setSello(e.target.value)} placeholder="Dónde está y cómo se ve"/></label></div><label className="block text-sm">Notas del vínculo<textarea className={input} value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Relación con la bestia, acuerdos, acontecimientos…"/></label><p className="text-xs text-neutral-400">Estas notas describen el vínculo. Los efectos de combate se configuran en los poderes de la naturaleza.</p><button type="button" className={btn} disabled={ocupado} onClick={()=>void asignar()}>Aplicar al personaje</button></>}
  </section>}
  <details open={soloCatalogo} className="space-y-4"><summary className="cursor-pointer font-semibold">Catálogo y creación de naturalezas ({naturalezas.length})</summary>
   {!!naturalezas.length&&<div className="mt-4 grid gap-2 sm:grid-cols-2">{naturalezas.map(n=><button type="button" key={n.id} disabled={ocupado} className={btn+' text-left'} onClick={()=>editar(n)}><strong className="block">{n.nombre}</strong><span className="text-xs text-neutral-400">{n.descripcion||'Editar esta naturaleza'}</span></button>)}</div>}
   <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><h4 className="font-semibold">{editId?'Editar naturaleza':'Crear una naturaleza'}</h4><div className="flex gap-2"><button type="button" className={btn} disabled={ocupado} onClick={kemono}>Empezar con Kemono</button><button type="button" className={btn} disabled={ocupado} onClick={()=>{if(!nombre||window.confirm('¿Descartar el borrador y empezar otra naturaleza?'))editar();}}>Nueva desde cero</button></div></div>
   <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Pasos para crear una naturaleza">{pasos.map((p,i)=><button type="button" key={p} disabled={ocupado} aria-current={paso===i?'step':undefined} className={`${btn} text-left ${paso===i?'border-emerald-500 bg-emerald-950/40':''}`} onClick={()=>setPaso(i)}><small className="block text-neutral-400">PASO {i+1}</small>{p}</button>)}</nav>
   <fieldset disabled={ocupado} className={panel}>
   {paso===0&&<><legend className="px-1 font-semibold">¿Qué ha cambiado en el personaje?</legend><label className="block text-sm">Nombre de la naturaleza<input className={input} maxLength={120} value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Kemono, vampirismo, bendición…"/></label><label className="block text-sm">Descripción<textarea className={input} rows={4} value={descripcion} onChange={e=>setDescripcion(e.target.value)} placeholder="Cómo se adquiere, qué representa y de dónde vienen sus poderes."/></label>{nombre.toLowerCase().includes('kemono')&&<div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3 text-sm text-amber-200"><strong>Kemono: una bestia sellada dentro</strong><p className="mt-2">Su raza original se conserva. Los bonos, habilidades y transformaciones dependen de la bestia que lleva dentro.</p><p className="mt-2">Puedes crear variantes como «Kemono — nombre de la bestia» si cada bestia concede poderes distintos. Al aplicarla a un personaje, podrás registrar su bestia y su sello.</p></div>}</>}
   {paso===1&&<><legend className="px-1 font-semibold">¿Qué estadísticas modifica?</legend><p className="text-sm text-neutral-400">Elige una estadística y cuánto cambia. Un número positivo suma; uno negativo resta. Estos bonos se aplican mientras la naturaleza esté activa.</p>{Object.entries(mod).map(([k,v])=><div key={k} className="grid grid-cols-[1fr_6rem_auto] items-end gap-2"><label className="text-sm">Estadística<select className={input} value={k} onChange={e=>cambiarEstadistica(k,e.target.value)}>{!atributos.some(a=>a.clave===k)&&<option value={k}>{etiqueta(k)}</option>}{atributos.filter(a=>a.clave===k||!(a.clave in mod)).map(a=><option key={a.clave} value={a.clave}>{a.etiqueta}</option>)}</select></label><label className="text-sm">Cambio<input className={input} type="number" step="any" min={-1000000} max={1000000} value={Number.isNaN(v)?'':v} onChange={e=>setMod({...mod,[k]:e.target.value===''?NaN:Number(e.target.value)})}/></label><button type="button" className={btn} aria-label={`Quitar bono de ${etiqueta(k)}`} onClick={()=>quitarBono(k)}>Quitar</button></div>)}{!Object.keys(mod).length&&<p className="text-sm">Todavía no añade ni reduce estadísticas. Puedes dejarlo así.</p>}<button type="button" className={btn} disabled={!disponibles.length} onClick={()=>{const a=disponibles[0];if(a)setMod({...mod,[a.clave]:0});}}>+ Añadir cambio de estadística</button>{!atributos.length&&<p className="text-sm text-amber-300">Primero crea las estadísticas en Estadísticas y reglas.</p>}<p className="text-xs text-neutral-400">Los bonos a la vida máxima no curan heridas. Si necesitas curación, añade un poder que cure.</p></>}
   {paso===2&&<><legend className="px-1 font-semibold">¿Qué poderes concede?</legend><p className="text-sm text-neutral-400">Puedes usar poderes del Yunque o crearlos aquí. Abre solamente lo que necesites.</p><details className={panel}><summary className="cursor-pointer font-medium">Elegir habilidades y pasivas del Yunque</summary><label className="block text-sm">Buscar poder<input className={input} value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Escribe su nombre…"/></label><div className="grid max-h-64 gap-2 overflow-auto sm:grid-cols-2">{catalogo.filter(f=>f.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(f=>{const agregado=pasivas.includes(f.id)||habilidades.includes(f.id);return <button type="button" key={f.id} className={btn+' text-left'} disabled={agregado} onClick={()=>vincular(f.id)}><strong className="block">{f.nombre}</strong><small>{f.tipo_creacion==='pasiva'?'Pasiva automática':'Habilidad'} · {agregado?'Añadida':'+ Añadir'}</small></button>;})}</div>{!catalogo.length&&<p className="text-sm text-neutral-400">Aún no hay poderes aprobados. Puedes crearlos abajo.</p>}</details>
    <div className="flex flex-wrap gap-2">{pasivas.filter((p):p is string=>typeof p==='string').map(id=><button type="button" className={btn} key={id} onClick={()=>setPasivas(pasivas.filter(p=>p!==id))}>{poderNombre(id)} · Quitar</button>)}{habilidades.filter((h):h is string=>typeof h==='string').map(id=><button type="button" className={btn} key={id} onClick={()=>setHabilidades(habilidades.filter(h=>h!==id))}>{poderNombre(id)} · Quitar</button>)}</div>
    <details className={panel}><summary className="cursor-pointer font-medium">Crear pasivas · lo que hace automáticamente</summary><p className="text-sm text-neutral-400">Para defensas, regeneración o beneficios que se activan solos.</p>{pasivas.map((p,i)=>typeof p!=='string'&&<article key={i} className={panel}><label className="block text-sm">Nombre de la pasiva<input className={input} value={p.nombre} onChange={e=>setPasivas(pasivas.map((x,j)=>j===i?{...p,nombre:e.target.value}:x))}/></label><EditorPasivas value={p.reglas||[]} onChange={reglas=>setPasivas(pasivas.map((x,j)=>j===i?{...p,reglas}:x))}/>{!!p.reglas_motor?.length&&<EditorReglas value={p.reglas_motor} onChange={reglas_motor=>setPasivas(pasivas.map((x,j)=>j===i?{...p,reglas_motor}:x))}/>}<button type="button" className={btn} onClick={()=>setPasivas(pasivas.filter((_,j)=>j!==i))}>Quitar esta pasiva</button></article>)}<button type="button" className={btn} onClick={()=>setPasivas([...pasivas,{id:crypto.randomUUID(),nombre:`Pasiva de ${nombre||'la naturaleza'}`,reglas:[]}])}>+ Crear una pasiva</button></details>
    <details className={panel}><summary className="cursor-pointer font-medium">Crear habilidades · lo que el personaje puede usar</summary><p className="text-sm text-neutral-400">Para ataques, curaciones, estados y otras acciones que se eligen en el turno.</p>{habilidades.map((h,i)=>typeof h!=='string'&&<article key={i} className={panel}><label className="block text-sm">Nombre del poder<input className={input} value={h.nombre} onChange={e=>setHabilidades(habilidades.map((x,j)=>j===i?{...h,nombre:e.target.value}:x))}/></label><EditorDados value={h.efectos||[]} onChange={efectos=>setHabilidades(habilidades.map((x,j)=>j===i?{...h,efectos}:x))}/>{!!h.reglas?.length&&<EditorReglas value={h.reglas} onChange={reglas=>setHabilidades(habilidades.map((x,j)=>j===i?{...h,reglas}:x))}/>}<button type="button" className={btn} onClick={()=>setHabilidades(habilidades.filter((_,j)=>j!==i))}>Quitar este poder</button></article>)}<button type="button" className={btn} onClick={()=>setHabilidades([...habilidades,{id:crypto.randomUUID(),nombre:`Poder de ${nombre||'la naturaleza'}`,stats:{},efectos:[]}])}>+ Crear una habilidad</button></details>
    <details className={panel}><summary className="cursor-pointer font-medium">Transformaciones y condiciones especiales</summary><p className="text-sm text-neutral-400">Para liberar una forma, cambiar estadísticas temporalmente o pedir una salvación para mantener el control. Los ejemplos son un punto de partida: revisa sus valores para tu bestia.</p><EditorReglas value={reglas.motor||[]} onChange={motor=>setReglas({...reglas,motor})}/></details>
   </>}
   {paso===3&&<><legend className="px-1 font-semibold">Así quedará la naturaleza</legend><h5 className="text-xl font-semibold">{nombre||'Falta el nombre'}</h5><p className="whitespace-pre-wrap text-sm text-neutral-300">{descripcion||'Sin descripción.'}</p><div className="grid gap-3 sm:grid-cols-2"><div className={panel}><strong>Estadísticas</strong>{Object.entries(mod).length?Object.entries(mod).map(([k,v])=><p key={k} className="text-sm">{etiqueta(k)}: {Number.isFinite(v)?`${v>=0?'+':''}${v}`:'Revisa el número'}</p>):<p className="text-sm text-neutral-400">Sin cambios numéricos.</p>}</div><div className={panel}><strong>Poderes</strong>{[...ps,...hs].map((p,i)=><p key={i} className="text-sm">{poderNombre(p)}</p>)}{(reglas.motor||[]).map(r=><p key={r.id} className="text-sm">{r.nombre} · condición especial</p>)}{!ps.length&&!hs.length&&!reglas.motor?.length&&<p className="text-sm text-neutral-400">Sin poderes todavía. Puedes añadirlos después.</p>}</div></div><p className="rounded-lg bg-emerald-950/30 p-3 text-sm text-emerald-200">Se suma a la raza original. El personaje conserva su pasiva racial.</p>{editId&&<p className="text-xs text-amber-300">Cambiar estos bonos no modifica los bonos ya adquiridos por personajes existentes. Los poderes se incorporan al preparar un nuevo encuentro.</p>}<button type="button" className={btn+' border-emerald-600 bg-emerald-950/40'} disabled={ocupado||!nombre.trim()} onClick={()=>void guardar()}>{ocupado?'Guardando…':editId?'Guardar cambios':'Crear naturaleza'}</button></>}
   </fieldset>
   <div className="flex justify-between gap-2"><button type="button" className={btn} disabled={ocupado||paso===0} onClick={()=>setPaso(paso-1)}>← Anterior</button>{paso<3&&<button type="button" className={btn} disabled={ocupado} onClick={()=>setPaso(paso+1)}>Siguiente: {pasos[paso+1]} →</button>}</div>
  </details>
 </section>;
}
