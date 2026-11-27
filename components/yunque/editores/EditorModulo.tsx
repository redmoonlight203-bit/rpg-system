'use client';
// Editor de los módulos de una acción (alcance, salvación, estado, reacción, transformación, recurso, animación,
// tabla de armas) y de los nodos únicos de la creación (invocación y requisitos). Los editores clásicos de la Forja
// se reutilizan dentro de `.yq-legado`, que los viste con la paleta del lienzo.
import EditorAlcance from '../../EditorAlcance';
import EditorReaccion from '../../EditorReaccion';
import EditorInvocacion from '../../EditorInvocacion';
import RequisitosYunque from '../../RequisitosYunque';
import {EditorTransformacion} from '../../EditorTransformacion';
import {TablaArmas} from '../../TablaArmas';
import EditorVision from './EditorVision';
import {Fichas,Rueda,type Opcion} from '../Controles';
import {SelectorRegla} from '../../SelectorRegla';
import EditorEstadoAccion from './EditorEstadoAccion';
import {reaccionDe} from '../../../lib/combate';
import {tipoDe,type Efecto} from '../../../lib/creacion';
import {linaje} from '../../../lib/estadisticas';
import type {ContextoTaller} from '../contexto';
import type {EditorNodoProps} from './EditorAccion';
import {normalizarReaccion} from "../../../lib/reacciones";

const EXITOS:Opcion<NonNullable<Efecto['salvacion']>['exito']>[]=[
 {valor:'mitad',nombre:'Mitad del daño',icono:'escudo',ayuda:'Si la supera, recibe la mitad'},
 {valor:'anula',nombre:'Lo evita',icono:'ojo',ayuda:'Si la supera, no le afecta'},
 {valor:'solo_estado',nombre:'Evita el estado',icono:'fuego',ayuda:'Si la supera, recibe el daño pero no el estado'},
];
const limpio=(e:Efecto):Efecto=>Object.fromEntries(Object.entries(e).filter(([,v])=>v!==undefined)) as Efecto;
type Props=EditorNodoProps&{ctx:ContextoTaller;avisar:(texto:string)=>void;onAnimacion?:(etapa?:string)=>void};

export default function EditorModulo({b,nodo,operar,ctx,avisar,onAnimacion}:Props){
 if(nodo.tipo==='invocacion'){
  const atributos=[...new Map(ctx.atributos.map(a=>[a.clave,{clave:a.clave,etiqueta:a.etiqueta,valor_defecto:a.valor_defecto}])).values()];
  return <div className="yq-editor yq-legado">
   <EditorInvocacion value={b.invocacion} creaciones={ctx.creaciones.map(c=>({...c,tipo_creacion:c.tipo_creacion??tipoDe(c,ctx.categorias)}))} atributos={atributos}
    onChange={v=>{if(v)operar({op:'fijar',ruta:['invocacion'],valor:v});else operar({op:'quitar',nodo:nodo.id});}}
    crearDentro={()=>avisar('Crear una criatura dentro de esta habilidad llega con el Yunque completo, desde La Forja.')}/>
  </div>;
 }
 if(nodo.tipo==='requisitos'){
  const razas=ctx.categorias.filter(c=>linaje(ctx.categorias,c.clave)[0]?.clave==='razas'&&c.clave!=='razas').map(c=>({clave:c.clave,nombre:c.nombre}));
  const habilidades=ctx.creaciones.filter(c=>(c.tipo_creacion??tipoDe(c,ctx.categorias))==='habilidad'&&c.id!==b.id).map(c=>({id:c.id,nombre:c.nombre}));
  return <div className="yq-editor yq-legado">
   <RequisitosYunque value={b.requisitos_uso||{}} onChange={v=>operar({op:'fijar',ruta:['requisitos_uso'],valor:v})} razas={razas} habilidades={habilidades}
    atributos={[...new Map(ctx.atributos.map(a=>[a.clave,{clave:a.clave,etiqueta:a.etiqueta}])).values()]}/>
  </div>;
 }
 const i=nodo.ruta[1] as number,e=b.efectos[i];
 if(!e)return null;
 const patch=(p:Partial<Efecto>)=>operar({op:'fijar',ruta:['efectos',i],valor:limpio({...e,...p})});
 switch(nodo.tipo){
  case 'alcance':return <div className="yq-editor yq-legado"><EditorAlcance efecto={e} onChange={patch}/></div>;
  case 'salvacion':{
   const s=e.salvacion;if(!s)return null;
   const set=(p:Partial<typeof s>)=>patch({salvacion:{...s,...p}});
   return <div className="yq-editor">
    <label className="yq-campo yq-cd"><span>Dificultad que debe superar</span><span className="yq-cd-escudo"><Rueda nombre="cd" etiqueta="Dificultad de la salvación" valor={s.cd} min={1} max={1000} onChange={cd=>set({cd:Math.round(cd)})}/></span></label>
    <SelectorRegla tipo="atributo" etiqueta="Bono con el que tira" valor={s.atributo} onChange={atributo=>set({atributo})}/>
    <Fichas etiqueta="Si la supera" opciones={EXITOS} valor={s.exito} onChange={exito=>set({exito})} tono="arcano"/>
   </div>;
  }
  case 'estado':return <EditorEstadoAccion e={e} patch={patch}/>;
  case 'reaccion':{
   const r=reaccionDe(normalizarReaccion(e));
   return <div className="yq-editor yq-legado">
    {e.defensa&&!e.reaccion&&<p className="yq-nota">Defensa clásica «{e.defensa}». Al editarla se guarda como reacción.</p>}
    {onAnimacion&&<button type="button" className="yq-boton" onClick={()=>onAnimacion()}>Editar animación de la reacción</button>}
    <EditorReaccion valor={r??undefined} costeAccion={e.coste_ph||0} onPlantilla={k=>operar({op:'desplegar',plantilla:k})} onChange={v=>{if(v)patch({reaccion:v,defensa:undefined});else operar({op:'quitar',nodo:nodo.id});}}/>
   </div>;
  }
  case 'transformacion':return e.transformacion?<div className="yq-editor yq-legado"><EditorTransformacion key={e.transformacion.id} efecto={e} acciones={b.efectos} onAnimacion={onAnimacion} onChange={transformacion=>patch({transformacion})}/></div>
   :<p className="yq-nota">Esta transformación aún no tiene etapas.</p>;
  case 'recurso':{
   const r=e.recurso;if(!r)return null;
   return <div className="yq-editor">
    {e.efecto==='dano'&&<label><input type="checkbox" checked={!!r.descargar} onChange={v=>patch({recurso:{...r,descargar:v.target.checked}})}/> Vaciar la reserva y sumar su saldo al daño de cada impacto</label>}
    <SelectorRegla tipo="recurso" crear etiqueta="Reserva" ayuda="Las acciones, reacciones y rasgos con la misma reserva comparten el saldo." valor={r.nombre} onChange={nombre=>patch({recurso:{...r,nombre}})}/>
    <div className="yq-costes">
     <label><span>Saldo inicial</span><Rueda nombre="inicial" etiqueta="Saldo inicial del encuentro" valor={r.inicial} min={-9999} max={9999} onChange={inicial=>patch({recurso:{...r,inicial}})} compacta/></label>
     <label><span>Cambio por uso</span><Rueda nombre="cambio" etiqueta="Cambio por uso (positivo suma, negativo resta)" valor={r.cambio} min={-9999} max={9999} onChange={cambio=>patch({recurso:{...r,cambio}})} compacta/></label>
    </div>
   </div>;
  }
  case 'vision':return e.vision?<EditorVision vision={e.vision} efecto={e} onChange={vision=>patch({vision})}/>:null;
  case 'tabla_armas':{
   const armas=ctx.creaciones.filter(c=>(c.tipo_creacion??tipoDe(c,ctx.categorias))==='objeto'&&['mano','dos_manos'].includes(c.slot_tipo));
   return <div className="yq-editor yq-legado"><TablaArmas efecto={e} armas={armas} onChange={tabla=>{if(tabla)patch({tabla_armas:tabla});else operar({op:'quitar',nodo:nodo.id});}}/></div>;
  }
 }
 return null;
}
