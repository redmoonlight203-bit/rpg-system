/**
 * Conceptos básicos configurables (plan maestro, Apéndice D · partes A y B). El motor ejecuta el concepto (pelear
 * sin armas, ponerse en guardia) y cada creación decide sus valores y su animación. Un personaje, criatura, raza o
 * linaje SUSTITUYE el concepto por uno propio por `id`; si no sustituye nada, se usa el concepto por defecto, que
 * reproduce exactamente el comportamiento antiguo.
 * Módulo puro (el motor Edge lo incrusta).
 */
import type {DefinicionEstado} from './estados';
import {validarDefinicionEstado} from './estados';
export type ConceptoDesarmado={id:'desarmado';nombre:string;
 /** Casillas de alcance del golpe. */
 alcance:number;
 dano:{cantidad:number;caras:number;modificador:number;tipo_dano:string;naturaleza?:'fisica'|'natural';elemento?:'ninguno'|'fuego'|'agua'|'electricidad'|'hielo'|'luz_sagrada'};
 coste:{ph:number;fatiga:number};
 /** Esqueleto de la animación (puños por defecto; mordisco, garras… usan el suyo). */
 animacion:string;
 /** Si es false, no necesita una mano libre (mordisco, coletazo). */
 requiere_mano?:boolean;
 /** Estado que aplica al impactar (sangrado, veneno…), creado con primitivas. */
 estado_impacto?:DefinicionEstado};
export type ConceptoGuardia={id:'guardia';nombre:string;
 bonos:Record<string,number>;
 duracion:{tipo:'hasta_su_turno'}|{tipo:'turnos';turnos:number};
 coste:{ph:number;fatiga:number};
 condiciones:{requiere_escudo?:boolean;sin_dos_manos?:boolean;
  /** Se endurece: no puede moverse mientras dure. */
  inmovil?:boolean}};
export type ConceptoBasico=ConceptoDesarmado|ConceptoGuardia;
export const DESARMADO_BASE:ConceptoDesarmado={id:'desarmado',nombre:'Ataque desarmado',alcance:1,dano:{cantidad:1,caras:4,modificador:0,tipo_dano:'físico'},coste:{ph:0,fatiga:0},animacion:'punos',requiere_mano:true};
export const GUARDIA_BASE:ConceptoGuardia={id:'guardia',nombre:'Guardia',bonos:{armadura:2},duracion:{tipo:'hasta_su_turno'},coste:{ph:0,fatiga:0},condiciones:{}};
export const CONCEPTOS_BASE={desarmado:DESARMADO_BASE,guardia:GUARDIA_BASE};
const entero=(v:unknown,min:number,max:number)=>Number.isInteger(v)&&(v as number)>=min&&(v as number)<=max;
export function validarConcepto(c:ConceptoBasico|undefined):string|null{
 if(!c||typeof c!=='object'||!['desarmado','guardia'].includes(c.id))return 'Elige qué concepto sustituye (desarmado o guardia).';
 if(typeof c.nombre!=='string'||!c.nombre.trim()||c.nombre.length>60)return 'El concepto necesita un nombre.';
 if(!c.coste||!entero(c.coste.ph,0,999)||!entero(c.coste.fatiga,0,999))return 'Coste de PH o Fatiga inválido.';
 if(c.id==='desarmado'){
  const d=c.dano;
  if(!entero(c.alcance,1,6))return 'El alcance del desarmado va de 1 a 6 casillas.';
  if(!d||!entero(d.cantidad,0,20)||!entero(d.caras,2,100)||!entero(d.modificador,-100,100)||typeof d.tipo_dano!=='string')return 'Dados del desarmado inválidos.';
  if(d.naturaleza&&!['fisica','natural'].includes(d.naturaleza))return 'Un desarmado es físico o natural.';
  if(d.naturaleza==='natural'&&!c.coste.fatiga)return 'Un golpe natural genera Fatiga.';
  if(c.coste.ph>0)return 'Un desarmado no gasta PH (sería una habilidad mágica).';
  if(!/^[a-z_][a-z0-9_]{0,40}$/.test(c.animacion||''))return 'Elige el esqueleto de la animación.';
  if(c.estado_impacto){const e=validarDefinicionEstado(c.estado_impacto);if(e)return `Estado al impactar: ${e}`;}
 }else{
  if(!c.bonos||!Object.keys(c.bonos).length||Object.entries(c.bonos).some(([k,v])=>!/^[a-z_][a-z0-9_]*$/.test(k)||!Number.isInteger(v)||Math.abs(v)>50))return 'La guardia concede al menos un bono (de −50 a 50).';
  if(!c.duracion||(c.duracion.tipo==='turnos'?!entero(c.duracion.turnos,1,10):c.duracion.tipo!=='hasta_su_turno'))return 'Duración de guardia: hasta su turno o de 1 a 10 turnos.';
 }
 return null;
}
const NOMBRE_BONO:Record<string,string>={armadura:'ARM',salvacion:'salvación',bono_impacto:'impacto',bloqueo:'bloqueo',dano:'daño'};
/** Frase para la tarjeta y el menú: «Se endurece: +4 ARM hasta su siguiente turno; no puede moverse». */
export function describirConcepto(c:ConceptoBasico):string{
 if(c.id==='desarmado'){
  const d=c.dano,dados=`${d.cantidad}d${d.caras}${d.modificador?(d.modificador>0?'+':'')+d.modificador:''}`;
  return `${c.nombre}: ${dados} de daño ${d.elemento&&d.elemento!=='ninguno'?d.elemento.replace('_',' '):d.tipo_dano}, alcance ${c.alcance}${c.coste.fatiga?`, ${c.coste.fatiga} Fatiga`:''}${c.requiere_mano===false?', sin necesitar las manos':''}${c.estado_impacto?`; al impactar: ${c.estado_impacto.nombre}`:''}.`;
 }
 const bonos=Object.entries(c.bonos).map(([k,v])=>`${v>0?'+':''}${v} ${NOMBRE_BONO[k]||k.replace(/_/g,' ')}`).join(', ');
 const dura=c.duracion.tipo==='turnos'?`durante ${c.duracion.turnos} ${c.duracion.turnos===1?'turno':'turnos'}`:'hasta su siguiente turno';
 const extra=[c.condiciones.inmovil&&'no puede moverse',c.condiciones.requiere_escudo&&'requiere escudo',c.condiciones.sin_dos_manos&&'sin arma a dos manos',(c.coste.ph||c.coste.fatiga)&&`cuesta ${[c.coste.ph&&c.coste.ph+' PH',c.coste.fatiga&&c.coste.fatiga+' Fatiga'].filter(Boolean).join(' y ')}`].filter(Boolean);
 return `${c.nombre}: ${bonos} ${dura}${extra.length?'; '+extra.join('; '):''}.`;
}
