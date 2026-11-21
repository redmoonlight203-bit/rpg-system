import {
  acciones, actuar, casillasAlcanzables, desplazar, distanciaCasillas, iniciar, posicionesTablero, siguiente,
  type Accion, type Combate, type RNG,
} from './combate';
import { clasePorIPE } from './clases';
import { vacio, type Borrador } from './yunque-borrador';
import { prepararArena, DOLL_BASE, type AjustesDoll, type ContextoArena } from './yunque-arena';

export const VERSION_BALANCE = 'ipe-1.0.1';
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
  accionesPropias: number;
  aperturasPropias: number;
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

export const claseLaboratorio = clasePorIPE;
export const REPETICIONES_CLASE = 12;

function agregarMetricas(): Metricas {
  return {
    accionesPropias: 0, aperturasPropias: 0, dano: 0, pico: 0, curacion: 0, danoRecibido: 0, acciones: 0, phGastado: 0,
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
    borrador, ctx, doll, { ph: escenario.magia ? RONDAS_BALANCE : 0, armadura: escenario.armadura, salvacion: escenario.salvacion },
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
        const efecto = { ...basico.efecto, id: 'proyectil-prueba', coste_ph: 1, naturaleza: 'magica' as const, caras: 6,
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
          if (propia) {
            if (esPropia(accion)) {
              m.accionesPropias++;
              if (!m.acciones) m.aperturasPropias++;
            }
            m.acciones++;
          }
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
  const soporte: Borrador = {...vacio(), tipo:'pasiva', reglas_pasivas:[{
    id:'apoyo-referencia', nombre:'Recuperación', evento:'inicio_turno', condicion:'siempre',
    bonos:{}, curacion:1, recuperar_ph:0, reducir_fatiga:0,
  }]};
  const defensa: Borrador = {...referencia, stats:{...DOLL_BASE, armadura:6}};
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
    const apoyo = comparar(soporte, {creaciones:[],stats:{}}, new Set());
    const protector = comparar(defensa, {creaciones:[],stats:defensa.stats}, new Set());
    // Compara daño por ataque recibido. Una caída temprana nunca acredita mitigación.
    const evitado = (m:Metricas) => m.accionesRivales && ancla.accionesRivales && m.caidas <= ancla.caidas
      ? Math.max(0, ancla.danoRecibido/ancla.accionesRivales - m.danoRecibido/m.accionesRivales)*m.accionesRivales : 0;
    const roles = {
      apoyo:creacion.curacion, apoyoReferencia:apoyo.curacion,
      defensa:evitado(creacion), defensaReferencia:evitado(protector),
      control:creacion.accionesEnemigasNegadas, controlReferencia:ancla.accionesRivales/RONDAS_BALANCE,
    };
    const danoPorAccion = creacion.acciones > 0 ? creacion.dano / creacion.acciones : null;
    const danoPorAccionReferencia = ancla.acciones > 0 ? ancla.dano / ancla.acciones : 0;
    return {
      escenario, creacion, referencia: ancla, roles,
      rendimientoPorAccion: danoPorAccion !== null && danoPorAccionReferencia > 0
        ? danoPorAccion / danoPorAccionReferencia : null,
      incidencias: [...incidencias], incidenciasReferencia: [...incidenciasReferencia],
    };
  });
  const totales = informe.reduce((t, v) => ({
    dano: t.dano + (borrador.tipo==='personaje' || v.creacion.accionesPropias>0
      ? v.creacion.dano : Math.max(0,v.creacion.dano-v.referencia.dano)),
    pico: t.pico + (borrador.tipo==='personaje' || v.creacion.aperturasPropias>0
      ? v.creacion.pico : Math.max(0,v.creacion.pico-v.referencia.pico)),
    referencia: t.referencia + v.referencia.dano,
    picoReferencia: t.picoReferencia + v.referencia.pico,
  }), { dano: 0, pico: 0, referencia: 0, picoReferencia: 0 });
  const ofensiva = totales.referencia > 0 ? totales.dano / totales.referencia : null;
  const relativo = (rol:'defensa'|'apoyo'|'control') => {
    const ancla = informe.reduce((n,v)=>n+v.roles[`${rol}Referencia`],0);
    return ancla > 0 ? informe.reduce((n,v)=>n+v.roles[rol],0)/ancla : null;
  };
  const indices = {ofensiva, defensa:relativo('defensa'), apoyo:relativo('apoyo'), control:relativo('control')};
  const medidos = Object.values(indices).filter((n):n is number=>n!==null);
  const ipe = medidos.length ? Math.max(...medidos) : null;
  const ipePico = totales.picoReferencia > 0 ? totales.pico / totales.picoReferencia : null;
  const avisos = ['Se toma el mayor índice medido de ofensiva, defensa, apoyo o control. Los efectos narrativos requieren revisión.'];
  if (borrador.tipo==='habilidad' && informe.every(v=>v.creacion.accionesPropias===0)) {
    avisos.push('La habilidad no se activó en los escenarios probados. Revisa sus condiciones, alcance y recursos.');
  }
  if (informe.some(v=>v.creacion.hpPropioPerdido>0)) {
    avisos.push('Actuar produjo pérdida de HP propios. El informe separa esa exposición del daño infligido al rival.');
  }
  if (informe.some(v => v.incidencias.length)) avisos.push('Hubo acciones descartadas. Revisa el desglose de cada escenario.');
  if (informe.some(v => v.creacion.accionesEnemigasNegadas > 0)) avisos.push('La creación puede negar acciones enemigas en los escenarios probados.');
  if (ipe !== null && ipePico !== null && ipePico >= 2 && ipePico >= ipe * 1.5) {
    avisos.push('La potencia de pico supera el rendimiento que la creación sostuvo durante cinco rondas.');
  }
  return {
    version: VERSION_BALANCE, semilla, repeticiones, rondas: RONDAS_BALANCE, modo: 'impacto',
    indices, ipe, clase: ipe === null ? null : claseLaboratorio(ipe),
    clasePico: ipePico === null ? null : claseLaboratorio(ipePico),
    informe, avisos,
  };
}
