import type { Regla, EventoRegla, CondicionRegla, EfectoRegla, ValorRegla, Sujeto } from "./reglas";
import { type Efecto, type Elemento } from "./creacion";
import { type ReglaPasiva } from "./pasivas";
export type RequisitosUso={razas?:string[];minimos?:Record<string,number>;nivel_minimo?:number};
export function validarRequisitos(r:RequisitosUso|undefined):string|null{
 if(r===undefined)return null;
 if(!r||typeof r!=='object'||Array.isArray(r))return 'Requisitos inválidos.';
 if(r.nivel_minimo!==undefined&&(!Number.isInteger(r.nivel_minimo)||r.nivel_minimo<1||r.nivel_minimo>100))return 'El nivel requerido debe estar entre 1 y 100.';
 if(r.razas!==undefined&&(!Array.isArray(r.razas)||r.razas.length>50||r.razas.some(x=>typeof x!=='string'||!x.trim()||x.length>100)))return 'Selecciona razas válidas.';
 if(r.minimos!==undefined&&(!r.minimos||typeof r.minimos!=='object'||Array.isArray(r.minimos)||Object.keys(r.minimos).length>50||Object.entries(r.minimos).some(([k,v])=>!/^[a-z_][a-z0-9_]{0,63}$/.test(k)||typeof v!=='number'||!Number.isFinite(v)||v<0||v>1000000)))return 'Los mínimos deben ser atributos válidos y números de 0 a 1000000.';
 return null;
}
export function faltantesRequisitos(r:RequisitosUso|undefined,razas:string[],stats:Record<string,number>):string[]{
 const error=validarRequisitos(r);if(error)return [error];if(!r)return [];
 const normal=(s:string)=>s.trim().toLocaleLowerCase();
 const errores:string[]=[];
 if(r.nivel_minimo!==undefined&&(stats.nivel??1)<r.nivel_minimo)errores.push('Nivel requerido: '+r.nivel_minimo);
 if(r.razas?.length&&!r.razas.some(x=>razas.map(normal).includes(normal(x))))errores.push('Raza requerida: '+r.razas.join(' o '));
 for(const [k,min] of Object.entries(r.minimos||{}))if((stats[k]||0)<min)errores.push(`${k}: necesita ${min}, tiene ${stats[k]||0}`);
 return errores;
}
function baseRequisitos(m:Combatiente){return Object.fromEntries(Object.entries(m.stats).map(([k,v])=>[k,v-(m.configuracion.bonos_equipamiento?.[k]||0)]));}
function requisitosFuente(m:Combatiente,f:{requisitos_uso?:RequisitosUso}){return faltantesRequisitos(f.requisitos_uso,[m.configuracion.raza||'',...(m.configuracion.linaje_raza||[])],baseRequisitos(m));}
export type Bando = "jugador" | "enemigo";
export type Fuente = {
  requisitos_uso?: RequisitosUso;
  id?: string;
  nombre: string;
  stats: Record<string, number>;
  efectos?: Efecto[];
  slot_tipo?: string;
  tipo_creacion?: string;
  consumible?: boolean;
  descripcion?: string;
  imagen_url?: string;
  reglas?: Regla[];
  reglas_pasivas?: ReglaPasiva[];
};
export type Config = {
  raza?: string;
  linaje_raza?: string[];
  tipo_creacion?: string;
  bonos_equipamiento?: Record<string, number>;
  efectos?: Efecto[];
  stats_base?: Record<string, number>;
  equipamiento?: Record<string, Fuente>;
  habilidades?: Fuente[];
  pasivas?: { requisitos_uso?:RequisitosUso; id?: string; nombre: string; reglas: ReglaPasiva[]; reglas_motor?: Regla[] }[];
  reglas?: Regla[];
  reglas_pasivas?: ReglaPasiva[];
  reserva?: Fuente[];
  consumidos?: string[];
};
export type Combatiente = {
  id: string;
  forja_id: string | null;
  nombre: string;
  personaje_id?: string;
  nivel?: number;
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
  motor?: EstadoMotor;
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
    origen?: string;
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
  progreso_confirmado?: boolean;
};
export type Accion = {
  id: string;
  nombre: string;
  efecto: Efecto;
  enfriamiento: number;
  regla?: string;
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
  const p = Object.fromEntries(Object.entries(m.configuracion.equipamiento||{}).filter(([,p])=>!requisitosFuente(m,p).length));
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
/** La pasiva racial tiene prioridad sobre versiones equipadas con el mismo nombre.
 * Evita apilar Escamas de Dragon antiguas y raciales sin modificar las fichas existentes. */
function pasivasAplicables(m: Combatiente) {
  const todas = (m.configuracion.pasivas || []).filter(p=>!requisitosFuente(m,p).length);
  const raciales = todas.filter((p) => String(p.id || "").startsWith("raza:"));
  const otras = todas.filter((p) => !String(p.id || "").startsWith("raza:"));
  const vistas = new Set<string>();
  return [...raciales, ...otras].filter((p) => {
    const nombre = (p.nombre || "").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
    if (vistas.has(nombre)) return false;
    vistas.add(nombre);
    return true;
  });
}

export function reglas(m: Combatiente) {
  const todas = [
    ...(m.configuracion.reglas_pasivas || []),
    ...pasivasAplicables(m).flatMap((p) => p.reglas || []),
    ...Object.values(piezas(m)).filter(p=>!requisitosFuente(m,p).length).flatMap((p) => p.reglas_pasivas || []),
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
  const excluidos=new Set(Object.entries(m.configuracion.equipamiento||{}).filter(([,p])=>requisitosFuente(m,p).length).map(([slot])=>slot));
  if(m.arma)for(const slot of m.arma.efecto.arma_slot==='dos_manos'?['mano_der','mano_izq']:[m.arma.slot])excluidos.add(slot);
  for(const slot of excluidos)for(const [k,v] of Object.entries(m.configuracion.equipamiento?.[slot]?.stats||{}))if(k in s&&!['peso','durabilidad','dano','caras_dano','dados_dano'].includes(k))s[k]-=v;
  for (const r of reglas(m))
    if (r.evento === "permanente" && cumple(m, r))
      for (const [k, v] of Object.entries(r.bonos)) s[k] = (s[k] || 0) + v;
  for (const e of m.estados)
    for (const [k, v] of Object.entries(e.bonos || {})) s[k] = (s[k] || 0) + v;
  for (const mod of m.motor?.modificadores || [])
    for (const cambio of mod.cambios) {
      const anterior = s[cambio.atributo] || 0;
      s[cambio.atributo] = cambio.operacion === 'sumar' ? anterior + cambio.valor : cambio.operacion === 'multiplicar' ? anterior * cambio.valor : cambio.valor;
    }
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
    nivel?: number;
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
    stats: { ...f.stats, nivel: f.nivel ?? f.stats.nivel ?? 1 },
    nivel: f.nivel ?? f.stats.nivel ?? 1,
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
  m.configuracion.reserva ||= [...new Map(Object.values(m.configuracion.equipamiento||{}).filter(p=>p.id).map(p=>[p.id,p])).values()];
  for(const p of Object.values(m.configuracion.equipamiento||{})){const faltan=requisitosFuente(m,p);if(faltan.length)throw Error(`${p.nombre}: ${faltan.join('; ')}`);}
  n.miembros.push(m);
  activarEquipo(n,m,rng);
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
  const cayo = perdido > 0 && t.vida <= 0;
  log(c, `${t.nombre} recibe ${perdido} daño; vida ${t.vida}.`);
  if (perdido > 0) {
    activarReglas(c, a, t, alDano, rng);
    emitirMotor(c, 'recibir_dano', t, a, t, rng, e, perdido);
    if (a.id !== t.id) emitirMotor(c, 'causar_dano', a, a, t, rng, e, perdido);
    if (cayo && t.vida <= 0) {
      emitirMotor(c, 'morir', t, a, t, rng, e, perdido);
      if (a.id !== t.id && a.bando !== t.bando) emitirMotor(c, 'matar', a, a, t, rng, e, perdido);
    }
  }
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
  emitirMotor(c, 'inicio_turno', m, m, m, rng);
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
  for (const m of n.miembros) emitirMotor(n, 'inicio_combate', m, m, m, rng);
  const vivo = orden(n).find(m=>m.vida>0);
  if (!vivo) { n.fase='finalizado'; limpiarFinal(n); return n; }
  entrar(n, vivo, rng);
  return n;
}
function siguienteInterno(c: Combate, rng: RNG) {
  if (c.fase !== "en_curso") throw Error("Inicia el combate.");
  const n = copia(c),
    a = n.miembros.find((m) => m.id === n.actual);
  delete n.resultado;
  if (a) {
    emitirMotor(n, 'fin_turno', a, a, a, rng);
    caducarMotor(n,a,rng);
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
  if (c.progreso_confirmado) throw Error("El progreso ya fue aplicado a las fichas.");
  if (!previo) throw Error("No hay una acción anterior.");
  return { ...copia(previo), historial: h };
}
function limpiarFinal(n:Combate){for(const m of n.miembros){emitirMotor(n,'fin_combate',m,m,m,dadoSeguro);m.estados=[];if(m.motor){m.motor.modificadores=[];m.motor.habilidades=[];}delete m.arma;normalizar(m);}log(n,'Combate terminado: los estados temporales y armas efímeras desaparecen.');}
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
    const p = ['mano_der','mano_izq'].map(slot=>piezas(m)[slot]).find(p=>p?.efectos?.some(e=>e.efecto==='dano'));
    if (p) lista.push({id:'ataque',nombre:`Atacar con ${p.nombre}`,efecto:p.efectos!.find(e=>e.efecto==='dano')!,enfriamiento:0});
    else if (manosLibres(m)>0) lista.push({id:'ataque',nombre:'Ataque desarmado',efecto:basico(),enfriamiento:0});
  }
  if ((m.arma || lista.some(a=>a.id==='ataque'&&a.efecto.id!=='basico')) && manosLibres(m)>0)
    lista.push({id:'desarmado',nombre:'Ataque desarmado · mano libre',efecto:basico(),enfriamiento:0});
  for (const h of (m.configuracion.habilidades || []).filter(h=>!requisitosFuente(m,h).length))
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
  for (const [slot, p] of Object.entries(piezas(m)).filter(([,p])=>!requisitosFuente(m,p).length))
    for (const e of p.efectos || [])
      lista.push({
        id: `equipo:${slot}:${e.id}`,
        nombre: `${p.nombre} · ${e.nombre}`,
        efecto: e,
        enfriamiento: 0,
      });
  for (const h of m.motor?.habilidades || []) lista.push({id:`motor-hab:${h.id}`,nombre:h.accion.nombre,efecto:h.accion,enfriamiento:0});
  for (const {clave, regla} of reglasMotor(m)) if (regla.evento === 'usar') lista.push({id:`regla:${clave}`,nombre:regla.nombre,efecto:{...basico(),efecto:'estado',estado:regla.nombre,cantidad:0,coste_ph:regla.coste_ph,coste_fatiga:regla.coste_fatiga},enfriamiento:regla.enfriamiento,regla:clave});
  return lista.filter(a=>!a.efecto.requisito_forma || (estadisticas(m)[a.efecto.requisito_forma.atributo]||0)>=a.efecto.requisito_forma.minimo);
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
  if (accionId.startsWith('regla:')) {
    const clave = accionId.slice(6), entrada = reglasMotor(a).find(r=>r.clave===clave);
    if (!entrada || entrada.regla.evento !== 'usar') throw Error('La regla activa no existe.');
    const t = n.miembros.find(m=>m.id===objetivoId) || a;
    ejecutarRegla(n,a,entrada.clave,entrada.regla,a,t,rng,undefined,0,true);
    a.accion_usada=true;
    return n;
  }
  if (accionId === "guardia") {
    estado(a, "guardia", "Guardia", 1, { armadura: 2 }, { inicio: true });
    a.accion_usada = true;
    return n;
  }
  const act = acciones(a).find((v) => v.id === accionId);
  if (!act) throw Error("La acción no existe.");
  if ((a.cooldowns[act.id] || 0) > 0) throw Error("Habilidad en enfriamiento.");
  let e = act.efecto;
  const
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
    if (e.tabla_armas) {
      const tabla = e.tabla_armas;
      if (!Number.isInteger(tabla.caras) || tabla.caras < 2 || tabla.caras > 100 || !Array.isArray(tabla.resultados) || tabla.resultados.length !== tabla.caras || new Set(tabla.resultados.map(r=>r.cara)).size !== tabla.caras || tabla.resultados.some(r=>!Number.isInteger(r.cara)||r.cara<1||r.cara>tabla.caras)) throw Error('La tabla de armas está incompleta.');
      const cara = dados(n, 1, tabla.caras, rng, 'Creación de arma');
      const r = tabla.resultados.find(r=>r.cara===cara);
      if (!r || !r.nombre?.trim() || !Number.isInteger(r.cantidad) || r.cantidad<1 || r.cantidad>100 || !Number.isInteger(r.caras) || r.caras<2 || r.caras>1000 || !Number.isInteger(r.modificador) || Math.abs(r.modificador)>1000000 || !['mano_der','mano_izq','dos_manos'].includes(r.arma_slot)) throw Error('Arma del resultado inválida.');
      e = {...e, tabla_armas:undefined, arma_nombre:r.nombre, cantidad:r.cantidad, caras:r.caras, modificador:r.modificador, tipo_dano:r.tipo_dano, elemento:r.elemento, arma_slot:r.arma_slot};
      log(n, `${act.nombre}: d${tabla.caras} → ${cara}: ${r.nombre}.`);
    }
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
  emitirMotor(n, 'atacar', a, a, t, rng, e);
  if (a.vida <= 0) return n;
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
  if (!acierta) { emitirMotor(n, 'fallar', a, a, t, rng, e); return n; }
  emitirMotor(n, 'impactar', a, a, t, rng, e);
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


// Runtime serializable: se guarda junto al encuentro y participa en Deshacer.
export type EstadoMotor = {
 modificadores: {origen?:string;clave:string;nombre:string;creado:number;duracion:number;cambios:{atributo:string;operacion:'sumar'|'multiplicar'|'fijar';valor:number}[]}[];
 habilidades: {origen?:string;id:string;clave:string;creado:number;duracion:number;accion:Efecto}[];
 usos: Record<string,number>; proximos: Record<string,number>;
 progreso: {id:string;atributo:string;delta:number;regla:string}[];
};
function motor(m:Combatiente):EstadoMotor {return m.motor ||= {modificadores:[],habilidades:[],usos:{},proximos:{},progreso:[]};}
export function reglasMotor(m:Combatiente) {
 const fuentes = [
  {id:'propio',reglas:m.configuracion.reglas||[]},
  ...pasivasAplicables(m).map((p,i)=>({id:`pasiva:${p.id||i}`,reglas:p.reglas_motor||[]})),
  ...(m.configuracion.habilidades||[]).filter(p=>!requisitosFuente(m,p).length).map((p,i)=>({id:`hab:${p.id||i}`,reglas:p.reglas||[]})),
  ...Object.entries(piezas(m)).filter(([,p])=>!requisitosFuente(m,p).length).map(([slot,p])=>({id:`equipo:${p.id||slot}`,reglas:p.reglas||[]})),
 ];
 const vistos=new Set<string>();
 return fuentes.flatMap(f=>f.reglas.map(regla=>({clave:`${f.id}:${regla.id}`,regla}))).filter(r=>{if(vistos.has(r.clave))return false;vistos.add(r.clave);return true;}).sort((a,b)=>b.regla.prioridad-a.regla.prioridad||a.clave.localeCompare(b.clave));
}
type ContextoMotor = {c:Combate;yo:Combatiente;actor:Combatiente;objetivo:Combatiente;rng:RNG;efecto?:Efecto;cantidad:number;profundidad:number;fuente?:string;estado_terminado?:string};
function sujetoMotor(ctx:ContextoMotor,s:Sujeto) {return s==='actor'?ctx.actor:s==='objetivo'?ctx.objetivo:ctx.yo;}
function valorMotor(v:ValorRegla|undefined,ctx:ContextoMotor):number {
 if(typeof v==='number')return v;
 if(!v)return 0;
 const m=sujetoMotor(ctx,v.desde||'yo');
 const n=(v.bono||0)+(v.dados?dados(ctx.c,v.dados,v.caras||6,ctx.rng,'Regla'):0)+(v.atributo?(estadisticas(m)[v.atributo]||0):0)+(v.evento?ctx.cantidad:0);
 const total=n*(v.escala??1);
 if(!Number.isFinite(total)||Math.abs(total)>100000000)throw Error('La fórmula produjo un valor fuera de rango.');
 return total;
}
function tieneMotor(m:Combatiente,clave:string){return m.estados.some(e=>e.tipo===clave||e.nombre===clave)||!!m.motor?.modificadores.some(e=>e.clave===clave);}
function condicionMotor(c:CondicionRegla,ctx:ContextoMotor):boolean {
 if(ctx.profundidad>8)throw Error('Demasiados niveles de reglas.');
 const sub={...ctx,profundidad:ctx.profundidad+1};
 switch(c.tipo){
  case 'siempre':return true;
  case 'estado_terminado':return ctx.estado_terminado===c.clave;
  case 'todas':return c.condiciones.every(x=>condicionMotor(x,sub));
  case 'alguna':return c.condiciones.some(x=>condicionMotor(x,sub));
  case 'no':return !condicionMotor(c.condicion,sub);
  case 'estado':return tieneMotor(sujetoMotor(ctx,c.sujeto),c.estado);
  case 'elemento':return elementoDe(ctx.efecto)===c.elemento;
  case 'probabilidad':return ctx.rng(100)<=c.porcentaje;
  case 'comparar':{
   const m=sujetoMotor(ctx,c.sujeto),s=estadisticas(m);
   const actual=c.atributo==='vida_actual'?m.vida:c.atributo==='ph_actual'?m.ph:c.atributo==='fatiga_actual'?m.fatiga:s[c.atributo]||0;
   const max=c.atributo==='vida_actual'?maxVida(m):c.atributo==='ph_actual'?s.ph:c.atributo==='fatiga_actual'?s.fatiga:100;
   const a=c.porcentaje?(max?actual/max*100:0):actual;
   return c.operador==='<'?a<c.valor:c.operador==='<='?a<=c.valor:c.operador==='>'?a>c.valor:c.operador==='>='?a>=c.valor:a===c.valor;
  }
 }
}
let profundidadMotor=0;
function emitirMotor(c:Combate,evento:EventoRegla,yo:Combatiente,actor:Combatiente,objetivo:Combatiente,rng:RNG,efecto?:Efecto,cantidad=0,estadoTerminado?:string){
 if(profundidadMotor>=8){log(c,'Se detuvo una cadena de reglas al alcanzar 8 eventos.');return;}
 profundidadMotor++;
 try {for(const {clave,regla} of reglasMotor(yo))if(regla.evento===evento)ejecutarRegla(c,yo,clave,regla,actor,objetivo,rng,efecto,cantidad,false,estadoTerminado);} finally {profundidadMotor--;}
}
function ejecutarRegla(c:Combate,yo:Combatiente,clave:string,r:Regla,actor:Combatiente,objetivo:Combatiente,rng:RNG,efecto?:Efecto,cantidad=0,manual=false,estadoTerminado?:string){
 const ctx:ContextoMotor={c,yo,actor,objetivo,rng,efecto,cantidad,profundidad:0,fuente:clave.startsWith('equipo:')?clave.split(':').slice(0,2).join(':'):undefined,estado_terminado:estadoTerminado},m=motor(yo);
 const error=!condicionMotor(r.condicion,ctx)?'No se cumplen las condiciones.':r.usos>0&&(m.usos[clave]||0)>=r.usos?'Sin usos restantes.':(m.proximos[clave]||0)>yo.turnos?'Regla en enfriamiento.':yo.ph<r.coste_ph?'PH insuficientes.':r.coste_fatiga>0&&(yo.agotado||yo.fatiga+r.coste_fatiga>(estadisticas(yo).fatiga||0))?'Fatiga insuficiente.':'';
 if(error){if(manual)throw Error(error);return;}
 yo.ph-=r.coste_ph;yo.fatiga+=r.coste_fatiga;
 if(r.coste_fatiga){yo.uso_fatiga=true;if(yo.fatiga>=(estadisticas(yo).fatiga||0))yo.agotado=true;}
 m.usos[clave]=(m.usos[clave]||0)+1;m.proximos[clave]=yo.turnos+r.enfriamiento+1;
 // Sin enfriamiento, distintas muertes durante un mismo turno sí cuentan.
 if(!r.enfriamiento)m.proximos[clave]=yo.turnos;
 log(c,`${yo.nombre} · ${r.nombre}`);
 efectosMotor(r.efectos,ctx,clave);
}
function efectosMotor(efectos:EfectoRegla[],ctx:ContextoMotor,origen:string){
 if(ctx.profundidad>8)throw Error('Demasiadas ramas de efectos.');
 for(const [indice,e] of efectos.entries()){
  const destinos=['aliados','enemigos','todos'].includes(e.destino)?ctx.c.miembros.filter(m=>m.vida>0&&(e.destino==='todos'||(e.destino==='aliados'?m.bando===ctx.yo.bando:m.bando!==ctx.yo.bando))):[sujetoMotor(ctx,e.destino as Sujeto)];
  for(const t of destinos){
   const v=()=>valorMotor(e.valor,ctx),m=motor(t),clave=e.clave||`${origen}:${indice}`;
   switch(e.tipo){
    case 'salvacion':case 'condicional':{
     const exito=e.tipo==='salvacion'?salvacion(ctx.c,t,e.cd||12,e.atributo||'salvacion',ctx.rng):condicionMotor(e.condicion||{tipo:'siempre'},ctx);
     efectosMotor((exito?e.exito:e.fallo)||[],{...ctx,objetivo:t,profundidad:ctx.profundidad+1},`${origen}:${indice}:${exito}`);break;
    }
    case 'perder_accion':t.accion_usada=true;log(ctx.c,`${t.nombre} pierde su acción del turno.`);break;
    case 'mensaje':log(ctx.c,`${t.nombre}: ${e.nombre||'Efecto activado'}`);break;
    case 'curar':t.vida=Math.min(maxVida(t),t.vida+Math.max(0,v()));break;
    case 'ph':t.ph+=v();break;
    case 'fatiga':{const n=v();if(n>0||!t.agotado)t.fatiga+=n;if(t.fatiga>=(estadisticas(t).fatiga||0)&&t.fatiga>0)t.agotado=true;break;}
    case 'dano':{
     const antes=t.vida,perdido=Math.min(antes,Math.max(0,v()));t.vida-=perdido;log(ctx.c,`${t.nombre}: ${perdido} daño directo por regla (sin impacto ni ARM).`);
     if(perdido>0){emitirMotor(ctx.c,'recibir_dano',t,ctx.yo,t,ctx.rng,undefined,perdido);if(t.id!==ctx.yo.id)emitirMotor(ctx.c,'causar_dano',ctx.yo,ctx.yo,t,ctx.rng,undefined,perdido);}
     if(antes>0&&t.vida<=0){emitirMotor(ctx.c,'morir',t,ctx.yo,t,ctx.rng);if(t.id!==ctx.yo.id&&t.bando!==ctx.yo.bando)emitirMotor(ctx.c,'matar',ctx.yo,ctx.yo,t,ctx.rng);}break;
    }
    case 'quitar_estado':m.modificadores=m.modificadores.filter(x=>x.clave!==clave);m.habilidades=m.habilidades.filter(x=>x.clave!==clave);t.estados=t.estados.filter(x=>x.tipo!==clave&&x.nombre!==clave);break;
    case 'habilidad':if(e.accion){m.habilidades=m.habilidades.filter(x=>x.id!==`${origen}:${indice}`);m.habilidades.push({origen:ctx.fuente,id:`${origen}:${indice}`,clave,accion:copia(e.accion),duracion:e.duracion||0,creado:t.turnos});}break;
    case 'estado':case 'transformar':case 'atributo':{
     const cambios=e.tipo==='atributo'?[{atributo:e.atributo||'vida',operacion:e.operacion||'sumar' as const,valor:v()}]:e.tipo==='transformar'?(e.cambios||[]).map(x=>({...x,valor:valorMotor(x.valor,ctx)})):[];
     if(e.permanente){for(const cambio of cambios){let delta=cambio.valor;
      if(e.limite){const ganado=m.progreso.filter(x=>x.regla===clave&&x.atributo===cambio.atributo).reduce((a,x)=>a+x.delta,0);delta=Math.max(0,Math.min(delta,e.limite-ganado));}
      if(delta){t.stats[cambio.atributo]=(t.stats[cambio.atributo]||0)+delta;m.progreso.push({id:crypto.randomUUID(),atributo:cambio.atributo,delta,regla:clave});log(ctx.c,`${t.nombre}: ${cambio.atributo} ${delta>0?'+':''}${delta} permanente.`);}
     }}else{
      if(!e.acumular)m.modificadores=m.modificadores.filter(x=>x.clave!==clave);
      if(!e.limite||m.modificadores.filter(x=>x.clave===clave).length<e.limite)m.modificadores.push({origen:ctx.fuente,clave,nombre:e.nombre||clave,creado:t.turnos,duracion:e.duracion||0,cambios});
     }break;
    }
   }
   normalizar(t);
  }
 }
}
function caducarMotor(c:Combate,m:Combatiente,rng:RNG){if(!m.motor)return;
 const terminados:string[]=[];
 m.motor.modificadores=m.motor.modificadores.filter(x=>{if(x.duracion===0||x.creado>=m.turnos||--x.duracion>0)return true;terminados.push(x.clave);return false;});
 m.motor.habilidades=m.motor.habilidades.filter(x=>x.duracion===0||x.creado>=m.turnos||--x.duracion>0);
 for(const clave of new Set(terminados))if(!m.motor.modificadores.some(x=>x.clave===clave))emitirMotor(c,'fin_efecto',m,m,m,rng,undefined,0,clave);
}

export const ESPACIOS_EQUIPO:Record<string,{nombre:string;tipos:string[]}>= {
 casco:{nombre:'Cabeza',tipos:['casco']},pechera:{nombre:'Torso',tipos:['pechera']},pantalones:{nombre:'Piernas',tipos:['pantalones']},zapatos:{nombre:'Botas',tipos:['zapatos']},capa:{nombre:'Capa',tipos:['capa']},
 mano_der:{nombre:'Mano derecha',tipos:['mano','dos_manos']},mano_izq:{nombre:'Mano izquierda',tipos:['mano','dos_manos']},
 ...Object.fromEntries(Array.from({length:6},(_,i)=>[`acc_${i+1}`,{nombre:`Accesorio ${i+1}`,tipos:['accesorio']}])),titulo:{nombre:'Título',tipos:['titulo']}
};
export function manosLibres(m:Combatiente):number {
 if(m.arma?.efecto.arma_slot==='dos_manos')return 0;
 const equipo={...piezas(m)};
 if(Object.values(equipo).some(p=>p.slot_tipo==='dos_manos'))return 0;
 if(m.arma)equipo[m.arma.slot]={nombre:m.arma.nombre,stats:{}};
 return Number(!equipo.mano_der)+Number(!equipo.mano_izq);
}
function activarEquipo(c:Combate,m:Combatiente,rng:RNG,ids?:Set<string>){
 for(const {clave,regla} of reglasMotor(m))if(regla.evento==='equipar'&&clave.startsWith('equipo:')&&(!ids||ids.has(clave.split(':')[1])))ejecutarRegla(c,m,clave,regla,m,m,rng);
}
export function seleccionEquipo(m:Combatiente):Record<string,string>{return Object.fromEntries(Object.entries(m.configuracion.equipamiento||{}).filter(([,p])=>p.id).map(([slot,p])=>[slot,p.id!]));}
export function cambiarEquipo(c:Combate,actorId:string,seleccion:Record<string,string>,rng:RNG=dadoSeguro):Combate {
 return registrar(c,()=>{
  const n=copia(c),m=n.miembros.find(v=>v.id===actorId);
  if(!m)throw Error('Personaje inexistente.');
  if(n.fase==='finalizado')throw Error('El encuentro ha terminado.');
  if(n.fase==='en_curso'&&(n.actual!==m.id||m.accion_usada||m.vida<=0))throw Error('Cambiar equipo requiere tu turno y una acción disponible.');
  const anterior=m.configuracion.equipamiento||{},reserva=new Map([...(m.configuracion.reserva||[]),...Object.values(anterior)].filter(p=>p.id).map(p=>[p.id!,p]));
  const elegido:Record<string,Fuente>={},usados=new Set<string>();
  for(const [slot,id] of Object.entries(seleccion)){
   if(!id)continue;
   const espacio=ESPACIOS_EQUIPO[slot],pieza=reserva.get(id);
   if(!espacio||!pieza||(pieza.tipo_creacion&&!['objeto','titulo'].includes(pieza.tipo_creacion))||!espacio.tipos.includes(pieza.slot_tipo||'ninguno'))throw Error('Objeto incompatible o fuera del inventario.');
   if(usados.has(id))throw Error('Una misma pieza no puede ocupar dos espacios.');usados.add(id);const faltan=requisitosFuente(m,pieza);if(faltan.length)throw Error(`${pieza.nombre}: ${faltan.join('; ')}`);elegido[slot]=pieza;
  }
  if((elegido.mano_der?.slot_tipo==='dos_manos'&&elegido.mano_izq)||(elegido.mano_izq?.slot_tipo==='dos_manos'&&elegido.mano_der))throw Error('Un arma de dos manos ocupa ambas manos.');
  if(JSON.stringify(Object.entries(seleccionEquipo(m)).sort())===JSON.stringify(Object.entries(seleccion).filter(([,id])=>id).sort()))throw Error('No hay cambios de equipamiento.');
  const antiguos=new Set(Object.values(anterior).map(p=>p.id).filter(Boolean)),nuevos=new Set(Object.values(elegido).map(p=>p.id).filter(Boolean));
  for(const {clave,regla} of reglasMotor(m))if(regla.evento==='desequipar'&&clave.startsWith('equipo:')&&!nuevos.has(clave.split(':')[1]))ejecutarRegla(n,m,clave,regla,m,m,rng);
  if(m.motor){
   const retirar=(origen?:string)=>!!origen&&origen.startsWith('equipo:')&&!nuevos.has(origen.slice(7));
   m.motor.modificadores=m.motor.modificadores.filter(x=>!retirar(x.origen));
   m.motor.habilidades=m.motor.habilidades.filter(x=>!retirar(x.origen));
  }
  const bonos=(equipo:Record<string,Fuente>)=>{const b:Record<string,number>={};for(const p of Object.values(equipo))for(const [k,v] of Object.entries(p.stats||{}))if(!['peso','durabilidad','dados_dano','caras_dano','dano'].includes(k))b[k]=(b[k]||0)+v;return b;};
  const viejos=bonos(anterior),actuales=bonos(elegido);
  for(const k of new Set([...Object.keys(viejos),...Object.keys(actuales)]))m.stats[k]=(m.stats[k]||0)-(viejos[k]||0)+(actuales[k]||0);
  const cambianManos=['mano_der','mano_izq'].some(k=>anterior[k]?.id!==elegido[k]?.id);
  if(cambianManos)delete m.arma;
  m.configuracion.habilidades=m.configuracion.habilidades?.filter(h=>!h.id||!reserva.has(h.id)||['habilidad','pasiva'].includes(reserva.get(h.id)?.tipo_creacion||''));
  m.configuracion.equipamiento=elegido;m.configuracion.bonos_equipamiento=actuales;m.configuracion.reserva=[...reserva.values()];
  activarEquipo(n,m,rng,new Set([...nuevos].filter((id):id is string=>!!id&&!antiguos.has(id))));
  normalizar(m);
  if(n.fase==='en_curso')m.accion_usada=true;
  log(n,`${m.nombre} cambia su equipamiento${n.fase==='en_curso'?' y consume su acción':''}. Manos libres: ${manosLibres(m)}.`);
  return n;
 });
}

export function accionesObjeto(m:Combatiente,p:Fuente):{id:string;nombre:string;coste_ph:number;coste_fatiga:number}[]{
 if(p.tipo_creacion&&p.tipo_creacion!=='objeto')return [];
 if(requisitosFuente(m,p).length)return [];
 const equipado=Object.values(m.configuracion.equipamiento||{}).some(v=>v.id===p.id);
 if(!equipado&&!p.consumible&&p.slot_tipo&&p.slot_tipo!=='ninguno')return [];
 return [...(p.efectos||[]).filter(e=>!e.requisito_forma||(estadisticas(m)[e.requisito_forma.atributo]||0)>=e.requisito_forma.minimo).map(e=>({id:e.id,nombre:e.nombre,coste_ph:e.coste_ph||0,coste_fatiga:e.coste_fatiga||0})),...(p.reglas||[]).filter(r=>r.evento==='usar').map(r=>({id:'regla:'+r.id,nombre:r.nombre,coste_ph:r.coste_ph,coste_fatiga:r.coste_fatiga}))];
}
export function usarObjeto(c:Combate,actorId:string,objetoId:string,efectoId:string,objetivoId:string,rng:RNG=dadoSeguro):Combate{
 return registrar(c,()=>{
  const n=copia(c),m=n.miembros.find(x=>x.id===actorId);
  if(!m||n.fase!=='en_curso'||n.actual!==m.id||m.accion_usada||m.vida<=0)throw Error('Usar un objeto requiere tu turno y una acción disponible.');
  const p=m.configuracion.reserva?.find(p=>p.id===objetoId);
  if(!p||!accionesObjeto(m,p).some(a=>a.id===efectoId))throw Error('Este objeto no está disponible o debes equiparlo primero.');
  const objetivo=n.miembros.find(v=>v.id===objetivoId);if(!objetivo||objetivo.vida<=0)throw Error('Selecciona un objetivo vivo.');
  const slot=Object.entries(m.configuracion.equipamiento||{}).find(([,v])=>v.id===p.id)?.[0];
  const temporal='inventario-'+p.id;
  if(!slot)(m.configuracion.habilidades||=[]).push({...p,id:temporal});
  const id=efectoId.startsWith('regla:')?`regla:${slot?'equipo:'+p.id:'hab:'+temporal}:${efectoId.slice(6)}`:slot?`equipo:${slot}:${efectoId}`:`hab:${temporal}:${efectoId}`;
  const resultado=actuarInterno(n,m.id,id,objetivoId,rng,false),actor=resultado.miembros.find(v=>v.id===actorId)!;
  actor.configuracion.habilidades=actor.configuracion.habilidades?.filter(h=>h.id!==temporal);
  if(p.consumible){
   actor.configuracion.reserva=actor.configuracion.reserva?.filter(v=>v.id!==p.id);
   actor.configuracion.consumidos=[...new Set([...(actor.configuracion.consumidos||[]),p.id!])];
   if(slot){
    // Solo los objetos no equipables deben marcarse consumibles.
    throw Error('Guarda el objeto antes de consumirlo.');
   }
   log(resultado,`${actor.nombre} consume ${p.nombre}.`);
  }else log(resultado,`${actor.nombre} usa ${p.nombre}.`);
  return resultado;
 });
}
