// Contexto que el taller del Yunque recibe de la Forja (catálogo cargado) y cálculos derivados del borrador.
import {calcularClase} from '../../lib/clases';
import {faltantesRequisitos} from '../../lib/combate';
import {tipoDe} from '../../lib/creacion';
import {evaluarInvocacion} from '../../lib/invocaciones';
import {atributosEfectivos,linaje,type CategoriaBase} from '../../lib/estadisticas';
import type {Enlazable} from '../../lib/yunque-vinculos';
import {esMonstruo} from '../../lib/progresion';
import type {Rango} from '../../lib/forja';
import type {Borrador,Creacion} from '../../lib/yunque-borrador';

export type AtributoForja={id:string;categoria:string;clave:string;etiqueta:string;valor_defecto:number;descripcion?:string};
export type NaturalezaCatalogo={id:string;nombre:string;descripcion:string;clave:string};
export type ContextoTaller={creaciones:Creacion[];categorias:CategoriaBase[];atributos:AtributoForja[];naturalezas?:NaturalezaCatalogo[];
 /** Avisa mientras se prepara la imagen de portada (la Forja no guarda hasta que termina). */
 onProcesandoImagen?:(procesando:boolean)=>void};
export type Creable='objeto'|'titulo'|'habilidad'|'pasiva';
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
/** Creaciones aprobadas de la colección (las que se pueden enlazar o copiar). */
export const activas=(ctx:ContextoTaller)=>ctx.creaciones.filter(c=>c.estado==='aprobado');
/** Clase calculada como la Forja: base del borrador y, en personajes, el poder de lo que tiene enlazado. */
export function claseDe(b:Borrador,ctx:ContextoTaller){
 const bonos=b.reglas_pasivas.reduce<Record<string,number>>((n,r)=>{for(const [k,v] of Object.entries(r.bonos))n[k]=(n[k]||0)+Math.max(0,v);return n;},{});
 const base=calcularClase(valoresBorrador(b,ctx),b.efectos,bonos,b.reglas.reduce((n,r)=>n+r.efectos.length,0));
 if(b.tipo!=='personaje')return base;
 const vinculado=evaluarInvocacion({claseMaxima:'KUROI',modo:'plantilla_temporal',duracionTurnos:1,maxHabilidades:20},{nombre:b.nombre||'Personaje',stats:{},habilidades:b.habilidades,pasivas:b.pasivas},activas(ctx)).puntuacion;
 if(!vinculado)return base;
 return {...base,...calcularClase({poder_base:base.puntuacion,poder_vinculado:vinculado}),atributos:base.atributos,acciones:base.acciones,pasivas:base.pasivas+vinculado,reglas:base.reglas};
}
/** Requisitos de uso que el personaje del borrador no cumple para la creación `id` (como `faltantes` de la Forja). */
export function faltantesDe(b:Borrador,ctx:ContextoTaller,id:string):string[]{
 const item=ctx.creaciones.find(f=>f.id===id);
 if(!item)return ['Creación no disponible.'];
 return faltantesRequisitos(item.requisitos_uso,linaje(ctx.categorias,b.clasificacion).flatMap(c=>[c.clave,c.nombre]),{...valoresBorrador(b,ctx,false),nivel:mallaActiva(b,ctx)?b.nivelMaximo:1},b.habilidades);
}
/** La colección vista como piezas enlazables (tipo resuelto con las familias). */
export function enlazables(ctx:ContextoTaller,excluir?:string):(Enlazable&{icono?:string|null;clase?:string;imagen?:string})[]{
 return activas(ctx).filter(c=>c.id!==excluir).map(c=>({id:c.id,nombre:c.nombre,tipo:tipoDe(c,ctx.categorias),slot_tipo:c.slot_tipo,icono:c.icono,clase:c.clase,imagen:c.imagen_url}));
}
/** Cambios del borrador al elegir familia: atributos y rangos por defecto de la familia (igual que la Forja). */
export function cambiosClasificacion(b:Borrador,ctx:ContextoTaller,clave:string):Partial<Borrador>{
 const rangosBase:Record<string,Rango>=Object.assign({},...linaje(ctx.categorias,clave).map(c=>(c as CategoriaBase&{rangos_criatura?:Record<string,Rango>}).rangos_criatura||{}));
 const a=atributosEfectivos(ctx.categorias,ctx.atributos,clave);
 return {clasificacion:clave,malla:b.tipo==='personaje'&&esMonstruo(ctx.categorias,clave)?true:b.malla,
  stats:Object.fromEntries(a.map(s=>[s.clave,b.stats[s.clave]??s.valor_defecto??0])),
  rangos:Object.fromEntries(a.map(s=>[s.clave,rangosBase[s.clave]??b.rangos[s.clave]??{min:s.valor_defecto??0,max:s.valor_defecto??0}]))};
}
