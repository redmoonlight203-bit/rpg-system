import type { Regla, EventoRegla, CondicionRegla, EfectoRegla, ValorRegla, Sujeto } from "./reglas";
import { type Efecto, type Elemento, type AlcanceHabilidad } from "./creacion";
import { type ReglaPasiva } from "./pasivas";
export type RequisitosUso={razas?:string[];minimos?:Record<string,number>;nivel_minimo?:number};
export function validarRequisitos(r:RequisitosUso|undefined):string|null{
 if(r===undefined)return null;
 if(!r||typeof r!=='object'||Array.isArray(r))return 'Requisitos inválidos.';
 if(r.nivel_minimo!==undefined&&(!Number.isInteger(r.nivel_minimo)||r.nivel_minimo<1||r.nivel_minimo>100))return 'El nivel requerido debe estar entre 1 y 100.';
 if(r.razas!==undefined&&(!Array.isArray(r.razas)||r.razas.length>50||r.razas.some(x=>typeof x!=='string'||!x.trim()||x.length>100)))return 'Selecciona razas válidas.';
 if(r.minimos!==undefined&&(!r.minimos||typeof r.minimos!=='object'||Array.isArray(r.minimos)||Object.keys(r.minimos).length>50||Object.entries(r.minimos).some(([k,v])=>!/^[a-z_][a-z0-9_]{0,63}$/.test(k)||typeof v!=='number'||!Number.isFinite(v)||v<0||v>1000000)))return 'Los mínimos deben ser atributos válidos y números de 0 a 1000000.';
 return null;
}
export function faltantesRequisitos(r:RequisitosUso|undefined,razas:string[],stats:Record<string,number>):string[]{
 const error=validarRequisitos(r);if(error)return [error];if(!r)return [];
 const normal=(s:string)=>s.trim().toLocaleLowerCase();
 const errores:string[]=[];
 if(r.nivel_minimo!==undefined&&(stats.nivel??1)<r.nivel_minimo)errores.push('Nivel requerido: '+r.nivel_minimo);…22426 tokens truncated….accion.nombre, efecto: h.accion, enfriamiento: 0 });
    for (const { clave, regla } of reglasMotor(m))
        if (regla.evento === 'usar')
            lista.push({ id: `regla:${clave}`, nombre: regla.nombre, regla_detalle: regla, bloqueada: regla.usos > 0 && (m.motor?.usos[clave] || 0) >= regla.usos ? 'Sin usos restantes.' : undefined, efecto: { ...basico(), efecto: 'estado', estado: regla.nombre, cantidad: 0, coste_ph: regla.coste_ph, coste_fatiga: regla.coste_fatiga }, enfriamiento: regla.enfriamiento, regla: clave });
    return lista.filter(a => !a.efecto.requisito_forma || (estadisticas(m)[a.efecto.requisito_forma.atributo] || 0) >= a.efecto.requisito_forma.minimo);
}
function actuarInterno(c, actorId, accionId, objetivoId, rng, forzar, centro) {
    const n = copia(c), a = n.miembros.find((m) => m.id === actorId);
    delete n.resultado;
    if (n.fase !== "en_curso" || n.actual !== actorId || !a || a.vida <= 0)
        throw Error("Solo puede actuar el personaje de turno.");
    if (a.accion_usada)
        throw Error("Ya utilizó su acción.");
    if (accionId.startsWith('regla:')) {
        const clave = accionId.slice(6), entrada = reglasMotor(a).find(r => r.clave === clave);
        if (!entrada || entrada.regla.evento !== 'usar')
            throw Error('La regla activa no existe.');
        const t = n.miembros.find(m => m.id === objetivoId) || a;
        ejecutarRegla(n, a, entrada.clave, entrada.regla, a, t, rng, undefined, 0, true);
        a.accion_usada = true;
        return n;
    }
    if (accionId === "guardia") {
        estado(a, "guardia", "Guardia", 1, { armadura: 2 }, { inicio: true });
        a.accion_usada = true;
        return n;
    }
    const act = acciones(a).find((v) => v.id === accionId);
    if (!act)
        throw Error("La acción no existe.");
    if ((a.cooldowns[act.id] || 0) > 0)
        throw Error("Habilidad en enfriamiento.");
    let e = act.efecto;
    const s = estadisticas(a), coste = e.coste_ph || 0, fatiga = e.coste_fatiga || 0, t = n.miembros.find((m) => m.id === objetivoId);
    const tactica = e.tablero;
    if (tactica) {
        const fallo = validarTactica(e);
        if (fallo)
            throw Error(fallo);
    }
    const posiciones = posicionesTablero(n), punto = centro || (t ? posiciones[t.id] : undefined);
    let objetivos = t ? [t] : [];
    if (tactica) {
        if (!punto || !alcanceDesde(posiciones[a.id], tactica, dimensionesTablero(n)).some(p => p.x === punto.x && p.y === punto.y))
            throw Error('El destino está fuera del alcance de la habilidad.');
        const area = areaDesde(posiciones[a.id], punto, tactica, dimensionesTablero(n));
        objetivos = n.miembros.filter(m => m.vida > 0 && objetivoPermitido(a, m, tactica) && area.some(p => p.x === posiciones[m.id].x && p.y === posiciones[m.id].y));
        if (!objetivos.length)
            throw Error('No hay objetivos válidos en el área.');
        // Snapshot de posiciones y objetivos: los desplazamientos no cambian a quién alcanza el lanzamiento.
        for (const m of n.miembros)
            m.posicion = posiciones[m.id];
        objetivos.sort((u, v) => distanciaCasillas(posiciones[u.id], punto) - distanciaCasillas(posiciones[v.id], punto) || u.id.localeCompare(v.id));
    }
    if (typeof coste !== 'number' || !Number.isFinite(coste) || coste < 0)
        throw Error('Coste de PH inválido.');
    if (phDisponibles(a) < coste)
        throw Error("PH insuficientes.");
    a.ph = phDisponibles(a);
    if (e.efecto !== "crear_arma" && !t && !tactica)
        throw Error("Elige un objetivo.");
    const forzando = fatiga > 0 && (a.agotado || a.fatiga + fatiga > (s.fatiga || 0));
    if (forzando && !forzar)
        throw Error("Agotamiento: activa Forzar natural para usarla sufriendo 1d4 de daño.");
    a.ph -= coste;
    a.fatiga = Math.min(s.fatiga || 0, a.fatiga + fatiga);
    a.uso_fatiga = fatiga > 0;
    a.accion_usada = true;
    if (fatiga && a.fatiga >= (s.fatiga || 0))
        a.agotado = true;
    if (act.enfriamiento)
        a.cooldowns[act.id] = act.enfriamiento + 1;
    if (forzando) {
        const v = dados(n, 1, 4, rng, "Daño por agotamiento");
        a.vida = Math.max(0, a.vida - v);
        if (!a.vida) {
            log(n, `${a.nombre} cae por agotamiento antes de ejecutar la habilidad.`);
            return n;
        }
    }
    log(n, `${act.nombre}: coste ${coste} PH y ${fatiga} Fatiga.`);
    if (e.efecto === "crear_arma") {
        if (e.tabla_armas) {
            const tabla = e.tabla_armas;
            if (!Number.isInteger(tabla.caras) || tabla.caras < 2 || tabla.caras > 100 || !Array.isArray(tabla.resultados) || tabla.resultados.length !== tabla.caras || new Set(tabla.resultados.map(r => r.cara)).size !== tabla.caras || tabla.resultados.some(r => !Number.isInteger(r.cara) || r.cara < 1 || r.cara > tabla.caras))
                throw Error('La tabla de armas está incompleta.');
            const cara = dados(n, 1, tabla.caras, rng, 'Creación de arma');
            const r = tabla.resultados.find(r => r.cara === cara);
            if (!r || !r.nombre?.trim() || !Number.isInteger(r.cantidad) || r.cantidad < 1 || r.cantidad > 100 || !Number.isInteger(r.caras) || r.caras < 2 || r.caras > 1000 || !Number.isInteger(r.modificador) || Math.abs(r.modificador) > 1000000 || !['mano_der', 'mano_izq', 'dos_manos'].includes(r.arma_slot))
                throw Error('Arma del resultado inválida.');
            e = { ...e, tabla_armas: undefined, arma_nombre: r.nombre, cantidad: r.cantidad, caras: r.caras, modificador: r.modificador, tipo_dano: r.tipo_dano, elemento: r.elemento, arma_slot: r.arma_slot };
            log(n, `${act.nombre}: d${tabla.caras} → ${cara}: ${r.nombre}.`);
        }
        a.arma = {
            efecto: { ...e },
            nombre: e.arma_nombre || "Arma temporal",
            slot: e.arma_slot === "mano_izq" ? "mano_izq" : "mano_der",
            restantes: e.duracion,
            creada: a.turnos,
        };
        log(n, `${a.nombre} crea ${a.arma.nombre} durante ${e.duracion} turnos.`);
        normalizar(a);
        return n;
    }
    for (const objetivo of objetivos) {
        if (a.vida <= 0)
            break;
        resolverEfecto(n, a, objetivo, e, act, rng, punto);
    }
    if (tactica)
        log(n, `${act.nombre}: centro (${punto.x + 1}, ${punto.y + 1}), ${objetivos.length} objetivos afectados.`);
    return n;
}
function resolverEfecto(n, a, t, e, act, rng, centro) {
    const s = estadisticas(a);
    if (e.efecto !== "dano") {
        const supera = e.salvacion
            ? salvacion(n, t, e.salvacion.cd, e.salvacion.atributo, rng)
            : false;
        if (e.efecto === "estado") {
            if (supera) {
                log(n, `${t.nombre} evita el estado.`);
                return n;
            }
            const tipo = e.estado_tipo || "narrativo";
            estado(t, tipo === "narrativo" ? "estado:" + e.id : tipo, e.estado || tipo, Math.max(1, e.duracion), e.bonos_estado || {}, {
                cantidad: e.cantidad,
                caras: e.caras,
                cd: e.salvacion?.cd || 12,
                atributo: e.salvacion?.atributo || "salvacion",
            });
        }
        else {
            let v = Math.max(0, dados(n, e.cantidad, e.caras, rng, act.nombre) + e.modificador);
            if (supera && e.salvacion?.exito === "mitad")
                v = Math.floor(v / 2);
            if (supera && e.salvacion?.exito === "anula")
                v = 0;
            if (e.efecto === "curacion")
                t.vida = Math.min(maxVida(t), t.vida + v);
            if (e.efecto === "recuperar_ph")
                t.ph = Math.min(estadisticas(t).ph || 0, t.ph + v);
            if (e.efecto === "reducir_fatiga" && !t.agotado)
                t.fatiga = Math.max(0, t.fatiga - v);
            log(n, `${t.nombre}: ${e.efecto} ${v}.`);
        }
        secundariosTablero(n, a, t, e, centro, supera);
        normalizar(a);
        normalizar(t);
        return n;
    }
    emitirMotor(n, 'atacar', a, a, t, rng, e);
    if (a.vida <= 0)
        return n;
    const elemento = elementoDe(e), antes = reactivas(t, e, "recibir_ataque");
    activarReglas(n, a, t, antes, rng);
    if (a.vida <= 0) {
        log(n, `${a.nombre} cae por una reacción antes de impactar.`);
        return n;
    }
    let arm = (estadisticas(t).armadura || 0) +
        antes.reduce((v, r) => v + (r.bonos.armadura || 0), 0);
    if (tiene(t, "escarcha"))
        arm = Math.floor(arm / 2);
    arm = Math.max(0, arm -
        (elemento === "electricidad" ? 3 : elemento === "luz_sagrada" ? 5 : 0));
    if (antes.length)
        log(n, `${t.nombre}: defensas reactivas ${antes.map((r) => r.nombre).join(", ")}; ARM contra este ataque ${arm}.`);
    let acierta = true, critico = false, supera = false;
    if (e.salvacion) {
        supera = salvacion(n, t, e.salvacion.cd, e.salvacion.atributo, rng);
        acierta = !(supera && e.salvacion.exito === "anula");
        n.resultado = acierta ? "Impacto" : "Fallo";
    }
    else if (n.regla === "impacto") {
        const d = rng(20), impacto = d + (s.bono_impacto || 0);
        critico = d === 20;
        acierta = critico || (d !== 1 && impacto >= arm);
        n.resultado =
            d === 1
                ? "Fallo critico"
                : critico
                    ? "Critico"
                    : acierta
                        ? "Impacto"
                        : "Fallo";
        log(n, `${n.resultado}: d20 ${d} + impacto ${s.bono_impacto || 0} = ${impacto}, ARM ${arm}.`);
    }
    else
        n.resultado = "Impacto";
    // A blind penalty is consumed by the next attempted attack, even on a miss.
    quitarEstado(a, "ciego");
    quitarEstado(t, "escarcha");
    if (!acierta) {
        emitirMotor(n, 'fallar', a, a, t, rng, e);
        return n;
    }
    emitirMotor(n, 'impactar', a, a, t, rng, e);
    const permiteEstados = !(supera && e.salvacion?.exito === "solo_estado");
    let dadosTotal = dados(n, e.cantidad, e.caras, rng, act.nombre);
    if (elemento !== "ninguno")
        dadosTotal += dados(n, 1, 4, rng, "Daño elemental " + elemento);
    const mojado = tiene(t, "mojado"), combo = mojado &&
        ["fuego", "hielo", "electricidad", "luz_sagrada"].includes(elemento);
    if (combo) {
        quitarEstado(t, "mojado");
        log(n, `${t.nombre}: Mojado se consume por ${elemento}.`);
    }
    if (combo && elemento === "fuego") {
        dadosTotal += dados(n, 1, 4, rng, "Onda de vapor");
        if (permiteEstados)
            estado(t, "ciego", "Ceguera: -4 al próximo ataque", 0, {
                bono_impacto: -4,
            });
    }
    if (permiteEstados && combo && elemento === "hielo")
        estado(t, "congelado", "Congelado: pierde su siguiente turno");
    if (combo && elemento === "luz_sagrada")
        dadosTotal += dados(n, 1, 6, rng, "Agua bendita");
    if (tiene(t, "marca_luz")) {
        quitarEstado(t, "marca_luz");
        dadosTotal += dados(n, 1, 6, rng, "Estallido de Marca de Luz");
    }
    let total = Math.max(0, dadosTotal * (critico ? 2 : 1) + e.modificador + (s.dano || 0));
    log(n, `Daño: dados ${dadosTotal}${critico ? " × 2 (crítico)" : ""} + modificador ${e.modificador} + bono ${s.dano || 0} = ${total}.`);
    if (combo && elemento === "electricidad") {
        total *= 2;
        log(n, "Superconducción: daño principal × 2.");
    }
    if (combo &&
        elemento === "luz_sagrada" &&
        (t.corrupto ?? !!t.stats.corrupto)) {
        total *= 2;
        log(n, "Agua bendita contra oscuridad/corrupción: daño sagrado × 2.");
    }
    if (supera && e.salvacion?.exito === "mitad")
        total = Math.floor(total / 2);
    if (n.regla === "reduccion") {
        total = Math.max(0, total - arm);
        log(n, `Tras ARM: ${total}.`);
    }
    const impacto = reactivas(t, e, "recibir_impacto");
    activarReglas(n, a, t, impacto, rng);
    recibir(n, a, t, e, total, [...antes, ...impacto], rng);
    // Elemental saves affect secondary states, never repeat the attack roll.
    if (permiteEstados && elemento === "agua")
        estado(t, "mojado", "Mojado");
    if (permiteEstados &&
        elemento === "fuego" &&
        !salvacion(n, t, 12, "salvacion", rng))
        estado(t, "quemadura", "Quemadura", 0, {}, { cantidad: 1, caras: 4, cd: 12, atributo: "salvacion" });
    if (permiteEstados &&
        elemento === "hielo" &&
        !salvacion(n, t, 12, "salvacion", rng))
        estado(t, "escarcha", "Escarcha: ARM a la mitad hasta el próximo ataque");
    if (permiteEstados &&
        elemento === "luz_sagrada" &&
        !salvacion(n, t, 12, "salvacion", rng))
        estado(t, "marca_luz", "Marcado por la Luz");
    if (elemento === "electricidad" && t.grupo_cercania) {
        for (const otro of n.miembros.filter((m) => m.id !== t.id &&
            m.id !== a.id &&
            m.bando === t.bando &&
            m.vida > 0 &&
            m.grupo_cercania === t.grupo_cercania)) {
            area(n, a, otro, e, 3, rng);
            log(n, `${otro.nombre}: chispa de cercanía 3.`);
            if (combo && tiene(otro, "mojado")) {
                const v = dados(n, 1, 6, rng, "Superconducción cercana");
                area(n, a, otro, e, v, rng);
                log(n, `${otro.nombre}: Superconducción ${v}; conserva Mojado.`);
            }
        }
    }
    secundariosTablero(n, a, t, e, centro, supera);
    normalizar(a);
    normalizar(t);
    return n;
}
export function actuar(c, actorId, accionId, objetivoId, rng = dadoSeguro, forzar = false, centro) {
    return registrar(c, () => actuarInterno(c, actorId, accionId, objetivoId, rng, forzar, centro));
}
export function mover(c, id, bando) {
    if (c.fase !== "preparacion")
        throw Error("Los bandos se eligen en preparación.");
    const n = copia(c), m = n.miembros.find((v) => v.id === id);
    if (!m)
        throw Error("Personaje no encontrado.");
    m.bando = bando;
    return n;
}
export function retirar(c, id) {
    if (c.fase !== "preparacion")
        throw Error("Solo se pueden retirar combatientes antes de iniciar el combate.");
    const n = copia(c), m = n.miembros.find((m) => m.id === id);
    if (!m)
        throw Error("Personaje no encontrado.");
    n.miembros = n.miembros.filter((m) => m.id !== id);
    log(n, `${m.nombre} se retira del campo. Su ficha e inventario se conservan.`);
    return n;
}
function motor(m) { return m.motor ||= { modificadores: [], habilidades: [], usos: {}, proximos: {}, progreso: [] }; }
export function reglasMotor(m) {
    const fuentes = [
        { id: 'propio', reglas: m.configuracion.reglas || [] },
        ...pasivasAplicables(m).map((p, i) => ({ id: `pasiva:${p.id || i}`, reglas: p.reglas_motor || [] })),
        ...(m.configuracion.habilidades || []).filter(p => !requisitosFuente(m, p).length).map((p, i) => ({ id: `hab:${p.id || i}`, reglas: p.reglas || [] })),
        ...Object.entries(piezas(m)).filter(([, p]) => !requisitosFuente(m, p).length).map(([slot, p]) => ({ id: `equipo:${p.id || slot}`, reglas: p.reglas || [] })),
    ];
    const vistos = new Set();
    return fuentes.flatMap(f => f.reglas.map(regla => ({ clave: `${f.id}:${regla.id}`, regla }))).filter(r => { if (vistos.has(r.clave))
        return false; vistos.add(r.clave); return true; }).sort((a, b) => b.regla.prioridad - a.regla.prioridad || a.clave.localeCompare(b.clave));
}
function sujetoMotor(ctx, s) { return s === 'actor' ? ctx.actor : s === 'objetivo' ? ctx.objetivo : ctx.yo; }
function valorMotor(v, ctx) {
    if (typeof v === 'number')
        return v;
    if (!v)
        return 0;
    const m = sujetoMotor(ctx, v.desde || 'yo');
    const n = (v.bono || 0) + (v.dados ? dados(ctx.c, v.dados, v.caras || 6, ctx.rng, 'Regla') : 0) + (v.atributo ? (estadisticas(m)[v.atributo] || 0) : 0) + (v.evento ? ctx.cantidad : 0);
    const total = n * (v.escala ?? 1);
    if (!Number.isFinite(total) || Math.abs(total) > 100000000)
        throw Error('La fórmula produjo un valor fuera de rango.');
    return total;
}
function tieneMotor(m, clave) { return m.estados.some(e => e.tipo === clave || e.nombre === clave) || !!m.motor?.modificadores.some(e => e.clave === clave); }
function condicionMotor(c, ctx) {
    if (ctx.profundidad > 8)
        throw Error('Demasiados niveles de reglas.');
    const sub = { ...ctx, profundidad: ctx.profundidad + 1 };
    switch (c.tipo) {
        case 'siempre': return true;
        case 'estado_terminado': return ctx.estado_terminado === c.clave;
        case 'todas': return c.condiciones.every(x => condicionMotor(x, sub));
        case 'alguna': return c.condiciones.some(x => condicionMotor(x, sub));
        case 'no': return !condicionMotor(c.condicion, sub);
        case 'estado': return tieneMotor(sujetoMotor(ctx, c.sujeto), c.estado);
        case 'elemento': return elementoDe(ctx.efecto) === c.elemento;
        case 'probabilidad': return ctx.rng(100) <= c.porcentaje;
        case 'comparar': {
            const m = sujetoMotor(ctx, c.sujeto), s = estadisticas(m);
            const actual = c.atributo === 'vida_actual' ? m.vida : c.atributo === 'ph_actual' ? m.ph : c.atributo === 'fatiga_actual' ? m.fatiga : s[c.atributo] || 0;
            const max = c.atributo === 'vida_actual' ? maxVida(m) : c.atributo === 'ph_actual' ? s.ph : c.atributo === 'fatiga_actual' ? s.fatiga : 100;
            const a = c.porcentaje ? (max ? actual / max * 100 : 0) : actual;
            return c.operador === '<' ? a < c.valor : c.operador === '<=' ? a <= c.valor : c.operador === '>' ? a > c.valor : c.operador === '>=' ? a >= c.valor : a === c.valor;
        }
    }
}
let profundidadMotor = 0;
function emitirMotor(c, evento, yo, actor, objetivo, rng, efecto, cantidad = 0, estadoTerminado) {
    if (profundidadMotor >= 8) {
        log(c, 'Se detuvo una cadena de reglas al alcanzar 8 eventos.');
        return;
    }
    profundidadMotor++;
    try {
        for (const { clave, regla } of reglasMotor(yo))
            if (regla.evento === evento)
                ejecutarRegla(c, yo, clave, regla, actor, objetivo, rng, efecto, cantidad, false, estadoTerminado);
    }
    finally {
        profundidadMotor--;
    }
}
function ejecutarRegla(c, yo, clave, r, actor, objetivo, rng, efecto, cantidad = 0, manual = false, estadoTerminado) {
    const ctx = { c, yo, actor, objetivo, rng, efecto, cantidad, profundidad: 0, fuente: clave.startsWith('equipo:') ? clave.split(':').slice(0, 2).join(':') : undefined, estado_terminado: estadoTerminado }, m = motor(yo);
    const error = typeof r.coste_ph !== 'number' || !Number.isFinite(r.coste_ph) || r.coste_ph < 0 ? 'Coste de PH inválido.' : !condicionMotor(r.condicion, ctx) ? 'No se cumplen las condiciones.' : r.usos > 0 && (m.usos[clave] || 0) >= r.usos ? 'Sin usos restantes.' : (m.proximos[clave] || 0) > yo.turnos ? 'Regla en enfriamiento.' : phDisponibles(yo) < r.coste_ph ? 'PH insuficientes.' : r.coste_fatiga > 0 && (yo.agotado || yo.fatiga + r.coste_fatiga > (estadisticas(yo).fatiga || 0)) ? 'Fatiga insuficiente.' : '';
    if (error) {
        if (manual)
            throw Error(error);
        return;
    }
    yo.ph = phDisponibles(yo) - r.coste_ph;
    yo.fatiga += r.coste_fatiga;
    if (r.coste_fatiga) {
        yo.uso_fatiga = true;
        if (yo.fatiga >= (estadisticas(yo).fatiga || 0))
            yo.agotado = true;
    }
    m.usos[clave] = (m.usos[clave] || 0) + 1;
    m.proximos[clave] = yo.turnos + r.enfriamiento + 1;
    // Sin enfriamiento, distintas muertes durante un mismo turno sí cuentan.
    if (!r.enfriamiento)
        m.proximos[clave] = yo.turnos;
    log(c, `${yo.nombre} · ${r.nombre}`);
    efectosMotor(r.efectos, ctx, clave);
}
function efectosMotor(efectos, ctx, origen) {
    if (ctx.profundidad > 8)
        throw Error('Demasiadas ramas de efectos.');
    for (const [indice, e] of efectos.entries()) {
        const destinos = ['aliados', 'enemigos', 'todos'].includes(e.destino) ? ctx.c.miembros.filter(m => m.vida > 0 && (e.destino === 'todos' || (e.destino === 'aliados' ? m.bando === ctx.yo.bando : m.bando !== ctx.yo.bando))) : [sujetoMotor(ctx, e.destino)];
        for (const t of destinos) {
            const v = () => valorMotor(e.valor, ctx), m = motor(t), clave = e.clave || `${origen}:${indice}`;
            switch (e.tipo) {
                case 'salvacion':
                case 'condicional': {
                    const exito = e.tipo === 'salvacion' ? salvacion(ctx.c, t, e.cd || 12, e.atributo || 'salvacion', ctx.rng) : condicionMotor(e.condicion || { tipo: 'siempre' }, ctx);
                    efectosMotor((exito ? e.exito : e.fallo) || [], { ...ctx, objetivo: t, profundidad: ctx.profundidad + 1 }, `${origen}:${indice}:${exito}`);
                    break;
                }
                case 'perder_accion':
                    t.accion_usada = true;
                    log(ctx.c, `${t.nombre} pierde su acción del turno.`);
                    break;
                case 'mensaje':
                    log(ctx.c, `${t.nombre}: ${e.nombre || 'Efecto activado'}`);
                    break;
                case 'curar':
                    t.vida = Math.min(maxVida(t), t.vida + Math.max(0, v()));
                    break;
                case 'ph':
                    t.ph += v();
                    break;
                case 'fatiga': {
                    const n = v();
                    if (n > 0 || !t.agotado)
                        t.fatiga += n;
                    if (t.fatiga >= (estadisticas(t).fatiga || 0) && t.fatiga > 0)
                        t.agotado = true;
                    break;
                }
                case 'dano': {
                    const antes = t.vida, perdido = Math.min(antes, Math.max(0, v()));
                    t.vida -= perdido;
                    log(ctx.c, `${t.nombre}: ${perdido} daño directo por regla (sin impacto ni ARM).`);
                    if (perdido > 0) {
                        emitirMotor(ctx.c, 'recibir_dano', t, ctx.yo, t, ctx.rng, undefined, perdido);
                        if (t.id !== ctx.yo.id)
                            emitirMotor(ctx.c, 'causar_dano', ctx.yo, ctx.yo, t, ctx.rng, undefined, perdido);
                    }
                    if (antes > 0 && t.vida <= 0) {
                        emitirMotor(ctx.c, 'morir', t, ctx.yo, t, ctx.rng);
                        if (t.id !== ctx.yo.id && t.bando !== ctx.yo.bando)
                            emitirMotor(ctx.c, 'matar', ctx.yo, ctx.yo, t, ctx.rng);
                    }
                    break;
                }
                case 'quitar_estado':
                    m.modificadores = m.modificadores.filter(x => x.clave !== clave);
                    m.habilidades = m.habilidades.filter(x => x.clave !== clave);
                    t.estados = t.estados.filter(x => x.tipo !== clave && x.nombre !== clave);
                    break;
                case 'habilidad':
                    if (e.accion) {
                        m.habilidades = m.habilidades.filter(x => x.id !== `${origen}:${indice}`);
                        m.habilidades.push({ origen: ctx.fuente, id: `${origen}:${indice}`, clave, accion: copia(e.accion), duracion: e.duracion || 0, creado: t.turnos });
                    }
                    break;
                case 'estado':
                case 'transformar':
                case 'atributo': {
                    const cambios = e.tipo === 'atributo' ? [{ atributo: e.atributo || 'vida', operacion: e.operacion || 'sumar', valor: v() }] : e.tipo === 'transformar' ? (e.cambios || []).map(x => ({ ...x, valor: valorMotor(x.valor, ctx) })) : [];
                    if (e.permanente) {
                        for (const cambio of cambios) {
                            let delta = cambio.valor;
                            if (e.limite) {
                                const ganado = m.progreso.filter(x => x.regla === clave && x.atributo === cambio.atributo).reduce((a, x) => a + x.delta, 0);
                                delta = Math.max(0, Math.min(delta, e.limite - ganado));
                            }
                            if (delta) {
                                t.stats[cambio.atributo] = (t.stats[cambio.atributo] || 0) + delta;
                                m.progreso.push({ id: crypto.randomUUID(), atributo: cambio.atributo, delta, regla: clave });
                                log(ctx.c, `${t.nombre}: ${cambio.atributo} ${delta > 0 ? '+' : ''}${delta} permanente.`);
                            }
                        }
                    }
                    else {
                        if (!e.acumular)
                            m.modificadores = m.modificadores.filter(x => x.clave !== clave);
                        if (!e.limite || m.modificadores.filter(x => x.clave === clave).length < e.limite)
                            m.modificadores.push({ origen: ctx.fuente, clave, nombre: e.nombre || clave, creado: t.turnos, duracion: e.duracion || 0, cambios });
                    }
                    break;
                }
            }
            normalizar(t);
        }
    }
}
function caducarMotor(c, m, rng) {
    if (!m.motor)
        return;
    const terminados = [];
    m.motor.modificadores = m.motor.modificadores.filter(x => { if (x.duracion === 0 || x.creado >= m.turnos || --x.duracion > 0)
        return true; terminados.push(x.clave); return false; });
    m.motor.habilidades = m.motor.habilidades.filter(x => x.duracion === 0 || x.creado >= m.turnos || --x.duracion > 0);
    for (const clave of new Set(terminados))
        if (!m.motor.modificadores.some(x => x.clave === clave))
            emitirMotor(c, 'fin_efecto', m, m, m, rng, undefined, 0, clave);
}
export const ESPACIOS_EQUIPO = {
    casco: { nombre: 'Cabeza', tipos: ['casco'] }, pechera: { nombre: 'Torso', tipos: ['pechera'] }, pantalones: { nombre: 'Piernas', tipos: ['pantalones'] }, zapatos: { nombre: 'Botas', tipos: ['zapatos'] }, capa: { nombre: 'Capa', tipos: ['capa'] },
    mano_der: { nombre: 'Mano derecha', tipos: ['mano', 'dos_manos'] }, mano_izq: { nombre: 'Mano izquierda', tipos: ['mano', 'dos_manos'] },
    ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`acc_${i + 1}`, { nombre: `Accesorio ${i + 1}`, tipos: ['accesorio'] }])), titulo: { nombre: 'Título', tipos: ['titulo'] }
};
export function manosLibres(m) {
    if (m.arma?.efecto.arma_slot === 'dos_manos')
        return 0;
    const equipo = { ...piezas(m) };
    if (Object.values(equipo).some(p => p.slot_tipo === 'dos_manos'))
        return 0;
    if (m.arma)
        equipo[m.arma.slot] = { nombre: m.arma.nombre, stats: {} };
    return Number(!equipo.mano_der) + Number(!equipo.mano_izq);
}
function activarEquipo(c, m, rng, ids) {
    for (const { clave, regla } of reglasMotor(m))
        if (regla.evento === 'equipar' && clave.startsWith('equipo:') && (!ids || ids.has(clave.split(':')[1])))
            ejecutarRegla(c, m, clave, regla, m, m, rng);
}
export function seleccionEquipo(m) { return Object.fromEntries(Object.entries(m.configuracion.equipamiento || {}).filter(([, p]) => p.id).map(([slot, p]) => [slot, p.id])); }
export function cambiarEquipo(c, actorId, seleccion, rng = dadoSeguro) {
    return registrar(c, () => {
        const n = copia(c), m = n.miembros.find(v => v.id === actorId);
        if (!m)
            throw Error('Personaje inexistente.');
        if (n.fase === 'finalizado')
            throw Error('El encuentro ha terminado.');
        if (n.fase === 'en_curso' && (n.actual !== m.id || m.accion_usada || m.vida <= 0))
            throw Error('Cambiar equipo requiere tu turno y una acción disponible.');
        const anterior = m.configuracion.equipamiento || {}, reserva = new Map([...(m.configuracion.reserva || []), ...Object.values(anterior)].filter(p => p.id).map(p => [p.id, p]));
        const elegido = {}, usados = new Set();
        for (const [slot, id] of Object.entries(seleccion)) {
            if (!id)
                continue;
            const espacio = ESPACIOS_EQUIPO[slot], pieza = reserva.get(id);
            if (!espacio || !pieza || (pieza.tipo_creacion && !['objeto', 'titulo'].includes(pieza.tipo_creacion)) || !espacio.tipos.includes(pieza.slot_tipo || 'ninguno'))
                throw Error('Objeto incompatible o fuera del inventario.');
            if (usados.has(id))
                throw Error('Una misma pieza no puede ocupar dos espacios.');
            usados.add(id);
            const faltan = requisitosFuente(m, pieza);
            if (faltan.length)
                throw Error(`${pieza.nombre}: ${faltan.join('; ')}`);
            elegido[slot] = pieza;
        }
        if ((elegido.mano_der?.slot_tipo === 'dos_manos' && elegido.mano_izq) || (elegido.mano_izq?.slot_tipo === 'dos_manos' && elegido.mano_der))
            throw Error('Un arma de dos manos ocupa ambas manos.');
        if (JSON.stringify(Object.entries(seleccionEquipo(m)).sort()) === JSON.stringify(Object.entries(seleccion).filter(([, id]) => id).sort()))
            throw Error('No hay cambios de equipamiento.');
        const antiguos = new Set(Object.values(anterior).map(p => p.id).filter(Boolean)), nuevos = new Set(Object.values(elegido).map(p => p.id).filter(Boolean));
        for (const { clave, regla } of reglasMotor(m))
            if (regla.evento === 'desequipar' && clave.startsWith('equipo:') && !nuevos.has(clave.split(':')[1]))
                ejecutarRegla(n, m, clave, regla, m, m, rng);
        if (m.motor) {
            const retirar = (origen) => !!origen && origen.startsWith('equipo:') && !nuevos.has(origen.slice(7));
            m.motor.modificadores = m.motor.modificadores.filter(x => !retirar(x.origen));
            m.motor.habilidades = m.motor.habilidades.filter(x => !retirar(x.origen));
        }
        const bonos = (equipo) => { const b = {}; for (const p of Object.values(equipo))
            for (const [k, v] of Object.entries(p.stats || {}))
                if (!['peso', 'durabilidad', 'dados_dano', 'caras_dano', 'dano'].includes(k))
                    b[k] = (b[k] || 0) + v; return b; };
        const viejos = bonos(anterior), actuales = bonos(elegido);
        for (const k of new Set([...Object.keys(viejos), ...Object.keys(actuales)]))
            m.stats[k] = (m.stats[k] || 0) - (viejos[k] || 0) + (actuales[k] || 0);
        const cambianManos = ['mano_der', 'mano_izq'].some(k => anterior[k]?.id !== elegido[k]?.id);
        if (cambianManos)
            delete m.arma;
        m.configuracion.habilidades = m.configuracion.habilidades?.filter(h => !h.id || !reserva.has(h.id) || ['habilidad', 'pasiva'].includes(reserva.get(h.id)?.tipo_creacion || ''));
        m.configuracion.equipamiento = elegido;
        m.configuracion.bonos_equipamiento = actuales;
        m.configuracion.reserva = [...reserva.values()];
        activarEquipo(n, m, rng, new Set([...nuevos].filter((id) => !!id && !antiguos.has(id))));
        normalizar(m);
        if (n.fase === 'en_curso')
            m.accion_usada = true;
        log(n, `${m.nombre} cambia su equipamiento${n.fase === 'en_curso' ? ' y consume su acción' : ''}. Manos libres: ${manosLibres(m)}.`);
        return n;
    });
}
export function accionesObjeto(m, p) {
    if (p.tipo_creacion && p.tipo_creacion !== 'objeto')
        return [];
    if (requisitosFuente(m, p).length)
        return [];
    const equipado = Object.values(m.configuracion.equipamiento || {}).some(v => v.id === p.id);
    if (!equipado && !p.consumible && p.slot_tipo && p.slot_tipo !== 'ninguno')
        return [];
    return [...(p.efectos || []).filter(e => !e.requisito_forma || (estadisticas(m)[e.requisito_forma.atributo] || 0) >= e.requisito_forma.minimo).map(e => ({ id: e.id, nombre: e.nombre, coste_ph: e.coste_ph || 0, coste_fatiga: e.coste_fatiga || 0 })), ...(p.reglas || []).filter(r => r.evento === 'usar').map(r => ({ id: 'regla:' + r.id, nombre: r.nombre, coste_ph: r.coste_ph, coste_fatiga: r.coste_fatiga }))].map(a => ({ ...a, bloqueada: phDisponibles(m) < a.coste_ph ? 'PH insuficientes.' : a.coste_fatiga > 0 && (m.agotado || m.fatiga + a.coste_fatiga > (estadisticas(m).fatiga || 0)) ? 'Fatiga insuficiente.' : undefined }));
}
export function usarObjeto(c, actorId, objetoId, efectoId, objetivoId, rng = dadoSeguro) {
    return registrar(c, () => {
        const n = copia(c), m = n.miembros.find(x => x.id === actorId);
        if (!m || n.fase !== 'en_curso' || n.actual !== m.id || m.accion_usada || m.vida <= 0)
            throw Error('Usar un objeto requiere tu turno y una acción disponible.');
        const p = m.configuracion.reserva?.find(p => p.id === objetoId);
        if (!p || !accionesObjeto(m, p).some(a => a.id === efectoId))
            throw Error('Este objeto no está disponible o debes equiparlo primero.');
        const objetivo = n.miembros.find(v => v.id === objetivoId);
        if (!objetivo || objetivo.vida <= 0)
            throw Error('Selecciona un objetivo vivo.');
        const slot = Object.entries(m.configuracion.equipamiento || {}).find(([, v]) => v.id === p.id)?.[0];
        const temporal = 'inventario-' + p.id;
        if (!slot)
            (m.configuracion.habilidades ||= []).push({ ...p, id: temporal });
        const id = efectoId.startsWith('regla:') ? `regla:${slot ? 'equipo:' + p.id : 'hab:' + temporal}:${efectoId.slice(6)}` : slot ? `equipo:${slot}:${efectoId}` : `hab:${temporal}:${efectoId}`;
        const resultado = actuarInterno(n, m.id, id, objetivoId, rng, false), actor = resultado.miembros.find(v => v.id === actorId);
        actor.configuracion.habilidades = actor.configuracion.habilidades?.filter(h => h.id !== temporal);
        if (p.consumible) {
            actor.configuracion.reserva = actor.configuracion.reserva?.filter(v => v.id !== p.id);
            actor.configuracion.consumidos = [...new Set([...(actor.configuracion.consumidos || []), p.id])];
            if (slot) {
                // Solo los objetos no equipables deben marcarse consumibles.
                throw Error('Guarda el objeto antes de consumirlo.');
            }
            log(resultado, `${actor.nombre} consume ${p.nombre}.`);
        }
        else
            log(resultado, `${actor.nombre} usa ${p.nombre}.`);
        return resultado;
    });
}
/** Invocar es una acción atómica: el llamador valida la propuesta antes de pagar. */
export function incorporarInvocacion(c, actorId, habilidad, preparado, duracion, maxActivas = 1, rng = dadoSeguro) {
    const actor = c.miembros.find(m => m.id === actorId);
    if (c.fase !== "en_curso" || c.actual !== actorId || !actor || actor.vida <= 0 || actor.accion_usada)
        throw Error("Solo puedes invocar durante tu turno con una acción disponible.");
    if (!actor.configuracion.habilidades?.some(h => h.id === habilidad.id))
        throw Error("Habilidad no equipada.");
    const config = habilidad.configuracion_invocacion;
    if (!config || !Number.isInteger(duracion) || duracion < 1 || !Number.isInteger(maxActivas) || maxActivas < 1)
        throw Error("Configuración de invocación inválida.");
    const faltan = requisitosFuente(actor, habilidad);
    if (faltan.length)
        throw Error(faltan.join("; "));
    if (c.miembros.filter(m => m.invocacion?.invocador === actorId && m.invocacion.habilidad === habilidad.id && m.vida > 0).length >= maxActivas)
        throw Error("Ya alcanzaste el límite de invocaciones activas.");
    const ph = config.costePh ?? 0, fatiga = config.costeFatiga ?? 0;
    if (!Number.isInteger(ph) || !Number.isInteger(fatiga) || ph < 0 || fatiga < 0)
        throw Error("Costes inválidos.");
    if (phDisponibles(actor) < ph || fatiga > 0 && actor.fatiga + fatiga > (estadisticas(actor).fatiga || 0))
        throw Error("No tienes recursos suficientes para invocar.");
    if (c.miembros.length >= 100)
        throw Error("Máximo cien participantes.");
    return registrar(c, () => {
        const temporal = { ...c, fase: "preparacion" };
        const n = agregar(temporal, { ...preparado, id: crypto.randomUUID() }, actor.bando, rng);
        n.fase = c.fase;
        const a = n.miembros.find(m => m.id === actorId);
        a.ph = phDisponibles(a) - ph;
        a.fatiga += fatiga;
        a.uso_fatiga = fatiga > 0;
        a.accion_usada = true;
        const criatura = n.miembros[n.miembros.length - 1];
        criatura.invocacion = { invocador: actorId, habilidad: habilidad.id, restantes: duracion };
        log(n, `${a.nombre} invoca a ${criatura.nombre} durante ${duracion} turnos propios.`);
        return n;
    });
}
/** Tablero inicial sin editor de mapas. Las posiciones se guardan en el encuentro. */
export function dimensionesTablero(c) {
    return { columnas: 12, filas: Math.max(8, Math.ceil(c.miembros.length / 8) + 2) };
}
export function posicionesTablero(c) {
    const { columnas, filas } = dimensionesTablero(c), resultado = {}, ocupadas = new Set();
    const valida = (p) => Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < columnas && p.y < filas;
    for (const m of c.miembros)
        if (m.posicion && valida(m.posicion) && !ocupadas.has(`${m.posicion.x},${m.posicion.y}`)) {
            resultado[m.id] = { ...m.posicion };
            ocupadas.add(`${m.posicion.x},${m.posicion.y}`);
        }
    for (const m of c.miembros)
        if (!resultado[m.id]) {
            const columnasBando = m.bando === 'jugador' ? [1, 2, 3, 4, 0, 5, 6, 7, 8, 9, 10, 11] : [10, 9, 8, 7, 11, 6, 5, 4, 3, 2, 1, 0];
            for (const x of columnasBando) {
                for (let y = 1; y <= filas; y++) {
                    const fila = y % filas;
                    if (!ocupadas.has(`${x},${fila}`)) {
                        resultado[m.id] = { x, y: fila };
                        ocupadas.add(`${x},${fila}`);
                        break;
                    }
                }
                if (resultado[m.id])
                    break;
            }
        }
    return resultado;
}
export function movimientoRestante(m) {
    const limite = Math.max(0, Math.min(100, Math.floor(estadisticas(m).movimiento ?? 6)));
    return Math.max(0, limite - (m.movimiento?.turno === m.turnos ? m.movimiento.gastado : 0));
}
/** Distancias ortogonales: nadie atraviesa una casilla ocupada, incluidos caídos. */
export function casillasAlcanzables(c, actorId) {
    const m = c.miembros.find(m => m.id === actorId);
    if (!m || tiene(m, 'derribado'))
        return {};
    const posiciones = posicionesTablero(c), inicio = posiciones[actorId], { columnas, filas } = dimensionesTablero(c);
    const ocupadas = new Set(Object.entries(posiciones).filter(([id]) => id !== actorId).map(([, p]) => `${p.x},${p.y}`));
    const distancias = { [`${inicio.x},${inicio.y}`]: 0 }, cola = [inicio], limite = movimientoRestante(m);
    for (let i = 0; i < cola.length; i++) {
        const p = cola[i], d = distancias[`${p.x},${p.y}`];
        if (d >= limite)
            continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = p.x + dx, y = p.y + dy, k = `${x},${y}`;
            if (x < 0 || y < 0 || x >= columnas || y >= filas || ocupadas.has(k) || k in distancias)
                continue;
            distancias[k] = d + 1;
            cola.push({ x, y });
        }
    }
    delete distancias[`${inicio.x},${inicio.y}`];
    return distancias;
}
export function desplazar(c, actorId, destino) {
    return registrar(c, () => {
        const actor = c.miembros.find(m => m.id === actorId);
        if (c.fase !== 'en_curso' || c.actual !== actorId || !actor || actor.vida <= 0)
            throw Error('Solo puedes moverte durante tu turno.');
        if (!destino || !Number.isInteger(destino.x) || !Number.isInteger(destino.y))
            throw Error('Casilla inválida.');
        const coste = casillasAlcanzables(c, actorId)[`${destino.x},${destino.y}`];
        if (!coste)
            throw Error('Casilla ocupada o fuera de tu movimiento disponible.');
        const n = copia(c), posiciones = posicionesTablero(c);
        for (const m of n.miembros)
            m.posicion = posiciones[m.id];
        const m = n.miembros.find(m => m.id === actorId);
        m.posicion = { ...destino };
        m.movimiento = { turno: m.turnos, gastado: (m.movimiento?.turno === m.turnos ? m.movimiento.gastado : 0) + coste };
        log(n, `${m.nombre} se mueve ${coste} casillas. Movimiento restante: ${movimientoRestante(m)}.`);
        return n;
    });
}
export const distanciaCasillas = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export function validarTactica(e) {
    const t = e.tablero;
    if (!t)
        return null;
    if (typeof t !== 'object' || !Number.isInteger(t.alcance) || t.alcance < 0 || t.alcance > 60 || !Number.isInteger(t.tamano) || t.tamano < 0 || t.tamano > 12 || t.forma !== 'individual' && t.tamano < 1 || !['individual', 'circulo', 'cuadrado', 'linea', 'cono', 'cruz'].includes(t.forma) || !['enemigos', 'aliados', 'todos', 'yo'].includes(t.afecta) || e.efecto === 'crear_arma')
        return 'Configuración de tablero inválida.';
    const d = t.desplazamiento;
    if (d && (!['atraer', 'empujar'].includes(d.tipo) || !Number.isInteger(d.casillas) || d.casillas < 1 || d.casillas > 12 || !['siempre', 'fallo_salvacion'].includes(d.cuando)))
        return 'Desplazamiento inválido.';
    if (t.derribo && !['siempre', 'fallo_salvacion'].includes(t.derribo))
        return 'Derribo inválido.';
    if ((t.derribo === 'fallo_salvacion' || d?.cuando === 'fallo_salvacion') && !e.salvacion)
        return 'Falta la salvación de la habilidad.';
    return null;
}
export function alcanceDesde(origen, t, d) {
    const resultado = [];
    for (let y = 0; y < d.filas; y++)
        for (let x = 0; x < d.columnas; x++)
            if (distanciaCasillas(origen, { x, y }) <= t.alcance)
                resultado.push({ x, y });
    return resultado;
}
/** Círculo/cruz usan radio; cuadrado usa lado; línea/cono usan longitud desde el lanzador. */
export function areaDesde(origen, centro, t, d) {
    const resultado = [], n = t.tamano;
    const vx = centro.x - origen.x, vy = centro.y - origen.y;
    const horizontal = Math.abs(vx) >= Math.abs(vy), signo = Math.sign(horizontal ? vx : vy) || 1;
    for (let y = 0; y < d.filas; y++)
        for (let x = 0; x < d.columnas; x++) {
            const dx = x - centro.x, dy = y - centro.y, dist = Math.abs(dx) + Math.abs(dy);
            const avance = (horizontal ? x - origen.x : y - origen.y) * signo, lateral = Math.abs(horizontal ? y - origen.y : x - origen.x);
            const dentro = t.forma === 'individual' ? dx === 0 && dy === 0 : t.forma === 'circulo' ? dist <= n : t.forma === 'cuadrado' ? dx >= -Math.floor((n - 1) / 2) && dx <= Math.ceil((n - 1) / 2) && dy >= -Math.floor((n - 1) / 2) && dy <= Math.ceil((n - 1) / 2) : t.forma === 'cruz' ? (dx === 0 || dy === 0) && dist <= n : t.forma === 'linea' ? avance >= 1 && avance <= n && lateral === 0 : avance >= 1 && avance <= n && lateral < avance;
            if (dentro)
                resultado.push({ x, y });
        }
    return resultado;
}
function objetivoPermitido(a, t, e) { return e.afecta === 'todos' || e.afecta === 'yo' && a.id === t.id || e.afecta === 'aliados' && a.bando === t.bando || e.afecta === 'enemigos' && a.bando !== t.bando; }
function secundariosTablero(c, a, t, e, centro, supera) {
    const config = e.tablero;
    if (!config || !centro || t.vida <= 0)
        return;
    const d = config.desplazamiento;
    if (d && (d.cuando === 'siempre' || !supera)) {
        const posiciones = posicionesTablero(c), dim = dimensionesTablero(c), origen = posiciones[t.id];
        let p = { ...origen };
        const ocupadas = new Set(Object.entries(posiciones).filter(([id]) => id !== t.id).map(([, p]) => `${p.x},${p.y}`));
        for (let i = 0; i < d.casillas; i++) {
            let dx = centro.x - p.x, dy = centro.y - p.y;
            if (d.tipo === 'atraer' && dx === 0 && dy === 0)
                break;
            if (d.tipo === 'empujar') {
                dx = -dx;
                dy = -dy;
                if (!dx && !dy) {
                    dx = p.x - posiciones[a.id].x;
                    dy = p.y - posiciones[a.id].y;
                }
                if (!dx && !dy)
                    break;
            }
            const pasos = Math.abs(dx) >= Math.abs(dy) ? [{ x: Math.sign(dx), y: 0 }, { x: 0, y: Math.sign(dy) }] : [{ x: 0, y: Math.sign(dy) }, { x: Math.sign(dx), y: 0 }];
            const siguiente = pasos.filter(v => v.x || v.y).map(v => ({ x: p.x + v.x, y: p.y + v.y })).find(v => v.x >= 0 && v.y >= 0 && v.x < dim.columnas && v.y < dim.filas && !ocupadas.has(`${v.x},${v.y}`));
            if (!siguiente)
                break;
            p = siguiente;
        }
        t.posicion = p;
        log(c, `${t.nombre}: ${d.tipo === 'atraer' ? 'atraído' : 'empujado'} ${distanciaCasillas(origen, p)} casillas hasta (${p.x + 1}, ${p.y + 1}).`);
    }
    if (config.derribo && (config.derribo === 'siempre' || !supera)) {
        estado(t, 'derribado', 'Derribado: en el suelo', 0, { bono_impacto: -2 });
        log(c, `${t.nombre} queda en el suelo. Levantarse cuesta la mitad de su movimiento máximo.`);
    }
}
export function levantarse(c, actorId) {
    return registrar(c, () => {
        const n = copia(c), m = n.miembros.find(m => m.id === actorId);
        if (n.fase !== 'en_curso' || n.actual !== actorId || !m || m.vida <= 0 || !tiene(m, 'derribado'))
            throw Error('Solo puedes levantarte en tu turno si estás derribado.');
        const max = Math.max(0, Math.min(100, Math.floor(estadisticas(m).movimiento ?? 6))), coste = Math.ceil(max / 2);
        if (movimientoRestante(m) < coste)
            throw Error('No queda movimiento suficiente para levantarte.');
        m.movimiento = { turno: m.turnos, gastado: (m.movimiento?.turno === m.turnos ? m.movimiento.gastado : 0) + coste };
        quitarEstado(m, 'derribado');
        log(n, `${m.nombre} se levanta y gasta ${coste} casillas de movimiento.`);
        return n;
    });
}
/** Delta real de vida, después de defensas, salvaciones y límites de curación. */
export function cambiosVida(antes, despues) {
    const vidas = new Map(antes.miembros.map(m => [m.id, m.vida]));
    return despues.miembros.flatMap(m => {
        const previa = vidas.get(m.id);
        if (typeof previa !== 'number' || !Number.isFinite(previa) || !Number.isFinite(m.vida) || m.vida === previa)
            return [];
        return [{ id: m.id, delta: m.vida - previa }];
    });
}
export function registrarCambiosVida(antes, despues) {
    return { ...despues, evento_visual: { id: crypto.randomUUID(), nombre: despues.miembros.find(m => m.id === despues.actual)?.nombre || 'Combate', dados: [], resultado: despues.resultado, cambios_vida: cambiosVida(antes, despues) } };
}
