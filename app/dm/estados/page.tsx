'use client';
// Grimorio de estados: el GM crea, prueba y guarda estados configurables reutilizables. Los estados se arman
// con las primitivas de lib/estados (el mismo editor del Yunque) y se copian en las habilidades que los usan.
import {useMemo,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {Copy,Plus,Save,Search,Trash2,X} from 'lucide-react';
import {supabase} from '../../../lib/supabase';
import {mensajeError} from '../../../lib/errores';
import {Cabecera,Secciones} from '../../../components/layout/Cabecera';
import {useDialogo} from '../../../components/Dialogo';
import EditorEstados from '../../../components/yunque/editores/EditorEstados';
import CartaEstado from '../../../components/grimorio/CartaEstado';
import MunecoPruebas from '../../../components/grimorio/MunecoPruebas';
import SelectorGrimorio from '../../../components/grimorio/SelectorGrimorio';
import {CATALOGO_ESTADOS,CATEGORIAS_ESTADO,estadoVacio,type CategoriaEstado,type DefinicionEstado} from '../../../lib/estados';
import {AURA_CATEGORIA,NOMBRE_CATEGORIA,auraDe,idLibre,validarEstadoGuardado} from '../../../lib/estados-biblioteca';
import {useGrimorioEstados} from '../../../lib/useGrimorioEstados';
import '../../../components/yunque/yunque.css';
import './grimorio.css';

type Borrador={def:DefinicionEstado;color:string;original:string|null};
const PALETA=['#e3c58f','#9d8ae0','#d9734a','#4fb3d9','#6cc3a0','#e0485b','#c86dd7','#f4dfae'];

export default function GrimorioEstados(){
 const {confirmar}=useDialogo();
 const {estados,cargado,error:errorCarga,recargar}=useGrimorioEstados();
 const [pestana,setPestana]=useState<'propios'|'base'>('propios'),[busca,setBusca]=useState(''),[cat,setCat]=useState<CategoriaEstado|''>('');
 const [borrador,setBorrador]=useState<Borrador|null>(null),[ocupado,setOcupado]=useState(false),[error,setError]=useState(''),[sellado,setSellado]=useState(0);
 const ids=useMemo(()=>estados.map(e=>e.id),[estados]);
 const filtrar=(d:DefinicionEstado)=>(!cat||d.categoria===cat)&&(!busca.trim()||d.nombre.toLowerCase().includes(busca.trim().toLowerCase()));
 const propios=estados.filter(e=>filtrar(e.def)),base=CATALOGO_ESTADOS.filter(filtrar);

 const abrir=(def:DefinicionEstado,color:string,original:string|null)=>{setError('');setBorrador({def:structuredClone(def),color,original});};
 const nuevo=()=>{const d=estadoVacio(idLibre('estado_nuevo',ids));abrir(d,AURA_CATEGORIA[d.categoria],null);};
 const variante=(d:DefinicionEstado,color?:string)=>abrir({...structuredClone(d),id:idLibre(d.id+'_variante',ids),nombre:d.nombre.split(':')[0]+' (variante)'},auraDe(d,color),null);
 // Al editar uno guardado, su id queda fijo (es la clave). Al crear, se deriva del nombre sin pisar a nadie.
 const cambiarDef=(def:DefinicionEstado)=>setBorrador(b=>b&&{...b,def:{...def,id:b.original??idLibre(def.id,ids)},color:b.color===AURA_CATEGORIA[b.def.categoria]&&def.categoria!==b.def.categoria?AURA_CATEGORIA[def.categoria]:b.color});
 const otros=ids.filter(i=>i!==borrador?.original);
 const fallo=borrador?validarEstadoGuardado(borrador.def,borrador.color,otros):null;

 async function guardar(){
  if(!borrador||fallo)return;setOcupado(true);setError('');
  try{
   const fila={id:borrador.def.id,definicion:borrador.def,color:borrador.color};
   const r=borrador.original?await supabase.from('estados_personalizados').update({definicion:fila.definicion,color:fila.color}).eq('id',borrador.original):await supabase.from('estados_personalizados').insert(fila);
   if(r.error)throw r.error;
   setBorrador({...borrador,original:borrador.def.id});setSellado(s=>s+1);setPestana('propios');await recargar();
  }catch(e){setError(mensajeError(e,'No se pudo guardar el estado.'));}finally{setOcupado(false);}
 }
 async function borrar(){
  if(!borrador?.original)return;
  if(!await confirmar({titulo:'Quemar página del grimorio',mensaje:`¿Borrar «${borrador.def.nombre}»? Las habilidades que ya lo usan conservan su copia y siguen funcionando.`,aceptar:'Borrar',peligro:true}))return;
  setOcupado(true);setError('');
  try{const r=await supabase.from('estados_personalizados').delete().eq('id',borrador.original);if(r.error)throw r.error;setBorrador(null);await recargar();}
  catch(e){setError(mensajeError(e,'No se pudo borrar el estado.'));}finally{setOcupado(false);}
 }

 return <main className="ge-pagina">
  <Cabecera kanji="状" migas="Kuroi · Grimorio" titulo="Grimorio de estados" subtitulo="Crea estados combinando primitivas, pruébalos sobre el muñeco y guárdalos. Después los eliges en cualquier habilidad desde el Yunque («Tu grimorio»)."
   acciones={<button type="button" className="ge-boton is-principal" onClick={nuevo}><Plus size={16} aria-hidden="true"/>Forjar estado</button>}>
   <Secciones etiqueta="Colecciones" valor={pestana} onCambio={v=>setPestana(v as 'propios'|'base')} items={[{id:'propios',etiqueta:'Tu grimorio',cuenta:estados.length},{id:'base',etiqueta:'Catálogo base',cuenta:CATALOGO_ESTADOS.length}]}/>
  </Cabecera>
  {errorCarga&&<p role="alert" className="ge-alerta">No se pudo leer el grimorio ({errorCarga}). ¿Falta aplicar la migración <code>grimorio_estados</code>?</p>}
  <SelectorGrimorio actual="estados"/>
  <div className="ge-filtros">
   <label className="ge-buscar"><Search size={16} aria-hidden="true"/><input type="search" placeholder="Buscar estado…" value={busca} onChange={e=>setBusca(e.target.value)} aria-label="Buscar estado"/></label>
   <div className="ge-cats" role="group" aria-label="Categoría">
    <button type="button" aria-pressed={!cat} onClick={()=>setCat('')}>Todas</button>
    {CATEGORIAS_ESTADO.map(c=><button type="button" key={c} aria-pressed={cat===c} onClick={()=>setCat(cat===c?'':c)} style={{'--aura':AURA_CATEGORIA[c]} as CSSProperties}><i aria-hidden="true"/>{NOMBRE_CATEGORIA[c]}</button>)}
   </div>
  </div>
  {pestana==='propios'?<div className="ge-rejilla">
   <button type="button" className="ge-carta ge-nueva" onClick={nuevo}><span className="ge-nueva-cruz" aria-hidden="true"><Plus size={34}/></span><strong>Forjar un estado</strong><small>Desde cero o a partir de uno base</small></button>
   {propios.map((e,i)=><div key={e.id} className="ge-aparece" style={{'--d':i} as CSSProperties}><CartaEstado def={e.def} color={e.color} onClick={()=>abrir(e.def,e.color,e.id)} etiqueta={`Editar ${e.def.nombre}`}/></div>)}
   {cargado&&!estados.length&&<p className="ge-pista ge-vacio-grimorio">Tu grimorio está en blanco. Forja tu primer estado o crea una variante de uno del catálogo base.</p>}
  </div>:<div className="ge-rejilla">
   {base.map((d,i)=><div key={d.id} className="ge-aparece" style={{'--d':i} as CSSProperties}><CartaEstado def={d} color={AURA_CATEGORIA[d.categoria]} base onClick={()=>variante(d)} etiqueta={`Crear variante de ${d.nombre}`} pie={<span className="ge-accion-pie"><Copy size={13} aria-hidden="true"/>Crear variante</span>}/></div>)}
  </div>}

  {borrador&&createPortal(<div className="ge-velo" role="dialog" aria-modal="true" aria-label={borrador.original?`Editar ${borrador.def.nombre}`:'Nuevo estado'} onKeyDown={e=>{if(e.key==='Escape')setBorrador(null);}}>
   <div className="ge-taller yugen-page" style={{'--aura':borrador.color} as CSSProperties}>
    <header className="ge-taller-cab">
     <h2>{borrador.original?'Reescribir estado':'Forjar estado'}</h2>
     <button type="button" className="ge-cerrar" onClick={()=>setBorrador(null)} aria-label="Cerrar" autoFocus><X size={20}/></button>
    </header>
    <div className="ge-taller-cuerpo">
     <aside className="ge-vista">
      <div className="ge-vista-carta">
       <CartaEstado def={borrador.def} color={borrador.color} grande/>
       {sellado>0&&borrador.original&&<span key={sellado} className="ge-sellado" aria-hidden="true">封</span>}
      </div>
      <fieldset className="ge-paleta"><legend>Aura</legend>
       {PALETA.map(c=><button type="button" key={c} aria-label={`Aura ${c}`} aria-pressed={borrador.color===c} style={{background:c}} onClick={()=>setBorrador({...borrador,color:c})}/>)}
       <label className="ge-paleta-libre" title="Otro color"><input type="color" value={borrador.color} onChange={e=>setBorrador({...borrador,color:e.target.value})} aria-label="Elegir otro color"/></label>
      </fieldset>
      <MunecoPruebas key={JSON.stringify(borrador.def)} def={borrador.def} color={borrador.color}/>
     </aside>
     <div className="ge-editor yq-taller"><EditorEstados valor={borrador.def} onChange={cambiarDef}/></div>
    </div>
    <footer className="ge-taller-pie">
     {error&&<p role="alert" className="ge-alerta">{error}</p>}
     {!error&&fallo&&<p className="ge-aviso">⚠ {fallo}</p>}
     {!error&&!fallo&&sellado>0&&borrador.original&&<p role="status" className="ge-ok">Sellado en tu grimorio.</p>}
     <div className="ge-botones">
      {borrador.original&&<button type="button" className="ge-boton is-peligro" disabled={ocupado} onClick={()=>void borrar()}><Trash2 size={16} aria-hidden="true"/>Borrar</button>}
      {borrador.original&&<button type="button" className="ge-boton" disabled={ocupado} onClick={()=>variante(borrador.def,borrador.color)}><Copy size={16} aria-hidden="true"/>Duplicar</button>}
      <button type="button" className="ge-boton is-principal" disabled={ocupado||!!fallo} onClick={()=>void guardar()}><Save size={16} aria-hidden="true"/>{borrador.original?'Guardar cambios':'Sellar en el grimorio'}</button>
     </div>
    </footer>
   </div>
  </div>,document.body)}
 </main>;
}
