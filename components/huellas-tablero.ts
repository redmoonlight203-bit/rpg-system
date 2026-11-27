import {distanciasMovimiento,type MapaCombate,type Posicion} from '../lib/combate';
import {casillasHuella} from '../lib/huellas-combate';
import {capaFicha} from '../lib/combate-interfaz';
import type {FichaTablero} from './TableroCombate';

export const claveCasilla=(p:Posicion):string=>`${p.x},${p.y}`;
const direcciones=[[1,0],[-1,0],[0,1],[0,-1]];
export const vecinosCasilla=(p:Posicion)=>direcciones.map(([x,y])=>({x:p.x+x,y:p.y+y}));

export function distanciasFicha(ficha:FichaTablero,inicio:Posicion,fichas:FichaTablero[],columnas:number,filas:number,mapa:MapaCombate|undefined,limite:number){
 const otras=fichas.filter(f=>f.id!==ficha.id).flatMap(f=>casillasHuella({huella:f.huella_reserva??f.huella},f.posicion));
 return distanciasMovimiento(inicio,otras,columnas,filas,mapa,limite,capaFicha(ficha)==='aire',{huella:ficha.huella_reserva??ficha.huella});
}

/** Reconstruye una ruta siguiendo las distancias que calculó el motor; no cruza anclas inviables. */
export function rutaFicha(ficha:FichaTablero,inicio:Posicion,fin:Posicion,fichas:FichaTablero[],columnas:number,filas:number,mapa?:MapaCombate,distancias?:Record<string,number>):Posicion[]{
 const d=distancias??distanciasFicha(ficha,inicio,fichas,columnas,filas,mapa,columnas*filas*2),k=claveCasilla(inicio);
 const coste=(p:Posicion)=>claveCasilla(p)===k?0:d[claveCasilla(p)]??Infinity;
 if(!Number.isFinite(coste(fin)))return [];
 const vuelo=capaFicha(ficha)==='aire',huella={huella:ficha.huella_reserva??ficha.huella};
 const ruta=[fin];
 while(claveCasilla(ruta[0])!==k){
  const actual=ruta[0],destino=casillasHuella(huella,actual);
  const anterior=vecinosCasilla(actual).find(p=>{
   if(coste(p)>=coste(actual))return false;
   const ocupadas=new Set(casillasHuella(huella,p).map(claveCasilla));
   const entrada=!vuelo&&destino.some(q=>!ocupadas.has(claveCasilla(q))&&mapa?.celdas[claveCasilla(q)]==='dificil')?2:1;
   return coste(p)+entrada===coste(actual);
  });
  if(!anterior)return [];
  ruta.unshift(anterior);
 }
 return ruta;
}
