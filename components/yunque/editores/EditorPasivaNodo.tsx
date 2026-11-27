'use client';
// Editor de una pasiva dentro de su nodo: momento y condición como fichas; bonos, curas y represalias como ruedas.
import {Fichas,Rueda,Texto,type Opcion} from '../Controles';
import {OPCIONES_ELEMENTO,cortoAtributo} from '../../../lib/catalogos';
import {CONDICIONES_PASIVA,EVENTOS_PASIVA,type ReglaPasiva} from '../../../lib/pasivas';
import type {EditorNodoProps} from './EditorAccion';

const ICONO_EVENTO:Record<ReglaPasiva['evento'],string>={permanente:'corona',inicio_turno:'ojo',recibir_ataque:'escudo',recibir_impacto:'espada',recibir_dano:'vida'};
const EVENTOS:Opcion<ReglaPasiva['evento']>[]=(Object.keys(EVENTOS_PASIVA) as ReglaPasiva['evento'][]).map(k=>({valor:k,nombre:EVENTOS_PASIVA[k],icono:ICONO_EVENTO[k]}));
const NOMBRE_CONDICION:Record<ReglaPasiva['condicion'],string>={siempre:'Siempre',vida_mitad:'Vida ≤ 50 %',sin_arma:'Sin arma',ataque_magico:'Ataque mágico',ataque_natural:'Ataque natural',ataque_elemental:'Ataque elemental'};
const CONDICIONES:Opcion<ReglaPasiva['condicion']>[]=(Object.keys(CONDICIONES_PASIVA) as ReglaPasiva['condicion'][]).map(k=>({valor:k,nombre:NOMBRE_CONDICION[k],ayuda:CONDICIONES_PASIVA[k]}));
const BONOS:[string,string][]=[...['vida','armadura','ph','fatiga','iniciativa','bono_impacto','dano','salvacion','movimiento'].map(k=>[k,cortoAtributo(k)] as [string,string]),['acciones_adicional','Acc. adic.'],['acciones_legendaria','Acc. leg.'],['acciones_principal','Acc. princ.']];
const ELEMENTOS:Opcion<string>[]=[{valor:'cualquiera',nombre:'Cualquiera',icono:'yugen'},...OPCIONES_ELEMENTO];
const CARAS=[2,3,4,6,8,10,12,20,100];
const reactivo=(c:ReglaPasiva['condicion'])=>c.startsWith('ataque_');

export default function EditorPasivaNodo({b,nodo,operar}:EditorNodoProps){
 const p=b.reglas_pasivas[nodo.ruta[1] as number];
 if(!p)return null;
 const patch=(x:Partial<ReglaPasiva>)=>operar({op:'fijar',ruta:nodo.ruta,valor:Object.fromEntries(Object.entries({...p,...x}).filter(([,v])=>v!==undefined))});
 const bono=(k:string,v:number)=>{const bonos={...p.bonos};if(v)bonos[k]=v;else delete bonos[k];patch({bonos});};
 const permanente=p.evento==='permanente';
 return <div className="yq-editor">
  <Texto etiqueta="Nombre de la pasiva" valor={p.nombre} max={120} placeholder="Piel de piedra…" onChange={nombre=>patch({nombre})}/>
  <Fichas etiqueta="Cuándo actúa" opciones={EVENTOS.map(o=>({...o,ayuda:reactivo(p.condicion)&&['permanente','inicio_turno'].includes(o.valor)?'Las condiciones de ataque necesitan un momento reactivo':undefined}))} valor={p.evento} onChange={evento=>patch({evento,...(reactivo(p.condicion)&&['permanente','inicio_turno'].includes(evento)?{condicion:'siempre' as const}:{})})} tono="verde" columnas={2}/>
  <Fichas etiqueta="Solo si" opciones={CONDICIONES} valor={p.condicion} onChange={condicion=>patch({condicion,...(reactivo(condicion)&&['permanente','inicio_turno'].includes(p.evento)?{evento:'recibir_ataque' as const}:{})})} columnas={3}/>
  {permanente?<fieldset className="yq-bonos"><legend>Bonos mientras se cumpla</legend>
   {BONOS.map(([k,n])=><label key={k} className={p.bonos[k]?'is-activo':undefined}><span>{n}</span><Rueda nombre={'bono_'+k} etiqueta={`Bono de ${n}`} valor={p.bonos[k]||0} min={-9999} max={9999} onChange={v=>bono(k,v)} compacta/></label>)}
  </fieldset>:<>
   <fieldset className="yq-bonos"><legend>Al activarse</legend>
    {([['curacion','Cura'],['recuperar_ph','PH'],['reducir_fatiga','Alivia']] as const).map(([k,n])=><label key={k} className={p[k]?'is-activo':undefined}><span>{n}</span><Rueda nombre={k} etiqueta={{curacion:'Vida que recupera',recuperar_ph:'PH que recupera',reducir_fatiga:'Fatiga que reduce'}[k]} valor={p[k]} min={0} max={9999} onChange={v=>patch({[k]:Math.max(0,v)})} compacta/></label>)}
   </fieldset>
   {p.evento!=='inicio_turno'&&<>
    <Fichas etiqueta="Ante qué elemento" opciones={ELEMENTOS} valor={p.elemento||'cualquiera'} onChange={elemento=>patch({elemento:elemento==='cualquiera'?undefined:elemento})} tono="arcano"/>
    <fieldset className="yq-bonos"><legend>Defensa y represalia</legend>
     {p.evento==='recibir_ataque'&&<label className={p.bonos.armadura?'is-activo':undefined}><span>ARM</span><Rueda nombre="arm" etiqueta="Armadura solo contra este ataque" valor={p.bonos.armadura||0} min={-999} max={999} onChange={v=>bono('armadura',v)} compacta/></label>}
     <label className={p.reduccion_pct?'is-activo':undefined}><span>Reduce %</span><Rueda nombre="reduccion" etiqueta="Reducción de daño en porcentaje" valor={p.reduccion_pct||0} min={0} max={100} paso={5} onChange={v=>patch({reduccion_pct:v||undefined})} compacta/></label>
     <label className={p.represalia_dados?'is-activo':undefined}><span>Devuelve</span><span className="yq-represalia">
      <Rueda nombre="represalia_dados" etiqueta="Dados de daño al atacante" valor={p.represalia_dados||0} min={0} max={100} onChange={v=>patch({represalia_dados:Math.round(v)||undefined})} compacta/>
      <b aria-hidden="true">d</b>
      <Rueda nombre="represalia_caras" etiqueta="Caras de esos dados" valor={p.represalia_caras||6} valores={CARAS} onChange={v=>patch({represalia_caras:v})} compacta/>
     </span></label>
    </fieldset>
   </>}
  </>}
 </div>;
}
