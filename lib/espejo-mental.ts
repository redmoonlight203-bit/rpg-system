/**
 * Espejo mental: confunde la vista de UN jugador. Se aplica solo a lo que se le envía (proyección); el estado, el
 * registro y la vista del GM siguen siendo los reales, y las acciones viajan con los ids verdaderos.
 * Sin dependencias: el motor Edge lo incrusta.
 */
export type OpcionesEspejo={espejar:boolean;intercambiar:boolean;ocultar:boolean;
  /** Pide confirmación antes de atacar a quien el jugador ve como enemigo (desactivado por defecto). */
  confirmar?:boolean;cd?:number;atributo?:string};
type Pos={x:number;y:number};
type Dims={columnas:number;filas:number};
const reflejar=(p:Pos,d:Dims):Pos=>({x:d.columnas-1-p.x,y:p.y});
const clave=(k:string,d:Dims)=>{const [x,y]=k.split(',').map(Number);return `${d.columnas-1-x},${y}`;};
const OTRO:Record<string,string>={jugador:'enemigo',enemigo:'jugador'};

/** Vista proyectada para `propio`. Nunca muta la entrada. */
export function proyectarVista<V extends {tablero?:Dims;objetivos?:{id:string;nombre:string;bando:string;posicion?:Pos;imagen_url?:string}[];alcanzables?:Record<string,number>;mapa?:{columnas?:number;filas?:number;celdas?:Record<string,string>}|null;evento_visual?:{desde?:Pos;hasta?:Pos;area?:Pos[];movimientos?:{desde:Pos;hasta:Pos}[]}|null}>(vista:V,propio:string,o:OpcionesEspejo):V{
  const v:V=JSON.parse(JSON.stringify(vista));
  const d=v.tablero||{columnas:v.mapa?.columnas||10,filas:v.mapa?.filas||10};
  const yo=v.objetivos?.find(x=>x.id===propio);
  for(const x of v.objetivos||[]){
    if(o.espejar&&x.posicion)x.posicion=reflejar(x.posicion,d);
    if(x.id===propio)continue;
    if(o.intercambiar&&yo&&OTRO[x.bando])x.bando=OTRO[x.bando];
    if(o.ocultar){x.nombre='???';delete x.imagen_url;}
  }
  if(o.espejar){
    if(v.alcanzables)v.alcanzables=Object.fromEntries(Object.entries(v.alcanzables).map(([k,n])=>[clave(k,d),n]));
    if(v.mapa?.celdas)v.mapa.celdas=Object.fromEntries(Object.entries(v.mapa.celdas).map(([k,t])=>[clave(k,d),t]));
    const ev=v.evento_visual;
    if(ev){if(ev.desde)ev.desde=reflejar(ev.desde,d);if(ev.hasta)ev.hasta=reflejar(ev.hasta,d);if(ev.area)ev.area=ev.area.map(p=>reflejar(p,d));if(ev.movimientos)ev.movimientos=ev.movimientos.map(m=>({...m,desde:reflejar(m.desde,d),hasta:reflejar(m.hasta,d)}));}
  }
  return v;
}
/** Casilla real de un clic hecho sobre la vista reflejada (mover, centro de un área). */
export function desproyectar(p:Pos,o:OpcionesEspejo,d:Dims):Pos{return o.espejar?reflejar(p,d):{...p};}
export const AVISO_ESPEJO='Tu mente se confunde';
