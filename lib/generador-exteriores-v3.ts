import type { MapaCombate, Terreno } from './combate';
import type { ProcedenciaMapa, SuperficieMapa, ObjetoMapa } from './mapas-procedurales';
import { azarEstable, validarMapa } from './mapas-topologia';
import { atlasYugen, esAtlasYugen } from './tileset-yugen';
import { restaurarProtecciones } from './generador-exteriores';

type Punto = { x: number; y: number };
type Acceso = Punto & { nombre: string; lado: 'O' | 'E' | 'N' | 'S' };

/**
 * Gramática v3: la semilla decide el esqueleto completo, no solo la decoración.
 * Accesos desplazados, cruce descentrado, calles con quiebros, solares de tamaño y
 * posición variables, plazas y decoración en agrupaciones. Cada pieza que bloquea
 * se valida al colocarla, así que el mapa siempre queda conectado.
 */
export function generarExteriorV3(base: MapaCombate, op: ProcedenciaMapa): MapaCombate {
    if (!esAtlasYugen(op.atlas))
        throw Error('La generación de exteriores necesita el paquete Exteriores oscuros de YUGEN.');
    if (!['bosque', 'pueblo', 'ruinas'].includes(op.perfil))
        throw Error('Este tileset contiene exteriores. Elige bosque, pueblo o ruinas.');
    const atlas = atlasYugen(), w = base.columnas, h = base.filas, area = w * h;
    const azar = azarEstable(`exteriores:3:${op.semilla}:${op.perfil}`);
    const celdas: Record<string, Terreno> = {}, superficies: Record<string, SuperficieMapa> = {}, objetos: ObjetoMapa[] = [];
    const reservadas = new Set<string>(), solares = new Set<string>(), protegidas = new Set(op.protegidas);
    const camino: SuperficieMapa = op.estiloCamino === 'piedra' ? 'camino_piedra' : 'camino_tierra';
    const pueblo = op.perfil === 'pueblo', ruinas = op.perfil === 'ruinas', bosque = op.perfil === 'bosque';
    let contador = 0;
    const clave = (x: number, y: number) => `${x},${y}`;
    const dentro = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
    const entero = (min: number, max: number) => max <= min ? min : min + Math.floor(azar() * (max - min + 1));
    const elegir = <T,>(lista: T[]) => lista[Math.floor(azar() * lista.length)];
    const limitar = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    const poner = (regionId: string, x: number, y: number, ancho = 1, alto = 1, capa: ObjetoMapa['capa'] = 'objetos', rotacion = 0) => {
        const o: ObjetoMapa = { id: `o${contador++}`, regionId, x, y, ancho, alto, capa, rotacion };
        objetos.push(o);
        return o;
    };
    const conectado = () => validarMapa({ ...base, celdas }).length === 0;
    const pavimentar = (x: number, y: number) => { const k = clave(x, y); superficies[k] = camino; reservadas.add(k); };
    function tramo(a: Punto, b: Punto) {
        let { x, y } = a;
        while (true) {
            pavimentar(x, y);
            if (x === b.x && y === b.y)
                break;
            if (x !== b.x)
                x += Math.sign(b.x - x);
            else
                y += Math.sign(b.y - y);
        }
    }

    // 1. Accesos en posiciones distintas de cada borde y un cruce que no siempre cae en el centro.
    const accesos: Acceso[] = [
        { x: 0, y: entero(2, h - 3), nombre: 'Oeste', lado: 'O' }, { x: w - 1, y: entero(2, h - 3), nombre: 'Este', lado: 'E' },
        { x: entero(2, w - 3), y: 0, nombre: 'Norte', lado: 'N' }, { x: entero(2, w - 3), y: h - 1, nombre: 'Sur', lado: 'S' },
    ];
    for (const p of accesos)
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
                if (dentro(p.x + dx, p.y + dy))
                    reservadas.add(clave(p.x + dx, p.y + dy));
    // Dos calles paralelas pegadas se leen como una escalera: columnas y filas ya usadas se evitan a distancia 1.
    const columnas = [accesos[2].x, accesos[3].x], filasUsadas = [accesos[0].y, accesos[1].y];
    const libre = (usadas: number[], n: number) => usadas.every(u => Math.abs(u - n) !== 1);
    function separado(usadas: number[], min: number, max: number) {
        let n = entero(min, max);
        for (let i = 0; i < 24 && !libre(usadas, n); i++)
            n = entero(min, max);
        if (!libre(usadas, n))
            n = usadas.reduce((mejor, u) => u >= min && u <= max && Math.abs(u - n) < Math.abs(mejor - n) ? u : mejor, usadas.find(u => u >= min && u <= max) ?? n);
        usadas.push(n);
        return n;
    }
    const cruce: Punto = { x: separado(columnas, limitar(Math.floor(w * .28), 2, w - 3), limitar(Math.ceil(w * .72) - 1, 2, w - 3)), y: separado(filasUsadas, limitar(Math.floor(h * .28), 2, h - 3), limitar(Math.ceil(h * .72) - 1, 2, h - 3)) };

    // 2. Calles: cada acceso llega al cruce con un quiebro propio. No todos los accesos tienen calle.
    const orden = [...accesos];
    for (let i = orden.length - 1; i > 0; i--) {
        const j = Math.floor(azar() * (i + 1));
        [orden[i], orden[j]] = [orden[j], orden[i]];
    }
    const cuantas = pueblo ? (azar() < .65 ? 4 : 3) : ruinas ? entero(2, 4) : entero(2, 3);
    for (const a of orden.slice(0, cuantas)) {
        if (a.lado === 'O' || a.lado === 'E') {
            const mx = separado(columnas, Math.max(1, Math.min(a.x, cruce.x)), Math.min(w - 2, Math.max(a.x, cruce.x)));
            tramo(a, { x: mx, y: a.y });
            tramo({ x: mx, y: a.y }, { x: mx, y: cruce.y });
            tramo({ x: mx, y: cruce.y }, cruce);
        }
        else {
            const my = separado(filasUsadas, Math.max(1, Math.min(a.y, cruce.y)), Math.min(h - 2, Math.max(a.y, cruce.y)));
            tramo(a, { x: a.x, y: my });
            tramo({ x: a.x, y: my }, { x: cruce.x, y: my });
            tramo({ x: cruce.x, y: my }, cruce);
        }
    }
    // Callejón o sendero secundario sin salida: rompe la simetría en mapas medianos y grandes.
    if (area >= 144 && azar() < (bosque ? .7 : .5)) {
        const calles = Object.keys(superficies).map(k => k.split(',').map(Number));
        const [sx, sy] = elegir(calles), [dx, dy] = elegir([[1, 0], [-1, 0], [0, 1], [0, -1]]), largo = entero(3, Math.max(3, Math.floor(Math.min(w, h) / 2)));
        let x = sx, y = sy;
        for (let i = 0; i < largo && dentro(x + dx, y + dy); i++) {
            x += dx;
            y += dy;
            // Se detiene antes de pegarse a otra calle en paralelo.
            if (superficies[clave(x, y)] === camino || superficies[clave(x + dy, y + dx)] === camino || superficies[clave(x - dy, y - dx)] === camino)
                break;
            pavimentar(x, y);
        }
    }
    // Plaza empedrada o explanada de grava alrededor del cruce.
    if (!bosque && azar() < .55) {
        const lado = area >= 256 ? entero(2, 3) : 2, px = limitar(cruce.x - Math.floor(lado / 2), 1, w - lado - 1), py = limitar(cruce.y - Math.floor(lado / 2), 1, h - lado - 1);
        for (let y = py; y < py + lado; y++)
            for (let x = px; x < px + lado; x++) {
                superficies[clave(x, y)] = ruinas ? 'grava' : 'adoquin';
                reservadas.add(clave(x, y));
            }
    }

    // 3. Edificios y ruinas: tamaño, posición y orientación de la puerta dependen de la semilla.
    function distanciasACalle(bloqueo: Set<string>) {
        const dist = new Map<string, number>(), previo = new Map<string, string>(), cola: string[] = [];
        for (const [k, s] of Object.entries(superficies))
            if (s === camino && celdas[k] !== 'muro') {
                dist.set(k, 0);
                cola.push(k);
            }
        for (let i = 0; i < cola.length; i++) {
            const [x, y] = cola[i].split(',').map(Number);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy, k = clave(nx, ny);
                if (!dentro(nx, ny) || dist.has(k) || celdas[k] === 'muro' || solares.has(k) || bloqueo.has(k))
                    continue;
                dist.set(k, dist.get(cola[i])! + 1);
                previo.set(k, cola[i]);
                cola.push(k);
            }
        }
        return { dist, previo };
    }
    function edificio(x: number, y: number, bw: number, bh: number, enRuinas: boolean) {
        for (let yy = y - 1; yy <= y + bh; yy++)
            for (let xx = x - 1; xx <= x + bw; xx++) {
                const interior = xx >= x && yy >= y && xx < x + bw && yy < y + bh;
                if (interior && (!dentro(xx, yy) || reservadas.has(clave(xx, yy))))
                    return false;
                if (solares.has(clave(xx, yy)))
                    return false;
            }
        // La puerta mira hacia la calle más cercana por el exterior real del solar.
        const huellaSolar = new Set<string>();
        for (let yy = y; yy < y + bh; yy++)
            for (let xx = x; xx < x + bw; xx++)
                huellaSolar.add(clave(xx, yy));
        const { dist, previo } = distanciasACalle(huellaSolar), puertas: { x: number; y: number; fuera: string; d: number }[] = [];
        for (let xx = x + 1; xx < x + bw - 1; xx++)
            for (const [yy, fy] of [[y, y - 1], [y + bh - 1, y + bh]])
                if (dist.has(clave(xx, fy)))
                    puertas.push({ x: xx, y: yy, fuera: clave(xx, fy), d: dist.get(clave(xx, fy))! });
        for (let yy = y + 1; yy < y + bh - 1; yy++)
            for (const [xx, fx] of [[x, x - 1], [x + bw - 1, x + bw]])
                if (dist.has(clave(fx, yy)))
                    puertas.push({ x: xx, y: yy, fuera: clave(fx, yy), d: dist.get(clave(fx, yy))! });
        if (!puertas.length)
            return false;
        const minima = Math.min(...puertas.map(p => p.d)), puerta = elegir(puertas.filter(p => p.d <= minima + 1));
        const suelo: SuperficieMapa = enRuinas ? elegir<SuperficieMapa>(['adoquin', 'adoquin', 'grava', 'hierba']) : 'adoquin';
        const huecos = enRuinas ? .18 + azar() * .3 : 0, colocados: string[] = [], marcaObjetos = objetos.length;
        for (let yy = y; yy < y + bh; yy++)
            for (let xx = x; xx < x + bw; xx++) {
                const k = clave(xx, yy), borde = xx === x || yy === y || xx === x + bw - 1 || yy === y + bh - 1;
                colocados.push(k);
                if (suelo !== 'hierba')
                    superficies[k] = suelo;
                if (borde && !(xx === puerta.x && yy === puerta.y) && !(enRuinas && azar() < huecos)) {
                    celdas[k] = 'muro';
                    if (enRuinas)
                        poner(`ruina-${entero(0, 9)}`, xx, yy);
                }
            }
        if (!conectado()) {
            for (const k of colocados) {
                delete celdas[k];
                delete superficies[k];
            }
            objetos.length = marcaObjetos;
            return false;
        }
        for (const k of colocados) {
            solares.add(k);
            reservadas.add(k);
        }
        // Sendero de la puerta a la calle: en ruinas y bosque es tierra batida, no calle.
        for (let k: string | undefined = puerta.fuera; k && dist.get(k)! > 0; k = previo.get(k)) {
            superficies[k] = pueblo ? camino : 'tierra';
            reservadas.add(k);
        }
        if (!enRuinas) {
            const familia = op.colorTecho === 'rojo' ? 'techo_rojo' : 'techo_gris';
            const pieza = bw > bh ? elegir([1, 1, 0]) : bh > bw ? elegir([2, 2, 0]) : elegir([7, 7, 3, 0]);
            poner(`${familia}-${pieza}`, x, y, bw, bh, 'techos');
        }
        return true;
    }
    const maxLado = Math.max(3, Math.min(6, Math.floor(Math.min(w, h) / 3)));
    const objetivo = pueblo ? limitar(Math.round(area / 48 * (.6 + op.densidad)), 1, 10) : ruinas ? limitar(Math.round(area / 64 * (.6 + op.densidad)), 1, 8) : azar() < .35 ? 1 : 0;
    for (let intento = 0, hechos = 0; intento < objetivo * 14 && hechos < objetivo; intento++) {
        const bw = entero(3, maxLado), bh = entero(3, maxLado);
        if (edificio(entero(0, w - bw), entero(0, h - bh), bw, bh, !pueblo))
            hechos++;
    }

    // 4. Decoración en agrupaciones: claros, pedregales, barrizales y tocones, no ruido uniforme.
    const tipos = bosque ? ['rocas', 'tocones', 'tocones', 'barro', 'tierra', 'rocas'] : ruinas ? ['rocas', 'escombros', 'escombros', 'grava', 'barro', 'tierra'] : ['rocas', 'tocones', 'tierra', 'grava', 'barro'];
    const grupos = op.densidad <= 0 ? 0 : Math.max(1, Math.round(area / (bosque ? 18 : 30) * op.densidad));
    for (let g = 0; g < grupos; g++) {
        const tipo = elegir(tipos), gx = entero(0, w - 1), gy = entero(0, h - 1), radio = entero(1, area >= 256 ? 3 : 2);
        for (let y = gy - radio; y <= gy + radio; y++)
            for (let x = gx - radio; x <= gx + radio; x++) {
                const k = clave(x, y), lejos = Math.hypot(x - gx, y - gy) / (radio + .5);
                if (!dentro(x, y) || reservadas.has(k) || celdas[k] || azar() < lejos * lejos)
                    continue;
                if (tipo === 'barro') {
                    superficies[k] = 'barro';
                    celdas[k] = 'dificil';
                }
                else if (tipo === 'tierra' || tipo === 'grava')
                    superficies[k] = tipo;
                else if (azar() < .55) {
                    // Roca grande 2×2 que bloquea: solo en bosque y solo si no aísla nada.
                    if (tipo === 'rocas' && bosque && azar() < .2) {
                        const huella = [k, clave(x + 1, y), clave(x, y + 1), clave(x + 1, y + 1)];
                        if (dentro(x + 1, y + 1) && huella.every(c => !reservadas.has(c) && !celdas[c])) {
                            for (const c of huella)
                                celdas[c] = 'muro';
                            if (conectado()) {
                                for (const c of huella)
                                    reservadas.add(c);
                                poner(`roca-${entero(4, 5)}`, x, y, 2, 2);
                                continue;
                            }
                            for (const c of huella)
                                delete celdas[c];
                        }
                    }
                    celdas[k] = 'cobertura';
                    reservadas.add(k);
                    poner(tipo === 'rocas' ? `roca-${entero(4, 7)}` : tipo === 'tocones' ? `tocón-${entero(8, 10)}` : `ruina-${entero(4, 9)}`, x, y);
                }
            }
    }

    // 5. Cercas cortas junto a algunos solares del pueblo, horizontales o verticales.
    if (pueblo)
        for (let i = 0, n = Math.round(area / 70); i < n; i++) {
            const horizontal = azar() < .5, largo = entero(2, 4), x = entero(1, w - 2), y = entero(1, h - 2), puestas: string[] = [];
            for (let j = 0; j < largo; j++) {
                const xx = horizontal ? x + j : x, yy = horizontal ? y : y + j, k = clave(xx, yy);
                if (!dentro(xx, yy) || reservadas.has(k) || celdas[k])
                    break;
                celdas[k] = 'muro';
                if (!conectado()) {
                    delete celdas[k];
                    break;
                }
                puestas.push(k);
                reservadas.add(k);
                poner(`cerca-${elegir([0, 1, 5, 7])}`, xx, yy, 1, 1, 'objetos', horizontal ? 0 : 90);
            }
        }

    // Los muros sin arte propio resuelven su forma por vecinos, igual que en la v2.
    const conArte = new Set(objetos.filter(o => o.capa === 'objetos').flatMap(o => Array.from({ length: o.ancho * o.alto }, (_, i) => clave(o.x + i % o.ancho, o.y + Math.floor(i / o.ancho)))));
    for (const [k, t] of Object.entries(celdas))
        if (t === 'muro' && !conArte.has(k)) {
            const [x, y] = k.split(',').map(Number);
            poner('muro-auto', x, y);
        }
    const mapa: MapaCombate = { ...base, celdas, procedural: { ...op, atlas, superficies, objetos, accesos: accesos.map(({ x, y, nombre }) => ({ x, y, nombre })), protegidas: [...op.protegidas] } };
    return restaurarProtecciones(base, mapa, protegidas);
}
