import {validarVoces,type ConfigVoces} from "./artefactos-voces";
/**
 * Artefactos con nivel: un objeto que crece con su portador (p. ej. una espada que devora armas).
 * Lógica pura y validación; los datos viajan en `forja_maestra.configuracion_artefacto`.
 */
export type CondicionSubida={tipo:'contador';contador:string;meta:number}|{tipo:'evento';evento:string};
export type NivelArtefacto={nivel:number;nombre:string;condicion_subida:CondicionSubida|null;cambios:{stats?:Record<string,number>;descripcion?:string}};
export type ConfiguracionArtefacto={niveles:NivelArtefacto[];
  /** Tabla d100: la fila `tirada-1` es la forma que toma el artefacto con un portador. Vacía = «Forma N». */
  formas?:string[];
  /** Tramos de la tirada d100 al devorar un arma. Sin tramos se usan TRAMOS_BASE. */
  tramos?:TramoAbsorcion[];
  /** Voces de demonio al tomar el arma. */
  voces?:ConfigVoces;
  /** Espejo mental que el GM puede lanzar sobre el portador. */
  espejo?:import('./espejo-mental').OpcionesEspejo};
export type TramoAbsorcion={desde:number;hasta:number;nombre:string;
  /** Cuántas estadísticas del arma se quedan, o todas. */
  estadisticas:{min:number;max:number}|'todas';
  habilidades:number|'todas';
  pasivas:boolean};
export type ArmaDevorable={nombre:string;stats:Record<string,number>;habilidades:{id:string;nombre:string}[];pasivas:{id:string;nombre:string}[]};
export type Absorcion={arma:string;tirada:number;tramo:string;stats:Record<string,number>;habilidades:{id:string;nombre:string}[];pasivas:{id:string;nombre:string}[]};
export type EstadoPortador={nivel:number;absorbidas:Absorcion[];eventos?:string[]};
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
  if(x.voces!==undefined){const f=validarVoces(x.voces);if(f)return 'Voces: '+f;}
  if(x.tramos!==undefined){const f=validarTramos(x.tramos);if(f)return f;}
  if(x.formas!==undefined){
    if(!Array.isArray(x.formas)||x.formas.length!==100)return 'La tabla de formas tiene exactamente 100 filas.';
    const mala=x.formas.findIndex(f=>typeof f!=='string'||f.length>120);
    if(mala>=0)return `La forma ${mala+1} es demasiado larga (máximo 120).`;
  }
  return null;
}
export const formasVacias=()=>Array.from({length:100},()=>'');
export const formaDe=(a:ConfiguracionArtefacto,tirada:number)=>a.formas?.[tirada-1]?.trim()||`Forma ${tirada}`;
/** Copia limpia (sin campos desconocidos) para guardar. */
export function normalizarArtefacto(a:ConfiguracionArtefacto):ConfiguracionArtefacto{
  return {...a,...(a.voces?{voces:{...a.voces,voces:a.voces.voces.map(z=>({...z,texto:z.texto.trim(),...(z.opciones?{opciones:z.opciones.map(o=>o.trim()).filter(Boolean)}:{})}))}}:{}),...(a.formas?{formas:a.formas.map(f=>f.trim())}:{}),niveles:a.niveles.map(n=>({nivel:n.nivel,nombre:n.nombre.trim(),condicion_subida:n.condicion_subida,cambios:{...n.cambios}}))};
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

const NADA={min:0,max:0};
export const TRAMOS_BASE:TramoAbsorcion[]=[
  {desde:1,hasta:30,nombre:'Una estadística',estadisticas:{min:1,max:1},habilidades:0,pasivas:false},
  {desde:31,hasta:45,nombre:'Dos o tres estadísticas',estadisticas:{min:2,max:3},habilidades:0,pasivas:false},
  {desde:46,hasta:60,nombre:'Una habilidad',estadisticas:NADA,habilidades:1,pasivas:false},
  {desde:61,hasta:75,nombre:'Una habilidad y una estadística',estadisticas:{min:1,max:1},habilidades:1,pasivas:false},
  {desde:76,hasta:90,nombre:'Una habilidad y varias estadísticas',estadisticas:{min:2,max:4},habilidades:1,pasivas:false},
  {desde:91,hasta:100,nombre:'Set completo',estadisticas:'todas',habilidades:'todas',pasivas:true},
];
/** Los tramos cubren 1–100 en orden, sin huecos ni rangos que crucen otro tramo. */
export function validarTramos(t:unknown):string|null{
  if(!Array.isArray(t)||!t.length||t.length>20)return 'Configura entre 1 y 20 tramos.';
  let esperado=1;
  for(const [i,x] of (t as TramoAbsorcion[]).entries()){
    if(!x||!entero(x.desde,1,100)||!entero(x.hasta,1,100)||x.hasta<x.desde)return `Tramo ${i+1}: rango inválido.`;
    if(x.desde<esperado)return `El tramo ${i+1} (${x.desde}–${x.hasta}) cruza el tramo anterior.`;
    if(x.desde>esperado)return `Hay un hueco: falta ${esperado}–${x.desde-1} antes del tramo ${i+1}.`;
    if(!texto(x.nombre))return `Pon nombre al tramo ${i+1}.`;
    const e=x.estadisticas;
    if(e!=='todas'&&(!e||!entero(e.min,0,50)||!entero(e.max,0,50)||e.min>e.max))return `Tramo ${i+1}: el mínimo de estadísticas no puede superar el máximo.`;
    if(x.habilidades!=='todas'&&!entero(x.habilidades,0,20))return `Tramo ${i+1}: habilidades de 0 a 20 o todas.`;
    if(typeof x.pasivas!=='boolean')return `Tramo ${i+1}: indica si absorbe pasivas.`;
    esperado=x.hasta+1;
  }
  return esperado===101?null:`Los tramos deben llegar hasta 100 (terminan en ${esperado-1}).`;
}
export const tramoDe=(t:TramoAbsorcion[],tirada:number)=>t.find(x=>tirada>=x.desde&&tirada<=x.hasta)!;
type Dado=(caras:number)=>number;
/** Elige `n` elementos distintos con el dado (sin tirar cuando no hay elección). */
function elegir<T>(lista:T[],n:number,rng:Dado):T[]{
  const libres=[...lista],r:T[]=[];
  while(r.length<n&&libres.length){const i=libres.length===1?0:rng(libres.length)-1;r.push(libres.splice(i,1)[0]);}
  return r;
}
/** Tira 1d100, elige el tramo y toma del arma lo que ese tramo permite. */
export function absorber(arma:ArmaDevorable,tramos:TramoAbsorcion[],rng:Dado):Absorcion{
  const tirada=rng(100),t=tramoDe(tramos,tirada);
  const claves=Object.keys(arma.stats||{});
  const e=t.estadisticas;
  const n=e==='todas'?claves.length:e.min===e.max?e.min:e.min+rng(e.max-e.min+1)-1;
  const stats=Object.fromEntries(elegir(claves,n,rng).map(k=>[k,arma.stats[k]]));
  const habilidades=elegir(arma.habilidades||[],t.habilidades==='todas'?(arma.habilidades||[]).length:t.habilidades,rng);
  const pasivas=t.pasivas?[...(arma.pasivas||[])]:[];
  return {arma:arma.nombre,tirada,tramo:t.nombre,stats,habilidades,pasivas};
}
export const CONTADOR_DEVORADAS='armas devoradas';
/** El artefacto devora un arma: guarda la absorción, suma el contador y recalcula el nivel. */
export function devorar(a:ConfiguracionArtefacto,p:EstadoPortador,arma:ArmaDevorable,rng:Dado):EstadoPortador{
  const absorbidas=[...p.absorbidas,absorber(arma,a.tramos||TRAMOS_BASE,rng)];
  const nivel=Math.max(p.nivel,nivelAlcanzado(a,{contadores:{[CONTADOR_DEVORADAS]:absorbidas.length},eventos:p.eventos||[]}));
  return {...p,absorbidas,nivel};
}
/** Todo lo absorbido sumado: estadísticas acumuladas y habilidades/pasivas sin repetir. */
export function bonosAbsorbidos(p:EstadoPortador){
  const stats:Record<string,number>={},hab=new Map<string,string>(),pas=new Map<string,string>();
  for(const x of p.absorbidas){for(const [k,v] of Object.entries(x.stats))stats[k]=(stats[k]||0)+v;for(const h of x.habilidades)hab.set(h.id,h.nombre);for(const q of x.pasivas)pas.set(q.id,q.nombre);}
  return {stats,habilidades:[...hab].map(([id,nombre])=>({id,nombre})),pasivas:[...pas].map(([id,nombre])=>({id,nombre}))};
}
