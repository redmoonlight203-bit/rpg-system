import {CLASES_YUGEN,UMBRALES_CLASE} from "./clases";
import {evaluarBalance, REPETICIONES_CLASE} from "./balance-laboratorio";
import {perfilRacial,type CategoriaBase} from './estadisticas';
import {vacio} from "./yunque-borrador";
import type {PiezaArena} from "./yunque-arena";

export type ClaseYugen=typeof CLASES_YUGEN[number];
export type CreacionInvocable = Omit<PiezaArena, 'tipo_creacion'> & {
 tipo?:string; equipamiento?:Record<string,string>; clase?: string; tipo_creacion?: string; habilidades?: string[]; pasivas?: string[];
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
 return indice===CLASES_YUGEN.length-1?Number.POSITIVE_INFINITY:UMBRALES_CLASE[indice+1];
}
export function habilidadesElegibles(creaciones:CreacionInvocable[],maxima:ClaseYugen):CreacionInvocable[]{
 return creaciones.filter(c=>!!c.id&&c.tipo_creacion==="habilidad"&&clasePermitida(c.clase||"",maxima));
}
export function evaluarInvocacion(config:ConfiguracionInvocacion,propuesta:PropuestaInvocacion,creaciones:CreacionInvocable[],categorias:CategoriaBase[]=[]):EvaluacionInvocacion{
 const errores:string[]=[];
 if(indiceClase(config.claseMaxima)<0)errores.push("Clase máxima inválida.");
 for(const [k,v] of Object.entries({maxActivas:config.maxActivas??1,costePh:config.costePh??0,costeFatiga:config.costeFatiga??0}))if(!Number.isInteger(v)||v<(k==="maxActivas"?1:0)||v>1000)errores.push("Configuración inválida: "+k);
 for(const [k,r] of Object.entries(config.rangos||{})){if(!Number.isFinite(r.min)||!Number.isFinite(r.max)||r.min<0||r.max<r.min)errores.push("Rango inválido: "+k);const v=propuesta.stats[k]??0;if(v<r.min||v>r.max)errores.push(k+" debe estar entre "+r.min+" y "+r.max);}
 if(propuesta.pasivas.length>20||new Set(propuesta.pasivas).size!==propuesta.pasivas.length)errores.push("Lista de pasivas inválida.");
 if(!propuesta.nombre.trim())errores.push("La invocación necesita nombre.");
 if(!Number.isInteger(config.maxHabilidades)||config.maxHabilidades<0||config.maxHabilidades>20)errores.push("El máximo de habilidades debe estar entre 0 y 20.");
 if(!Number.isInteger(config.duracionTurnos)||config.duracionTurnos<1)errores.push("La duración debe ser de al menos un turno.");
 if(Object.entries(propuesta.stats).some(([k,v])=>!Number.isFinite(v)||(v<0&&!["iniciativa","salvacion","bono_impacto","dano"].includes(k))))errores.push("Revisa los valores de las estadísticas de la invocación.");
 if(propuesta.habilidades.length>config.maxHabilidades)errores.push("Se superó el número de habilidades permitido.");
 if(new Set(propuesta.habilidades).size!==propuesta.habilidades.length)errores.push("No se puede elegir una habilidad repetida.");
 const elegibles=habilidadesElegibles(creaciones,config.claseMaxima);
 const vinculadas=[...propuesta.habilidades,...propuesta.pasivas];
 const piezas:PiezaArena[]=[];
 for(const id of vinculadas){
  const creacion=creaciones.find(c=>c.id===id);
  if(!creacion||creacion.tipo_creacion!==(propuesta.habilidades.includes(id)?"habilidad":"pasiva")){errores.push("Hay una habilidad o pasiva que no existe en La Creación.");continue;}
  if(!clasePermitida(creacion.clase||"",config.claseMaxima)){
   errores.push(creacion.nombre+" supera la clase "+config.claseMaxima+".");continue;
  }
  piezas.push({...creacion,tipo_creacion:propuesta.habilidades.includes(id)?'habilidad':'pasiva'});
 }
 const presupuestoMaximo=techoPuntuacion(config.claseMaxima);
 let clase:ClaseYugen='F',puntuacion=0;
 if(!errores.length){
  try{
   const origen=config.modo==='existente'?creaciones.find(c=>c.id===config.origenId):undefined;
   if(config.modo==='existente'&&(!origen||origen.tipo_creacion!=='personaje'))throw Error();
   const equipamiento=origen?.equipamiento||{};
   for(const id of new Set(Object.values(equipamiento))){
    const pieza=creaciones.find(c=>c.id===id);
    if(!pieza||(pieza.tipo_creacion!=='objeto'&&pieza.tipo_creacion!=='titulo'))throw Error();
    piezas.push({...pieza,tipo_creacion:pieza.tipo_creacion});
   }
   const borrador={...vacio(),...propuesta,tipo:'personaje' as const,clasificacion:origen?.tipo||'',equipamiento,
     reglas:origen?.reglas||[],reglas_pasivas:origen?.reglas_pasivas||[]};
   const informe=evaluarBalance(borrador,{...perfilRacial(categorias,borrador.clasificacion),creaciones:piezas,stats:propuesta.stats},{repeticiones:REPETICIONES_CLASE});
   if(informe.ipe===null||!informe.clase)throw Error();
   puntuacion=informe.ipe;
   clase=informe.clase;
   if(!clasePermitida(clase,config.claseMaxima))errores.push("El poder total supera la clase "+config.claseMaxima+".");
  }catch{errores.push("No se pudo evaluar la invocación.");}
 }
 return {valida:errores.length===0,errores,clase,puntuacion,presupuestoMaximo,habilidadesElegibles:elegibles};
}
