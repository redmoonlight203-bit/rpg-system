'use client';
// Editor de elementos: parte de un elemento base y ajusta lo que hace al golpear. Usa los controles del Yunque.
import {Plus,Trash2} from 'lucide-react';
import {Fichas,Rueda,Texto,Interruptor,type Opcion} from '../yunque/Controles';
import {CATALOGO_ESTADOS} from '../../lib/estados';
import IconoYugen from '../IconoYugen';
import SelectorIconoYugen from '../SelectorIconoYugen';
import {CATALOGO_ELEMENTOS,BASES_ELEMENTO,elementoBase,describirElemento,validarDefinicionElemento,type DefinicionElemento,type ElementoBase,type EfectoImpacto} from '../../lib/elementos';
import {useGrimorioEstados} from '../../lib/useGrimorioEstados';
import {useGrimorioElementos} from '../../lib/useGrimorioElementos';
import '../yunque/editores/defensas.css';

const BASES:Opcion<ElementoBase>[]=BASES_ELEMENTO.map(b=>({valor:b,nombre:elementoBase(b)!.nombre,icono:elementoBase(b)!.icono,ayuda:'Las inmunidades, resistencias y reacciones (Mojado) lo tratan como '+elementoBase(b)!.nombre.toLowerCase()+'.'}));
export const idDe=(nombre:string)=>nombre.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/^(\d)/,'e_$1').slice(0,60)||'elemento';

export default function EditorElemento({valor,onChange}:{valor:DefinicionElemento;onChange:(d:DefinicionElemento)=>void}){
 const d=valor,error=validarDefinicionElemento(d);
 const {estados:grimorio}=useGrimorioEstados(false),{elementos}=useGrimorioElementos(false);
 const set=(p:Partial<DefinicionElemento>)=>onChange({...d,...p});
 const impactos=d.al_impactar||[];
 const setImpacto=(i:number,p:Partial<EfectoImpacto>)=>set({al_impactar:impactos.map((x,j)=>j===i?{...x,...p}:x)});
 const elegirEstado=(i:number,v:string)=>{const g=grimorio.find(x=>'g:'+x.id===v);setImpacto(i,g?{estado:g.id,estado_def:structuredClone(g.def)}:{estado:v,estado_def:undefined});};
 return <section className="yq-estado-editor" aria-label="Editor de elemento">
  <label className="yq-campo"><span>Partir de</span><select value="" onChange={e=>{const v=e.target.value;const p=elementos.find(x=>'g:'+x.id===v)?.def||CATALOGO_ELEMENTOS.find(x=>x.id===v);if(p)onChange({...structuredClone(p),id:d.id,nombre:d.nombre,color:p.color});}}>
   <option value="">Copiar las reglas de…</option>
   <optgroup label="Elementos base">{CATALOGO_ELEMENTOS.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</optgroup>
   {elementos.length>0&&<optgroup label="Tu grimorio">{elementos.map(x=><option key={x.id} value={'g:'+x.id}>{x.def.nombre}</option>)}</optgroup>}
  </select></label>
  <Texto etiqueta="Nombre del elemento" valor={d.nombre} onChange={nombre=>set({nombre,id:idDe(nombre)})} placeholder="Fuego infernal, Escarcha negra…"/>
  <details className="yq-estado-icono"><summary><IconoYugen id={d.icono||elementoBase(d.base)?.icono||'fuego'} size={22}/>Icono</summary>
   <SelectorIconoYugen value={d.icono||''} automatico={elementoBase(d.base)?.icono||'fuego'} onChange={icono=>set({icono:icono||undefined})}/>
  </details>
  <Fichas etiqueta="Se comporta como (base)" opciones={BASES} valor={d.base} onChange={base=>set({base})} tono="arcano" columnas={3}/>
  <Interruptor etiqueta="Dados de daño extra" valor={!!d.dados_extra} onChange={v=>set({dados_extra:v?{cantidad:1,caras:4}:null})}/>
  {d.dados_extra&&<div className="yq-fila">
   <label>Dados<Rueda nombre="cantidad" etiqueta="Dados extra" valor={d.dados_extra.cantidad} min={1} max={20} onChange={cantidad=>set({dados_extra:{...d.dados_extra!,cantidad}})} compacta/></label>
   <label>Caras<Rueda nombre="caras" etiqueta="Caras" valor={d.dados_extra.caras} valores={[2,4,6,8,10,12,20]} onChange={caras=>set({dados_extra:{...d.dados_extra!,caras}})} compacta/></label>
  </div>}
  <label className="yq-campo"><span>Armadura que ignora</span><Rueda nombre="ignora_armadura" etiqueta="Armadura ignorada" valor={d.ignora_armadura||0} min={0} max={50} onChange={v=>set({ignora_armadura:v||undefined})} compacta/></label>
  <div className="yq-primitivas">
   {impactos.map((x,i)=><fieldset key={i} className="yq-primitiva">
    <header>Al impactar<button type="button" aria-label="Quitar estado al impactar" onClick={()=>set({al_impactar:impactos.filter((_,j)=>j!==i)})}><Trash2 size={14} aria-hidden="true"/></button></header>
    <label className="yq-campo"><span>Estado</span><select value={x.estado_def?'g:'+x.estado:x.estado} onChange={e=>elegirEstado(i,e.target.value)}>
     <optgroup label="Catálogo base">{CATALOGO_ESTADOS.map(s=><option key={s.id} value={s.id}>{s.nombre.split(':')[0]}</option>)}</optgroup>
     {grimorio.length>0&&<optgroup label="Tu grimorio de estados">{grimorio.map(s=><option key={s.id} value={'g:'+s.id}>{s.def.nombre}</option>)}</optgroup>}
    </select></label>
    <Interruptor etiqueta="El objetivo puede evitarlo con una salvación" valor={!!x.salvacion} onChange={v=>setImpacto(i,{salvacion:v?{cd:12,atributo:'salvacion'}:null})}/>
    {x.salvacion&&<label className="yq-campo"><span>CD</span><Rueda nombre="cd" etiqueta="CD de la salvación" valor={x.salvacion.cd} min={1} max={100} onChange={cd=>setImpacto(i,{salvacion:{...x.salvacion!,cd}})} compacta/></label>}
   </fieldset>)}
  </div>
  {impactos.length<4&&<button type="button" className="ge-anadir" onClick={()=>set({al_impactar:[...impactos,{estado:'aturdido',salvacion:{cd:12,atributo:'salvacion'}}]})}><Plus size={15} aria-hidden="true"/>Añadir estado al impactar</button>}
  <Interruptor etiqueta="Salta a quien esté en contacto con el objetivo" valor={!!d.cadena} onChange={v=>set({cadena:v?{dano:3}:null})}/>
  {d.cadena&&<label className="yq-campo"><span>Daño en cadena</span><Rueda nombre="cadena" etiqueta="Daño en cadena" valor={d.cadena.dano} min={1} max={100} onChange={dano=>set({cadena:{dano}})} compacta/></label>}
  <p className="yq-estado-frase" role="status">{error?`⚠ ${error}`:describirElemento(d)}</p>
 </section>;
}
