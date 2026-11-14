export type MuestraCombate={tramo:string;ms:number;exito:boolean;bytes?:number;cuando:number};
const muestras:MuestraCombate[]=[];
export function bytesJSON(valor:unknown){return new TextEncoder().encode(JSON.stringify(valor)??'null').byteLength;}
export function registrarMetrica(tramo:string,ms:number,exito=true,bytes?:number){
 if(!Number.isFinite(ms)||ms<0)return;
 muestras.push({tramo,ms,exito,bytes:Number.isFinite(bytes)&&bytes!>=0?bytes:undefined,cuando:Date.now()});
 if(muestras.length>2000)muestras.shift();
}
/** Tamaño UTF-8 del JSON descomprimido; no representa bytes comprimidos de red. */
export async function medirConsulta<T extends {data:unknown;error:unknown}>(tramo:string,consulta:()=>PromiseLike<T>){
 const inicio=performance.now();
 try{const r=await consulta();registrarMetrica(tramo,performance.now()-inicio,!r.error,r.data==null?undefined:bytesJSON(r.data));return r;}
 catch(e){registrarMetrica(tramo,performance.now()-inicio,false);throw e;}
}
/** Diagnóstico local, sin nombres, tokens, atributos ni datos enviados a terceros. */
export function resumenMetricas(){
 return [...new Set(muestras.map(m=>m.tramo))].map(tramo=>{
  const grupo=muestras.filter(m=>m.tramo===tramo),orden=grupo.filter(m=>m.exito).map(m=>m.ms).sort((a,b)=>a-b),bytes=grupo.flatMap(m=>m.bytes===undefined?[]:[m.bytes]);
  return {tramo,muestras:grupo.length,correctas:orden.length,errores:grupo.filter(m=>!m.exito).length,p50:orden[Math.ceil(orden.length*.5)-1],p95:orden[Math.ceil(orden.length*.95)-1],maximo:orden.at(-1),bytes_maximos:bytes.length?Math.max(...bytes):undefined,suficientes:orden.length>=30};
 });
}
export function exportarMetricas(version:{commit:string|null;rama:string|null;entorno:string|null}){
 return {fecha:new Date().toISOString(),version,unidad_tiempo:'ms',unidad_tamano:'bytes UTF-8 JSON descomprimido',objetivos:{confirmacion_p95_ms:500,consulta_ligera_bytes:150_000,muestras_minimas:30},resumen:resumenMetricas(),muestras:muestras.map(m=>({...m}))};
}
export function limpiarMetricas(){muestras.length=0;}
