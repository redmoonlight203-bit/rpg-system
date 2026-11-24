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

const objeto=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const EFECTOS_CON_CLAVE=['estado','quitar_estado','transformar'];
const MAX_PROFUNDIDAD=12;

/** Claves de estado que usan unas reglas, en orden de aparición, con el nombre visible del efecto si lo tiene. */
function clavesDeReglas(reglas:unknown[]):{clave:string;nombre?:string}[]{
 const out:{clave:string;nombre?:string}[]=[];
 const anotar=(clave:unknown,nombre?:unknown)=>{
  if(typeof clave!=='string'||!clave.trim())return;
  out.push({clave,...(typeof nombre==='string'&&nombre.trim()?{nombre:nombre.trim()}:{})});
 };
 function condicion(c:unknown,d:number){
  if(!objeto(c)||d>MAX_PROFUNDIDAD)return;
  if(c.tipo==='estado')anotar(c.estado);
  else if(c.tipo==='estado_terminado')anotar(c.clave);
  else if(c.tipo==='no')condicion(c.condicion,d+1);
  else if((c.tipo==='todas'||c.tipo==='alguna')&&Array.isArray(c.condiciones))for(const x of c.condiciones)condicion(x,d+1);
 }
 function efectos(lista:unknown,d:number){
  if(!Array.isArray(lista)||d>MAX_PROFUNDIDAD)return;
  for(const e of lista){
   if(!objeto(e))continue;
   if(EFECTOS_CON_CLAVE.includes(String(e.tipo)))anotar(e.clave,e.nombre);
   if(e.tipo==='condicional')condicion(e.condicion,d+1);
   efectos(e.exito,d+1);efectos(e.fallo,d+1);
  }
 }
 for(const r of Array.isArray(reglas)?reglas:[]){
  if(!objeto(r))continue;
  condicion(r.condicion,0);efectos(r.efectos,0);
 }
 return out;
}

/** Añade al registro las claves que ya usan las reglas, con su id **exacto** (sin normalizar). No toca las reglas. */
export function registrarClavesExistentes(lista:RegistroEstado[],reglas:unknown[]):RegistroEstado[]{
 const out=[...lista];
 for(const {clave,nombre} of clavesDeReglas(reglas)){
  if(buscarEstado(out,clave))continue;
  out.push({id:clave,nombre:nombre??clave});
 }
 return out;
}
