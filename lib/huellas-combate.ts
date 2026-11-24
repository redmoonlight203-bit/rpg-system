/** La posición de una ficha es siempre su esquina superior izquierda. */
export type Huella = {ancho:number;alto:number};
export type PuntoHuella = {x:number;y:number};
export type FuenteHuella = {
 huella?:Huella;
 configuracion?:{huella?:Huella};
 transformacion?:{huella?:Huella}|null;
};
export const MAX_HUELLA=6;
export function huellaValida(v:unknown):v is Huella {
 if(!v||typeof v!=='object')return false;
 const h=v as Huella;
 return [h.ancho,h.alto].every(n=>Number.isInteger(n)&&n>=1&&n<=MAX_HUELLA);
}
/** Una huella no declarada hereda 1 × 1, la especie o el cuerpo base según el contexto. */
export function validarHuella(v:unknown):string|null {
 return v===undefined||huellaValida(v)?null:`El ancho y el alto deben ser enteros de 1 a ${MAX_HUELLA} casillas.`;
}
export function normalizarHuella(v:unknown):Huella {
 return huellaValida(v)?{ancho:v.ancho,alto:v.alto}:{ancho:1,alto:1};
}
export const huellaDe=(m:FuenteHuella)=>normalizarHuella(m.transformacion?.huella??m.configuracion?.huella??m.huella);
export function casillasHuella(m:FuenteHuella,p:PuntoHuella|undefined):PuntoHuella[]{
 if(!p)return [];
 const {ancho,alto}=huellaDe(m),r:PuntoHuella[]=[];
 for(let y=0;y<alto;y++)for(let x=0;x<ancho;x++)r.push({x:p.x+x,y:p.y+y});
 return r;
}
export const claveHuella=({x,y}:PuntoHuella)=>x+','+y;
export function cabeHuella(m:FuenteHuella,p:PuntoHuella|undefined,c:{columnas:number;filas:number},bloqueada:(p:PuntoHuella)=>boolean){
 return !!p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&casillasHuella(m,p).every(q=>q.x>=0&&q.y>=0&&q.x<c.columnas&&q.y<c.filas&&!bloqueada(q));
}
export function distanciaHuellas(a:FuenteHuella,pa:PuntoHuella|undefined,b:FuenteHuella,pb:PuntoHuella|undefined):number {
 if(!pa||!pb)return Infinity;
 const h=huellaDe(a),j=huellaDe(b);
 return Math.max(0,pa.x-pb.x-j.ancho+1,pb.x-pa.x-h.ancho+1)+Math.max(0,pa.y-pb.y-j.alto+1,pb.y-pa.y-h.alto+1);
}
