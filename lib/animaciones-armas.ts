/** El gesto del arma se deduce de la acción confirmada, nunca del clic en el mapa. */
export type TipoAnimacionArma = 'arco' | 'espada' | 'punos';
export type AtaqueParaAnimar = {
  accionId: string;
  nombreAccion?: string;
  nombreEfecto?: string;
  nombreArma?: string;
  nombreArmaEfecto?: string;
  naturaleza?: string;
  costePh?: number;
};
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function tipoAnimacionArma(accion: AtaqueParaAnimar): TipoAnimacionArma | undefined {
  const id = accion.accionId || '';
  const nombre = normalizar([accion.nombreAccion, accion.nombreEfecto, accion.nombreArma, accion.nombreArmaEfecto].filter(Boolean).join(' '));
  if (id === 'desarmado' || /desarmado|punos?|punetaz|patada|combate cuerpo a cuerpo/.test(nombre)) return 'punos';
  const ataqueBase = id === 'ataque';
  const arma = normalizar([accion.nombreArma, accion.nombreArmaEfecto, ataqueBase ? accion.nombreAccion : ''].filter(Boolean).join(' '));
  const usaMagia = accion.naturaleza === 'magica' || (!ataqueBase && (accion.costePh || 0) > 0);
  if (/arco|ballesta|flecha|saeta|tiro con arco/.test(arma) || (!usaMagia && /arco|ballesta|flecha|saeta/.test(nombre))) return 'arco';
  if (/espada|espadon|sable|katana|daga|cimitarra|mandoble|rapier|estoque|hacha|martillo|maza|mazo/.test(arma)
    || (!usaMagia && /espada|espadon|sable|katana|daga|cimitarra|mandoble|rapier|estoque|hachazo|espadazo/.test(nombre))) return 'espada';
  if (ataqueBase && !arma.trim()) return 'punos';
  return undefined;
}
/** Rotación y duración calculadas solo a partir de casillas ya confirmadas. */
export function geometriaAtaque(desde: {x: number; y: number}, hasta: {x: number; y: number}) {
  const dx = hasta.x - desde.x, dy = hasta.y - desde.y;
  const casillas = Math.hypot(dx, dy);
  return {
    angulo: casillas ? Math.atan2(dy, dx) * 180 / Math.PI : 0,
    casillas,
    duracionFlecha: Math.round(Math.max(260, Math.min(950, 170 + casillas * 80))),
  };
}
