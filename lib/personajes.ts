import { atributosEfectivos, linaje, type CategoriaBase } from "./estadisticas";
export type Raza = CategoriaBase & {
  descripcion?: string;
  pasiva_racial?: { nombre: string; descripcion: string };
  /** Raza única aprobada: solo su dueño puede elegirla al crear un personaje. */
  raza_unica_de?: string | null;
};
export type Atributo = {
  categoria: string;
  clave: string;
  etiqueta: string;
  descripcion?: string;
  valor_defecto: number;
  limite_jugador: number | null;
};
export type Personaje = {
  id: number;
  user_id: string;
  nombre: string;
  raza: string;
  categoria_id: string | null;
  historia: string;
  defecto: string;
  lugar_reencarnacion: string;
  atributos: Record<string, number>;
  estado_vida: string;
  estado_aprobacion: string;
  comentarios_kuroi?: string;
  vida_actual: number | null;
  vida_maxima_actual?: number | null;
  ph_actual: number | null;
  fatiga_actual: number;
  nivel: number;
  exp_total: number;
  es_companero?: boolean;
  party_activo?: boolean;
  forja_origen_id?: string | null;
  imagen_url?: string | null;
};
export const LUGAR_INICIAL = "Montaña Shiro (Prueba de vida)";
export const LUGAR_RAZA_UNICA = "Lo decide el GM";
export type EstadoPropuestaRaza = "borrador" | "propuesta" | "aprobada" | "rechazada";
export type AtributoPropuesto = { valor_defecto: number; limite_jugador: number | null };
export type PropuestaRaza = {
  id: string;
  user_id: string;
  estado: EstadoPropuestaRaza;
  nombre: string;
  descripcion: string;
  icono: string | null;
  imagen_url: string | null;
  atributos: Record<string, AtributoPropuesto>;
  pasiva_racial: { nombre: string; descripcion: string; reglas: unknown[]; reglas_pasivas: unknown[] } | null;
  advertencia_aceptada: boolean;
  comentarios_kuroi: string;
  categoria_id: string | null;
  created_at: string;
};
/** Razas que este jugador puede elegir: las de lista y sus propias razas únicas. */
export function razasDisponibles(c: Raza[], usuario: string | null | undefined) {
  return razasVivas(c).filter((x) => !x.raza_unica_de || x.raza_unica_de === usuario);
}
/** Atributos base que puede fijar una raza única: los de la raíz «razas». */
export function atributosBaseRaza(a: Atributo[]) {
  return a.filter((s) => s.categoria === "razas");
}
export function atributosPropuestaIniciales(a: Atributo[]): Record<string, AtributoPropuesto> {
  return Object.fromEntries(
    atributosBaseRaza(a).map((s) => [
      s.clave,
      { valor_defecto: Number(s.valor_defecto) || 0, limite_jugador: s.limite_jugador == null ? null : Number(s.limite_jugador) },
    ]),
  );
}
/** Validación previa al envío; la base de datos repite estas comprobaciones. */
export function validarPropuestaRaza(
  p: Pick<PropuestaRaza, "nombre" | "descripcion" | "imagen_url" | "atributos" | "pasiva_racial">,
  base: Atributo[],
  enviar: boolean,
  acepta: boolean,
): string | null {
  const nombre = p.nombre.trim();
  if (!nombre || nombre.length > 100) return "Ponle un nombre a la raza (máximo 100 caracteres).";
  if (p.descripcion.length > 4000) return "La descripción es demasiado larga.";
  const claves = new Set(atributosBaseRaza(base).map((s) => s.clave));
  for (const [k, v] of Object.entries(p.atributos)) {
    if (!claves.has(k)) return `El atributo ${k} no existe en Reglas y estadísticas.`;
    if (!Number.isFinite(v.valor_defecto) || v.valor_defecto < 0 || v.valor_defecto > 1_000_000)
      return `Revisa el valor de ${k}.`;
    if (v.limite_jugador != null && (!Number.isFinite(v.limite_jugador) || v.limite_jugador < v.valor_defecto || v.limite_jugador > 1_000_000))
      return `El límite de ${k} no puede ser menor que su valor base.`;
  }
  const pas = p.pasiva_racial;
  if (pas && (!pas.nombre.trim() || pas.reglas.length + pas.reglas_pasivas.length === 0))
    return "La pasiva racial necesita nombre y al menos una regla.";
  if (enviar) {
    if (!acepta) return "Lee y acepta la advertencia antes de enviar.";
    if (!p.imagen_url) return "Cada raza nueva necesita su imagen. Súbela antes de enviar.";
    if (!((p.atributos.vida?.valor_defecto ?? p.atributos.hp?.valor_defecto ?? 0) > 0))
      return "La raza necesita vida mayor que cero.";
  }
  return null;
}
export function razasVivas(c: Raza[]) {
  return c.filter((x) => linaje(c, x.clave).some((p) => p.clave === "razas"));
}
export function definiciones(c: Raza[], a: Atributo[], id: string) {
  const raza = c.find((x) => x.id === id);
  return raza ? atributosEfectivos(c, a, raza.clave) : [];
}
export function valoresIniciales(a: Atributo[]) {
  return Object.fromEntries(
    a.map((s) => [s.clave, Number(s.valor_defecto) || 0]),
  );
}
export function vidaMaxima(p: Pick<Personaje, "atributos">) {
  return Math.max(1, Number(p.atributos.vida ?? p.atributos.hp ?? 1));
}
