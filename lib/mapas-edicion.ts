import type { MapaCombate, Terreno } from './combate';
import type { ObjetoMapa, RegionAtlas, RolTile, SuperficieMapa } from './mapas-procedurales';
export type PincelMapa = {
    tipo: 'terreno';
    terreno: RolTile;
} | {
    tipo: 'superficie';
    superficie: SuperficieMapa;
} | {
    tipo: 'pieza';
    region: RegionAtlas;
    ancho: number;
    alto: number;
    rotacion: number;
} | {
    tipo: 'borrar';
    capa: 'objetos' | 'techos';
} | {
    tipo: 'proteger';
};
const claves = (o: Pick<ObjetoMapa, 'x' | 'y' | 'ancho' | 'alto'>) => Array.from({ length: o.ancho * o.alto }, (_, i) => `${o.x + i % o.ancho},${o.y + Math.floor(i / o.ancho)}`);
export function editarCasillaMapa(m: MapaCombate, x: number, y: number, pincel: PincelMapa): MapaCombate {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= m.columnas || y >= m.filas)
        return m;
    const k = `${x},${y}`, meta = m.procedural;
    if (!meta)
        return m;
    const protegidas = new Set(meta.protegidas), objetos = meta.objetos || [];
    if (pincel.tipo === 'proteger') {
        const zona = new Set([k]);
        for (const o of objetos)
            if (claves(o).includes(k))
                for (const c of claves(o))
                    zona.add(c);
        const liberar = protegidas.has(k);
        for (const c of zona)
            if (liberar)
                protegidas.delete(c);
            else
                protegidas.add(c);
        return { ...m, procedural: { ...meta, protegidas: [...protegidas] } };
    }
    const huella = pincel.tipo === 'pieza' ? claves({ x, y, ancho: pincel.ancho, alto: pincel.alto }) : [k];
    if (huella.some(c => { const [xx, yy] = c.split(',').map(Number); return xx >= m.columnas || yy >= m.filas || protegidas.has(c); }))
        return m;
    const capa = pincel.tipo === 'borrar' ? pincel.capa : pincel.tipo === 'pieza' && pincel.region.familia?.startsWith('techo_') ? 'techos' : 'objetos';
    const quitar = objetos.filter(o => o.capa === capa && claves(o).some(c => huella.includes(c)));
    if (quitar.some(o => claves(o).some(c => protegidas.has(c))))
        return m;
    const celdas = { ...m.celdas }, superficies = { ...meta.superficies };
    if (capa === 'objetos')
        for (const o of quitar)
            for (const c of claves(o))
                delete celdas[c];
    const restantes = objetos.filter(o => !quitar.includes(o));
    if (pincel.tipo === 'terreno') {
        if (pincel.terreno === 'suelo')
            delete celdas[k];
        else
            celdas[k] = pincel.terreno;
    }
    if (pincel.tipo === 'superficie') {
        superficies[k] = pincel.superficie;
        if (pincel.superficie === 'barro')
            celdas[k] = 'dificil';
        else
            delete celdas[k];
    }
    if (pincel.tipo === 'pieza') {
        const r = pincel.region, familia = r.familia;
        if (familia && ['hierba', 'tierra', 'barro', 'grava', 'adoquin', 'camino_tierra', 'camino_piedra'].includes(familia)) {
            for (const c of huella) {
                superficies[c] = familia as SuperficieMapa;
                if (r.rol === 'suelo')
                    delete celdas[c];
                else
                    celdas[c] = r.rol as Terreno;
            }
        }
        else {
            let n = 0;
            const ids = new Set(restantes.map(o => o.id));
            while (ids.has(`manual-${n}`))
                n++;
            restantes.push({ id: `manual-${n}`, regionId: r.id, x, y, ancho: pincel.ancho, alto: pincel.alto, rotacion: pincel.rotacion, capa });
            if (capa === 'objetos')
                for (const c of huella) {
                    if (r.rol === 'suelo')
                        delete celdas[c];
                    else
                        celdas[c] = r.rol as Terreno;
                }
        }
    }
    return { ...m, celdas, procedural: { ...meta, superficies, objetos: restantes } };
}
export function rellenarMapa(m: MapaCombate, x: number, y: number, pincel: PincelMapa): MapaCombate {
    if (!['terreno', 'superficie'].includes(pincel.tipo))
        return editarCasillaMapa(m, x, y, pincel);
    const origen = `${x},${y}`, valor = pincel.tipo === 'superficie' ? m.procedural?.superficies?.[origen] : m.celdas[origen], cola = [{ x, y }], visitadas = new Set<string>();
    let resultado = m;
    for (let i = 0; i < cola.length; i++) {
        const p = cola[i], k = `${p.x},${p.y}`;
        if (p.x < 0 || p.y < 0 || p.x >= m.columnas || p.y >= m.filas || visitadas.has(k))
            continue;
        visitadas.add(k);
        if (m.procedural?.protegidas.includes(k) || (pincel.tipo === 'superficie' ? m.procedural?.superficies?.[k] : m.celdas[k]) !== valor)
            continue;
        resultado = editarCasillaMapa(resultado, p.x, p.y, pincel);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
            cola.push({ x: p.x + dx, y: p.y + dy });
    }
    return resultado;
}
