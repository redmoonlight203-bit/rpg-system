import type { MapaCombate } from './combate';
import type { AtlasMapa, RegionAtlas, SuperficieMapa } from './mapas-procedurales';
import { azarEstable } from './mapas-topologia';
export type DibujoMapa = {
    region: RegionAtlas;
    x: number;
    y: number;
    ancho: number;
    alto: number;
    rotacion: number;
    cerrar?: number;
    capa: 'suelo' | 'objetos' | 'techos';
};
export function rotarMascara(mask: number, giros: number) { for (let i = 0; i < giros; i++)
    mask = ((mask << 1) & 15) | ((mask >> 3) & 1); return mask; }
export function mascaraVecinos(x: number, y: number, conecta: (x: number, y: number) => boolean) { let mask = 0; for (const [dx, dy, bit] of [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]])
    if (conecta(x + dx, y + dy))
        mask |= bit; return mask; }
export function elegirConector(regiones: RegionAtlas[], mascara: number): {
    region: RegionAtlas;
    rotacion: number;
    cerrar?: number;
} | undefined {
    // Prefer native variants; rotation is a fallback for conventions missing in this sheet.
    for (const r of regiones)
        if (r.conexiones === mascara)
            return { region: r, rotacion: 0 };
    for (const r of regiones)
        if (r.conexiones !== undefined)
            for (let giro = 1; giro < 4; giro++)
                if (rotarMascara(r.conexiones, giro) === mascara)
                    return { region: r, rotacion: giro * 90 };
    const cruz = regiones.find(r => r.conexiones === 15);
    if (cruz && mascara)
        return { region: cruz, rotacion: 0, cerrar: 15 ^ mascara };
    if (regiones.length)
        return { region: regiones[0], rotacion: 0 };
}
export function compilarDibujoMapa(m: MapaCombate): DibujoMapa[] {
    const meta = m.procedural, atlas = meta?.atlas;
    if (!meta || !atlas)
        return [];
    const indice = new Map(atlas.regiones.map(r => [r.id, r])), familias = new Map<string, RegionAtlas[]>();
    for (const r of atlas.regiones) {
        const k = r.familia || r.rol;
        familias.set(k, [...(familias.get(k) || []), r]);
    }
    const salida: DibujoMapa[] = [];
    const variantes = (nombre: string, x: number, y: number) => { const piezas = familias.get(nombre) || []; return piezas[Math.floor(azarEstable(`${meta.semilla}:${x}:${y}:${nombre}`)() * piezas.length)]; };
    for (let y = 0; y < m.filas; y++)
        for (let x = 0; x < m.columnas; x++) {
            const k = `${x},${y}`, superficie: SuperficieMapa = meta.superficies?.[k] || (m.celdas[k] === 'dificil' ? 'barro' : 'hierba');
            let region: RegionAtlas | undefined, rotacion = 0, cerrar = 0;
            if (meta.generatorVersion === '2.0.0') {
                if (superficie.startsWith('camino_')) {
                    const mask = mascaraVecinos(x, y, (nx, ny) => nx < 0 || ny < 0 || nx >= m.columnas || ny >= m.filas || meta.superficies?.[`${nx},${ny}`] === superficie);
                    const seleccion = mask ? elegirConector(familias.get(superficie) || [], mask) : undefined;
                    region = seleccion?.region || variantes(superficie === 'camino_tierra' ? 'tierra' : 'adoquin', x, y);
                    rotacion = seleccion?.rotacion || 0;
                    cerrar = seleccion?.cerrar || 0;
                }
                else
                    region = variantes(superficie, x, y);
            }
            else {
                const piezas = atlas.regiones.filter(r => r.rol === (m.celdas[k] || 'suelo'));
                region = piezas[Math.floor(azarEstable(`${meta.semilla}:${x}:${y}:${m.celdas[k] || 'suelo'}`)() * piezas.length)];
            }
            if (region)
                salida.push({ region, x, y, ancho: 1, alto: 1, rotacion, cerrar, capa: 'suelo' });
        }
    for (const o of meta.objetos || []) {
        let region = indice.get(o.regionId), rotacion = o.rotacion || 0;
        if (o.regionId === 'muro-auto') {
            const mask = mascaraVecinos(o.x, o.y, (x, y) => m.celdas[`${x},${y}`] === 'muro');
            const seleccion = elegirConector(familias.get('muro') || [], mask);
            region = seleccion?.region;
            rotacion = seleccion?.rotacion || 0;
        }
        if (region)
            salida.push({ region, x: o.x, y: o.y, ancho: o.ancho, alto: o.alto, rotacion, capa: o.capa });
    }
    if (meta.generatorVersion === '2.0.0') {
        const ocupadas = new Set((meta.objetos || []).filter(o => o.capa === 'objetos').flatMap(o => Array.from({ length: o.ancho * o.alto }, (_, i) => `${o.x + i % o.ancho},${o.y + Math.floor(i / o.ancho)}`)));
        for (const [k, t] of Object.entries(m.celdas)) {
            if (ocupadas.has(k))
                continue;
            const [x, y] = k.split(',').map(Number);
            let region: RegionAtlas | undefined, rotacion = 0;
            if (t === 'muro') {
                const seleccionado = elegirConector(familias.get('muro') || [], mascaraVecinos(x, y, (xx, yy) => m.celdas[`${xx},${yy}`] === 'muro'));
                region = seleccionado?.region;
                rotacion = seleccionado?.rotacion || 0;
            }
            else if (t === 'cobertura')
                region = variantes('roca', x, y);
            if (region)
                salida.push({ region, x, y, ancho: 1, alto: 1, rotacion, capa: 'objetos' });
        }
    }
    const orden = { suelo: 0, objetos: 1, techos: 2 };
    return salida.sort((a, b) => orden[a.capa] - orden[b.capa]);
}
export function dibujarMapa(ctx: CanvasRenderingContext2D, imagen: CanvasImageSource, mapa: MapaCombate, tamano: number, techos = true) {
    ctx.imageSmoothingEnabled = true;
    for (const d of compilarDibujoMapa(mapa)) {
        if (d.capa === 'techos' && !techos)
            continue;
        const { region: r } = d;
        ctx.save();
        ctx.translate((d.x + d.ancho / 2) * tamano, (d.y + d.alto / 2) * tamano);
        ctx.rotate(d.rotacion * Math.PI / 180);
        ctx.drawImage(imagen, r.x, r.y, r.w, r.h, -d.ancho * tamano / 2, -d.alto * tamano / 2, d.ancho * tamano, d.alto * tamano);
        ctx.restore();
        if (d.cerrar) {
            const g = mapa.procedural?.atlas?.regiones.find(r => r.familia === 'hierba');
            if (g)
                for (const [bit, x, y, w, h] of [[1, 0, 0, 1, 1 / 3], [2, 2 / 3, 0, 1 / 3, 1], [4, 0, 2 / 3, 1, 1 / 3], [8, 0, 0, 1 / 3, 1]])
                    if (d.cerrar & bit)
                        ctx.drawImage(imagen, g.x, g.y, g.w, g.h, (d.x + x) * tamano, (d.y + y) * tamano, w * tamano, h * tamano);
        }
    }
}
// Promise cache shares one decoded image across preview, board and rerenders.
const imagenes = new Map<string, Promise<HTMLImageElement>>();
export function cargarImagenAtlas(url: string): Promise<HTMLImageElement> { let pendiente = imagenes.get(url); if (!pendiente) {
    pendiente = new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => { imagenes.delete(url); reject(Error('No se pudo cargar el tileset.')); }; img.src = url; });
    if (imagenes.size >= 8)
        imagenes.delete(imagenes.keys().next().value!);
    imagenes.set(url, pendiente);
} return pendiente; }
