import {calcularClase,CLASES_YUGEN,UMBRALES_CLASE} from "./clases";
import type {Efecto} from "./creacion";

export type ClaseYugen=typeof CLASES_YUGEN[number];
export type CreacionInvocable={
 id:string;nombre:string;clase?:string;stats?:Record<string,number>;
 configuracion_dados?:Efecto[];habilidades?:string[];pasivas?:string[];
};
export type ConfiguracionInvocacion={
 claseMaxima:ClaseYugen;
 maxHabilidades:number;
 modo:"existente"|"plantilla_temporal"|"jugador_en_combate"|"gm_en_combate";
 origenId?:string;
 duracionTurnos:number;
};
export type PropuestaInvocacion={
 nombre:string;stats:Record<string,number>;habilidades:string[];pasivas:string[];
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
 return creaciones.filter(c=>!!c.id&&clasePermitida(c.clase||"",maxima));
}
/**
 * Cálculo conservador: añade la potencia de las habilidades y pasivas vinculadas
 * para impedir que una criatura de estadísticas C acumule poderes C y termine en B.
 * Es un límite de seguridad provisional, no el evaluador definitivo de todas las reglas.
 */
export function evaluarInvocacion(config:ConfiguracionInvocacion,propuesta:PropuestaInvocacion,creaciones:CreacionInvocable[]):EvaluacionInvocacion{
 const errores:string[]=[];
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
  if(!creacion){errores.push("Hay una habilidad o pasiva que no existe en La Creación.");continue;}
  if(!clasePermitida(creacion.clase||"",config.claseMaxima)){
   errores.push(creacion.nombre+" supera la clase "+config.claseMaxima+".");continue;
  }
  const calculada=calcularClase(creacion.stats||{},creacion.configuracion_dados||[]);
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
