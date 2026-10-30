import { type Efecto, type Elemento } from "./creacion";
import { type ReglaPasiva } from "./pasivas";
export type Bando = "jugador" | "enemigo";
export type Fuente = {
  id?: string;
  nombre: string;
  stats: Record<string, number>;
  efectos?: Efecto[];
  slot_tipo?: string;
  reglas_pasivas?: ReglaPasiva[];
};
export type Config = {
  tipo_creacion?: string;
  bonos_equipamiento?: Record<string, number>;
  efectos?: Efecto[];
  stats_base?: Record<string, number>;
  equipamiento?: Record<string, Fuente>;
  habilidades?: Fuente[];
  pasivas?: { nombre: string; reglas: ReglaPasiva[] }[];
  reglas_pasivas?: ReglaPasiva[];
};
export type Combatiente = {
  id: string;
  forja_id: string | null;
  nombre: string;
  personaje_id?: string;
  bando: Bando;
  stats: Record<string, number>;
  configuracion: Config;
  vida: number;
  ph: number;
  fatiga: number;
  iniciativa: number;
  dado_iniciativa: number;
  turnos: number;
  accion_usada: boolean;
  uso_fatiga?: boolean;
  agotado?: boolean;
  grupo_cercania?: string;
  corrupto?: boolean;
  cooldowns: Record<string, number>;
  arma?: {
    efecto: Efecto;
    nombre: string;
    slot: string;
    restantes: number;
    creada: number;
  };
  estados: {
    id: string;
    nombre: string;
    restantes: number;
    creado: number;
    bonos: Record<string, number>;
    inicio?: boolean;
    tipo?: string;
    cantidad?: number;
    caras?: number;
    cd?: number;
    atributo?: string;
  }[];
};
export type Combate = {
  fase: "preparacion" | "en_curso" | "finalizado";
  ronda: number;
  actual: string | null;
  regla: "impacto" | "reduccion" | "directo";
  miembros: Combatiente[];
  registro: string[];
  resultado?: "Fallo" | "Fallo critico" | "Critico" | "Impacto";
  historial?: Combate[];
};
export type Accion = {
  id: string;
  nombre: string;
  efecto: Efecto;
  enfriamiento: number;
};
export type RNG = (caras: number) => number;
export function dadoSeguro(caras: number) {
  const a = new Uint32Array(1),
    limite = Math.floor(4294967296 / caras) * caras;
  do {
    crypto.getRandomValues(a);
  } while (a[0] >= limite);
  return (a[0] % caras) + 1;
}
const copia = <T>(v: T): T => JSON.parse(JSON.stringify(v));
export const nuevoCombate = (): Combate => ({
  fase: "preparacion",
  ronda: 1,
  actual: null,
  regla: "impacto",
  miembros: [],
  registro: [],
});
function log(c: Combate, t: string) {
  c.registro.unshift(t);
  c.registro = c.registro.slice(0, 300);
}
function piezas(m: Combatiente) {
  const p = { ...m.configuracion.equipamiento };
  if (m.arma) {
    delete p[m.arma.slot];
    if (m.arma.efecto.arma_slot === "dos_manos") {
      delete p.mano_der;
      delete p.mano_izq;
    }
  }
  return p;
}
function armado(m: Combatiente) {
  return (
    !!m.arma ||
    Object.values(piezas(m)).some((p) =>
      p.efectos?.some((e) => e.efecto === "dano"),
    )
  );
}
export function reglas(m: Combatiente) {
  const todas = [
    ...(m.configuracion.reglas_pasivas || []),
    ...(m.configuracion.pasivas || []).flatMap((p) => p.reglas || []),
    ...Object.values(piezas(m)).flatMap((p) => p.reglas_pasivas || []),
  ];
  return [...new Map(todas.map((r) => [JSON.stringify(r), r])).values()];
}
function cumple(m: Combatiente, r: ReglaPasiva, e?: Efecto) {
  if (r.elemento && r.elemento !== "cualquiera" && r.elemento !== elementoDe(e))
    return false;
  return (
    (r.condicion === "ataque_magico" && !!e && e.coste_ph > 0) ||
    (r.condicion === "ataque_natural" &&
      !!e &&
      e.coste_ph === 0 &&
      (e.naturaleza === "natural" || (e.coste_fatiga || 0) > 0)) ||
    (r.condicion === "ataque_elemental" &&
      !!e &&
      elementoDe(e) !== "ninguno") ||
    r.condicion === "siempre" ||
    (r.condicion === "vida_mitad" &&
      m.vida <= Math.max(1, m.stats.vida || m.stats.hp || 1) / 2) ||
    (r.condicion === "sin_arma" && !armado(m))
  );
}
export function estadisticas(m: Combatiente) {
  const s = { ...m.stats };
  if (m.arma) {
    for (const slot of m.arma.efecto.arma_slot === "dos_manos"
      ? ["mano_der", "mano_izq"]
      : [m.arma.slot])
      for (const [k, v] of Object.entries(
        m.configuracion.equipamiento?.[slot]?.stats || {},
      ))
        if (
          k in s &&
          !["peso", "durabilidad", "dano", "caras_dano", "dados_dano"].includes(
            k,
          )
        )
          s[k] -= v;
  }
  for (const r of reglas(m))
    if (r.evento === "permanente" && cumple(m, r))
      for (const [k, v] of Object.entries(r.bonos)) s[k] = (s[k] || 0) + v;
  for (const e of m.estados)
    for (const [k, v] of Object.entries(e.bonos || {})) s[k] = (s[k] || 0) + v;
  return s;
}
export function maxVida(m: Combatiente) {
  const s = estadisticas(m);
  return Math.max(1, s.vida ?? s.hp ?? 1);
}
function normalizar(m: Combatiente) {
  const s = estadisticas(m);
  m.vida = Math.max(0, Math.min(m.vida, maxVida(m)));
  m.ph = Math.max(0, Math.min(m.ph, s.ph || 0));
  m.fatiga = Math.max(0, Math.min(m.fatiga, s.fatiga || 0));
}
export function agregar(
  c: Combate,
  f: {
    id: string;
    forja_id: string | null;
    nombre: string;
    stats: Record<string, number>;
    configuracion: Config;
  },
  bando: Bando,
  rng: RNG = dadoSeguro,
) {
  if (c.fase !== "preparacion")
    throw Error("Añade personajes durante la preparación.");
  if (f.configuracion.tipo_creacion !== "personaje")
    throw Error("Solo se admiten personajes.");
  const n = copia(c);
  if (n.miembros.some((m) => m.id === f.id)) return n;
  const m: Combatiente = {
    ...f,
    stats: { ...f.stats },
    bando,
    vida: f.stats.vida ?? f.stats.hp ?? 1,
    ph: 0,
    fatiga: 0,
    iniciativa: 0,
    dado_iniciativa: 0,
    turnos: 0,
    accion_usada: false,
    cooldowns: {},
    estados: [],
  };
  for (const [k, v] of Object.entries(m.configuracion.bonos_equipamiento || {}))
    if (!(k in m.stats)) m.stats[k] = v;
  m.vida = maxVida(m);
  m.ph = Math.max(0, estadisticas(m).ph || 0);
  m.corrupto = !!m.stats.corrupto;
  m.grupo_cercania = "";
  m.dado_iniciativa = rng(20);
  m.iniciativa = m.dado_iniciativa + (estadisticas(m).iniciativa || 0);
  n.miembros.push(m);
  log(
    n,
    `${m.nombre} → ${bando}. Iniciativa ${m.dado_iniciativa} + ${estadisticas(m).iniciativa || 0} = ${m.iniciativa}. Vida ${m.vida}, ARM ${estadisticas(m).armadura || 0}.`,
  );
  return n;
}
function orden(c: Combate) {
  return c.miembros
    .map((m, i) => ({ m, i }))
    .sort((a, b) => b.m.iniciativa - a.m.iniciativa || a.i - b.i)
    .map((v) => v.m);
}
export function elementoDe(e?: Efecto): Elemento {
  if (e?.elemento) return e.elemento;
  const t = (e?.tipo_dano || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (t === "fuego") return "fuego";
  if (t === "agua") return "agua";
  if (["electrico", "electricidad"].includes(t)) return "electricidad";
  if (["hielo", "frio"].includes(t)) return "hielo";
  if (["luz sagrada", "luz_sagrada"].includes(t)) return "luz_sagrada";
  return "ninguno";
}
function dados(c: Combate, n: number, caras: number, rng: RNG, nombre: string) {
  const vs = Array.from({ length: n }, () => rng(caras));
  const total = vs.reduce((a, b) => a + b, 0);
  if (n) log(c, `${nombre}: ${n}d${caras} [${vs.join(", ")}] = ${total}.`);
  return total;
}
export function salvacion(
  c: Combate,
  m: Combatiente,
  cd = 12,
  atributo = "salvacion",
  rng: RNG = dadoSeguro,
) {
  const d = rng(20),
    bono = estadisticas(m)[atributo] || 0,
    exito = d + bono >= cd;
  log(
    c,
    `${m.nombre}: salvación d20 (${d}) + ${atributo} (${bono}) = ${d + bono}, CD ${cd}: ${exito ? "superada" : "fallida"}.`,
  );
  return exito;
}
function tiene(m: Combatiente, tipo: string) {
  return m.estados.some((e) => (e.tipo || e.id) === tipo);
}
function quitarEstado(m: Combatiente, tipo: string) {
  m.estados = m.estados.filter((e) => (e.tipo || e.id) !== tipo);
}
function estado(
  m: Combatiente,
  tipo: string,
  nombre: string,
  duracion = 0,
  bonos: Record<string, number> = {},
  extras: Partial<Combatiente["estados"][number]> = {},
) {
  const existente = m.estados.find((e) => (e.tipo || e.id) === tipo);
  if (existente) {
    existente.restantes = existente.restantes === 0 || duracion === 0 ? 0 : Math.max(existente.restantes, duracion);
    existente.creado = m.turnos;
    for (const [k, v] of Object.entries(bonos))
      if (Math.abs(v) > Math.abs(existente.bonos[k] || 0))
        existente.bonos[k] = v;
    if (
      (extras.cantidad || 0) * (extras.caras || 0) >
      (existente.cantidad || 0) * (existente.caras || 0)
    )
      Object.assign(existente, extras);
    return;
  }
  m.estados.push({
    id: tipo,
    tipo,
    nombre,
    restantes: duracion,
    creado: m.turnos,
    bonos,
    ...extras,
  });
}
function recuperar(m: Combatiente, r: ReglaPasiva) {
  m.vida += r.curacion;
  m.ph += r.recuperar_ph;
  if (!m.agotado) m.fatiga -= r.reducir_fatiga;
  normalizar(m);
}
function reactivas(m: Combatiente, e: Efecto, evento: ReglaPasiva["evento"]) {
  return reglas(m).filter((r) => r.evento === evento && cumple(m, r, e));
}
function activarReglas(
  c: Combate,
  a: Combatiente,
  t: Combatiente,
  rs: ReglaPasiva[],
  rng: RNG,
) {
  for (const r of rs) {
    log(c, `${t.nombre}: ${r.nombre} (${r.evento}).`);
    recuperar(t, r);
    if (a.id !== t.id && (r.represalia_dados || 0) > 0) {
      const v = dados(
        c,
        r.represalia_dados!,
        r.represalia_caras || 6,
        rng,
        "Represalia " + r.nombre,
      );
      a.vida = Math.max(0, a.vida - v);
      log(
        c,
        `${a.nombre} sufre ${v} por represalia, sin encadenar otras represalias.`,
      );
    }
  }
}
function recibir(
  c: Combate,
  a: Combatiente,
  t: Combatiente,
  e: Efecto,
  total: number,
  rs: ReglaPasiva[],
  rng: RNG,
) {
  const alDano = reactivas(t, e, "recibir_dano");
  const reduccion = Math.max(
    0,
    ...[...rs, ...alDano].map((r) => r.reduccion_pct || 0),
  );
  if (reduccion) {
    const antes = total;
    total = Math.floor(total * (1 - reduccion / 100));
    log(
      c,
      `${t.nombre}: reducción ${reduccion}% (${antes} → ${total}); no se acumulan porcentajes.`,
    );
  }
  const perdido = Math.min(t.vida, Math.max(0, total));
  t.vida -= perdido;
  log(c, `${t.nombre} recibe ${perdido} daño; vida ${t.vida}.`);
  if (perdido > 0) activarReglas(c, a, t, alDano, rng);
  return perdido;
}
function area(
  c: Combate,
  a: Combatiente,
  t: Combatiente,
  e: Efecto,
  total: number,
  rng: RNG,
) {
  const antes = reactivas(t, e, "recibir_ataque");
  activarReglas(c, a, t, antes, rng);
  const impacto = reactivas(t, e, "recibir_impacto");
  activarReglas(c, a, t, impacto, rng);
  return recibir(c, a, t, e, total, [...antes, ...impacto], rng);
}
function entrar(c: Combate, m: Combatiente, rng: RNG) {
  m.turnos++;
  m.accion_usada = false;
  m.uso_fatiga = false;
  m.estados = m.estados.filter((e) => !e.inicio);
  for (const k of Object.keys(m.cooldowns))
    m.cooldowns[k] = Math.max(0, m.cooldowns[k] - 1);
  for (const r of reglas(m))
    if (r.evento === "inicio_turno" && cumple(m, r)) {
      recuperar(m, r);
      log(c, `${m.nombre}: ${r.nombre} al iniciar turno.`);
    }
  for (const e of [...m.estados]) {
    if (["quemadura", "veneno", "regeneracion"].includes(e.tipo || "")) {
      const v = dados(
        c,
        e.cantidad ?? 1,
        e.caras ?? 4,
        rng,
        `${m.nombre}: ${e.nombre}`,
      );
      if (e.tipo === "regeneracion") m.vida = Math.min(maxVida(m), m.vida + v);
      else recibir(c, m, m, { ...basico(), efecto: "dano" }, v, [], rng);
      log(c, `${m.nombre}: ${e.nombre}, vida ${m.vida}.`);
      if (
        e.tipo === "quemadura" &&
        salvacion(c, m, e.cd || 12, e.atributo || "salvacion", rng)
      ) {
        quitarEstado(m, e.tipo);
        log(c, `${m.nombre} apaga la quemadura.`);
      }
    }
  }
  if (tiene(m, "congelado") || tiene(m, "aturdido")) {
    m.accion_usada = true;
    quitarEstado(m, "congelado");
    quitarEstado(m, "aturdido");
    log(c, `${m.nombre} pierde su turno por congelación/aturdimiento.`);
  }
  normalizar(m);
  c.actual = m.id;
  log(c, `Ronda ${c.ronda} · Turno de ${m.nombre}.`);
}
function iniciarInterno(c: Combate, rng: RNG) {
  if (c.fase !== "preparacion") throw Error("El combate ya empezó.");
  const n = copia(c),
    primero = orden(n).find((m) => m.vida > 0);
  if (!primero) throw Error("Añade personajes en pie.");
  n.fase = "en_curso";
  entrar(n, primero, rng);
  return n;
}
function siguienteInterno(c: Combate, rng: RNG) {
  if (c.fase !== "en_curso") throw Error("Inicia el combate.");
  const n = copia(c),
    a = n.miembros.find((m) => m.id === n.actual);
  delete n.resultado;
  if (a) {
    if (
      (estadisticas(a).fatiga || 0) > 0 &&
      a.fatiga >= (estadisticas(a).fatiga || 0)
    )
      a.agotado = true;
    if (!a.agotado && !a.uso_fatiga && a.fatiga > 0) {
      a.fatiga = Math.max(0, a.fatiga - 1);
      log(n, `${a.nombre} recupera 1 Fatiga.`);
    }
    if (a.arma && a.arma.creada < a.turnos) {
      a.arma.restantes--;
      if (a.arma.restantes <= 0) {
        log(
          n,
          `${a.nombre}: ${a.arma.nombre} desaparece; se restaura su equipo.`,
        );
        delete a.arma;
      }
    }
    a.estados = a.estados.filter((e) => {
      if (e.restantes > 0 && !e.inicio && e.creado < a.turnos) {
        e.restantes--;
        return e.restantes > 0;
      }
      return true;
    });
    normalizar(a);
  }
  const lista = orden(n),
    idx = lista.findIndex((m) => m.id === n.actual);
  for (let p = 1; p <= lista.length; p++) {
    const i = (Math.max(0, idx) + p) % lista.length;
    if (i === 0) n.ronda++;
    if (lista[i].vida > 0) {
      entrar(n, lista[i], rng);
      if (lista[i].vida > 0) return n;
    }
  }
  n.fase = "finalizado";
  n.actual = null;
  limpiarFinal(n);
  return n;
}
function registrar(c: Combate, fn: () => Combate) {
  const previo = copia(c);
  delete previo.historial;
  const n = fn();
  n.historial = [...(c.historial || []), previo].slice(-10);
  return n;
}
export function iniciar(c: Combate, rng: RNG = dadoSeguro) {
  return registrar(c, () => iniciarInterno(c, rng));
}
export function siguiente(c: Combate, rng: RNG = dadoSeguro) {
  return registrar(c, () => siguienteInterno(c, rng));
}
export function deshacer(c: Combate) {
  const h = [...(c.historial || [])],
    previo = h.pop();
  if (!previo) throw Error("No hay una acción anterior.");
  return { ...copia(previo), historial: h };
}
function limpiarFinal(n:Combate){for(const m of n.miembros){m.estados=[];delete m.arma;normalizar(m);}log(n,'Combate terminado: los estados temporales y armas efímeras desaparecen.');}
export function finalizar(c:Combate){return registrar(c,()=>{const n=copia(c);n.fase='finalizado';n.actual=null;limpiarFinal(n);return n;});}
export function descansar(c: Combate) {
  if (c.fase === "en_curso")
    throw Error("El descanso requiere terminar el combate.");
  return registrar(c, () => {
    const n = copia(c);
    for (const m of n.miembros) {
      m.fatiga = 0;
      m.agotado = false;
    }
    log(n, "Descanso: Fatiga y agotamiento recuperados.");
    return n;
  });
}
export function configurarParticipante(
  c: Combate,
  id: string,
  patch: { grupo_cercania?: string; corrupto?: boolean; salvacion?: number },
) {
  return registrar(c, () => {
    const n = copia(c),
      m = n.miembros.find((m) => m.id === id);
    if (!m) throw Error("Personaje inexistente.");
    if (patch.salvacion !== undefined) {
      if (!Number.isFinite(patch.salvacion) || Math.abs(patch.salvacion) > 1000)
        throw Error("Bono de salvación inválido.");
      m.stats.salvacion = patch.salvacion;
    }
    if (patch.grupo_cercania !== undefined)
      m.grupo_cercania = patch.grupo_cercania;
    if (patch.corrupto !== undefined) m.corrupto = patch.corrupto;
    return n;
  });
}
function basico(): Efecto {
  return {
    id: "basico",
    nombre: "Ataque desarmado",
    efecto: "dano",
    cantidad: 1,
    caras: 4,
    modificador: 0,
    tipo_dano: "físico",
    estado: "",
    duracion: 0,
    coste_ph: 0,
  };
}
export function acciones(m: Combatiente) {
  const lista: Accion[] = [];
  if (m.arma)
    lista.push({
      id: "ataque",
      nombre: `Atacar con ${m.arma.nombre}`,
      efecto: {
        ...m.arma.efecto,
        efecto: "dano",
        coste_ph: 0,
        coste_fatiga: 0,
        duracion: 0,
      },
      enfriamiento: 0,
    });
  else {
    const p = Object.values(piezas(m)).find((p) =>
      p.efectos?.some((e) => e.efecto === "dano"),
    );
    const a = p?.efectos?.find((e) => e.efecto === "dano") || basico();
    lista.push({
      id: "ataque",
      nombre: p ? `Atacar con ${p.nombre}` : a.nombre,
      efecto: a,
      enfriamiento: 0,
    });
  }
  for (const h of m.configuracion.habilidades || [])
    for (const e of h.efectos || [])
      lista.push({
        id: `hab:${h.id}:${e.id}`,
        nombre: `${h.nombre} · ${e.nombre}`,
        efecto: e,
        enfriamiento: Math.max(
          0,
          h.stats.enfriamiento || h.stats.cooldown || 0,
        ),
      });
  for (const [slot, p] of Object.entries(piezas(m)))
    for (const e of p.efectos || [])
      lista.push({
        id: `equipo:${slot}:${e.id}`,
        nombre: `${p.nombre} · ${e.nombre}`,
        efecto: e,
        enfriamiento: 0,
      });
  return lista;
}
function actuarInterno(
  c: Combate,
  actorId: string,
  accionId: string,
  objetivoId: string,
  rng: RNG,
  forzar: boolean,
) {
  const n = copia(c),
    a = n.miembros.find((m) => m.id === actorId);
  delete n.resultado;
  if (n.fase !== "en_curso" || n.actual !== actorId || !a || a.vida <= 0)
    throw Error("Solo puede actuar el personaje de turno.");
  if (a.accion_usada) throw Error("Ya utilizó su acción.");
  if (accionId === "guardia") {
    estado(a, "guardia", "Guardia", 1, { armadura: 2 }, { inicio: true });
    a.accion_usada = true;
    return n;
  }
  const act = acciones(a).find((v) => v.id === accionId);
  if (!act) throw Error("La acción no existe.");
  if ((a.cooldowns[act.id] || 0) > 0) throw Error("Habilidad en enfriamiento.");
  const e = act.efecto,
    s = estadisticas(a),
    coste = e.coste_ph || 0,
    fatiga = e.coste_fatiga || 0,
    t = n.miembros.find((m) => m.id === objetivoId);
  if (a.ph < coste) throw Error("PH insuficientes.");
  if (e.efecto !== "crear_arma" && !t) throw Error("Elige un objetivo.");
  const forzando =
    fatiga > 0 && (a.agotado || a.fatiga + fatiga > (s.fatiga || 0));
  if (forzando && !forzar)
    throw Error(
      "Agotamiento: activa Forzar natural para usarla sufriendo 1d4 de daño.",
    );
  a.ph -= coste;
  a.fatiga = Math.min(s.fatiga || 0, a.fatiga + fatiga);
  a.uso_fatiga = fatiga > 0;
  a.accion_usada = true;
  if (fatiga && a.fatiga >= (s.fatiga || 0)) a.agotado = true;
  if (act.enfriamiento) a.cooldowns[act.id] = act.enfriamiento + 1;
  if (forzando) {
    const v = dados(n, 1, 4, rng, "Daño por agotamiento");
    a.vida = Math.max(0, a.vida - v);
    if (!a.vida) {
      log(n, `${a.nombre} cae por agotamiento antes de ejecutar la habilidad.`);
      return n;
    }
  }
  log(n, `${act.nombre}: coste ${coste} PH y ${fatiga} Fatiga.`);
  if (e.efecto === "crear_arma") {
    a.arma = {
      efecto: { ...e },
      nombre: e.arma_nombre || "Arma temporal",
      slot: e.arma_slot === "mano_izq" ? "mano_izq" : "mano_der",
      restantes: e.duracion,
      creada: a.turnos,
    };
    log(n, `${a.nombre} crea ${a.arma.nombre} durante ${e.duracion} turnos.`);
    normalizar(a);
    return n;
  }
  if (!t) throw Error("Falta objetivo.");
  if (e.efecto !== "dano") {
    const supera = e.salvacion
      ? salvacion(n, t, e.salvacion.cd, e.salvacion.atributo, rng)
      : false;
    if (e.efecto === "estado") {
      if (supera) {
        log(n, `${t.nombre} evita el estado.`);
        return n;
      }
      const tipo = e.estado_tipo || "narrativo";
      estado(
        t,
        tipo === "narrativo" ? "estado:" + e.id : tipo,
        e.estado || tipo,
        Math.max(1, e.duracion),
        e.bonos_estado || {},
        {
          cantidad: e.cantidad,
          caras: e.caras,
          cd: e.salvacion?.cd || 12,
          atributo: e.salvacion?.atributo || "salvacion",
        },
      );
    } else {
      let v = Math.max(
        0,
        dados(n, e.cantidad, e.caras, rng, act.nombre) + e.modificador,
      );
      if (supera && e.salvacion?.exito === "mitad") v = Math.floor(v / 2);
      if (supera && e.salvacion?.exito === "anula") v = 0;
      if (e.efecto === "curacion") t.vida = Math.min(maxVida(t), t.vida + v);
      if (e.efecto === "recuperar_ph")
        t.ph = Math.min(estadisticas(t).ph || 0, t.ph + v);
      if (e.efecto === "reducir_fatiga" && !t.agotado)
        t.fatiga = Math.max(0, t.fatiga - v);
      log(n, `${t.nombre}: ${e.efecto} ${v}.`);
    }
    normalizar(a);
    normalizar(t);
    return n;
  }
  const elemento = elementoDe(e),
    antes = reactivas(t, e, "recibir_ataque");
  activarReglas(n, a, t, antes, rng);
  if (a.vida <= 0) {
    log(n, `${a.nombre} cae por una reacción antes de impactar.`);
    return n;
  }
  let arm =
    (estadisticas(t).armadura || 0) +
    antes.reduce((v, r) => v + (r.bonos.armadura || 0), 0);
  if (tiene(t, "escarcha")) arm = Math.floor(arm / 2);
  arm = Math.max(
    0,
    arm -
      (elemento === "electricidad" ? 3 : elemento === "luz_sagrada" ? 5 : 0),
  );
  if (antes.length)
    log(
      n,
      `${t.nombre}: defensas reactivas ${antes.map((r) => r.nombre).join(", ")}; ARM contra este ataque ${arm}.`,
    );
  let acierta = true,
    critico = false,
    supera = false;
  if (e.salvacion) {
    supera = salvacion(n, t, e.salvacion.cd, e.salvacion.atributo, rng);
    acierta = !(supera && e.salvacion.exito === "anula");
    n.resultado = acierta ? "Impacto" : "Fallo";
  } else if (n.regla === "impacto") {
    const d = rng(20),
      impacto = d + (s.bono_impacto || 0);
    critico = d === 20;
    acierta = critico || (d !== 1 && impacto >= arm);
    n.resultado =
      d === 1
        ? "Fallo critico"
        : critico
          ? "Critico"
          : acierta
            ? "Impacto"
            : "Fallo";
    log(
      n,
      `${n.resultado}: d20 ${d} + impacto ${s.bono_impacto || 0} = ${impacto}, ARM ${arm}.`,
    );
  } else n.resultado = "Impacto";
  // A blind penalty is consumed by the next attempted attack, even on a miss.
  quitarEstado(a, "ciego");
  quitarEstado(t, "escarcha");
  if (!acierta) return n;
  const permiteEstados = !(supera && e.salvacion?.exito === "solo_estado");
  let dadosTotal = dados(n, e.cantidad, e.caras, rng, act.nombre);
  if (elemento !== "ninguno")
    dadosTotal += dados(n, 1, 4, rng, "Daño elemental " + elemento);
  const mojado = tiene(t, "mojado"),
    combo =
      mojado &&
      ["fuego", "hielo", "electricidad", "luz_sagrada"].includes(elemento);
  if (combo) {
    quitarEstado(t, "mojado");
    log(n, `${t.nombre}: Mojado se consume por ${elemento}.`);
  }
  if (combo && elemento === "fuego") {
    dadosTotal += dados(n, 1, 4, rng, "Onda de vapor");
    if (permiteEstados)
      estado(t, "ciego", "Ceguera: -4 al próximo ataque", 0, {
        bono_impacto: -4,
      });
  }
  if (permiteEstados && combo && elemento === "hielo")
    estado(t, "congelado", "Congelado: pierde su siguiente turno");
  if (combo && elemento === "luz_sagrada")
    dadosTotal += dados(n, 1, 6, rng, "Agua bendita");
  if (tiene(t, "marca_luz")) {
    quitarEstado(t, "marca_luz");
    dadosTotal += dados(n, 1, 6, rng, "Estallido de Marca de Luz");
  }
  let total = Math.max(
    0,
    dadosTotal * (critico ? 2 : 1) + e.modificador + (s.dano || 0),
  );
  log(
    n,
    `Daño: dados ${dadosTotal}${critico ? " × 2 (crítico)" : ""} + modificador ${e.modificador} + bono ${s.dano || 0} = ${total}.`,
  );
  if (combo && elemento === "electricidad") {
    total *= 2;
    log(n, "Superconducción: daño principal × 2.");
  }
  if (
    combo &&
    elemento === "luz_sagrada" &&
    (t.corrupto ?? !!t.stats.corrupto)
  ) {
    total *= 2;
    log(n, "Agua bendita contra oscuridad/corrupción: daño sagrado × 2.");
  }
  if (supera && e.salvacion?.exito === "mitad") total = Math.floor(total / 2);
  if (n.regla === "reduccion") {
    total = Math.max(0, total - arm);
    log(n, `Tras ARM: ${total}.`);
  }
  const impacto = reactivas(t, e, "recibir_impacto");
  activarReglas(n, a, t, impacto, rng);
  recibir(n, a, t, e, total, [...antes, ...impacto], rng);
  // Elemental saves affect secondary states, never repeat the attack roll.
  if (permiteEstados && elemento === "agua") estado(t, "mojado", "Mojado");
  if (
    permiteEstados &&
    elemento === "fuego" &&
    !salvacion(n, t, 12, "salvacion", rng)
  )
    estado(
      t,
      "quemadura",
      "Quemadura",
      0,
      {},
      { cantidad: 1, caras: 4, cd: 12, atributo: "salvacion" },
    );
  if (
    permiteEstados &&
    elemento === "hielo" &&
    !salvacion(n, t, 12, "salvacion", rng)
  )
    estado(t, "escarcha", "Escarcha: ARM a la mitad hasta el próximo ataque");
  if (
    permiteEstados &&
    elemento === "luz_sagrada" &&
    !salvacion(n, t, 12, "salvacion", rng)
  )
    estado(t, "marca_luz", "Marcado por la Luz");
  if (elemento === "electricidad" && t.grupo_cercania) {
    for (const otro of n.miembros.filter(
      (m) =>
        m.id !== t.id &&
        m.id !== a.id &&
        m.bando === t.bando &&
        m.vida > 0 &&
        m.grupo_cercania === t.grupo_cercania,
    )) {
      area(n, a, otro, e, 3, rng);
      log(n, `${otro.nombre}: chispa de cercanía 3.`);
      if (combo && tiene(otro, "mojado")) {
        const v = dados(n, 1, 6, rng, "Superconducción cercana");
        area(n, a, otro, e, v, rng);
        log(n, `${otro.nombre}: Superconducción ${v}; conserva Mojado.`);
      }
    }
  }
  normalizar(a);
  normalizar(t);
  return n;
}
export function actuar(
  c: Combate,
  actorId: string,
  accionId: string,
  objetivoId: string,
  rng: RNG = dadoSeguro,
  forzar = false,
) {
  return registrar(c, () =>
    actuarInterno(c, actorId, accionId, objetivoId, rng, forzar),
  );
}
export function mover(c: Combate, id: string, bando: Bando) {
  if (c.fase !== "preparacion")
    throw Error("Los bandos se eligen en preparación.");
  const n = copia(c),
    m = n.miembros.find((v) => v.id === id);
  if (!m) throw Error("Personaje no encontrado.");
  m.bando = bando;
  return n;
}
export function retirar(c: Combate, id: string) {
  if (c.fase !== "preparacion")
    throw Error(
      "Solo se pueden retirar combatientes antes de iniciar el combate.",
    );
  const n = copia(c),
    m = n.miembros.find((m) => m.id === id);
  if (!m) throw Error("Personaje no encontrado.");
  n.miembros = n.miembros.filter((m) => m.id !== id);
  log(
    n,
    `${m.nombre} se retira del campo. Su ficha e inventario se conservan.`,
  );
  return n;
}
