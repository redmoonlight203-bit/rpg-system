import type {Combate} from './combate';
type Objeto=Record<string,unknown>;
export type DiferenciaCombate={campos:Objeto;eliminar:string[];miembros:{id:string;campos:Objeto;eliminar:string[]}[]};
function diferencia(antes:Objeto,despues:Objeto,omitir:string[]=[]){
 const campos:Objeto={},eliminar=Object.keys(antes).filter(k=>(!(k in despues)||despues[k]===undefined)&&!omitir.includes(k));
 for(const [k,v] of Object.entries(despues))if(!omitir.includes(k)&&v!==undefined&&JSON.stringify(v)!==JSON.stringify(antes[k]))campos[k]=v;
 return {campos,eliminar};
}
/** El servidor conserva las fichas y el historial: solo viajan los valores cambiados. */
export function cambiosCombate(antes:Combate|undefined,despues:Combate):DiferenciaCombate {
 const previos=new Map((antes?.miembros||[]).map(m=>[m.id,m]));
 const raiz=diferencia((antes||{}) as unknown as Objeto,despues as unknown as Objeto,['miembros','historial','pasos_deshacer']);
 return {...raiz,miembros:despues.miembros.map(m=>({id:m.id,...diferencia((previos.get(m.id)||{}) as Objeto,m as unknown as Objeto)}))};
}
export function recibirEvento<T extends {evento_visual?:Combate['evento_visual']}>(datos:T):T {
 return datos.evento_visual?{...datos,evento_visual:{...datos.evento_visual,recibido_en:Date.now()}}:datos;
}
