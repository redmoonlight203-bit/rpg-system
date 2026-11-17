export type ReglaPasiva = {
  id: string;
  nombre: string;
  condicion:
    | "siempre"
    | "vida_mitad"
    | "sin_arma"
    | "ataque_magico"
    | "ataque_natural"
    | "ataque_elemental";
  evento:
    | "permanente"
    | "inicio_turno"
    | "recibir_ataque"
    | "recibir_impacto"
    | "recibir_dano";
  bonos: Record<string, number>;
  curacion: number;
  recuperar_ph: number;
  reducir_fatiga: number;
  reduccion_pct?: number;
  elemento?: string;
  represalia_dados?: number;
  represalia_caras?: number;
};
export function validarPasivas(rs: ReglaPasiva[]) {
  if (rs.length > 20) return "Máximo veinte reglas.";
  for (const r of rs) {
    if (
      !r.nombre.trim() ||
      ![
        "siempre",
        "vida_mitad",
        "sin_arma",
        "ataque_magico",
        "ataque_natural",
        "ataque_elemental",
      ].includes(r.condicion) ||
      ![
        "permanente",
        "inicio_turno",
        "recibir_ataque",
        "recibir_impacto",
        "recibir_dano",
      ].includes(r.evento)
    )
      return "Configura nombre, condición y momento.";
    if (
      r.condicion.startsWith("ataque_") &&
      ["permanente", "inicio_turno"].includes(r.evento)
    )
      return "Las condiciones de ataque necesitan un evento reactivo.";
    if (
      Object.values(r.bonos).some(
        (v) => !Number.isFinite(v) || Math.abs(v) > 1000000,
      ) ||
      [r.curacion, r.recuperar_ph, r.reducir_fatiga].some(
        (v) => !Number.isFinite(v) || v < 0 || v > 1000000,
      )
    )
      return "Valores pasivos inválidos.";
    if (
      !Number.isFinite(r.reduccion_pct ?? 0) ||
      (r.reduccion_pct ?? 0) < 0 ||
      (r.reduccion_pct ?? 0) > 100
    )
      return "Reducción entre 0 y 100 %.";
    if (
      !Number.isInteger(r.represalia_dados ?? 0) ||
      (r.represalia_dados ?? 0) < 0 ||
      (r.represalia_dados ?? 0) > 100 ||
      !Number.isInteger(r.represalia_caras ?? 6) ||
      (r.represalia_caras ?? 6) < 2 ||
      (r.represalia_caras ?? 6) > 1000
    )
      return "Dados de represalia inválidos.";
    if (
      r.elemento &&
      ![
        "cualquiera",
        "fuego",
        "agua",
        "electricidad",
        "hielo",
        "luz_sagrada",
      ].includes(r.elemento)
    )
      return "Elemento pasivo inválido.";
  }
  return null;
}
/** Nombres legibles de los momentos y condiciones de una pasiva (frases del lienzo y fichas del editor). */
export const EVENTOS_PASIVA: Record<ReglaPasiva["evento"], string> = {
  permanente: "Mientras se cumpla",
  inicio_turno: "Al iniciar el turno",
  recibir_ataque: "Al ser atacado",
  recibir_impacto: "Al recibir un impacto",
  recibir_dano: "Al recibir daño",
};
export const CONDICIONES_PASIVA: Record<ReglaPasiva["condicion"], string> = {
  siempre: "siempre",
  vida_mitad: "con la mitad de vida o menos",
  sin_arma: "sin arma equipada",
  ataque_magico: "ante un ataque mágico",
  ataque_natural: "ante un ataque natural",
  ataque_elemental: "ante un ataque elemental",
};
