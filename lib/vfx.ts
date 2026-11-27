import catalogo from './catalogo-vfx.json';
import {casillaDeClip,mismaCasillaVFX,rutasVFX,FRACCION_AVANCE_HAZ,validarSecuenciaVFX,type PasoVFX,type SecuenciaVFX} from './secuencia-vfx';
/** Referencias estables; las imágenes se descargan únicamente al previsualizar/reproducir. */
export type ConfiguracionVFX = {
 pantalla?:boolean;
 secuencia?:SecuenciaVFX;
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
 if('secuencia' in config&&config.secuencia!==undefined){
  const error=validarSecuenciaVFX(config.secuencia);if(error)return error;
  if(config.secuencia.clips.some(c=>!buscarVFX(c.recurso)))return 'Selecciona una animación del catálogo.';
 }
 return null;
}

import type {EventoVisual,Posicion} from './combate';
export type ClipVFX={id:string;animacion:string;desde:Posicion;hasta:Posicion;inicio:number;duracion:number;escala:number;giro?:number;salto?:boolean;oculto?:boolean;haz?:boolean;contacto?:boolean;horizontal?:boolean;vertical?:boolean};
export function esLanzamientoRayoDivino(clip:ClipVFX){
 return (clip.id==='salida'||clip.id==='lanzamiento-origen')&&separarVFX(clip.animacion).base==='foundry-divine-beam';
}
/** El aro del Rayo divino se encuentra en (24, 88) de un lienzo de 48 × 96.
 * object-fit:contain centra el lienzo en el cuadro del clip. El traslado
 * se aplica en los ejes del dibujo antes del giro y los reflejos del editor.
 */
export function transformacionClipVFX(clip:ClipVFX){
 const transformacion=transformacionVFX(clip.animacion,clip.giro)+
  (clip.horizontal||clip.vertical?` scale(${clip.horizontal?-1:1}, ${clip.vertical?-1:1})`: '');
 if(esLanzamientoRayoDivino(clip)){
  return transformacion+` translateY(${(48-88)/96*100}%)`;
 }
 return transformacion;
}
function planificarSecuencia(evento:EventoVisual):ClipVFX[]{
 const pasos=evento.vfx?.secuencia?.clips;
 const {desde,geometria_vfx:g}=evento;
 if(!Array.isArray(pasos)||!desde||!g)return [];
 const ramas=rutasVFX(g);
 const corresponde=(paso:PasoVFX,rama:Posicion[])=>!paso.rama||mismaCasillaVFX(casillaDeClip(g,paso.rama),rama[0]);
 const aRumbo=(paso:PasoVFX)=>ramas.filter(rama=>corresponde(paso,rama));
 const viajes=pasos.filter(p=>p.disparador==='haz'||p.disparador==='trayecto');
 const rumbo=(p:Posicion)=>Math.atan2(p.y-desde.y,p.x-desde.x)*180/Math.PI;
 const distancia=(a:Posicion,b:Posicion)=>Math.hypot(a.x-b.x,a.y-b.y);
 const dentro=({x,y}:Posicion)=>x>=0&&y>=0&&x<g.tablero.columnas&&y<g.tablero.filas;
 const contacto=(huella:Posicion[])=>{
  const posibles=ramas.flatMap(rama=>rama.filter(p=>huella.some(h=>mismaCasillaVFX(h,p))).map(p=>({p,rama,fin:rama.at(-1)!})));
  posibles.sort((a,b)=>distancia(g.origen,a.p)-distancia(g.origen,b.p));
  const punto=posibles[0]?.p??huella.find(p=>g.area?.some(q=>mismaCasillaVFX(p,q)))??huella[0];
  if(!punto)return null;
  const proporcion=posibles[0]?distancia(g.origen,punto)/Math.max(1,distancia(g.origen,posibles[0].fin)):1;
  const tiempos=viajes.filter(v=>posibles[0]?corresponde(v,posibles[0].rama):!v.rama).map(v=>v.inicio+v.duracion*proporcion*(v.disparador==='haz'?FRACCION_AVANCE_HAZ:1));
  return {punto,tiempo:tiempos.length?Math.min(...tiempos):0};
 }
 return pasos.flatMap(paso=>{
  if(!buscarVFX(paso.recurso))return [];
  const clip=(id:string,origen:Posicion,fin:Posicion=origen,extra:Partial<ClipVFX>={}):ClipVFX=>({
   id:paso.id+'-'+id,animacion:paso.recurso,desde:origen,hasta:fin,inicio:paso.inicio,duracion:paso.duracion,
   escala:paso.escala,giro:paso.giro,horizontal:paso.horizontal,vertical:paso.vertical,...extra,
  });
  switch(paso.disparador){
   case 'lanzador':return [clip('origen',desde)];
   case 'casilla':{
    if(!paso.casilla)return [];
    const p=casillaDeClip(g,paso.casilla);
    return dentro(p)?[clip('casilla',p)]:[];
   }
   case 'haz':case 'trayecto':case 'final':return aRumbo(paso).map((rama,i)=>{
    const p=rama.at(-1)!;
    if(paso.disparador==='final'){
     const fin=viajes.filter(v=>corresponde(v,rama)).map(v=>v.inicio+v.duracion*(v.disparador==='haz'?FRACCION_AVANCE_HAZ:1));
     return clip(String(i),p,p,{inicio:paso.inicio+(fin.length?Math.min(...fin):0)});
    }
    return clip(String(i),desde,p,{haz:paso.disparador==='haz',giro:paso.giro+rumbo(p)});
   });
   case 'impacto':return g.impactos.flatMap((huella,i)=>{
    const golpe=contacto(huella);
    return golpe?[clip(String(i),golpe.punto,golpe.punto,{inicio:paso.inicio+Math.round(golpe.tiempo),contacto:true})]:[];
   });
  }
 });
}

/** Convierte los clips existentes para edición explícita en la línea de tiempo. */
export function clipsDeConfiguracion(v?:ConfiguracionVFX):PasoVFX[]{
 if(v?.secuencia)return v.secuencia.clips;
 const espera=v?.lanzamiento?Math.min(350,buscarVFX(v.lanzamiento)?.duracion??0):0;
 return ([
  ['lanzamiento','lanzador',0],['recorrido','trayecto',espera],['impacto','final',v?.recorrido?0:espera],
 ] as const).flatMap(([key,disparador,inicio])=>{
  const recurso=v?.[key],asset=buscarVFX(recurso);
  return recurso&&asset?[{id:key,recurso,disparador,inicio,duracion:key==='recorrido'?600:asset.duracion,escala:v?.escala??1.5,giro:0}]:[];
 });
}

/** Secuencia puramente visual sobre posiciones ya resueltas por el motor. */
export function planificarVFX(evento:EventoVisual):ClipVFX[]{
 const clips:ClipVFX[]=[],v=evento.vfx,escala=Math.max(.5,Math.min(4,v?.escala||1.5));
 const agregar=(id:string,animacion:string|undefined,desde:Posicion|undefined,hasta=desde,inicio=0,duracion?:number,giro?:number,salto=false)=>{
  const asset=buscarVFX(animacion);if(!asset||!desde||!hasta)return;
  clips.push({id,animacion:animacion!,desde,hasta,inicio,duracion:duracion||asset.duracion,escala,giro,salto});
 };
 if(v?.secuencia&&evento.geometria_vfx)clips.push(...planificarSecuencia(evento));
 else{
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
