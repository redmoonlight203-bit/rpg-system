import type {Borrador} from './yunque-borrador';
import {EFECTOS_NOMBRE} from './creacion';
import {leerOrigen,igualSinIds,type OrigenPlantilla} from './yunque-origen';
import {PLANTILLAS,plantillaPorId,type Plantilla} from './yunque-plantillas';
import {regenerarFragmento} from './yunque-operaciones';

export type CambioPlantilla={nodo:string;titulo:string;plantilla:string;nombrePlantilla:string;
 tipo:'actualizado'|'sin_plantilla'|'sin_fragmento';desde:number;hasta:number|null;
 actualizados:string[];conservados:string[]};

type Dic=Record<string,unknown>;
const esObjeto=(x:unknown):x is Dic=>typeof x==='object'&&x!==null&&!Array.isArray(x);

/** Copia donde `posesion.etapa_id` se sustituye por la posición de su etapa: regenerar ids no cuenta como cambio. */
function normalizar(x:unknown):unknown{
 if(Array.isArray(x))return x.map(normalizar);
 if(!esObjeto(x))return x;
 const r:Dic={};
 for(const k of Object.keys(x))r[k]=normalizar(x[k]);
 const pos=r.posesion;
 if(Array.isArray(r.etapas)&&esObjeto(pos)&&typeof pos.etapa_id==='string'){
  const i=(x.etapas as unknown[]).findIndex(e=>esObjeto(e)&&e.id===pos.etapa_id);
  r.posesion={...pos,etapa_id:i>=0?'#'+i:pos.etapa_id};
 }
 return r;
}
const igual=(a:unknown,b:unknown):boolean=>igualSinIds(normalizar(a),normalizar(b));

/** Aplica al nodo los cambios de la plantilla (ya regenerada) campo a campo, respetando lo que el GM editó. No muta. */
export function actualizarFragmento<T extends {id:string;origen?:OrigenPlantilla}>(nodo:T,plantilla:Record<string,unknown>,version:number):{datos:T;actualizados:string[];conservados:string[]}{
 const n=nodo as unknown as Dic;
 const origen=leerOrigen(n.origen);
 const editados=origen?origen.editados:[];
 const salida:Dic=structuredClone(n);
 const actualizados:string[]=[],conservados:string[]=[];
 const claves=new Set([...Object.keys(n),...Object.keys(plantilla)]);
 for(const k of claves){
  if(k==='id'||k==='origen')continue;
  if(igual(n[k],plantilla[k])&&(k in n)===(k in plantilla))continue;
  if(editados.includes(k)){conservados.push(k);continue;}
  if(k in plantilla)salida[k]=structuredClone(plantilla[k]);else delete salida[k];
  actualizados.push(k);
 }
 if(origen)salida.origen={...origen,version};
 return {datos:salida as unknown as T,actualizados,conservados};
}

const LISTAS=[
 {lista:'efectos',tipo:'accion'},
 {lista:'reglas',tipo:'cuando'},
 {lista:'reglas_pasivas',tipo:'pasiva'},
] as const;

function tituloDe(tipo:string,d:Dic):string{
 const nombre=String(d.nombre??'').trim();
 if(tipo==='accion')return nombre||(EFECTOS_NOMBRE as Record<string,string>)[String(d.efecto)]||'Acción';
 if(tipo==='cuando')return nombre||'Regla';
 return nombre||'Pasiva';
}

/** Recorre acciones, reglas y pasivas desplegadas y las pone al día con su plantilla. Sin cambios devuelve `b`. */
export function actualizarDesdePlantillas(b:Borrador,plantillas:Plantilla[]=PLANTILLAS):{borrador:Borrador;cambios:CambioPlantilla[]}{
 const B=b as unknown as Dic;
 const cambios:CambioPlantilla[]=[];
 const nuevas:Dic={};
 for(const {lista,tipo} of LISTAS){
  const items=B[lista];
  if(!Array.isArray(items))continue;
  let tocada=false;
  const salida=items.map((item:unknown)=>{
   if(!esObjeto(item)||typeof item.id!=='string')return item;
   const origen=leerOrigen(item.origen);
   if(!origen)return item;
   const base={nodo:`${tipo}:${item.id}`,titulo:tituloDe(tipo,item),plantilla:origen.plantilla,desde:origen.version};
   const p=plantillaPorId(origen.plantilla,plantillas);
   if(!p){
    cambios.push({...base,nombrePlantilla:origen.plantilla,tipo:'sin_plantilla',hasta:null,actualizados:[],conservados:[]});
    return item;
   }
   const frag=p.fragmentos.find(f=>f.tipo===tipo&&esObjeto(f.datos)&&f.datos.id===origen.fragmento);
   if(!frag){
    cambios.push({...base,nombrePlantilla:p.nombre,tipo:'sin_fragmento',hasta:null,actualizados:[],conservados:[]});
    return item;
   }
   if(!(p.version>origen.version))return item;
   const fresco=regenerarFragmento(frag) as Dic;
   const r=actualizarFragmento(item as {id:string;origen?:OrigenPlantilla},fresco,p.version);
   tocada=true;
   if(r.actualizados.length||r.conservados.length)cambios.push({...base,nombrePlantilla:p.nombre,tipo:'actualizado',hasta:p.version,actualizados:r.actualizados,conservados:r.conservados});
   return r.datos;
  });
  if(tocada)nuevas[lista]=salida;
 }
 if(!Object.keys(nuevas).length)return {borrador:b,cambios};
 return {borrador:{...b,...nuevas} as Borrador,cambios};
}

export function lineaCambio(c:CambioPlantilla):string{
 if(c.tipo==='sin_plantilla')return `«${c.titulo}»: la plantilla «${c.nombrePlantilla}» ya no existe. El nodo se conserva tal cual; conviértelo en nodo propio para dejar de ver este aviso.`;
 if(c.tipo==='sin_fragmento')return `«${c.titulo}»: la plantilla «${c.nombrePlantilla}» ya no incluye esta pieza. El nodo se conserva tal cual; conviértelo en nodo propio para dejar de ver este aviso.`;
 return `«${c.titulo}» (${c.nombrePlantilla}) pasa de la versión ${c.desde} a la ${c.hasta}.`
  +(c.actualizados.length?` Actualizado: ${c.actualizados.join(', ')}.`:'')
  +(c.conservados.length?` Se conserva tu valor en: ${c.conservados.join(', ')}.`:'');
}
