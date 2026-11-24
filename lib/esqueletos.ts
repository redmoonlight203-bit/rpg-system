/**
 * Esqueletos de armas y gestos (plan maestro, Apéndice D · parte C). Un esqueleto es un molde: dice cómo se mueve el
 * arma (familia de gesto), dónde se sujeta y dónde termina el golpe (anclas), su tamaño y sus fases. La animación
 * sale del esqueleto asignado, NUNCA del nombre del arma. El nombre solo se usa como respaldo para creaciones
 * antiguas sin esqueleto (migración en memoria, sin escribir en la base).
 * Módulo puro (el motor Edge lo incrusta).
 */
export type FamiliaGesto='corte'|'estocada'|'golpe_pesado'|'barrido'|'tiro'|'impacto_corto';
export type IdAncla='mango'|'centro'|'punta'|'objeto';
/** Coordenadas en el lienzo del arma (0–96), con el portador a la izquierda y el golpe hacia la derecha. */
export type Ancla={id:IdAncla;x:number;y:number};
export type FasesGesto={preparacion:number;impacto:number;recuperacion:number};
export type Esqueleto={id:string;nombre:string;familia_gesto:FamiliaGesto;anclas:Ancla[];
 /** Tamaño visual relativo a una casilla (1 = una casilla). */
 longitud_relativa:number;
 /** Duración de cada fase en milisegundos. */
 fases:FasesGesto;
 /** Esqueleto del que se copió (los creados por el GM). */
 base?:string;
 /** Color de acento del gesto (estela). */
 color?:string;
 /** Lanza un proyectil hacia el objetivo (arcos, ballestas). */
 proyectil?:boolean};
export const FAMILIAS:Record<FamiliaGesto,string>={corte:'Corte',estocada:'Estocada',golpe_pesado:'Golpe pesado',barrido:'Barrido',tiro:'Tiro',impacto_corto:'Impacto corto'};
export const ESQUELETOS_BASE:Esqueleto[]=[
 {id:'espada',nombre:'Espada',familia_gesto:'corte',longitud_relativa:1,fases:{preparacion:120,impacto:110,recuperacion:250},anclas:[{id:'mango',x:28,y:48},{id:'centro',x:62,y:48},{id:'punta',x:92,y:48}],color:'#f1e4bd'},
 {id:'hacha',nombre:'Hacha',familia_gesto:'golpe_pesado',longitud_relativa:1,fases:{preparacion:200,impacto:90,recuperacion:260},anclas:[{id:'mango',x:26,y:50},{id:'centro',x:60,y:48},{id:'punta',x:82,y:38}],color:'#ffb37a'},
 {id:'lanza',nombre:'Lanza',familia_gesto:'estocada',longitud_relativa:1.6,fases:{preparacion:140,impacto:90,recuperacion:220},anclas:[{id:'mango',x:10,y:48},{id:'centro',x:50,y:48},{id:'punta',x:94,y:48}],color:'#cfe8ff'},
 {id:'arco',nombre:'Arco',familia_gesto:'tiro',longitud_relativa:1,fases:{preparacion:170,impacto:60,recuperacion:220},anclas:[{id:'mango',x:40,y:48},{id:'centro',x:32,y:48},{id:'punta',x:82,y:48}],color:'#f6eee1',proyectil:true},
 {id:'baston',nombre:'Bastón',familia_gesto:'barrido',longitud_relativa:1.4,fases:{preparacion:130,impacto:120,recuperacion:240},anclas:[{id:'mango',x:20,y:52},{id:'centro',x:52,y:48},{id:'punta',x:90,y:44}],color:'#b9f5c5'},
 {id:'punos',nombre:'Puños',familia_gesto:'impacto_corto',longitud_relativa:.6,fases:{preparacion:60,impacto:90,recuperacion:150},anclas:[{id:'mango',x:40,y:48},{id:'centro',x:56,y:46},{id:'punta',x:68,y:44},{id:'objeto',x:64,y:44}],color:'#ffd9a8'},
];
const POR_ID=new Map(ESQUELETOS_BASE.map(e=>[e.id,e]));
export const esqueletoBase=(id:string|undefined)=>id?POR_ID.get(id):undefined;
export const duracionGesto=(e:Pick<Esqueleto,'fases'>)=>e.fases.preparacion+e.fases.impacto+e.fases.recuperacion;
const entero=(v:unknown,min:number,max:number)=>Number.isInteger(v)&&(v as number)>=min&&(v as number)<=max;
export function validarEsqueleto(e:Esqueleto|undefined):string|null{
 if(!e||typeof e!=='object')return 'Esqueleto sin definir.';
 if(!/^[a-z_][a-z0-9_]{0,40}$/.test(e.id||''))return 'El esqueleto necesita un identificador.';
 if(typeof e.nombre!=='string'||!e.nombre.trim()||e.nombre.length>60)return 'El esqueleto necesita un nombre.';
 if(!(e.familia_gesto in FAMILIAS))return 'Elige la familia de gesto.';
 if(!Array.isArray(e.anclas)||e.anclas.length<3||e.anclas.length>4)return 'Un esqueleto tiene mango, centro, punta y, opcionalmente, objeto.';
 const ids=e.anclas.map(a=>a?.id);
 if(!['mango','centro','punta'].every(x=>ids.includes(x as IdAncla))||new Set(ids).size!==ids.length||ids.some(x=>!['mango','centro','punta','objeto'].includes(x)))return 'Faltan anclas o hay repetidas (mango, centro, punta).';
 if(e.anclas.some(a=>!entero(a.x,0,96)||!entero(a.y,0,96)))return 'Las anclas van de 0 a 96.';
 if(ids.includes('objeto')&&e.familia_gesto!=='impacto_corto')return 'Solo los gestos de impacto corto (puños) sostienen un objeto.';
 if(!(typeof e.longitud_relativa==='number'&&e.longitud_relativa>=.3&&e.longitud_relativa<=3))return 'La longitud va de 0,3 a 3 casillas.';
 const f=e.fases;if(!f||!entero(f.preparacion,0,1500)||!entero(f.impacto,30,1500)||!entero(f.recuperacion,0,1500))return 'Fases de 0 a 1500 ms (impacto al menos 30 ms).';
 if(duracionGesto(e)>2400)return 'El gesto completo no puede durar más de 2,4 s.';
 if(e.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(e.color))return 'Color inválido.';
 return null;
}
/** Copia un esqueleto para crear uno nuevo (solo el GM los crea). */
export function copiarEsqueleto(base:Esqueleto,id:string,nombre:string):Esqueleto{return {...structuredClone(base),id,nombre,base:base.base||base.id};}
const normalizar=(t:string)=>t.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
/** Respaldo para creaciones antiguas sin esqueleto: el nombre decide, pero hacha y martillo ya no caen en espada. */
export function esqueletoPorNombre(texto:string):string|undefined{
 const t=normalizar(texto);
 if(/desarmado|punos?\b|punetaz|patada|guantelete|nudillos|combate cuerpo a cuerpo/.test(t))return 'punos';
 if(/arco|ballesta|flecha|saeta/.test(t))return 'arco';
 if(/hacha|martillo|maza|mazo|guadana/.test(t))return 'hacha';
 if(/lanza|alabarda|pica\b|tridente|venablo/.test(t))return 'lanza';
 if(/baston|cayado|vara\b|bo\b/.test(t))return 'baston';
 if(/espada|espadon|sable|katana|daga|cimitarra|mandoble|rapier|estoque|hachazo|espadazo/.test(t))return 'espada';
 return undefined;
}
