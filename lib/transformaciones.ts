/**
 * Motor de transformaciones YUGEN.
 * Cada transformación es una activación por partida; sus etapas son transiciones
 * internas y NO consumen usos adicionales.
 */
export type TipoTransformacion = 'forma' | 'poder';
export type EtapaTransformacion = {
  id:string;
  nombre:string;
  stats:Record<string,number>;
  habilidades?:string[];
  /** Retrato opcional de esta etapa (URL o imagen optimizada). */
  imagen_url?:string;
};
export type DefinicionTransformacion = {
  id:string;
  nombre:string;
  tipo:TipoTransformacion;
  etapas:EtapaTransformacion[];
  duracion_turnos?:number;
  coste_ph?:number;
};
export type TransformacionActiva = {
  creado_turno?:number;
  definicion_id:string;
  tipo:TipoTransformacion;
  etapa_id:string;
  /** Retrato temporal, nunca sustituye el original del personaje. */
  imagen_etapa?:string;
  stats_originales:Record<string,number>;
  vida_original:number;
  vida_forma:number;
  turnos_restantes:number|null;
};
export type EstadoTransformable = {
  stats:Record<string,number>;
  vida:number;
  ph:number;
  transformacion?:TransformacionActiva|null;
  transformaciones_usadas?:string[];
};
function maxVidaForma(stats:Record<string,number>):number {
  return Math.max(1,Math.trunc(stats.vida??stats.hp??1));
}
function comprobarEtapa(d:DefinicionTransformacion,id:string) {
  const e=d.etapas.find(e=>e.id===id);
  if(!e)throw Error('La etapa no pertenece a esta transformación.');
  return e;
}
export function activarTransformacion<T extends EstadoTransformable>(actor:T,def:DefinicionTransformacion,etapaId=def.etapas[0]?.id):T {
  if(!etapaId)throw Error('La transformación necesita al menos una etapa.');
  if(actor.transformacion)throw Error('Ya hay una transformación activa.');
  if(actor.transformaciones_usadas?.includes(def.id))throw Error('Esta transformación ya se utilizó en la partida.');
  const etapa=comprobarEtapa(def,etapaId);
  const coste=Math.max(0,def.coste_ph??0);
  if(actor.ph<coste)throw Error('PH insuficiente.');
  const original={...actor.stats};
  const stats={...original,...etapa.stats};
  const forma=def.tipo==='forma';
  const activa:TransformacionActiva={
    definicion_id:def.id,tipo:def.tipo,etapa_id:etapa.id,imagen_etapa:etapa.imagen_url||undefined,
    stats_originales:original,vida_original:actor.vida,
    vida_forma:forma?maxVidaForma(stats):actor.vida,
    turnos_restantes:def.duracion_turnos&&def.duracion_turnos>0?def.duracion_turnos:null
  };
  return {...actor,stats,vida:forma?activa.vida_forma:actor.vida,ph:actor.ph-coste,
    transformacion:activa,transformaciones_usadas:[...(actor.transformaciones_usadas??[]),def.id]};
}
export function cambiarEtapaTransformacion<T extends EstadoTransformable>(actor:T,def:DefinicionTransformacion,etapaId:string):T {
  const activa=actor.transformacion;
  if(!activa||activa.definicion_id!==def.id)throw Error('Esta transformación no está activa.');
  const etapa=comprobarEtapa(def,etapaId);
  const stats={...activa.stats_originales,...etapa.stats};
  // El avance de etapa no regenera HP. En forma, la vida restante se limita
  // al nuevo máximo; en poder, la vida real permanece intacta.
  const vida=activa.tipo==='forma'?Math.min(actor.vida,maxVidaForma(stats)):actor.vida;
  return {...actor,stats,vida,transformacion:{...activa,etapa_id:etapaId,imagen_etapa:etapa.imagen_url||undefined,vida_forma:vida}};
}
export function terminarTransformacion<T extends EstadoTransformable>(actor:T):T {
  const activa=actor.transformacion;
  if(!activa)return actor;
  const vida=activa.tipo==='forma'?activa.vida_original:actor.vida;
  return {...actor,stats:{...activa.stats_originales},vida,transformacion:null};
}
export function danarTransformado<T extends EstadoTransformable>(actor:T,dano:number):{actor:T;muerto:boolean;forma_rota:boolean} {
  const cantidad=Math.max(0,Math.trunc(dano));
  const vida=Math.max(0,actor.vida-cantidad);
  const nuevo={...actor,vida};
  if(vida>0)return {actor:nuevo,muerto:false,forma_rota:false};
  if(actor.transformacion?.tipo==='forma')
    return {actor:terminarTransformacion(nuevo),muerto:false,forma_rota:true};
  return {actor:nuevo,muerto:true,forma_rota:false};
}
export function avanzarTurnoTransformacion<T extends EstadoTransformable>(actor:T):T {
  const activa=actor.transformacion;
  if(!activa||activa.turnos_restantes===null)return actor;
  if(activa.turnos_restantes<=1)return terminarTransformacion(actor);
  return {...actor,transformacion:{...activa,turnos_restantes:activa.turnos_restantes-1}};
}
