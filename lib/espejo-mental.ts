/**
 * Espejo mental: confunde la vista de UN jugador. Se aplica solo a lo que se le envía (proyección); el estado, el
 * registro y la vista del GM siguen siendo los reales, y las acciones viajan con los ids verdaderos.
 * Sin dependencias: el motor Edge lo incrusta.
 */
export type OpcionesEspejo={espejar:boolean;intercambiar:boolean;ocultar:boolean;
  /** Pide confirmación antes de atacar a quien el jugador ve como enemigo (desactivado por defecto). */
  confirmar?:boolean;cd?:number;atributo?:string};
type Pos={x:number;y:number};
type Activaciones={activaciones?:{posicion:Pos}[]};
type Dims={columnas:number;filas:number};
const reflejar=(p:Pos,d:Dims,ancho=1):Pos=>({x:d.columnas-ancho-p.x,y:p.y});
const clave=(k:string,d:Dims)=>{const [x,y]=k.split(',').map(Number);return `${d.columnas-1-x},${y}`;};
const OTRO:Record<string,string>={jugador:'enemigo',enemigo:'jugador'};

/** Vista proyectada para `propio`. Nunca muta la entrada. */
export function proyectarVista<V extends {tablero?:Dims;objetivos?:{id:string;nombre:string;bando:string;posicion?:Pos;huella?:{ancho:number};imagen_url?:string}[];alcanzables?:Record<string,number>;mapa?:{columnas?:number;filas?:number;celdas?:Record<string,string>}|null;recibo?:{evento?:Activaciones|null}|null;evento_visual?:(Activaciones&{desde?:Pos;hasta?:Pos;area?:Pos[];movimientos?:{id?:string;desde:Pos;hasta:Pos}[]})|null}>(vista:V,propio:string,o:OpcionesEspejo):V{
  const v:V=JSON.parse(JSON.stringify(vista));
  const d=v.tablero||{columnas:v.mapa?.columnas||10,filas:v.mapa?.filas||10};
  const yo=v.objetivos?.find(x=>x.id===propio);
  for(const x of v.objetivos||[]){
    if(o.espejar&&x.posicion)x.posicion=reflejar(x.posicion,d,x.huella?.ancho);
    if(x.id===propio)continue;
    if(o.intercambiar&&yo&&OTRO[x.bando])x.bando=OTRO[x.bando];
    if(o.ocultar){x.nombre='???';delete x.imagen_url;}
  }
  if(o.espejar){
    const ancho=yo?.huella?.ancho??1;
    if(v.alcanzables)v.alcanzables=Object.fromEntries(Object.entries(v.alcanzables).map(([k,n])=>{const [x,y]=k.split(',').map(Number),p=reflejar({x,y},d,ancho);return [p.x+','+p.y,n];}));
    if(v.mapa?.celdas)v.mapa.celdas=Object.fromEntries(Object.entries(v.mapa.celdas).map(([k,t])=>[clave(k,d),t]));
    for(const evento of [v.evento_visual,v.recibo?.evento]){
      if(evento?.activaciones)evento.activaciones=evento.activaciones.map(a=>({...a,posicion:reflejar(a.posicion,d)}));
    }
    const ev=v.evento_visual;
    if(ev){if(ev.desde)ev.desde=reflejar(ev.desde,d);if(ev.hasta)ev.hasta=reflejar(ev.hasta,d);if(ev.area)ev.area=ev.area.map(p=>reflejar(p,d));if(ev.movimientos)ev.movimientos=ev.movimientos.map(m=>{const ancho=v.objetivos?.find(x=>x.id===m.id)?.huella?.ancho;return {...m,desde:reflejar(m.desde,d,ancho),hasta:reflejar(m.hasta,d,ancho)};});}
  }
  return v;
}
/** Casilla real de un clic reflejado: el movimiento usa el ancho de la ficha, un área usa 1. */
export function desproyectar(p:Pos,o:OpcionesEspejo,d:Dims,ancho=1):Pos{return o.espejar?reflejar(p,d,ancho):{...p};}
export const AVISO_ESPEJO='Tu mente se confunde';
const ESPEJO_DIRECCION:Record<string,string>={e:'o',o:'e',ne:'no',no:'ne',se:'so',so:'se',n:'n',s:'s'};
type Ocular={objetivos?:Record<string,{puntos?:string[]}>;amenaza?:string[]}|null|undefined;
/**
 * Respuesta completa para el jugador afectado: proyecta la vista, la vista ocular y todo lo que lleve nombres o
 * bandos reales (registro, turno, quién decide una reacción). Sin espejo devuelve la respuesta tal cual.
 */
export function proyectarRespuesta<V extends Parameters<typeof proyectarVista>[0]&{ocular?:Ocular;registro?:string[];actual?:string;actual_id?:string|null;reaccion_esperando?:string}>(real:V,propio:string,e:(OpcionesEspejo&{aviso?:boolean})|null|undefined):V&{espejo?:{aviso?:string;confirmar:boolean;reflejado?:boolean}}{
  if(!e)return real;
  const v=proyectarVista(real,propio,e);
  const d=v.tablero||{columnas:10,filas:10};
  if(v.ocular){
    const o=v.ocular;
    if(e.espejar){
      if(o.amenaza)o.amenaza=o.amenaza.map(k=>clave(k,d));
      for(const x of Object.values(o.objetivos||{}))if(x.puntos)x.puntos=x.puntos.map(p=>ESPEJO_DIRECCION[p]||p);
    }
    if(e.intercambiar)o.objetivos={};
  }
  const confunde=e.ocultar||e.intercambiar;
  return {...v,...(confunde?{registro:['Tu mente se confunde: no distingues lo que ocurre.'],actual:real.actual_id===propio?real.actual:'???',...(real.reaccion_esperando!==undefined?{reaccion_esperando:'???'}:{})}:{}),
    espejo:{aviso:e.aviso?AVISO_ESPEJO:undefined,confirmar:!!e.confirmar,...(e.espejar?{reflejado:true}:{})}};
}
