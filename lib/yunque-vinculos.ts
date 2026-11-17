import {SLOTS,type TipoCreacion} from "./creacion";
import type {Borrador} from "./yunque-borrador";
import type {Operacion} from "./yunque-operaciones";
/**
 * Vínculos de un personaje o monstruo con la colección (equipo, habilidades y pasivas). Puro: devuelve
 * las `Operacion` que el taller pasa a `aplicar`, o lanza `Error` con un mensaje claro si no encaja.
 */
export type Enlazable={id:string;nombre:string;tipo:TipoCreacion;slot_tipo?:string};
export type ItemEquipo={id:string;slot_tipo?:string};
const falla=(m:string):never=>{throw new Error(m);};
const MANOS=['mano_der','mano_izq'];
export const nombreHueco=(slot:string)=>SLOTS.find(s=>s.clave===slot)?.nombre??slot;
/** Huecos de equipo donde cabe una pieza con ese `slot_tipo` (en el orden de SLOTS). */
export const huecosCompatibles=(slotTipo:string|undefined):string[]=>SLOTS.filter(s=>s.tipos.includes(slotTipo||'ninguno')).map(s=>s.clave);
/**
 * Pone (o quita, con `id` vacío) una pieza en un hueco, como `ponerEquipo` de la Forja:
 * un arma a dos manos en una mano libera la otra, y una pieza normal desplaza a un arma a dos manos.
 */
export function ponerEquipo(equipo:Record<string,string>,slot:string,id:string,creaciones:ItemEquipo[]):Record<string,string>{
 const r={...equipo};
 if(id)r[slot]=id;else delete r[slot];
 if(MANOS.includes(slot)){
  const otra=slot==='mano_der'?'mano_izq':'mano_der';
  const dosManos=(x?:string)=>!!x&&creaciones.find(f=>f.id===x)?.slot_tipo==='dos_manos';
  if(dosManos(id)||dosManos(r[otra]))delete r[otra];
 }
 return r;
}
/** Primer hueco libre compatible (un arma a dos manos necesita ambas manos libres); si no hay, el primero compatible. */
export function huecoLibre(equipo:Record<string,string>,slotTipo:string|undefined):string|undefined{
 const compatibles=huecosCompatibles(slotTipo);
 const libre=compatibles.find(s=>!equipo[s]&&(slotTipo!=='dos_manos'||(!equipo.mano_der&&!equipo.mano_izq)));
 return libre??compatibles[0];
}
/**
 * Enlazar `item` al personaje del borrador. Con `slot` (un hueco de la figura), la pieza va ahí;
 * sin él, las habilidades y pasivas se suman a su lista y el equipo busca un hueco libre compatible.
 * Si la pieza ya estaba equipada en otro hueco, se mueve.
 */
export function planEnlazar(b:Borrador,item:Enlazable,slot:string|undefined,creaciones:ItemEquipo[]):Operacion[]{
 if(b.tipo!=='personaje')falla('Solo los personajes y monstruos enlazan creaciones de la colección.');
 const nombre=item.nombre||'Esta creación';
 if(item.tipo==='habilidad'||item.tipo==='pasiva'){
  const lista=item.tipo==='habilidad'?'habilidades':'pasivas';
  if(slot)falla(`«${nombre}» no es equipo: suéltala sobre el núcleo para sumarla a sus ${lista}.`);
  if(b[lista].includes(item.id))falla(`«${nombre}» ya está enlazada.`);
  return [{op:'fijar',ruta:[lista],valor:[...b[lista],item.id]}];
 }
 if(item.tipo!=='objeto'&&item.tipo!=='titulo')falla(`«${nombre}» no se enlaza a un personaje: solo objetos, títulos, habilidades y pasivas.`);
 const compatibles=huecosCompatibles(item.slot_tipo);
 if(!compatibles.length)falla(`«${nombre}» no se equipa: en su creación, elige dónde se lleva.`);
 if(slot&&!compatibles.includes(slot))falla(`«${nombre}» no cabe en ${nombreHueco(slot)}: va en ${compatibles.map(nombreHueco).join(', ')}.`);
 let equipo={...b.equipamiento};
 const destino=slot??huecoLibre(equipo,item.slot_tipo)!;
 if(equipo[destino]===item.id)falla(`«${nombre}» ya está en ${nombreHueco(destino)}.`);
 for(const [k,v] of Object.entries(equipo))if(v===item.id)delete equipo[k];
 equipo=ponerEquipo(equipo,destino,item.id,creaciones);
 return [{op:'fijar',ruta:['equipamiento'],valor:equipo}];
}
/** Cambiar una pieza de equipo a otro hueco compatible. */
export function planMoverEquipo(b:Borrador,desde:string,hasta:string,creaciones:ItemEquipo[]):Operacion[]{
 const id=b.equipamiento[desde]??falla('Ese hueco ya está vacío.');
 if(desde===hasta)return [];
 const item=creaciones.find(c=>c.id===id);
 if(!huecosCompatibles(item?.slot_tipo).includes(hasta))falla(`Esa pieza no cabe en ${nombreHueco(hasta)}.`);
 const sin={...b.equipamiento};delete sin[desde];
 return [{op:'fijar',ruta:['equipamiento'],valor:ponerEquipo(sin,hasta,id,creaciones)}];
}
