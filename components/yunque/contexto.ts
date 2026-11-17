// Contexto que el taller del Yunque recibe de la Forja (catálogo cargado) y cálculos derivados del borrador.
import {calcularClase} from '../../lib/clases';
import {atributosEfectivos,linaje,type CategoriaBase} from '../../lib/estadisticas';
import {esMonstruo} from '../../lib/progresion';
import type {Rango} from '../../lib/forja';
import type {Borrador,Creacion} from '../../lib/yunque-borrador';

export type AtributoForja={id:string;categoria:string;clave:string;etiqueta:string;valor_defecto:number;descripcion?:string};
export type ContextoTaller={creaciones:Creacion[];categorias:CategoriaBase[];atributos:AtributoForja[]};
const TECNICOS=['dados_dano','caras_dano'];

export const esMonstruoB=(b:Borrador,ctx:ContextoTaller)=>b.tipo==='personaje'&&esMonstruo(ctx.categorias,b.clasificacion);
export const mallaActiva=(b:Borrador,ctx:ContextoTaller)=>esMonstruoB(b,ctx)||b.malla;
/** Atributos que el núcleo muestra (los técnicos de dados no aplican a objetos ni habilidades). */
export function atributosVisibles(b:Borrador,ctx:ContextoTaller):AtributoForja[]{
 return atributosEfectivos(ctx.categorias,ctx.atributos,b.clasificacion).filter(a=>!['objeto','habilidad'].includes(b.tipo)||!TECNICOS.includes(a.clave));
}
/** Valores efectivos del borrador: fijos, o el punto medio del rango si es malla (como la Forja). */
export function valoresBorrador(b:Borrador,ctx:ContextoTaller,medio=true):Record<string,number>{
 const s={...b.stats},malla=mallaActiva(b,ctx);
 for(const a of atributosEfectivos(ctx.categorias,ctx.atributos,b.clasificacion)){
  const r=b.rangos[a.clave];
  s[a.clave]=malla?(r?medio?(r.min+r.max)/2:r.min:a.valor_defecto??0):b.stats[a.clave]??a.valor_defecto??0;
 }
 return s;
}
export function claseDe(b:Borrador,ctx:ContextoTaller){
 const bonos=b.reglas_pasivas.reduce<Record<string,number>>((n,r)=>{for(const [k,v] of Object.entries(r.bonos))n[k]=(n[k]||0)+Math.max(0,v);return n;},{});
 return calcularClase(valoresBorrador(b,ctx),b.efectos,bonos,b.reglas.reduce((n,r)=>n+r.efectos.length,0));
}
/** Cambios del borrador al elegir familia: atributos y rangos por defecto de la familia (igual que la Forja). */
export function cambiosClasificacion(b:Borrador,ctx:ContextoTaller,clave:string):Partial<Borrador>{
 const rangosBase:Record<string,Rango>=Object.assign({},...linaje(ctx.categorias,clave).map(c=>(c as CategoriaBase&{rangos_criatura?:Record<string,Rango>}).rangos_criatura||{}));
 const a=atributosEfectivos(ctx.categorias,ctx.atributos,clave);
 return {clasificacion:clave,malla:b.tipo==='personaje'&&esMonstruo(ctx.categorias,clave)?true:b.malla,
  stats:Object.fromEntries(a.map(s=>[s.clave,b.stats[s.clave]??s.valor_defecto??0])),
  rangos:Object.fromEntries(a.map(s=>[s.clave,rangosBase[s.clave]??b.rangos[s.clave]??{min:s.valor_defecto??0,max:s.valor_defecto??0}]))};
}
