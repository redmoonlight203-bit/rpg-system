import {SLOTS,type Efecto} from './creacion';
import {faltantesRequisitos,type Fuente,type Config} from './combate';
import type {Rango} from './forja';
export type EquipoMonstruo={modo:'catalogo'|'generado';opciones:string[];nombre?:string;dos_manos?:boolean;rangos?:Record<string,Rango>;dados?:number;caras?:number};
export type VarianteMonstruo={id:string;nombre:string;peso:number;bonos:Record<string,number>;habilidades:string[];pasivas:string[];equipamiento:Record<string,EquipoMonstruo>};
export type ConfiguracionMonstruo={variantes:VarianteMonstruo[]};
export type FuenteMonstruo=Fuente & {id:string;tipo_creacion:string;estado?:string;es_grupo?:boolean;stats_rango?:Record<string,Rango>;configuracion_dados?:Efecto[]};
export function validarMonstruo(config:ConfiguracionMonstruo|null|undefined,catalogo:FuenteMonstruo[]):string|null{
 if(config==null)return null;
 if(!Array.isArray(config.variantes)||config.variantes.length>30)return 'Define un máximo de 30 variantes.';
 const ids=new Set<string>();
 for(const v of config.variantes){
  if(!v.id||ids.has(v.id)||!v.nombre.trim()||v.nombre.length>100)return 'Cada variante necesita nombre e identificador únicos.';ids.add(v.id);
  if(!Number.isFinite(v.peso)||v.peso<=0||v.peso>1000)return 'El peso de aparición debe estar entre 1 y 1000.';
  if(Object.entries(v.bonos).some(([k,n])=>['nivel','exp_total','experiencia'].includes(k)||!Number.isFinite(n)||Math.abs(n)>1000000))return 'Ajustes de estadísticas inválidos.';
  for(const [tipo,lista] of [['habilidad',v.habilidades],['pasiva',v.pasivas]] as const){if(lista.length>20||new Set(lista).size!==lista.length||lista.some(id=>!catalogo.some(c=>c.id===id&&c.tipo_creacion===tipo)))return 'Hay poderes repetidos o no disponibles en una variante.';}
  for(const [slot,e] of Object.entries(v.equipamiento)){
   const s=SLOTS.find(s=>s.clave===slot);if(!s)return 'Espacio de equipo desconocido.';
   if(e.modo==='catalogo'){
    if(!e.opciones.length||e.opciones.some(id=>!catalogo.some(c=>c.id===id&&c.tipo_creacion==='objeto'&&s.tipos.includes(c.slot_tipo||''))))return 'Selecciona objetos compatibles de La Creación en cada espacio configurado.';
   }else if(e.modo==='generado'){
    if(!e.nombre?.trim()||!Object.keys(e.rangos||{}).length)return 'El equipo generado necesita nombre y rangos.';
    for(const r of Object.values(e.rangos||{}))if(!Number.isFinite(r.min)||!Number.isFinite(r.max)||r.min<0||r.min>r.max||r.max>1000000)return 'Rango de equipo generado inválido.';
    if(slot.startsWith('mano')&&(!Number.isInteger(e.dados)||!Number.isInteger(e.caras)||(e.dados||0)<1||(e.dados||0)>100||(e.caras||0)<2||(e.caras||0)>1000))return 'El arma generada necesita dados válidos.';
   }else return 'Modo de equipo desconocido.';
  }
 }
 return null;
}
function sortear(r:Record<string,Rango>,rng:()=>number){return Object.fromEntries(Object.entries(r).map(([k,v])=>{const t=Math.min(.999999999,Math.max(0,rng()));return [k,Number.isInteger(v.min)&&Number.isInteger(v.max)?Math.floor(v.min+t*(v.max-v.min+1)):Math.min(v.max,Math.max(v.min,Math.round((v.min+(v.max-v.min)*t)*100)/100))];}));}
export function elegirVariante(config:ConfiguracionMonstruo,id:string,rng:()=>number=Math.random):VarianteMonstruo{
 if(id&&id!=='aleatorio'){const v=config.variantes.find(v=>v.id===id);if(!v)throw Error('La variante seleccionada ya no existe.');return v;}
 const total=config.variantes.reduce((n,v)=>n+v.peso,0);let tirada=rng()*total;
 for(const v of config.variantes){tirada-=v.peso;if(tirada<0)return v;}
 if(!config.variantes.length)throw Error('Esta especie no tiene variantes.');return config.variantes[config.variantes.length-1];
}
/** Copias efímeras: jamás modifica el catálogo ni guarda nuevas creaciones. */
export function prepararVariante<T extends {nombre:string;stats:Record<string,number>;configuracion:Config}>(f:T,variante:VarianteMonstruo,catalogo:FuenteMonstruo[],rng:()=>number=Math.random):T{
 const error=validarMonstruo({variantes:[variante]},catalogo);if(error)throw Error(error);
 const base={...(f.configuracion.stats_base||f.stats)};
 for(const [k,v] of Object.entries(variante.bonos))base[k]=Math.max(0,(base[k]||0)+v);
 const razas=[f.configuracion.raza||'',...(f.configuracion.linaje_raza||[])];
 const fuente=(id:string):Fuente=>{const c=catalogo.find(c=>c.id===id);if(!c)throw Error('Creación no disponible.');return {...c,stats:c.es_grupo?sortear(c.stats_rango||{},rng):{...c.stats},efectos:c.configuracion_dados||c.efectos||[]};};
 const equipo:Record<string,Fuente>={};
 for(const [slot,e] of Object.entries(variante.equipamiento)){
  if(slot==='mano_izq'&&equipo.mano_der?.slot_tipo==='dos_manos')continue;
  if(e.modo==='catalogo'){
   const elegibles=e.opciones.filter(id=>{const c=catalogo.find(c=>c.id===id)!;return !faltantesRequisitos(c.requisitos_uso,razas,base).length;});
   if(!elegibles.length)throw Error(`${variante.nombre}: no cumple los requisitos del equipo de ${slot}.`);
   equipo[slot]=fuente(elegibles[Math.min(elegibles.length-1,Math.floor(rng()*elegibles.length))]);
  }else{
   const stats=sortear(e.rangos||{},rng);const mano=slot.startsWith('mano');
   equipo[slot]={id:crypto.randomUUID(),nombre:e.nombre!,tipo_creacion:'objeto',slot_tipo:mano?(e.dos_manos?'dos_manos':'mano'):SLOTS.find(s=>s.clave===slot)!.tipos[0],stats,descripcion:'Equipo generado para esta aparición.',efectos:mano?[{id:'ataque',nombre:`Ataca con ${e.nombre}`,efecto:'dano',cantidad:e.dados!,caras:e.caras!,modificador:stats.dano||0,tipo_dano:'físico',estado:'',duracion:0,coste_ph:0}]:[]};
  }
  if(slot==='mano_izq'&&equipo[slot].slot_tipo==='dos_manos')delete equipo.mano_der;
 }
 const bonos:Record<string,number>={};for(const p of Object.values(equipo))for(const [k,v] of Object.entries(p.stats))if(!['peso','durabilidad','dados_dano','caras_dano','dano','nivel'].includes(k))bonos[k]=(bonos[k]||0)+v;
 const stats={...base};for(const [k,v] of Object.entries(bonos))stats[k]=(stats[k]||0)+v;
 const habilidades=[...new Map([...(f.configuracion.habilidades||[]),...variante.habilidades.map(fuente)].map(h=>[h.id,h])).values()];
 const pasivas=[...(f.configuracion.pasivas||[]),...variante.pasivas.filter(id=>!f.configuracion.pasivas?.some(p=>p.id===id)).map(id=>{const c=fuente(id);return {id,nombre:c.nombre,requisitos_uso:c.requisitos_uso,reglas:c.reglas_pasivas||[],reglas_motor:c.reglas||[]};})];
 return {...f,nombre:`${f.nombre} · ${variante.nombre}`,stats,configuracion:{...f.configuracion,stats_base:base,equipamiento:equipo,bonos_equipamiento:bonos,habilidades,pasivas,reserva:Object.values(equipo)}};
}
