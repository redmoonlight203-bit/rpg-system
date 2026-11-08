/** Reordena sin reconstruir ni perder campos que el editor no conozca. */
export function moverElemento<T>(items:T[],desde:number,hasta:number):T[]{
 if(!Number.isInteger(desde)||!Number.isInteger(hasta)||desde<0||hasta<0||desde>=items.length||hasta>=items.length||desde===hasta)return items;
 const siguientes=[...items], [item]=siguientes.splice(desde,1);siguientes.splice(hasta,0,item);return siguientes;
}
export function leerOrden(texto:string,grupo:string,total:number):number|null{
 try{const d=JSON.parse(texto);return d?.grupo===grupo&&Number.isInteger(d.indice)&&d.indice>=0&&d.indice<total?d.indice:null;}catch{return null;}
}
