# Conceptos básicos que no eran configurables y ahora sí · Plan completo

Estado: plan. Sin cambios de código. Este documento reúne todo lo que falta para que el Yunque configure lo que antes estaba fijo en el motor.

## Mapa de planes

| Plan | Dónde está | Estado |
|---|---|---|
| YUNQUE - UNA MÁS, Partes 1–3 (menús en pantalla, reacciones generales, artefactos con nivel) | `main`, `docs/planes/plan-yunque-una-mas.md` | Ejecutado (PR #56). Pendientes menores en `docs/pendientes-yunque-una-mas.md` |
| YUNQUE - UNA MÁS, Parte 4 (inmunidades, efectos mentales, equipamiento) | Rama `claude/admiring-heisenberg-fh1iyc`, `docs/plan-yunque-una-mas.md` | Plan. No está en `main` |
| Rasgos combinables (potenciadores, recursos configurables) | Rama `claude/admiring-heisenberg-fh1iyc`, `docs/plan-rasgos-combinables.md` | Plan |
| Estados configurables (primitivas) | Rama `claude/admiring-heisenberg-fh1iyc`, `docs/plan-estados-configurables.md` | Plan con decisiones tomadas |
| **Conceptos básicos configurables** (este documento) | Rama `claude/admiring-heisenberg-fh1iyc`, `docs/plan-conceptos-basicos-configurables.md` | Plan |

**Orden de dependencias:** Parte 4 (inmunidades) → Estados → Rasgos → Conceptos básicos (esqueletos y animaciones). Los conceptos básicos pueden empezar en paralelo para la parte de **ataque desarmado** y **guardia**, porque solo necesitan el catálogo de acciones.

Primero se traslada todo a una rama nueva desde `main` (paso 0). Ningún paso se ejecuta sobre la rama desfasada.

## Diagnóstico de partida

Lo que hoy está fijo en código, según `origin/main`:

| Concepto | Dónde está | Qué lo fija |
|---|---|---|
| Ataque desarmado | `lib/combate.ts:1007` (nombre «Ataque desarmado»), `:1037`, `:1040` (variante «mano libre») | Nombre, alcance y efecto codificados. No se puede crear un «ataque desarmado» distinto para una criatura o un personaje. |
| Guardia | `lib/combate.ts:1267-1268` (`accionId === "guardia"`, estado «Guardia» con armadura 2) | Valor de armadura y duración fijos en el motor. |
| Animación de armas | `lib/animaciones-armas.ts` (`tipoAnimacionArma`): solo tres tipos, `arco`, `espada` y `punos`, decididos con expresiones regulares sobre el nombre | Un arma nueva solo tiene animación si su nombre coincide con una lista. Hacha y martillo caen en «espada» por regex, no por diseño. |
| Armas básicas | Forja: arco, lanza y bastón existen como básicos | Sus animaciones no salen de una estructura reutilizable. |

## Principio

Los conceptos básicos son **plantillas configurables**, no código. El motor ejecuta el concepto (atacar, defender, pelear sin armas) y cada creación decide sus valores y su animación desde un **esqueleto**. Un esqueleto es un molde: define qué puntos de anclaje tiene un arma o un gesto, y cada creación lo rellena.

---

## Paso 0 · Rama nueva desde `main`

- **Qué hacer:** crear `claude/conceptos-basicos-configurables` desde `origin/main`. Traer los documentos de la rama anterior con `git checkout origin/claude/admiring-heisenberg-fh1iyc -- docs/plan-yunque-una-mas.md docs/plan-rasgos-combinables.md docs/plan-estados-configurables.md docs/plan-conceptos-basicos-configurables.md`.
- **Criterio de salida:** `git log` muestra `main` como base y los cuatro documentos están en la rama.

---

## PARTE A · Ataque desarmado configurable

### A.1 · Modelo de ataque básico
- **Archivos:** `lib/creacion.ts` (tipo `Efecto`), `lib/conceptos-basicos.ts` (nuevo).
- **Qué hacer:**
  1. Un **concepto básico** es una definición con `id` (`desarmado`, `guardia`, `ataque_arma`…), `nombre`, `alcance`, `daño` (dados, caras, modificador, naturaleza, elemento), `coste` y `animacion` (referencia a un esqueleto, ver Parte B).
  2. Cada personaje, raza, criatura o linaje puede **sustituir** el concepto por uno propio. Si no sustituye nada, se usa el concepto por defecto.
  3. Sustitución por `id`, no por nombre.
- **Prueba:** `tests/conceptos-basicos-modelo.test.mjs`: validación; sustitución por id; el concepto por defecto se usa si no hay sustitución.
- **Criterio de salida:** prueba pasa.

### A.2 · Migrar el desarmado al modelo
- **Archivos:** `lib/combate.ts` (líneas 1007, 1037, 1040), `lib/yunque-plantillas.ts`.
- **Qué hacer:** el nombre «Ataque desarmado» y los valores pasan a la definición por defecto. El motor lee el concepto, no el texto.
- **Prueba:** regresión: `node --test tests/*.test.mjs`; el desarmado de los personajes actuales da el mismo daño, alcance y coste.
- **Criterio de salida:** ningún resultado cambia.

### A.3 · Ataque desarmado distinto para alguien o algo
- **Archivos:** `components/yunque/editores/EditorAccion.tsx`, `components/yunque/TallerYunque.tsx`.
- **Qué hacer:** en la Forja, un personaje o criatura puede definir su propio desarmado: por ejemplo, una criatura que muerde con 2d6 y alcance 1, o un personaje con garras y efecto de sangrado.
- **Prueba:** Playwright en el Yunque a 390 px y escritorio: crear un desarmado con mordisco y verlo en combate.
- **Criterio de salida:** el desarmado personalizado aparece en la tarjeta del combatiente y se ejecuta.

---

## PARTE B · Guardia configurable

### B.1 · Guardia como concepto básico
- **Archivos:** `lib/conceptos-basicos.ts`, `lib/combate.ts` (`:1267-1268`).
- **Qué hacer:**
  1. La guardia es un concepto con `bonos` (armadura, bloqueo, salvación), `duracion` (hasta el inicio del siguiente turno, o configurable), `coste` y `condiciones` (por ejemplo, solo con escudo o sin arma a dos manos).
  2. El estado «Guardia» pasa a ser una definición de estado (plan de estados, Paso 2).
- **Prueba:** `tests/guardia-configurable.test.mjs`: la guardia por defecto da armadura 2 como antes; una guardia configurada da otros bonos.
- **Criterio de salida:** regresión idéntica.

### B.2 · Guardia distinta para alguien o algo
- **Archivos:** igual que A.3.
- **Qué hacer:** un personaje o criatura puede definir su guardia: por ejemplo, una criatura que se endurece con armadura 4 pero no puede moverse, o un personaje que gana salvación en lugar de armadura.
- **Prueba:** Playwright: la guardia personalizada muestra su frase en la tarjeta y en el menú.
- **Criterio de salida:** se crea y funciona en combate sin tocar código.

---

## PARTE C · Esqueletos de armas y animaciones

Esta es la parte central. Hoy las animaciones se deciden leyendo el nombre del arma. Un **esqueleto** define la forma y los puntos de anclaje de un arma; la animación se construye sobre él.

### C.1 · Definición de esqueleto
- **Archivos nuevos:** `lib/esqueletos.ts`, `tests/esqueletos.test.mjs`.
- **Qué hacer:** un esqueleto tiene:
  - `id`: `espada`, `hacha`, `lanza`, `arco`, `baston`, `punos`.
  - `familia_gesto`: cómo se mueve el arma (`corte`, `estocada`, `golpe_pesado`, `barrido`, `tiro`, `impacto_corto`).
  - `anclas`: puntos donde se sujeta el arma y dónde termina el gesto (mango, centro, punta).
  - `longitud_relativa`: tamaño visual en casillas o en píxeles normalizados.
  - `fases`: preparación, impacto y recuperación, con su duración.
- **Prueba:** validación de anclas y fases.
- **Criterio de salida:** los seis esqueletos base se validan.

### C.2 · Esqueletos base para las armas básicas
- **Archivos:** `lib/esqueletos.ts`, `lib/animaciones-armas.ts`.
- **Qué hacer:** crear los esqueletos de **espada, hacha, lanza, arco, bastón y puños**. El arco, la lanza y el bastón que ya existen en la Forja se asignan a su esqueleto sin cambiar su aspecto.
- **Prueba:** `tests/esqueletos-basicos.test.mjs`: cada arma básica usa su esqueleto; ninguna cae en otro por nombre.
- **Criterio de salida:** las seis armas básicas se animan desde su esqueleto.

### C.3 · Sustituir la detección por nombre
- **Archivos:** `lib/animaciones-armas.ts` (`tipoAnimacionArma`).
- **Qué hacer:**
  1. La animación se elige por el **esqueleto asignado** al arma o al concepto. El nombre ya no decide.
  2. La función antigua se conserva como respaldo solo para creaciones antiguas sin esqueleto. Al cargar, se asigna el esqueleto que corresponde (migración en memoria, sin escritura).
  3. Hacha y martillo dejan de caer en «espada»: tienen su propio esqueleto.
- **Prueba:** `tests/animaciones-armas.test.mjs` (ya existente) debe pasar; se añaden casos de hacha, martillo y lanza.
- **Criterio de salida:** regresión de las pruebas de animación y los casos nuevos.

### C.4 · Animación de cada esqueleto
- **Archivos:** `components/AnimacionesArmas.tsx`, `components/animaciones-armas.css`.
- **Qué hacer:** cada esqueleto define su gesto con las fases de C.1. Solo `transform` y `opacity`, desactivados con `prefers-reduced-motion`.
- **Prueba:** Playwright: un gesto de cada esqueleto a 390 px y escritorio; capturas a `deviceScaleFactor: 2`.
- **Criterio de salida:** los seis gestos se ven y no producen scroll horizontal.

### C.5 · Crear un arma nueva desde un esqueleto en el Yunque
- **Archivos:** `components/yunque/editores/EditorAccion.tsx`, `components/TablaArmas.tsx`.
- **Qué hacer:**
  1. Al crear un arma, el GM elige un esqueleto de la lista (espada, hacha, lanza, arco, bastón, puños, o uno nuevo).
  2. El esqueleto rellena la animación automáticamente. El GM ajusta solo longitud y color.
  3. Vista previa de la animación en el propio Yunque.
- **Prueba:** Playwright: crear una «Guadaña» con esqueleto de hacha y ver su gesto.
- **Criterio de salida:** un arma nueva sale con animación sin programar.

### C.6 · Esqueletos nuevos desde el Yunque
- **Archivos:** `lib/esqueletos.ts`, tabla `esqueletos` si debe compartirse entre creaciones (migración idempotente con PGlite).
- **Qué hacer:** el GM puede crear un esqueleto nuevo copiando uno existente y cambiando anclas, fases y familia de gesto.
- **Prueba:** `tests/esqueletos-database.mjs` (PGlite): migración idempotente, permisos de escritura solo para el GM.
- **Criterio de salida:** un esqueleto creado desde la interfaz se usa en combate.

---

## PARTE D · Verificación

- `node --test tests/*.test.mjs` completo.
- Regresión: Kion (batería de 1.344 combinaciones) y las pruebas de reacciones.
- Playwright en el Yunque: crear un desarmado y una guardia personalizados, y un arma nueva con esqueleto.
- Partida de prueba: los seis esqueletos base en combate.
- Resultados anotados en `docs/metricas/`.

## Riesgos

- **Migrar el desarmado y la guardia** puede cambiar combates en curso. Se hace al cargar, sin escribir en la base, igual que la migración de `defensa` a `reaccion`.
- **Esqueletos y animaciones** tienen un coste visual. Cada esqueleto nuevo debe pasar la prueba de rendimiento de `docs/combate-calidad-visual.md`.
- **Hacha y martillo** hoy se animan como espada. Al cambiarlo, la apariencia en combate cambia; conviene avisar al GM.

## Preguntas abiertas

1. ¿El esqueleto de «puños» debe poder sostener un objeto (por ejemplo, un guantelete con pinchos)? Propongo que sí, como ancla opcional.
2. ¿Se permiten esqueletos nuevos creados por jugadores, o solo por el GM? Propongo que solo el GM.
3. ¿La duración de la guardia se cuenta en turnos del portador o en rondas? Propongo turnos del portador, como hoy.
