/**
 * Elementos configurables. Lo que antes estaba escrito a mano en el motor (1d4 elemental, el rayo ignora 3 ARM,
 * el fuego quema, el agua moja…) es ahora una DEFINICIÓN DE DATOS. El catálogo base reproduce exactamente el
 * comportamiento anterior.
 *
 * Un elemento creado en el grimorio es una VARIANTE de un elemento base (`base`): las inmunidades, resistencias,
 * reacciones de Mojado y validaciones de la base de datos lo tratan como su base; lo que cambia es su nombre, su
 * aspecto y lo que hace al golpear. Al usarlo, la habilidad guarda `elemento` = base y una copia en `elemento_def`.
 * Módulo puro (el motor Edge lo incrusta).
 */
import {validarDefinicionEstado,definicionBase,type DefinicionEstado,type TiradaSalvacion} from './estados';

export type ElementoBase='fuego'|'agua'|'electricidad'|'hielo'|'luz_sagrada';
export type EfectoImpacto={
 /** Estado del catálogo base (id) o, si lleva `estado_def`, el id de esa definición propia. */
 estado:string;
 /** Copia de un estado del grimorio (como `estado_def` en las habilidades). */
 estado_def?:DefinicionEstado;
 /** Salvación que evita el estado. Sin ella se aplica siempre (Mojado). */
 salvacion?:TiradaSalvacion|null};
export type DefinicionElemento={id:string;nombre:string;icono?:string;color?:string;base:ElementoBase;
 /** Dados que se suman al daño del golpe (todos los elementos base: 1d4). */
 dados_extra?:{cantidad:number;caras:number}|null;
 /** Armadura del objetivo que ignora (rayo 3, luz sagrada 5). */
 ignora_armadura?:number;
 /** Estados que intenta aplicar al impactar (fuego → Quemadura con salvación CD 12). */
 al_impactar?:EfectoImpacto[];
 /** Daño fijo que salta a los aliados en contacto con el objetivo (grupo de cercanía). */
 cadena?:{dano:number}|null;
 descripcion?:string};

export const BASES_ELEMENTO:ElementoBase[]=['fuego','agua','electricidad','hielo','luz_sagrada'];
const SALV:TiradaSalvacion={cd:12,atributo:'salvacion'};
const D4={cantidad:1,caras:4};
/** Catálogo base: el comportamiento histórico del motor, sin cambios. */
export const CATALOGO_ELEMENTOS:DefinicionElemento[]=[
 {id:'fuego',nombre:'Fuego',icono:'fuego',color:'#e8643c',base:'fuego',dados_extra:D4,al_impactar:[{estado:'quemadura',salvacion:SALV}],descripcion:'Puede causar Quemadura.'},
 {id:'agua',nombre:'Agua',icono:'agua',color:'#4fa3e0',base:'agua',dados_extra:D4,al_impactar:[{estado:'mojado',salvacion:null}],descripcion:'Moja al objetivo: el siguiente elemento reacciona.'},
 {id:'electricidad',nombre:'Rayo',icono:'rayo',color:'#f2d74a',base:'electricidad',dados_extra:D4,ignora_armadura:3,cadena:{dano:3},descripcion:'Ignora 3 ARM y salta a quien esté en contacto.'},
 {id:'hielo',nombre:'Hielo',icono:'hielo',color:'#9fe3f2',base:'hielo',dados_extra:D4,al_impactar:[{estado:'escarcha',salvacion:SALV}],descripcion:'Puede dejar Escarcha (ARM a la mitad).'},
 {id:'luz_sagrada',nombre:'Luz sagrada',icono:'corona',color:'#f4dfae',base:'luz_sagrada',dados_extra:D4,ignora_armadura:5,al_impactar:[{estado:'marca_luz',salvacion:SALV}],descripcion:'Ignora 5 ARM y marca al objetivo.'},
];
const POR_ID=new Map(CATALOGO_ELEMENTOS.map(d=>[d.id,d]));
export const elementoBase=(id:string|undefined):DefinicionElemento|undefined=>id?POR_ID.get(id):undefined;
/** Definición que rige un golpe de `elemento`: la copia propia si es variante de ese mismo elemento, o la base. */
export function definicionElemento(elemento:string|undefined,propia?:DefinicionElemento|null):DefinicionElemento|undefined{
 if(!elemento||elemento==='ninguno')return undefined;
 return propia&&propia.base===elemento?propia:elementoBase(elemento);
}
/** Nombre visible: el de la variante o el de la base. */
export const nombreElemento=(elemento:string|undefined,propia?:DefinicionElemento|null)=>definicionElemento(elemento,propia)?.nombre||'físico';

const entero=(v:unknown,min:number,max:number)=>Number.isInteger(v)&&(v as number)>=min&&(v as number)<=max;
export function validarDefinicionElemento(d:DefinicionElemento|undefined|null):string|null{
 if(!d||typeof d!=='object')return 'Elemento sin definir.';
 if(!/^[a-z_][a-z0-9_]{0,63}$/.test(d.id||''))return 'El elemento necesita un identificador (letras minúsculas y guiones bajos).';
 if(typeof d.nombre!=='string'||!d.nombre.trim()||d.nombre.length>120)return 'El elemento necesita un nombre.';
 if(!BASES_ELEMENTO.includes(d.base))return 'Elige en qué elemento base se apoya.';
 if(d.color!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(d.color))return 'Color inválido.';
 if(d.dados_extra&&(!entero(d.dados_extra.cantidad,1,20)||!entero(d.dados_extra.caras,2,100)))return 'Dados extra de 1 a 20 y de 2 a 100 caras.';
 if(d.ignora_armadura!==undefined&&!entero(d.ignora_armadura,0,50))return 'La armadura ignorada va de 0 a 50.';
 if(d.cadena&&!entero(d.cadena.dano,1,100))return 'El daño en cadena va de 1 a 100.';
 if(d.al_impactar!==undefined&&(!Array.isArray(d.al_impactar)||d.al_impactar.length>4))return 'Hasta 4 estados al impactar.';
 for(const x of d.al_impactar||[]){
  if(!x||typeof x.estado!=='string')return 'Estado al impactar inválido.';
  if(x.estado_def){const e=validarDefinicionEstado(x.estado_def);if(e)return `Estado al impactar: ${e}`;if(x.estado_def.id!==x.estado)return 'Estado al impactar inválido.';}
  else if(!definicionBase(x.estado))return 'Estado al impactar desconocido.';
  if(x.salvacion&&(!entero(x.salvacion.cd,1,100)||!/^[a-z_][a-z0-9_]*$/.test(x.salvacion.atributo||'')))return 'Salvación al impactar inválida.';
 }
 return null;
}
/** Frase en lenguaje claro (editor, tooltip y cartas). */
export function describirElemento(d:DefinicionElemento):string{
 const partes:string[]=[];
 if(d.dados_extra)partes.push(`+${d.dados_extra.cantidad}d${d.dados_extra.caras} de daño`);
 if(d.ignora_armadura)partes.push(`ignora ${d.ignora_armadura} ARM`);
 for(const x of d.al_impactar||[]){const n=(x.estado_def?.nombre||definicionBase(x.estado)?.nombre||x.estado).split(':')[0];partes.push(x.salvacion?`puede causar ${n} (salvación CD ${x.salvacion.cd})`:`aplica ${n}`);}
 if(d.cadena)partes.push(`salta ${d.cadena.dano} de daño a quien esté en contacto`);
 const base=elementoBase(d.base)?.nombre||d.base;
 return `${d.nombre}${d.id!==d.base?` (de ${base.toLowerCase()})`:''}: ${partes.length?partes.join('; '):'sin efectos extra'}.`;
}
export const elementoVacio=(id='elemento_nuevo',base:ElementoBase='fuego'):DefinicionElemento=>{const b=elementoBase(base)!;return {...structuredClone(b),id,nombre:'Nuevo elemento',descripcion:undefined};};
