// Creaciones personales y generales. Una creación (habilidad, pasiva, objeto, título…) es «general» o
// «personal de» un personaje de la Forja (`personal_de` = id de ese personaje). Solo el GM la marca.
// Las personales no se mezclan con las generales: se agrupan bajo su personaje. Otro personaje puede
// aprenderlas cumpliendo sus requisitos, pero aparecen aparte («Personales de otros personajes»).

export type ConPropietario={id:string;nombre:string;personal_de?:string|null};
export type Ambito='propia'|'general'|'ajena';

/** Ámbito de una creación vista desde un personaje (o desde ninguno: entonces nunca es «propia»). */
export function ambitoDe(c:ConPropietario,personajeId?:string|null):Ambito{
 if(!c.personal_de)return 'general';
 return personajeId&&c.personal_de===personajeId?'propia':'ajena';
}

/** Nombre del dueño de una creación personal, o null si es general (o su dueño ya no existe). */
export function duenoDe(c:ConPropietario,todas:readonly ConPropietario[]):string|null{
 if(!c.personal_de)return null;
 return todas.find(x=>x.id===c.personal_de)?.nombre??null;
}

export type GrupoAmbito<T>={clave:string;titulo:string;ambito:Ambito;items:T[]};
/**
 * Agrupa para elegir habilidades al crear o editar un personaje: primero las suyas, luego las generales
 * y al final las personales de otros personajes, cada grupo por orden alfabético.
 */
export function agruparPorAmbito<T extends ConPropietario>(items:readonly T[],personaje:{id?:string|null;nombre?:string},todas:readonly ConPropietario[]=items):GrupoAmbito<T>[]{
 const orden=(a:T,b:T)=>a.nombre.localeCompare(b.nombre,'es');
 const propias=items.filter(c=>ambitoDe(c,personaje.id)==='propia').sort(orden);
 const generales=items.filter(c=>ambitoDe(c,personaje.id)==='general').sort(orden);
 const ajenas=new Map<string,T[]>();
 for(const c of items)if(ambitoDe(c,personaje.id)==='ajena'){const k=c.personal_de!;ajenas.set(k,[...(ajenas.get(k)||[]),c]);}
 const grupos:GrupoAmbito<T>[]=[];
 if(propias.length)grupos.push({clave:'propia',titulo:`Personales de ${personaje.nombre?.trim()||'este personaje'}`,ambito:'propia',items:propias});
 if(generales.length)grupos.push({clave:'general',titulo:'Generales',ambito:'general',items:generales});
 for(const [dueno,lista] of [...ajenas].sort(([a],[b])=>(todas.find(x=>x.id===a)?.nombre||'').localeCompare(todas.find(x=>x.id===b)?.nombre||'','es')))
  grupos.push({clave:'ajena:'+dueno,titulo:`Personales de ${todas.find(x=>x.id===dueno)?.nombre||'otro personaje'}`,ambito:'ajena',items:lista.sort(orden)});
 return grupos;
}

/** Filtro de la galería de la Forja: 'generales', 'personales' (todas) o el id de un personaje concreto. */
export type FiltroAmbito='todas'|'generales'|'personales'|string;
export function filtrarAmbito<T extends ConPropietario>(items:readonly T[],filtro:FiltroAmbito):T[]{
 if(filtro==='todas')return [...items];
 if(filtro==='generales')return items.filter(c=>!c.personal_de);
 if(filtro==='personales')return items.filter(c=>!!c.personal_de);
 return items.filter(c=>c.personal_de===filtro);
}

/** Personajes que tienen creaciones personales, con cuántas, ordenados por nombre (para el filtro de la galería). */
export function duenosConPersonales(items:readonly ConPropietario[],todas:readonly ConPropietario[]=items):{id:string;nombre:string;cantidad:number}[]{
 const cuenta=new Map<string,number>();
 for(const c of items)if(c.personal_de)cuenta.set(c.personal_de,(cuenta.get(c.personal_de)||0)+1);
 return [...cuenta].map(([id,cantidad])=>({id,nombre:todas.find(x=>x.id===id)?.nombre||'Personaje desconocido',cantidad})).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
}

/** Validación del borrador: un personaje no puede ser personal de nadie ni una creación de sí misma. */
export function errorPersonal(b:{id?:string;tipo:string;personal_de?:string|null},personajes:readonly {id:string;tipo_creacion?:string}[]):string|null{
 if(!b.personal_de)return null;
 if(b.tipo==='personaje')return 'Un personaje no puede ser personal de otro: solo sus habilidades, pasivas, objetos y títulos.';
 if(b.id&&b.personal_de===b.id)return 'Una creación no puede ser personal de sí misma.';
 if(!personajes.some(p=>p.id===b.personal_de&&p.tipo_creacion==='personaje'))return 'El personaje dueño de esta creación ya no existe. Elige otro o márcala como general.';
 return null;
}
