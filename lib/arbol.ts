export type NodoArbol={id:string;personaje_id:number;padre_id:string|null;nombre:string;descripcion:string;tipo:'rama'|'habilidad'|'estadistica';habilidad_id:string|null;atributo:string|null;incremento:number|null;coste:number;nivel_minimo:number;aprendido_at:string|null;puntos_gastados:number;bloqueo:string|null};
export type PosicionNodo={nodo:NodoArbol;x:number;y:number};
/** Center each parent over its children; independent roots share a character origin. */
export function distribuirArbol(nodos:NodoArbol[]){
 const posiciones:PosicionNodo[]=[],vistos=new Set<string>();let hoja=0,maxProf=0;
 const ids=new Set(nodos.map(n=>n.id));
 const hijos=(id:string|null)=>nodos.filter(n=>id===null?!n.padre_id||!ids.has(n.padre_id):n.padre_id===id);
 function visitar(n:NodoArbol,prof:number):number{
  if(vistos.has(n.id))return hoja*244+126;
  vistos.add(n.id);maxProf=Math.max(maxProf,prof);
  const centros=hijos(n.id).filter(h=>!vistos.has(h.id)).map(h=>visitar(h,prof+1));
  const x=centros.length?(centros[0]+centros[centros.length-1])/2:hoja++*244+126;
  posiciones.push({nodo:n,x,y:180+prof*200});return x;
 }
 hijos(null).forEach(n=>visitar(n,0));
 // Defensive rendering for old or externally malformed records.
 nodos.filter(n=>!vistos.has(n.id)).forEach(n=>visitar(n,0));
 return {posiciones,ancho:Math.max(500,hoja*244+8),alto:nodos.length?(maxProf+1)*200+200:300};
}
export function descendientes(nodos:NodoArbol[],id:string):Set<string>{
 const vistos=new Set<string>([id]),pendientes=[id];
 while(pendientes.length){const padre=pendientes.pop();for(const n of nodos)if(n.padre_id===padre&&!vistos.has(n.id)){vistos.add(n.id);pendientes.push(n.id);}}
 return vistos;
}
