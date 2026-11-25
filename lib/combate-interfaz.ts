// Reglas de presentación del combate (plan «Combate de Yugen, calidad visual y mecánica»).
// Todo es puro: no toca el motor. Las capas se deducen de los estados que el motor ya produce
// (p. ej. «En vuelo»); no se añade ninguna regla de juego nueva aquí.

export type Capa='suelo'|'aire'|'subsuelo'|'agua'|'plano';

export const CAPAS:Record<Capa,{nombre:string;regla:string;tutorial:string}>={
 suelo:{nombre:'Suelo',regla:'Capa principal del tablero.',tutorial:''},
 aire:{nombre:'Aire',regla:'Los efectos que solo alcanzan el suelo no le afectan. Su sombra marca la casilla exacta.',tutorial:'Hay alguien en el aire. Su sombra en el suelo marca la casilla: atácala para golpearle si tu ataque alcanza el aire.'},
 subsuelo:{nombre:'Subsuelo',regla:'Bajo tierra: no se ve, solo su marca en el suelo.',tutorial:'Hay alguien bajo tierra. Solo ves la marca que deja en el suelo.'},
 agua:{nombre:'Agua',regla:'Sumergido: las ondas delatan su posición.',tutorial:'Hay alguien en el agua. Las ondas marcan su casilla.'},
 plano:{nombre:'Otro plano',regla:'Fuera de este plano: el halo marca dónde está.',tutorial:'Hay alguien en otro plano. El halo marca dónde se encuentra.'},
};

const PATRONES:[Capa,RegExp][]=[
 ['aire',/\b(en vuelo|vuelo|volando|levitando|levita)\b/i],
 ['subsuelo',/\b(bajo tierra|enterrad[oa]|excavando|subsuelo)\b/i],
 ['agua',/\b(sumergid[oa]|bajo el agua|nadando)\b/i],
 ['plano',/\b(otro plano|et[eé]re[oa]|plano astral|desplazad[oa] de plano)\b/i],
];
/** Capa de una ficha a partir de sus estados (nombres o tipos). Sin estado de capa, está en el suelo. */
export function capaDe(estados?:readonly string[]|null):Capa{
 for(const [capa,patron] of PATRONES)if(estados?.some(e=>patron.test(e)))return capa;
 return 'suelo';
}

type EfectoMinimo={efecto?:string;nombre?:string;suelo?:boolean;coste_ph?:number;coste_fatiga?:number;tablero?:{origen_area?:string;alcance?:number;forma?:string};vision?:{modo?:string}};
/** Igual que el motor: un efecto «solo suelo» no alcanza a quien vuela. */
export function alcanzaCapa(efecto:EfectoMinimo|undefined,capa:Capa):{ok:boolean;motivo?:string}{
 if(efecto?.suelo&&capa==='aire')return {ok:false,motivo:'No alcanza: el objetivo está en el aire.'};
 return {ok:true};
}

/** Acciones que no necesitan objetivo en el tablero: se ejecutan sobre quien actúa. */
export function esAccionPropia(id:string,efecto?:EfectoMinimo){
 return id==='guardia'||id.startsWith('invocar:')||['invocar','crear_arma','transformacion'].includes(efecto?.efecto||'')||efecto?.tablero?.origen_area==='lanzador'||efecto?.vision?.modo==='abrir';
}

/** Un objetivo es «natural» para la acción si el clic directo puede ejecutarla sin sorpresas. */
export function objetivoValido(efecto:EfectoMinimo|undefined,actor:{id:string;bando:string},objetivo:{id:string;bando:string;vida?:number}){
 if(!efecto)return false;
 if(objetivo.vida===0&&efecto.efecto!=='curacion')return false;
 if(efecto.efecto==='dano')return objetivo.bando!==actor.bando;
 if(efecto.efecto==='curacion')return objetivo.bando===actor.bando;
 return true;
}

export type Previsualizacion={titulo:string;lineas:string[];bloqueo?:string;pista:string};
/** Texto de la previsualización: qué ocurrirá al hacer clic, sin porcentajes. */
export function previsualizar({accion,efecto,objetivo,victimas,casillas,capa,coste,segundoClic,pendiente}:{accion:string;efecto?:EfectoMinimo;objetivo?:{nombre:string;vida?:number;max_vida?:number};victimas?:string[];casillas?:number;capa?:Capa;coste?:{ph?:number;fatiga?:number};segundoClic:boolean;pendiente:boolean}):Previsualizacion{
 const lineas:string[]=[];
 if(objetivo)lineas.push(`Objetivo: ${objetivo.nombre}${objetivo.vida!==undefined?` (${Number(objetivo.vida.toFixed(1))}/${objetivo.max_vida} de vida)`:''}`);
 if(victimas)lineas.push(`${casillas||0} casillas · ${victimas.length} afectados${victimas.length?`: ${victimas.join(', ')}`:''}`);
 if(capa&&capa!=='suelo')lineas.push(`Capa: ${CAPAS[capa].nombre}. ${CAPAS[capa].regla}`);
 const gasto=[coste?.ph?`${coste.ph} PH`:'',coste?.fatiga?`${coste.fatiga} Fatiga`:''].filter(Boolean).join(' · ');
 lineas.push(gasto?`Coste: ${gasto} y tu acción.`:'Consume tu acción.');
 const bloqueo=capa?alcanzaCapa(efecto,capa).motivo:undefined;
 const pista=bloqueo?'No se puede ejecutar.':segundoClic?(pendiente?'Toca otra vez para ejecutar.':'Toca para previsualizar; otra vez para ejecutar.'):'Clic para ejecutar.';
 return {titulo:accion,lineas,bloqueo,pista};
}

export type Instantanea={vida:number;max_vida:number;ph:number;fatiga:number;accion_usada:boolean;estados?:string[];capa?:Capa;movimiento?:number};
/** Resumen corto de lo que cambió durante tu turno (daño, capa, reservas). */
export function resumenTurno(antes:Instantanea,despues:Instantanea):string[]{
 const r:string[]=[],dif=(a:number,b:number)=>Number((b-a).toFixed(2));
 const vida=dif(antes.vida,despues.vida);if(vida)r.push(vida<0?`Perdiste ${-vida} de vida (${despues.vida}/${despues.max_vida}).`:`Recuperaste ${vida} de vida (${despues.vida}/${despues.max_vida}).`);
 const ph=dif(antes.ph,despues.ph);if(ph)r.push(ph<0?`Gastaste ${-ph} PH (quedan ${despues.ph}).`:`Recuperaste ${ph} PH.`);
 const fatiga=dif(antes.fatiga,despues.fatiga);if(fatiga)r.push(fatiga>0?`Fatiga +${fatiga} (total ${despues.fatiga}).`:`Fatiga ${fatiga}.`);
 if(antes.movimiento!==undefined&&despues.movimiento!==undefined&&despues.movimiento<antes.movimiento)r.push(`Te moviste ${antes.movimiento-despues.movimiento} casillas.`);
 if(antes.capa&&despues.capa&&antes.capa!==despues.capa)r.push(`Pasaste de ${CAPAS[antes.capa].nombre.toLowerCase()} a ${CAPAS[despues.capa].nombre.toLowerCase()}.`);
 const previos=new Set(antes.estados||[]),actuales=new Set(despues.estados||[]);
 const nuevos=[...actuales].filter(e=>!previos.has(e)),perdidos=[...previos].filter(e=>!actuales.has(e));
 if(nuevos.length)r.push(`Nuevos estados: ${nuevos.join(', ')}.`);
 if(perdidos.length)r.push(`Terminan: ${perdidos.join(', ')}.`);
 if(!antes.accion_usada&&despues.accion_usada)r.push('Usaste tu acción.');
 else if(!despues.accion_usada)r.push('No usaste tu acción.');
 return r;
}

/** Tecla 1–9 → índice de ranura; null para cualquier otra tecla. */
export function ranuraDeTecla(tecla:string):number|null{
 return /^[1-9]$/.test(tecla)?Number(tecla)-1:null;
}

/** Consumibles fijados en la barra, por personaje. Solo preferencia local de quien juega. */
export function leerFijados(clave:string):string[]{
 try{const v=JSON.parse(globalThis.localStorage?.getItem('yugen:barra:'+clave)||'[]');return Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,6):[];}catch{return [];}
}
export function guardarFijados(clave:string,ids:string[]){
 try{globalThis.localStorage?.setItem('yugen:barra:'+clave,JSON.stringify([...new Set(ids)].slice(0,6)));}catch{}
}
/** Ordena los consumibles: primero los fijados (en su orden) y luego el resto, sin duplicados por nombre. */
export function ordenarConsumibles<T extends {id:string}>(lista:T[],fijados:string[],clave:(x:T)=>string=x=>x.id):T[]{
 const pos=new Map(fijados.map((id,i)=>[id,i]));
 return [...lista].sort((a,b)=>(pos.get(clave(a))??99)-(pos.get(clave(b))??99));
}
/** Consumibles de la mochila agrupados por nombre (cada copia es una pieza distinta). Con fijados, solo esos y en su orden. */
export function consumiblesBarra<T extends {id:string;nombre:string;consumible?:boolean;imagen_url?:string;acciones?:{id:string;bloqueada?:string}[]}>(fuentes:T[],fijados:string[]):{id:string;nombre:string;cantidad:number;imagen_url?:string;bloqueada?:string}[]{
 const grupos=new Map<string,{id:string;nombre:string;cantidad:number;imagen_url?:string;bloqueada?:string}>();
 for(const p of fuentes){
  if(!p.consumible||!p.acciones?.length)continue;
  const g=grupos.get(p.nombre);
  if(g)g.cantidad++;else grupos.set(p.nombre,{id:p.id,nombre:p.nombre,cantidad:1,imagen_url:p.imagen_url,bloqueada:p.acciones.every(a=>a.bloqueada)?p.acciones[0].bloqueada:undefined});
 }
 const lista=[...grupos.values()],fijadosVivos=fijados.filter(n=>grupos.has(n));
 return fijadosVivos.length?ordenarConsumibles(lista.filter(c=>fijadosVivos.includes(c.nombre)),fijadosVivos,c=>c.nombre):lista.slice(0,6);
}

/** Preferencia «confirmar con segundo clic»: guardada por quien juega; por defecto activa en pantallas táctiles. */
export function leerSegundoClic(tactil:boolean):boolean{
 try{const v=globalThis.localStorage?.getItem('yugen:segundo-clic');if(v==='1')return true;if(v==='0')return false;}catch{}
 return tactil;
}
export function guardarSegundoClic(v:boolean){try{globalThis.localStorage?.setItem('yugen:segundo-clic',v?'1':'0');}catch{}}

/** Tutorial contextual: cada nota se muestra una sola vez por navegador. */
export function notaPendiente(claves:string[]):string|null{
 try{const vistas=new Set(JSON.parse(globalThis.localStorage?.getItem('yugen:tutorial')||'[]'));return claves.find(k=>!vistas.has(k))||null;}catch{return claves[0]||null;}
}
export function marcarNota(clave:string){
 try{const vistas=new Set(JSON.parse(globalThis.localStorage?.getItem('yugen:tutorial')||'[]'));vistas.add(clave);globalThis.localStorage?.setItem('yugen:tutorial',JSON.stringify([...vistas]));}catch{}
}
export const TUTORIAL_ALCANCE:Record<string,string>={
 circulo:'Área circular: todo lo que quede dentro del círculo recibe el efecto.',
 linea:'Línea: el efecto recorre las casillas en línea recta desde quien lo lanza.',
 cono:'Cono: el efecto se abre desde quien lo lanza hacia la casilla elegida.',
 cuadrado:'Área cuadrada: todo lo que quede dentro recibe el efecto.',
 cruz:'Cruz: el efecto se extiende en las cuatro direcciones desde el centro.',
 lanzador:'Este efecto nace de tu personaje y afecta a su alrededor.',
};
