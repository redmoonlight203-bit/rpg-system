'use client';
// Esqueletos en el Yunque (plan maestro, Apéndice D · C.5 y C.6): el GM elige el esqueleto de un arma (espada, hacha,
// lanza, arco, bastón, puños o uno propio), ajusta longitud y color y prueba el gesto aquí mismo. También puede crear
// un esqueleto nuevo copiando uno existente; se guarda en la tabla `esqueletos` (solo el GM escribe).
import {useEffect,useState} from 'react';
import {Play} from 'lucide-react';
import AnimacionesArmas from '../../AnimacionesArmas';
import {Fichas,Rueda,Texto,type Opcion} from '../Controles';
import {ESQUELETOS_BASE,FAMILIAS,copiarEsqueleto,validarEsqueleto,esqueletoBase,duracionGesto,type Esqueleto,type FamiliaGesto} from '../../../lib/esqueletos';
import {supabase} from '../../../lib/supabase';
import {mensajeError} from '../../../lib/errores';
import type {EventoVisual} from '../../../lib/combate';
import './defensas.css';

const ICONO:Record<string,string>={espada:'espada',hacha:'escudo',lanza:'arco',arco:'arco',baston:'baston',punos:'vida'};
/** Catálogo del GM (tabla `esqueletos`); si la tabla aún no existe, solo se ven los seis base. */
function useCatalogo(){
 const [propios,setPropios]=useState<Esqueleto[]>([]);
 const [version,setVersion]=useState(0);
 useEffect(()=>{let vivo=true;void Promise.resolve(supabase.from('esqueletos').select('definicion').order('nombre')).then(r=>{if(vivo&&!r.error&&Array.isArray(r.data))setPropios(r.data.map(x=>x.definicion as Esqueleto).filter(e=>!validarEsqueleto(e)));}).catch(()=>{});return ()=>{vivo=false;};},[version]);
 return {propios,recargar:()=>setVersion(v=>v+1)};
}
/** Escena mínima para ver el gesto: actor a la izquierda, objetivo a la derecha. */
export function VistaGesto({esqueleto,ajustes}:{esqueleto:Esqueleto;ajustes?:{longitud?:number;color?:string}}){
 const [evento,setEvento]=useState<EventoVisual|undefined>();
 const def={...esqueleto,longitud_relativa:ajustes?.longitud??esqueleto.longitud_relativa,color:ajustes?.color??esqueleto.color};
 const probar=()=>setEvento({id:crypto.randomUUID(),nombre:def.nombre,dados:[],creado_en:Date.now(),desde:{x:0,y:0},hasta:{x:def.proyectil?3:1,y:0},arma_visual:def.id,esqueleto:def});
 return <div className="yq-esqueleto-vista">
  <div className="yq-esqueleto-escena tactical-board" data-esqueleto={def.id}>
   <span className="yq-esqueleto-actor" style={{left:`${100/8}%`}} aria-hidden="true"/>
   <span className="yq-esqueleto-blanco" style={{left:`${(def.proyectil?3.5:1.5)*100/4}%`}} aria-hidden="true"/>
   <AnimacionesArmas evento={evento} columnas={4} filas={1}/>
  </div>
  <button type="button" className="yq-boton-suave" onClick={probar}><Play size={14} aria-hidden="true"/> Probar gesto ({duracionGesto(def)} ms)</button>
 </div>;
}

export default function EditorEsqueleto({valor,definicion,ajustes,onChange}:{valor?:string;definicion?:Esqueleto;ajustes?:{longitud?:number;color?:string};
 onChange:(v:{esqueleto?:string;esqueleto_def?:Esqueleto;esqueleto_ajustes?:{longitud?:number;color?:string}})=>void}){
 const {propios,recargar}=useCatalogo();
 const [creando,setCreando]=useState<Esqueleto|null>(null);
 const [aviso,setAviso]=useState('');
 const lista=[...ESQUELETOS_BASE,...propios.filter(p=>!esqueletoBase(p.id))];
 // El esqueleto propio guardado en el arma siempre aparece, aunque el catálogo aún no lo haya traído.
 const todos=definicion&&!lista.some(e=>e.id===definicion.id)?[...lista,definicion]:lista;
 const actual=definicion||esqueletoBase(valor)||propios.find(p=>p.id===valor);
 const opciones:Opcion<string>[]=[...todos.map(e=>({valor:e.id,nombre:e.nombre,icono:ICONO[e.base||e.id]||'espada',ayuda:FAMILIAS[e.familia_gesto]})),{valor:'__nuevo',nombre:'Nuevo esqueleto',icono:'libro',ayuda:'Copia uno y cambia su gesto.'}];
 function elegir(id:string){
  if(id==='__nuevo'){const base=actual||ESQUELETOS_BASE[0];setCreando(copiarEsqueleto(base,`${base.id}_propio`,`${base.nombre} propio`));return;}
  const e=todos.find(x=>x.id===id);
  onChange({esqueleto:id,esqueleto_def:e&&!esqueletoBase(id)?e:undefined,esqueleto_ajustes:undefined});
 }
 async function guardarNuevo(){
  if(!creando)return;const error=validarEsqueleto(creando);if(error){setAviso(error);return;}
  const r=await supabase.from('esqueletos').upsert({id:creando.id,nombre:creando.nombre,definicion:creando});
  if(r.error){setAviso(mensajeError(r.error,'Solo el GM puede crear esqueletos.'));return;}
  onChange({esqueleto:creando.id,esqueleto_def:creando,esqueleto_ajustes:undefined});setCreando(null);setAviso('');recargar();
 }
 const setC=(p:Partial<Esqueleto>)=>creando&&setCreando({...creando,...p});
 return <section className="yq-esqueleto" aria-label="Esqueleto de la animación">
  <Fichas etiqueta="Esqueleto de la animación" opciones={opciones} valor={creando?'__nuevo':actual?.id} onChange={elegir} columnas={3}/>
  {!creando&&actual&&<>
   <div className="yq-fila">
    <label>Longitud<Rueda nombre="longitud" etiqueta="Longitud en casillas" valor={ajustes?.longitud??actual.longitud_relativa} min={.3} max={3} paso={.1} onChange={longitud=>onChange({esqueleto:actual.id,esqueleto_def:definicion,esqueleto_ajustes:{...ajustes,longitud}})} compacta/></label>
    <label>Color de la estela<input type="color" value={ajustes?.color||actual.color||'#f1e4bd'} onChange={e=>onChange({esqueleto:actual.id,esqueleto_def:definicion,esqueleto_ajustes:{...ajustes,color:e.target.value}})}/></label>
   </div>
   <VistaGesto esqueleto={actual} ajustes={ajustes}/>
  </>}
  {creando&&<fieldset className="yq-primitiva">
   <header>Nuevo esqueleto (solo el GM)</header>
   <Texto etiqueta="Nombre" valor={creando.nombre} onChange={nombre=>setC({nombre,id:nombre.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40)||'esqueleto'})}/>
   <Fichas etiqueta="Gesto" opciones={(Object.keys(FAMILIAS) as FamiliaGesto[]).map(f=>({valor:f,nombre:FAMILIAS[f]}))} valor={creando.familia_gesto} onChange={familia_gesto=>setC({familia_gesto,anclas:familia_gesto==='impacto_corto'?creando.anclas:creando.anclas.filter(a=>a.id!=='objeto'),proyectil:familia_gesto==='tiro'||undefined})} tono="arcano"/>
   <div className="yq-fila">{(['preparacion','impacto','recuperacion'] as const).map(f=><label key={f}>{f==='preparacion'?'Preparación':f==='impacto'?'Impacto':'Recuperación'} (ms)<Rueda nombre={f} etiqueta={`Fase de ${f}`} valor={creando.fases[f]} min={f==='impacto'?30:0} max={1500} paso={10} onChange={v=>setC({fases:{...creando.fases,[f]:v}})} compacta/></label>)}</div>
   <div className="yq-fila">{creando.anclas.map((a,i)=><label key={a.id}>{a.id} x<Rueda nombre={`ancla_${a.id}`} etiqueta={`Ancla ${a.id}, horizontal`} valor={a.x} min={0} max={96} onChange={x=>setC({anclas:creando.anclas.map((b,j)=>j===i?{...b,x}:b)})} compacta/></label>)}</div>
   <label className="yq-campo"><span>Longitud (casillas)</span><Rueda nombre="longitud_nueva" etiqueta="Longitud del esqueleto" valor={creando.longitud_relativa} min={.3} max={3} paso={.1} onChange={longitud_relativa=>setC({longitud_relativa})} compacta/></label>
   <VistaGesto esqueleto={creando}/>
   {aviso&&<p role="alert" className="mp-error">{aviso}</p>}
   <div className="yq-fila"><button type="button" className="yq-boton-suave" onClick={()=>void guardarNuevo()}>Guardar esqueleto</button><button type="button" className="yq-boton-suave" onClick={()=>{setCreando(null);setAviso('');}}>Cancelar</button></div>
  </fieldset>}
 </section>;
}
