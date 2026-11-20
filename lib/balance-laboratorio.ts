import {
  acciones, actuar, casillasAlcanzables, desplazar, distanciaCasillas, iniciar, posicionesTablero, siguiente,
  type Accion, type Combate, type RNG,
} from './combate';
import { CLASES_YUGEN } from './clases';
import { vacio, type Borrador } from './yunque-borrador';
import { prepararArena, DOLL_BASE, type AjustesDoll, type ContextoArena } from './yunque-arena';

export const VERSION_BALANCE = 'laboratorio-0.2.1';
export const SEMILLA_BALANCE = 20261120;
export const RONDAS_BALANCE = 5;
export const ESCENARIOS_BALANCE = [
  { id: 'defensa-baja', armadura: 5, salvacion: 0, rivales: 1, distancia: 1, magia: false },
  { id: 'defensa-media', armadura: 9, salvacion: 2, rivales: 1, distancia: 1, magia: false },
  { id: 'defensa-alta', armadura: 14, salvacion: 5, rivales: 1, distancia: 1, magia: false },
  { id: 'amenaza-magica', armadura: 9, salvacion: 2, rivales: 1, distancia: 1, magia: true },
  { id: 'varios-rivales', armadura: 9, salvacion: 2, rivales: 3, distancia: 1, magia: false },
  { id: 'objetivo-mojado', armadura: 9, salvacion: 2, rivales: 1, distancia: 1, magia: false, mojado: true },
  { id: 'distancia', armadura: 9, salvacion: 2, rivales: 1, distancia: 6, magia: false },
] as const;

type Escenario = typeof ESCENARIOS_BALANCE[number];
type Metricas = {
  dano: number;
  pico: number;
  curacion: number;
  danoRecibido: number;
  acciones: number;
  phGastado: number;
  fatigaGanada: number;
  hpPropioPerdido: number;
  accionesEnemigasNegadas: number;
  accionesRivales: number;
  caidas: number;
};

function azar(semilla: number): RNG {
  let estado = semilla >>> 0;
  return caras => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let n = Math.imul(estado ^ (estado >>> 15), estado | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return Math.floor(((n ^ (n >>> 14)) >>> 0) / 4294967296 * caras) + 1;
  };
}

const umbrales = [0, 0.5, 1, 2, 4, 8, 16, 32];
export function claseLaboratorio(ipe: number) {
  if (!Number.isFinite(ipe) || ipe < 0) return null;
  return CLASES_YUGEN[umbrales.filter(umbral => ipe >= umbral).length - 1];
}

function agregarMetricas(): Metricas {
  return {
    dano: 0, pico: 0, curacion: 0, danoRecibido: 0, acciones: 0, phGastado: 0,
    fatigaGanada: 0, hpPropioPerdido: 0, accionesEnemigasNegadas: 0, accionesRivales: 0, caidas: 0,
  };
}

const DOLL = 'doll';

function acercar(c: Combate, actor: string, objetivo: string) {
  const posiciones = posicionesTablero(c);
  let menor = distanciaCasillas(posiciones[actor], posiciones[objetivo]);
  let destino: { x: number; y: number } | undefined;
  for (const clave of Object.keys(casillasAlcanzables(c, actor))) {
    const [x, y] = clave.split(',').map(Number);
    const d = distanciaCasillas({ x, y }, posiciones[objetivo]);
    if (d >= menor) continue;
    menor = d;
    destino = { x, y };
  }
  return destino ? desplazar(c, actor, destino) : c;
}

function medirPaso(antes: Combate, despues: Combate, m: Metricas, propia = false, rival = false): Combate {
  let dano = 0;
  for (const previo of antes.miembros) {
    const actual = despues.miembros.find(p => p.id === previo.id);
    if (!actual) continue;
    const perdida = Math.max(0, previo.vida - actual.vida);
    if (previo.bando === 'enemigo') {
      dano += perdida;
      continue;
    }
    if (previo.id !== DOLL) continue;
    m.curacion += Math.max(0, actual.vida - previo.vida);
    if (rival) m.danoRecibido += perdida;
    if (propia) {
      m.hpPropioPerdido += perdida;
      m.phGastado += Math.max(0, previo.ph - actual.ph);
      m.fatigaGanada += Math.max(0, actual.fatiga - previo.fatiga);
    }
  }
  m.dano += dano;
  if (propia && m.acciones === 0) m.pico = dano;
  return { ...despues, registro: [], historial: [], evento_visual: undefined };
}

function esPropia(a: Accion) {
  return a.id !== 'ataque' && a.id !== 'desarmado' && a.id !== 'volver_forma';
}

function simular(
  borrador: Borrador, ctx: ContextoArena, doll: Partial<AjustesDoll>, escenario: Escenario,
  semilla: number, incidencias: Set<string>, prioridad?: string,
) {
  // Streams separados por bando y ronda para conservar la comparación al cambiar PH o dados.
  const rng = azar(semilla);
  const centros = [{ x: 2 + escenario.distancia, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 4 }];
  const preparado = prepararArena(
    borrador, ctx, doll, { armadura: escenario.armadura, salvacion: escenario.salvacion },
    { sacos: centros.slice(0, escenario.rivales) }, rng,
  );
  if ('error' in preparado) throw Error(preparado.error);

  const m = agregarMetricas();
  const inicial = preparado.combate;
  inicial.regla = 'impacto';
  if ('mojado' in escenario) {
    for (const rival of inicial.miembros.filter(p => p.bando === 'enemigo')) {
      rival.estados.push({ id: 'mojado', tipo: 'mojado', nombre: 'Mojado', restantes: 0, creado: 0, bonos: {} });
    }
  }
  let c = medirPaso(inicial, iniciar(inicial, rng), m);
  for (let turno = 0; c.fase === 'en_curso' && c.ronda <= RONDAS_BALANCE && turno < RONDAS_BALANCE * 8; turno++) {
    const actor = c.miembros.find(p => p.id === c.actual);
    const objetivo = c.miembros.find(p => p.vida > 0 && p.bando !== actor?.bando);
    if (!actor || !objetivo) break;
    const propia = actor.id === DOLL;
    const turnoRng = azar(semilla + c.ronda * 7919 + inicial.miembros.findIndex(p => p.id === actor.id) * 104729);
    if (actor.accion_usada && !propia) m.accionesEnemigasNegadas++;
    if (!actor.accion_usada) {
      const vigente = actor;
      const lista = acciones(vigente).filter(a => !a.bloqueada && !(vigente.cooldowns[a.id] > 0));
      const preferidas = prioridad ? lista.filter(a => a.id === prioridad) : lista.filter(esPropia).slice(0, 12);
      let basico = lista.find(a => a.id === 'ataque');
      if (!propia && basico && escenario.magia) {
        const efecto = { ...basico.efecto, id: 'proyectil-prueba', naturaleza: 'magica' as const, caras: 6,
          tablero: { alcance: 6, forma: 'individual' as const, tamano: 0, afecta: 'enemigos' as const } };
        vigente.configuracion.habilidades = [{ id: 'rival', nombre: 'Proyectil de prueba', stats: {}, efectos: [efecto] }];
        basico = { ...basico, id: 'hab:rival:proyectil-prueba', efecto };
      }
      const candidatas = propia ? [...preferidas, ...(basico && !preferidas.includes(basico) ? [basico] : [])] : basico ? [basico] : [];
      for (const accion of candidatas) {
        const e = accion.efecto;
        const apoyo = ['curacion', 'recuperar_ph', 'reducir_fatiga', 'crear_arma', 'transformacion'].includes(e.efecto);
        const destino = apoyo || e.tablero?.afecta === 'yo' || e.tablero?.afecta === 'aliados' ? actor.id : objetivo.id;
        const posiciones = posicionesTablero(c);
        if (distanciaCasillas(posiciones[actor.id], posiciones[destino]) >
            (e.tablero?.alcance ?? 1) && !e.tablero?.movimiento_lanzador) {
          c = medirPaso(c, acercar(c, actor.id, destino), m);
        }
        try {
          c = medirPaso(c, actuar(c, actor.id, accion.id, destino, turnoRng), m, propia, !propia);
          if (propia) m.acciones++;
          else m.accionesRivales++;
          break;
        } catch (error) {
          incidencias.add(error instanceof Error ? error.message : String(error));
        }
      }
    }
    if (c.fase !== 'en_curso') break;
    // El motor puede pasar de actor al resolver una caída.
    if (c.actual !== actor.id) continue;
    const siguienteEstado = siguiente(c, turnoRng);
    if (siguienteEstado.ronda <= RONDAS_BALANCE) c = medirPaso(c, siguienteEstado, m);
    else break;
  }
  m.caidas = Number(c.miembros.some(p => p.id === DOLL && p.vida <= 0));
  return m;
}

export function evaluarBalance(
  borrador: Borrador, ctx: ContextoArena,
  opciones: { semilla?: number; repeticiones?: number; doll?: Partial<AjustesDoll>; accion?: string } = {},
) {
  const { semilla = SEMILLA_BALANCE, repeticiones = 24, doll = {}, accion } = opciones;
  if (!Number.isSafeInteger(semilla) || !Number.isInteger(repeticiones) || repeticiones < 1 || repeticiones > 256) {
    throw Error('La prueba requiere una semilla entera y entre 1 y 256 repeticiones.');
  }
  const referencia: Borrador = { ...vacio(), tipo: 'personaje', nombre: 'Portador desarmado de referencia' };
  const informe = ESCENARIOS_BALANCE.map(escenario => {
    const incidencias = new Set<string>(), incidenciasReferencia = new Set<string>();
    const comparar = (b: Borrador, contexto: ContextoArena, avisos: Set<string>, prioridad?: string) => {
      const medias = agregarMetricas();
      for (let i = 0; i < repeticiones; i++) {
        const prueba = simular(b, contexto, doll, escenario, semilla + i * 65537, avisos, prioridad);
        for (const clave of Object.keys(medias) as (keyof Metricas)[]) medias[clave] += prueba[clave];
      }
      for (const clave of Object.keys(medias) as (keyof Metricas)[]) medias[clave] /= repeticiones;
      return medias;
    };
    const creacion = comparar(borrador, ctx, incidencias, accion);
    const ancla = comparar(referencia, { creaciones: [], stats: DOLL_BASE }, incidenciasReferencia);
    const danoPorAccion = creacion.acciones > 0 ? creacion.dano / creacion.acciones : null;
    const danoPorAccionReferencia = ancla.acciones > 0 ? ancla.dano / ancla.acciones : 0;
    return {
      escenario, creacion, referencia: ancla,
      rendimientoPorAccion: danoPorAccion !== null && danoPorAccionReferencia > 0
        ? danoPorAccion / danoPorAccionReferencia : null,
      incidencias: [...incidencias], incidenciasReferencia: [...incidenciasReferencia],
    };
  });
  const totales = informe.reduce((t, v) => ({
    dano: t.dano + v.creacion.dano,
    pico: t.pico + v.creacion.pico,
    referencia: t.referencia + v.referencia.dano,
    picoReferencia: t.picoReferencia + v.referencia.pico,
  }), { dano: 0, pico: 0, referencia: 0, picoReferencia: 0 });
  const ipe = totales.referencia > 0 ? totales.dano / totales.referencia : null;
  const ipePico = totales.picoReferencia > 0 ? totales.pico / totales.picoReferencia : null;
  const avisos = ['Clases provisionales por daño observado. Defensa, apoyo, control y efectos narrativos requieren anclas propias.'];
  if (informe.some(v => v.incidencias.length)) avisos.push('Hubo acciones descartadas. Revisa el desglose de cada escenario.');
  if (informe.some(v => v.creacion.accionesEnemigasNegadas > 0)) avisos.push('La creación puede negar acciones enemigas en los escenarios probados.');
  if (ipe !== null && ipePico !== null && ipePico >= 2 && ipePico >= ipe * 1.5) {
    avisos.push('La potencia de pico supera el rendimiento que la creación sostuvo durante cinco rondas.');
  }
  return {
    version: VERSION_BALANCE, semilla, repeticiones, rondas: RONDAS_BALANCE, modo: 'impacto',
    ipe, clase: ipe === null ? null : claseLaboratorio(ipe),
    clasePico: ipePico === null ? null : claseLaboratorio(ipePico),
    informe, avisos,
  };
}
