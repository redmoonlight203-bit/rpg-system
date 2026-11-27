'use client';
// Único editor del estado que aplica una acción (nodo «Estado» del Yunque). Antes había tres: en la acción, en el
// módulo (con solo cuatro tipos antiguos) y en el formulario «Todos los campos». Ahora vive solo aquí.
import {Fichas,Rueda,Interruptor,type Opcion} from '../Controles';
import EditorEstados from './EditorEstados';
import FichasGrimorio from '../../grimorio/FichasGrimorio';
import {CATALOGO_ESTADOS,TIPOS_ESTADO_LEGADO,definicionBase,estadoVacio,iconoEstado,type DefinicionEstado} from '../../../lib/estados';
import {cortoAtributo} from '../../../lib/catalogos';
import {claveNueva} from '../../../lib/claves';
import type {Efecto} from '../../../lib/creacion';

/** Estados del catálogo que una acción puede aplicar (los internos del motor no se ofrecen) y «propio». */
const ESTADOS:Opcion<string>[]=[
 ...CATALOGO_ESTADOS.filter(d=>!['guardia','ciego','escarcha','marca_luz'].includes(d.id)).map(d=>({valor:d.id,nombre:d.nombre.split(':')[0],icono:iconoEstado(d),ayuda:d.descripcion})),
 {valor:'propio',nombre:'Estado propio',icono:'libro',ayuda:'Combina primitivas en un estado nuevo.'},
];
/** Tipos antiguos cuyo daño o curación por turno sale de los dados de la acción. */
const CON_DADOS=['veneno','quemadura','regeneracion'];
const BONOS:[string,string][]=['armadura','dano','bono_impacto','salvacion','movimiento','iniciativa'].map(k=>[k,cortoAtributo(k)]);
const CARAS=[2,3,4,6,8,10,12,20,100];

/** Un estado narrativo antiguo (solo nombre y bonos) pasa a ser un estado propio con icono y primitivas. */
export function convertirNarrativo(e:Pick<Efecto,'estado'|'duracion'|'bonos_estado'>):DefinicionEstado{
 const bonos=Object.fromEntries(Object.entries(e.bonos_estado||{}).filter(([,v])=>v));
 return {...estadoVacio(claveNueva(e.estado||'estado')),nombre:(e.estado||'').trim()||'Nuevo estado',
  duracion:e.duracion>0?{tipo:'turnos',turnos:Math.min(99,e.duracion)}:{tipo:'combate'},
  efectos:Object.keys(bonos).length?[{tipo:'bonos',bonos}]:[]};
}

export default function EditorEstadoAccion({e,patch}:{e:Efecto;patch:(p:Partial<Efecto>)=>void}){
 const tipo=e.estado_def?'propio':e.estado_tipo||'narrativo';
 const narrativo=!e.estado_def&&tipo==='narrativo';
 const elegir=(t:string)=>{
  // Al elegir un estado, sus propios turnos mandan (0); los tipos antiguos usan los turnos de la acción.
  if(t==='propio'){patch({estado_tipo:'narrativo',duracion:0,estado_def:e.estado_def||(narrativo&&e.estado?convertirNarrativo(e):estadoVacio(claveNueva('estado'))),estado:e.estado_def?.nombre||e.estado||''});return;}
  const d=definicionBase(t);
  patch({estado_tipo:t as Efecto['estado_tipo'],duracion:TIPOS_ESTADO_LEGADO.includes(t)?Math.max(1,d?.duracion.tipo==='turnos'?d.duracion.turnos:e.duracion):0,estado_def:undefined,estado:d?.nombre.split(':')[0]||e.estado,categoria:d?.categoria==='mental'?'mental':e.categoria,subcategoria:d?.subcategoria});
 };
 return <div className="yq-editor">
  <Fichas etiqueta="Qué estado aplica" opciones={ESTADOS} valor={tipo} onChange={elegir} tono="arcano" columnas={3}/>
  <FichasGrimorio actual={e.estado_def} onElegir={estado_def=>patch({estado_tipo:'narrativo',duracion:0,estado_def,estado:estado_def.nombre,categoria:estado_def.categoria==='mental'?'mental':e.categoria,subcategoria:estado_def.categoria==='mental'?estado_def.subcategoria:e.subcategoria})}/>
  {e.estado_def&&<EditorEstados valor={e.estado_def} onChange={estado_def=>patch({estado_def,estado:estado_def.nombre})}/>}
  {narrativo&&<div className="yq-nota" role="note">
   <p>Estado narrativo antiguo «{e.estado||'sin nombre'}»: solo aplica sus bonos y no tiene icono propio.</p>
   <button type="button" className="yq-boton-suave" onClick={()=>elegir('propio')}>Convertirlo en estado propio</button>
  </div>}
  {CON_DADOS.includes(tipo)&&<div className="yq-dados" aria-label="Dados por turno">
   <span className="yq-dados-etiqueta">{tipo==='regeneracion'?'Cura por turno':'Daño por turno'}</span>
   <div className="yq-dados-linea">
    <Rueda nombre="cantidad" etiqueta="Dados por turno" valor={e.cantidad} min={0} max={100} onChange={cantidad=>patch({cantidad:Math.round(cantidad)})}/><b aria-hidden="true">d</b>
    <Rueda nombre="caras" etiqueta="Caras por turno" valor={e.caras} valores={CARAS} onChange={caras=>patch({caras})}/>
   </div>
  </div>}
  {<div className="yq-costes"><label><span>{e.estado_def||definicionBase(tipo)?'Turnos (0: los del estado)':'Turnos'}</span><Rueda nombre="duracion" etiqueta="Turnos que dura el estado" valor={e.duracion} min={0} max={999} onChange={duracion=>patch({duracion:Math.round(duracion)})} compacta/></label></div>}
  <fieldset className="yq-bonos"><legend>Bonos extra mientras dura</legend>
   {BONOS.map(([k,n])=><label key={k} className={e.bonos_estado?.[k]?'is-activo':undefined}><span>{n}</span><Rueda nombre={'estado_'+k} etiqueta={`${n} mientras dura el estado`} valor={e.bonos_estado?.[k]||0} min={-999} max={999} onChange={v=>{const bonos={...e.bonos_estado};if(v)bonos[k]=v;else delete bonos[k];patch({bonos_estado:Object.keys(bonos).length?bonos:undefined});}} compacta/></label>)}
  </fieldset>
  <details className="yq-mente"><summary>Usos especiales{e.aterrizar?' · aterrizar':e.aprendizaje?' · aprender':''}</summary>
   <Interruptor etiqueta="Aterrizar desde la capa de vuelo" valor={!!e.aterrizar} onChange={v=>patch({aterrizar:v||undefined,vuelo:undefined,aprendizaje:undefined})}/>
   <Interruptor etiqueta="Aprender el último hechizo observado del objetivo" valor={!!e.aprendizaje} onChange={v=>patch({aterrizar:undefined,vuelo:undefined,aprendizaje:v?{bono:0,cd:15}:undefined})}/>
   {e.aprendizaje&&<div className="yq-costes">{(['bono','cd'] as const).map(k=><label key={k}>{k==='cd'?'CD del GM':'Bono al d20'}<Rueda nombre={k} etiqueta={k==='cd'?'CD de aprendizaje':'Bono de aprendizaje'} valor={e.aprendizaje![k]} min={k==='cd'?1:-100} max={100} onChange={v=>patch({aprendizaje:{...e.aprendizaje!,[k]:v}})}/></label>)}</div>}
  </details>
 </div>;
}
