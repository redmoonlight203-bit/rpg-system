import type {Posicion,MapaCombate} from './combate';
/** Ruta visual de menor coste; las reglas y el destino confirmado siguen perteneciendo al motor. */
export function rutaVisual(desde:Posicion,hasta:Posicion,columnas:number,filas:number,ocupadas:Posicion[],mapa?:MapaCombate):Posicion[]{
 const clave=(p:Posicion)=>`${p.x},${p.y}`,inicio=clave(desde),fin=clave(hasta);
 const bloqueadas=new Set(ocupadas.map(clave));bloqueadas.delete(inicio);bloqueadas.delete(fin);
 const dist=new Map([[inicio,0]]),prev=new Map<string,Posicion>(),cola=[desde];
 while(cola.length){
  cola.sort((a,b)=>dist.get(clave(a))!-dist.get(clave(b))!);
  const p=cola.shift()!,k=clave(p);if(k===fin)break;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const q={x:p.x+dx,y:p.y+dy},s=clave(q),coste=dist.get(k)!+(mapa?.celdas[s]==='dificil'?2:1);
   if(q.x<0||q.y<0||q.x>=columnas||q.y>=filas||bloqueadas.has(s)||mapa?.celdas[s]==='muro'||coste>=(dist.get(s)??Infinity))continue;
   dist.set(s,coste);prev.set(s,p);cola.push(q);
  }
 }
 if(!dist.has(fin))return [];
 const ruta=[hasta];while(clave(ruta[0])!==inicio)ruta.unshift(prev.get(clave(ruta[0]))!);
 return ruta;
}
export function intensidadHerida(vida?:number,maximo?:number){return vida!==undefined&&maximo&&maximo>0?Math.max(0,Math.min(1,(.5-vida/maximo)*2)):0;}
