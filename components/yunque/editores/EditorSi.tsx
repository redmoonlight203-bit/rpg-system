'use client';
// Editor de una condición («Si»): el tipo como fichas; «Todas», «Alguna» y «No» agrupan creando nodos «Si» hijos.
import {SelectorRegla} from '../../SelectorRegla';
import {Fichas,Interruptor,Rueda,type Opcion} from '../Controles';
import {condicionClara} from '../../../lib/descripciones';
import type {CondicionRegla,Sujeto} from '../../../lib/reglas';
import {leerRuta} from '../../../lib/yunque-grafo';
import type {EditorNodoProps} from './EditorAccion';

export const SUJETOS:Opcion<Sujeto>[]=[
 {valor:'yo',nombre:'Portador',icono:'humano',ayuda:'Quien tiene esta habilidad u objeto'},
 {valor:'actor',nombre:'Autor',icono:'espada',ayuda:'Quien provocó el evento (por ejemplo, el atacante)'},
 {valor:'objetivo',nombre:'Objetivo',icono:'ojo',ayuda:'Quien recibe el evento (por ejemplo, la víctima)'},
];
export const ELEMENTOS_REGLA:Opcion<string>[]=[
 {valor:'ninguno',nombre:'Sin elemento',icono:'yugen'},{valor:'fuego',nombre:'Fuego',icono:'fuego'},{valor:'agua',nombre:'Agua',icono:'agua'},
 {valor:'hielo',nombre:'Hielo',icono:'hielo'},{valor:'electricidad',nombre:'Rayo',icono:'rayo'},{valor:'luz_sagrada',nombre:'Luz sagrada',icono:'corona'},
];
type Hoja=Exclude<CondicionRegla['tipo'],'todas'|'alguna'|'no'>;
const TIPOS:Opcion<Hoja>[]=[
 {valor:'siempre',nombre:'Siempre',icono:'yugen',ayuda:'Sin condición adicional'},
 {valor:'comparar',nombre:'Comparar',icono:'vida',ayuda:'Un atributo o recurso frente a un valor'},
 {valor:'estado',nombre:'Tiene estado',icono:'alma',ayuda:'Tiene un estado o forma'},
 {valor:'elemento',nombre:'Elemento',icono:'fuego',ayuda:'El ataque es de un elemento'},
 {valor:'probabilidad',nombre:'Probabilidad',icono:'ojo',ayuda:'Un porcentaje de azar'},
 {valor:'estado_terminado',nombre:'Estado terminado',icono:'libro',ayuda:'Acaba de terminar un estado o forma'},
];
const OPERADORES:Opcion<'<'|'<='|'='|'>='|'>'>[]=[{valor:'<',nombre:'<',ayuda:'menor que'},{valor:'<=',nombre:'≤',ayuda:'menor o igual'},{valor:'=',nombre:'=',ayuda:'igual'},{valor:'>=',nombre:'≥',ayuda:'mayor o igual'},{valor:'>',nombre:'>',ayuda:'mayor que'}];
const sujetoDe=(c:CondicionRegla):Sujeto=>c.tipo==='comparar'||c.tipo==='estado'?c.sujeto:'yo';
function nuevaHoja(t:Hoja,antes:CondicionRegla):CondicionRegla{
 const sujeto=sujetoDe(antes);
 switch(t){
  case 'siempre':return {tipo:'siempre'};
  case 'comparar':return {tipo:'comparar',sujeto,atributo:'vida_actual',operador:'<',valor:50,porcentaje:true};
  case 'estado':return {tipo:'estado',sujeto,estado:'furia'};
  case 'elemento':return {tipo:'elemento',elemento:'fuego'};
  case 'probabilidad':return {tipo:'probabilidad',porcentaje:50};
  case 'estado_terminado':return {tipo:'estado_terminado',clave:'furia'};
 }
}
/** Formulario de una condición hoja (también lo usa el efecto «Condicional»). */
export function FormCondicion({c,onChange}:{c:CondicionRegla;onChange:(c:CondicionRegla)=>void}){
 switch(c.tipo){
  case 'comparar':return <>
   <Fichas etiqueta="De quién" opciones={SUJETOS} valor={c.sujeto} onChange={sujeto=>onChange({...c,sujeto})}/>
   <SelectorRegla tipo="atributo" etiqueta="Qué valor" valor={c.atributo} onChange={atributo=>onChange({...c,atributo})}/>
   <div className="yq-comparar">
    <Fichas etiqueta="Comparación" opciones={OPERADORES} valor={c.operador} onChange={operador=>onChange({...c,operador})} tono="carmesi"/>
    <label className="yq-comparar-valor"><span>Valor</span><Rueda nombre="valor" etiqueta="Valor de la comparación" valor={c.valor} min={c.porcentaje?0:-999999} max={c.porcentaje?100:999999} paso={c.porcentaje?5:1} onChange={valor=>onChange({...c,valor})} prefijo={null}/>{c.porcentaje&&<b>%</b>}</label>
   </div>
   {c.porcentaje&&<div className="yq-umbral" aria-hidden="true"><i style={{width:`${Math.min(100,Math.max(0,c.valor))}%`}}/><span style={{left:`${Math.min(100,Math.max(0,c.valor))}%`}}/></div>}
   <Interruptor etiqueta="Como porcentaje del máximo" valor={!!c.porcentaje} onChange={porcentaje=>onChange({...c,porcentaje,valor:porcentaje?Math.min(100,Math.max(0,c.valor)):c.valor})}/>
  </>;
  case 'estado':return <>
   <Fichas etiqueta="Quién" opciones={SUJETOS} valor={c.sujeto} onChange={sujeto=>onChange({...c,sujeto})}/>
   <SelectorRegla tipo="estado" etiqueta="Estado o forma" valor={c.estado} onChange={estado=>onChange({...c,estado})}/>
  </>;
  case 'elemento':return <Fichas etiqueta="Elemento del ataque" opciones={ELEMENTOS_REGLA} valor={c.elemento} onChange={elemento=>onChange({...c,elemento})} tono="arcano"/>;
  case 'probabilidad':return <div className="yq-probabilidad">
   <Rueda nombre="porcentaje" etiqueta="Probabilidad en porcentaje" valor={c.porcentaje} min={0} max={100} paso={5} onChange={porcentaje=>onChange({...c,porcentaje:Math.round(porcentaje)})}/><b>%</b>
   <div className="yq-umbral is-azar" aria-hidden="true"><i style={{width:`${c.porcentaje}%`}}/></div>
  </div>;
  case 'estado_terminado':return <SelectorRegla tipo="estado" etiqueta="Estado o forma que termina" valor={c.clave} onChange={clave=>onChange({...c,clave})}/>;
  default:return null;
 }
}
const leer=leerRuta;

export default function EditorSi({b,nodo,operar}:EditorNodoProps){
 const c=leer(b,nodo.ruta) as CondicionRegla|undefined;
 if(!c)return null;
 const fijar=(v:CondicionRegla)=>operar({op:'fijar',ruta:nodo.ruta,valor:v});
 if(c.tipo==='todas'||c.tipo==='alguna'||c.tipo==='no'){
  const hijos=c.tipo==='no'?[c.condicion]:c.condiciones;
  return <div className="yq-editor">
   {c.tipo!=='no'?<Fichas etiqueta="Grupo" opciones={[{valor:'todas',nombre:'Todas',icono:'corona',ayuda:'Deben cumplirse todas'},{valor:'alguna',nombre:'Alguna',icono:'ojo',ayuda:'Basta con una'}] as Opcion<'todas'|'alguna'>[]} valor={c.tipo} onChange={tipo=>fijar({tipo,condiciones:c.condiciones})} tono="carmesi"/>
    :<p className="yq-nota">Se cumple cuando la condición de abajo <b>no</b> se cumple.</p>}
   <p className="yq-nota">{hijos.length===1?'1 condición dentro':`${hijos.length} condiciones dentro`}. Arrastra más desde el Grimorio hasta este nodo.</p>
   <div className="yq-botonera">
    {(c.tipo!=='no'||c.condicion.tipo==='siempre')&&<button type="button" className="yq-boton" onClick={()=>operar({op:'agregar',tipo:'si',padre:nodo.id})}>+ Condición</button>}
    <button type="button" className="yq-boton" disabled={hijos.length>1} title={hijos.length>1?'Quita condiciones hasta dejar una':undefined} onClick={()=>fijar(hijos[0]??{tipo:'siempre'})}>{c.tipo==='no'?'Quitar la negación':'Deshacer el grupo'}</button>
   </div>
  </div>;
 }
 return <div className="yq-editor">
  <Fichas etiqueta="Condición" opciones={TIPOS} valor={c.tipo} onChange={t=>{if(t!==c.tipo)fijar(nuevaHoja(t,c));}} columnas={3}/>
  <FormCondicion c={c} onChange={fijar}/>
  <p className="yq-frase-viva" aria-live="polite">{condicionClara(c)}</p>
  {c.tipo==='siempre'?<p className="yq-nota">Arrastra una condición del Grimorio hasta aquí para que la regla solo se active a veces.</p>
   :<div className="yq-botonera" role="group" aria-label="Combinar con otras condiciones">
    <button type="button" className="yq-boton" onClick={()=>fijar({tipo:'todas',condiciones:[c,{tipo:'probabilidad',porcentaje:50}]})}>Y además…</button>
    <button type="button" className="yq-boton" onClick={()=>fijar({tipo:'alguna',condiciones:[c,{tipo:'probabilidad',porcentaje:50}]})}>O bien…</button>
    <button type="button" className="yq-boton" onClick={()=>fijar({tipo:'no',condicion:c})}>Negar</button>
   </div>}
 </div>;
}
