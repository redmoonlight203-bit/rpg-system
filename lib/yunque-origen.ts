import type {Borrador} from './yunque-borrador';
import type {Ruta} from './yunque-grafo';

/** Vínculo de un nodo desplegado con su plantilla viva. `fragmento` es el id fijo del fragmento dentro de la plantilla. */
export type OrigenPlantilla={plantilla:string;fragmento:string;version:number;editados:string[]};
export const MENSAJE_ORIGEN='El vínculo con la plantilla está dañado: conviértelo en nodo propio.';

const RE_PLANTILLA=/^[a-z0-9][a-z0-9-]{0,79}$/;
const RE_CLAVE=/^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const LISTAS=['efectos','reglas','reglas_pasivas'] as const;
type Lista=typeof LISTAS[number];
type Fragmento=Record<string,unknown>;

function esObjeto(x:unknown):x is Record<string,unknown>{return typeof x==='object'&&x!==null&&!Array.isArray(x)}
function claveValida(k:unknown):k is string{return typeof k==='string'&&RE_CLAVE.test(k)&&k!=='id'&&k!=='origen'}

/** null si es undefined o válido; MENSAJE_ORIGEN si no. */
export function validarOrigen(x:unknown):string|null{
 if(x===undefined)return null;
 return leerOrigen(x)?null:MENSAJE_ORIGEN;
}

/** Copia del origen si es válido; null si falta o está dañado. */
export function leerOrigen(x:unknown):OrigenPlantilla|null{
 if(!esObjeto(x))return null;
 const {plantilla,fragmento,version,editados}=x;
 if(typeof plantilla!=='string'||!RE_PLANTILLA.test(plantilla))return null;
 if(typeof fragmento!=='string'||fragmento.length<1||fragmento.length>120)return null;
 if(typeof version!=='number'||!Number.isInteger(version)||version<1||version>100000)return null;
 if(!Array.isArray(editados)||editados.length>128||!editados.every(claveValida)||new Set(editados).size!==editados.length)return null;
 return {plantilla,fragmento,version,editados:[...editados]};
}

function sinIds(k:string,v:unknown):unknown{return k==='id'?undefined:v}
/** Compara el JSON de dos valores ignorando todas las claves 'id' (también las anidadas). */
export function igualSinIds(a:unknown,b:unknown):boolean{
 return JSON.stringify(a,sinIds)===JSON.stringify(b,sinIds);
}

function nuevasClaves(antes:Fragmento,despues:Fragmento,origen:OrigenPlantilla):string[]{
 const claves=new Set([...Object.keys(antes),...Object.keys(despues)]);
 const nuevas:string[]=[];
 for(const k of claves){
  if(k==='id'||k==='origen'||!RE_CLAVE.test(k)||origen.editados.includes(k))continue;
  if(JSON.stringify(antes[k])!==JSON.stringify(despues[k]))nuevas.push(k);
 }
 return nuevas;
}

/**
 * Marca en `origen.editados` las claves de primer nivel que el GM ha cambiado en fragmentos con origen válido.
 * Nunca desmarca. Si no hay nada nuevo que marcar devuelve `despues` tal cual (misma identidad). No muta las entradas.
 */
export function anotarEditados(antes:Borrador,despues:Borrador,ruta?:Ruta):Borrador{
 const A=antes as unknown as Record<string,unknown>,D=despues as unknown as Record<string,unknown>;
 // Un cambio dirigido fuera de las listas con origen (stats, nombre...) no puede marcar nada: evita comparar las tres listas en cada tecla.
 if(ruta&&ruta.length&&!(LISTAS as readonly unknown[]).includes(ruta[0]))return despues;
 const lista=ruta&&ruta.length>=2&&typeof ruta[1]==='number'&&(LISTAS as readonly unknown[]).includes(ruta[0])?ruta[0] as Lista:null;
 const indice=lista?ruta![1] as number:-1;
 const cambios:Partial<Record<Lista,Map<number,Fragmento>>>={};
 for(const l of lista?[lista]:LISTAS){
  const dl=D[l],al=A[l];
  if(!Array.isArray(dl)||!Array.isArray(al))continue;
  dl.forEach((frag:unknown,i:number)=>{
   if(lista&&i!==indice)return;
   if(!esObjeto(frag))return;
   const origen=leerOrigen(frag.origen);
   if(!origen||typeof frag.id!=='string')return;
   const previo=al.find((f:unknown)=>esObjeto(f)&&f.id===frag.id);
   if(!esObjeto(previo))return;
   const nuevas=nuevasClaves(previo,frag,origen);
   if(!nuevas.length)return;
   const editados=[...origen.editados,...nuevas].slice(0,128);
   (cambios[l]??=new Map()).set(i,{...frag,origen:{...origen,editados}});
  });
 }
 const listas=Object.keys(cambios) as Lista[];
 if(!listas.length)return despues;
 const salida:Record<string,unknown>={...D};
 for(const l of listas)salida[l]=(D[l] as unknown[]).map((f,i)=>cambios[l]!.get(i)??f);
 return salida as unknown as Borrador;
}
