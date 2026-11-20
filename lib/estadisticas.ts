import type {Regla} from './reglas';
import type {ReglaPasiva} from './pasivas';
export interface CategoriaBase { pasiva_racial?: {nombre:string; reglas?:Regla[]; reglas_pasivas?:ReglaPasiva[]} | null; id: string; clave: string; nombre: string; parent_id?: string | null; icono?: string | null; imagen_url?: string | null }
export interface AtributoBase { clave: string; categoria: string; valor_defecto?: number | null }

/** Root first, selected category last. Old rows without parent_id remain standalone. */
export function linaje(categorias: CategoriaBase[], clave: string): CategoriaBase[] {
  const resultado: CategoriaBase[] = [], vistos = new Set<string>();
  let actual = categorias.find(c => c.clave === clave);
  while (actual && !vistos.has(actual.id)) {
    vistos.add(actual.id); resultado.unshift(actual);
    actual = categorias.find(c => c.id === actual?.parent_id);
  }
  return resultado;
}

/** A local definition replaces an inherited definition with the same key. */
export function atributosEfectivos<T extends AtributoBase>(categorias: CategoriaBase[], stats: T[], clave: string): T[] {
  const resultado = new Map<string, T>();
  for (const categoria of linaje(categorias, clave)) {
    for (const stat of stats) if (stat.categoria === categoria.clave) resultado.set(stat.clave, stat);
  }
  return [...resultado.values()];
}
export function padreValido(categorias: CategoriaBase[], categoriaId: string | undefined, padreId: string): boolean {
  if (!padreId) return true;
  const padre = categorias.find(c => c.id === padreId);
  if (!padre) return false;
  return !linaje(categorias, padre.clave).some(c => c.id === categoriaId);
}

/** Imagen de raza (design.md v3): la de la categoría o la de su ancestro más cercano, sin contar la raíz «razas». */
export function imagenDeRaza(categorias: CategoriaBase[], clave: string | null | undefined): string | undefined {
  if (!clave) return undefined;
  const cadena = linaje(categorias, clave);
  for (let i = cadena.length - 1; i >= 0; i--) {
    const c = cadena[i];
    if (c.clave !== 'razas' && c.imagen_url) return c.imagen_url;
  }
  return undefined;
}

export function perfilRacial(categorias:CategoriaBase[],clave:string) {
  const camino=linaje(categorias,clave);
  return {
    linaje:camino.flatMap(c=>[c.clave,c.nombre]),
    raciales:camino.some(c=>c.clave==='razas') ? camino.flatMap(c=>c.pasiva_racial?[{
      id:'raza:'+c.id,nombre:c.pasiva_racial.nombre,reglas:c.pasiva_racial.reglas_pasivas||[],
      reglas_motor:c.pasiva_racial.reglas||[],
    }]:[]) : [],
  };
}
