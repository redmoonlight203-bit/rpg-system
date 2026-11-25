'use client';
import {createContext,useContext,useMemo,useState,type ReactNode} from 'react';
import {CATALOGO_ESTADOS} from '../lib/estados';
import type {CondicionRegla,EfectoRegla,Regla} from '../lib/reglas';
import type {Efecto} from '../lib/creacion';

type Opciones=Map<string,string>;
type Catalogo={atributo:Opciones;estado:Opciones};
type Stat={clave:string;etiqueta:string};
export type FuenteReglas={reglas?:Regla[];efectos?:Efecto[];stats?:Record<string,number>};
const base:Catalogo={
 atributo:new Map(Object.entries({vida:'Vida máxima',vida_actual:'Vida actual',ph:'PH máximos',ph_actual:'PH actuales',fatiga:'Límite de fatiga',fatiga_actual:'Fatiga actual',armadura:'Armadura',dano:'Daño adicional',bono_impacto:'Bono al impacto',salvacion:'Salvación',iniciativa:'Iniciativa',movimiento:'Movimiento',fuerza:'Fuerza',mente:'Mente',destreza:'Destreza'})),
 estado:new Map([['furia','Furia'],...CATALOGO_ESTADOS.map(e=>[e.id,e.nombre] as const)]),
};
const Contexto=createContext(base);
const legible=(v:string)=>v.replaceAll('_',' ').replace(/^./,c=>c.toLocaleUpperCase('es'));

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
}

export function CatalogoReglas({atributos,fuentes,children}:{atributos?:Stat[];fuentes:FuenteReglas[];children:ReactNode}){
 const anterior=useContext(Contexto);
 const catalogo=useMemo(()=>{
  const c={atributo:new Map(anterior.atributo),estado:new Map(anterior.estado)};
  for(const a of atributos||[])agregar(c.atributo,a.clave,a.etiqueta);
  for(const fuente of fuentes){
   for(const k of Object.keys(fuente.stats||{}))agregar(c.atributo,k);
   for(const r of fuente.reglas||[]){leerCondicion(r.condicion,c);r.efectos.forEach(e=>leerEfecto(e,c));}
   for(const e of fuente.efectos||[]){
    agregar(c.atributo,e.requisito_forma?.atributo);
    agregar(c.atributo,e.salvacion?.atributo);
    if(e.efecto==='estado'){
     const id=e.estado_def?.id||(!e.estado_tipo||e.estado_tipo==='narrativo'?'estado:'+e.id:e.estado_tipo);
     agregar(c.estado,id,e.estado_def?.nombre||e.estado||undefined);
    }
   }
  }
  return c;
 },[anterior,atributos,fuentes]);
 return <Contexto.Provider value={catalogo}>{children}</Contexto.Provider>;
}

type Props={tipo:'atributo'|'estado';etiqueta:string;valor:string;opcional?:boolean;onChange:(valor:string,nombre:string)=>void;crear?:boolean};
export function SelectorRegla({tipo,etiqueta,valor,opcional,onChange,crear}:Props){
 const opciones=useContext(Contexto)[tipo];
 const [nombre,setNombre]=useState<string|null>(null);
 const lista=useMemo(()=>{
  const filas=Array.from(opciones).filter(([id])=>tipo==='estado'||/^[a-z_][a-z0-9_]{0,63}$/.test(id));
 if(valor&&!filas.some(([id])=>id===valor))filas.push([valor,legible(valor)]);
  const cantidades=new Map<string,number>();
  for(const [,texto] of filas)cantidades.set(texto,(cantidades.get(texto)||0)+1);
  return filas.sort((a,b)=>a[1].localeCompare(b[1],'es')).map(([id,texto])=>({id,texto:cantidades.get(texto)!>1?texto+' · '+id:texto}));
 },[opciones,tipo,valor]);
 const nuevo=nombre?.trim()||'';
 const repetido=!!nuevo&&Array.from(opciones).some(([id,texto])=>[id,texto].some(v=>v.localeCompare(nuevo,'es',{sensitivity:'accent'})===0));
 return <div><label className="yq-campo"><span>{etiqueta}</span><select className="w-full rounded-lg border border-neutral-700 bg-well p-2 text-sm" value={valor} onChange={e=>{setNombre(null);onChange(e.target.value,opciones.get(e.target.value)||'');}}>
  <option value="" disabled={!opcional}>{opcional?'Ninguno':'Selecciona una opción'}</option>
  {lista.map(({id,texto})=><option key={id} value={id}>{texto}</option>)}
 </select></label>
 {crear&&(nombre===null?<button type="button" className="yq-boton" onClick={()=>setNombre('')}>Crear estado o forma</button>:<div>
  <label className="yq-campo">Nombre del nuevo estado o forma<input autoFocus maxLength={100} value={nombre} onChange={e=>setNombre(e.target.value)}/></label>
  {repetido&&<p className="yq-nota">Ese nombre ya existe. Puedes seleccionarlo en el menú.</p>}
  <button type="button" className="yq-boton" disabled={!nuevo||repetido} onClick={()=>{onChange(nuevo,nuevo);setNombre(null);}}>Crear y seleccionar</button>
  <button type="button" className="yq-boton" onClick={()=>setNombre(null)}>Cancelar</button>
 </div>)}</div>;
}
