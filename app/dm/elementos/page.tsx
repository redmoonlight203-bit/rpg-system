'use client';
// Grimorio de elementos: variantes de los elementos base (Fuego infernal, Escarcha negra…) con sus propios dados,
// armadura ignorada, estados al impactar y cadena. Se copian en las habilidades que los usan (elemento_def).
import {useMemo,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {Copy,Plus,Save,Search,Trash2,X} from 'lucide-react';
import {supabase} from '../../../lib/supabase';
import {mensajeError} from '../../../lib/errores';
import {Cabecera,Secciones} from '../../../components/layout/Cabecera';
import {useDialogo} from '../../../components/Dialogo';
import EditorElemento from '../../../components/grimorio/EditorElemento';
import CartaElemento from '../../../components/grimorio/CartaElemento';
import GolpePrueba from '../../../components/grimorio/GolpePrueba';
import SelectorGrimorio from '../../../components/grimorio/SelectorGrimorio';
import {CATALOGO_ELEMENTOS,BASES_ELEMENTO,elementoBase,elementoVacio,type DefinicionElemento,type ElementoBase} from '../../../lib/elementos';
import {colorElemento,idElementoLibre,validarElementoGuardado} from '../../../lib/estados-biblioteca';
import {useGrimorioElementos} from '../../../lib/useGrimorioElementos';
import '../../../components/yunque/yunque.css';
import '../estados/grimorio.css';

type Borrador={def:DefinicionElemento;color:string;original:string|null};
const PALETA=['#e8643c','#ff3355','#4fa3e0','#2de0c0','#f2d74a','#9fe3f2','#f4dfae','#9d8ae0','#6b2fd6','#6cc3a0'];

export default function GrimorioElementos(){
 const {confirmar}=useDialogo();
 const {elementos,cargado,error:errorCarga,recargar}=useGrimorioElementos();
 const [pestana,setPestana]=useState<'propios'|'base'>('propios'),[busca,setBusca]=useState(''),[base,setBase]=useState<ElementoBase|''>('');
 const [borrador,setBorrador]=useState<Borrador|null>(null),[ocupado,setOcupado]=useState(false),[error,setError]=useState(''),[sellado,setSellado]=useState(0);
 const ids=useMemo(()=>elementos.map(e=>e.id),[elementos]);
 const filtrar=(d:DefinicionElemento)=>(!base||d.base===base)&&(!busca.trim()||d.nombre.toLowerCase().includes(busca.trim().toLowerCase()));
 const propios=elementos.filter(e=>filtrar(e.def)),catalogo=CATALOGO_ELEMENTOS.filter(filtrar);

 const abrir=(def:DefinicionElemento,color:string,original:string|null)=>{setError('');setBorrador({def:structuredClone(def),color,original});};
 const nuevo=(b:ElementoBase='fuego')=>{const d=elementoVacio(idElementoLibre('elemento_nuevo',ids),b);abrir(d,colorElemento(d),null);};
 const variante=(d:DefinicionElemento,color?:string)=>abrir({...structuredClone(d),id:idElementoLibre(d.id+'_variante',ids),nombre:d.nombre+' (variante)'},color||colorElemento(d),null);
 const cambiarDef=(def:DefinicionElemento)=>setBorrador(b=>b&&{...b,def:{...def,id:b.original??idElementoLibre(def.id,ids)},color:def.color&&def.color!==b.def.color?def.color:b.color});
 const otros=ids.filter(i=>i!==borrador?.original);
 const fallo=borrador?validarElementoGuardado(borrador.def,otros):null;

 async function guardar(){
  if(!borrador||fallo)return;setOcupado(true);setError('');
  try{
   const definicion={...borrador.def,color:borrador.color};
   const r=borrador.original?await supabase.from('elementos_personalizados').update({definicion,color:borrador.color}).eq('id',borrador.original):await supabase.from('elementos_personalizados').insert({id:definicion.id,definicion,color:borrador.color});
   if(r.error)throw r.error;
   setBorrador({...borrador,def:definicion,original:definicion.id});setSellado(s=>s+1);setPestana('propios');await recargar();
  }catch(e){setError(mensajeError(e,'No se pudo guardar el elemento.'));}finally{setOcupado(false);}
 }
 async function borrar(){
  if(!borrador?.original)return;
  if(!await confirmar({titulo:'Quemar página del grimorio',mensaje:`¿Borrar «${borrador.def.nombre}»? Las habilidades que ya lo usan conservan su copia y siguen funcionando.`,aceptar:'Borrar',peligro:true}))return;
  setOcupado(true);setError('');
  try{const r=await supabase.from('elementos_personalizados').delete().eq('id',borrador.original);if(r.error)throw r.error;setBorrador(null);await recargar();}
  catch(e){setError(mensajeError(e,'No se pudo borrar el elemento.'));}finally{setOcupado(false);}
 }

 return <main className="ge-pagina">
  <Cabecera kanji="元" migas="Kuroi · Grimorio" titulo="Grimorio de elementos" subtitulo="Crea variantes de los elementos: más dados, armadura ignorada, estados al impactar o daño en cadena. Cada variante se apoya en un elemento base, así las inmunidades y Mojado siguen funcionando."
   acciones={<button type="button" className="ge-boton is-principal" onClick={()=>nuevo(base||'fuego')}><Plus size={16} aria-hidden="true"/>Forjar elemento</button>}>
   <Secciones etiqueta="Colecciones" valor={pestana} onCambio={v=>setPestana(v as 'propios'|'base')} items={[{id:'propios',etiqueta:'Tus elementos',cuenta:elementos.length},{id:'base',etiqueta:'Elementos base',cuenta:CATALOGO_ELEMENTOS.length}]}/>
  </Cabecera>
  <SelectorGrimorio actual="elementos"/>
  {errorCarga&&<p role="alert" className="ge-alerta">No se pudo leer el grimorio ({errorCarga}). ¿Falta aplicar la migración <code>grimorio_elementos</code>?</p>}
  <div className="ge-filtros">
   <label className="ge-buscar"><Search size={16} aria-hidden="true"/><input type="search" placeholder="Buscar elemento…" value={busca} onChange={e=>setBusca(e.target.value)} aria-label="Buscar elemento"/></label>
   <div className="ge-cats" role="group" aria-label="Elemento base">
    <button type="button" aria-pressed={!base} onClick={()=>setBase('')}>Todos</button>
    {BASES_ELEMENTO.map(b=><button type="button" key={b} aria-pressed={base===b} onClick={()=>setBase(base===b?'':b)} style={{'--aura':elementoBase(b)!.color} as CSSProperties}><i aria-hidden="true"/>{elementoBase(b)!.nombre}</button>)}
   </div>
  </div>
  {pestana==='propios'?<div className="ge-rejilla">
   <button type="button" className="ge-carta ge-nueva" onClick={()=>nuevo(base||'fuego')}><span className="ge-nueva-cruz" aria-hidden="true"><Plus size={34}/></span><strong>Forjar un elemento</strong><small>Una variante con reglas propias</small></button>
   {propios.map((e,i)=><div key={e.id} className="ge-aparece" style={{'--d':i} as CSSProperties}><CartaElemento def={e.def} color={e.color} onClick={()=>abrir(e.def,e.color,e.id)} etiqueta={`Editar ${e.def.nombre}`}/></div>)}
   {cargado&&!elementos.length&&<p className="ge-pista ge-vacio-grimorio">Aún no hay elementos propios. Empieza por una variante de los elementos base.</p>}
  </div>:<div className="ge-rejilla">
   {catalogo.map((d,i)=><div key={d.id} className="ge-aparece" style={{'--d':i} as CSSProperties}><CartaElemento def={d} color={colorElemento(d)} base onClick={()=>variante(d)} etiqueta={`Crear variante de ${d.nombre}`} pie={<span className="ge-accion-pie"><Copy size={13} aria-hidden="true"/>Crear variante</span>}/></div>)}
  </div>}

  {borrador&&createPortal(<div className="ge-velo" role="dialog" aria-modal="true" aria-label={borrador.original?`Editar ${borrador.def.nombre}`:'Nuevo elemento'} onKeyDown={e=>{if(e.key==='Escape')setBorrador(null);}}>
   <div className="ge-taller yugen-page" style={{'--aura':borrador.color} as CSSProperties}>
    <header className="ge-taller-cab">
     <h2>{borrador.original?'Reescribir elemento':'Forjar elemento'}</h2>
     <button type="button" className="ge-cerrar" onClick={()=>setBorrador(null)} aria-label="Cerrar" autoFocus><X size={20}/></button>
    </header>
    <div className="ge-taller-cuerpo">
     <aside className="ge-vista">
      <div className="ge-vista-carta">
       <CartaElemento def={borrador.def} color={borrador.color} grande/>
       {sellado>0&&borrador.original&&<span key={sellado} className="ge-sellado" aria-hidden="true">封</span>}
      </div>
      <fieldset className="ge-paleta"><legend>Color</legend>
       {PALETA.map(c=><button type="button" key={c} aria-label={`Color ${c}`} aria-pressed={borrador.color===c} style={{background:c}} onClick={()=>setBorrador({...borrador,color:c})}/>)}
       <label className="ge-paleta-libre" title="Otro color"><input type="color" value={borrador.color} onChange={e=>setBorrador({...borrador,color:e.target.value})} aria-label="Elegir otro color"/></label>
      </fieldset>
      <GolpePrueba key={JSON.stringify(borrador.def)} def={borrador.def} color={borrador.color}/>
     </aside>
     <div className="ge-editor yq-taller"><EditorElemento valor={borrador.def} onChange={cambiarDef}/></div>
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
