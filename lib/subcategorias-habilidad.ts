/**
 * Reglas especiales de subcategorías de habilidades YUGEN.
 * No modifica estadísticas globales ni sustituye una tirada de impacto.
 */
export const SUBCATEGORIAS_HABILIDAD={
 invocacion:{clave:"habilidades_invocacion",nombre:"Invocación",atributos:["max_invocados","duracion_invocacion"]},
 demoniaca:{clave:"habilidades_demoniacas",nombre:"Demoníaca",atributos:["miasma"]},
} as const;
export type ResultadoMiasma={
 aplica:boolean;cd:number;tirada:number;total:number;superada:boolean;
 danoExtra:number;phPerdido:number;
};
/** Se evalúa exclusivamente después de confirmar que el ataque impactó.
 * La tirada de salvación se hace con d20 + bono de salvación del receptor.
 * Fallo: 1d4 daño y hasta 1 PH perdido (nunca PH negativo).
 */
export function resolverMiasma(params:{
 miasma:number;impacto:boolean;bonoSalvacion:number;phObjetivo:number;
 tirar:(caras:number)=>number;
}):ResultadoMiasma{
 const {miasma,impacto,bonoSalvacion,phObjetivo,tirar}=params;
 if(!impacto||!Number.isFinite(miasma)||miasma<=0)
  return {aplica:false,cd:0,tirada:0,total:0,superada:true,danoExtra:0,phPerdido:0};
 const cd=Math.max(1,Math.min(1000,10+Math.floor(miasma)));
 const tirada=tirar(20),total=tirada+(Number.isFinite(bonoSalvacion)?bonoSalvacion:0);
 const superada=total>=cd;
 return {aplica:true,cd,tirada,total,superada,danoExtra:superada?0:tirar(4),phPerdido:superada?0:Math.min(1,Math.max(0,phObjetivo))};
}
