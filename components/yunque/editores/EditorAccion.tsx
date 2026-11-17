'use client';
// Editor de una acción dentro de su nodo: fichas para efecto, elemento y naturaleza; dados y costes como ruedas.
import {useState} from 'react';
import {EditorDados} from '../../EditorDados';
import {Fichas,Rueda,type Opcion} from '../Controles';
import {elementoDe} from '../../../lib/combate';
import {formula,type Efecto} from '../../../lib/creacion';
import type {Borrador} from '../../../lib/yunque-borrador';
import type {Nodo} from '../../../lib/yunque-grafo';
import type {Operacion} from '../../../lib/yunque-operaciones';

export type EditorNodoProps={b:Borrador;nodo:Nodo;operar:(o:Operacion)=>void};
const EFECTOS:Opcion<Efecto['efecto']>[]=[
 {valor:'dano',nombre:'Atacar',icono:'espada',ayuda:'Un golpe, disparo o hechizo que causa daño.'},
 {valor:'curacion',nombre:'Curar',icono:'pocion',ayuda:'Recupera vida sin superar el máximo.'},
 {valor:'estado',nombre:'Estado',icono:'fuego',ayuda:'Veneno, quemadura, aturdir o un estado propio.'},
 {valor:'crear_arma',nombre:'Crear arma',icono:'arco',ayuda:'Un arma temporal fija o elegida con un dado.'},
 {valor:'transformacion',nombre:'Transformarse',icono:'alma',ayuda:'Cambia estadísticas por etapas.'},
 {valor:'recuperar_ph',nombre:'Recuperar PH',icono:'agua',ayuda:'Devuelve puntos de habilidad.'},
 {valor:'reducir_fatiga',nombre:'Aliviar fatiga',icono:'vida',ayuda:'Reduce el cansancio del objetivo.'},
];
const ELEMENTOS:Opcion<NonNullable<Efecto['elemento']>>[]=[
 {valor:'ninguno',nombre:'Sin elemento',icono:'yugen'},{valor:'fuego',nombre:'Fuego',icono:'fuego'},{valor:'agua',nombre:'Agua',icono:'agua'},
 {valor:'electricidad',nombre:'Rayo',icono:'rayo'},{valor:'hielo',nombre:'Hielo',icono:'hielo'},{valor:'luz_sagrada',nombre:'Luz sagrada',icono:'corona'},
];
const NATURALEZAS:Opcion<NonNullable<Efecto['naturaleza']>>[]=[
 {valor:'automatica',nombre:'Según costes',ayuda:'La naturaleza se deduce de lo que cuesta.'},{valor:'fisica',nombre:'Física',ayuda:'Sin PH ni fatiga.'},
 {valor:'magica',nombre:'Mágica',ayuda:'Gasta PH.'},{valor:'natural',nombre:'Natural',ayuda:'Genera fatiga.'},
];
const ESTADOS:Opcion<NonNullable<Efecto['estado_tipo']>>[]=[
 {valor:'narrativo',nombre:'Narrativo'},{valor:'veneno',nombre:'Veneno'},{valor:'quemadura',nombre:'Quemadura'},{valor:'regeneracion',nombre:'Regeneración'},{valor:'aturdido',nombre:'Aturdir'},
];
const CARAS=[2,3,4,6,8,10,12,20,100];
/** Quita las claves con `undefined` para que el borrador no arrastre campos vacíos. */
const limpio=(e:Efecto):Efecto=>Object.fromEntries(Object.entries(e).filter(([,v])=>v!==undefined)) as Efecto;

export default function EditorAccion({b,nodo,operar}:EditorNodoProps){
 const [todos,setTodos]=useState(false);
 const i=nodo.ruta[1] as number,e=b.efectos[i];
 if(!e)return null;
 const patch=(p:Partial<Efecto>)=>operar({op:'fijar',ruta:nodo.ruta,valor:limpio({...e,...p})});
 function cambiarEfecto(v:Efecto['efecto']){
  if(v===e.efecto)return;
  const p:Partial<Efecto>={efecto:v,tabla_armas:undefined};
  if(v==='crear_arma')Object.assign(p,{tablero:undefined,arma_nombre:e.arma_nombre||'Nueva arma',arma_slot:e.arma_slot||'mano_der',duracion:Math.max(1,e.duracion||3)});
  if(v==='estado')Object.assign(p,{estado:e.estado||'Nuevo estado',duracion:Math.max(1,e.duracion)});
  if(v==='transformacion')p.transformacion=e.transformacion||{id:e.id,nombre:e.nombre||'Transformación',tipo:'forma',etapas:[{id:'etapa_1',nombre:'Primera etapa',stats:{vida:20}}]};
  else p.transformacion=undefined;
  patch(p);
 }
 function cambiarNaturaleza(v:NonNullable<Efecto['naturaleza']>){
  patch({naturaleza:v,...(v==='magica'?{coste_ph:Math.max(1,e.coste_ph)}:v==='natural'?{coste_ph:0,coste_fatiga:Math.max(1,e.coste_fatiga||0)}:v==='fisica'?{coste_ph:0,coste_fatiga:0}:{})});
 }
 const dados=e.efecto!=='estado'&&e.efecto!=='transformacion'&&!e.tabla_armas;
 const elemental=['dano','crear_arma'].includes(e.efecto)&&!e.tabla_armas;
 const dura=e.efecto==='estado'||e.efecto==='crear_arma'||e.efecto==='transformacion';
 return <div className="yq-editor">
  <label className="yq-campo"><span>Nombre de la acción</span><input maxLength={120} value={e.nombre} placeholder="Tajo, Bola de fuego…" onChange={v=>patch({nombre:v.target.value})}/></label>
  <Fichas etiqueta="Qué hace" opciones={EFECTOS} valor={e.efecto} onChange={cambiarEfecto}/>
  {dados&&<div className="yq-dados" aria-label={`Dados: ${formula(e)}`}>
   <span className="yq-dados-etiqueta">{e.efecto==='crear_arma'?'Daño del arma':'Dados'}</span>
   <div className="yq-dados-linea">
    <Rueda nombre="cantidad" etiqueta="Cuántos dados" valor={e.cantidad} min={0} max={100} onChange={cantidad=>patch({cantidad})}/>
    <b aria-hidden="true">d</b>
    <Rueda nombre="caras" etiqueta="Caras del dado" valor={e.caras} valores={CARAS} onChange={caras=>patch({caras})}/>
    <b aria-hidden="true">+</b>
    <Rueda nombre="modificador" etiqueta="Cantidad que se suma" valor={e.modificador} min={-999} max={999} onChange={modificador=>patch({modificador})}/>
   </div>
  </div>}
  {e.efecto==='estado'&&<>
   <Fichas etiqueta="Comportamiento" opciones={ESTADOS} valor={e.estado_tipo||'narrativo'} onChange={estado_tipo=>patch({estado_tipo})} tono="arcano"/>
   <label className="yq-campo"><span>Nombre del estado</span><input maxLength={200} value={e.estado} onChange={v=>patch({estado:v.target.value})}/></label>
  </>}
  {elemental&&<Fichas etiqueta="Elemento" opciones={ELEMENTOS} valor={elementoDe(e)} onChange={elemento=>patch({elemento})} tono="arcano"/>}
  <Fichas etiqueta="Naturaleza" opciones={NATURALEZAS} valor={e.naturaleza||'automatica'} onChange={cambiarNaturaleza}/>
  <div className="yq-costes">
   <label><span>Coste PH</span><Rueda nombre="coste_ph" etiqueta="PH que gasta" valor={e.coste_ph} min={0} max={999} onChange={coste_ph=>patch({coste_ph})} compacta/></label>
   <label><span>Fatiga</span><Rueda nombre="coste_fatiga" etiqueta="Fatiga que genera" valor={e.coste_fatiga||0} min={0} max={999} onChange={coste_fatiga=>patch({coste_fatiga})} compacta/></label>
   {dura&&<label><span>Turnos</span><Rueda nombre="duracion" etiqueta="Cuántos turnos dura" valor={e.duracion} min={e.efecto==='crear_arma'?1:0} max={999} onChange={duracion=>patch({duracion})} compacta/></label>}
  </div>
  <label className="yq-conmutador"><input type="checkbox" role="switch" checked={todos} onChange={v=>setTodos(v.target.checked)}/><span aria-hidden="true"/>Todos los campos</label>
  {todos&&<div className="yq-todos yq-desplazable">
   <EditorDados value={[e]} onChange={lista=>{const efectos=[...b.efectos];efectos.splice(i,1,...lista);operar({op:'fijar',ruta:['efectos'],valor:efectos});}}/>
  </div>}
 </div>;
}
