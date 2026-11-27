'use client';
// Editor del nodo «Cuándo» (cabecera de una regla): los 15 eventos como fichas con icono, costes y límites como ruedas.
import {Fichas,Rueda,Texto,type Opcion} from '../Controles';
import {describirRegla} from '../../../lib/descripciones';
import {EVENTOS,type EventoRegla,type Regla} from '../../../lib/reglas';
import {ICONO_EVENTO} from '../../../lib/yunque-grimorio';
import type {EditorNodoProps} from './EditorAccion';

const CORTO:Record<EventoRegla,string>={equipar:'Equipar',desequipar:'Desequipar',fin_efecto:'Fin de estado',usar:'Activar',inicio_combate:'Inicio combate',inicio_turno:'Inicio turno',fin_turno:'Fin de turno',atacar:'Antes de atacar',impactar:'Impactar',fallar:'Fallar',recibir_dano:'Recibir daño',causar_dano:'Causar daño',matar:'Matar',morir:'Caer a 0',fin_combate:'Fin combate'};
const OPCIONES:Opcion<EventoRegla>[]=(Object.keys(EVENTOS) as EventoRegla[]).map(k=>({valor:k,nombre:CORTO[k],icono:ICONO_EVENTO[k],ayuda:EVENTOS[k]}));
const LIMITES:{clave:'coste_ph'|'coste_fatiga'|'enfriamiento'|'usos'|'limite_por_turno'|'prioridad';nombre:string;ayuda:string;min:number;max:number}[]=[
 {clave:'coste_ph',nombre:'PH',ayuda:'PH que gasta al activarse',min:0,max:999},
 {clave:'coste_fatiga',nombre:'Fatiga',ayuda:'Fatiga que genera',min:0,max:999},
 {clave:'enfriamiento',nombre:'Espera',ayuda:'Turnos de espera entre usos',min:0,max:99},
 {clave:'usos',nombre:'Usos',ayuda:'Usos por combate (0 = ilimitados)',min:0,max:99},
 {clave:'limite_por_turno',nombre:'Por turno',ayuda:'Activaciones por turno (0 = ilimitadas)',min:0,max:20},
 {clave:'prioridad',nombre:'Prioridad',ayuda:'Los números mayores se resuelven antes',min:-1000,max:1000},
];

export default function EditorCuando({b,nodo,operar,onAnimacion}:EditorNodoProps&{onAnimacion:()=>void}){
 const r=b.reglas[nodo.ruta[1] as number];
 if(!r)return null;
 const patch=(p:Partial<Regla>)=>operar({op:'fijar',ruta:nodo.ruta,valor:Object.fromEntries(Object.entries({...r,...p}).filter(([,v])=>v!==undefined))});
 const ayuda=describirRegla({...r,descripcion:undefined});
 return <div className="yq-editor">
  <Texto etiqueta="Nombre de la regla" valor={r.nombre} max={120} placeholder="Aliento de vida…" onChange={nombre=>patch({nombre})}/>
  <Fichas etiqueta="Cuándo se activa" opciones={OPCIONES} valor={r.evento} onChange={evento=>patch({evento})} columnas={3} tono="carmesi"/>
  <section className="yq-asi" aria-label="Así funciona">
   <header><span>Así funciona</span>{!r.efectos.length&&<button type="button" className="yq-boton" onClick={()=>operar({op:'agregar',tipo:'entonces',padre:nodo.id})}>+ Efecto</button>}</header>
   <p>{EVENTOS[r.evento]}: {ayuda.resumen}</p>
   <ul>{ayuda.detalles.map((d,i)=><li key={i}>{d}</li>)}</ul>
  </section>
  <button type="button" className="yq-boton" onClick={onAnimacion}>Editar animación de la regla</button>
  <fieldset className="yq-limites"><legend>Costes y límites</legend>
   {LIMITES.map(l=><label key={l.clave} title={l.ayuda}><span>{l.nombre}</span><Rueda nombre={l.clave} etiqueta={l.ayuda} valor={r[l.clave]??0} min={l.min} max={l.max} onChange={v=>patch({[l.clave]:Math.round(v)})} compacta/></label>)}
  </fieldset>
  <label className="yq-campo"><span>Descripción para el jugador</span><textarea rows={2} maxLength={2000} value={r.descripcion||''} placeholder="Opcional: explícala con tus palabras." onChange={e=>patch({descripcion:e.target.value||undefined})}/></label>
 </div>;
}
