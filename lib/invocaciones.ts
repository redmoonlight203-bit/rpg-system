import {calcularClase,CLASES_YUGEN,UMBRALES_CLASE} from "./clases";
import type {Efecto} from "./creacion";

export type ClaseYugen=typeof CLASES_YUGEN[number];
export type CreacionInvocable={
 id:string;nombre:string;clase?:string;tipo_creacion?:string;stats?:Record<string,number>;
 configuracion_dados?:Efecto[];habilidades?:string[];pasivas?:string[];reglas_pasivas?:{bonos:Record<string,number>}[];reglas?:{efectos:unknown[]}[];
};
export type ConfiguracionInvocacion={
 claseMaxima:ClaseYugen;
 maxHabilidades:number;
 modo:"existente"|"plantilla_temporal"|"jugador_en_combate"|"gm_en_combate";
 origenId?:string;
 duracionTurnos:number;
 maxActivas?:number;costePh?:number;costeFatiga?:number;
 rangos?:Record<string,{min:number;max:number}>;
};
export type PropuestaInvocacion={
 nombre:string;apariencia?:string;stats:Record<string,number>;habilidades:string[];pasivas:string[];
};
export type EvaluacionInvocacion={
 valida:boolean;errores:string[];clase:ClaseYugen;puntuacion:number;
 presupuestoMaximo:number;habilidadesElegibles:CreacionInvocable[];
};
export function indiceClase(clase:string):number{
 return CLASES_YUGEN.indexOf(clase as ClaseYugen);
}
export function clasePermitida(clase:string,maxima:ClaseYugen):boolean{
 const indice=indiceClase(clase);return indice>=0&&indice<=indiceClase(maxima);
}
/**
 * Presupuesto estricto de puntuación: el siguiente umbral es exclusivo.
 * Se mantiene independiente de la tirada: una tirada nunca eleva la clase máxima.
 */
export function techoPuntuacion(clase:ClaseYugen):number{
 const indice=indiceClase(clase);
 return indice===CLASES_YUGEN.length-1?Number.POSITIVE_INFINITY:UMBRALES_CLASE[indice+1]-0.01;
}
export function habilidadesElegibles(creaciones:CreacionInvocable[],maxima:ClaseYugen):CreacionInvocable[]{
 return creaciones.filter(c=>!!c.id&&c.tipo_creacion==="habilidad"&&clasePermitida(c.clase||"",maxima));
}
/**
 * Cálculo conservador: añade la potencia de las habilidades y pasivas vinculadas
 * para impedir que una criatura de estadísticas C acumule poderes C y termine en B.
 * Es un límite de seguridad provisional, no el evaluador definitivo de todas las reglas.
 */
export function evaluarInvocacion(config:ConfiguracionInvocacion,propuesta:PropuestaInvocacion,creaciones:CreacionInvocable[]):EvaluacionInvocacion{
 const errores:string[]=[];
 if(indiceClase(config.claseMaxima)<0)errores.push("Clase máxima inválida.");
 for(const [k,v] of Object.entries({maxActivas:config.maxActivas??1,costePh:config.costePh??0,costeFatiga:config.costeFatiga??0}))if(!Number.isInteger(v)||v<(k==="maxActivas"?1:0)||v>1000)errores.push("Configuración inválida: "+k);
 for(const [k,r] of Object.entries(config.rangos||{})){if(!Number.isFinite(r.min)||!Number.isFinite(r.max)||r.min<0||r.max<r.min)errores.push("Rango inválido: "+k);const v=propuesta.stats[k]??0;if(v<r.min||v>r.max)errores.push(k+" debe estar entre "+r.min+" y "+r.max);}
 if(propuesta.pasivas.length>20||new Set(propuesta.pasivas).size!==propuesta.pasivas.length)errores.push("Lista de pasivas inválida.");
 if(!propuesta.nombre.trim())errores.push("La invocación necesita nombre.");
 if(!Number.isInteger(config.maxHabilidades)||config.maxHabilidades<0||config.maxHabilidades>20)errores.push("El máximo de habilidades debe estar entre 0 y 20.");
 if(!Number.isInteger(config.duracionTurnos)||config.duracionTurnos<1)errores.push("La duración debe ser de al menos un turno.");
 if(Object.values(propuesta.stats).some(v=>!Number.isFinite(v)||v<0))errores.push("Las estadísticas deben ser números no negativos.");
 if(propuesta.habilidades.length>config.maxHabilidades)errores.push("Se superó el número de habilidades permitido.");
 if(new Set(propuesta.habilidades).size!==propuesta.habilidades.length)errores.push("No se puede elegir una habilidad repetida.");
 const elegibles=habilidadesElegibles(creaciones,config.claseMaxima);
 const vinculadas=[...propuesta.habilidades,...propuesta.pasivas];
 let puntosAdicionales=0;
 for(const id of vinculadas){
  const creacion=creaciones.find(c=>c.id===id);
  if(!creacion||creacion.tipo_creacion!==(propuesta.habilidades.includes(id)?"habilidad":"pasiva")){errores.push("Hay una habilidad o pasiva que no existe en La Creación.");continue;}
  if(!clasePermitida(creacion.clase||"",config.claseMaxima)){
   errores.push(creacion.nombre+" supera la clase "+config.claseMaxima+".");continue;
  }
  const bonos:Record<string,number>={};for(const r of creacion.reglas_pasivas||[])for(const [k,v] of Object.entries(r.bonos||{}))bonos[k]=(bonos[k]||0)+Math.max(0,v);
  const calculada=calcularClase(creacion.stats||{},creacion.configuracion_dados||[],bonos,(creacion.reglas||[]).reduce((n,r)=>n+r.efectos.length,0));
  // Al menos el umbral inferior de su clase; evita poderes sin estadísticas gratuitas.
  puntosAdicionales+=Math.max(calculada.puntuacion,UMBRALES_CLASE[indiceClase(creacion.clase!)]);
 }
 const base=calcularClase(propuesta.stats);
 const puntuacion=Math.round((base.puntuacion+puntosAdicionales)*100)/100;
 const indice=UMBRALES_CLASE.reduce<number>((n,v,i)=>puntuacion>=v?i:n,0);
 const clase=CLASES_YUGEN[indice];
 const presupuestoMaximo=techoPuntuacion(config.claseMaxima);
 if(puntuacion>presupuestoMaximo)errores.push("El poder total supera la clase "+config.claseMaxima+". Reduce estadísticas o cambia habilidades.");
 return {valida:errores.length===0,errores,clase,puntuacion,presupuestoMaximo,habilidadesElegibles:elegibles};
}
