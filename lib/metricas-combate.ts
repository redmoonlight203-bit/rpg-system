export type MuestraCombate={tramo:string;ms:number;exito:boolean;bytes?:number;cuando:number};
const muestras:MuestraCombate[]=[];
export function registrarMetrica(tramo:string,ms:number,exito=true,bytes?:number){
 if(!Number.isFinite(ms)||ms<0)return;
 muestras.push({tramo,ms,exito,bytes,cuando:Date.now()});if(muestras.length>200)muestras.shift();
}
/** Diagnóstico local, sin nombres, tokens, atributos ni datos enviados a terceros. */
export function resumenMetricas(){
 return [...new Set(muestras.map(m=>m.tramo))].map(tramo=>{
  const grupo=muestras.filter(m=>m.tramo===tramo),orden=grupo.map(m=>m.ms).sort((a,b)=>a-b);
  return {tramo,muestras:grupo.length,errores:grupo.filter(m=>!m.exito).length,p50:orden[Math.ceil(orden.length*.5)-1],p95:orden[Math.ceil(orden.length*.95)-1],maximo:orden.at(-1)};
 });
}
