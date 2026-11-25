import type {EventoVisual,Posicion} from './combate';

const coincide=(a?:Posicion,b?:Posicion)=>!!a&&!!b&&a.x===b.x&&a.y===b.y;

/** Mide el retrato en el mismo espacio que las capas de efectos. El combate conserva sus casillas enteras. */
export function anclarAlLanzador(evento:EventoVisual,tablero:HTMLElement,columnas:number,filas:number):EventoVisual{
 const desde=evento.desde;
 if(!desde)return evento;
 const movimiento=evento.movimientos?.find(m=>evento.emisor?m.id===evento.emisor:coincide(m.desde,desde)&&m.tipo!=='forzado');
 const celda=(p:Posicion)=>tablero.querySelector<HTMLElement>(`[data-casilla="${p.x},${p.y}"]`);
 const origen=celda(movimiento?.desde??desde);
 if(!origen)return evento;
 const ficha=evento.emisor?tablero.querySelector<HTMLElement>(`[data-ficha="${CSS.escape(evento.emisor)}"]`):(movimiento?celda(movimiento.hasta):origen)?.querySelector<HTMLElement>('.tactical-token');
 const marco=tablero.getBoundingClientRect(),casilla=origen.getBoundingClientRect();
 if(!marco.width||!marco.height)return evento;
 let x=casilla.left+casilla.width/2,y=casilla.top+casilla.height/2;
 if(ficha&&movimiento){
  // La ficha ya está montada en la casilla de llegada y puede estar animándose hacia ella.
  // Usa su tamaño de reposo en la casilla de partida, sin sumar dos veces esa traslación.
  const desplazamiento=getComputedStyle(ficha).translate.split(/\s+/);
  const distancia=(v:string|undefined,tamano:number)=>v?.endsWith('%')?parseFloat(v)*tamano/100:parseFloat(v||'0')||0;
  x=casilla.left+ficha.offsetLeft+ficha.offsetWidth/2+distancia(desplazamiento[0],ficha.offsetWidth);
  y=casilla.top+ficha.offsetTop+ficha.offsetHeight/2+distancia(desplazamiento[1],ficha.offsetHeight);
 }else if(ficha){
  const retrato=(ficha.querySelector('.battle-portrait')??ficha).getBoundingClientRect();
  x=retrato.left+retrato.width/2;y=retrato.top+retrato.height/2;
 }
 const ancla={x:(x-marco.left)/marco.width*columnas-.5,y:(y-marco.top)/marco.height*filas-.5};
 return {...evento,desde:ancla,hasta:coincide(desde,evento.hasta)?ancla:evento.hasta,
  movimientos:evento.movimientos?.map(m=>m===movimiento?{...m,desde:ancla}:m)};
}

