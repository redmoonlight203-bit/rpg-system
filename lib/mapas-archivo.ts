import type { MapaCombate } from './combate';
import { urlAtlasPermitida } from './tileset-yugen';
/** Portable documents use the bundled asset URL, never an embedded copy of the large sheet. */
export function leerArchivoMapa(texto: string): MapaCombate {
    if (texto.length > 1000000)
        throw Error('El archivo supera 1 MB.');
    const m = JSON.parse(texto) as MapaCombate;
    if (!m || m.version !== 1 || typeof m.nombre !== 'string' || m.nombre.length > 120 || !Number.isInteger(m.columnas) || !Number.isInteger(m.filas) || m.columnas < 8 || m.filas < 8 || m.columnas > 24 || m.filas > 24 || !m.celdas || typeof m.celdas !== 'object' || Array.isArray(m.celdas))
        throw Error('El archivo no es un mapa YUGEN válido.');
    const claveValida = (k: string) => { const [x, y] = k.split(',').map(Number); return /^\d+,\d+$/.test(k) && x < m.columnas && y < m.filas; };
    for (const [k, t] of Object.entries(m.celdas))
        if (!claveValida(k) || !['muro', 'dificil', 'cobertura', 'peligro'].includes(t))
            throw Error('El mapa contiene terrenos inválidos.');
    const p = m.procedural;
    if (p) {
        if (p.schemaVersion !== 1 || !['1.0.0', '2.0.0'].includes(p.generatorVersion) || typeof p.semilla !== 'string' || p.semilla.length > 120 || !['taberna', 'casa', 'bosque', 'pueblo', 'mazmorra', 'ruinas'].includes(p.perfil) || !Number.isFinite(p.densidad) || p.densidad < 0 || p.densidad > 1 || !Array.isArray(p.protegidas) || p.protegidas.length > 576 || p.protegidas.some(k => typeof k !== 'string' || !claveValida(k)))
            throw Error('Procedencia del mapa inválida.');
        const a = p.atlas;
        if (a) {
            if (typeof a.url !== 'string' || !urlAtlasPermitida(a.url) || !Number.isInteger(a.ancho) || !Number.isInteger(a.alto) || a.ancho < 1 || a.alto < 1 || a.ancho > 4096 || a.alto > 4096 || !Array.isArray(a.regiones) || a.regiones.length > 4096)
                throw Error('Tileset inválido o URL externa no permitida.');
            const ids = new Set<string>();
            for (const r of a.regiones) {
                if (typeof r.id !== 'string' || ids.has(r.id) || ![r.x, r.y, r.w, r.h].every(Number.isInteger) || r.x < 0 || r.y < 0 || r.w <= 0 || r.h <= 0 || r.x + r.w > a.ancho || r.y + r.h > a.alto || !['suelo', 'muro', 'dificil', 'cobertura', 'peligro'].includes(r.rol))
                    throw Error('Recorte del tileset inválido.');
                ids.add(r.id);
            }
        }
        if (p.superficies && (typeof p.superficies !== 'object' || Array.isArray(p.superficies) || Object.entries(p.superficies).some(([k, v]) => !claveValida(k) || !['hierba', 'tierra', 'barro', 'grava', 'adoquin', 'camino_tierra', 'camino_piedra'].includes(v))))
            throw Error('Superficies inválidas.');
        if (p.objetos) {
            if (!Array.isArray(p.objetos) || p.objetos.length > 1728)
                throw Error('Demasiados objetos.');
            const ids = new Set<string>();
            for (const o of p.objetos) {
                if (typeof o.id !== 'string' || ids.has(o.id) || !['objetos', 'techos'].includes(o.capa) || (!a?.regiones.some(r => r.id === o.regionId) && o.regionId !== 'muro-auto') || ![o.x, o.y, o.ancho, o.alto].every(Number.isInteger) || o.x < 0 || o.y < 0 || o.ancho < 1 || o.alto < 1 || o.ancho > 4 || o.alto > 4 || o.x + o.ancho > m.columnas || o.y + o.alto > m.filas || ![0, 90, 180, 270].includes(o.rotacion || 0))
                    throw Error('Objeto fuera de límites o sin pieza válida.');
                ids.add(o.id);
            }
        }
    }
    return m;
}
