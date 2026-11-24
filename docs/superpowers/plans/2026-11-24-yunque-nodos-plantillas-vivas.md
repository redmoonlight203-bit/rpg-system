# Yunque por nodos con plantillas vivas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que usar una plantilla del Yunque la despliegue en nodos normales enlazados a ella (se actualizan solos sin pisar lo que editó el GM, con resumen), que un personaje lleve acciones, pasivas y reglas propias que el combate ejecuta, y que cada combatiente tenga un presupuesto de acciones principal/adicional/legendaria configurable desde sus fuentes.

**Architecture:** El `Borrador` sigue siendo la única fuente de verdad. Cada fragmento desplegado (efecto, regla o regla pasiva) lleva un bloque `origen`; un módulo hoja (`lib/yunque-origen.ts`) lo valida y anota los campos editados dentro de `aplicar`, y un módulo puro (`lib/yunque-plantillas-vivas.ts`) fusiona plantilla y nodo al abrir la creación y devuelve el resumen. El combate lee `configuracion.acciones_personaje` como una fuente virtual de habilidades y añade un presupuesto de acciones calculado con `estadisticas()`, así raza, clan, especie y equipo aportan presupuesto por el mismo camino que ya aporta pasivas.

**Tech Stack:** Next.js 16 (React 19, TypeScript), motor `lib/combate.ts` (compartido con Edge vía `scripts/preparar-motor-edge.mjs`), Supabase/PostgreSQL (pruebas con PGlite), `node --test` con `tests/helpers/cargar-ts.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-24-yunque-nodos-plantillas-vivas-design.md`

## Global Constraints

- Sin dependencias nuevas en `package.json`.
- Las plantillas siguen en código (`lib/yunque-plantillas.ts`), con ids fijos y un `version` entero por plantilla (empieza en `1`); la versión se guarda junto al nodo, no en una tabla aparte.
- Sin migración de datos: las creaciones ya guardadas no se reescriben. Solo se permite cambiar la **función** SQL `forja_snapshot_config` (Tarea 5).
- No se añaden primitivas ni tipos de nodo nuevos (`TipoNodo` no cambia).
- Las acciones de un personaje van en `configuracion.acciones_personaje`, nunca en `configuracion.habilidades`.
- Varias fuentes de presupuesto se suman. Las legendarias se recargan al inicio de cada ronda; principales y adicionales, al inicio del turno del dueño.
- Ninguna actualización de plantilla borra trabajo del GM sin aparecer en el resumen.
- `lib/combate.ts` no conoce los nombres de Kion (`tests/yunque-plantillas.test.mjs` lo comprueba) y sus dependencias nuevas de tipos se importan con `import type` (el motor Edge solo incrusta las dependencias de su lista).
- Los módulos de `lib/` importan a sus hermanos con `./x` (lo exige `cargarDependencia`), no importan React y no forman ciclos en tiempo de ejecución (`cargarDependencia` no cachea: un ciclo es recursión infinita). Grafo permitido: `yunque-origen` (hoja) ← `yunque-plantillas` ← `yunque-grafo` ← `yunque-operaciones` ← `yunque-plantillas-vivas`.
- Tras tocar `lib/combate.ts`, regenerar y comitear `supabase/functions/equipo-combate/motor.js` (`node scripts/preparar-motor-edge.mjs`).
- Las tareas que tocan `app/` o componentes de Next: leer antes la guía correspondiente en `node_modules/next/dist/docs/` (esta versión de Next difiere de lo conocido; atender avisos de obsolescencia).
- Textos de interfaz en español, con la voz de Kuroi en vacíos y errores.
- Verificación: `npm test` (ejecuta `scripts/preparar-motor-edge.mjs` y `node --test tests/*.test.mjs`), `npx tsc --noEmit`, `npm run lint`. Si `node_modules` sigue instalándose, ejecutar solo los archivos de prueba de la tarea.

## Review Focus

1. **Cambios estructurales dentro de un nodo desplegado** (añadir un «entonces» a una regla de plantilla, quitar el módulo de alcance de una acción de plantilla): deben marcarse como editados igual que un cambio de campo; si no, la siguiente versión los pisa (antiobjetivo 1). Prueba en Tarea 2.
2. **`origen` dañado o a mano** (`version:'3'`, `editados` que no es lista, `plantilla` con espacios): el nodo se conserva, el grafo lo marca con un error claro y la actualización lo ignora sin romper. Pruebas en Tareas 1 y 3.
3. **Ids anidados** (etapas de transformación del «Ojo de clan con fases», `accion` dentro de un efecto de regla): regenerarlos al actualizar no cuenta como cambio y no rompe la referencia `posesion.etapa_id`. Prueba en Tarea 3.
4. **Legendaria fuera de turno con el dueño caído, descontrolado o con una reacción pendiente**, y el paso de ronda que la recarga: lanza un error claro o recarga, nunca deja el combate en un estado imposible. Prueba en Tarea 6.
5. **Datos antiguos** (creaciones sin `origen`, personajes con `configuracion_dados:[]`, combates guardados sin `gasto_acciones` ni claves de presupuesto): se comportan exactamente como hoy, con una acción principal por turno. Prueba en Tarea 6.

---

### Task 1: `origen` y su validación — `lib/yunque-origen.ts`

**Files:**
- Create: `lib/yunque-origen.ts`
- Modify: `lib/creacion.ts` (`Efecto`, línea 127), `lib/reglas.ts` (`Regla`, línea 40), `lib/pasivas.ts` (`ReglaPasiva`): campo opcional `origen?:OrigenPlantilla` con `import type`.
- Test: `tests/yunque-origen.test.mjs`

**Interfaces:**
- Produces:
  ```ts
  export type OrigenPlantilla={plantilla:string;fragmento:string;version:number;editados:string[]};
  export const MENSAJE_ORIGEN='El vínculo con la plantilla está dañado: conviértelo en nodo propio.';
  export function validarOrigen(x:unknown):string|null;          // null si es undefined o válido; MENSAJE_ORIGEN si no
  export function leerOrigen(x:unknown):OrigenPlantilla|null;     // null si falta o es inválido
  export function igualSinIds(a:unknown,b:unknown):boolean;       // compara JSON quitando las claves 'id'
  export function anotarEditados(antes:Borrador,despues:Borrador,ruta?:Ruta):Borrador;
  ```
  `Borrador` y `Ruta` se importan solo como tipos: el módulo no tiene dependencias en tiempo de ejecución.

**Decisión (formato de `origen`):** se añade `fragmento` al formato del spec: es el `id` fijo del fragmento dentro de la plantilla (`'plantilla-rugido'`), necesario porque una plantilla puede tener varios fragmentos («Furia temporal» tiene dos reglas). Reglas: `plantilla` cumple `/^[a-z0-9][a-z0-9-]{0,79}$/`; `fragmento` es texto de 1 a 120 caracteres; `version` entero entre 1 y 100000; `editados` lista de como mucho 64 textos únicos que cumplen `/^[A-Za-z_][A-Za-z0-9_]{0,63}$/` y no son `'id'` ni `'origen'`.

**Decisión (cómo se marca `editados` sin ensuciar el borrador):** la granularidad es la clave de primer nivel del fragmento (`'cantidad'`, `'tablero'`, `'efectos'`). Solo se añade una clave cuando su valor cambia de verdad (`JSON.stringify` distinto; ausente y `undefined` cuentan igual). Nunca se desmarca. Si nada nuevo se marca, `anotarEditados` devuelve `despues` tal cual (misma identidad), así no aparece un cambio pendiente falso. Con `ruta` del tipo `['efectos'|'reglas'|'reglas_pasivas', número, …]` solo compara ese fragmento (rendimiento al teclear); con cualquier otra ruta o sin ella, empareja por `id` todos los fragmentos de las tres listas. Los fragmentos sin `origen` válido no se tocan.

- [ ] **Step 1: Write the failing tests** en `tests/yunque-origen.test.mjs`:
  - `validarOrigen acepta el formato y rechaza datos dañados`: `validarOrigen(undefined)===null`; `validarOrigen({plantilla:'rugido',fragmento:'plantilla-rugido',version:3,editados:['tablero','cantidad']})===null`; devuelven `MENSAJE_ORIGEN`: `version:'3'`, `version:0`, `editados:'cantidad'`, `editados:['id']`, `editados:['a','a']`, `plantilla:'Rugido devastador'`, `fragmento:''`, `null`.
  - `leerOrigen devuelve null para datos dañados y una copia para los válidos`.
  - `igualSinIds ignora ids anidados`: `{transformacion:{id:'a',etapas:[{id:'x',nombre:'E'}]}}` igual a la misma con `id:'b'`/`'y'`; distinto si cambia `nombre`.
  - `anotarEditados marca solo las claves que cambian` (efecto con `origen` y `editados:[]`; tras cambiar `cantidad` con ruta `['efectos',0,'cantidad']` → `editados` `['cantidad']`; otro cambio a `tablero` → `['cantidad','tablero']`).
  - `anotarEditados no ensucia`: mismo valor → devuelve exactamente el objeto `despues` (`===`); cambiar `origen` o `id` no marca nada; efecto sin `origen` no recibe uno.
  - `anotarEditados empareja por id cuando se sustituye la lista entera` (ruta `['efectos']`, orden invertido).
  - `anotarEditados no muta sus entradas` (`deepEqual` con copias previas).
- [ ] **Step 2: Run** `node --test tests/yunque-origen.test.mjs` → FAIL (no existe el módulo).
- [ ] **Step 3: Implement** `lib/yunque-origen.ts` con las firmas de arriba y añade `origen?:OrigenPlantilla` (con `import type {OrigenPlantilla} from './yunque-origen'`) a `Efecto`, `Regla` y `ReglaPasiva`.
- [ ] **Step 4: Run** `node --test tests/yunque-origen.test.mjs && node scripts/preparar-motor-edge.mjs --check; npx tsc --noEmit` → PASS (el `--check` puede pedir regenerar: regenerar con `node scripts/preparar-motor-edge.mjs` y comprobar que no aparece ningún `import` nuevo en `motor.js`).
- [ ] **Step 5: Commit** `feat(yunque): bloque origen de plantilla y marcado de campos editados`.

### Task 2: Versiones, despliegue y operaciones `desplegar` / `desvincular`

**Files:**
- Modify: `lib/yunque-plantillas.ts` (tipo `Plantilla`, `KION`, `OJOS`, `PLANTILLAS`)
- Modify: `lib/yunque-operaciones.ts:13-18` (tipo `Operacion`), `:187` (`regenerar`), `:197-269` (`aplicar`)
- Modify: `lib/yunque-grimorio.ts:127` (`PLANTILLAS_PIEZAS`), `:212` (`planSoltar`)
- Create: `tests/fixtures/plantillas-versiones.json`
- Test: `tests/yunque-plantillas.test.mjs`, `tests/yunque-operaciones.test.mjs`

**Interfaces:**
- Consumes: `OrigenPlantilla`, `anotarEditados`, `leerOrigen` (Tarea 1).
- Produces:
  ```ts
  // lib/yunque-plantillas.ts
  export type Plantilla={id:string;version:number;nombre:string;descripcion:string;fragmentos:Fragmento[];icono:string;para:TipoCreacion};
  export function plantillaPorId(id:string,lista?:Plantilla[]):Plantilla|undefined;
  /** Copias de los fragmentos con `datos.origen={plantilla:p.id,fragmento:<datos.id>,version:p.version,editados:[]}`. Ids sin regenerar. */
  export function desplegar(p:Plantilla):Fragmento[];
  // lib/yunque-operaciones.ts
  export type Operacion= …existentes… |{op:'desplegar';plantilla:string}|{op:'desvincular';nodo:string};
  export function regenerarFragmento(f:Fragmento):unknown;   // la actual `regenerar`, exportada y renombrada
  // lib/yunque-grimorio.ts
  export type Pieza={…;plantilla?:string};                    // id de plantilla en las piezas de la familia 'plantillas'
  ```

**Decisión (versión obligatoria):** `tests/fixtures/plantillas-versiones.json` guarda `{[id]:{version,huella}}` con `huella` = sha256 (de `node:crypto`) de `JSON.stringify(p.fragmentos)`. La prueba falla si la huella cambió y la versión no subió, o si la versión cambió sin actualizar el fixture. Todas empiezan en `version:1`.

**Decisión (copias):** duplicar, copiar y pegar un nodo desplegado conservan su `origen` (sigue siendo una copia de la plantilla). `desplegar` es una sola operación (un solo paso de deshacer).

- [ ] **Step 1: Write the failing tests:**
  - En `tests/yunque-plantillas.test.mjs`: `cada plantilla tiene versión entera ≥ 1`; `la huella de cada plantilla coincide con su versión registrada` (mensaje: `La plantilla ${id} cambió: sube su versión y actualiza tests/fixtures/plantillas-versiones.json`); `desplegar marca cada fragmento con su origen` (para `furia-temporal`: dos fragmentos, `origen` `{plantilla:'furia-temporal',fragmento:'plantilla-miasma',version:1,editados:[]}` y `fragmento:'plantilla-miasma-fin'`; la plantilla no se muta).
  - En `tests/yunque-operaciones.test.mjs`:
    - `desplegar inserta todos los fragmentos con ids nuevos y origen`: `aplicar(base(),{op:'desplegar',plantilla:'furia-temporal'})` → 2 reglas, ids distintos de `'plantilla-miasma'`, `origen.version===1`; plantilla inexistente → lanza `/ya no existe/`.
    - `fijar sobre un nodo desplegado marca el campo` (`['efectos',0,'cantidad']` → `editados` `['cantidad']`).
    - `cambios estructurales también se marcan` (Review Focus 1): en `curar-al-matar` desplegada, `agregar` un `entonces` bajo `si:<id>` → `editados` incluye `'efectos'`; en `golpe-quemadura` desplegada, `quitar` `alcance:<id>` → `editados` incluye `'tablero'`.
    - `desvincular quita el origen y nada más`: el resto del efecto queda igual; sobre un nodo sin origen lanza `/no viene de una plantilla/`.
    - `duplicar conserva el origen`.
  - En `tests/yunque-grimorio.test.mjs`: `soltar una plantilla produce una operación desplegar` (`planSoltar(b,pieza,null)` → `[{op:'desplegar',plantilla:'furia-temporal'}]`).
- [ ] **Step 2: Run** `node --test tests/yunque-plantillas.test.mjs tests/yunque-operaciones.test.mjs tests/yunque-grimorio.test.mjs` → FAIL.
- [ ] **Step 3: Implement:**
  - `version:1` en cada plantilla (en `KION` y en el literal de cada una), `plantillaPorId`, `desplegar`. Generar el fixture con un script de una línea en el scratchpad y comitear solo el JSON.
  - En `aplicar`: separar el cuerpo actual en `aplicarSinMarcar(b,o)` y devolver `anotarEditados(b,r,o.op==='fijar'?o.ruta:undefined)` salvo para `desvincular`. `desplegar` = para cada `f` de `desplegar(plantillaPorId(id)??falla('Esa plantilla ya no existe.'))`, `insertar(r,f.tipo,regenerarFragmento(f),'nucleo')`. `desvincular` = nodo `accion`/`cuando`/`pasiva` con `origen` (si no, `falla('Este nodo no viene de una plantilla.')`), borrar `origen` del dato en `nodo.ruta`.
  - `regenerarFragmento` conserva `origen` (ya lo hace `structuredClone`).
  - Grimorio: `PLANTILLAS_PIEZAS` lleva `plantilla:p.id` y `fragmentos:desplegar(p)`; en `planSoltar`, si `pieza.plantilla` → `[{op:'desplegar',plantilla:pieza.plantilla}]` (mismo error si se suelta sobre un nodo que no es el núcleo).
- [ ] **Step 4: Run** los tres archivos de prueba → PASS (los tests existentes de plantillas y grimorio también).
- [ ] **Step 5: Commit** `feat(yunque): versión por plantilla y despliegue enlazado`.

### Task 3: Actualizar desde la plantilla — `lib/yunque-plantillas-vivas.ts`

**Files:**
- Create: `lib/yunque-plantillas-vivas.ts`
- Test: `tests/yunque-plantillas-vivas.test.mjs`

**Interfaces:**
- Consumes: `leerOrigen`, `igualSinIds` (T1); `Plantilla`, `PLANTILLAS`, `plantillaPorId` (T2); `regenerarFragmento` (T2).
- Produces:
  ```ts
  export type CambioPlantilla={nodo:string;titulo:string;plantilla:string;nombrePlantilla:string;
   tipo:'actualizado'|'sin_plantilla'|'sin_fragmento';desde:number;hasta:number|null;
   actualizados:string[];conservados:string[]};
  export function actualizarFragmento<T extends {id:string;origen?:OrigenPlantilla}>(nodo:T,plantilla:Record<string,unknown>,version:number):{datos:T;actualizados:string[];conservados:string[]};
  export function actualizarDesdePlantillas(b:Borrador,plantillas?:Plantilla[]):{borrador:Borrador;cambios:CambioPlantilla[]};
  export function lineaCambio(c:CambioPlantilla):string;
  ```
  `nodo` usa los ids del grafo: `accion:<id>`, `cuando:<id>`, `pasiva:<id>`. Solo se recorren `b.efectos`, `b.reglas` y `b.reglas_pasivas` de primer nivel.

**Algoritmo de `actualizarFragmento`** (la plantilla llega ya pasada por `regenerarFragmento`): claves = unión de las del nodo y la plantilla, sin `id` ni `origen`. Clave no editada y `!igualSinIds` → toma el valor de la plantilla (o se borra si la plantilla no la tiene) y va a `actualizados`; si solo difieren ids, se conserva el valor del nodo. Clave editada y `!igualSinIds` → se conserva y va a `conservados`. `origen.version` pasa a `version`; `editados` no cambia.

**Decisión (conflictos):** no se guardan valores antiguos de la plantilla. Un campo editado se anota como «conservado» cuando difiere del valor nuevo de la plantilla.

**Decisión (cuándo y qué se avisa):** solo se actualiza si `plantilla.version > origen.version`. Un `actualizado` sin `actualizados` ni `conservados` sube la versión en silencio y no se lista. `sin_plantilla` (la plantilla ya no existe) y `sin_fragmento` (existe pero ya no tiene ese fragmento) dejan el nodo intacto y se avisan **cada vez** que se abre, hasta «Convertir en nodo propio». Un `origen` inválido se ignora aquí (el grafo ya lo marca, T4). Si no hay cambios, `borrador===b`.

**Texto de `lineaCambio`** (copia exacta):
- actualizado: `«${titulo}» (${nombrePlantilla}) pasa de la versión ${desde} a la ${hasta}.` + (si hay) ` Actualizado: ${actualizados.join(', ')}.` + (si hay) ` Se conserva tu valor en: ${conservados.join(', ')}.`
- sin_plantilla: `«${titulo}»: la plantilla «${nombrePlantilla}» ya no existe. El nodo se conserva tal cual; conviértelo en nodo propio para dejar de ver este aviso.`
- sin_fragmento: `«${titulo}»: la plantilla «${nombrePlantilla}» ya no incluye esta pieza. El nodo se conserva tal cual; conviértelo en nodo propio para dejar de ver este aviso.`

- [ ] **Step 1: Write the failing tests** (las plantillas modificadas se construyen con `structuredClone(PLANTILLAS)` cambiando datos y `version`):
  - `campo no editado se actualiza; editado se conserva y se anota`: desplegar `golpe-quemadura` y fijar `cantidad` a 4; plantilla v2 con `cantidad:3` y `caras:10` → `caras===10`, `cantidad===4`, `cambios[0]` `{tipo:'actualizado',desde:1,hasta:2,actualizados:['caras'],conservados:['cantidad']}`, `origen.version===2`, `editados` sin cambios.
  - `misma versión: no cambia nada` → `borrador===b`, `cambios` vacío.
  - `plantilla borrada: nodo intacto y aviso sin_plantilla` (antiobjetivo 3); igual con un fragmento quitado → `sin_fragmento`.
  - `ids anidados no cuentan como cambio` (Review Focus 3): `ojo-clan-fases` desplegada, plantilla v2 sin cambios de datos → `actualizados` vacío, etapas con los mismos ids que antes, `posesion.etapa_id` (si existe) apunta a una etapa existente; validar con `validarEfectos`.
  - `origen dañado se ignora sin romper` (Review Focus 2): `origen.version='x'` → sin cambios ni error.
  - `campo que la plantilla quita y el GM no tocó desaparece` (`tablero` quitado en v2 → `tablero` ausente, en `actualizados`).
  - `lineaCambio` devuelve las tres frases exactas.
  - `no muta el borrador ni las plantillas`.
- [ ] **Step 2: Run** `node --test tests/yunque-plantillas-vivas.test.mjs` → FAIL.
- [ ] **Step 3: Implement** el módulo según las firmas y el algoritmo.
- [ ] **Step 4: Run** `node --test tests/yunque-plantillas-vivas.test.mjs` → PASS.
- [ ] **Step 5: Commit** `feat(yunque): actualizar nodos desplegados desde su plantilla con resumen`.

### Task 4: Sello de plantilla, «Convertir en nodo propio» y resumen al abrir

**Files:**
- Modify: `lib/yunque-grafo.ts` (tipo `Nodo`, nodos `accion`/`cuando`/`pasiva`, `mismoNodo:132`)
- Modify: `components/yunque/NodoYunque.tsx` (sello en la cabecera)
- Modify: `components/yunque/TallerYunque.tsx` (`contenido`, props, panel de resumen)
- Create: `components/yunque/ResumenPlantillas.tsx`
- Modify: `app/dm/forja/page.tsx:78-96` (`abrir`) y el render de `TallerYunque`
- Modify: `components/yunque/yunque.css` (sello y panel)
- Test: `tests/yunque-grafo.test.mjs`

**Interfaces:**
- Consumes: `leerOrigen`, `validarOrigen`, `MENSAJE_ORIGEN` (T1); `plantillaPorId` (T2); `actualizarDesdePlantillas`, `lineaCambio`, `CambioPlantilla` (T3); operación `desvincular` (T2).
- Produces: `Nodo.plantilla?:{id:string;nombre:string;version:number;huerfana:boolean}`; props de `TallerYunque` `cambiosPlantilla?:CambioPlantilla[]` y `onCerrarCambios?:()=>void`; componente `ResumenPlantillas({cambios,onElegir,onCerrar}:{cambios:CambioPlantilla[];onElegir:(nodo:string)=>void;onCerrar:()=>void})`.

**Decisión (dónde se actualiza):** al abrir una creación en el Yunque (`abrir` de la Forja). `base.current` sigue siendo el borrador guardado, así la actualización aparece como cambio pendiente y el GM la guarda; las creaciones que nadie abre siguen como estaban (sin migración).

- [ ] **Step 1: Write the failing tests** en `tests/yunque-grafo.test.mjs`:
  - `nodo desplegado lleva su plantilla`: tras `desplegar` `golpe-quemadura`, el nodo `accion:<id>` tiene `plantilla` `{id:'golpe-quemadura',nombre:'Golpe con quemadura',version:1,huerfana:false}`; un nodo sin `origen` no tiene `plantilla`.
  - `plantilla inexistente: huerfana true y sin error` (el nodo no se marca como roto).
  - `origen dañado: error MENSAJE_ORIGEN` (si el nodo no tenía ya otro error).
  - `estabilizar distingue un cambio de plantilla` (mismo nodo con `huerfana` distinta → objeto nuevo).
- [ ] **Step 2: Run** `node --test tests/yunque-grafo.test.mjs` → FAIL.
- [ ] **Step 3: Implement:**
  - `aGrafo`: tras crear cada nodo `accion`, `cuando` y `pasiva`, rellenar `plantilla` con `leerOrigen` + `plantillaPorId`; `nombre` = el de la plantilla o `origen.plantilla` si es huérfana. `mismoNodo` compara también `JSON.stringify(a.plantilla)`.
  - `NodoYunque`: si `nodo.plantilla`, un sello en la cabecera `Plantilla · ${nombre} v${version}` (o `Plantilla perdida: ${nombre}` en carmesí con `data-huerfana`).
  - `TallerYunque.contenido`: para nodos con `plantilla`, `pie` con `<button>Convertir en nodo propio</button>` → `operar({op:'desvincular',nodo:n.id})`.
  - `ResumenPlantillas`: panel descartable sobre el lienzo (y la lista), con título «La forja ha cambiado» y una línea `lineaCambio` por cambio; pulsar una línea selecciona el nodo. Se muestra mientras `cambiosPlantilla` tenga elementos.
  - `page.tsx` (leer antes `node_modules/next/dist/docs/` sobre componentes de cliente): en `abrir`, `const {borrador:vivo,cambios}=actualizarDesdePlantillas(borrador)`; `setB(vivo)`, `setCambiosPlantilla(cambios)`; `base.current` igual que hoy (el borrador sin actualizar). Pasar `cambiosPlantilla` y `onCerrarCambios={()=>setCambiosPlantilla([])}` a `TallerYunque`.
- [ ] **Step 4: Run** `node --test tests/yunque-grafo.test.mjs && npx tsc --noEmit && npm run lint` → PASS. Comprobar a mano en `npm run dev` (o con la skill `run`): desplegar una plantilla, ver el sello, convertirla en nodo propio y deshacer.
- [ ] **Step 5: Commit** `feat(yunque): sello de plantilla, convertir en nodo propio y resumen al abrir`.

### Task 5: Personajes con acciones, pasivas y reglas propias (almacenamiento)

**Files:**
- Modify: `components/yunque/TallerYunque.tsx:56` (`NUCLEO_LLEVA`)
- Modify: `lib/yunque-grafo.ts:40-42` (etiqueta del puerto de acciones del núcleo)
- Modify: `app/dm/forja/page.tsx:140` (payload: `configuracion_dados`)
- Modify: `lib/combate.ts:71-95` (`Config.acciones_personaje?:Efecto[]`)
- Modify: `lib/yunque-arena.ts:81` (portador personaje)
- Create: `supabase/migrations/20261124120000_acciones_personaje.sql`
- Test: `tests/yunque-grafo.test.mjs`, `tests/yunque-arena.test.mjs`, `tests/acciones-personaje-database.mjs`

**Interfaces:**
- Produces: `Config.acciones_personaje?:Efecto[]`; en la base de datos, `forja_snapshot_config(id)` devuelve además `acciones_personaje` (la columna `configuracion_dados` de un personaje; `[]` para otros tipos).

**Decisión (almacenamiento):** las acciones propias del personaje se guardan en la columna existente `configuracion_dados` de su fila de `forja_maestra` (hoy se fuerza `[]` para personajes) y se cargan con `efectosDe` como cualquier creación; en combate llegan como `configuracion.acciones_personaje`. Las pasivas propias van a `reglas_pasivas` y las reglas a `reglas`, que ya se guardan y el combate ya lee. La función de compra de cuerpos (`20261121120100`) ya convierte `configuracion_dados` de un personaje en «Técnicas de …»: no se toca.

- [ ] **Step 1: Write the failing tests:**
  - `tests/yunque-grafo.test.mjs` — `el núcleo de un personaje ofrece «Acciones del personaje»`: el puerto `acciones` del núcleo tiene `etiqueta==='Acciones del personaje'` si `b.tipo==='personaje'` y `'Acciones'` en otro caso; un personaje con un efecto produce su nodo `accion:<id>` junto a los vínculos.
  - `tests/yunque-arena.test.mjs` — `el portador de un personaje lleva sus acciones propias`: `F.personaje` con `efectos:[{...nuevoEfecto(),nombre:'Zarpazo',cantidad:1,caras:6}]` → `m(c,'doll').configuracion.acciones_personaje` tiene `Zarpazo`; `configuracion.habilidades` no lo contiene.
  - `tests/acciones-personaje-database.mjs` (mismo arranque PGlite que `tests/equipo-database.mjs`, más la migración nueva): un personaje con `configuracion_dados` de una acción → `forja_snapshot_config(id).acciones_personaje` la contiene; un objeto → `acciones_personaje` es `[]`; las demás claves del snapshot no cambian.
- [ ] **Step 2: Run** `node --test tests/yunque-grafo.test.mjs tests/yunque-arena.test.mjs && node tests/acciones-personaje-database.mjs` → FAIL.
- [ ] **Step 3: Implement:**
  - `NUCLEO_LLEVA.personaje=['accion','cuando','pasiva','vinculo']`.
  - `aGrafo`: `salida('acciones',['accion'],b.tipo==='personaje'?'Acciones del personaje':'Acciones')`.
  - `page.tsx`: `configuracion_dados:b.efectos` para todos los tipos (quitar el caso personaje). Leer `app/dm/forja/clasificar.ts` y confirmar que acepta efectos en un personaje; si los rechaza, permitirlos.
  - `Config.acciones_personaje`; `portador()` de la arena: `config.acciones_personaje=b.efectos`.
  - Migración: renombrar la función actual a `private.forja_snapshot_config_base(uuid)` con el patrón `pg_get_functiondef` + `replace` de `20261108152942_forja_alma_unica_y_restablecer.sql:82-84` (con `create schema if not exists private`), y recrear `public.forja_snapshot_config(p_id uuid)` como `security definer`, `search_path=''`, que devuelve `private.forja_snapshot_config_base(p_id)||jsonb_build_object('acciones_personaje',…)`. Repetir los `revoke` de `20261030_forja_tipos_y_dados.sql:150` sobre ambas funciones. Sin `update` de datos.
- [ ] **Step 4: Run** los tres archivos → PASS; `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(yunque): acciones, pasivas y reglas propias en personajes`.

### Task 6: Motor — acciones del personaje y presupuesto de acciones por turno

**Files:**
- Modify: `lib/creacion.ts:127` (`Efecto.presupuesto`), `validarEfectos` (`:348`)
- Modify: `lib/combate.ts` — tipos (`Combatiente:100`, `Accion:207`), `efectosConReaccion:606`, `acciones:1207`, `actuarInterno:1429`, y cada **lectura** de `m.configuracion.habilidades` (líneas 503, 606, 874, 1164, 1230, 1671, 1840, 2063, 2198, 2211, 2803)
- Modify: `supabase/functions/equipo-combate/motor.js` (regenerado)
- Test: `tests/combate-presupuesto.test.mjs`, `tests/yunque-arena.test.mjs`

**Interfaces:**
- Consumes: `Config.acciones_personaje` (T5).
- Produces (en `lib/combate.ts`):
  ```ts
  export type TipoPresupuesto='principal'|'adicional'|'legendaria';
  export type PresupuestoAcciones=Record<TipoPresupuesto,number>;
  export const CLAVE_PRESUPUESTO:Record<TipoPresupuesto,string>={principal:'acciones_principal',adicional:'acciones_adicional',legendaria:'acciones_legendaria'};
  export const FUENTE_PROPIAS='propias';
  export function habilidadesDe(m:Combatiente):Fuente[];                 // [{id:'propias',nombre:'Acciones del personaje',stats:{},efectos:acciones_personaje}] (si hay) + habilidades
  export function presupuestoDeStats(s:Record<string,number>):PresupuestoAcciones; // principal=max(0,1+⌊s.acciones_principal⌋), adicional=max(0,⌊…⌋), legendaria=max(0,⌊…⌋)
  export function presupuestoDe(m:Combatiente):PresupuestoAcciones;      // presupuestoDeStats(estadisticas(m))
  export function presupuestoRestante(c:Combate,m:Combatiente):PresupuestoAcciones;
  export function tipoPresupuesto(e:Pick<Efecto,'presupuesto'>):TipoPresupuesto; // e.presupuesto??'principal'
  // Combatiente: gasto_acciones?:{turno:number;principal:number;adicional:number;ronda:number;legendaria:number}
  // Accion: presupuesto:TipoPresupuesto
  // Efecto (lib/creacion.ts): presupuesto?:'principal'|'adicional'|'legendaria'
  ```
  Ids de acción de las acciones propias: `hab:propias:<efecto.id>`, con `nombre` = `e.nombre` (sin prefijo de fuente).

**Decisiones (presupuesto):**
- Las claves de presupuesto son extras sobre la base `{principal:1,adicional:0,legendaria:0}` y viven en los atributos: el núcleo (`stats`), las pasivas permanentes (`bonos`) y los bonos de variante ya pasan por `estadisticas()`, con los mismos requisitos (`requisitosFuente`). Así varias fuentes se suman sin código nuevo.
- Recarga por sello, sin código de reinicio: `restante.principal = m.accion_usada ? 0 : max(0, P − (g.turno===m.turnos ? g.principal : 0))`; `restante.adicional = A − (g.turno===m.turnos ? g.adicional : 0)`; `restante.legendaria = L − (g.ronda===c.ronda ? g.legendaria : 0)`. `m.turnos` sube al empezar el turno del dueño y `c.ronda` al empezar la ronda: es la recarga que pide el spec.
- `presupuesto` solo cuenta en acciones `hab:` y `equipo:`; el resto (ataque, guardia, `regla:`, volver a la forma) es siempre principal. Un ataque múltiple (`rafaga`) solo puede ser principal.
- Adicional: solo en el propio turno, antes o después de la principal. Legendaria: dentro o fuera del propio turno; exige combate `en_curso`, dueño `combatienteActivo` y no descontrolado. Ninguna de las dos gasta la principal.
- Principal > 1: tras una acción principal que deja `accion_usada` sin ráfaga pendiente, se suma `gasto_acciones.principal` y, si queda principal, `accion_usada` vuelve a `false`. Solo el camino `actuar` devuelve principales; objetos, equipo e invocación siguen gastando la única.

- [ ] **Step 1: Write the failing tests** en `tests/combate-presupuesto.test.mjs` (arranque como `tests/combate.test.mjs`; dos personajes `a` y `b`, `a` con iniciativa mayor):
  - `sin claves de presupuesto todo es como antes` (Review Focus 5): `presupuestoDe` `{principal:1,adicional:0,legendaria:0}`; tras `actuar(…,'ataque',…)` un segundo `ataque` lanza `/Ya utilizó su acción/`; un combatiente sin `gasto_acciones` funciona.
  - `acciones del personaje aparecen y se ejecutan`: `configuracion.acciones_personaje=[golpe]` → `acciones(m)` incluye `hab:propias:<id>` con `nombre:'Golpe'`; `actuar` daña a `b`; una acción propia con `reaccion` aparece en las ofertas de reacción.
  - `adicional: una extra en el propio turno`: `stats.acciones_adicional=1`, habilidad con `presupuesto:'adicional'` → `ataque` + adicional en el mismo turno; una segunda adicional lanza `/acciones adicionales/`; en el turno de `b` lanza `/Solo puede actuar el personaje de turno/`; en el siguiente turno de `a` vuelve a estar disponible.
  - `legendaria fuera de turno y recarga por ronda`: `stats.acciones_legendaria=2`; en el turno de `b`, `actuar(c,'a','hab:h:leg','b')` daña a `b` dos veces, la tercera lanza `/acciones legendarias/`; `c.actual` sigue siendo `b` y `a.accion_usada` no cambia; al pasar a la ronda siguiente `presupuestoRestante(c,a).legendaria===2`.
  - `legendaria imposible` (Review Focus 4): con `a.vida=0`, con transformación descontrolada y con `reaccion_pendiente` → lanzan error, sin cambiar el combate.
  - `principal 2`: `stats.acciones_principal=1` → dos `ataque` en el turno, el tercero lanza.
  - `validarEfectos rechaza un ataque múltiple adicional` (`/acción principal/`) y un `presupuesto` desconocido.
  - En `tests/yunque-arena.test.mjs` — `el combate ejecuta la acción propia del personaje` (caso del spec): `A.usar(c,'hab:propias:<id>','saco',()=>4)` baja la vida del saco.
- [ ] **Step 2: Run** `node --test tests/combate-presupuesto.test.mjs tests/yunque-arena.test.mjs` → FAIL.
- [ ] **Step 3: Implement:**
  - `Efecto.presupuesto` y su validación en `validarEfectos` (valor de la lista o ausente; `rafaga` con presupuesto ≠ principal → `${nombre}: el ataque múltiple usa la acción principal.`).
  - `habilidadesDe` y sustituir con ella cada **lectura** de `m.configuracion.habilidades` listada arriba; no tocar las escrituras (1665, 2384, 2410, 2413), la búsqueda por `forja_id` (1656, 1659, 2433) ni `requisitosFuente:49`.
  - En `acciones`: `presupuesto:tipoPresupuesto(e)` en las acciones `hab:`/`equipo:` y `'principal'` en las demás; nombre sin prefijo para la fuente `propias`.
  - Renombrar el cuerpo actual de `actuarInterno` a `actuarBase(…, fueraDeTurno=false)`, que solo se salta la comprobación `n.actual!==actorId` cuando `fueraDeTurno`. El nuevo `actuarInterno` decide el tipo, comprueba el presupuesto con los mensajes `No le quedan acciones adicionales este turno.` / `No le quedan acciones legendarias esta ronda.`, ejecuta `actuarBase` sobre una copia con `accion_usada=false` para adicional/legendaria, restaura `accion_usada`, anota `gasto_acciones` y registra `${nombre} usa una acción legendaria (quedan ${n}).` / `… adicional …`.
  - Regenerar `motor.js`.
- [ ] **Step 4: Run** `node --test tests/combate-presupuesto.test.mjs tests/yunque-arena.test.mjs tests/combate.test.mjs tests/ataque-multiple.test.mjs && node scripts/preparar-motor-edge.mjs --check && npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit** `feat(combate): acciones del personaje y presupuesto principal, adicional y legendario`.

### Task 7: Presupuesto desde fuentes y en la interfaz

**Files:**
- Modify: `lib/yunque-grafo.ts:40` (insignia del núcleo de personaje)
- Modify: `components/yunque/editores/EditorNucleo.tsx` (tres ruedas para personajes)
- Modify: `components/yunque/editores/EditorPasivaNodo.tsx:11` (`BONOS`), `components/EditorPasivas.tsx:134-145` (lista de claves y nombres), `components/EditorMonstruo.tsx:15` (bonos de variante)
- Modify: `components/yunque/editores/EditorAccion.tsx` (fichas «Presupuesto»)
- Modify: `app/dm/combate/page.tsx` (presupuesto restante y legendarias fuera de turno)
- Test: `tests/combate-presupuesto.test.mjs`, `tests/yunque-grafo.test.mjs`

**Interfaces:**
- Consumes: `presupuestoDeStats`, `presupuestoDe`, `presupuestoRestante`, `CLAVE_PRESUPUESTO`, `Accion.presupuesto` (T6).
- Produces: `Nodo.insignia` del núcleo de personaje: `Acciones: ${P} principal · ${A} adicional(es) · ${L} legendaria(s)` (con `presupuestoDeStats(b.stats)`; solo lo propio, las fuentes se suman en combate).

**Decisión (fuentes):** «Se conecta solo al nodo del personaje o monstruo»: una pasiva con bonos de presupuesto solo actúa cuando está enlazada a un combatiente (raza → `pasiva_racial`, clan → pasiva heredada con `requisitos_uso.clanes`, especie → bonos o pasivas de la variante, equipo → `reglas_pasivas` de la pieza). Las tres claves se añaden a los editores que ya editan esos bonos; no hay nodo nuevo.

**Decisión (legendarias fuera de turno en la interfaz):** solo en la página del GM (`app/dm/combate/page.tsx`). El endpoint de jugador (`supabase/functions/combate-jugador`) no cambia: un jugador usa adicionales en su turno, pero no legendarias fuera de él en este cambio.

- [ ] **Step 1: Write the failing tests:**
  - `tests/combate-presupuesto.test.mjs` — `varias fuentes se suman`: pasiva `raza:x` con `bonos:{acciones_adicional:1}` + pasiva de clan con `bonos:{acciones_legendaria:2}` → `{principal:1,adicional:1,legendaria:2}`; una pasiva cuyo `requisitos_uso` no se cumple no suma; los `stats` del núcleo (`acciones_legendaria:1`) se suman a lo anterior (→ 3).
  - `tests/yunque-grafo.test.mjs` — `el núcleo de un personaje muestra su presupuesto`: con `stats:{acciones_legendaria:3}` la insignia es `Acciones: 1 principal · 0 adicionales · 3 legendarias`; un objeto no tiene insignia.
- [ ] **Step 2: Run** `node --test tests/combate-presupuesto.test.mjs tests/yunque-grafo.test.mjs` → FAIL (la suma ya funciona si T6 está bien: en ese caso solo falla la insignia).
- [ ] **Step 3: Implement:**
  - Insignia en `aGrafo`.
  - `EditorNucleo`: para personajes, tres `Rueda` (`Acciones principales extra`, `Acciones adicionales`, `Acciones legendarias por ronda`, 0–10) que fijan `stats[CLAVE_PRESUPUESTO[t]]` (borrando la clave en 0).
  - `BONOS` de `EditorPasivaNodo`: `['acciones_adicional','Acc. adic.']`, `['acciones_legendaria','Acc. leg.']`, `['acciones_principal','Acc. princ.']`; mismas claves en `EditorPasivas` con nombres largos y en los bonos de variante de `EditorMonstruo`.
  - `EditorAccion`: `Fichas` «Presupuesto» (Principal / Adicional / Legendaria; ayuda: «Legendaria: fuera de tu turno, se recarga cada ronda.») que fija `presupuesto` (`undefined` para principal); oculta si `solo_pasivo`.
  - `app/dm/combate/page.tsx` (leer antes la guía de `node_modules/next/dist/docs/` que aplique): bajo el actor, `presupuestoRestante`; una sección «Acciones legendarias» con cada combatiente activo que no está en turno y tiene legendarias restantes y acciones con `presupuesto==='legendaria'`; elegir una fija un actor legendario temporal y `resolver` llama a `actuarConReacciones` con ese id.
- [ ] **Step 4: Run** `node --test tests/combate-presupuesto.test.mjs tests/yunque-grafo.test.mjs && npx tsc --noEmit && npm run lint` → PASS; comprobar en el combate del GM una legendaria fuera de turno.
- [ ] **Step 5: Commit** `feat(combate): presupuesto de acciones desde raza, clan, especie y núcleo`.

### Task 8: Los botones de `EditorDados` pasan a ser el selector de plantillas

**Files:**
- Modify: `lib/yunque-plantillas.ts` (cuatro plantillas nuevas y `PLANTILLAS_ACCION`)
- Modify: `components/EditorDados.tsx:34-43` (`agregar`) y `:52` (botones)
- Modify: `components/yunque/editores/EditorAccion.tsx:131`
- Modify: `tests/fixtures/plantillas-versiones.json`
- Test: `tests/yunque-plantillas.test.mjs`

**Interfaces:**
- Consumes: `desplegar`, `regenerarFragmento`, operación `desplegar` (T2); `leerOrigen` (T1).
- Produces: plantillas `embestida`, `salto-impacto`, `carrera-arrasadora`, `rugido` (`para:'habilidad'`, `version:1`, un fragmento `accion` con id `plantilla-<id>`); `export const PLANTILLAS_ACCION:Plantilla[]` (plantillas de un solo fragmento `accion`); `EditorDados` acepta `onPlantilla?:(id:string)=>void`.

Datos: los de `agregar` en `EditorDados.tsx` copiados tal cual, con `efecto:'dano'` (`embestida` = rama `dash`, nombre «Embestida», icono `espada`; `salto-impacto` = «Salto de impacto», `espada`; `carrera-arrasadora` = «Carrera arrasadora», `espada`; `rugido` = «Rugido devastador», `fuego`). `nombre` de la plantilla = el texto del botón sin «+ ».

**Decisión (sin lienzo):** sin `onPlantilla` (p. ej. `NaturalezasYugen.tsx`), elegir una plantilla añade una copia con ids nuevos y **sin** `origen`, porque ahí nada la actualizaría.

- [ ] **Step 1: Write the failing tests** en `tests/yunque-plantillas.test.mjs`:
  - `las plantillas de movimiento reproducen los antiguos botones`: `rugido` tiene `tablero` `{alcance:0,forma:'circulo',tamano:2,afecta:'enemigos',color:'violeta',origen_area:'lanzador',afecta_lanzador:false}`, `coste_fatiga:3`, `cantidad:2`, `caras:6`, `animacion:'aura'`; `embestida` lleva `movimiento_lanzador` `{tipo:'dash',casillas:4,alcance_golpe:1}`; análogo para `salto-impacto` y `carrera-arrasadora` (todos sus valores).
  - `PLANTILLAS_ACCION incluye las cuatro y excluye las de reglas`.
  - `EditorDados ya no rellena campos de golpe`: el texto de `components/EditorDados.tsx` no casa `/agregar\('dano','(dash|salto|carrera|rugido)'\)/` ni contiene `plantilla==='rugido'`.
  - Las pruebas existentes (validadores, arena, ids únicos) cubren las cuatro nuevas.
- [ ] **Step 2: Run** `node --test tests/yunque-plantillas.test.mjs` → FAIL.
- [ ] **Step 3: Implement:** las cuatro plantillas (y su entrada en el fixture); en `EditorDados`, quitar el parámetro `plantilla` de `agregar` y los cuatro botones, y añadir `<label>Desde una plantilla<select>` con `PLANTILLAS_ACCION`; con `onPlantilla` llama a `onPlantilla(id)`, sin él inserta `regenerarFragmento(desplegar(p)[0])` sin `origen`. `EditorAccion` pasa `onPlantilla={id=>operar({op:'desplegar',plantilla:id})}`.
- [ ] **Step 4: Run** `node --test tests/yunque-plantillas.test.mjs tests/yunque-grimorio.test.mjs && npx tsc --noEmit && npm run lint` → PASS.
- [ ] **Step 5: Commit** `feat(yunque): rugido, embestida, salto y carrera como plantillas vivas`.

### Task 9: Defensas de Kion vivas

**Files:**
- Modify: `components/EditorReaccion.tsx:37` (selector de plantilla)
- Modify: `components/yunque/editores/EditorModulo.tsx:86`, `components/EditorDados.tsx:82`
- Test: `tests/yunque-plantillas-vivas.test.mjs`

**Interfaces:**
- Consumes: plantillas `kion-<clave>` (ya en `PLANTILLAS`), operación `desplegar` (T2), `actualizarDesdePlantillas` (T3).
- Produces: `EditorReaccion` acepta `onPlantilla?:(id:string)=>void`.

**Decisión:** en el Yunque, el selector «Rellenar desde una plantilla…» pasa a «Desplegar defensa de Kion…» y despliega la plantilla `kion-<clave>` como un nodo de acción nuevo y enlazado (no copia datos en la reacción abierta). Fuera del Yunque (sin `onPlantilla`) conserva el relleno actual. Las versiones de Kion siguen a `PLANTILLAS_REACCION` a través de la huella del fixture.

- [ ] **Step 1: Write the failing tests:**
  - `cada defensa de Kion se despliega enlazada`: para cada clave de `PLANTILLAS_REACCION`, `aplicar(habilidad,{op:'desplegar',plantilla:'kion-'+k})` → `efectos[0].origen` `{plantilla:'kion-'+k,fragmento:'plantilla-kion-'+k,version:1,editados:[]}`.
  - `un cambio en Inercia llega a los nodos sin tocar lo editado`: plantillas copiadas con `kion-inercia` v2 y `reaccion.principal.salvacion.cd:16` → `cd===16`; si antes el GM fijó `['efectos',0,'reaccion']`, la reacción del GM se conserva y `conservados` incluye `'reaccion'`.
  - Sigue pasando `el motor no conoce los nombres de Kion`.
- [ ] **Step 2: Run** `node --test tests/yunque-plantillas-vivas.test.mjs tests/yunque-plantillas.test.mjs` → FAIL.
- [ ] **Step 3: Implement** la prop en `EditorReaccion` y pasarla desde `EditorModulo` (`k=>operar({op:'desplegar',plantilla:k})`) y desde `EditorDados` (su propio `onPlantilla`).
- [ ] **Step 4: Run** los dos archivos y `npx tsc --noEmit && npm run lint` → PASS.
- [ ] **Step 5: Commit** `feat(yunque): defensas de Kion como plantillas vivas`.

### Task 10: Prueba de integración y cierre

**Files:**
- Create: `tests/yunque-plantillas-vivas-integracion.test.mjs`

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Step 1: Write the test** `historia completa de una plantilla viva en un personaje`: borrador personaje → `desplegar` `rugido` → fijar `cantidad:5` y `presupuesto:'legendaria'` → plantillas con `rugido` v2 (`caras:8`, `cantidad:3`) → `actualizarDesdePlantillas`: `caras===8`, `cantidad===5`, `presupuesto==='legendaria'`, un cambio con `conservados` `['cantidad']`; `crearArena` con el resultado y `A.usar(c,'hab:propias:<id>','saco',()=>3)` baja la vida del saco; `desvincular` → otra actualización no produce cambios; quitar `rugido` de las plantillas antes de `desvincular` → aviso `sin_plantilla` y el nodo idéntico.
- [ ] **Step 2: Run** `node --test tests/yunque-plantillas-vivas-integracion.test.mjs` → PASS (si falla, el fallo es de una tarea anterior: corregir allí).
- [ ] **Step 3: Run** la verificación completa: `npm test && npx tsc --noEmit && npm run lint && node scripts/preparar-motor-edge.mjs --check` → todo PASS; si hay PGlite disponible, `node tests/acciones-personaje-database.mjs`.
- [ ] **Step 4: Commit** `test(yunque): historia completa de plantillas vivas`.
