# Transformaciones y poderes oculares por nodos · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que las transformaciones se configuren como grafo de formas (cambio libre y cadenas) con vuelta a la realidad siempre disponible, y que los poderes oculares usen los mismos nodos.

**Architecture:** una transformación pasa a tener `formas` (nodos) y `transiciones` (conexiones con `sentido` `ambos` o `uno`). La vuelta a la realidad es una regla del motor, no un dato. Las transformaciones antiguas se convierten en cadenas lineales automáticamente, sin cambiar sus valores. El motor de combate conserva `transformacion.posesion` tal como lo usa Orin.

**Tech Stack:** TypeScript (módulos puros en `lib/`, pruebas con `node --test` y `tests/helpers/cargar-ts.mjs`), React en `components/yunque/editores/`, motor en `supabase/functions/equipo-combate/motor.js` (pruebas en `tests/movimiento-posesion.test.mjs` como referencia).

**Spec:** `docs/superpowers/specs/2026-11-24-transformaciones-nodos-design.md`

## Global Constraints

- Ninguna transformación existente cambia sus valores de estadísticas, poderes o `posesion` tras la migración.
- Orin («Liberar el sello») se comporta igual antes y después: mismo `etapa_id`, mismo `descontrolada`, mismo `posesion`.
- La vuelta a la realidad está disponible desde cualquier forma, incluida una que toma el control.
- Los ids de forma son estables; renombrar una forma no cambia su id.
- No se ejecuta ninguna migración contra la base real sin confirmación. Solo funciones puras con prueba.
- Las pruebas se ejecutan con `npm test`. La compilación se comprueba con `npx tsc --noEmit` porque `npm run build` falla en este entorno por falta de variables de Supabase (línea base registrada).

## Review Focus

1. Forma sin salida (sin transición ni realidad alcanzable): debe marcarse como error de validación. Prueba en Task 2.
2. Transformación antigua sin etapas o con etapas duplicadas: la migración no debe fallar ni perder datos. Prueba en Task 4.
3. Vuelta a la realidad desde una forma que toma el control: debe seguir disponible. Prueba en Task 3.
4. Renombrar una forma: el id y las transiciones no cambian. Prueba en Task 1.
5. Cambio libre que deja estadísticas de la forma anterior activas: el motor debe aplicar solo las de la forma actual. Prueba en Task 5.

---

### Task 1: Modelo de formas y transiciones (`lib/transformaciones-grafo.ts`)

**Files:**
- Create: `lib/transformaciones-grafo.ts`
- Test: `tests/transformaciones-grafo.test.mjs`

**Interfaces:**
- Produces:
  - `type Forma = { id: string; nombre: string; es_realidad?: boolean; estadisticas: Record<string, number>; poderes: string[]; apariencia?: {imagen_url?: string} }`
  - `type Transicion = { id: string; desde: string; hasta: string; sentido: 'ambos' | 'uno'; coste?: {ph?: number; fatiga?: number}; condicion?: unknown }`
  - `type Grafo = { formas: Forma[]; transiciones: Transicion[] }`
  - `crearForma(grafo: Grafo, datos: {nombre: string; estadisticas?: Record<string, number>}): {ok: true; grafo: Grafo; id: string} | {ok: false; error: string}`
  - `renombrarForma(grafo: Grafo, id: string, nombre: string): {ok: true; grafo: Grafo} | {ok: false; error: string}`
  - `conectar(grafo: Grafo, desde: string, hasta: string, sentido: 'ambos' | 'uno'): {ok: true; grafo: Grafo} | {ok: false; error: string}`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {crearForma,renombrarForma,conectar}=cargarDependencia('transformaciones-grafo');

test('renombrar no cambia el id ni las transiciones', () => {
  let g={formas:[],transiciones:[]};
  const a=crearForma(g,{nombre:'Humano'}); g=a.grafo;
  const b=crearForma(g,{nombre:'Dragón'}); g=b.grafo;
  g=conectar(g,a.id,b.id,'ambos').grafo;
  const r=renombrarForma(g,a.id,'Persona');
  assert.equal(r.ok,true);
  assert.equal(r.grafo.formas.find(f=>f.id===a.id).nombre,'Persona');
  assert.equal(r.grafo.transiciones.length,1);
});

test('no conecta una forma consigo misma', () => {
  let g={formas:[],transiciones:[]};
  const a=crearForma(g,{nombre:'Humano'}); g=a.grafo;
  assert.equal(conectar(g,a.id,a.id,'ambos').ok,false);
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/transformaciones-grafo.test.mjs`
Expected: FAIL («cannot find module» o similar).

- [ ] **Step 3: Implementar lo mínimo**

Implementar las funciones de Interfaces en `lib/transformaciones-grafo.ts`. Sin React ni dependencias externas. `id` de forma: slug del nombre, con sufijo numérico si ya existe.

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `node --test tests/transformaciones-grafo.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/transformaciones-grafo.ts tests/transformaciones-grafo.test.mjs
git commit -m "feat(transformaciones): modelo de formas y transiciones"
```

---

### Task 2: Validación del grafo

**Files:**
- Modify: `lib/transformaciones-grafo.ts` (añadir `validarGrafo`)
- Test: `tests/transformaciones-grafo.test.mjs`

**Interfaces:**
- Consumes: `Grafo`, `Forma`, `Transicion` de Task 1.
- Produces: `validarGrafo(grafo: Grafo): string | null`
  Devuelve un mensaje de error o `null`. Reglas: debe existir exactamente una forma con `es_realidad: true`; toda forma debe poder alcanzar la realidad siguiendo transiciones (la vuelta implícita cuenta, así que esta regla solo falla si hay más de una realidad o ninguna); no hay transiciones a formas inexistentes.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
const {validarGrafo}=cargarDependencia('transformaciones-grafo');
test('exige exactamente una realidad', () => {
  const g={formas:[{id:'a',nombre:'A',estadisticas:{},poderes:[]}],transiciones:[]};
  assert.match(validarGrafo(g), /realidad/);
});
test('rechaza una transición a una forma que no existe', () => {
  const g={formas:[{id:'a',nombre:'A',es_realidad:true,estadisticas:{},poderes:[]}],transiciones:[{id:'t',desde:'a',hasta:'x',sentido:'ambos'}]};
  assert.notEqual(validarGrafo(g), null);
});
test('un grafo válido devuelve null', () => {
  const g={formas:[{id:'a',nombre:'A',es_realidad:true,estadisticas:{},poderes:[]},{id:'b',nombre:'B',estadisticas:{},poderes:[]}],transiciones:[{id:'t',desde:'a',hasta:'b',sentido:'ambos'}]};
  assert.equal(validarGrafo(g), null);
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/transformaciones-grafo.test.mjs`
Expected: FAIL en los tres casos.

- [ ] **Step 3: Implementar** `validarGrafo` según Interfaces.

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `node --test tests/transformaciones-grafo.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/transformaciones-grafo.ts tests/transformaciones-grafo.test.mjs
git commit -m "feat(transformaciones): validar grafo de formas"
```

---

### Task 3: Vuelta a la realidad y forma que toma el control

**Files:**
- Modify: `lib/transformaciones-grafo.ts` (añadir `formasAlcanzables`)
- Test: `tests/transformaciones-grafo.test.mjs`

**Interfaces:**
- Consumes: `Grafo` de Task 1.
- Produces: `formasAlcanzables(grafo: Grafo, desde: string): string[]`
  Devuelve las formas a las que se puede ir desde `desde`. Incluye siempre la realidad, aunque no haya transición directa. Si la forma tiene `control: true` (toma el control), la realidad sigue incluida.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
const {formasAlcanzables}=cargarDependencia('transformaciones-grafo');
test('la realidad es alcanzable desde cualquier forma, aunque no haya transición', () => {
  const g={formas:[{id:'r',nombre:'R',es_realidad:true,estadisticas:{},poderes:[]},{id:'x',nombre:'X',estadisticas:{},poderes:[]}],transiciones:[]};
  assert.ok(formasAlcanzables(g,'x').includes('r'));
});
test('una forma que toma el control sigue teniendo vuelta a la realidad', () => {
  const g={formas:[{id:'r',nombre:'R',es_realidad:true,estadisticas:{},poderes:[]},{id:'gigante',nombre:'Gigante',control:true,estadisticas:{},poderes:[]}],transiciones:[]};
  assert.ok(formasAlcanzables(g,'gigante').includes('r'));
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/transformaciones-grafo.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar** `formasAlcanzables` según Interfaces.

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `node --test tests/transformaciones-grafo.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/transformaciones-grafo.ts tests/transformaciones-grafo.test.mjs
git commit -m "feat(transformaciones): vuelta a la realidad desde cualquier forma"
```

---

### Task 4: Migración de transformaciones existentes (función pura)

**Files:**
- Create: `lib/transformaciones-migracion.ts`
- Test: `tests/transformaciones-migracion.test.mjs`

**Interfaces:**
- Consumes: `Grafo`, `Forma`, `Transicion` de Task 1.
- Produces: `migrarTransformacion(antigua: DefinicionTransformacion): Grafo`
  - Cada etapa se convierte en una forma. La forma base (`es_realidad: true`) sale del cuerpo original.
  - Las etapas se enlazan en cadena con transiciones `sentido: 'uno'`.
  - Si la antigua tiene `posesion`, la forma de la etapa que lo activa recibe `control: true` y el campo `posesion` se copia tal cual.
  - Etapas duplicadas: se conservan con sufijo en el id (`gigante`, `gigante_2`), sin perder datos.

Consultar `lib/creacion.ts` (tipo `DefinicionTransformacion`) antes de escribir la prueba para usar sus nombres reales.

- [ ] **Step 1: Escribir las pruebas que fallan**

Probar con el caso de Orin tomado de `tests/movimiento-posesion.test.mjs:26` (etapa `gigante`, `posesion`, `descontrolada: true`). Asserts:
- el resultado tiene una forma `es_realidad: true`;
- la forma `gigante` tiene `control: true`;
- el valor de `posesion` es igual al original (`assert.deepEqual`);
- hay una transición `sentido: 'uno'` entre base y `gigante`.

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/transformaciones-migracion.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar** `migrarTransformacion` según Interfaces.

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `node --test tests/transformaciones-migracion.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/transformaciones-migracion.ts tests/transformaciones-migracion.test.mjs
git commit -m "feat(transformaciones): migrar transformaciones existentes a cadenas"
```

---

### Task 5: Motor — solo las estadísticas de la forma actual

**Files:**
- Modify: `supabase/functions/equipo-combate/motor.js` (lectura de la forma activa)
- Test: `tests/transformaciones-motor.test.mjs`

**Interfaces:**
- Consumes: `Grafo`, `formasAlcanzables` de Task 3.
- Produces: al cambiar de forma, las estadísticas y poderes de la forma anterior dejan de aplicarse. Mismo `posesion` y `descontrolada` que antes para Orin.

Antes de escribir código, leer `tests/movimiento-posesion.test.mjs` completo y `motor.js:874-880` para reutilizar sus helpers. Esta tarea puede requerir revisión de integración porque toca el motor.

- [ ] **Step 1: Escribir la prueba que falla**

Caso: un personaje pasa de `humano` a `dragon` y luego a `humano`. En `dragon`, el ataque de dragón existe; en `humano` ya no. Verificar también que Orin con «Liberar el sello» da `etapa_id === 'gigante'` y `descontrolada === true`, igual que `tests/movimiento-posesion.test.mjs:68-69`.

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `node --test tests/transformaciones-motor.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implementar** la lectura de la forma activa en `motor.js`, sin cambiar los valores de Orin.

- [ ] **Step 4: Ejecutar pruebas del motor**

Run: `node --test tests/transformaciones-motor.test.mjs tests/movimiento-posesion.test.mjs`
Expected: PASS, sin cambios en las pruebas de posesión.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/equipo-combate/motor.js tests/transformaciones-motor.test.mjs
git commit -m "feat(combate): aplicar solo las estadísticas de la forma activa"
```

---

### Task 6: Editor por nodos (formas y transiciones)

**Files:**
- Create: `components/yunque/editores/EditorFormas.tsx`
- Modify: `components/yunque/editores/EditorArtefacto.tsx` o el punto donde hoy se monta `EditorTransformacion` (confirmar con `grep -rn EditorTransformacion components`)

**Interfaces:**
- Consumes: `crearForma`, `renombrarForma`, `conectar`, `validarGrafo` de Tasks 1-2.
- Produces: `EditorFormas({grafo: Grafo; onCambiar: (g: Grafo) => void}): JSX.Element`
  Lienzo con una tarjeta por forma y conexiones entre ellas. Botón «+ Nueva forma» y arrastre para conectar.

- [ ] **Step 1: Prueba de componente**

No hay pruebas de componentes en el proyecto. Comprobar en el navegador en Task 7.

- [ ] **Step 2: Implementar** el editor según Interfaces, reutilizando `Controles.tsx` del Yunque.

- [ ] **Step 3: Compilar**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sin errores nuevos respecto a la línea base (anotar la línea base antes de empezar).

- [ ] **Step 4: Commit**

```bash
git add components/yunque/editores/EditorFormas.tsx
git commit -m "feat(yunque): editor de formas y transiciones por nodos"
```

---

### Task 7: Poderes oculares por nodos

**Files:**
- Modify: `components/yunque/editores/EditorVision.tsx`
- Modify: `lib/vision.ts` (solo si hace falta exponer nodos; no cambiar el modelo `Vision`)

**Interfaces:**
- Consumes: `Vision` de `lib/vision.ts` (sin cambios).
- Produces: el patrón, la dirección, el modo y las recompensas se eligen como nodos conectados al nodo de visión, con el mismo selector que las formas.

- [ ] **Step 1: Prueba**

Reutilizar `tests/ojos-imagen.test.mjs` y `tests/vision.test.mjs` como red de seguridad: deben seguir pasando sin cambios.

- [ ] **Step 2: Implementar** la conexión de nodos sobre el modelo existente.

- [ ] **Step 3: Ejecutar**

Run: `npm test`
Expected: las pruebas de visión pasan igual que en la línea base.

- [ ] **Step 4: Commit**

```bash
git add components/yunque/editores/EditorVision.tsx lib/vision.ts
git commit -m "feat(yunque): poderes oculares configurados con nodos"
```

---

### Task 8: Comprobación de nivel en el navegador

**Files:** ninguno.

- [ ] **Step 1:** Arrancar `npm run dev` y abrir el Yunque de un personaje de prueba.
- [ ] **Step 2:** Crear un dragón con forma humana, conectarlas en ambos sentidos, y comprobar que el cambio es libre.
- [ ] **Step 3:** Crear una cadena de tres etapas y comprobar que la vuelta a la realidad funciona desde la última.
- [ ] **Step 4:** Abrir a Orin y comprobar que «Liberar el sello» sigue funcionando igual que antes.
- [ ] **Step 5:** Capturas con Playwright (`deviceScaleFactor: 2`) para revisión visual.

---

## Self-review

- **Cobertura del spec:** formas y transiciones (Task 1), vuelta a la realidad (Task 3), validación (Task 2), migración automática (Task 4), control de Orin (Tasks 4-5), editor por nodos (Task 6), poderes oculares (Task 7).
- **Consistencia de tipos:** `Forma`, `Transicion`, `Grafo`, `crearForma`, `renombrarForma`, `conectar`, `validarGrafo`, `formasAlcanzables` y `migrarTransformacion` usan los mismos nombres en todas las tareas.
- **Riesgo conocido:** Task 5 toca el motor de combate. Está marcada para revisión de integración y para correr las pruebas de posesión de Orin antes y después.
- **Riesgo conocido:** Task 6 depende de dónde se monta `EditorTransformacion` hoy; el implementador debe confirmarlo con `grep` antes de editar.
