/** Progresión cuantitativa; la clase F–KUROI es una clasificación distinta. */
export type RangoNivel={min:number;max:number};
export const NIVEL_MAXIMO=100;
export function experienciaParaNivel(nivel:number):number {
 const n=Math.min(NIVEL_MAXIMO,Math.max(1,Math.floor(nivel)));
 return 50*n*(n-1);
}
export function nivelPorExperiencia(exp:number):number {
 let n=1;
 while(n<NIVEL_MAXIMO&&exp>=experienciaParaNivel(n+1))n++;
 return n;
}
export function experienciaPendiente(exp:number,nivel:number):number {
 return Math.max(0,experienciaParaNivel(Math.min(NIVEL_MAXIMO,nivel+1))-exp);
}
/** Los extremos representan niveles 1 y máximo. Variación de malla solo entre ambos extremos. */
export function escalarMalla(rangos:Record<string,RangoNivel>,nivel:number,maximo=20,aleatorio:()=>number=Math.random):Record<string,number> {
 const tope=Math.max(1,Math.min(100,Math.floor(maximo)));
 const n=Math.min(tope,Math.max(1,Math.floor(nivel)));
 const avance=tope===1?0:(n-1)/(tope-1);
 const resultado:Record<string,number>={};
 for(const [clave,r] of Object.entries(rangos||{})){
  if(!r||!Number.isFinite(r.min)||!Number.isFinite(r.max)||r.min>r.max)continue;
  const margen=.2*Math.min(avance,1-avance);
  const variacion=(Math.max(0,Math.min(1,aleatorio()))*2-1)*margen;
  const t=Math.min(1,Math.max(0,avance+variacion));
  const valor=r.min+(r.max-r.min)*t;
  resultado[clave]=Number.isInteger(r.min)&&Number.isInteger(r.max)?Math.round(valor):Math.round(valor*100)/100;
 }
 return resultado;
}
export function esMonstruo(categorias:{id:string;clave:string;parent_id?:string|null}[],clave:string):boolean{
 const vistos=new Set<string>();let c=categorias.find(x=>x.clave===clave);
 while(c&&!vistos.has(c.id)){if(c.clave==='monstruos')return true;vistos.add(c.id);c=categorias.find(x=>x.id===c?.parent_id);}
 return false;
}
