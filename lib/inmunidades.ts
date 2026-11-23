/**
 * Sistema universal de inmunidades y resistencias (plan maestro, Apéndice A · paso 4.1).
 * Módulo puro: el motor de combate lo incrusta tal cual en el motor Edge.
 *
 * Una inmunidad es {tipo, valor, modo}:
 *  - tipo `dano`: un tipo de daño o elemento (fuego, veneno, fisico…).
 *  - tipo `estado`: el id de un estado (quemadura, asustado…).
 *  - tipo `categoria`: una categoría de efecto (`mental`) o una subcategoría (`mental:control`).
 * Modos: `bloquear_dano` (solo el daño), `bloquear_aplicacion` (solo que se aplique), `bloquear_todo` (ambos) y
 * `resistir` (el efecto ocurre reducido: mitad de daño o mitad de turnos).
 * Una inmunidad al fuego NO implica inmunidad a Quemadura: son entradas independientes. Solo `bloquear_todo` sobre
 * un daño alcanza también a los estados cuyo origen es ese elemento.
 */
export type TipoInmunidad='dano'|'estado'|'categoria';
export type ModoInmunidad='bloquear_dano'|'bloquear_aplicacion'|'bloquear_todo'|'resistir';
export type DuracionInmunidad='permanente'|'equipada'|'turnos';
export type Inmunidad={tipo:TipoInmunidad;valor:string;modo:ModoInmunidad;
 /** Quién la concede (personaje, raza, pasiva, estado u objeto). Lo rellena el motor al reunirlas. */
 origen?:string;
 /** Solo descriptiva para el editor: la de `turnos` se concede a través de un estado con duración. */
 duracion?:DuracionInmunidad;turnos?:number};
export type CandidatoInmunidad={
 clase:'dano'|'estado';
 /** Daño: elemento, tipo de daño y naturaleza (fuego, físico, mágica…). */
 tipos?:string[];
 /** Estado: su id, su categoría/subcategoría y el elemento de origen. */
 estado?:string;categoria?:string;subcategoria?:string;origen?:string};
export type ResultadoInmunidad={bloqueado:boolean;resistido:boolean;motivo:string};
export const TIPOS_INMUNIDAD:TipoInmunidad[]=['dano','estado','categoria'];
export const MODOS_INMUNIDAD:ModoInmunidad[]=['bloquear_dano','bloquear_aplicacion','bloquear_todo','resistir'];
export const SUBCATEGORIAS_MENTALES=['control','miedo','ilusion','confusion','memoria','posesion'] as const;
export const norm=(t:string)=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase().replace(/\s+/g,'_');
const NOMBRE_ELEMENTO:Record<string,string>={fuego:'al fuego',agua:'al agua',electricidad:'al rayo',hielo:'al hielo',luz_sagrada:'a la luz sagrada',veneno:'al veneno',fisico:'al daño físico',magica:'a la magia',magico:'a la magia'};
const capital=(t:string)=>t?t[0].toUpperCase()+t.slice(1).replace(/_/g,' '):t;
export function validarInmunidades(lista:unknown):string|null{
 if(lista===undefined)return null;
 if(!Array.isArray(lista)||lista.length>40)return 'Configura hasta 40 inmunidades.';
 for(const i of lista as Inmunidad[]){
  if(!i||typeof i!=='object'||!TIPOS_INMUNIDAD.includes(i.tipo)||!MODOS_INMUNIDAD.includes(i.modo))return 'Cada inmunidad necesita tipo y modo válidos.';
  if(typeof i.valor!=='string'||!/^[a-z_][a-z0-9_:]{0,63}$/.test(norm(i.valor)))return 'Cada inmunidad necesita un daño, estado o categoría.';
  if(i.tipo==='estado'&&i.modo==='bloquear_dano')return 'Un estado no causa daño propio: usa «impedir que se aplique».';
  if(i.duracion!==undefined&&!['permanente','equipada','turnos'].includes(i.duracion))return 'Duración de inmunidad inválida.';
  if(i.duracion==='turnos'&&(!Number.isInteger(i.turnos)||i.turnos!<1||i.turnos!>99))return 'Indica de 1 a 99 turnos.';
 }
 return null;
}
/** `ignora`: entradas `dano:fuego`, `estado:quemadura`, `categoria:mental` o `categoria:mental:control`. */
export function ignoraInmunidad(i:Inmunidad,ignora:string[]=[]):boolean{
 const v=norm(i.valor);
 return ignora.map(norm).some(x=>{const [t,...resto]=x.split(':');const valor=resto.join(':');
  if(t!==i.tipo)return false;
  return valor===v||(i.tipo==='categoria'&&(v.startsWith(valor+':')||valor.startsWith(v+':')));});
}
function coincideCategoria(valor:string,c:CandidatoInmunidad){
 if(!c.categoria)return false;
 const cat=norm(c.categoria),sub=c.subcategoria?norm(c.subcategoria):'';
 const [vc,vs]=valor.split(':');
 return vc===cat&&(!vs||vs===sub);
}
/** Comprueba si un objetivo bloquea o resiste el candidato. Sin inmunidades nunca bloquea (regresión). */
export function comprobarInmunidad(objetivo:{inmunidades?:Inmunidad[]}|Inmunidad[]|undefined,c:CandidatoInmunidad,ignora:string[]=[]):ResultadoInmunidad{
 const lista=(Array.isArray(objetivo)?objetivo:objetivo?.inmunidades)||[];
 let resistido:Inmunidad|undefined;
 for(const i of lista){
  if(ignoraInmunidad(i,ignora))continue;
  const v=norm(i.valor);
  let aplica=false;
  if(c.clase==='dano'){
   const tipos=(c.tipos||[]).map(norm);
   if(i.tipo==='dano')aplica=tipos.includes(v)&&['bloquear_dano','bloquear_todo','resistir'].includes(i.modo);
   else if(i.tipo==='categoria')aplica=coincideCategoria(v,c)&&['bloquear_dano','bloquear_todo','resistir'].includes(i.modo);
  }else{
   if(i.tipo==='estado')aplica=!!c.estado&&norm(c.estado)===v&&i.modo!=='bloquear_dano';
   else if(i.tipo==='categoria')aplica=coincideCategoria(v,c)&&i.modo!=='bloquear_dano';
   else if(i.tipo==='dano')aplica=!!c.origen&&norm(c.origen)===v&&(i.modo==='bloquear_todo'||i.modo==='resistir');
  }
  if(!aplica)continue;
  if(i.modo==='resistir'){resistido??=i;continue;}
  return {bloqueado:true,resistido:false,motivo:`inmune ${describirValor(i)}${i.origen?` (${i.origen})`:''}`};
 }
 return resistido?{bloqueado:false,resistido:true,motivo:`resiste ${describirValor(resistido)}${resistido.origen?` (${resistido.origen})`:''}`}:{bloqueado:false,resistido:false,motivo:''};
}
function describirValor(i:Inmunidad){
 const v=norm(i.valor);
 if(i.tipo==='dano')return NOMBRE_ELEMENTO[v]||`al daño de ${v.replace(/_/g,' ')}`;
 if(i.tipo==='estado')return `a ${capital(v)}`;
 const [c,s]=v.split(':');const SUB:Record<string,string>={ilusion:'ilusión',confusion:'confusión',posesion:'posesión'};return s?`a efectos ${c==='mental'?'mentales':c} de ${SUB[s]||s.replace(/_/g,' ')}`:`a efectos ${c==='mental'?'mentales':c}`;
}
/** Frase para la vista previa del Yunque: «Inmune al fuego; no a Quemadura». */
export function describirInmunidades(lista:Inmunidad[]):string{
 if(!lista.length)return 'Sin inmunidades.';
 const partes=lista.map(i=>{
  const base=`${i.modo==='resistir'?'Resiste':'Inmune'} ${describirValor(i)}`;
  const modo=i.modo==='bloquear_aplicacion'&&i.tipo!=='estado'?' (no se le aplican sus estados)':i.modo==='bloquear_todo'&&i.tipo==='dano'?' (daño y estados de ese origen)':'';
  const dura=i.duracion==='equipada'?' mientras esté equipada':i.duracion==='turnos'?` durante ${i.turnos} turnos`:'';
  return base+modo+dura;
 });
 // Aclara el caso clásico: inmune al daño de un elemento pero no a su estado.
 const fuego=lista.find(i=>i.tipo==='dano'&&norm(i.valor)==='fuego'&&i.modo==='bloquear_dano');
 if(fuego&&!lista.some(i=>i.tipo==='estado'&&norm(i.valor)==='quemadura'))partes.push('no a Quemadura');
 return capital(partes.join('; '))+'.';
}
