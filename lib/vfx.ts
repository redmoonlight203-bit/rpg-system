import catalogo from './catalogo-vfx.json';
/** Referencias estables; las imágenes se descargan únicamente al previsualizar/reproducir. */
export type ConfiguracionVFX = {
 pantalla?:boolean;
 lanzamiento?:string;
 recorrido?:string;
 impacto?:string;
 escala?:number;
};
export type AnimacionRegla = {id:string;escala?:number};
export type AnimacionEtapa = {entrada?:string;aura?:string;escala?:number};
export const CATALOGO_VFX = catalogo;
const indice=new Map(CATALOGO_VFX.map(a=>[a.id,a]));
export type OrientacionVFX={cuartos:number;horizontal:boolean;vertical:boolean};
const identidad:OrientacionVFX={cuartos:0,horizontal:false,vertical:false};
export function separarVFX(id:string){
 const ajuste=/^ori-([0-3])([01])([01])-(.+)$/.exec(id);
 return ajuste?{base:ajuste[4],cuartos:Number(ajuste[1]),horizontal:ajuste[2]==='1',vertical:ajuste[3]==='1'}:{base:id,...identidad};
}
export function orientarVFX(id:string,o:OrientacionVFX){
 const base=separarVFX(id).base;
 return o.cuartos||o.horizontal||o.vertical?`ori-${o.cuartos}${Number(o.horizontal)}${Number(o.vertical)}-${base}`:base;
}
export function transformacionVFX(id:string,rumbo=0){
 const o=separarVFX(id);
 return `rotate(${rumbo+90*o.cuartos}deg) scale(${o.horizontal?-1:1}, ${o.vertical?-1:1})`;
}
// La referencia identifica un archivo inmutable del bucket del proyecto sin aceptar URLs arbitrarias.
const subida=/^usr-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})-([a-f0-9]{16})-([a-z0-9-]{1,18})-([1-9][0-9]{1,3})-(png|webp)$/;
export function buscarVFX(id?:string){
 if(!id||id.length>100)return undefined;
 const {base}=separarVFX(id);
 const incluido=indice.get(base);
 if(incluido)return incluido;
 const partes=subida.exec(base);
 if(!partes)return undefined;
 const [,dueno,hash,nombre,ms,ext]=partes;
 const duracion=Number(ms);
 if(duracion<100||duracion>2400)return undefined;
 const url=`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/imagenes/${dueno}/vfx/${hash}-${nombre}-${ms}.${ext}`;
 return {id:base,nombre:nombre.replaceAll('-',' '),categoria:'Mis efectos',paquete:'Personalizado',url,bucle:url,poster:'',duracion,ancho:0,alto:0,repetible:false};
}
export function validarVFX(config:ConfiguracionVFX|AnimacionEtapa|undefined):string|null {
 if(config===undefined)return null;
 if(!config||typeof config!=='object'||Array.isArray(config))return 'Selecciona una configuración de animación válida.';
 for(const key of ['lanzamiento','recorrido','impacto','entrada','aura'] as const){
  const id=(config as Record<string,unknown>)[key];
  if(id!==undefined&&(typeof id!=='string'||!buscarVFX(id)))return 'Selecciona una animación del catálogo.';
 }
 if(config.escala!==undefined&&(!Number.isFinite(config.escala)||config.escala<0.5||config.escala>4))return 'El tamaño de la animación debe estar entre 0.5 y 4 casillas.';
 return null;
}

import type {EventoVisual,Posicion} from './combate';
export type ClipVFX={id:string;animacion:string;desde:Posicion;hasta:Posicion;inicio:number;duracion:number;escala:number;giro?:number;salto?:boolean;oculto?:boolean};
export function esLanzamientoRayoDivino(clip:ClipVFX){
 return clip.id==='salida'&&separarVFX(clip.animacion).base==='foundry-divine-beam';
}
/** El aro del Rayo divino se encuentra en (24, 88) de un lienzo de 48 × 96.
 * object-fit:contain centra el lienzo en el cuadro del clip. El traslado
 * se aplica en los ejes del dibujo antes del giro y los reflejos del editor.
 */
export function transformacionClipVFX(clip:ClipVFX){
 const transformacion=transformacionVFX(clip.animacion,clip.giro);
 if(esLanzamientoRayoDivino(clip)){
  return transformacion+` translateY(${(48-88)/96*100}%)`;
 }
 return transformacion;
}
/** Secuencia puramente visual sobre posiciones ya resueltas por el motor. */
export function planificarVFX(evento:EventoVisual):ClipVFX[]{
 const clips:ClipVFX[]=[],v=evento.vfx,escala=Math.max(.5,Math.min(4,v?.escala||1.5));
 const agregar=(id:string,animacion:string|undefined,desde:Posicion|undefined,hasta=desde,inicio=0,duracion?:number,giro?:number,salto=false)=>{
  const asset=buscarVFX(animacion);if(!asset||!desde||!hasta)return;
  clips.push({id,animacion:animacion!,desde,hasta,inicio,duracion:duracion||asset.duracion,escala,giro,salto});
 };
 const salida=buscarVFX(v?.lanzamiento),espera=salida?Math.min(350,salida.duracion):0;
 agregar('salida',v?.lanzamiento,evento.desde);
 // A pull/push moves victims after impact; it must not become the spell's flight path.
 const movimientos=(evento.movimientos||[]).filter(m=>m.tipo!=='forzado'||!evento.hasta);
 if(movimientos.length){
  const mismoPunto=(a:Posicion|undefined,b:Posicion|undefined)=>!!a&&!!b&&a.x===b.x&&a.y===b.y;
  // Un ataque móvil termina junto al blanco: su casilla de llegada no es la del golpe.
  const golpe=!!evento.hasta&&!mismoPunto(evento.hasta,evento.desde);
  let finMovimiento=espera;
  for(const m of movimientos){
   const teleport=m.tipo==='teletransporte';
   const fin=espera+(teleport?200:600);
   finMovimiento=Math.max(finMovimiento,fin);
   if(!teleport)agregar('estela-'+m.id,v?.recorrido,m.desde,m.hasta,espera,600,Math.atan2(m.hasta.y-m.desde.y,m.hasta.x-m.desde.x)*180/Math.PI,m.tipo==='salto');
   if(!golpe)agregar('llegada-'+m.id,v?.impacto,m.hasta,m.hasta,fin);
  }
  if(golpe)agregar('impacto',v?.impacto,evento.hasta,evento.hasta,finMovimiento);
 }else{
  const viaje=!!buscarVFX(v?.recorrido)&&!!evento.desde&&!!evento.hasta;
  if(viaje)agregar('proyectil',v?.recorrido,evento.desde,evento.hasta,espera,600,Math.atan2(evento.hasta!.y-evento.desde!.y,evento.hasta!.x-evento.desde!.x)*180/Math.PI);
  agregar('impacto',v?.impacto,evento.hasta,evento.hasta,espera+(viaje?600:0));
 }
 for(const t of evento.transformaciones||[]){
  agregar('etapa-'+t.id,t.animacion,t.posicion);
  const clip=clips[clips.length-1];if(clip?.id==='etapa-'+t.id)clip.escala=t.escala||1.5;
 }
 for(const a of evento.activaciones||[]){
  const anterior=clips.length;
  agregar('regla-'+a.id,a.animacion,a.posicion);
  if(clips.length>anterior)clips[anterior].escala=a.escala||1.5;
 }
 return clips;
}
