import { linaje, type CategoriaBase } from "./estadisticas";
export type Rango = { min: number; max: number };
export function rutaForja(categorias: CategoriaBase[], clave: string): string {
  const ruta = linaje(categorias, clave);
  return ruta.length ? ruta.map(c => c.nombre).join(" / ") : `Sin categoría disponible (${clave})`;
}
export function coincideClasificacion(categorias: CategoriaBase[], clave: string, filtro: string): boolean {
  return filtro === "todos" || clave === filtro || linaje(categorias, clave).some(c => c.clave === filtro);
}
export function validarValoresForja(valores: Record<string, number>, rangos?: Record<string, Rango>): string | null {
  if (Object.values(valores).some(v => !Number.isFinite(v))) return "Todos los atributos deben ser numéricos.";
  if (rangos) {
    if (!Object.keys(rangos).length) return "Configura al menos un atributo con rango para la malla.";
    for (const [clave, r] of Object.entries(rangos)) {
      if (!r || !Number.isFinite(r.min) || !Number.isFinite(r.max) || r.min > r.max || Math.abs(r.min)>1000000 || Math.abs(r.max)>1000000 || Math.abs(r.min*100-Math.round(r.min*100))>0.000001 || Math.abs(r.max*100-Math.round(r.max*100))>0.000001) return `Rango inválido para ${clave}: mínimo ≤ máximo y hasta dos decimales.`;
      if (["dados_dano","caras_dano"].includes(clave) && (!Number.isInteger(r.min) || !Number.isInteger(r.max) || r.min<1)) return `${clave} necesita cantidades enteras positivas.`;
    }
  } else {
    for (const clave of ["dados_dano","caras_dano"]) if (clave in valores && (!Number.isInteger(valores[clave]) || valores[clave]<1)) return `${clave} necesita una cantidad entera positiva.`;
  }
  return null;
}
