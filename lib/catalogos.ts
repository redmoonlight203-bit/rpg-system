/**
 * Catálogos compartidos por todos los editores: una sola lista de elementos, tipos de daño y atributos de combate.
 * Antes cada editor tenía su copia (con nombres distintos para la misma clave: «Ataque», «Precisión», «Impacto»).
 * Módulo puro.
 */
import {CATALOGO_ELEMENTOS,type ElementoBase} from './elementos';
export type {ElementoBase};

export type OpcionCatalogo<T extends string=string>={valor:T;nombre:string;icono?:string;ayuda?:string};

/** Elementos base, en el orden y con el nombre e icono del catálogo de elementos. */
export const OPCIONES_ELEMENTO:OpcionCatalogo<ElementoBase>[]=CATALOGO_ELEMENTOS.map(d=>({valor:d.base,nombre:d.nombre,icono:d.icono}));
export const SIN_ELEMENTO:OpcionCatalogo<'ninguno'>={valor:'ninguno',nombre:'Sin elemento',icono:'yugen'};
/** Elementos más «Sin elemento» al principio (selectores de ataques). */
export const OPCIONES_ELEMENTO_O_NINGUNO:OpcionCatalogo<ElementoBase|'ninguno'>[]=[SIN_ELEMENTO,...OPCIONES_ELEMENTO];
export const NOMBRE_ELEMENTO:Record<string,string>=Object.fromEntries(OPCIONES_ELEMENTO.map(o=>[o.valor,o.nombre]));

/**
 * Tipos de daño. Son las mismas claves que usan las inmunidades («Inmune al fuego» = `fuego`), así que elegir de
 * esta lista garantiza que una inmunidad reconozca el daño. Cortante, perforante y contundente se bloquean con
 * «Físico» a través de la naturaleza del ataque.
 */
export const TIPOS_DANO:OpcionCatalogo[]=[
 ...OPCIONES_ELEMENTO,
 {valor:'veneno',nombre:'Veneno',icono:'pocion'},
 {valor:'necrotico',nombre:'Necrótico',icono:'espectro'},
 {valor:'fisico',nombre:'Físico',icono:'espada'},
 {valor:'cortante',nombre:'Cortante',icono:'espada'},
 {valor:'perforante',nombre:'Perforante',icono:'arco'},
 {valor:'contundente',nombre:'Contundente',icono:'escudo'},
 {valor:'magico',nombre:'Mágico',icono:'libro'},
];
/** Tipos de daño que puede bloquear una inmunidad (los físicos concretos se agrupan en «Físico»). */
export const TIPOS_DANO_INMUNIDAD:OpcionCatalogo[]=TIPOS_DANO.filter(t=>!['cortante','perforante','contundente','necrotico'].includes(t.valor));
const normal=(t:string)=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase().replace(/\s+/g,'_');
/** Opciones de tipo de daño que conservan un valor antiguo escrito a mano (para no perderlo al abrir el editor). */
export function opcionesTipoDano(actual?:string):OpcionCatalogo[]{
 const v=normal(actual||'');
 if(!v||TIPOS_DANO.some(t=>t.valor===v))return TIPOS_DANO;
 return [...TIPOS_DANO,{valor:actual!,nombre:`${actual} (antiguo)`,icono:'yugen'}];
}
/** Valor del catálogo que corresponde a un texto antiguo («Físico», «fuego ») o el propio texto si no hay ninguno. */
export function tipoDanoCanonico(actual?:string):string{
 const v=normal(actual||'');
 return TIPOS_DANO.find(t=>t.valor===v||normal(t.nombre)===v)?.valor??(actual||'');
}

/** Atributos de combate que entiende el motor. Una sola etiqueta por clave. */
export const ATRIBUTOS_COMBATE:{clave:string;nombre:string;corto:string}[]=[
 {clave:'vida',nombre:'Vida máxima',corto:'Vida'},
 {clave:'vida_actual',nombre:'Vida actual',corto:'Vida act.'},
 {clave:'ph',nombre:'PH máximos',corto:'PH'},
 {clave:'ph_actual',nombre:'PH actuales',corto:'PH act.'},
 {clave:'fatiga',nombre:'Límite de fatiga',corto:'Fatiga'},
 {clave:'fatiga_actual',nombre:'Fatiga actual',corto:'Fatiga act.'},
 {clave:'armadura',nombre:'Armadura',corto:'ARM'},
 {clave:'dano',nombre:'Daño adicional',corto:'Daño'},
 {clave:'bono_impacto',nombre:'Precisión (bono al impacto)',corto:'Precisión'},
 {clave:'salvacion',nombre:'Salvación',corto:'Salvación'},
 {clave:'iniciativa',nombre:'Iniciativa',corto:'Iniciativa'},
 {clave:'movimiento',nombre:'Movimiento',corto:'Movim.'},
 {clave:'fuerza',nombre:'Fuerza',corto:'Fuerza'},
 {clave:'mente',nombre:'Mente',corto:'Mente'},
 {clave:'destreza',nombre:'Destreza',corto:'Destreza'},
];
const POR_CLAVE=new Map(ATRIBUTOS_COMBATE.map(a=>[a.clave,a]));
export const nombreAtributo=(clave:string)=>POR_CLAVE.get(clave)?.nombre??clave.replace(/_/g,' ');
export const cortoAtributo=(clave:string)=>POR_CLAVE.get(clave)?.corto??clave.replace(/_/g,' ');
