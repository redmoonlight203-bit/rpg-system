import type { AtlasMapa, RegionAtlas } from './mapas-procedurales';
export const TILESET_YUGEN_ID = 'yugen-exteriores-oscuro-v1';
export const TILESET_YUGEN_URL = '/tilesets/yugen-exteriores-oscuro-v1.jpg';
export type FamiliaPieza = 'hierba' | 'tierra' | 'barro' | 'grava' | 'adoquin' | 'camino_tierra' | 'camino_piedra' | 'muro' | 'ruina' | 'cerca' | 'porton' | 'puerta' | 'techo_gris' | 'techo_rojo' | 'escalera' | 'roca' | 'tocón';
const xs = [0, 154, 307, 462, 615, 768, 922, 1075, 1229, 1382, 1536];
const ys = [0, 163, 325, 486, 643, 800, 951, 1126, 1304, 1536];
const nombres: Partial<Record<FamiliaPieza, string>> = { camino_tierra: 'Camino de tierra', camino_piedra: 'Camino de piedra', techo_gris: 'Techo de pizarra', techo_rojo: 'Techo rojo', tocón: 'Tocón' };
export function atlasYugen(): AtlasMapa {
    const regiones: RegionAtlas[] = [];
    const agregar = (id: string, x: number, y: number, w: number, h: number, familia: FamiliaPieza, rol: RegionAtlas['rol'], extra: Partial<RegionAtlas> = {}) => regiones.push({ id, x: x + 2, y: y + 2, w: w - 4, h: h - 4, rol, familia, nombre: nombres[familia] || familia, ...extra });
    const pieza = (fila: number, col: number, familia: FamiliaPieza, rol: RegionAtlas['rol'], extra: Partial<RegionAtlas> = {}) => agregar(`${familia}-${col}`, xs[col], ys[fila], xs[col + 1] - xs[col], ys[fila + 1] - ys[fila], familia, rol, extra);
    for (let i = 0; i < 3; i++)
        pieza(0, i, 'hierba', 'suelo');
    for (let i = 3; i < 5; i++)
        pieza(0, i, 'tierra', 'suelo');
    pieza(0, 5, 'barro', 'dificil');
    pieza(0, 6, 'grava', 'suelo');
    for (let i = 7; i < 10; i++)
        pieza(0, i, 'adoquin', 'suelo');
    // N=1, E=2, S=4, W=8. Explicit rects, not a fictitious 32px grid.
    const conexiones = [10, 5, 6, 12, 15, 6, 15, 4, 4, 4];
    for (let i = 0; i < 10; i++)
        pieza(1, i, 'camino_tierra', 'suelo', { conexiones: conexiones[i] });
    for (let i = 0; i < 10; i++)
        pieza(2, i, 'camino_piedra', 'suelo', { conexiones: conexiones[i] });
    const muros = [0, 10, 5, 6, 6, 15, 7, 6, 5, 0];
    for (let i = 0; i < 10; i++)
        pieza(3, i, 'muro', 'muro', { conexiones: muros[i] });
    for (let i = 0; i < 10; i++)
        pieza(4, i, 'ruina', 'muro');
    for (let i = 0; i < 10; i++)
        pieza(5, i, i === 6 ? 'porton' : i === 8 ? 'puerta' : 'cerca', 'muro', { conexiones: i === 6 || i === 8 ? undefined : i === 2 || i === 4 ? 15 : 10 });
    const techos = [0, 169, 347, 488, 667, 844, 1019, 1192, 1367, 1536];
    for (let row = 6; row <= 7; row++)
        for (let i = 0; i < 9; i++)
            agregar(`${row === 6 ? 'techo_gris' : 'techo_rojo'}-${i}`, techos[i], ys[row], techos[i + 1] - techos[i], ys[row + 1] - ys[row], row === 6 ? 'techo_gris' : 'techo_rojo', 'muro');
    const abajo = [0, 158, 330, 535, 690, 815, 920, 1007, 1111, 1250, 1379, 1536];
    for (let i = 0; i < 11; i++) {
        const familia: FamiliaPieza = i < 4 ? 'escalera' : i < 8 ? 'roca' : 'tocón';
        agregar(`${familia}-${i}`, abajo[i], ys[8], abajo[i + 1] - abajo[i], 1536 - ys[8], familia, i < 4 ? 'suelo' : 'cobertura');
    }
    return { id: TILESET_YUGEN_ID, url: TILESET_YUGEN_URL, ancho: 1536, alto: 1536, celda: 154, margen: 0, separacion: 0, autor: 'Imagen proporcionada por el GM', licencia: 'Recurso aportado para el proyecto YUGEN; autoría y licencia de terceros no verificadas', regiones };
}
export function esAtlasYugen(atlas?: AtlasMapa) { return atlas?.id === TILESET_YUGEN_ID && atlas.url === TILESET_YUGEN_URL; }
export function urlAtlasPermitida(url: string) { return url === TILESET_YUGEN_URL || (/^data:image\/(png|webp);base64,/.test(url) && url.length < 350000); }
