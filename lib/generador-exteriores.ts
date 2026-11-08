import type { MapaCombate, Terreno } from './combate';
import type { ProcedenciaMapa, SuperficieMapa, ObjetoMapa } from './mapas-procedurales';
import { azarEstable, validarMapa } from './mapas-topologia';
import { atlasYugen, esAtlasYugen } from './tileset-yugen';
/** Stable v2 grammar: connected roads first, buildings second, bounded decoration last. */
export function generarExterior(base: MapaCombate, op: ProcedenciaMapa): MapaCombate {
    if (!esAtlasYugen(op.atlas))
        throw Error('La generación de exteriores necesita el paquete Exteriores oscuros de YUGEN.');
    if (!['bosque', 'pueblo', 'ruinas'].includes(op.perfil))
        throw Error('Este tileset contiene exteriores. Elige bosque, pueblo o ruinas.');
    const atlas = atlasYugen(), w = base.columnas, h = base.filas, cx = Math.floor(w / 2), cy = Math.floor(h / 2), azar = azarEstable(`exteriores:2:${op.semilla}:${op.perfil}`);
    const celdas: Record<string, Terreno> = {}, superficies: Record<string, SuperficieMapa> = {}, objetos: ObjetoMapa[] = [], reservadas = new Set<string>(), protegidas = new Set(op.protegidas);
    const camino: SuperficieMapa = op.estiloCamino === 'piedra' ? 'camino_piedra' : 'camino_tierra';
    let contador = 0;
    const dentro = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
    const clave = (x: number, y: number) => `${x},${y}`;
    const poner = (regionId: string, x: number, y: number, ancho = 1, alto = 1, capa: ObjetoMapa['capa'] = 'objetos', rotacion = 0) => { objetos.push({ id: `o${contador++}`, regionId, x, y, ancho, alto, capa, rotacion }); };
    function trazar(x: number, y: number, xx: number, yy: number) { while (true) {
        const k = clave(x, y);
        superficies[k] = camino;
        reservadas.add(k);
        if (x === xx && y === yy)
            break;
        if (x !== xx)
            x += Math.sign(xx - x);
        else
            y += Math.sign(yy - y);
    } }
    // Two connected axes reserve reliable battle and spawn space.
    trazar(0, cy, w - 1, cy);
    trazar(cx, 0, cx, h - 1);
    const accesos = [{ x: 0, y: cy, nombre: 'Oeste' }, { x: w - 1, y: cy, nombre: 'Este' }, { x: cx, y: 0, nombre: 'Norte' }, { x: cx, y: h - 1, nombre: 'Sur' }];
    for (const p of accesos)
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
                if (dentro(p.x + dx, p.y + dy))
                    reservadas.add(clave(p.x + dx, p.y + dy));
    // Extra connected bends make forests less rectilinear without introducing isolated paths.
    if (op.perfil === 'bosque') {
        const x = 2 + Math.floor(azar() * (w - 4)), opcionesY = Array.from({ length: h - 4 }, (_, i) => i + 2).filter(y => Math.abs(y - cy) >= 3);
        if (opcionesY.length) {
            const y = opcionesY[Math.floor(azar() * opcionesY.length)];
            trazar(x, cy, x, y);
            trazar(x, y, cx, y);
        }
    }
    function edificio(x: number, y: number, bw: number, bh: number, ruina: boolean) {
        for (let yy = y; yy < y + bh; yy++)
            for (let xx = x; xx < x + bw; xx++)
                if (!dentro(xx, yy) || reservadas.has(clave(xx, yy)))
                    return false;
        const puertaX = x + Math.floor(bw / 2), arriba = y < cy, puertaY = arriba ? y + bh - 1 : y;
        for (let yy = y; yy < y + bh; yy++)
            for (let xx = x; xx < x + bw; xx++) {
                const k = clave(xx, yy), borde = xx === x || yy === y || xx === x + bw - 1 || yy === y + bh - 1;
                superficies[k] = 'adoquin';
                reservadas.add(k);
                if (borde && !(xx === puertaX && yy === puertaY) && !(ruina && azar() < .25)) {
                    celdas[k] = 'muro';
                    if (ruina)
                        poner(`ruina-${Math.floor(azar() * 10)}`, xx, yy);
                }
            }
        // Entrances face the main street. No picture of a closed door is used for an open passage.
        trazar(puertaX, puertaY, puertaX, cy);
        if (!ruina) {
            const familia = op.colorTecho === 'rojo' ? 'techo_rojo' : 'techo_gris';
            poner(`${familia}-7`, x, y, bw, bh, 'techos');
        }
        return true;
    }
    if (op.perfil !== 'bosque') {
        const bw = w >= 16 ? 4 : 3, bh = h >= 16 ? 4 : 3;
        const solares: number[] = [];
        for (let x = 1; x + bw <= cx; x += bw + 2)
            solares.push(x);
        for (let x = cx + 1; x + bw <= w; x += bw + 2)
            solares.push(x);
        for (const y of [0, h - bh])
            for (const x of solares)
                edificio(x, y, bw, bh, op.perfil === 'ruinas');
    }
    // Grass patches, mud and indivisible props never occupy road/spawn reservations.
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const k = clave(x, y);
            if (reservadas.has(k))
                continue;
            const r = azar();
            if (r < op.densidad * .08) {
                superficies[k] = 'barro';
                celdas[k] = 'dificil';
            }
            else if (r < op.densidad * .12) {
                superficies[k] = 'tierra';
            }
            else if (r < op.densidad * .23) {
                const grande = op.perfil === 'bosque' && azar() < .15 && x + 1 < w && y + 1 < h, ancho = grande ? 2 : 1, alto = grande ? 2 : 1;
                const huella = [];
                for (let dy = 0; dy < alto; dy++)
                    for (let dx = 0; dx < ancho; dx++)
                        huella.push(clave(x + dx, y + dy));
                if (huella.some(k => reservadas.has(k)))
                    continue;
                for (const k of huella) {
                    reservadas.add(k);
                    celdas[k] = grande ? 'muro' : 'cobertura';
                }
                poner(azar() < .65 ? `roca-${4 + Math.floor(azar() * 4)}` : `tocón-${8 + Math.floor(azar() * 3)}`, x, y, ancho, alto);
            }
        }
    // Short fences on free edges frame village plots without enclosing an inaccessible island.
    if (op.perfil === 'pueblo' && w >= 12)
        for (let x = 2; x < w - 2; x++) {
            if (x === cx || azar() > .65)
                continue;
            const y = 1, k = clave(x, y);
            if (reservadas.has(k))
                continue;
            celdas[k] = 'muro';
            if (validarMapa({ ...base, celdas }).length) {
                delete celdas[k];
                continue;
            }
            poner('cerca-1', x, y);
            reservadas.add(k);
        }
    // Resolve wall shapes after layout. Props/ruins keep their specifically selected art.
    const existentes = new Set(objetos.filter(o => o.capa === 'objetos').flatMap(o => Array.from({ length: o.ancho * o.alto }, (_, i) => clave(o.x + i % o.ancho, o.y + Math.floor(i / o.ancho)))));
    for (const [k, t] of Object.entries(celdas))
        if (t === 'muro' && !existentes.has(k)) {
            const [x, y] = k.split(',').map(Number);
            poner('muro-auto', x, y);
        }
    let mapa: MapaCombate = { ...base, celdas, procedural: { ...op, atlas, superficies, objetos, accesos, protegidas: [...op.protegidas] } };
    // Remove whole large rocks if they accidentally seal a tiny boundary pocket.
    for (let intento = 0; intento < objetos.length && validarMapa(mapa).length; intento++) {
        const candidato = [...objetos].reverse().find(o => o.ancho > 1 && o.capa === 'objetos');
        if (!candidato)
            break;
        objetos.splice(objetos.indexOf(candidato), 1);
        for (let dy = 0; dy < candidato.alto; dy++)
            for (let dx = 0; dx < candidato.ancho; dx++)
                delete celdas[clave(candidato.x + dx, candidato.y + dy)];
    }
    // Restore the entire protected visual/tactical cell, including composite-object footprints.
    return restaurarProtecciones(base, mapa, protegidas);
}
function toca(o: ObjetoMapa, claves: Set<string>) { for (let dy = 0; dy < o.alto; dy++)
    for (let dx = 0; dx < o.ancho; dx++)
        if (claves.has(`${o.x + dx},${o.y + dy}`))
            return true; return false; }
export function restaurarProtecciones(base: MapaCombate, nuevo: MapaCombate, protegidas: Set<string>): MapaCombate {
    const meta = nuevo.procedural!, anteriores = base.procedural?.objetos || [];
    // Expand locked areas to complete footprints; never cut a 2x2 object into fragments.
    let cambio = true;
    while (cambio) {
        cambio = false;
        for (const o of [...anteriores, ...(meta.objetos || [])])
            if (toca(o, protegidas))
                for (let dy = 0; dy < o.alto; dy++)
                    for (let dx = 0; dx < o.ancho; dx++) {
                        const k = `${o.x + dx},${o.y + dy}`;
                        if (!protegidas.has(k)) {
                            protegidas.add(k);
                            cambio = true;
                        }
                    }
    }
    for (const k of protegidas) {
        if (base.celdas[k])
            nuevo.celdas[k] = base.celdas[k];
        else
            delete nuevo.celdas[k];
        if (base.procedural?.superficies?.[k])
            meta.superficies![k] = base.procedural.superficies[k];
        else
            delete meta.superficies![k];
    }
    const nuevos = (meta.objetos || []).filter(o => !toca(o, protegidas)), ids = new Set(nuevos.map(o => o.id));
    for (const o of anteriores.filter(o => toca(o, protegidas))) {
        let id = o.id;
        while (ids.has(id))
            id = `conservado-${id}`;
        ids.add(id);
        nuevos.push({ ...o, id });
    }
    meta.objetos = nuevos;
    meta.protegidas = [...protegidas];
    return nuevo;
}
