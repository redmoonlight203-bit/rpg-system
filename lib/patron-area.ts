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

export const DIRECCIONES_PATRON=[
 {nombre:'Este',signo:'→',x:1,y:0},{nombre:'Sureste',signo:'↘',x:1,y:1},
 {nombre:'Sur',signo:'↓',x:0,y:1},{nombre:'Suroeste',signo:'↙',x:-1,y:1},
 {nombre:'Oeste',signo:'←',x:-1,y:0},{nombre:'Noroeste',signo:'↖',x:-1,y:-1},
 {nombre:'Norte',signo:'↑',x:0,y:-1},{nombre:'Noreste',signo:'↗',x:1,y:-1},
] as const;
export const patronEnV=():CasillaPatron[]=>[{x:0,y:0},...[1,2,3].flatMap(x=>[{x,y:-x},{x,y:x}])];
const redondear=(v:number)=>v<0?-Math.round(-v):Math.round(v);

/** La derecha es el frente del dibujo. El puntero selecciona el octante más cercano. */
export function girarPatron(c:CasillaPatron,origen:CasillaPatron,direccion:CasillaPatron):CasillaPatron{
 const dx=direccion.x-origen.x,dy=direccion.y-origen.y;
 const giro=(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8;
 const {x,y}=c,r=Math.max(Math.abs(x),Math.abs(y));
 if(!r||!giro)return c;
 // Desplaza cada casilla dentro de su anillo cuadrado. Una rotación es biyectiva:
 // al girar en diagonal no se fusionan casillas, no se abren huecos y no aumenta el alcance.
 const indice=x===r&&y>=0?y:y===r?2*r-x:x===-r?4*r-y:y===-r?6*r+x:8*r+y;
 const t=(indice+giro*r)%(8*r);
 return t<=r?{x:r,y:t}:t<=3*r?{x:2*r-t,y:r}:t<=5*r?{x:-r,y:4*r-t}:t<=7*r?{x:t-6*r,y:-r}:{x:r,y:t-8*r};
}

export function patronDesde(p:PatronArea,origen:CasillaPatron,direccion:CasillaPatron,d:{columnas:number;filas:number}):CasillaPatron[]{
 if(validarPatron(p))return [];
 const resultado=new Map<string,CasillaPatron>();
 for(const c of p.casillas){
  const r=p.orientacion==='apuntar'?girarPatron(c,origen,direccion):c;
  const x=origen.x+r.x,y=origen.y+r.y;
  if(x>=0&&y>=0&&x<d.columnas&&y<d.filas)resultado.set(x+','+y,{x,y});
 }
 return [...resultado.values()];
}

/** Prevalece la casilla bajo el puntero; el clic queda como respaldo táctil. */
export function direccionVistaPatron(ancla:CasillaPatron|undefined,hover:CasillaPatron|null,confirmada:CasillaPatron|null|undefined):CasillaPatron|null{
 const p=hover??confirmada;
 return ancla&&p&&(ancla.x!==p.x||ancla.y!==p.y)?p:null;
}

/** Conecta muestras sucesivas del arrastre para que un gesto rápido no deje huecos. */
export function trazoPatron(desde:CasillaPatron,hasta:CasillaPatron):CasillaPatron[]{
 const dx=hasta.x-desde.x,dy=hasta.y-desde.y,n=Math.max(Math.abs(dx),Math.abs(dy));
 return n?Array.from({length:n+1},(_,i)=>({x:desde.x+redondear(dx*i/n),y:desde.y+redondear(dy*i/n)})):[desde];
}
