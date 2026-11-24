/**
 * Transformaciones como grafo de formas.
 * Una forma es un nodo (estadísticas, poderes, apariencia) y una transición une
 * dos formas en un sentido («uno», para cadenas) o en ambos («ambos», cambio libre).
 * La vuelta a la realidad no es un dato: es una regla fija (ver `formasAlcanzables`).
 * Módulo puro: sin React ni dependencias externas.
 */
export type Forma = {
  id: string;
  nombre: string;
  /** La forma base: el cuerpo original. Exactamente una por transformación. */
  es_realidad?: boolean;
  /** La forma toma el control del personaje (posesión). */
  control?: boolean;
  estadisticas: Record<string, number>;
  poderes: string[];
  apariencia?: {imagen_url?: string};
};
export type SentidoTransicion = 'ambos' | 'uno';
export type Transicion = {
  id: string;
  desde: string;
  hasta: string;
  sentido: SentidoTransicion;
  coste?: {ph?: number; fatiga?: number};
  condicion?: unknown;
};
export type Grafo = {formas: Forma[]; transiciones: Transicion[]};
type Resultado<T> = ({ok: true; grafo: Grafo} & T) | {ok: false; error: string};

export function slugForma(nombre: string): string {
  const base = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);
  return /^[a-z_]/.test(base) ? base : 'forma' + (base ? '_' + base : '');
}
export function idLibre(usados: Iterable<string>, base: string): string {
  const set = new Set(usados);
  if (!set.has(base)) return base;
  let n = 2;
  while (set.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

export function crearForma(grafo: Grafo, datos: {nombre: string; estadisticas?: Record<string, number>; es_realidad?: boolean}): Resultado<{id: string}> {
  const nombre = datos.nombre?.trim();
  if (!nombre) return {ok: false, error: 'La forma necesita un nombre.'};
  const id = idLibre(grafo.formas.map(f => f.id), slugForma(nombre));
  const forma: Forma = {id, nombre, estadisticas: {...(datos.estadisticas || {})}, poderes: [], ...(datos.es_realidad ? {es_realidad: true} : {})};
  return {ok: true, id, grafo: {...grafo, formas: [...grafo.formas, forma]}};
}

export function renombrarForma(grafo: Grafo, id: string, nombre: string): Resultado<object> {
  const limpio = nombre?.trim();
  if (!limpio) return {ok: false, error: 'La forma necesita un nombre.'};
  if (!grafo.formas.some(f => f.id === id)) return {ok: false, error: 'La forma no existe.'};
  return {ok: true, grafo: {...grafo, formas: grafo.formas.map(f => f.id === id ? {...f, nombre: limpio} : f)}};
}

export function conectar(grafo: Grafo, desde: string, hasta: string, sentido: SentidoTransicion): Resultado<{id: string}> {
  if (desde === hasta) return {ok: false, error: 'Una forma no puede conectarse consigo misma.'};
  if (!grafo.formas.some(f => f.id === desde) || !grafo.formas.some(f => f.id === hasta)) return {ok: false, error: 'Las dos formas deben existir.'};
  if (sentido !== 'ambos' && sentido !== 'uno') return {ok: false, error: 'Sentido de transición inválido.'};
  const repetida = grafo.transiciones.some(t => (t.desde === desde && t.hasta === hasta) || (t.sentido === 'ambos' && t.desde === hasta && t.hasta === desde));
  if (repetida) return {ok: false, error: 'Esas formas ya están conectadas.'};
  const id = idLibre(grafo.transiciones.map(t => t.id), `${desde}__${hasta}`);
  return {ok: true, id, grafo: {...grafo, transiciones: [...grafo.transiciones, {id, desde, hasta, sentido}]}};
}

/** Formas a las que se llega desde la realidad siguiendo transiciones. */
function alcanzablesDesdeRealidad(grafo: Grafo, realidad: string): Set<string> {
  const vistos = new Set([realidad]), cola = [realidad];
  while (cola.length) {
    const actual = cola.shift()!;
    for (const siguiente of salidas(grafo, actual)) if (!vistos.has(siguiente)) { vistos.add(siguiente); cola.push(siguiente); }
  }
  return vistos;
}
/** Destinos directos de una forma según las transiciones dibujadas. */
function salidas(grafo: Grafo, desde: string): string[] {
  return grafo.transiciones.flatMap(t => t.desde === desde ? [t.hasta] : t.sentido === 'ambos' && t.hasta === desde ? [t.desde] : []);
}

/** Devuelve un mensaje de error o `null`. La vuelta a la realidad es implícita,
 * así que ninguna forma queda sin salida; lo que sí falla es una forma a la que
 * no se puede llegar (huérfana), o un grafo sin una única realidad. */
export function validarGrafo(grafo: Grafo): string | null {
  if (!grafo || !Array.isArray(grafo.formas) || !Array.isArray(grafo.transiciones)) return 'Transformación sin formas.';
  const ids = new Set(grafo.formas.map(f => f.id));
  if (ids.size !== grafo.formas.length || grafo.formas.some(f => !f.id)) return 'Cada forma necesita un identificador distinto.';
  const realidades = grafo.formas.filter(f => f.es_realidad);
  if (realidades.length !== 1) return realidades.length ? 'Solo puede haber una forma de realidad.' : 'Marca una forma como realidad (la forma base).';
  for (const t of grafo.transiciones) {
    if (!ids.has(t.desde) || !ids.has(t.hasta)) return 'Una transición apunta a una forma que no existe.';
    if (t.desde === t.hasta) return 'Una forma no puede conectarse consigo misma.';
    if (t.sentido !== 'ambos' && t.sentido !== 'uno') return 'Sentido de transición inválido.';
  }
  const alcanzables = alcanzablesDesdeRealidad(grafo, realidades[0].id);
  const huerfana = grafo.formas.find(f => !alcanzables.has(f.id));
  if (huerfana) return `${huerfana.nombre}: no hay ninguna transición que lleve a esta forma.`;
  return null;
}
