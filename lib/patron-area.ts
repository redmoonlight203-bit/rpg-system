export const MAX_RADIO_PATRON=6;
export type CasillaPatron={x:number;y:number};
export type OrientacionPatron='fija'|'apuntar';
export type PatronArea={orientacion:OrientacionPatron;casillas:CasillaPatron[]};

export function validarPatron(v:unknown):string|null{
 if(!v||typeof v!=='object')return 'Dibuja al menos una casilla para el área personalizada.';
 const p=v as Partial<PatronArea>,lado=2*MAX_RADIO_PATRON+1;
 if(p.orientacion!=='fija'&&p.orientacion!=='apuntar')return 'Elige una orientación válida para el patrón.';
 if(!Array.isArray(p.casillas)||p.casillas.length<1||p.casillas.length>lado*lado)return 'Dibuja al menos una casilla para el área personalizada.';
 const marcadas=new Set<string>();
 for(const c of p.casillas){
  if(!c||!Number.isInteger(c.x)||!Number.isInteger(c.y)||Math.abs(c.x)>MAX_RADIO_PATRON||Math.abs(c.y)>MAX_RADIO_PATRON)return 'El patrón excede la cuadrícula del lanzador.';
  const k=c.x+','+c.y;if(marcadas.has(k))return 'El patrón contiene casillas duplicadas.';marcadas.add(k);
 }
 return null;
}

/** El dibujo apunta hacia la derecha (este). Rotación cardinal con empate horizontal, como línea y cono. */
export function girarPatron(c:CasillaPatron,origen:CasillaPatron,direccion:CasillaPatron):CasillaPatron{
 const dx=direccion.x-origen.x,dy=direccion.y-origen.y;
 if(Math.abs(dx)>=Math.abs(dy))return dx<0?{x:-c.x,y:-c.y}:c;
 return dy>0?{x:-c.y,y:c.x}:{x:c.y,y:-c.x};
}

export function patronDesde(p:PatronArea,origen:CasillaPatron,direccion:CasillaPatron,d:{columnas:number;filas:number}):CasillaPatron[]{
 if(validarPatron(p))return [];
 return p.casillas.map(c=>{
  const r=p.orientacion==='apuntar'?girarPatron(c,origen,direccion):c;
  return {x:origen.x+r.x,y:origen.y+r.y};
 }).filter(c=>c.x>=0&&c.y>=0&&c.x<d.columnas&&c.y<d.filas);
}
