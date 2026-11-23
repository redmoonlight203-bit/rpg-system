/**
 * Voces de demonio de un artefacto: al tomar el arma, salvación (Voluntad por defecto); si falla, el GM asigna
 * una voz — pregunta (el portador responde en un menú), comentario (solo texto) o negativa (niega una habilidad;
 * el portador puede repetir la prueba una vez por encuentro). Sin dependencias: el motor Edge lo incrusta.
 */
export type VozDemonio={id:string;tipo:'pregunta'|'comentario'|'negativa';texto:string;opciones?:string[];habilidad?:string};
export type ConfigVoces={cd:number;atributo:string;duracion:number;voces:VozDemonio[]};
export type EstadoVoz={estado:'pendiente'}|(VozDemonio&{estado:'activa';restantes:number;respuesta?:string});
export const NOMBRE_VOZ:Record<VozDemonio['tipo'],string>={pregunta:'Pregunta',comentario:'Comentario',negativa:'Negativa'};

const entero=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
const texto=(v:unknown,max=300)=>typeof v==='string'&&!!v.trim()&&v.length<=max;
export function validarVoces(v:unknown):string|null{
  if(!v||typeof v!=='object')return 'Configuración de voces inválida.';
  const x=v as ConfigVoces;
  if(!entero(x.cd,1,40))return 'CD de la salvación de 1 a 40.';
  if(!/^[a-z_][a-z0-9_]{0,63}$/.test(x.atributo||''))return 'Atributo de la salvación inválido.';
  if(!entero(x.duracion,1,20))return 'Duración de la voz de 1 a 20 turnos.';
  if(!Array.isArray(x.voces)||!x.voces.length||x.voces.length>30)return 'Escribe entre 1 y 30 voces.';
  const ids=new Set<string>();
  for(const [i,z] of x.voces.entries()){
    if(!z||!texto(z.id,60)||ids.has(z.id))return `Voz ${i+1}: identificador repetido o vacío.`;ids.add(z.id);
    if(!['pregunta','comentario','negativa'].includes(z.tipo))return `Voz ${i+1}: tipo desconocido.`;
    if(!texto(z.texto))return `Voz ${i+1}: escribe lo que dice.`;
    if(z.tipo==='pregunta'&&(!Array.isArray(z.opciones)||z.opciones.length<2||z.opciones.length>6||z.opciones.some(o=>!texto(o,120))))return `Voz ${i+1}: una pregunta necesita de 2 a 6 opciones.`;
    if(z.tipo==='negativa'&&!texto(z.habilidad,120))return `Voz ${i+1}: indica la habilidad que niega.`;
  }
  return null;
}
export const vocesBase=():ConfigVoces=>({cd:14,atributo:'voluntad',duracion:3,voces:[
  {id:'hambre',tipo:'pregunta',texto:'¿A quién devoramos primero?',opciones:['Al más fuerte','Al más débil']},
  {id:'desprecio',tipo:'comentario',texto:'Tus manos tiemblan. Qué decepción.'},
]});
export function activarVoz(config:ConfigVoces,vozId:string):EstadoVoz{
  const v=config.voces.find(z=>z.id===vozId);
  if(!v)throw Error('Esa voz no existe en el artefacto.');
  return {...JSON.parse(JSON.stringify(v)),estado:'activa',restantes:config.duracion};
}
/** Un turno del portador: la voz pierde uno; devuelve undefined cuando calla. */
export function avanzarVoz(e:EstadoVoz|undefined):EstadoVoz|undefined{
  if(!e||e.estado!=='activa')return e;
  return e.restantes<=1?undefined:{...e,restantes:e.restantes-1};
}
/** ¿Niega la voz esta acción? Compara con el id o el nombre del efecto. */
export function vozNiega(e:EstadoVoz|undefined,accion:{id:string;nombre:string;efecto:{id:string;nombre:string}}):boolean{
  if(!e||e.estado!=='activa'||e.tipo!=='negativa'||!e.habilidad)return false;
  const h=e.habilidad.trim().toLowerCase();
  return [accion.efecto.id,accion.efecto.nombre,accion.nombre,accion.id].some(x=>String(x||'').trim().toLowerCase()===h);
}
