import catalogo from './catalogo-vfx.json';
/** Referencias estables; las imágenes se descargan únicamente al previsualizar/reproducir. */
export type ConfiguracionVFX = {
 lanzamiento?:string;
 recorrido?:string;
 impacto?:string;
 escala?:number;
};
export type AnimacionEtapa = {entrada?:string;aura?:string;escala?:number};
export const CATALOGO_VFX = catalogo;
const indice=new Map(CATALOGO_VFX.map(a=>[a.id,a]));
export function buscarVFX(id?:string){return id?indice.get(id):undefined;}
export function validarVFX(config:ConfiguracionVFX|AnimacionEtapa|undefined):string|null {
 if(config===undefined)return null;
 if(!config||typeof config!=='object'||Array.isArray(config))return 'Selecciona una configuración de animación válida.';
 for(const key of ['lanzamiento','recorrido','impacto','entrada','aura'] as const){
  const id=(config as Record<string,unknown>)[key];
  if(id!==undefined&&(typeof id!=='string'||!indice.has(id)))return 'Selecciona una animación del catálogo.';
 }
 if(config.escala!==undefined&&(!Number.isFinite(config.escala)||config.escala<0.5||config.escala>4))return 'El tamaño de la animación debe estar entre 0.5 y 4 casillas.';
 return null;
}

import type {EventoVisual,Posicion} from './combate';
export type ClipVFX={id:string;animacion:string;desde:Posicion;hasta:Posicion;inicio:number;duracion:number;escala:number;giro?:number;salto?:boolean;oculto?:boolean};
/** Secuencia puramente visual sobre posiciones ya resueltas por el motor. */
export function planificarVFX(evento:EventoVisual):ClipVFX[]{
 const clips:ClipVFX[]=[],v=evento.vfx,escala=Math.max(.5,Math.min(4,v?.escala||1.5));
 const agregar=(id:string,animacion:string|undefined,desde:Posicion|undefined,hasta=desde,inicio=0,duracion?:number,giro?:number,salto=false)=>{
  const asset=buscarVFX(animacion);if(!asset||!desde||!hasta)return;
  clips.push({id,animacion:asset.id,desde,hasta,inicio,duracion:duracion||asset.duracion,escala,giro,salto});
 };
 const salida=buscarVFX(v?.lanzamiento),espera=salida?Math.min(350,salida.duracion):0;
 agregar('salida',v?.lanzamiento,evento.desde);
 const movimientos=evento.movimientos||[];
 if(movimientos.length){
  for(const m of movimientos){
   const teleport=m.tipo==='teletransporte';
   if(m.id!==movimientos[0].id)agregar('salida-'+m.id,v?.lanzamiento,m.desde);
   if(!teleport)agregar('estela-'+m.id,v?.recorrido,m.desde,m.hasta,espera,600,Math.atan2(m.hasta.y-m.desde.y,m.hasta.x-m.desde.x)*180/Math.PI,m.tipo==='salto');
   agregar('llegada-'+m.id,v?.impacto,m.hasta,m.hasta,espera+(teleport?200:600));
  }
 }else{
  const viaje=!!buscarVFX(v?.recorrido)&&!!evento.desde&&!!evento.hasta;
  if(viaje)agregar('proyectil',v?.recorrido,evento.desde,evento.hasta,espera,600,Math.atan2(evento.hasta!.y-evento.desde!.y,evento.hasta!.x-evento.desde!.x)*180/Math.PI);
  agregar('impacto',v?.impacto,evento.hasta,evento.hasta,espera+(viaje?600:0));
 }
 for(const t of evento.transformaciones||[]){
  agregar('etapa-'+t.id,t.animacion,t.posicion);
  const clip=clips[clips.length-1];if(clip?.id==='etapa-'+t.id)clip.escala=t.escala||1.5;
 }
 return clips;
}
