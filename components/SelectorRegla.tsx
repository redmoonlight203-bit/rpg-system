'use client';
// Catálogo único de claves del Yunque. Todo lo que antes se escribía a mano (atributos, estados, formas de
// transformación, recursos) se elige aquí de una lista; crear uno nuevo genera su clave a partir del nombre.
import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {CATALOGO_ESTADOS,validarDefinicionEstado,type DefinicionEstado} from '../lib/estados';
import {ATRIBUTOS_COMBATE} from '../lib/catalogos';
import {CLAVE_VALIDA,claveLibre} from '../lib/claves';
import type {CondicionRegla,EfectoRegla,Regla} from '../lib/reglas';
import type {Efecto,Reaccion,ResultadoReaccion} from '../lib/creacion';

type Opciones=Map<string,string>;
export type TipoClave='atributo'|'estado'|'forma'|'recurso'|'grupo';
type Catalogo=Record<TipoClave,Opciones>;
type Stat={clave:string;etiqueta:string};
export type FuenteReglas={reglas?:Regla[];efectos?:Efecto[];stats?:Record<string,number>};
const base:Catalogo={
 atributo:new Map(ATRIBUTOS_COMBATE.map(a=>[a.clave,a.nombre])),
 estado:new Map([['furia','Furia'],...CATALOGO_ESTADOS.map(e=>[e.id,e.nombre.split(':')[0]] as const)]),
 forma:new Map(),
 recurso:new Map(),
 grupo:new Map(),
};
const Contexto=createContext(base);
const ContextoGrimorio=createContext<DefinicionEstado[]>([]);
const legible=(v:string)=>v.replaceAll('_',' ').replace(/^./,c=>c.toLocaleUpperCase('es'));

/** Estados del grimorio del GM. Una lectura compartida por todos los selectores (se renueva cada minuto). */
let cacheGrimorio:{t:number;p:Promise<DefinicionEstado[]>}|null=null;
function leerGrimorio():Promise<DefinicionEstado[]>{
 if(!cacheGrimorio||Date.now()-cacheGrimorio.t>60_000){
  // Carga diferida: el cliente de Supabase solo se importa en el navegador, al leer el grimorio.
  cacheGrimorio={t:Date.now(),p:import('../lib/supabase').then(({supabase})=>supabase.from('estados_personalizados').select('id,definicion')).then(r=>r.error?[]:(r.data||[]).map(f=>f.definicion as DefinicionEstado).filter(d=>d&&typeof d==='object'&&!validarDefinicionEstado(d))).catch(()=>[])};
 }
 return cacheGrimorio.p;
}

function agregar(mapa:Opciones,clave?:string,nombre?:string){
 if(clave&&(nombre||!mapa.has(clave)))mapa.set(clave,nombre||legible(clave));
}
function leerCondicion(c:CondicionRegla,catalogo:Catalogo){
 switch(c.tipo){
  case 'todas':case 'alguna':c.condiciones.forEach(h=>leerCondicion(h,catalogo));break;
  case 'no':leerCondicion(c.condicion,catalogo);break;
  case 'comparar':agregar(catalogo.atributo,c.atributo);break;
  case 'estado':agregar(catalogo.estado,c.estado);break;
  case 'estado_terminado':agregar(catalogo.estado,c.clave);break;
 }
}
function leerEfecto(e:EfectoRegla,catalogo:Catalogo){
 agregar(catalogo.atributo,e.atributo);
 if(typeof e.valor==='object')agregar(catalogo.atributo,e.valor.atributo);
 for(const cambio of e.cambios||[]){
  agregar(catalogo.atributo,cambio.atributo);
  if(typeof cambio.valor==='object')agregar(catalogo.atributo,cambio.valor.atributo);
 }
 if(['estado','transformar','quitar_estado','habilidad'].includes(e.tipo))agregar(catalogo.estado,e.clave,e.tipo==='quitar_estado'?undefined:e.nombre);
 if(e.condicion)leerCondicion(e.condicion,catalogo);
 for(const rama of [e.exito,e.fallo])rama?.forEach(h=>leerEfecto(h,catalogo));
 if(e.accion)leerAccion(e.accion,catalogo);
}
function leerResultado(r:ResultadoReaccion|undefined,catalogo:Catalogo){if(r?.reservar)agregar(catalogo.recurso,r.reservar.recurso,r.reservar.recurso);}
function leerReaccion(r:Reaccion|undefined,catalogo:Catalogo){
 if(!r)return;
 agregar(catalogo.forma,r.forma);agregar(catalogo.forma,r.sin_forma);
 leerResultado(r.principal,catalogo);leerResultado(r.seguimiento,catalogo);
 if(r.principal?.salvacion)agregar(catalogo.atributo,r.principal.salvacion.atributo);
}
/** Lo que una acción aporta al catálogo: sus estados, su forma de transformación y sus recursos. */
function leerAccion(e:Efecto,c:Catalogo){
 agregar(c.atributo,e.requisito_forma?.atributo);
 agregar(c.atributo,e.salvacion?.atributo);
 if(e.efecto==='estado'){
  const id=e.estado_def?.id||(!e.estado_tipo||e.estado_tipo==='narrativo'?'estado:'+e.id:e.estado_tipo);
  agregar(c.estado,id,e.estado_def?.nombre||e.estado||undefined);
 }
 if(e.estado_impacto)agregar(c.estado,e.estado_impacto.id,e.estado_impacto.nombre);
 if(e.transformacion?.id)agregar(c.forma,e.transformacion.id,e.transformacion.nombre);
 if(e.recurso?.nombre)agregar(c.recurso,e.recurso.nombre,e.recurso.nombre);
 const grupo=e.grupo_barra?.trim()||(e.axioma?'Axioma':'');if(grupo)agregar(c.grupo,grupo,grupo);
 if(e.gratis_en_forma)agregar(c.forma,e.gratis_en_forma);else if(e.ley_limitless)agregar(c.forma,'limitless','Limitless');
 for(const d of e.rasgo?.recursos||[])agregar(c.recurso,d.id,d.nombre);
 leerReaccion(e.reaccion,c);
}

export function CatalogoReglas({atributos,fuentes,children}:{atributos?:Stat[];fuentes:FuenteReglas[];children:ReactNode}){
 const anterior=useContext(Contexto);
 // Solo el proveedor más externo lee el grimorio; los anidados heredan sus estados.
 const raiz=anterior===base;
 const grimorioAnterior=useContext(ContextoGrimorio);
 const [propio,setGrimorio]=useState<DefinicionEstado[]>([]);
 const grimorio=raiz?propio:grimorioAnterior;
 useEffect(()=>{if(!raiz)return;let vivo=true;void leerGrimorio().then(l=>{if(vivo)setGrimorio(l);});return()=>{vivo=false;};},[raiz]);
 const catalogo=useMemo(()=>{
  const c:Catalogo={atributo:new Map(anterior.atributo),estado:new Map(anterior.estado),forma:new Map(anterior.forma),recurso:new Map(anterior.recurso),grupo:new Map(anterior.grupo)};
  for(const d of grimorio)agregar(c.estado,d.id,d.nombre.split(':')[0]);
  for(const a of atributos||[])agregar(c.atributo,a.clave,a.etiqueta);
  for(const fuente of fuentes){
   for(const k of Object.keys(fuente.stats||{}))agregar(c.atributo,k);
   for(const r of fuente.reglas||[]){leerCondicion(r.condicion,c);r.efectos.forEach(e=>leerEfecto(e,c));}
   for(const e of fuente.efectos||[])leerAccion(e,c);
  }
  return c;
 },[anterior,atributos,fuentes,grimorio]);
 return <ContextoGrimorio.Provider value={grimorio}><Contexto.Provider value={catalogo}>{children}</Contexto.Provider></ContextoGrimorio.Provider>;
}
/** Definición de un estado del grimorio por su id (para guardar su copia al elegirlo en una regla). */
export function useDefinicionGrimorio(){
 const grimorio=useContext(ContextoGrimorio);
 return useCallback((id:string)=>grimorio.find(d=>d.id===id),[grimorio]);
}
/** Opciones de un tipo de clave (para selectores propios, p. ej. fichas). */
export const useCatalogo=(tipo:TipoClave)=>useContext(Contexto)[tipo];

const TEXTOS:Record<TipoClave,{crear:string;campo:string;vacio:string}>={
 atributo:{crear:'Crear atributo',campo:'Nombre del nuevo atributo',vacio:'Selecciona un atributo'},
 estado:{crear:'Crear estado o forma',campo:'Nombre del nuevo estado o forma',vacio:'Selecciona un estado'},
 forma:{crear:'',campo:'',vacio:'Selecciona una transformación'},
 recurso:{crear:'Crear recurso',campo:'Nombre del nuevo recurso',vacio:'Selecciona un recurso'},
 grupo:{crear:'Crear grupo',campo:'Nombre del nuevo grupo',vacio:'Selecciona un grupo'},
};
type Props={tipo:TipoClave;etiqueta:string;valor:string;opcional?:boolean;textoOpcional?:string;onChange:(valor:string,nombre:string)=>void;crear?:boolean;ayuda?:string};
/**
 * Desplegable de claves. Nunca se escribe una clave: se elige. «Crear» pide un nombre y genera la clave
 * (los recursos se guardan por su nombre, que es como los comparte el motor).
 */
export function SelectorRegla({tipo,etiqueta,valor,opcional,textoOpcional,onChange,crear,ayuda}:Props){
 const opciones=useContext(Contexto)[tipo];
 const [nombre,setNombre]=useState<string|null>(null);
 const lista=useMemo(()=>{
  const filas=Array.from(opciones).filter(([id])=>tipo!=='atributo'||CLAVE_VALIDA.test(id));
  if(valor&&!filas.some(([id])=>id===valor))filas.push([valor,legible(valor)]);
  const cantidades=new Map<string,number>();
  for(const [,texto] of filas)cantidades.set(texto,(cantidades.get(texto)||0)+1);
  return filas.sort((a,b)=>a[1].localeCompare(b[1],'es')).map(([id,texto])=>({id,texto:cantidades.get(texto)!>1?texto+' · '+id:texto}));
 },[opciones,tipo,valor]);
 const nuevo=nombre?.trim()||'';
 const repetido=!!nuevo&&Array.from(opciones).some(([id,texto])=>[id,texto].some(v=>v.localeCompare(nuevo,'es',{sensitivity:'accent'})===0));
 const t=TEXTOS[tipo];
 function confirmar(){
  if(!nuevo||repetido)return;
  const clave=tipo==='recurso'||tipo==='grupo'?nuevo:claveLibre(nuevo,opciones.keys(),tipo);
  onChange(clave,nuevo);setNombre(null);
 }
 return <div><label className="yq-campo"><span>{etiqueta}</span><select className="w-full rounded-lg border border-neutral-700 bg-well p-2 text-sm" value={valor} onChange={e=>{setNombre(null);onChange(e.target.value,opciones.get(e.target.value)||'');}}>
  <option value="" disabled={!opcional}>{opcional?textoOpcional||'Ninguno':lista.length?t.vacio:tipo==='forma'?'Aún no hay transformaciones':t.vacio}</option>
  {lista.map(({id,texto})=><option key={id} value={id}>{texto}</option>)}
 </select>{ayuda&&<small className="yq-ayuda">{ayuda}</small>}</label>
 {crear&&tipo!=='forma'&&(nombre===null?<button type="button" className="yq-boton" onClick={()=>setNombre('')}>{t.crear}</button>:<div>
  <label className="yq-campo">{t.campo}<input autoFocus maxLength={100} value={nombre} onChange={e=>setNombre(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();confirmar();}}}/></label>
  {repetido&&<p className="yq-nota">Ese nombre ya existe. Puedes seleccionarlo en el menú.</p>}
  <button type="button" className="yq-boton" disabled={!nuevo||repetido} onClick={confirmar}>Crear y seleccionar</button>
  <button type="button" className="yq-boton" onClick={()=>setNombre(null)}>Cancelar</button>
 </div>)}</div>;
}
