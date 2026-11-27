'use client';
// Editor de una acción dentro de su nodo: fichas para efecto, elemento y naturaleza; dados y costes como ruedas.
import {OPCIONES_ELEMENTO_O_NINGUNO} from '../../../lib/catalogos';
import {SelectorRegla} from '../../SelectorRegla';
import {Fichas,Rueda,Texto,type Opcion} from '../Controles';
import {elementoDe,formaGratis,grupoBarra,tipoPresupuesto,type TipoPresupuesto} from '../../../lib/combate';
import {formula,type Efecto} from '../../../lib/creacion';
import {Interruptor} from '../Controles';
import EditorDefensas from './EditorDefensas';
import FichasGrimorioElementos from '../../grimorio/FichasGrimorioElementos';
import EditorRasgo,{rasgoVacio} from './EditorRasgo';
import EditorConcepto from './EditorConcepto';
import EditorEsqueleto from './EditorEsqueleto';
import ImagenAccion from './ImagenAccion';
import {DESARMADO_BASE} from '../../../lib/conceptos-basicos';
import {ETIQUETAS,NOMBRE_ETIQUETA,etiquetasDe} from '../../../lib/rasgos';
import type {Borrador} from '../../../lib/yunque-borrador';
import type {Nodo} from '../../../lib/yunque-grafo';
import type {Operacion} from '../../../lib/yunque-operaciones';

export type EditorNodoProps={b:Borrador;nodo:Nodo;operar:(o:Operacion)=>void};
const EFECTOS:Opcion<Efecto['efecto']>[]=[
 {valor:'desplazamiento',nombre:'Dash',icono:'ojo',ayuda:'Desplazamiento a una casilla libre.'},
 {valor:'dano',nombre:'Atacar',icono:'espada',ayuda:'Un golpe, disparo o hechizo que causa daño.'},
 {valor:'curacion',nombre:'Curar',icono:'pocion',ayuda:'Recupera vida sin superar el máximo.'},
 {valor:'estado',nombre:'Estado',icono:'fuego',ayuda:'Veneno, quemadura, aturdir o un estado propio.'},
 {valor:'crear_arma',nombre:'Crear arma',icono:'arco',ayuda:'Un arma temporal fija o elegida con un dado.'},
 {valor:'transformacion',nombre:'Transformarse',icono:'alma',ayuda:'Cambia estadísticas por etapas.'},
 {valor:'recuperar_ph',nombre:'Recuperar PH',icono:'agua',ayuda:'Devuelve puntos de habilidad.'},
 {valor:'reducir_fatiga',nombre:'Aliviar fatiga',icono:'vida',ayuda:'Reduce el cansancio del objetivo.'},
];
const ELEMENTOS=OPCIONES_ELEMENTO_O_NINGUNO as Opcion<NonNullable<Efecto['elemento']>>[];
const NATURALEZAS:Opcion<NonNullable<Efecto['naturaleza']>>[]=[
 {valor:'automatica',nombre:'Según costes',ayuda:'La naturaleza se deduce de lo que cuesta.'},{valor:'fisica',nombre:'Física',ayuda:'Sin PH ni fatiga.'},
 {valor:'magica',nombre:'Mágica',ayuda:'Gasta PH.'},{valor:'natural',nombre:'Natural',ayuda:'Genera fatiga.'},
];
const SUBMENTE:Opcion<string>[]=['control','miedo','ilusion','confusion','memoria','posesion'].map(v=>({valor:v,nombre:v.replace('ilusion','ilusión').replace('confusion','confusión').replace('posesion','posesión')}));
const IGNORA:Opcion<string>[]=[{valor:'categoria:mental',nombre:'Inmunidad mental'},{valor:'dano:fuego',nombre:'Inmune al fuego'},{valor:'dano:hielo',nombre:'Inmune al hielo'},{valor:'dano:electricidad',nombre:'Inmune al rayo'},{valor:'dano:veneno',nombre:'Inmune al veneno'},{valor:'dano:magico',nombre:'Inmune a la magia'}];
const PRESUPUESTOS:Opcion<TipoPresupuesto>[]=[
 {valor:'principal',nombre:'Principal',ayuda:'Gasta la acción del turno.'},
 {valor:'adicional',nombre:'Adicional',ayuda:'Una extra en tu turno, sin gastar la principal.'},
 {valor:'legendaria',nombre:'Legendaria',ayuda:'Fuera de tu turno, se recarga cada ronda.'}];
const CARAS=[2,3,4,6,8,10,12,20,100];
/** Quita las claves con `undefined` para que el borrador no arrastre campos vacíos. */
const limpio=(e:Efecto):Efecto=>Object.fromEntries(Object.entries(e).filter(([,v])=>v!==undefined)) as Efecto;

export default function EditorAccion({b,nodo,operar}:EditorNodoProps){
 const i=nodo.ruta[1] as number,e=b.efectos[i];
 if(!e)return null;
 const patch=(p:Partial<Efecto>)=>operar({op:'fijar',ruta:nodo.ruta,valor:limpio({...e,...p})});
 function cambiarEfecto(v:Efecto['efecto']){
  if(v===e.efecto)return;
  const p:Partial<Efecto>={efecto:v,tabla_armas:undefined,aprendizaje:undefined,aterrizar:undefined};
  if(v==='crear_arma')Object.assign(p,{tablero:undefined,arma_nombre:e.arma_nombre||'Nueva arma',arma_slot:e.arma_slot||'mano_der',duracion:Math.max(1,e.duracion||3)});
  if(v==='desplazamiento')p.tablero={alcance:e.tablero?.alcance||3,forma:'individual',tamano:0,afecta:'todos'};
  if(v==='estado')Object.assign(p,{estado_tipo:'aturdido',estado:e.estado||'Aturdido',duracion:Math.max(1,e.duracion)});
  else p.estado_def=undefined;
  if(v==='transformacion')p.transformacion=e.transformacion||{id:e.id,nombre:e.nombre||'Transformación',tipo:'forma',etapas:[{id:'etapa_1',nombre:'Primera etapa',stats:{vida:20}}]};
  else p.transformacion=undefined;
  patch(p);
 }
 function cambiarNaturaleza(v:NonNullable<Efecto['naturaleza']>){
  patch({naturaleza:v,...(v==='magica'?{coste_ph:Math.max(1,e.coste_ph)}:v==='natural'?{coste_ph:0,coste_fatiga:Math.max(1,e.coste_fatiga||0)}:v==='fisica'?{coste_ph:0,coste_fatiga:0}:{})});
 }
 const dados=e.efecto!=='desplazamiento'&&e.efecto!=='estado'&&e.efecto!=='transformacion'&&!e.tabla_armas;
 const elemental=['dano','crear_arma'].includes(e.efecto)&&!e.tabla_armas;
 const dura=e.efecto==='crear_arma'||e.efecto==='transformacion';
 const pasivo=!!e.solo_pasivo;
 return <div className="yq-editor">
  <label className="yq-campo"><span>Nombre de la acción</span><input maxLength={120} value={e.nombre} placeholder="Tajo, Bola de fuego…" onChange={v=>patch({nombre:v.target.value})}/></label>
  {!e.solo_pasivo&&<ImagenAccion valor={e.imagen||''} onChange={url=>patch({imagen:url||undefined})}/>}
  <Fichas etiqueta="Uso" opciones={[{valor:'accion',nombre:'Acción en combate',icono:'espada'},{valor:'pasivo',nombre:'Rasgo siempre activo',icono:'escudo',ayuda:'No ocupa el turno: concede defensas, rasgos o conceptos básicos.'}]} valor={pasivo?'pasivo':'accion'} onChange={v=>patch(v==='pasivo'?{solo_pasivo:true,efecto:'estado',estado:e.estado||e.nombre,estado_tipo:'narrativo',cantidad:0,coste_ph:0,coste_fatiga:0,naturaleza:undefined,tablero:undefined,estado_def:undefined}:{solo_pasivo:undefined,inmunidades:undefined})} grandes/>
  {pasivo&&<>
   <h4 className="yq-ficha-titulo">Defensas e inmunidades</h4>
   <EditorDefensas valor={e.inmunidades||[]} onChange={inmunidades=>patch({inmunidades:inmunidades.length?inmunidades:undefined})} objeto={b.tipo==='objeto'} porTurnos={false}/>
   <Interruptor etiqueta="Concede un rasgo combinable (recursos y potenciadores)" valor={!!e.rasgo} onChange={v=>patch({rasgo:v?e.rasgo||rasgoVacio():undefined})}/>
   {e.rasgo&&<EditorRasgo valor={e.rasgo} onChange={rasgo=>patch({rasgo})}/>}
   <Interruptor etiqueta="Sustituye un concepto básico (desarmado o guardia)" valor={!!e.concepto} onChange={v=>patch({concepto:v?e.concepto||structuredClone({...DESARMADO_BASE,nombre:'Mordisco',dano:{...DESARMADO_BASE.dano,cantidad:2,caras:6,tipo_dano:'perforante'},requiere_mano:false}):undefined})}/>
   {e.concepto&&<EditorConcepto valor={e.concepto} onChange={concepto=>patch({concepto})}/>}
  </>}
  {!pasivo&&<>
  <Fichas etiqueta="Qué hace" opciones={b.tipo==='habilidad'?[...EFECTOS,{valor:'invocar',nombre:'Invocar',icono:'espectro',ayuda:'Convertir en una acción de invocación.'}]:EFECTOS} valor={e.efecto} onChange={v=>v==='invocar'?operar({op:'convertir_invocacion',id:e.id}):cambiarEfecto(v)}/>
  {e.efecto==='desplazamiento'&&<label className="yq-campo"><span>Casillas de dash</span><Rueda nombre="dash" etiqueta="Alcance del desplazamiento" valor={e.tablero?.alcance||1} min={1} max={30} onChange={alcance=>patch({tablero:{alcance,forma:'individual',tamano:0,afecta:'todos'}})}/></label>}
  {dados&&<div className="yq-dados" aria-label={`Dados: ${formula(e)}`}>
   <span className="yq-dados-etiqueta">{e.efecto==='crear_arma'?'Daño del arma':'Dados'}</span>
   <div className="yq-dados-linea">
    <Rueda nombre="cantidad" etiqueta={e.rafaga?'Cuántos disparos (un dado cada uno)':'Cuántos dados'} valor={e.cantidad} min={e.rafaga?2:0} max={e.rafaga?20:100} onChange={cantidad=>patch({cantidad})}/>
    <b aria-hidden="true">d</b>
    <Rueda nombre="caras" etiqueta="Caras del dado" valor={e.caras} valores={CARAS} onChange={caras=>patch({caras})}/>
    <b aria-hidden="true">+</b>
    <Rueda nombre="modificador" etiqueta="Cantidad que se suma" valor={e.modificador} min={-999} max={999} onChange={modificador=>patch({modificador})}/>
   </div>
  </div>}
  {e.efecto==='dano'&&!e.tabla_armas&&<>
   <Interruptor etiqueta="Ataque múltiple: cada dado es un disparo" valor={!!e.rafaga} onChange={v=>patch(v
    ?{rafaga:true,cantidad:Math.max(2,Math.min(20,e.cantidad)),componentes:undefined,...(e.tablero&&e.tablero.forma!=='individual'?{tablero:{...e.tablero,forma:'individual',tamano:0}}:{})}
    :{rafaga:undefined})}/>
   {e.rafaga&&<p className="yq-nota">{e.cantidad} disparos de 1d{e.caras}{e.modificador?` ${e.modificador>0?'+':'−'} ${Math.abs(e.modificador)}`:''}: cada uno tira para impactar por separado y puede ir al mismo enemigo o a otro. El coste se paga una vez. Tras el primer disparo solo se puede seguir disparando o moverse; los que queden se pierden al terminar el turno.</p>}
  </>}
  {e.efecto==='estado'&&<p className="yq-nota">Qué estado aplica, cuánto dura y sus bonos se eligen en su nodo «Estado».</p>}
  {elemental&&<Fichas etiqueta="Elemento" opciones={ELEMENTOS} valor={e.elemento_def?undefined:elementoDe(e)} onChange={elemento=>patch({elemento,elemento_def:undefined})} tono="arcano"/>}
  {elemental&&<FichasGrimorioElementos actual={e.elemento_def} onElegir={elemento_def=>patch({elemento:elemento_def.base,elemento_def})}/>}
  {!e.rafaga&&<>
   <Fichas etiqueta="Presupuesto" opciones={PRESUPUESTOS} valor={tipoPresupuesto(e)} onChange={v=>patch({presupuesto:v==='principal'?undefined:v})}/>
   <p className="yq-nota">Legendaria: fuera de tu turno, se recarga cada ronda.{tipoPresupuesto(e)!=='principal'&&` Solo se puede usar si quien la tiene cuenta con acciones ${tipoPresupuesto(e)==='adicional'?'adicionales':'legendarias'}: del núcleo, la raza, el clan o la especie.`}</p>
  </>}
  <Fichas etiqueta="Naturaleza" opciones={NATURALEZAS} valor={e.naturaleza||'automatica'} onChange={cambiarNaturaleza}/>
  <div className="yq-costes">
   <label><span>Coste PH</span><Rueda nombre="coste_ph" etiqueta="PH que gasta" valor={e.coste_ph} min={0} max={999} onChange={coste_ph=>patch({coste_ph})} compacta/></label>
   <label><span>Fatiga</span><Rueda nombre="coste_fatiga" etiqueta="Fatiga que genera" valor={e.coste_fatiga||0} min={0} max={999} onChange={coste_fatiga=>patch({coste_fatiga})} compacta/></label>
   {dura&&<label><span>Turnos</span><Rueda nombre="duracion" etiqueta="Cuántos turnos dura" valor={e.duracion} min={e.efecto==='crear_arma'?1:0} max={999} onChange={duracion=>patch({duracion})} compacta/></label>}
  </div>
  {(e.efecto==='dano'||e.efecto==='crear_arma')&&<EditorEsqueleto valor={e.esqueleto} definicion={e.esqueleto_def} ajustes={e.esqueleto_ajustes} onChange={v=>patch(v)}/>}
  {e.efecto==='dano'&&<fieldset className="yq-fichas yq-etiquetas"><legend>Etiquetas de técnica (potenciadores compatibles)</legend><div>{ETIQUETAS.map(t=>{const derivada=etiquetasDe({...e,etiquetas:[]}).includes(t),on=derivada||!!e.etiquetas?.includes(t);return <button key={t} type="button" aria-pressed={on} disabled={derivada} title={derivada?'Se deduce de la acción':undefined} onClick={()=>{const l=on?(e.etiquetas||[]).filter(x=>x!==t):[...(e.etiquetas||[]),t];patch({etiquetas:l.length?l:undefined});}}><span>{NOMBRE_ETIQUETA[t]}</span></button>;})}</div></fieldset>}
  {(e.efecto==='dano'||e.efecto==='estado')&&<details className="yq-mente">
   <summary>Mente e inmunidades{e.categoria==='mental'?' · mental':''}{e.ignora?.length?` · atraviesa ${e.ignora.length}`:''}</summary>
   <Interruptor etiqueta="Es un efecto mental" valor={e.categoria==='mental'} onChange={v=>patch({categoria:v?'mental':undefined,subcategoria:v?e.subcategoria||'control':undefined})}/>
   {e.categoria==='mental'&&<Fichas etiqueta="Tipo mental" opciones={SUBMENTE} valor={e.subcategoria} onChange={subcategoria=>patch({subcategoria})}/>}
   <fieldset className="yq-fichas"><legend>Atraviesa inmunidades</legend><div>{IGNORA.map(o=>{const on=!!e.ignora?.includes(o.valor);return <button key={o.valor} type="button" aria-pressed={on} onClick={()=>{const l=on?(e.ignora||[]).filter(x=>x!==o.valor):[...(e.ignora||[]),o.valor];patch({ignora:l.length?l:undefined});}}><span>{o.nombre}</span></button>;})}</div></fieldset>
  </details>}
  </>}
  <details className="yq-mente"><summary>Avanzado{e.requisito_forma?' · requisito de forma':''}{e.companero_magico?' · compañero':''}{formaGratis(e)?' · gratis en forma':''}{grupoBarra(e)?` · grupo ${grupoBarra(e)}`:''}</summary>
   <SelectorRegla tipo="forma" opcional textoOpcional="Siempre cuesta lo indicado" etiqueta="Gratis (0 PH) mientras esté en la forma" valor={formaGratis(e)||''} onChange={f=>patch({gratis_en_forma:f||undefined,ley_limitless:undefined})}/>
   <SelectorRegla tipo="grupo" crear opcional textoOpcional="En la barra normal" etiqueta="Grupo en la barra de combate" ayuda="Las acciones del mismo grupo se abren juntas desde un botón (p. ej. «Axioma»)." valor={grupoBarra(e)||''} onChange={g=>patch({grupo_barra:g||undefined,axioma:undefined})}/>
   <Interruptor etiqueta="Solo se puede usar al alcanzar un atributo o etapa" valor={!!e.requisito_forma} onChange={v=>patch({requisito_forma:v?{atributo:'etapa',minimo:1}:undefined})}/>
   {e.requisito_forma&&<div className="yq-fila">
    <SelectorRegla tipo="atributo" etiqueta="Atributo o etapa" valor={e.requisito_forma.atributo} onChange={atributo=>patch({requisito_forma:{...e.requisito_forma!,atributo}})}/>
    <label>Mínimo<Rueda nombre="minimo" etiqueta="Valor mínimo requerido" valor={e.requisito_forma.minimo} min={-999} max={999} onChange={minimo=>patch({requisito_forma:{...e.requisito_forma!,minimo}})} compacta/></label>
   </div>}
   {e.naturaleza==='magica'||e.coste_ph>0?<>
    <Interruptor etiqueta="Un compañero concede ventaja mágica una vez por ronda" valor={!!e.companero_magico} onChange={v=>patch({companero_magico:v?e.companero_magico||'Compañero':undefined})}/>
    {e.companero_magico!==undefined&&<Texto etiqueta="Nombre del compañero (solo para el registro)" valor={e.companero_magico} max={80} onChange={companero_magico=>patch({companero_magico:companero_magico||'Compañero'})}/>}
   </>:null}
  </details>
 </div>;
}
