/**
 * Rasgos combinables (plan maestro, Apéndice C). Un rasgo (de clan, de linaje o adquirido) no es una habilidad
 * aislada: aporta recursos y POTENCIADORES que se suman a otras habilidades compatibles por etiquetas.
 * Ejemplo de laboratorio: la Bioelectricidad Kuro gasta Carga Bioeléctrica para añadir un componente eléctrico a una
 * Bola de fuego. Todo es configuración; el motor solo conoce recursos, componentes, etiquetas y potenciadores.
 * Módulo puro (el motor Edge lo incrusta).
 */
import type {ComponenteDano,Efecto,Elemento} from './creacion';
import {validarRecurso,type DefinicionRecurso} from './recursos';
/** Lista cerrada de etiquetas de técnica (el editor no admite texto libre). */
export const ETIQUETAS=['ataque','area','proyectil','cuerpo_a_cuerpo','distancia','fisica','magica','natural','fuego','agua','electricidad','hielo','luz_sagrada','curacion','estado'] as const;
export type Etiqueta=typeof ETIQUETAS[number];
export const NOMBRE_ETIQUETA:Record<Etiqueta,string>={ataque:'Ataque',area:'Área',proyectil:'Proyectil',cuerpo_a_cuerpo:'Cuerpo a cuerpo',distancia:'Distancia',fisica:'Física',magica:'Mágica',natural:'Natural',fuego:'Fuego',agua:'Agua',electricidad:'Rayo',hielo:'Hielo',luz_sagrada:'Luz sagrada',curacion:'Curación',estado:'Estado'};
export type ComponenteAnadido={elemento:Elemento;cantidad:number;caras:number;
 /** Los dados se multiplican por las unidades de recurso gastadas (1 CB = 1d6). */
 por_unidad?:boolean};
export type Potenciador={id:string;nombre:string;acepta:string[];
 coste:{ph?:number;fatiga?:number;recurso?:{id:string;min:number;max:number}};
 componentes_anadidos:ComponenteAnadido[];
 /** Estado del catálogo que aplica también la técnica potenciada al impactar. */
 efectos_extra?:{estado?:string};
 limite_por_uso:1};
export type Rasgo={id:string;nombre:string;origen:'clan'|'linaje'|'adquirido';descripcion?:string;recursos:DefinicionRecurso[];potenciadores:Potenciador[]};
export type EleccionPotenciador={rasgo:string;potenciador:string;unidades?:number};
export const MAX_COMPONENTES=3;
const ELEMENTOS_VALIDOS=['ninguno','fuego','agua','electricidad','hielo','luz_sagrada'];
const NOMBRE_ELEMENTO:Record<string,string>={ninguno:'físico',fuego:'fuego',agua:'agua',electricidad:'electricidad',hielo:'hielo',luz_sagrada:'luz sagrada'};
const ID=/^[a-z_][a-z0-9_]{0,40}$/;
const entero=(v:unknown,min:number,max:number)=>Number.isInteger(v)&&(v as number)>=min&&(v as number)<=max;
function elementoBase(e:Pick<Efecto,'elemento'|'tipo_dano'>):Elemento{
 if(e.elemento)return e.elemento;
 const t=(e.tipo_dano||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
 return t==='fuego'?'fuego':t==='agua'?'agua':['electrico','electricidad'].includes(t)?'electricidad':['hielo','frio'].includes(t)?'hielo':['luz sagrada','luz_sagrada'].includes(t)?'luz_sagrada':'ninguno';
}
/** Etiquetas de una técnica: las declaradas y las derivadas (naturaleza, elemento, área, distancia). */
export function etiquetasDe(e:Efecto):string[]{
 const r=new Set<string>(e.etiquetas||[]);
 if(e.efecto==='dano')r.add('ataque');
 if(e.efecto==='curacion')r.add('curacion');
 if(e.efecto==='estado')r.add('estado');
 const nat=e.naturaleza&&e.naturaleza!=='automatica'?e.naturaleza:(e.coste_ph||0)>0?'magica':(e.coste_fatiga||0)>0?'natural':'fisica';
 r.add(nat);
 for(const c of e.componentes?.length?e.componentes:[{elemento:elementoBase(e)}])if(c.elemento!=='ninguno')r.add(c.elemento);
 const t=e.tablero;
 if(t&&t.forma!=='individual')r.add('area');
 if(t&&t.alcance>1){r.add('distancia');if(e.efecto==='dano')r.add('proyectil');}
 else if(e.efecto==='dano')r.add('cuerpo_a_cuerpo');
 return [...r];
}
export function validarPotenciador(p:Potenciador,recursos:DefinicionRecurso[]=[]):string|null{
 if(!p||!ID.test(p.id||''))return 'El potenciador necesita un identificador.';
 if(typeof p.nombre!=='string'||!p.nombre.trim()||p.nombre.length>80)return 'El potenciador necesita un nombre.';
 if(!Array.isArray(p.acepta)||!p.acepta.length||p.acepta.some(x=>!(ETIQUETAS as readonly string[]).includes(x)))return 'Un potenciador acepta al menos una etiqueta de la lista.';
 if(!Array.isArray(p.componentes_anadidos)||p.componentes_anadidos.length>2)return 'Hasta 2 componentes por potenciador.';
 if(!p.componentes_anadidos.length&&!p.efectos_extra?.estado)return 'Un potenciador añade al menos un componente o un efecto.';
 for(const c of p.componentes_anadidos)if(!ELEMENTOS_VALIDOS.includes(c.elemento)||!entero(c.cantidad,1,20)||!entero(c.caras,2,100))return 'Cada componente necesita elemento y dados válidos.';
 const k=p.coste||{};
 if(k.ph!==undefined&&!entero(k.ph,0,999)||k.fatiga!==undefined&&!entero(k.fatiga,0,999))return 'Coste de PH o Fatiga inválido.';
 if(k.recurso){if(!recursos.some(r=>r.id===k.recurso!.id))return 'El coste usa un recurso que el rasgo no define.';if(!entero(k.recurso.min,0,100)||!entero(k.recurso.max,1,100)||k.recurso.min>k.recurso.max)return 'Unidades de recurso: mínimo ≤ máximo (1 a 100).';}
 if(p.componentes_anadidos.some(c=>c.por_unidad)&&!k.recurso)return 'Los dados por unidad necesitan un coste de recurso.';
 if(p.limite_por_uso!==1)return 'Un potenciador se aplica una vez por ejecución.';
 return null;
}
export function validarRasgo(r:Rasgo|undefined):string|null{
 if(!r||typeof r!=='object')return 'Rasgo sin definir.';
 if(!ID.test(r.id||''))return 'El rasgo necesita un identificador.';
 if(typeof r.nombre!=='string'||!r.nombre.trim()||r.nombre.length>80)return 'El rasgo necesita un nombre.';
 if(!['clan','linaje','adquirido'].includes(r.origen))return 'Origen del rasgo inválido.';
 if(!Array.isArray(r.recursos)||r.recursos.length>4||!Array.isArray(r.potenciadores)||r.potenciadores.length>6)return 'Hasta 4 recursos y 6 potenciadores por rasgo.';
 if(new Set(r.recursos.map(x=>x.id)).size!==r.recursos.length||new Set(r.potenciadores.map(x=>x.id)).size!==r.potenciadores.length)return 'Identificadores repetidos en el rasgo.';
 for(const x of r.recursos){const e=validarRecurso(x);if(e)return `${x.nombre||'Recurso'}: ${e}`;}
 for(const p of r.potenciadores){const e=validarPotenciador(p,r.recursos);if(e)return `${p.nombre||'Potenciador'}: ${e}`;}
 return null;
}
export const compatible=(p:Potenciador,e:Efecto)=>{const et=etiquetasDe(e);return p.acepta.some(x=>et.includes(x));};
/** Potenciadores que una técnica acepta, por rasgo. */
export function potenciadoresPara(rasgos:Rasgo[],e:Efecto):{rasgo:Rasgo;potenciador:Potenciador}[]{
 return rasgos.flatMap(r=>r.potenciadores.filter(p=>compatible(p,e)).map(potenciador=>({rasgo:r,potenciador})));
}
export type CostePotenciado={ph:number;fatiga:number;recursos:{id:string;nombre:string;cantidad:number}[]};
/**
 * Aplica los potenciadores elegidos: el coste se paga UNA vez, un mismo rasgo no aplica dos potenciadores, y dos
 * componentes del mismo elemento y dado suman sus dados (máximo de componentes: MAX_COMPONENTES).
 */
export function potenciar(e:Efecto,rasgos:Rasgo[],elecciones:EleccionPotenciador[]):{efecto:Efecto;coste:CostePotenciado;estados:string[]}{
 if(!Array.isArray(elecciones)||elecciones.length>4)throw Error('Elige hasta 4 potenciadores.');
 const usados=new Set<string>(),coste:CostePotenciado={ph:0,fatiga:0,recursos:[]},estados:string[]=[];
 const comps:ComponenteDano[]=(e.componentes?.length?e.componentes:[{id:'base',elemento:elementoBase(e),cantidad:e.cantidad,caras:e.caras,origen:'base' as const}]).map(c=>({...c}));
 for(const el of elecciones){
  const r=rasgos.find(x=>x.id===el.rasgo),p=r?.potenciadores.find(x=>x.id===el.potenciador);
  if(!r||!p)throw Error('Ese potenciador no está disponible.');
  if(usados.has(r.id))throw Error(`${r.nombre}: un rasgo aplica un solo potenciador por ejecución.`);usados.add(r.id);
  if(!compatible(p,e))throw Error(`${p.nombre} no es compatible con ${e.nombre}.`);
  const k=p.coste.recurso,unidades=k?el.unidades??k.min:1;
  if(k&&(!Number.isInteger(unidades)||unidades<k.min||unidades>k.max))throw Error(`${p.nombre}: gasta de ${k.min} a ${k.max}.`);
  coste.ph+=p.coste.ph||0;coste.fatiga+=p.coste.fatiga||0;
  if(k&&unidades>0){const def=r.recursos.find(x=>x.id===k.id)!;const previo=coste.recursos.find(x=>x.id===k.id);if(previo)previo.cantidad+=unidades;else coste.recursos.push({id:k.id,nombre:def.nombre,cantidad:unidades});}
  for(const c of p.componentes_anadidos){
   const cantidad=c.cantidad*(c.por_unidad?unidades:1);if(!cantidad)continue;
   const mismo=comps.find(x=>x.elemento===c.elemento&&x.caras===c.caras&&x.origen==='potenciador');
   if(mismo)mismo.cantidad+=cantidad;
   else comps.push({id:`${r.id}:${p.id}`,elemento:c.elemento,cantidad,caras:c.caras,origen:'potenciador',nombre:p.nombre});
  }
  if(p.efectos_extra?.estado)estados.push(p.efectos_extra.estado);
 }
 if(comps.length>MAX_COMPONENTES)throw Error(`Una técnica combina como máximo ${MAX_COMPONENTES} componentes.`);
 return {efecto:{...e,componentes:comps},coste,estados};
}
export const sigla=(nombre:string)=>nombre.split(/\s+/).filter(p=>p.length>2).map(p=>p[0].toUpperCase()).join('')||nombre.slice(0,3);
const formula=(c:Pick<ComponenteDano,'cantidad'|'caras'|'elemento'>)=>`${c.cantidad}d${c.caras} ${NOMBRE_ELEMENTO[c.elemento]||c.elemento}`;
/** «Bola de fuego 2d6 fuego + 2d6 electricidad por 2 CB». */
export function describirPotenciado(nombre:string,e:Efecto,coste:CostePotenciado):string{
 const comps=e.componentes||[];
 const pago=[...coste.recursos.map(r=>`${r.cantidad} ${sigla(r.nombre)}`),...(coste.ph?[`${coste.ph} PH`]:[]),...(coste.fatiga?[`${coste.fatiga} Fatiga`]:[])];
 return `${nombre} ${comps.map(formula).join(' + ')}${pago.length?` por ${pago.join(' y ')}`:''}`;
}
/** Ejemplo de laboratorio (propuesta Kuro, no aprobada): se crea en el Yunque, no está en el motor. */
export const EJEMPLO_BIOELECTRICIDAD=(cb:DefinicionRecurso):Rasgo=>({id:'bioelectricidad',nombre:'Bioelectricidad',origen:'linaje',recursos:[cb],
 potenciadores:[{id:'carga_electrica',nombre:'Carga eléctrica',acepta:['ataque'],coste:{recurso:{id:cb.id,min:1,max:3}},componentes_anadidos:[{elemento:'electricidad',cantidad:1,caras:6,por_unidad:true}],limite_por_uso:1}]});
