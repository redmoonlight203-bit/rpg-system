/**
 * Primitiva «Visión» del Yunque: habilidades oculares configurables.
 *
 * Una visión es un módulo de acción (`Efecto.vision`). Mientras está abierta, su portador
 * ve el tablero a través del ojo: puntos débiles de los enemigos (atacar desde esa dirección
 * da ventaja, daño o crítico), información revelada (vida, atributos, acciones, pasivas, estados,
 * criaturas ocultas), amenazas de movimiento y una defensa por anticipación.
 *
 * Este archivo es puro y sin dependencias de ejecución: lo usa el motor (también en Deno),
 * el Yunque y la interfaz del combate.
 */
export type PatronOjo = 'anillos' | 'aspas' | 'espiral' | 'estrella' | 'rejilla' | 'petalos' | 'rendija' | 'luna';
export type DireccionOcular = 'n' | 'ne' | 'e' | 'se' | 's' | 'so' | 'o' | 'no';
export type ModoVision = 'abrir' | 'con_accion' | 'permanente';
export type RecompensaPunto = {
  /** Tira dos d20 de impacto y se queda con el mayor. */
  ventaja?: boolean;
  /** Suma al d20 de impacto. */
  impacto?: number;
  /** Daño fijo añadido. */
  dano?: number;
  /** Dados de daño extra (p. ej. 1d6). */
  dados?: number;
  caras?: number;
  /** El impacto es crítico automáticamente (daño de dados ×2). */
  critico?: boolean;
  /** Porcentaje de armadura que ignora (0-100). */
  perforar?: number;
};
export type AparienciaOjo = {
  /** Color principal del iris y del velo (#rrggbb). */
  color: string;
  /** Color de las marcas (#rrggbb). */
  secundario?: string;
  patron: PatronOjo;
  /** Número de marcas del iris (0-9). */
  marcas: number;
  /** Intensidad del velo sobre el tablero: 0 nada, 3 muy fuerte. */
  velo: number;
  /** Imagen opcional del ojo (URL pública). */
  imagen_url?: string;
  /** Sin ajuste se conserva el recorte al iris de los ojos anteriores. */
  imagen_ajuste?: 'completa' | 'iris';
};
export type RevelarOcular = {
  vida?: boolean;
  atributos?: boolean;
  acciones?: boolean;
  pasivas?: boolean;
  estados?: boolean;
  /** Ve criaturas ocultas (bajo tierra) dentro del alcance. */
  ocultos?: boolean;
};
export type Vision = {
  /** Nombre del ojo tal como se muestra en combate. */
  nombre: string;
  /** abrir: la acción abre o cierra el ojo; con_accion: se abre al usar la acción; permanente: siempre abierto. */
  modo: ModoVision;
  /** Abrir el ojo no consume la acción del turno (solo en modo abrir). */
  sin_accion?: boolean;
  /** Turnos propios que permanece abierto; 0 = hasta el final del combate. */
  duracion: number;
  /** PH que cuesta mantenerlo al inicio de cada turno propio; si no se pagan, se cierra. */
  mantenimiento_ph?: number;
  /** Casillas que alcanza la mirada; 0 = todo el tablero. */
  alcance: number;
  /** Ve a través de muros. */
  atraviesa_muros?: boolean;
  apariencia: AparienciaOjo;
  revelar?: RevelarOcular;
  puntos_debiles?: {
    /** Cuántas direcciones débiles tiene cada enemigo visto (1-4). */
    cantidad: number;
    /** Cuándo cambian: cada ronda o fijas durante el combate. */
    cambia: 'ronda' | 'combate';
    recompensa: RecompensaPunto;
  };
  /** Armadura extra contra atacantes que el ojo está viendo. */
  anticipar?: { armadura: number };
  /** Muestra las casillas que los enemigos vistos pueden alcanzar cuerpo a cuerpo en su turno. */
  amenazas?: boolean;
  /** Atributos que se suman mientras está abierto (p. ej. iniciativa, salvación). */
  bonos?: Record<string, number>;
};

export const PATRONES_OJO: { valor: PatronOjo; nombre: string }[] = [
  { valor: 'anillos', nombre: 'Anillos' },
  { valor: 'aspas', nombre: 'Aspas' },
  { valor: 'espiral', nombre: 'Espiral' },
  { valor: 'estrella', nombre: 'Estrella' },
  { valor: 'rejilla', nombre: 'Rejilla' },
  { valor: 'petalos', nombre: 'Pétalos' },
  { valor: 'rendija', nombre: 'Rendija' },
  { valor: 'luna', nombre: 'Luna' },
];
export const DIRECCIONES_OCULARES: DireccionOcular[] = ['n', 'ne', 'e', 'se', 's', 'so', 'o', 'no'];
export const NOMBRE_DIRECCION: Record<DireccionOcular, string> = { n: 'norte', ne: 'noreste', e: 'este', se: 'sureste', s: 'sur', so: 'suroeste', o: 'oeste', no: 'noroeste' };
/** Desplazamiento de cada dirección en el tablero (y crece hacia abajo: el norte es y-1). */
export const VECTOR_DIRECCION: Record<DireccionOcular, { x: number; y: number }> = {
  n: { x: 0, y: -1 }, ne: { x: 1, y: -1 }, e: { x: 1, y: 0 }, se: { x: 1, y: 1 },
  s: { x: 0, y: 1 }, so: { x: -1, y: 1 }, o: { x: -1, y: 0 }, no: { x: -1, y: -1 },
};
export const ATRIBUTOS_BONO_OCULAR: [string, string][] = [['bono_impacto', 'Ataque'], ['dano', 'Daño'], ['armadura', 'Armadura'], ['salvacion', 'Salvación'], ['iniciativa', 'Iniciativa'], ['movimiento', 'Movimiento']];

export function nuevaVision(): Vision {
  return {
    nombre: 'Ojo despierto', modo: 'abrir', duracion: 3, mantenimiento_ph: 0, alcance: 6,
    apariencia: { color: '#c0263a', secundario: '#14070a', patron: 'aspas', marcas: 3, velo: 2 },
    revelar: { vida: true, estados: true },
    puntos_debiles: { cantidad: 1, cambia: 'ronda', recompensa: { ventaja: true } },
  };
}

/** Dirección desde la que llega `atacante` respecto a `objetivo` (8 rumbos), o null si comparten casilla. */
export function direccionAtaque(objetivo: { x: number; y: number }, atacante: { x: number; y: number }): DireccionOcular | null {
  const dx = Math.sign(atacante.x - objetivo.x), dy = Math.sign(atacante.y - objetivo.y);
  if (!dx && !dy) return null;
  return DIRECCIONES_OCULARES.find(d => VECTOR_DIRECCION[d].x === dx && VECTOR_DIRECCION[d].y === dy) || null;
}

/** Hash FNV-1a de 32 bits: misma semilla, mismos puntos débiles en el servidor y en la interfaz. */
function hash(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
/** Elige `cantidad` direcciones distintas de forma determinista a partir de una semilla. */
export function puntosDebiles(semilla: string, cantidad: number): DireccionOcular[] {
  const n = Math.max(1, Math.min(4, Math.floor(cantidad) || 1));
  let s = hash(semilla) || 1;
  const libres = [...DIRECCIONES_OCULARES], elegidas: DireccionOcular[] = [];
  for (let i = 0; i < n; i++) {
    s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0; s = (s ^ (s >>> 12)) >>> 0;
    elegidas.push(libres.splice(s % libres.length, 1)[0]);
  }
  return elegidas;
}
/** Suma varias recompensas (varios ojos sobre el mismo punto). */
export function sumarRecompensas(lista: RecompensaPunto[]): RecompensaPunto {
  const r: RecompensaPunto = {};
  for (const x of lista) {
    if (x.ventaja) r.ventaja = true;
    if (x.critico) r.critico = true;
    if (x.impacto) r.impacto = (r.impacto || 0) + x.impacto;
    if (x.dano) r.dano = (r.dano || 0) + x.dano;
    if (x.perforar) r.perforar = Math.min(100, (r.perforar || 0) + x.perforar);
    if (x.dados && x.caras) { r.dados = (r.dados || 0) + x.dados; r.caras = Math.max(r.caras || 0, x.caras); }
  }
  return r;
}
export function describirRecompensa(r: RecompensaPunto): string {
  const partes = [
    r.ventaja ? 'ventaja en el impacto' : '',
    r.impacto ? `${r.impacto > 0 ? '+' : ''}${r.impacto} al impacto` : '',
    r.critico ? 'crítico seguro' : '',
    r.dados && r.caras ? `+${r.dados}d${r.caras} de daño` : '',
    r.dano ? `${r.dano > 0 ? '+' : ''}${r.dano} de daño` : '',
    r.perforar ? `ignora el ${r.perforar} % de la armadura` : '',
  ].filter(Boolean);
  return partes.join(', ') || 'sin recompensa';
}

const COLOR = /^#[0-9a-fA-F]{6}$/;
const entero = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
export function validarVision(v: unknown): string | null {
  if (v === undefined) return null;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return 'Visión inválida.';
  const o = v as Vision;
  if (typeof o.nombre !== 'string' || !o.nombre.trim() || o.nombre.length > 80) return 'Ponle un nombre al ojo (máximo 80 caracteres).';
  if (!['abrir', 'con_accion', 'permanente'].includes(o.modo)) return 'Elige cómo se activa el ojo.';
  if (o.sin_accion !== undefined && typeof o.sin_accion !== 'boolean') return 'Configuración de acción inválida.';
  if (!entero(o.duracion, 0, 99)) return 'La duración del ojo va de 0 (todo el combate) a 99 turnos.';
  if (o.mantenimiento_ph !== undefined && !entero(o.mantenimiento_ph, 0, 100)) return 'El mantenimiento va de 0 a 100 PH por turno.';
  if (!entero(o.alcance, 0, 100)) return 'El alcance de la mirada va de 0 (todo el tablero) a 100 casillas.';
  if (o.atraviesa_muros !== undefined && typeof o.atraviesa_muros !== 'boolean') return 'Configuración de muros inválida.';
  const a = o.apariencia;
  if (!a || typeof a !== 'object') return 'Configura la apariencia del ojo.';
  if (!COLOR.test(a.color) || (a.secundario !== undefined && !COLOR.test(a.secundario))) return 'Los colores del ojo deben ser #rrggbb.';
  if (!PATRONES_OJO.some(p => p.valor === a.patron)) return 'Patrón del ojo desconocido.';
  if (!entero(a.marcas, 0, 9) || !entero(a.velo, 0, 3)) return 'Marcas de 0 a 9 y velo de 0 a 3.';
  if (a.imagen_url !== undefined && (typeof a.imagen_url !== 'string' || a.imagen_url.length > 2048 || (a.imagen_url && !/^(https?:\/\/|\/[^/])/.test(a.imagen_url)))) return 'La imagen del ojo debe ser una URL pública.';
  if (o.revelar !== undefined) {
    if (!o.revelar || typeof o.revelar !== 'object') return 'Revelación inválida.';
    for (const [k, x] of Object.entries(o.revelar)) if (!['vida', 'atributos', 'acciones', 'pasivas', 'estados', 'ocultos'].includes(k) || typeof x !== 'boolean') return 'Revelación inválida.';
  }
  if (o.puntos_debiles !== undefined) {
    const p = o.puntos_debiles;
    if (!p || !entero(p.cantidad, 1, 4) || !['ronda', 'combate'].includes(p.cambia) || !p.recompensa || typeof p.recompensa !== 'object') return 'Puntos débiles: de 1 a 4 direcciones y una recompensa.';
    const r = p.recompensa;
    if ((r.ventaja !== undefined && typeof r.ventaja !== 'boolean') || (r.critico !== undefined && typeof r.critico !== 'boolean')) return 'Recompensa inválida.';
    if ((r.impacto !== undefined && !entero(r.impacto, -50, 50)) || (r.dano !== undefined && !entero(r.dano, -1000, 1000)) || (r.perforar !== undefined && !entero(r.perforar, 0, 100))) return 'Recompensa: impacto ±50, daño ±1000 y perforación 0-100 %.';
    if ((r.dados !== undefined || r.caras !== undefined) && !(entero(r.dados, 1, 20) && entero(r.caras, 2, 100))) return 'Dados extra: de 1 a 20 dados de 2 a 100 caras.';
  }
  if (o.anticipar !== undefined && (!o.anticipar || !entero(o.anticipar.armadura, 1, 50))) return 'Anticipación: de 1 a 50 de armadura.';
  if (o.amenazas !== undefined && typeof o.amenazas !== 'boolean') return 'Configuración de amenazas inválida.';
  if (o.bonos !== undefined) {
    if (!o.bonos || typeof o.bonos !== 'object' || Object.keys(o.bonos).length > 12) return 'Bonos del ojo inválidos.';
    for (const [k, x] of Object.entries(o.bonos)) if (!/^[a-z_][a-z0-9_]{0,63}$/.test(k) || !entero(x, -999, 999)) return 'Bonos del ojo: atributos válidos entre -999 y 999.';
  }
  return null;
}

export function describirVision(v: Vision): { resumen: string; detalles: string[] } {
  const activacion = v.modo === 'permanente' ? 'Siempre abierto' : v.modo === 'con_accion' ? 'Se abre al usar esta acción' : `La acción abre o cierra el ojo${v.sin_accion ? ' sin gastar el turno' : ''}`;
  const tiempo = v.modo === 'permanente' ? '' : v.duracion ? ` durante ${v.duracion} turno${v.duracion === 1 ? '' : 's'}` : ' hasta el final del combate';
  const r = v.revelar || {};
  const revela = [r.vida && 'vida', r.atributos && 'atributos', r.acciones && 'acciones', r.pasivas && 'pasivas', r.estados && 'estados', r.ocultos && 'lo oculto'].filter(Boolean) as string[];
  const detalles = [
    `${activacion}${tiempo}.`,
    v.mantenimiento_ph ? `Mantenerlo cuesta ${v.mantenimiento_ph} PH al inicio de cada turno.` : '',
    `Mirada: ${v.alcance ? `${v.alcance} casillas` : 'todo el tablero'}${v.atraviesa_muros ? ', atraviesa muros' : ''}.`,
    revela.length ? `Revela de los enemigos: ${revela.join(', ')}.` : '',
    v.puntos_debiles ? `Ve ${v.puntos_debiles.cantidad} punto${v.puntos_debiles.cantidad === 1 ? '' : 's'} débil${v.puntos_debiles.cantidad === 1 ? '' : 'es'} por enemigo (${v.puntos_debiles.cambia === 'ronda' ? 'cambian cada ronda' : 'fijos todo el combate'}); atacar desde esa dirección da ${describirRecompensa(v.puntos_debiles.recompensa)}.` : '',
    v.anticipar ? `Anticipa los golpes de quien ve: +${v.anticipar.armadura} de armadura.` : '',
    v.amenazas ? 'Muestra hasta dónde pueden llegar los enemigos en su turno.' : '',
    v.bonos && Object.keys(v.bonos).length ? `Mientras está abierto: ${Object.entries(v.bonos).map(([k, x]) => `${k.replaceAll('_', ' ')} ${x > 0 ? '+' : ''}${x}`).join(', ')}.` : '',
  ].filter(Boolean);
  return { resumen: `${v.nombre}: ${detalles.slice(0, 2).join(' ')}`, detalles };
}
