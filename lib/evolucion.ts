/**
 * Evolución y legado (YUGEN).
 *
 * Tres clases de forma conviven sin mezclarse:
 *  - `etapa_vida`: cambio permanente en la existencia de un personaje (infancia, juventud…).
 *  - `evolucion`: cambio permanente de naturaleza, especie o capacidades (lineal, ramificado, condicionado).
 *  - `transformacion`: la transformación temporal de siempre (lib/transformaciones.ts), que ahora toma como
 *    referencia la etapa permanente vigente.
 *
 * Módulo puro: no habla con Supabase ni muta sus argumentos. El servidor repite las comprobaciones que importan
 * (supabase/migrations/20261124200000_evolucion_legado.sql).
 */
import {validarHuella,type Huella} from './huellas-combate';
import type {AnimacionEtapa} from './vfx';
import type {Regla} from './reglas';
import type {Inmunidad} from './inmunidades';

export type TipoForma='etapa_vida'|'evolucion'|'transformacion';
export const TIPOS_FORMA:Record<TipoForma,{nombre:string;ayuda:string}>={
 etapa_vida:{nombre:'Etapa de vida',ayuda:'Cambio permanente en su existencia. No consume PH, no dura turnos y no termina con el encuentro.'},
 evolucion:{nombre:'Evolución',ayuda:'Cambio permanente de naturaleza, especie o capacidades. Puede ser lineal, ramificada o condicionada.'},
 transformacion:{nombre:'Transformación temporal',ayuda:'Se configura como habilidad: costes, duración y etapas internas. Parte de la etapa permanente actual.'},
};
/** Registro histórico del equipo: nunca es un objeto real ni se entrega a nadie. */
export type EquipoHistorico={slot:string;nombre:string;forja_id?:string};
export type Acontecimiento={fecha?:string;capitulo?:string;evento?:string};
export type EtapaEvolutiva={
 id:string;
 tipo:'etapa_vida'|'evolucion';
 nombre:string;
 edad?:number;
 retrato?:string;
 /** Representación en el tablero; si falta, el tablero usa el retrato. */
 sprite?:string;
 apariencia?:string;
 historia?:string;
 personalidad?:string;
 descripcion?:string;
 /** Clave de raza o especie (Reglas y estadísticas). */
 raza?:string;
 /** Atributos totales de la etapa (incluidos vida y ph). Mismas claves que Reglas y estadísticas. */
 stats:Record<string,number>;
 /** Recursos especiales (núcleo, energías…) con su máximo en esta etapa. */
 recursos?:Record<string,number>;
 habilidades:string[];
 habilidades_naturales?:string[];
 magia?:string[];
 pasivas:string[];
 /** Pasivas exclusivas de la etapa, construidas con el motor de reglas. */
 reglas?:Regla[];
 /** Resistencias e inmunidades: primitivas del sistema universal de inmunidades. */
 inmunidades?:Inmunidad[];
 /** Debilidades narrativas o tipos de daño señalados; informativas salvo que el GM las convierta en reglas. */
 debilidades?:string[];
 huella?:Huella;
 equipamiento?:EquipoHistorico[];
 /** Ids de habilidades de transformación disponibles en esta etapa (vacío = las de siempre). */
 transformaciones?:string[];
 acontecimiento?:Acontecimiento;
 vfx?:AnimacionEtapa;
 /** Clase registrada con el método vigente (simulación de balance) al guardar la etapa. */
 clase?:string;
 /** Oculta a los jugadores hasta desbloquearse. */
 secreta?:boolean;
 final?:boolean;
 /** Posición en el árbol visual. */
 pos?:{x:number;y:number};
};
export type ModoTransicion='manual_gm'|'automatica'|'solicitud_jugador'|'evento_combate'|'habilidad_objeto';
export const MODOS_TRANSICION:Record<ModoTransicion,string>={
 manual_gm:'Manual por el GM',automatica:'Automática al cumplir requisitos',solicitud_jugador:'El jugador solicita la activación',
 evento_combate:'Durante un combate',habilidad_objeto:'Al usar una habilidad u objeto',
};
export type Comparador='<'|'<='|'='|'>='|'>';
/** Árbol de requisitos. `todas`, `alguna`, `no` y `comparar` son las mismas primitivas del motor de reglas. */
export type RequisitoEvolucion=
 |{tipo:'siempre'}
 |{tipo:'todas'|'alguna';condiciones:RequisitoEvolucion[]}
 |{tipo:'no';condicion:RequisitoEvolucion}
 |{tipo:'edad';minimo:number}
 |{tipo:'nivel';minimo:number}
 |{tipo:'experiencia';minimo:number}
 |{tipo:'comparar';atributo:string;operador:Comparador;valor:number}
 |{tipo:'objeto';forja_id:string;consumir?:boolean}
 |{tipo:'habilidad';forja_id:string}
 |{tipo:'derrotar';forja_id:string;cantidad:number}
 |{tipo:'mision';clave:string}
 |{tipo:'energia';clave:string;minimo:number}
 |{tipo:'nucleo';clave:string;minimo:number}
 |{tipo:'salvacion';atributo:string;cd:number}
 |{tipo:'evento';clave:string}
 |{tipo:'autorizacion_gm'};
export type TipoRequisito=RequisitoEvolucion['tipo'];
export const REQUISITOS:Record<TipoRequisito,string>={
 siempre:'Sin requisitos',todas:'Todas (Y)',alguna:'Alguna (O)',no:'No (NO)',edad:'Alcanzar una edad',nivel:'Alcanzar un nivel',experiencia:'Acumular experiencia',
 comparar:'Atributo específico',objeto:'Poseer o consumir un objeto',habilidad:'Poseer una habilidad',derrotar:'Derrotar a un enemigo',mision:'Completar una misión',
 energia:'Absorber energía',nucleo:'Condición del núcleo',salvacion:'Superar una salvación',evento:'Acontecimiento narrativo',autorizacion_gm:'Autorización del GM',
};
/** Recuperación al evolucionar. Por defecto, ninguna: los recursos actuales solo se limitan al nuevo máximo. */
export type Recuperacion={modo:'ninguna'|'completa'|'proporcional'|'fija';vida?:number;ph?:number};
export type TransicionEvolutiva={
 id:string;desde:string;hasta:string;
 requisito:RequisitoEvolucion;
 modo:ModoTransicion;
 recuperacion?:Recuperacion;
 /** Ruta exclusiva: tomarla cierra para siempre las demás ramas que salen del mismo origen. */
 exclusiva?:boolean;
 /** Oculta a los jugadores hasta que se cumpla. */
 secreta?:boolean;
 /** Habilidad u objeto que la activa (modo habilidad_objeto). */
 activador?:string;
 /** Encuentro de práctica: puede evolucionar ahí sin guardar nada. */
 nombre?:string;
};
export type LineaEvolutiva={version:1;inicial:string;etapas:EtapaEvolutiva[];transiciones:TransicionEvolutiva[]};
/** Hitos de una instancia: lo que el motor no puede deducir de la ficha (misiones, acontecimientos, derrotas…). */
export type Hitos={misiones?:string[];eventos?:string[];derrotados?:Record<string,number>;energias?:Record<string,number>;nucleo?:Record<string,number>;salvaciones?:Record<string,number>;edad?:number;rutas_cerradas?:string[]};
export type ContextoEvolucion={
 nivel:number;exp_total:number;stats:Record<string,number>;edad?:number;
 objetos:string[];habilidades:string[];hitos:Hitos;
 /** Autorización explícita del GM en esta solicitud. */
 autorizado_gm?:boolean;
};

export const LIMITES={etapas:64,transiciones:128,profundidad:12,condiciones:64,texto:10000,nombre:120} as const;
const id=()=>crypto.randomUUID();
const copia=<T>(v:T):T=>JSON.parse(JSON.stringify(v));

export function lineaVacia(nombre='Origen',stats:Record<string,number>={},tipo:EtapaEvolutiva['tipo']='etapa_vida'):LineaEvolutiva{
 const etapa:EtapaEvolutiva={id:id(),tipo,nombre,stats:{...stats},habilidades:[],pasivas:[],pos:{x:0,y:0}};
 return {version:1,inicial:etapa.id,etapas:[etapa],transiciones:[]};
}
/** Formas antiguas (`formas_historia`: nombre, historia, imagen) como etapas de vida en línea. Nunca las borra. */
export function desdeFormasHistoria(formas:{nombre:string;historia:string;imagen:string}[]|undefined,stats:Record<string,number>={}):LineaEvolutiva|null{
 const validas=(formas||[]).filter(f=>f&&typeof f.nombre==='string');
 if(!validas.length)return null;
 const etapas:EtapaEvolutiva[]=validas.map((f,i)=>({id:id(),tipo:'etapa_vida',nombre:f.nombre.trim()||`Forma ${i+1}`,historia:f.historia||'',retrato:f.imagen||undefined,stats:{...stats},habilidades:[],pasivas:[],pos:{x:0,y:i}}));
 const transiciones:TransicionEvolutiva[]=etapas.slice(1).map((e,i)=>({id:id(),desde:etapas[i].id,hasta:e.id,requisito:{tipo:'autorizacion_gm'},modo:'manual_gm'}));
 return {version:1,inicial:etapas[0].id,etapas,transiciones};
}
/** Espejo compatible para `formas_historia` (códices y vistas antiguas). */
export function aFormasHistoria(l:LineaEvolutiva|null|undefined):{nombre:string;historia:string;imagen:string}[]{
 return (l?.etapas||[]).map(e=>({nombre:e.nombre,historia:e.historia||'',imagen:e.retrato||''}));
}

function validarRequisito(r:RequisitoEvolucion,profundidad:number,cuenta:{n:number}):string|null{
 if(!r||typeof r!=='object')return 'Requisito vacío.';
 if(++cuenta.n>LIMITES.condiciones)return `Máximo ${LIMITES.condiciones} condiciones por transición.`;
 if(profundidad>LIMITES.profundidad)return 'Demasiados niveles de condiciones anidadas.';
 const n=(v:unknown,min=0)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=1_000_000_000;
 const t=(v:unknown)=>typeof v==='string'&&v.trim().length>0&&v.length<=200;
 switch(r.tipo){
  case 'siempre':case 'autorizacion_gm':return null;
  case 'todas':case 'alguna':
   if(!Array.isArray(r.condiciones)||!r.condiciones.length)return 'Una combinación Y/O necesita al menos una condición.';
   for(const c of r.condiciones){const e=validarRequisito(c,profundidad+1,cuenta);if(e)return e;}return null;
  case 'no':return validarRequisito(r.condicion,profundidad+1,cuenta);
  case 'edad':case 'nivel':case 'experiencia':return n(r.minimo)?null:'Indica un mínimo válido.';
  case 'comparar':return t(r.atributo)&&n(r.valor,-1_000_000_000)&&['<','<=','=','>=','>'].includes(r.operador)?null:'Comparación de atributo inválida.';
  case 'objeto':case 'habilidad':return t(r.forja_id)?null:'Elige una creación de la Forja.';
  case 'derrotar':return t(r.forja_id)&&Number.isInteger(r.cantidad)&&r.cantidad>=1&&r.cantidad<=10000?null:'Elige al enemigo y cuántas veces.';
  case 'mision':case 'evento':return t(r.clave)?null:'Nombra la misión o el acontecimiento.';
  case 'energia':case 'nucleo':return t(r.clave)&&n(r.minimo)?null:'Indica la energía y la cantidad.';
  case 'salvacion':return t(r.atributo)&&Number.isInteger(r.cd)&&r.cd>=1&&r.cd<=100?null:'La salvación necesita atributo y CD entre 1 y 100.';
  default:return 'Requisito desconocido.';
 }
}

/** Detecta ciclos alcanzables desde cualquier etapa (DFS con colores). */
export function tieneCiclo(l:Pick<LineaEvolutiva,'etapas'|'transiciones'>):boolean{
 const salida=new Map<string,string[]>();
 for(const t of l.transiciones)salida.set(t.desde,[...(salida.get(t.desde)||[]),t.hasta]);
 const color=new Map<string,number>();
 const visitar=(n:string):boolean=>{
  color.set(n,1);
  for(const m of salida.get(n)||[]){const c=color.get(m)||0;if(c===1)return true;if(c===0&&visitar(m))return true;}
  color.set(n,2);return false;
 };
 return l.etapas.some(e=>!color.get(e.id)&&visitar(e.id));
}
/** ¿Crearía un ciclo añadir desde→hasta? Útil para impedirlo al conectar nodos. */
export function creariaCiclo(l:LineaEvolutiva,desde:string,hasta:string):boolean{
 return desde===hasta||tieneCiclo({etapas:l.etapas,transiciones:[...l.transiciones,{id:'_',desde,hasta,requisito:{tipo:'siempre'},modo:'manual_gm'}]});
}

export function validarLinea(l:LineaEvolutiva|null|undefined):string|null{
 if(l==null)return null;
 if(l.version!==1||!Array.isArray(l.etapas)||!Array.isArray(l.transiciones))return 'Línea evolutiva con formato desconocido.';
 if(!l.etapas.length)return 'La línea necesita al menos una etapa.';
 if(l.etapas.length>LIMITES.etapas)return `Máximo ${LIMITES.etapas} etapas.`;
 if(l.transiciones.length>LIMITES.transiciones)return `Máximo ${LIMITES.transiciones} conexiones.`;
 const ids=new Set<string>();
 for(const e of l.etapas){
  if(!e.id||ids.has(e.id))return 'Cada etapa necesita un identificador único.';ids.add(e.id);
  if(!e.nombre?.trim()||e.nombre.length>LIMITES.nombre)return 'Cada etapa necesita nombre (máximo 120 caracteres).';
  if(e.tipo!=='etapa_vida'&&e.tipo!=='evolucion')return `${e.nombre}: tipo de etapa desconocido.`;
  if(e.edad!==undefined&&(!Number.isFinite(e.edad)||e.edad<0||e.edad>100000))return `${e.nombre}: edad inválida.`;
  if(!e.stats||typeof e.stats!=='object'||Object.values(e.stats).some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1_000_000))return `${e.nombre}: estadísticas inválidas.`;
  if(Object.keys(e.stats).some(k=>!/^[a-z_][a-z0-9_]{0,63}$/.test(k)))return `${e.nombre}: clave de atributo inválida.`;
  if(e.stats.vida!==undefined&&e.stats.vida<=0)return `${e.nombre}: la vida máxima debe ser mayor que 0.`;
  for(const lista of [e.habilidades,e.pasivas,e.habilidades_naturales||[],e.magia||[],e.transformaciones||[]])
   if(!Array.isArray(lista)||lista.length>60||new Set(lista).size!==lista.length)return `${e.nombre}: hay poderes repetidos o demasiados.`;
  const huella=validarHuella(e.huella);if(huella)return `${e.nombre}: ${huella}`;
  for(const campo of ['historia','apariencia','personalidad','descripcion'] as const)if((e[campo]||'').length>LIMITES.texto)return `${e.nombre}: texto demasiado largo.`;
  if((e.reglas||[]).length>40)return `${e.nombre}: máximo 40 pasivas exclusivas.`;
 }
 if(!ids.has(l.inicial))return 'La etapa inicial no existe.';
 const pares=new Set<string>();
 for(const t of l.transiciones){
  if(!t.id||!ids.has(t.desde)||!ids.has(t.hasta))return 'Hay una conexión rota: apunta a una etapa que ya no existe.';
  if(t.desde===t.hasta)return 'Una etapa no puede evolucionar en sí misma.';
  if(t.hasta===l.inicial)return 'Ninguna conexión puede volver a la etapa inicial.';
  const par=t.desde+'>'+t.hasta;if(pares.has(par))return 'Hay dos conexiones iguales entre las mismas etapas.';pares.add(par);
  if(!(t.modo in MODOS_TRANSICION))return 'Modo de activación desconocido.';
  if(l.etapas.find(e=>e.id===t.desde)?.final)return 'Una etapa final no puede evolucionar.';
  const e=validarRequisito(t.requisito,0,{n:0});if(e)return e;
  if(t.recuperacion&&(!['ninguna','completa','proporcional','fija'].includes(t.recuperacion.modo)||[t.recuperacion.vida,t.recuperacion.ph].some(v=>v!==undefined&&(!Number.isFinite(v)||v<0||v>1_000_000))))return 'Recuperación inválida.';
  if(t.modo==='habilidad_objeto'&&!t.activador)return 'Elige la habilidad u objeto que activa la evolución.';
 }
 if(tieneCiclo(l))return 'La línea tiene un ciclo: una etapa acabaría evolucionando en sí misma.';
 return null;
}

/** Comparación idéntica a la del motor de reglas. */
function comparar(a:number,op:Comparador,b:number){return op==='<'?a<b:op==='<='?a<=b:op==='='?a===b:op==='>='?a>=b:a>b;}
const nombreDe=(r:RequisitoEvolucion)=>REQUISITOS[r.tipo]||r.tipo;
export type ResultadoRequisito={cumple:boolean;faltantes:string[];consumir:string[]};
/** Evalúa un árbol Y/O/NO. Devuelve qué falta en lenguaje del juego y qué objetos se consumirían. */
export function evaluarRequisito(r:RequisitoEvolucion,ctx:ContextoEvolucion):ResultadoRequisito{
 const ok=(cumple:boolean,falta:string,consumir:string[]=[]):ResultadoRequisito=>({cumple,faltantes:cumple?[]:[falta],consumir:cumple?consumir:[]});
 const h=ctx.hitos||{};
 switch(r.tipo){
  case 'siempre':return ok(true,'');
  case 'todas':{const rs=r.condiciones.map(c=>evaluarRequisito(c,ctx));const cumple=rs.every(x=>x.cumple);return {cumple,faltantes:rs.flatMap(x=>x.faltantes),consumir:cumple?rs.flatMap(x=>x.consumir):[]};}
  case 'alguna':{const rs=r.condiciones.map(c=>evaluarRequisito(c,ctx));const primera=rs.find(x=>x.cumple);return primera?{cumple:true,faltantes:[],consumir:primera.consumir}:{cumple:false,faltantes:['Cumplir al menos una de: '+rs.flatMap(x=>x.faltantes).join(' / ')],consumir:[]};}
  case 'no':{const x=evaluarRequisito(r.condicion,ctx);return ok(!x.cumple,'No debe cumplirse: '+nombreDe(r.condicion));}
  case 'edad':{const edad=ctx.edad??h.edad??0;return ok(edad>=r.minimo,`Edad ${r.minimo} (tiene ${edad})`);}
  case 'nivel':return ok(ctx.nivel>=r.minimo,`Nivel ${r.minimo} (tiene ${ctx.nivel})`);
  case 'experiencia':return ok(ctx.exp_total>=r.minimo,`${r.minimo} EXP acumulada (tiene ${ctx.exp_total})`);
  case 'comparar':return ok(comparar(Number(ctx.stats[r.atributo]??0),r.operador,r.valor),`${r.atributo} ${r.operador} ${r.valor}`);
  case 'objeto':return ok(ctx.objetos.includes(r.forja_id),(r.consumir?'Consumir':'Poseer')+' el objeto requerido',r.consumir?[r.forja_id]:[]);
  case 'habilidad':return ok(ctx.habilidades.includes(r.forja_id),'Conocer la habilidad requerida');
  case 'derrotar':return ok((h.derrotados?.[r.forja_id]||0)>=r.cantidad,`Derrotar al enemigo requerido ${r.cantidad} ${r.cantidad===1?'vez':'veces'}`);
  case 'mision':return ok(!!h.misiones?.includes(r.clave),`Completar la misión «${r.clave}»`);
  case 'evento':return ok(!!h.eventos?.includes(r.clave),`Acontecimiento «${r.clave}»`);
  case 'energia':return ok((h.energias?.[r.clave]||0)>=r.minimo,`Absorber ${r.minimo} de ${r.clave}`);
  case 'nucleo':return ok((h.nucleo?.[r.clave]??ctx.stats[r.clave]??0)>=r.minimo,`Núcleo: ${r.clave} ≥ ${r.minimo}`);
  case 'salvacion':{const t=h.salvaciones?.[r.atributo+':'+r.cd];return ok(t!==undefined&&t>=r.cd,`Superar salvación de ${r.atributo} CD ${r.cd}`);}
  case 'autorizacion_gm':return ok(!!ctx.autorizado_gm,'Autorización del GM');
 }
}
/** ¿Contiene una tirada de salvación que hay que resolver antes? */
export function salvacionesPendientes(r:RequisitoEvolucion):{atributo:string;cd:number}[]{
 if(r.tipo==='salvacion')return [{atributo:r.atributo,cd:r.cd}];
 if(r.tipo==='todas'||r.tipo==='alguna')return r.condiciones.flatMap(salvacionesPendientes);
 if(r.tipo==='no')return salvacionesPendientes(r.condicion);
 return [];
}

/** Estado de una instancia: su propia copia de la línea, la etapa vigente y el historial cerrado. */
export type RegistroEtapa={id:string;etapa_id:string;desde_etapa?:string|null;transicion_id?:string|null;snapshot:EtapaEvolutiva;ficha:{nivel:number;exp_total:number;stats:Record<string,number>};autorizado_por?:string|null;condiciones?:string[];origen:'gm'|'jugador'|'automatica'|'combate'|'inicial';combate_id?:string|null;action_id?:string|null;created_at?:string};
export type EstadoEvolucion={linea:LineaEvolutiva;etapa_actual:string;hitos:Hitos;historial:RegistroEtapa[]};

export function etapaDe(l:LineaEvolutiva,etapaId:string):EtapaEvolutiva{
 const e=l.etapas.find(x=>x.id===etapaId);if(!e)throw Error('La etapa no pertenece a esta línea evolutiva.');return e;
}
export function transicionesDesde(l:LineaEvolutiva,etapaId:string,hitos:Hitos={}):TransicionEvolutiva[]{
 const cerradas=new Set(hitos.rutas_cerradas||[]);
 return l.transiciones.filter(t=>t.desde===etapaId&&!cerradas.has(t.id));
}
export function esFinal(l:LineaEvolutiva,etapaId:string){return !!etapaDe(l,etapaId).final||!l.transiciones.some(t=>t.desde===etapaId);}

/** Copia de la etapa actual para empezar otra: todo se conserva y el GM decide qué cambia. Ids nuevos, sin compartir referencias. */
export function crearEtapaDesde(l:LineaEvolutiva,etapaId:string,cambios:Partial<EtapaEvolutiva>={}):{linea:LineaEvolutiva;etapa:EtapaEvolutiva}{
 const base=etapaDe(l,etapaId);
 const nueva:EtapaEvolutiva={...copia(base),secreta:base.secreta,final:false,clase:undefined,acontecimiento:undefined,id:id(),nombre:base.nombre+' (nueva)',
  reglas:(base.reglas||[]).map(r=>({...copia(r),id:id()})),pos:{x:(base.pos?.x??0),y:(base.pos?.y??0)+1},...copia(cambios)};
 const t:TransicionEvolutiva={id:id(),desde:base.id,hasta:nueva.id,requisito:{tipo:'autorizacion_gm'},modo:'manual_gm'};
 return {linea:{...l,etapas:[...l.etapas.map(e=>e.id===base.id?{...e,final:false}:e),nueva],transiciones:[...l.transiciones,t]},etapa:nueva};
}
/** Qué hacer con cada elemento al heredar: conservar, sustituir, eliminar o incorporar. */
export type DecisionHerencia={conservar:boolean};
export function heredarLista(base:string[],decisiones:Record<string,DecisionHerencia>,incorporar:string[]=[]):string[]{
 return [...new Set([...base.filter(x=>decisiones[x]?.conservar!==false),...incorporar])];
}

/** Instantánea congelada: el historial nunca comparte referencias con la línea editable. */
export function congelarEtapa(e:EtapaEvolutiva):EtapaEvolutiva{return copia(e);}

export type FichaPermanente={nivel:number;exp_total:number;atributos:Record<string,number>;vida_actual:number;vida_maxima_actual?:number|null;ph_actual:number;imagen_url?:string|null;raza?:string};
/** Máximo efectivo de vida que usa la ficha (incluye bonos que el combate guardó como vida_maxima_actual). */
function maxVida(f:Pick<FichaPermanente,'atributos'|'vida_maxima_actual'>){return Math.max(1,Number(f.vida_maxima_actual??f.atributos.vida??f.atributos.hp??1));}
/**
 * Reconciliación de recursos al cambiar de etapa permanente.
 * Por defecto NO cura: la vida actual se conserva y solo se limita al nuevo máximo. El bono de vida del equipo
 * (vida_maxima_actual − vida base) se traslada para no convertir heridas en curación. Nivel y EXP no cambian.
 */
export function aplicarEtapaPermanente(f:FichaPermanente,destino:EtapaEvolutiva,recuperacion:Recuperacion={modo:'ninguna'}):FichaPermanente{
 const baseAntes=Math.max(1,Number(f.atributos.vida??f.atributos.hp??1));
 const bonoEquipo=Math.max(0,maxVida(f)-baseAntes);
 const atributos={...f.atributos,...destino.stats};
 const baseDespues=Math.max(1,Number(atributos.vida??atributos.hp??1));
 const maximo=baseDespues+bonoEquipo;
 const phMax=Math.max(0,Number(atributos.ph??0));
 let vida=Math.min(f.vida_actual,maximo),ph=Math.min(f.ph_actual,phMax);
 if(recuperacion.modo==='completa'){vida=maximo;ph=phMax;}
 else if(recuperacion.modo==='proporcional'){vida=Math.max(f.vida_actual>0?1:0,Math.min(maximo,Math.round(f.vida_actual/maxVida(f)*maximo)));ph=Math.min(phMax,Math.round(f.ph_actual/Math.max(1,Number(f.atributos.ph??1))*phMax));}
 else if(recuperacion.modo==='fija'){vida=Math.min(maximo,vida+(recuperacion.vida||0));ph=Math.min(phMax,ph+(recuperacion.ph||0));}
 return {...f,nivel:f.nivel,exp_total:f.exp_total,atributos,vida_actual:vida,vida_maxima_actual:bonoEquipo?maximo:null,ph_actual:ph,imagen_url:destino.retrato||f.imagen_url,...(destino.raza?{raza:destino.raza}:{})};
}

export type SolicitudTransicion={transicion_id:string;action_id:string;origen:RegistroEtapa['origen'];autorizado_por?:string|null;forzar?:boolean;combate_id?:string|null};
/**
 * Transición permanente pura e idempotente: mismo `action_id` ⇒ mismo resultado, sin aplicar dos veces.
 * El servidor ejecuta la versión autoritativa con bloqueo de fila; esta sirve al cliente y a las pruebas.
 */
export function transicionar(estado:EstadoEvolucion,ficha:FichaPermanente,ctx:ContextoEvolucion,s:SolicitudTransicion):{estado:EstadoEvolucion;ficha:FichaPermanente;registro:RegistroEtapa;repetida:boolean;consumir:string[]}{
 const previa=estado.historial.find(r=>r.action_id===s.action_id);
 if(previa)return {estado,ficha,registro:previa,repetida:true,consumir:[]};
 const t=estado.linea.transiciones.find(x=>x.id===s.transicion_id);
 if(!t)throw Error('Esa evolución no existe en esta línea.');
 if(t.desde!==estado.etapa_actual)throw Error('La evolución no parte de la etapa actual.');
 if(estado.hitos.rutas_cerradas?.includes(t.id))throw Error('Esa ruta quedó cerrada por una evolución exclusiva.');
 const gm=s.origen==='gm'||s.origen==='combate';
 if(!gm&&t.modo==='manual_gm')throw Error('Solo el GM puede activar esta evolución.');
 const r=evaluarRequisito(t.requisito,{...ctx,autorizado_gm:gm||ctx.autorizado_gm});
 if(!r.cumple&&!(gm&&s.forzar))throw Error('Faltan requisitos: '+r.faltantes.join('; '));
 const destino=etapaDe(estado.linea,t.hasta);
 const nuevaFicha=aplicarEtapaPermanente(ficha,destino,t.recuperacion);
 const cerradas=t.exclusiva?estado.linea.transiciones.filter(x=>x.desde===t.desde&&x.id!==t.id).map(x=>x.id):[];
 const registro:RegistroEtapa={id:id(),etapa_id:destino.id,desde_etapa:t.desde,transicion_id:t.id,snapshot:congelarEtapa(destino),ficha:{nivel:nuevaFicha.nivel,exp_total:nuevaFicha.exp_total,stats:{...nuevaFicha.atributos}},
  autorizado_por:s.autorizado_por??null,condiciones:r.cumple?[]:['Forzada por el GM: '+r.faltantes.join('; ')],origen:s.origen,combate_id:s.combate_id??null,action_id:s.action_id};
 return {estado:{...estado,etapa_actual:destino.id,hitos:{...estado.hitos,rutas_cerradas:[...new Set([...(estado.hitos.rutas_cerradas||[]),...cerradas])]},historial:[...estado.historial,registro]},ficha:nuevaFicha,registro,repetida:false,consumir:r.consumir};
}

/**
 * Lo que puede ver un jugador: etapas ya vividas, la actual y las siguientes no secretas.
 * Las etapas futuras secretas y todo lo que hay más allá del siguiente paso permanece oculto.
 */
export function vistaJugador(estado:EstadoEvolucion,ctx?:ContextoEvolucion):{etapas:(EtapaEvolutiva&{estado:'pasada'|'actual'|'siguiente'})[];transiciones:(TransicionEvolutiva&{faltantes?:string[]})[]}{
 const vividas=new Set(estado.historial.map(r=>r.etapa_id));
 const l=estado.linea;
 const siguientes=transicionesDesde(l,estado.etapa_actual,estado.hitos).filter(t=>!t.secreta&&!etapaDe(l,t.hasta).secreta);
 const etapas=[
  ...estado.historial.filter(r=>r.etapa_id!==estado.etapa_actual).map(r=>({...r.snapshot,estado:'pasada' as const})),
  {...etapaDe(l,estado.etapa_actual),estado:'actual' as const},
  ...siguientes.filter(t=>!vividas.has(t.hasta)).map(t=>({...etapaDe(l,t.hasta),estado:'siguiente' as const,stats:{},habilidades:[],pasivas:[],reglas:[]})),
 ];
 const unicas=[...new Map(etapas.map(e=>[e.id,e])).values()];
 return {etapas:unicas,transiciones:siguientes.map(t=>({...t,requisito:t.requisito,faltantes:ctx?evaluarRequisito(t.requisito,ctx).faltantes:undefined}))};
}

export type Diferencia={clave:string;antes?:number;despues?:number;delta:number};
/** Comparador de estadísticas entre dos etapas. */
export function compararEtapas(a:EtapaEvolutiva,b:EtapaEvolutiva):{stats:Diferencia[];ganadas:string[];perdidas:string[]}{
 const claves=[...new Set([...Object.keys(a.stats),...Object.keys(b.stats)])].sort();
 const stats=claves.map(clave=>({clave,antes:a.stats[clave],despues:b.stats[clave],delta:(b.stats[clave]??0)-(a.stats[clave]??0)}));
 const poderes=(e:EtapaEvolutiva)=>new Set([...e.habilidades,...(e.habilidades_naturales||[]),...(e.magia||[]),...e.pasivas]);
 const pa=poderes(a),pb=poderes(b);
 return {stats,ganadas:[...pb].filter(x=>!pa.has(x)),perdidas:[...pa].filter(x=>!pb.has(x))};
}

/** Todos los poderes de una etapa (habilidades, naturales y MAGIA) sin repetir. */
export function habilidadesEtapa(e:EtapaEvolutiva):string[]{return [...new Set([...e.habilidades,...(e.habilidades_naturales||[]),...(e.magia||[])])];}

/** Disposición automática por niveles para el árbol (si los nodos no tienen posición). */
export function disponerArbol(l:LineaEvolutiva):Record<string,{x:number;y:number}>{
 const nivel=new Map<string,number>([[l.inicial,0]]);
 const cola=[l.inicial];
 while(cola.length){const n=cola.shift()!;for(const t of l.transiciones.filter(x=>x.desde===n))if(!nivel.has(t.hasta)){nivel.set(t.hasta,nivel.get(n)!+1);cola.push(t.hasta);}}
 let suelto=Math.max(0,...nivel.values())+1;
 for(const e of l.etapas)if(!nivel.has(e.id))nivel.set(e.id,suelto++);
 const porNivel=new Map<number,string[]>();
 for(const e of l.etapas){const k=nivel.get(e.id)!;porNivel.set(k,[...(porNivel.get(k)||[]),e.id]);}
 const r:Record<string,{x:number;y:number}>={};
 for(const [y,ids] of porNivel)ids.forEach((idEtapa,i)=>{r[idEtapa]={x:i-(ids.length-1)/2,y};});
 return r;
}
