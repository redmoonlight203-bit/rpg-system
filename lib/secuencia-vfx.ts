import {DIRECCIONES_PATRON,girarPatron} from './patron-area';

type Punto={x:number;y:number};
export const DISPARADORES_VFX = {
 lanzador:'Al lanzar', casilla:'En una casilla', trayecto:'Proyectil por rama',
 haz:'Haz por rama', impacto:'En cada golpe', final:'Al final de cada rama',
} as const;
export type DisparadorVFX=keyof typeof DISPARADORES_VFX;
export type PasoVFX={
 id:string; recurso:string; disparador:DisparadorVFX; inicio:number;
 duracion:number; escala:number; giro:number; horizontal?:boolean; vertical?:boolean; casilla?:Punto; rama?:Punto;
};
export type SecuenciaVFX={version:1;clips:PasoVFX[]};
export type GeometriaVFX={
 origen:Punto; objetivo?:Punto; area?:Punto[]; patron?:boolean; girar?:boolean;
 impactos:Punto[][]; espejo?:boolean; tablero:{columnas:number;filas:number};
};
export const FRACCION_AVANCE_HAZ=.44;
export const MAX_CLIPS_VFX=48;
export const MAX_INICIO_VFX=10000;
export const MAX_DURACION_VFX=4000;
export const mismaCasillaVFX=(a:Punto,b:Punto)=>a.x===b.x&&a.y===b.y;
const clave=(p:Punto)=>p.x+','+p.y;
const cero={x:0,y:0};

export function validarSecuenciaVFX(valor:unknown):string|null{
 const secuencia=valor as Partial<SecuenciaVFX>|null;
 if(!secuencia||secuencia.version!==1||!Array.isArray(secuencia.clips)||secuencia.clips.length>MAX_CLIPS_VFX)
  return 'Secuencia de clips inválida.';
 const ids=new Set<string>();
 for(const clip of secuencia.clips){
  if(!clip||typeof clip.id!=='string'||!/^[a-z0-9_-]{1,50}$/.test(clip.id)||ids.has(clip.id)||
    typeof clip.recurso!=='string'||!/^[a-z0-9_-]{1,100}$/.test(clip.recurso)||
    !Object.hasOwn(DISPARADORES_VFX,clip.disparador)||
    !Number.isInteger(clip.inicio)||clip.inicio<0||clip.inicio>MAX_INICIO_VFX||
    !Number.isInteger(clip.duracion)||clip.duracion<60||clip.duracion>MAX_DURACION_VFX||
    !Number.isFinite(clip.escala)||clip.escala<.25||clip.escala>8||
    !Number.isInteger(clip.giro)||Math.abs(clip.giro)>360||
    (clip.horizontal!==undefined&&typeof clip.horizontal!=='boolean')||
    (clip.vertical!==undefined&&typeof clip.vertical!=='boolean'))
   return 'Hay un clip con ajustes inválidos.';
  if(clip.disparador==='casilla'&&(!clip.casilla||![clip.casilla.x,clip.casilla.y].every(n=>Number.isInteger(n)&&Math.abs(n)<=30)))
   return 'Elige una casilla para el clip.';
  if(clip.rama!==undefined&&(!clip.rama||![clip.rama.x,clip.rama.y].every(n=>Number.isInteger(n)&&Math.abs(n)<=1)||(!clip.rama.x&&!clip.rama.y)))
   return 'La rama del clip no es válida.';
  ids.add(clip.id);
 }
 return null;
}

export function casillaDeClip(g:GeometriaVFX,relativa:Punto):Punto{
 const {origen,objetivo}=g;
 const local=g.espejo?g.girar?{x:relativa.x,y:-relativa.y}:{x:-relativa.x,y:relativa.y}:relativa;
 const p=g.girar&&objetivo?girarPatron(local,origen,objetivo):local;
 return {x:origen.x+p.x,y:origen.y+p.y};
}

export function casillaRelativaVFX(g:GeometriaVFX,p:Punto):Punto{
 const {origen,objetivo}=g;
 const relativa={x:p.x-origen.x,y:p.y-origen.y};
 return g.girar&&objetivo?girarPatron(relativa,cero,{x:objetivo.x-origen.x,y:origen.y-objetivo.y}):relativa;
}

/** Lee las ramas rectas contiguas del área resuelta. Un hueco o el borde corta la rama. */
export function rutasVFX(g:GeometriaVFX):Punto[][]{
 const {origen,objetivo,area,patron}=g;
 if(!patron)return objetivo&&!mismaCasillaVFX(origen,objetivo)?[[objetivo]]:[];
 const permitidas=new Set(area?.map(clave));
 return DIRECCIONES_PATRON.map(d=>{
  const rama:Punto[]=[];
  for(let i=1;i<=Math.max(g.tablero.columnas,g.tablero.filas);i++){
   const p={x:origen.x+i*d.x,y:origen.y+i*d.y};
   if(!permitidas.has(clave(p)))break;
   rama.push(p);
  }
  return rama;
 }).filter(r=>r.length>0);
}
