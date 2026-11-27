'use client';
// Conceptos básicos en el Yunque (plan maestro, Apéndice D · A.3 y B.2): un personaje, criatura, raza o linaje
// sustituye su ataque desarmado o su guardia por uno propio. Mordisco 2d6 con sangrado, caparazón +4 ARM inmóvil…
import {Fichas,Rueda,Texto,Interruptor,type Opcion} from '../Controles';
import EditorEstados from './EditorEstados';
import {DESARMADO_BASE,GUARDIA_BASE,describirConcepto,validarConcepto,type ConceptoBasico,type ConceptoDesarmado,type ConceptoGuardia} from '../../../lib/conceptos-basicos';
import {estadoVacio} from '../../../lib/estados';
import {OPCIONES_ELEMENTO_O_NINGUNO,cortoAtributo,opcionesTipoDano,tipoDanoCanonico} from '../../../lib/catalogos';
import {claveNueva} from '../../../lib/claves';
import './defensas.css';

const BONOS:{clave:string;nombre:string}[]=[{clave:'armadura',nombre:cortoAtributo('armadura')},{clave:'salvacion',nombre:cortoAtributo('salvacion')},{clave:'bloqueo',nombre:'Bloqueo'},{clave:'bono_impacto',nombre:cortoAtributo('bono_impacto')}];
const ELEMENTOS=OPCIONES_ELEMENTO_O_NINGUNO as Opcion<NonNullable<ConceptoDesarmado['dano']['elemento']>>[];

export default function EditorConcepto({valor,onChange}:{valor:ConceptoBasico;onChange:(c:ConceptoBasico)=>void}){
 const error=validarConcepto(valor);
 return <section className="yq-concepto-editor" aria-label="Concepto básico">
  <Fichas etiqueta="Sustituye" opciones={[{valor:'desarmado',nombre:'Ataque desarmado',icono:'vida'},{valor:'guardia',nombre:'Guardia',icono:'escudo'}]} valor={valor.id} onChange={id=>onChange(structuredClone(id==='desarmado'?{...DESARMADO_BASE,nombre:'Mordisco'}:{...GUARDIA_BASE,nombre:'Postura defensiva'}))} grandes/>
  {valor.id==='desarmado'?<Desarmado c={valor} onChange={onChange}/>:<Guardia c={valor} onChange={onChange}/>}
  <p className="yq-rasgo-frase" role="status">{error?`⚠ ${error}`:describirConcepto(valor)}</p>
 </section>;
}
function Desarmado({c,onChange}:{c:ConceptoDesarmado;onChange:(c:ConceptoBasico)=>void}){
 const set=(p:Partial<ConceptoDesarmado>)=>onChange({...c,...p});
 const d=c.dano,setD=(p:Partial<ConceptoDesarmado['dano']>)=>set({dano:{...d,...p}});
 return <>
  <Texto etiqueta="Nombre del golpe" valor={c.nombre} onChange={nombre=>set({nombre})} placeholder="Mordisco, Garras, Coletazo…"/>
  <div className="yq-dados-linea yq-fila">
   <label>Dados<Rueda nombre="cantidad" etiqueta="Dados" valor={d.cantidad} min={0} max={20} onChange={cantidad=>setD({cantidad})} compacta/></label>
   <label>Caras<Rueda nombre="caras" etiqueta="Caras" valor={d.caras} valores={[2,3,4,6,8,10,12,20]} onChange={caras=>setD({caras})} compacta/></label>
   <label>Suma<Rueda nombre="modificador" etiqueta="Modificador" valor={d.modificador} min={-100} max={100} onChange={modificador=>setD({modificador})} compacta/></label>
   <label>Alcance<Rueda nombre="alcance" etiqueta="Alcance en casillas" valor={c.alcance} min={1} max={6} onChange={alcance=>set({alcance})} compacta/></label>
  </div>
  <Fichas etiqueta="Tipo de daño" opciones={opcionesTipoDano(d.tipo_dano)} valor={tipoDanoCanonico(d.tipo_dano)} onChange={tipo_dano=>setD({tipo_dano})} columnas={3}/>
  <Fichas etiqueta="Elemento" opciones={ELEMENTOS} valor={d.elemento||'ninguno'} onChange={elemento=>setD({elemento:elemento==='ninguno'?undefined:elemento})} tono="arcano"/>
  <Fichas etiqueta="Naturaleza" opciones={[{valor:'fisica',nombre:'Física',ayuda:'Sin coste.'},{valor:'natural',nombre:'Natural',ayuda:'Genera Fatiga.'}]} valor={d.naturaleza||'fisica'} onChange={naturaleza=>{onChange({...c,dano:{...d,naturaleza:naturaleza==='fisica'?undefined:naturaleza},coste:{...c.coste,fatiga:naturaleza==='natural'?Math.max(1,c.coste.fatiga):0}});}}/>
  {d.naturaleza==='natural'&&<label className="yq-campo"><span>Fatiga</span><Rueda nombre="fatiga" etiqueta="Fatiga que genera" valor={c.coste.fatiga} min={1} max={99} onChange={fatiga=>set({coste:{...c.coste,fatiga}})} compacta/></label>}
  <Interruptor etiqueta="Necesita una mano libre" valor={c.requiere_mano!==false} onChange={v=>set({requiere_mano:v?undefined:false})}/>
  <Interruptor etiqueta="Aplica un estado al impactar" valor={!!c.estado_impacto} onChange={v=>set({estado_impacto:v?{...estadoVacio(claveNueva('sangrado')),nombre:'Sangrado',categoria:'fisico',efectos:[{tipo:'dano_periodico',cantidad:1,caras:4,tipo_dano:'fisico',momento:'inicio'}]}:undefined})}/>
  {c.estado_impacto&&<EditorEstados valor={c.estado_impacto} onChange={estado_impacto=>set({estado_impacto})}/>}
 </>;
}
function Guardia({c,onChange}:{c:ConceptoGuardia;onChange:(c:ConceptoBasico)=>void}){
 const set=(p:Partial<ConceptoGuardia>)=>onChange({...c,...p});
 return <>
  <Texto etiqueta="Nombre de la guardia" valor={c.nombre} onChange={nombre=>set({nombre})} placeholder="Caparazón, Mente serena…"/>
  <div className="yq-fila">{BONOS.map(b=><label key={b.clave}>{b.nombre}<Rueda nombre={b.clave} etiqueta={`Bono de ${b.nombre}`} valor={c.bonos[b.clave]||0} min={-50} max={50} onChange={v=>{const bonos={...c.bonos};if(v)bonos[b.clave]=v;else delete bonos[b.clave];set({bonos});}} compacta/></label>)}</div>
  <Fichas etiqueta="Duración" opciones={[{valor:'hasta_su_turno',nombre:'Hasta su siguiente turno'},{valor:'turnos',nombre:'Varios turnos'}]} valor={c.duracion.tipo} onChange={t=>set({duracion:t==='turnos'?{tipo:'turnos',turnos:2}:{tipo:'hasta_su_turno'}})}/>
  {c.duracion.tipo==='turnos'&&<label className="yq-campo"><span>Turnos del portador</span><Rueda nombre="turnos" etiqueta="Turnos de guardia" valor={c.duracion.turnos} min={1} max={10} onChange={turnos=>set({duracion:{tipo:'turnos',turnos}})} compacta/></label>}
  <div className="yq-fila">
   <label>PH<Rueda nombre="ph" etiqueta="PH de la guardia" valor={c.coste.ph} min={0} max={99} onChange={ph=>set({coste:{...c.coste,ph}})} compacta/></label>
   <label>Fatiga<Rueda nombre="fatiga" etiqueta="Fatiga de la guardia" valor={c.coste.fatiga} min={0} max={99} onChange={fatiga=>set({coste:{...c.coste,fatiga}})} compacta/></label>
  </div>
  <Interruptor etiqueta="Se endurece: no puede moverse" valor={!!c.condiciones.inmovil} onChange={v=>set({condiciones:{...c.condiciones,inmovil:v||undefined}})}/>
  <Interruptor etiqueta="Requiere escudo" valor={!!c.condiciones.requiere_escudo} onChange={v=>set({condiciones:{...c.condiciones,requiere_escudo:v||undefined}})}/>
  <Interruptor etiqueta="No admite arma a dos manos" valor={!!c.condiciones.sin_dos_manos} onChange={v=>set({condiciones:{...c.condiciones,sin_dos_manos:v||undefined}})}/>
 </>;
}
