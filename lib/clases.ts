export const CLASES_YUGEN = ['F','D','C','B','A','S','Z','KUROI'] as const;
export const UMBRALES_CLASE = [0, 0.5, 1, 2, 4, 8, 16, 32] as const;

export function clasePorIPE(ipe: number) {
  if (!Number.isFinite(ipe) || ipe < 0) return null;
  return CLASES_YUGEN[UMBRALES_CLASE.filter(minimo => ipe >= minimo).length - 1];
}
