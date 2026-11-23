/**
 * Artefactos con nivel: un objeto que crece con su portador (p. ej. una espada que devora armas).
 * Lógica pura y validación; los datos viajan en `forja_maestra.configuracion_artefacto`.
 */
export type CondicionSubida={tipo:'contador';contador:string;meta:number}|{tipo:'evento';evento:string};
export type NivelArtefacto={nivel:number;nombre:string;condicion_subida:CondicionSubida|null;cambios:{stats?:Record<string,number>;descripcion?:string}};
export type ConfiguracionArtefacto={niveles:NivelArtefacto[]};
export type ProgresoArtefacto={contadores:Record<string,number>;eventos:string[]};

const texto=(v:unknown,max=120)=>typeof v==='string'&&!!v.trim()&&v.length<=max;
const entero=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;

export function validarArtefacto(a:unknown):string|null{
  if(!a||typeof a!=='object')return 'Configuración de artefacto inválida.';
  const x=a as ConfiguracionArtefacto;
  if(!Array.isArray(x.niveles)||!x.niveles.length)return 'El artefacto necesita al menos un nivel.';
  if(x.niveles.length>30)return 'Como mucho 30 niveles.';
  for(const [i,n] of x.niveles.entries()){
    if(!n||n.nivel!==i+1)return i===0?'Los niveles empiezan en 1.':`Los niveles deben ser consecutivos (falta el ${i+1}).`;
    if(!texto(n.nombre))return `Pon nombre al nivel ${n.nivel}.`;
    const c=n.condicion_subida;
    if(i===0){if(c)return 'El nivel 1 es el inicial: no tiene condición de subida.';}
    else if(!c||!['contador','evento'].includes(c.tipo))return `Elige la condición de subida del nivel ${n.nivel}: un contador o un evento.`;
    else if(c.tipo==='contador'&&(!texto(c.contador,60)||!entero(c.meta,1,100000)))return `Nivel ${n.nivel}: nombra el contador y una meta de 1 o más.`;
    else if(c.tipo==='evento'&&!texto(c.evento))return `Nivel ${n.nivel}: describe el evento que lo despierta.`;
    const st=n.cambios?.stats;
    if(st&&(typeof st!=='object'||Object.entries(st).some(([k,v])=>!/^[a-z_][a-z0-9_]{0,63}$/.test(k)||!entero(v,-1000,1000))))return `Nivel ${n.nivel}: estadísticas inválidas.`;
    if(n.cambios?.descripcion!==undefined&&(typeof n.cambios.descripcion!=='string'||n.cambios.descripcion.length>2000))return `Nivel ${n.nivel}: descripción demasiado larga.`;
  }
  return null;
}
/** Copia limpia (sin campos desconocidos) para guardar. */
export function normalizarArtefacto(a:ConfiguracionArtefacto):ConfiguracionArtefacto{
  return {...a,niveles:a.niveles.map(n=>({nivel:n.nivel,nombre:n.nombre.trim(),condicion_subida:n.condicion_subida,cambios:{...n.cambios}}))};
}
/** Nivel actual: se sube en orden mientras se cumpla la condición del siguiente. */
export function nivelAlcanzado(a:ConfiguracionArtefacto,p:ProgresoArtefacto):number{
  let nivel=1;
  for(const n of a.niveles.slice(1)){
    const c=n.condicion_subida;
    const ok=c?.tipo==='contador'?(p.contadores[c.contador]||0)>=c.meta:c?.tipo==='evento'?p.eventos.includes(c.evento):false;
    if(!ok)break;
    nivel=n.nivel;
  }
  return nivel;
}
/** Estadísticas acumuladas de los niveles 1..nivel. */
export function statsDeNivel(a:ConfiguracionArtefacto,nivel:number):Record<string,number>{
  const r:Record<string,number>={};
  for(const n of a.niveles)if(n.nivel<=nivel)for(const [k,v] of Object.entries(n.cambios?.stats||{}))r[k]=(r[k]||0)+v;
  return r;
}
export const nivelVacio=(nivel:number):NivelArtefacto=>({nivel,nombre:nivel===1?'Despertar':`Nivel ${nivel}`,condicion_subida:nivel===1?null:{tipo:'contador',contador:'armas devoradas',meta:nivel*2},cambios:{}});
export const artefactoVacio=():ConfiguracionArtefacto=>({niveles:[nivelVacio(1)]});
