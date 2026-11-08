import type { MapaCombate } from './combate';
export function azarEstable(semilla: string) {
    let s = 2166136261;
    for (let i = 0; i < semilla.length; i++)
        s = Math.imul(s ^ semilla.charCodeAt(i), 16777619);
    return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** All traversable cells must belong to the entrance component. Linear in cell count. */
export function validarMapa(m: MapaCombate): string[] {
    const libres: string[] = [];
    for (let y = 0; y < m.filas; y++)
        for (let x = 0; x < m.columnas; x++)
            if (m.celdas[`${x},${y}`] !== 'muro')
                libres.push(`${x},${y}`);
    if (!libres.length)
        return ['El mapa no tiene casillas transitables.'];
    const visitadas = new Set([libres[0]]), cola = [libres[0]];
    for (let i = 0; i < cola.length; i++) {
        const [x, y] = cola[i].split(',').map(Number);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
            if (nx >= 0 && ny >= 0 && nx < m.columnas && ny < m.filas && m.celdas[k] !== 'muro' && !visitadas.has(k)) {
                visitadas.add(k);
                cola.push(k);
            }
        }
    }
    return visitadas.size === libres.length ? [] : [`${libres.length - visitadas.size} casillas quedan aisladas. Abre un paso antes de aplicar.`];
}
