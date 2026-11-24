/**
 * Conversión entre la definición guardada (`etapas`) y el grafo de formas.
 * Las etapas son las formas; la realidad es el cuerpo original (no se guarda).
 * Sin `transiciones` guardadas, una definición es la cadena lineal de siempre.
 */
import {ID_REALIDAD, idLibre, type Forma, type Grafo, type Transicion} from './transformaciones-grafo';
import type {DefinicionTransformacion, EtapaTransformacion} from './transformaciones';

export type GrafoTransformacion = Grafo & {posesion?: DefinicionTransformacion['posesion']};
export type TransicionGuardada = Omit<Transicion, 'id'> & {id?: string};

/** Copia profunda de datos guardados (JSON): no depende de `structuredClone`. */
const copiar = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const realidad = (): Forma => ({id: ID_REALIDAD, nombre: 'Forma base', es_realidad: true, estadisticas: {}, poderes: []});

/** La cadena lineal implícita de una definición sin transiciones. */
export function cadenaLineal(ids: string[]): Transicion[] {
  return ids.map((id, i) => {
    const desde = i ? ids[i - 1] : ID_REALIDAD;
    return {id: `${desde}__${id}`, desde, hasta: id, sentido: 'uno' as const};
  });
}

function formaDeEtapa(etapa: EtapaTransformacion, id: string): Forma {
  const {id: _id, nombre, stats, habilidades, imagen_url, descontrolada, ...extra} = etapa;
  return {
    id, nombre: nombre || id, estadisticas: {...(stats || {})}, poderes: [...(habilidades || [])],
    ...(imagen_url ? {apariencia: {imagen_url}} : {}),
    ...(descontrolada ? {control: true} : {}),
    ...(Object.keys(extra).length ? {extra: copiar(extra)} : {}),
  };
}

/** Convierte una transformación guardada en grafo. Nunca falla: sin etapas
 * devuelve solo la realidad; ids repetidos reciben sufijo sin perder datos. */
export function migrarTransformacion(antigua: DefinicionTransformacion): GrafoTransformacion {
  const formas: Forma[] = [realidad()];
  const renombres = new Map<string, string>();
  for (const etapa of antigua?.etapas || []) {
    const id = idLibre(formas.map(f => f.id), etapa.id || 'forma');
    if (!renombres.has(etapa.id)) renombres.set(etapa.id, id);
    formas.push(formaDeEtapa(etapa, id));
  }
  const ids = formas.slice(1).map(f => f.id);
  const guardadas = antigua?.transiciones;
  const transiciones = guardadas?.length
    ? guardadas.map((t, i) => ({...t, id: t.id || `t${i + 1}`}))
    : cadenaLineal(ids);
  const posesion = antigua?.posesion ? {...antigua.posesion, etapa_id: renombres.get(antigua.posesion.etapa_id) ?? antigua.posesion.etapa_id} : undefined;
  return {formas, transiciones, ...(posesion ? {posesion} : {})};
}

function etapaDeForma(f: Forma): EtapaTransformacion {
  return {
    ...(copiar(f.extra || {}) as Partial<EtapaTransformacion>),
    id: f.id, nombre: f.nombre, stats: {...f.estadisticas},
    ...(f.poderes.length ? {habilidades: [...f.poderes]} : {}),
    ...(f.apariencia?.imagen_url ? {imagen_url: f.apariencia.imagen_url} : {}),
    ...(f.control ? {descontrolada: true} : {}),
  };
}

const mismaCadena = (a: Transicion[], b: Transicion[]) =>
  a.length === b.length && a.every((t, i) => t.desde === b[i].desde && t.hasta === b[i].hasta && t.sentido === b[i].sentido && !t.coste && t.condicion === undefined);

/** Vuelve a la definición guardada. Si el grafo es la cadena lineal de sus
 * formas, no se guardan transiciones: los datos antiguos quedan idénticos. */
export function grafoADefinicion(grafo: GrafoTransformacion, base: Omit<DefinicionTransformacion, 'etapas'>): DefinicionTransformacion {
  const formas = grafo.formas.filter(f => !f.es_realidad);
  const etapas = formas.map(etapaDeForma);
  const {transiciones: _t, posesion: _p, ...resto} = base as DefinicionTransformacion;
  const lineal = mismaCadena(grafo.transiciones, cadenaLineal(formas.map(f => f.id)));
  const posesion = grafo.posesion ?? base.posesion;
  return {
    ...resto, etapas,
    ...(lineal ? {} : {transiciones: grafo.transiciones.map(t => ({...t}))}),
    ...(posesion ? {posesion: {...posesion}} : {}),
  };
}
