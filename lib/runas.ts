// Runas de sección (design.md v3 §4). Las imágenes las aporta el propietario en public/arte/runas/.
// Mientras una runa no esté en RUNAS_DISPONIBLES se muestra el kanji anterior, sin peticiones fallidas.

/** Kanji de respaldo por sección (el índice que usaba la v2). */
export const KANJI_RESPALDO: Record<string, string> = {
  forja: '鍛', combate: '戦', reglas: '規', experiencia: '経', arbol: '樹', estilos: '典', recompensas: '賞', party: '絆',
  personajes: '人', personaje: '人', mercado: '市', tienda: '市', 'tienda-almas': '魂', deudas: '借', arena: '闘', logros: '功',
  alma: '魂', tiradas: '賽', habilidades: '術', equipamiento: '装', inventario: '倉', panel: '主', tablero: '盤', mapas: '図',
  lore: '巻', codex: '典', creacion: '創', nexo: '主',
};

/** Secciones con runa ya entregada → archivo dentro de /arte/runas/. Añadir aquí cada runa que llegue. */
export const RUNAS_DISPONIBLES: Record<string, string> = {
  'nexo': 'nexo.png',
  'personajes': 'personajes.png',
  'personaje': 'personajes.png',
  'party': 'party.png',
  'combate': 'combate.png',
  'arena': 'arena.png',
  'tiradas': 'tiradas.png',
  'experiencia': 'experiencia.png',
  'arbol': 'arbol.png',
  'alma': 'alma.png',
  'tienda': 'tienda.png',
  'mercado': 'mercado.png',
  'tienda-almas': 'tienda-almas.png',
  'deudas': 'deudas.png',
  'logros': 'logros.png',
  'forja': 'forja.png',
  'recompensas': 'recompensas.png',
  'reglas': 'reglas.png',
  'estilos': 'estilos.png',
  'habilidades': 'habilidades.png',
  'equipamiento': 'equipamiento.png',
  'inventario': 'inventario.png',
};
// Origen: hoja de 40 runas del propietario (16-11-2026), recortadas como máscaras; ver public/arte/README.md.

export function seccionDeRuta(href: string): string {
  const ultima = href.split('/').filter(Boolean).at(-1) || '';
  return ultima === 'ficha' || ultima === 'dm' || ultima === '' ? 'nexo' : ultima;
}

export function runaDe(seccion: string): { imagen?: string; kanji: string } {
  const archivo = RUNAS_DISPONIBLES[seccion];
  return { imagen: archivo ? `/arte/runas/${archivo}` : undefined, kanji: KANJI_RESPALDO[seccion] || '主' };
}
