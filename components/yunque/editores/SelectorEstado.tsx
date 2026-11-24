'use client';
// Selector de estado o forma: se elige del registro de la creación, nunca se escribe la clave a mano.
// «+ Crear estado nuevo» pide el nombre; «Renombrar» cambia solo el nombre visible (el id no cambia).
import {useId,useState} from 'react';
import {crearEstado,opcionesSelector,registrarClavesExistentes,renombrarEnReglas,renombrarEstado,type RegistroEstado} from '../../../lib/registro-estados';
import type {Borrador} from '../../../lib/yunque-borrador';
import type {Operacion} from '../../../lib/yunque-operaciones';

const CREAR='__crear__';
type Props={
 etiqueta?:string;
 valor:string|undefined;
 lista:RegistroEstado[];
 onElegir:(id:string)=>void;
 /** Devuelve un mensaje si no se pudo crear (p. ej. nombre repetido). */
 onCrear:(nombre:string)=>string|void;
 /** Devuelve un mensaje si no se pudo renombrar. Sin él no se ofrece renombrar. */
 onRenombrar?:(id:string,nombre:string)=>string|void;
};

export default function SelectorEstado({etiqueta='Estado o forma',valor,lista,onElegir,onCrear,onRenombrar}:Props){
 const id=useId();
 const [modo,setModo]=useState<null|'crear'|'renombrar'>(null);
 const [texto,setTexto]=useState('');
 const [error,setError]=useState('');
 const opciones=opcionesSelector(lista,valor);
 const actual=opciones.find(o=>o.valor===valor);
 function abrir(m:'crear'|'renombrar'){setModo(m);setTexto(m==='renombrar'&&actual&&!actual.huerfano?actual.nombre:'');setError('');}
 function cerrar(){setModo(null);setTexto('');setError('');}
 function confirmar(){
  const r=modo==='crear'?onCrear(texto):valor&&onRenombrar?onRenombrar(valor,texto):undefined;
  if(r){setError(r);return;}
  cerrar();
 }
 return <div className="yq-campo yq-estado">
  <span id={id}>{etiqueta}</span>
  <div className="yq-estado-fila">
   <select aria-labelledby={id} value={valor||''} className={actual?.huerfano?'is-huerfano':undefined}
    onChange={e=>{if(e.target.value===CREAR)abrir('crear');else{cerrar();onElegir(e.target.value);}}}>
    {!valor&&<option value="" disabled>Elige un estado…</option>}
    {opciones.map(o=><option key={o.valor} value={o.valor}>{o.huerfano?`${o.valor} · Sin registrar`:o.nombre}</option>)}
    <option value={CREAR}>+ Crear estado nuevo</option>
   </select>
   {onRenombrar&&actual&&!actual.huerfano&&modo===null&&<button type="button" className="yq-boton" onClick={()=>abrir('renombrar')}>Renombrar</button>}
  </div>
  {actual?.huerfano&&<small className="yq-campo-ayuda">Sin registrar: el combate lo sigue usando con la clave «{actual.valor}».</small>}
  {modo&&<div className="yq-estado-fila" role="group" aria-label={modo==='crear'?'Crear estado nuevo':'Renombrar estado'}>
   <input autoFocus aria-label={modo==='crear'?'Nombre del estado nuevo':'Nombre nuevo del estado'} maxLength={120} value={texto} placeholder="Furia, Veneno…"
    onChange={e=>{setTexto(e.target.value);setError('');}}
    onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();confirmar();}else if(e.key==='Escape')cerrar();}}/>
   <button type="button" className="yq-boton" onClick={confirmar}>{modo==='crear'?'Crear':'Guardar'}</button>
   <button type="button" className="yq-boton" onClick={cerrar}>Cancelar</button>
  </div>}
  {error&&<small className="yq-campo-ayuda is-error" role="alert">{error}</small>}
 </div>;
}

/** Registro de la creación: los estados creados en el Yunque más las claves que ya usan sus reglas. */
export const registroDe=(b:Borrador):RegistroEstado[]=>registrarClavesExistentes(b.estados??[],b.reglas);

/** SelectorEstado conectado al borrador: crear y renombrar pasan por `operar`, así entran en el historial. */
export function EstadoDelBorrador({b,operar,valor,onElegir,etiqueta}:{b:Borrador;operar:(o:Operacion)=>void;valor:string|undefined;onElegir:(id:string,nombre:string)=>void;etiqueta?:string}){
 const lista=registroDe(b);
 return <SelectorEstado etiqueta={etiqueta} valor={valor} lista={lista}
  onElegir={id=>onElegir(id,lista.find(e=>e.id===id)?.nombre??id)}
  onCrear={nombre=>{
   const r=crearEstado(lista,{nombre});
   if(!r.ok)return r.error;
   operar({op:'fijar',ruta:['estados'],valor:r.lista});
   onElegir(r.id,nombre.trim());
  }}
  onRenombrar={(id,nombre)=>{
   const r=renombrarEstado(lista,id,nombre);
   if(!r.ok)return r.error;
   operar({op:'fijar',ruta:['estados'],valor:r.lista});
   operar({op:'fijar',ruta:['reglas'],valor:renombrarEnReglas(b.reglas,id,nombre.trim())});
  }}/>;
}
