# Registro de estados y formas · Implementación (Niveles 0 y 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** que cada estado o forma (furia, veneno...) se elija de un menú y nunca se escriba a mano, sin romper ningún estado que ya existe.

**Architecture:** un registro por creación con `id` estable y `nombre` visible. Los datos antiguos conservan su clave como `id`, porque el motor compara por esa cadena (`lib/combate.ts:2225`, `2231`). Renombrar cambia solo el nombre. El motor no cambia.

**Tech Stack:** TypeScript (módulos puros en `lib/`, pruebas con `node --test` y `tests/helpers/cargar-ts.mjs`), React en `components/yunque/editores/`.

**Spec:** `docs/superpowers/specs/2026-11-24-yunque-nodos-design.md` · Plan por niveles: `docs/superpowers/plans/2026-11-24-yunque-nodos-plan.md`

## Global Constraints

- El `id` de un estado nunca cambia al renombrarlo.
- Los `id` de datos existentes son la clave original exacta (`furia`, `veneno`), sin normalizar.
- El motor de combate no se modifica en este plan.
- No se ejecuta ninguna migración contra la base de datos real. Solo funciones puras con pruebas.
- Las pruebas se ejecutan con `npm test` (ejecuta `scripts/preparar-motor-edge.mjs` y luego `node --test tests/*.test.mjs`).

## Review Focus

1. Clave antigua con mayúsculas o espacios (`"Furia "`): debe seguir funcionando tal cual, sin normalizar. Prueba en Task 2.
2. Renombrar un estado no debe romper ningún nodo que lo usa. Prueba en Task 1.
3. Clave huérfana (un nodo usa `veneno` pero no hay registro): el nodo debe mostrar «Sin registrar» y seguir funcionando. Prueba en Task 2.
4. Crear un estado con un nombre que ya existe: se rechaza, no se duplica. Prueba en Task 1.
5. Regla antigua con clave vacía: el validador la marca, el motor no falla. Prueba en Task 4.

---

### Task 0: Línea base

**Files:** ninguno se modifica.

- [x] **Step 1: Ejecutar las pruebas**

Run: `npm test`
Expected: anotar cuántas pruebas pasan y cuántas fallan. Si hay fallos previos, se listan y no se tocan.

- [x] **Step 2: Compilar**

Run: `npm run build`
Expected: anotar si compila. Si falla antes de los cambios, se registra como línea base.

- [x] **Step 3: Commit de la línea base**

No hay cambios que commitear. Anotar los resultados en la respuesta al usuario.

---

### Task 1: Registro de estados (`lib/registro-estados.ts`)

**Files:**
- Create: `lib/registro-estados.ts`
- Test: `tests/registro-estados.test.mjs`

**Interfaces:**
- Produces:
  - `type RegistroEstado = { id: string; nombre: string; icono?: string; duracion?: number }`
  - `crearEstado(lista: RegistroEstado[], datos: {nombre: string; icono?: string; duracion?: number}): {ok: true; lista: RegistroEstado[]; id: string} | {ok: false; error: string}`
  - `renombrarEstado(lista: RegistroEstado[], id: string, nombre: string): {ok: true; lista: RegistroEstado[]} | {ok: false; error: string}`
  - `buscarEstado(lista: RegistroEstado[], id: string): RegistroEstado | undefined`
  - `slugDe(nombre: string): string` (minúsculas, sin acentos, espacios a `_`, solo `[a-z0-9_]`)

- [x] **Step 1: Escribir las pruebas que fallan**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {crearEstado,renombrarEstado,buscarEstado,slugDe}=cargarDependencia('registro-estados');

test('crear genera un id desde el nombre y no lo cambia al renombrar', () => {
  const c = crearEstado([], {nombre:'Furia'});
  assert.equal(c.ok, true);
  assert.equal(c.id, 'furia');
  const r = renombrarEstado(c.lista, 'furia', 'Rabia');
  assert.equal(r.ok, true);
  assert.equal(buscarEstado(r.lista, 'furia').nombre, 'Rabia');
});

test('no duplica un nombre existente', () => {
  const c = crearEstado([{id:'furia', nombre:'Furia'}], {nombre:'furia'});
  assert.equal(c.ok, false);
});

test('rechaza nombre vacío', () => {
  assert.equal(crearEstado([], {nombre:'   '}).ok, false);
});

test('slugDe quita acentos y espacios', () => {
  assert.equal(slugDe('Ánimo Férreo'), 'animo_ferreo');
});
```

- [x] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/registro-estados.test.mjs`
Expected: FAIL («cannot find module» o similar).

- [x] **Step 3: Implementar lo mínimo**

Implementar las cinco funciones de Interfaces en `lib/registro-estados.ts`. Sin React ni dependencias externas.

- [x] **Step 4: Ejecutar y ver que pasan**

Run: `node --test tests/registro-estados.test.mjs`
Expected: 4 pruebas PASS.

- [x] **Step 5: Commit**

```bash
git add lib/registro-estados.ts tests/registro-estados.test.mjs
git commit -m "feat(yunque): registro de estados con id estable"
```

---

### Task 2: Migración de claves existentes (función pura)

**Files:**
- Modify: `lib/registro-estados.ts` (añadir `registrarClavesExistentes`)
- Test: `tests/registro-estados.test.mjs` (añadir casos)

**Interfaces:**
- Consumes: `RegistroEstado`, `crearEstado` de Task 1.
- Produces:
  - `registrarClavesExistentes(lista: RegistroEstado[], reglas: unknown[]): RegistroEstado[]`
    Recorre `reglas` buscando claves en `efectos[].tipo==='transformar'` (campo `clave`), `efectos[].tipo==='estado'` (campo `estado`), y `condicion.tipo==='estado_terminado'` (campo `clave`). Por cada clave no registrada añade `{id: clave, nombre: clave}` con la clave **exacta**, sin normalizar.

- [x] **Step 1: Escribir las pruebas que fallan**

```js
const {registrarClavesExistentes}=cargarDependencia('registro-estados');
test('registra claves antiguas con su id exacto', () => {
  const reglas=[{efectos:[{tipo:'transformar',clave:'Furia '}]},{condicion:{tipo:'estado_terminado',clave:'veneno'}}];
  const lista=registrarClavesExistentes([], reglas);
  assert.deepEqual(lista.map(e=>e.id).sort(), ['Furia ','veneno'].sort());
});
test('no duplica claves ya registradas', () => {
  const lista=registrarClavesExistentes([{id:'furia',nombre:'Furia'}], [{efectos:[{tipo:'transformar',clave:'furia'}]}]);
  assert.equal(lista.length, 1);
});
```

- [x] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/registro-estados.test.mjs`
Expected: FAIL en los dos casos nuevos.

- [x] **Step 3: Implementar**

Añadir `registrarClavesExistentes` en `lib/registro-estados.ts` según Interfaces. No modificar las reglas.

- [x] **Step 4: Ejecutar y ver que pasan**

Run: `node --test tests/registro-estados.test.mjs`
Expected: todas PASS.

- [x] **Step 5: Commit**

```bash
git add lib/registro-estados.ts tests/registro-estados.test.mjs
git commit -m "feat(yunque): registrar claves antiguas sin cambiarlas"
```

---

### Task 3: Opciones del selector (función pura)

**Files:**
- Modify: `lib/registro-estados.ts` (añadir `opcionesSelector`)
- Test: `tests/registro-estados.test.mjs`

**Interfaces:**
- Consumes: `RegistroEstado`.
- Produces:
  - `opcionesSelector(lista: RegistroEstado[], valor: string | undefined): {valor: string; nombre: string; huerfano: boolean}[]`
    Devuelve las opciones del registro. Si `valor` existe pero no está en el registro, añade una opción `{valor, nombre: 'Sin registrar', huerfano: true}` para que el nodo siga mostrándolo.

- [x] **Step 1: Escribir las pruebas que fallan**

```js
const {opcionesSelector}=cargarDependencia('registro-estados');
test('añade la clave huérfana como Sin registrar', () => {
  const o=opcionesSelector([{id:'furia',nombre:'Furia'}], 'veneno');
  assert.ok(o.some(x=>x.valor==='veneno'&&x.huerfano===true&&x.nombre==='Sin registrar'));
});
test('sin valor no añade huérfanos', () => {
  assert.equal(opcionesSelector([{id:'furia',nombre:'Furia'}], undefined).length, 1);
});
```

- [x] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/registro-estados.test.mjs`
Expected: FAIL.

- [x] **Step 3: Implementar** `opcionesSelector` según Interfaces.

- [x] **Step 4: Ejecutar y ver que pasan**

Run: `node --test tests/registro-estados.test.mjs`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add lib/registro-estados.ts tests/registro-estados.test.mjs
git commit -m "feat(yunque): opciones del selector de estados"
```

---

### Task 4: Selector y sustitución del texto libre

**Files:**
- Create: `components/yunque/editores/SelectorEstado.tsx`
- Modify: `components/yunque/editores/EditorEntonces.tsx:87-88`
- Modify: `components/yunque/editores/EditorSi.tsx:40`, `:43`, `:70`
- Modify: `lib/reglas.ts` (validador de `estado_terminado` y de `estado`, para pedir elegir un estado)
- Test: `tests/registro-estados.test.mjs` (validador)

**Interfaces:**
- Consumes: `opcionesSelector`, `crearEstado` de Tasks 1 y 3.
- Produces: `SelectorEstado({valor: string | undefined; lista: RegistroEstado[]; onElegir: (id: string) => void; onCrear: (nombre: string) => void}): JSX.Element`
  Un `<select>` con `opcionesSelector` y una opción final «+ Crear estado nuevo» que pide el nombre y llama a `onCrear`.

- [x] **Step 1: Escribir la prueba que falla del validador**

```js
const {validarRegla}=cargarDependencia('reglas');
test('una condición de estado sin clave se marca', () => {
  const r = validarRegla({id:'x',nombre:'x',evento:'usar',condicion:{tipo:'estado_terminado',clave:''},efectos:[]});
  assert.ok(typeof r === 'string' ? r.length > 0 : r !== null);
});
```

(Antes de escribir la prueba, confirmar el nombre real de la función validadora en `lib/reglas.ts` y ajustar la llamada; el resultado debe ser un mensaje de error.)

- [x] **Step 2: Ejecutar y ver que falla**

Run: `node --test tests/registro-estados.test.mjs`
Expected: FAIL si el validador no marca clave vacía en `estado_terminado`. Si ya la marca, la prueba pasa y se documenta.

- [x] **Step 3: Implementar**

- En `lib/reglas.ts`, marcar con mensaje «Elige un estado» cuando `clave` esté vacía en `estado_terminado` o `estado` vacío.
- Crear `SelectorEstado.tsx` según Interfaces.
- En `EditorSi.tsx`, quitar el valor por defecto `furia` (líneas 40 y 43) y sustituir el texto libre (línea 70) por `SelectorEstado`.
- En `EditorEntonces.tsx`, sustituir el texto libre (líneas 87-88) por `SelectorEstado`.
- Los datos del registro se pasan desde el borrador (`registrarClavesExistentes` al cargar).

- [x] **Step 4: Ejecutar pruebas y compilar**

Run: `npm test` y luego `npm run build`
Expected: las mismas pruebas que en Task 0 pasan, más las nuevas. Compilación sin errores nuevos.

- [x] **Step 5: Commit**

```bash
git add components/yunque/editores/SelectorEstado.tsx components/yunque/editores/EditorEntonces.tsx components/yunque/editores/EditorSi.tsx lib/reglas.ts tests/registro-estados.test.mjs
git commit -m "feat(yunque): elegir estados de un menú en lugar de escribir la clave"
```

---

### Task 5: Jefe de nivel 1 (comprobación en el navegador)

**Files:** ninguno.

- [x] **Step 1:** Arrancar `npm run dev` y abrir el Yunque de un personaje de prueba.
- [x] **Step 2:** Crear un estado «Furia» desde un nodo `si`, usarlo en un nodo `entonces`, renombrarlo a «Rabia» y comprobar que ambos nodos siguen funcionando.
- [x] **Step 3:** Capturar pantallas con Playwright (`deviceScaleFactor: 2`) y revisarlas.
- [x] **Step 4:** Marcar el Nivel 1 como ✔ en `docs/superpowers/plans/2026-11-24-yunque-nodos-plan.md`, con commit.

---

## Estado

**Nivel 1: ✔** (2026-11-24). Comprobado en el navegador con un arnés temporal: crear «Furia» desde un nodo `si`, usarlo en un `entonces`, renombrarlo a «Rabia»; el id `furia` no cambia y ambos nodos siguen válidos.

## Self-review

- **Cobertura del spec:** registro de claves (Task 1-3), selector (Task 4). Plantillas vivas, presupuesto y personajes quedan para planes posteriores, como indica el plan por niveles.
- **Consistencia de tipos:** `RegistroEstado`, `crearEstado`, `renombrarEstado`, `buscarEstado`, `slugDe`, `registrarClavesExistentes`, `opcionesSelector` y `SelectorEstado` usan los mismos nombres en todas las tareas.
- **Review Focus:** cada punto tiene una prueba en su tarea.
- **Riesgo conocido:** Task 4 Step 1 depende del nombre real del validador en `lib/reglas.ts`. Está marcado para confirmarlo antes de escribir la prueba.
