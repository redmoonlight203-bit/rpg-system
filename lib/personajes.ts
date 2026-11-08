import { atributosEfectivos, linaje, type CategoriaBase } from "./estadisticas";
export type Raza = CategoriaBase & {
  descripcion?: string;
  pasiva_racial?: { nombre: string; descripcion: string };
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
};
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
