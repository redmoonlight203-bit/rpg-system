export interface CategoriaBase { id: string; clave: string; nombre: string; parent_id?: string | null }
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
