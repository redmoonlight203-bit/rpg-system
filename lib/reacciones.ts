/**
 * Reacciones generales: vocabulario (disparadores y resultados), plantillas de datos y reglas de uso
 * (coste, usos y enfriamiento). Sin dependencias en tiempo de ejecución: el motor Edge lo incrusta.
 */
import type {Efecto,Reaccion} from "./creacion";

export const DISPARADORES=['antes_ser_atacado','despues_ser_atacado','tras_fallar_ataque','tras_fallar_prueba','aliado_atacado','aliado_ataca','aliado_cae','apuntado_por_area','fin_de_turno'] as const;
export type DisparadorReaccion=typeof DISPARADORES[number];
export const NOMBRE_DISPARADOR:Record<DisparadorReaccion,string>={
  antes_ser_atacado:'Antes de que me ataquen',
  despues_ser_atacado:'Al recibir un golpe',
  tras_fallar_ataque:'Tras fallar un ataque',
  tras_fallar_prueba:'Tras fallar una salvación',
  aliado_atacado:'Cuando atacan a un aliado cercano',
  aliado_ataca:'Cuando un aliado golpea',
  aliado_cae:'Cuando cae un aliado',
  apuntado_por_area:'Al quedar dentro de un área',
  fin_de_turno:'Al terminar el turno de un enemigo cercano',
};
/** Claves que el motor resuelve para cada disparador. `salvacion` y `animacion` acompañan; el resto son resultados. */
export type ClaveResultado='reducir'|'devolver'|'reservar'|'salvacion'|'animacion'|'repetir_tirada'|'contraatacar'|'interponerse'|'esquiva_opuesta'|'seguimiento';
export const RESULTADOS_POR_DISPARADOR:Record<DisparadorReaccion,ClaveResultado[]>={
  antes_ser_atacado:['reducir','contraatacar','salvacion','animacion'],
  despues_ser_atacado:['reducir','devolver','reservar','salvacion','animacion','contraatacar','esquiva_opuesta','seguimiento'],
  tras_fallar_ataque:['repetir_tirada'],
  tras_fallar_prueba:['repetir_tirada'],
  aliado_atacado:['interponerse','reducir','salvacion','animacion'],
  aliado_ataca:['contraatacar','animacion'],
  aliado_cae:['contraatacar','animacion'],
  apuntado_por_area:['reducir','salvacion','animacion'],
  fin_de_turno:['contraatacar','animacion'],
};
export const ACOMPANANTES:ClaveResultado[]=['salvacion','animacion'];
/** Los disparadores que miran a otro combatiente usan un alcance (casillas); por defecto, adyacente. */
export const CON_ALCANCE:DisparadorReaccion[]=['aliado_atacado','aliado_ataca','aliado_cae','fin_de_turno'];
export const disparadorDe=(r:Reaccion):DisparadorReaccion=>r.disparador||'despues_ser_atacado';
/**
 * Plantillas de reacción: datos listos para rellenar el editor. Las cinco primeras reproducen las defensas de Kion;
 * el motor no las conoce por su nombre: una creación antigua con `defensa` se normaliza al cargarla.
 */
export const PLANTILLAS_REACCION:Record<string,Reaccion>={

  inercia:{prioridad:10,principal:{salvacion:{cd:14,atributo:'salvacion'},reducir:{modo:'mitad'},animacion:'axioma-defensa',permite_seguimiento:true}},
  absorcion:{naturaleza:'magica',principal:{reducir:{modo:'fijo',valor:6},reservar:{recurso:'Energía absorbida',proporcion:0.5,maximo:10},animacion:'axioma-conservacion'},seguimiento:{reservar:{recurso:'Energía absorbida',proporcion:0.5,maximo:10}}},
  reflejo:{naturaleza:'fisica',forma:'limitless',principal:{reducir:{modo:'fijo',valor:4},devolver:{},animacion:'axioma-reaccion'},seguimiento:{devolver:{maximo:10}}},
  reciproco:{naturaleza:'fisica',sin_forma:'limitless',seguimiento:{devolver:{maximo:6}}},
  ancla:{naturaleza:'fisica',sin_forma:'limitless',principal:{reducir:{modo:'fijo',valor:4},animacion:'axioma-reaccion'}},
};
/**
 * Convierte la `defensa` de una creación antigua en `reaccion` usando su plantilla. Se aplica al cargar
 * (motor, Yunque): devuelve una copia y nunca reescribe el efecto guardado. Una reacción propia gana.
 */
export function normalizarReaccion<E extends Pick<Efecto,'reaccion'|'defensa'>>(e:E):E{
  if(e.defensa===undefined)return e;
  const {defensa,...resto}=e;
  const plantilla=PLANTILLAS_REACCION[defensa];
  return {...resto,reaccion:e.reaccion??(plantilla?JSON.parse(JSON.stringify(plantilla)) as Reaccion:undefined)} as E;
}
