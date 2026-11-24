// Registro de estados y formas de una creación: cada estado tiene un `id` estable (lo que compara el motor)
// y un `nombre` visible. Renombrar cambia solo el nombre. Módulo puro: sin React ni dependencias.
export type RegistroEstado={id:string;nombre:string;icono?:string;duracion?:number};
type Resultado<T>=({ok:true}&T)|{ok:false;error:string};

const MAX_NOMBRE=120,MAX_ID=64;

/** Minúsculas, sin acentos, espacios a `_` y solo `[a-z0-9_]`. */
export function slugDe(nombre:string):string{
 return nombre.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim()
  .replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'').slice(0,MAX_ID);
}
/** Forma de comparar nombres: dos nombres que dan la misma clave se consideran el mismo. */
const comparable=(nombre:string)=>slugDe(nombre)||nombre.trim().toLowerCase();

export function buscarEstado(lista:RegistroEstado[],id:string):RegistroEstado|undefined{
 return lista.find(e=>e.id===id);
}

function revisarNombre(lista:RegistroEstado[],nombre:string,excepto?:string):string|null{
 const limpio=nombre.trim();
 if(!limpio)return 'Ponle un nombre al estado.';
 if(limpio.length>MAX_NOMBRE)return `El nombre admite como mucho ${MAX_NOMBRE} caracteres.`;
 const c=comparable(limpio);
 if(lista.some(e=>e.id!==excepto&&comparable(e.nombre)===c))return `Ya existe un estado llamado «${limpio}».`;
 return null;
}

export function crearEstado(lista:RegistroEstado[],datos:{nombre:string;icono?:string;duracion?:number}):Resultado<{lista:RegistroEstado[];id:string}>{
 const error=revisarNombre(lista,datos.nombre);
 if(error)return {ok:false,error};
 const nombre=datos.nombre.trim();
 // El id sale del nombre; si ya lo usa otro estado (p. ej. uno renombrado) se numera.
 const base=slugDe(nombre)||'estado';
 let id=base;
 for(let n=2;lista.some(e=>e.id===id);n++)id=`${base.slice(0,MAX_ID-String(n).length-1)}_${n}`;
 const nuevo:RegistroEstado={id,nombre};
 if(datos.icono)nuevo.icono=datos.icono;
 if(datos.duracion!==undefined)nuevo.duracion=datos.duracion;
 return {ok:true,lista:[...lista,nuevo],id};
}

export function renombrarEstado(lista:RegistroEstado[],id:string,nombre:string):Resultado<{lista:RegistroEstado[]}>{
 if(!buscarEstado(lista,id))return {ok:false,error:'Ese estado no está registrado.'};
 const error=revisarNombre(lista,nombre,id);
 if(error)return {ok:false,error};
 return {ok:true,lista:lista.map(e=>e.id===id?{...e,nombre:nombre.trim()}:e)};
}
