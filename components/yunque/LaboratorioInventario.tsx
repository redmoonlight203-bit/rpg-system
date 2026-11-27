'use client';
import {useState} from 'react';
import {bonosAbsorbidos,devorar,validarArtefacto,type ConfiguracionArtefacto,type ArmaDevorable,type EstadoPortador} from '../../lib/artefactos';
import {tipoDe} from '../../lib/creacion';
import type {ContextoTaller} from './contexto';

type Copia={id:string;tipo:string;objeto:ArmaDevorable};
type Escena={copias:Copia[];progreso:EstadoPortador};
const inicial:Escena={copias:[],progreso:{nivel:1,absorbidas:[]}};
export default function LaboratorioInventario({ctx,fuente,config,configurar}:{configurar:(config:ConfiguracionArtefacto)=>void;ctx:ContextoTaller;fuente?:string|null;config:ConfiguracionArtefacto}){
 const [pasos,setPasos]=useState<Escena[]>([inicial]);
 const [consulta,buscar]=useState(''),[pendiente,elegir]=useState('');
 const [forzado,tirada]=useState('');
 const inter=config.interaccionInventario;
 const categoria=inter?.categoria||'',metodo=inter?.metodo||'tabla';
 function ajustar(cambio:Partial<NonNullable<ConfiguracionArtefacto['interaccionInventario']>>){
  configurar({...config,interaccionInventario:{id:inter?.id??crypto.randomUUID(),nombre:'Devorar',categoria,metodo,...inter,...cambio}});
 }
 const actual=pasos[pasos.length-1];
 const visibles=ctx.creaciones.filter(c=>(!c.estado||c.estado==='aprobado')&&!c.personal_de&&!c.ligado_al_alma);
 const objetos=visibles.filter(c=>c.id!==fuente&&(c.tipo_creacion??tipoDe(c,ctx.categorias))==='objeto');
 const nombres=new Map(visibles.map(c=>[c.id,c.nombre]));
 const refs=(ids:string[])=>ids.filter(id=>nombres.has(id)).map(id=>({id,nombre:nombres.get(id)!}));
 const apta=(c:Copia)=>(!categoria||c.tipo===categoria)&&!!(Object.keys(c.objeto.stats).length||c.objeto.habilidades.length||c.objeto.pasivas.length);
 const seleccion=actual.copias.find(c=>c.id===pendiente&&apta(c));
 const error=validarArtefacto(config);
 function confirmar(){
  if(!seleccion||error)return;
  const definicion=metodo==='completa'?{...config,tramos:[{desde:1,hasta:100,nombre:'Absorción completa',estadisticas:'todas' as const,habilidades:'todas' as const,pasivas:true}]}:config;
  let primera=true;
  const progreso=devorar(definicion,actual.progreso,seleccion.objeto,caras=>{
   const fija=primera&&forzado;primera=false;
   return fija?Number(fija):1+Math.floor(Math.random()*caras);
  });
  setPasos([...pasos,{copias:actual.copias.filter(c=>c.id!==seleccion.id),progreso}]);elegir('');
 }
 const bonos=bonosAbsorbidos(actual.progreso);
 return <details className="yq-ficha-seccion"><summary>Laboratorio de inventario · Probar interacción</summary>
 <label className="yq-campo">Nombre de la interacción<input maxLength={120} value={inter?.nombre??'Devorar'} onChange={e=>ajustar({nombre:e.target.value})}/></label>
 <p className="yq-nota">Cada tarjeta es una copia temporal de La Creación.</p>
 <label className="yq-campo">Buscar objeto para copiar<input value={consulta} onChange={e=>buscar(e.target.value)}/></label>
 {objetos.filter(c=>c.nombre.toLocaleLowerCase().includes(consulta.toLocaleLowerCase())).slice(0,20).map(c=><button type="button" className="yq-boton" key={c.id} onClick={()=>{
 const copia={id:crypto.randomUUID(),tipo:c.tipo,objeto:{nombre:c.nombre,stats:{...c.stats},habilidades:refs(c.habilidades||[]),pasivas:refs(c.pasivas||[])}};
 setPasos([...pasos,{...actual,copias:[...actual.copias,copia]}]);}}>+ {c.nombre}</button>)}
 <label className="yq-campo">Objetivos permitidos<select value={categoria} onChange={e=>{ajustar({categoria:e.target.value});elegir('')}}><option value="">Cualquier objeto</option>{[...new Set(objetos.map(c=>c.tipo))].map(t=><option key={t} value={t}>{ctx.categorias.find(c=>c.clave===t)?.nombre||t}</option>)}</select></label>
 <label className="yq-campo">Absorción<select value={metodo} onChange={e=>ajustar({metodo:e.target.value==='completa'?'completa':'tabla'})}><option value="tabla">Tabla d100 del borrador</option><option value="completa">Completa</option></select></label>
 {metodo==='tabla'&&<label className="yq-campo">Dado de prueba<select value={forzado} onChange={e=>tirada(e.target.value)}><option value="">Aleatorio</option>{Array.from({length:100},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label>}
 <p>Inventario temporal · {actual.copias.length} unidades</p>
 {actual.copias.map(c=><button type="button" className="yq-boton" key={c.id} disabled={!apta(c)} onClick={()=>elegir(c.id)}>{c.objeto.nombre}{!apta(c)?' · Incompatible':''}</button>)}
 {seleccion&&<div><p>Consumir una copia de {seleccion.objeto.nombre}. Propiedades candidatas: {[...Object.entries(seleccion.objeto.stats).map(([k,v])=>k+' '+v),...seleccion.objeto.habilidades.map(h=>h.nombre),...seleccion.objeto.pasivas.map(p=>p.nombre)].join(', ')}</p><button type="button" disabled={!!error} onClick={confirmar}>Confirmar consumo</button> <button type="button" onClick={()=>elegir('')}>Cancelar</button></div>}
 {error&&<p role="alert">{error}</p>}
 <p>Nivel {actual.progreso.nivel} · {actual.progreso.absorbidas.length} consumos</p>
 <p>{[...Object.entries(bonos.stats).map(([k,v])=>k+' '+v),...bonos.habilidades.map(h=>h.nombre),...bonos.pasivas.map(p=>p.nombre)].join(' · ')}</p>
 <ol>{actual.progreso.absorbidas.map((a,i)=><li key={i}>{a.arma} · {a.tramo} ({a.tirada})</li>)}</ol>
 <button type="button" disabled={pasos.length===1} onClick={()=>{setPasos(pasos.slice(0,-1));elegir('')}}>Deshacer</button> <button type="button" onClick={()=>{setPasos([inicial]);elegir('')}}>Reiniciar inventario</button>
 </details>;
}
