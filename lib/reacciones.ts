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
