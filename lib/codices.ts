import { SLOTS, type Efecto, type TipoCreacion } from "./creacion";
import type { ConfiguracionMonstruo } from "./monstruos";
import type { ReglaPasiva } from "./pasivas";

export type Codice = "bestiario" | "expediente" | "tarot" | "reliquia" | "sello" | "edicto" | "pergamino";

export function codiceDe(tipo: TipoCreacion | string, monstruo = false): Codice {
  switch (tipo) {
    case "personaje": return monstruo ? "bestiario" : "expediente";
    case "habilidad": return "tarot";
    case "objeto": return "reliquia";
    case "pasiva": return "sello";
    case "titulo": return "edicto";
    default: return "pergamino";
  }
}

const ROMANOS = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];

export function romano(n: number): string {
  return ROMANOS[n] ?? String(n);
}

export function arcanoDe(id: string): { numero: number; romano: string } {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const numero = (hash >>> 0) % 22;
  return { numero, romano: romano(numero) };
}

export type PaginaBestiario = {
  clave: "lamina" | "anatomia" | "variante" | "cronica" | "ficha";
  titulo: string;
  varianteId?: string;
};
export type DatosBestiario = {
  stats: number;
  habilidades: number;
  pasivas: number;
  equipo: number;
  variantes: { id: string; nombre: string }[];
  cronica: boolean;
};

export function paginasBestiario(d: DatosBestiario): PaginaBestiario[] {
  const paginas: PaginaBestiario[] = [{ clave: "lamina", titulo: "Lámina" }];
  if (d.habilidades || d.pasivas || d.equipo) {
    paginas.push({ clave: "anatomia", titulo: "Anatomía" });
  }
  for (const variante of d.variantes) {
    paginas.push({ clave: "variante", titulo: variante.nombre, varianteId: variante.id });
  }
  if (d.cronica) paginas.push({ clave: "cronica", titulo: "Crónica" });
  paginas.push({ clave: "ficha", titulo: "Ficha" });
  return paginas;
}

export type VarianteLegible = {
  id: string;
  nombre: string;
  probabilidad: number;
  bonos: [string, number][];
  habilidades: string[];
  pasivas: string[];
  equipo: { espacio: string; texto: string }[];
};

const nombreRanura = (clave: string) => SLOTS.find(s => s.clave === clave)?.nombre ?? clave;

export function variantesBestiario(config: ConfiguracionMonstruo | null | undefined, nombreDe: (id: string) => string | null): VarianteLegible[] {
  const variantes = config?.variantes ?? [];
  const total = variantes.reduce((suma, variante) => suma + variante.peso, 0);
  return variantes.map(variante => ({
    id: variante.id,
    nombre: variante.nombre,
    probabilidad: total ? Math.round(variante.peso / total * 1000) / 10 : 0,
    bonos: Object.entries(variante.bonos ?? {}).filter(([, valor]) => valor !== 0),
    habilidades: variante.habilidades ?? [],
    pasivas: variante.pasivas ?? [],
    equipo: Object.entries(variante.equipamiento ?? {}).map(([clave, equipo]) => {
      const rangos = Object.entries(equipo.rangos ?? {}).map(([atributo, { min, max }]) => atributo + " " + min + "–" + max);
      const texto = equipo.modo === "catalogo"
        ? equipo.opciones.map(id => nombreDe(id) ?? "Creación no disponible").join(" o ")
        : "Generado: " + (equipo.nombre || nombreRanura(clave)) + (rangos.length ? " (" + rangos.join(", ") + ")" : "");
      return { espacio: nombreRanura(clave), texto };
    }),
  }));
}

export type Vinculo = {
  id: string;
  nombre: string | null;
  tipo: "habilidad" | "pasiva" | "equipo";
  espacio?: string;
};
export type FuenteVinculos = {
  id: string;
  nombre: string;
  habilidades?: string[];
  pasivas?: string[];
  equipamiento?: Record<string, string>;
  configuracion_monstruo?: ConfiguracionMonstruo | null;
};

export function vinculosDe(item: FuenteVinculos, items: FuenteVinculos[]): Vinculo[] {
  const nombres = new Map(items.map(x => [x.id, x.nombre]));
  const vinculos = new Map<string, Vinculo>();
  function agregar(id: string, tipo: Vinculo["tipo"], clave?: string) {
    if (!id || vinculos.has(id)) return;
    vinculos.set(id, {
      id,
      nombre: nombres.get(id) ?? null,
      tipo,
      ...(clave ? { espacio: nombreRanura(clave) } : {}),
    });
  }
  for (const id of item.habilidades ?? []) agregar(id, "habilidad");
  for (const id of item.pasivas ?? []) agregar(id, "pasiva");
  for (const [clave, id] of Object.entries(item.equipamiento ?? {})) agregar(id, "equipo", clave);
  for (const variante of item.configuracion_monstruo?.variantes ?? []) {
    for (const id of variante.habilidades ?? []) agregar(id, "habilidad");
    for (const id of variante.pasivas ?? []) agregar(id, "pasiva");
    for (const [clave, equipo] of Object.entries(variante.equipamiento ?? {})) {
      if (equipo.modo === "catalogo") {
        for (const id of equipo.opciones) agregar(id, "equipo", clave);
      }
    }
  }
  return Array.from(vinculos.values());
}

export function portadoresDe(id: string, items: FuenteVinculos[]): { id: string; nombre: string }[] {
  // Solo interesa la identidad del vínculo; no hace falta resolver nombres de catálogo.
  return items
    .filter(item => item.id !== id && vinculosDe(item, []).some(vinculo => vinculo.id === id))
    .map(item => ({ id: item.id, nombre: item.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function avanzarRastro(rastro: string[], id: string, max = 8): string[] {
  const existente = rastro.indexOf(id);
  const siguiente = existente >= 0 ? rastro.slice(0, existente + 1) : [...rastro, id];
  return max > 0 ? siguiente.slice(-max) : [];
}

export const EVENTOS_PASIVA: Record<ReglaPasiva["evento"], string> = {
  permanente: "Siempre activa",
  inicio_turno: "Al iniciar turno",
  recibir_ataque: "Al recibir ataque",
  recibir_impacto: "Al recibir impacto",
  recibir_dano: "Al recibir daño",
};

export const CONDICIONES_PASIVA: Record<ReglaPasiva["condicion"], string> = {
  siempre: "Siempre",
  vida_mitad: "Vida a la mitad",
  sin_arma: "Sin arma",
  ataque_magico: "Ataque mágico",
  ataque_natural: "Ataque natural",
  ataque_elemental: "Ataque elemental",
};

export type PasoRitual = { tipo: "evento" | "condicion" | "efecto"; texto: string };

export function cadenaPasiva(r: ReglaPasiva, etiqueta: (clave: string) => string): PasoRitual[] {
  const pasos: PasoRitual[] = [
    { tipo: "evento", texto: EVENTOS_PASIVA[r.evento] },
    { tipo: "condicion", texto: CONDICIONES_PASIVA[r.condicion] },
  ];
  const efectos = [
    r.reduccion_pct ? "Reduce " + r.reduccion_pct + "% de daño" : "",
    r.curacion ? "Cura " + r.curacion : "",
    r.recuperar_ph ? "Recupera " + r.recuperar_ph + " PH" : "",
    r.reducir_fatiga ? "Reduce " + r.reducir_fatiga + " Fatiga" : "",
    r.represalia_dados ? "Represalia " + r.represalia_dados + "d" + r.represalia_caras : "",
    ...Object.entries(r.bonos ?? {}).filter(([, v]) => v !== 0).map(([k, v]) => etiqueta(k) + " " + (v > 0 ? "+" : "") + v),
  ];
  for (const texto of efectos) {
    if (texto) pasos.push({ tipo: "efecto", texto });
  }
  return pasos;
}

export function espacioDe(slotTipo: string): string | null {
  if (slotTipo === "mano") return "Mano";
  if (slotTipo === "dos_manos") return "Dos manos";
  if (slotTipo === "accesorio") return "Accesorio";
  return SLOTS.find(slot => slot.tipos.includes(slotTipo))?.nombre ?? null;
}

export function tirarPrueba(e: Pick<Efecto, "cantidad" | "caras" | "modificador">, rng = Math.random): { dados: number[]; total: number } {
  const cantidad = Math.min(100, Math.max(0, Math.trunc(e.cantidad || 0)));
  const caras = Math.max(1, Math.trunc(e.caras || 1));
  const dados = Array.from({ length: cantidad }, () => Math.max(1, Math.min(caras, 1 + Math.floor(rng() * caras))));
  return { dados, total: dados.reduce((suma, dado) => suma + dado, e.modificador || 0) };
}
