import { azarEstable, validarMapa } from './mapas-topologia';
export { azarEstable, validarMapa } from './mapas-topologia';
import type { MapaCombate, Terreno } from './combate';
import { generarExterior } from './generador-exteriores';
import type { FamiliaPieza } from './tileset-yugen';
export type PerfilMapa = 'taberna' | 'casa' | 'bosque' | 'pueblo' | 'mazmorra' | 'ruinas';
export type RolTile = 'suelo' | 'muro' | 'dificil' | 'cobertura' | 'peligro';
export type RegionAtlas = {
    nombre?: string;
    familia?: FamiliaPieza;
    conexiones?: number;
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    rol: RolTile;
};
export type AtlasMapa = {
    id?: string;
    url: string;
    ancho: number;
    alto: number;
    celda: number;
    margen: number;
    separacion: number;
    autor: string;
    licencia: string;
    regiones: RegionAtlas[];
};
export type ProcedenciaMapa = {
    schemaVersion: 1;
    generatorVersion: '1.0.0' | '2.0.0';
    semilla: string;
    perfil: PerfilMapa;
    densidad: number;
    protegidas: string[];
    atlas?: AtlasMapa;
    superficies?: Record<string, SuperficieMapa>;
    objetos?: ObjetoMapa[];
    accesos?: {
        x: number;
        y: number;
        nombre: string;
    }[];
    estiloCamino?: 'tierra' | 'piedra';
    colorTecho?: 'gris' | 'rojo';
};
export type SuperficieMapa = 'hierba' | 'tierra' | 'barro' | 'grava' | 'adoquin' | 'camino_tierra' | 'camino_piedra';
export type ObjetoMapa = {
    id: string;
    regionId: string;
    x: number;
    y: number;
    ancho: number;
    alto: number;
    capa: 'objetos' | 'techos';
    rotacion?: number;
};
export const coloresMapa: Record<RolTile, string> = { suelo: '#34352a', muro: '#77767e', dificil: '#485b31', cobertura: '#926235', peligro: '#a64138' };
export function cortarAtlas(ancho: number, alto: number, celda: number, margen = 0, separacion = 0): RegionAtlas[] {
    if (![ancho, alto, celda, margen, separacion].every(Number.isInteger) || ancho < 1 || alto < 1 || ancho > 4096 || alto > 4096 || celda < 8 || celda > 512 || margen < 0 || separacion < 0)
        throw Error('Revisa dimensiones, margen y tamaño de celda (8–512 px).');
    const resultado: RegionAtlas[] = [];
    for (let y = margen; y + celda <= alto - margen; y += celda + separacion)
        for (let x = margen; x + celda <= ancho - margen; x += celda + separacion) {
            if (resultado.length >= 4096)
                throw Error('El atlas supera 4096 recortes. Aumenta el tamaño de celda.');
            resultado.push({ id: `${x}:${y}`, x, y, w: celda, h: celda, rol: 'suelo' });
        }
    return resultado;
}
export function generarMapa(base: MapaCombate, op: ProcedenciaMapa): MapaCombate {
    if (!Number.isInteger(base.columnas) || !Number.isInteger(base.filas) || base.columnas < 8 || base.columnas > 24 || base.filas < 8 || base.filas > 24 || !Number.isFinite(op.densidad) || op.densidad < 0 || op.densidad > 1 || !['taberna', 'casa', 'bosque', 'pueblo', 'mazmorra', 'ruinas'].includes(op.perfil) || op.semilla.length > 120)
        throw Error('Configuración de generación inválida.');
    if (op.generatorVersion === '2.0.0')
        return generarExterior(base, op);
    const azar = azarEstable(`${op.generatorVersion}:${op.semilla}:${op.perfil}`), celdas: Record<string, Terreno> = {}, w = base.columnas, h = base.filas, cy = Math.floor(h / 2), cx = Math.floor(w / 2);
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const k = `${x},${y}`, borde = x === 0 || y === 0 || x === w - 1 || y === h - 1;
            if (op.perfil !== 'bosque' && op.perfil !== 'pueblo' && borde) {
                if (!(x === 0 && y === cy || x === w - 1 && y === cy))
                    celdas[k] = 'muro';
                continue;
            }
            if (x === cx || y === cy || x < 2 || x > w - 3)
                continue;
            const r = azar();
            if (op.perfil === 'mazmorra' && x % 5 === 0 && y % 4 !== 2)
                celdas[k] = 'muro';
            else if (r < op.densidad * .35)
                celdas[k] = op.perfil === 'bosque' ? 'dificil' : 'cobertura';
            else if (r < op.densidad * .39 && op.perfil === 'mazmorra')
                celdas[k] = 'peligro';
        }
    // Join every disconnected component to the central cross by bounded corridors.
    let mapa: MapaCombate = { ...base, celdas, procedural: { ...op, protegidas: [...op.protegidas] } };
    if (validarMapa(mapa).length)
        for (let y = 1; y < h - 1; y++)
            for (let x = 1; x < w - 1; x++)
                if (celdas[`${x},${y}`] !== 'muro')
                    for (let xx = Math.min(x, cx); xx <= Math.max(x, cx); xx++)
                        delete celdas[`${xx},${y}`];
    for (const k of op.protegidas) {
        if (base.celdas[k])
            celdas[k] = base.celdas[k];
        else
            delete celdas[k];
    }
    mapa = { ...mapa, celdas };
    return mapa;
}
export function regionParaCelda(m: MapaCombate, x: number, y: number): RegionAtlas | undefined {
    const op = m.procedural;
    if (!op?.atlas)
        return;
    const rol = m.celdas[`${x},${y}`] || 'suelo', piezas = op.atlas.regiones.filter(r => r.rol === rol);
    if (!piezas.length)
        return;
    return piezas[Math.floor(azarEstable(`${op.semilla}:${x}:${y}:${rol}`)() * piezas.length)];
}
