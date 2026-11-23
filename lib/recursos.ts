/**
 * Catálogo de recursos configurable (plan maestro, Apéndice C · paso 4). NINGÚN recurso está escrito en el motor:
 * la Carga Bioeléctrica (CB) es solo una entrada más, creada en el Yunque como cualquier otra.
 * Módulo puro (el motor Edge lo incrusta).
 */
export type EventoRecurso='inicio_combate'|'inicio_turno'|'fin_turno'|'causar_dano'|'recibir_dano'|'usar_etiqueta';
export type GeneracionRecurso={evento:EventoRecurso;cantidad:number;
 /** Solo con `usar_etiqueta`: la técnica usada debe llevar esta etiqueta. */
 etiqueta?:string};
export type DefinicionRecurso={id:string;nombre:string;
 /** Tope fijo o calculado desde un atributo del portador (p. ej. 2 × constitución). */
 tope:{tipo:'fijo';valor:number}|{tipo:'atributo';atributo:string;multiplicador:number;minimo?:number};
 inicial:number;
 generacion:GeneracionRecurso[];
 /** Máximo que se puede gastar en un solo uso (opcional). */
 consumo?:{maximo_por_uso?:number};
 /** Qué pasa al terminar el combate. */
 recuperacion?:'vaciar'|'conservar'|'inicial';
 visible?:'todos'|'propio'|'gm';
 color?:string};
export const EVENTOS_RECURSO:Record<EventoRecurso,string>={inicio_combate:'Al empezar el combate',inicio_turno:'Al iniciar su turno',fin_turno:'Al terminar su turno',causar_dano:'Al causar daño',recibir_dano:'Al recibir daño',usar_etiqueta:'Al usar una técnica con etiqueta'};
const ID=/^[a-z_][a-z0-9_]{0,40}$/;
const entero=(v:unknown,min:number,max:number)=>Number.isInteger(v)&&(v as number)>=min&&(v as number)<=max;
export function validarRecurso(r:DefinicionRecurso|undefined):string|null{
 if(!r||typeof r!=='object')return 'Recurso sin definir.';
 if(!ID.test(r.id||''))return 'El recurso necesita un identificador (minúsculas y guiones bajos).';
 if(typeof r.nombre!=='string'||!r.nombre.trim()||r.nombre.length>60)return 'El recurso necesita un nombre.';
 const t=r.tope;
 if(!t||(t.tipo==='fijo'?!entero(t.valor,1,1000):t.tipo==='atributo'?!/^[a-z_][a-z0-9_]*$/.test(t.atributo||'')||!(t.multiplicador>0&&t.multiplicador<=100):true))return 'Configura el tope (fijo de 1 a 1000 o por atributo).';
 if(!entero(r.inicial,0,1000))return 'Valor inicial de 0 a 1000.';
 if(!Array.isArray(r.generacion)||r.generacion.length>8)return 'Hasta 8 formas de generarlo.';
 for(const g of r.generacion){
  if(!g||!(g.evento in EVENTOS_RECURSO)||!entero(g.cantidad,-100,100)||g.cantidad===0)return 'Cada generación necesita un evento y una cantidad distinta de 0.';
  if(g.evento==='usar_etiqueta'&&!g.etiqueta)return 'Elige la etiqueta que lo genera.';
 }
 if(r.consumo?.maximo_por_uso!==undefined&&!entero(r.consumo.maximo_por_uso,1,1000))return 'Máximo por uso de 1 a 1000.';
 if(r.recuperacion&&!['vaciar','conservar','inicial'].includes(r.recuperacion))return 'Recuperación inválida.';
 if(r.visible&&!['todos','propio','gm'].includes(r.visible))return 'Visibilidad inválida.';
 return null;
}
export function topeRecurso(r:DefinicionRecurso,stats:Record<string,number>):number{
 if(r.tope.tipo==='fijo')return r.tope.valor;
 return Math.max(r.tope.minimo??1,Math.floor((stats[r.tope.atributo]||0)*r.tope.multiplicador));
}
/** Nuevo saldo tras un evento. Nunca supera el tope ni baja de 0. Sin generación para el evento: igual. */
export function generarRecurso(r:DefinicionRecurso,saldo:number,evento:EventoRecurso,stats:Record<string,number>,etiquetas:string[]=[]):number{
 const tope=topeRecurso(r,stats);
 let v=saldo;
 for(const g of r.generacion)if(g.evento===evento&&(g.evento!=='usar_etiqueta'||etiquetas.includes(g.etiqueta||'')))v+=g.cantidad;
 return Math.max(0,Math.min(tope,v));
}
/** Gasta del saldo. Lanza un error si no alcanza o supera el máximo por uso: el motor nunca gasta de más. */
export function gastarRecurso(r:DefinicionRecurso,saldo:number,cantidad:number):number{
 if(!Number.isInteger(cantidad)||cantidad<0)throw Error(`${r.nombre}: cantidad inválida.`);
 if(r.consumo?.maximo_por_uso&&cantidad>r.consumo.maximo_por_uso)throw Error(`${r.nombre}: como máximo ${r.consumo.maximo_por_uso} por uso.`);
 if(cantidad>saldo)throw Error(`${r.nombre}: saldo insuficiente (${saldo}).`);
 return saldo-cantidad;
}
/** Ejemplo de laboratorio (propuesta Kuro, no aprobada): se crea desde el Yunque como cualquier otro recurso. */
export const EJEMPLO_CB:DefinicionRecurso={id:'carga_bioelectrica',nombre:'Carga Bioeléctrica',tope:{tipo:'fijo',valor:6},inicial:1,generacion:[{evento:'inicio_turno',cantidad:1},{evento:'recibir_dano',cantidad:1}],recuperacion:'inicial',visible:'todos',color:'#6cc8ff'};
export const recursoVacio=(id='recurso_nuevo'):DefinicionRecurso=>({id,nombre:'Nuevo recurso',tope:{tipo:'fijo',valor:5},inicial:0,generacion:[{evento:'inicio_turno',cantidad:1}],recuperacion:'inicial',visible:'todos',color:'#d6a84a'});
