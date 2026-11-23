# Rasgos combinables · Plan paso a paso

Estado: plan. No hay cambios de código. Depende de **YUNQUE - UNA MÁS** (`docs/plan-yunque-una-mas.md`), sobre todo de la Parte 1 (menús en pantalla) y de la Parte 2 (reacciones generales).

Usa la bioelectricidad Kuro como caso de prueba. Es la propuesta «YUGEN | Propuesta de integración: Bioelectricidad de los Kuro» (no aprobada, no está en el repositorio; se trabaja a partir de la copia que compartiste).

## Idea

Un **rasgo** (de clan, de linaje o adquirido) no es una habilidad aislada. Es una capacidad que puede **potenciar otras habilidades**:

- La bioelectricidad (rasgo) genera Carga Bioeléctrica (CB).
- Una Bola de fuego (habilidad) puede gastar CB para añadir un componente eléctrico.
- Ese componente tiene sus propios dados (por ejemplo, 1d6 por CB gastada) y sus propios efectos elementales.
- Los efectos del elemento se aplican a toda la técnica combinada, no solo a una parte.

Ejemplo: Bola de fuego 2d6 de fuego + potenciador eléctrico (gasta 2 CB, añade 2d6 eléctrico). El daño total se calcula por componente. Si el objetivo está Mojado, el componente eléctrico activa Superconducción igual que hoy.

## Lo que ya existe (no reinventar)

- `Efecto.elemento` (un solo elemento por efecto), `Efecto.naturaleza`, `Efecto.recurso` y `recursos_especiales` en `lib/combate.ts`.
- Electricidad con 1d4 elemental, ignora 3 ARM, chispa de cercanía 3 (`lib/combate.ts:1536`) y Superconducción (`lib/combate.ts:1480`, `:1538`).
- Naturaleza adquirida: `components/NaturalezasYugen.tsx`, `components/yunque/NaturalezaAdquirida.tsx`, con bonos que se suman a la raza.
- Herencia por linaje y clan (último commit de `main`, «herencia por linaje y clan»).

## Problema que hay que resolver

El motor asume **un elemento por efecto**. Para combinar fuego y electricidad en la misma técnica hace falta que un efecto tenga varios componentes elementales, sin romper los efectos actuales.

---

## Paso 1 · Modelo de datos: componentes elementales

- **Archivos:** `lib/creacion.ts` (tipo `Efecto`, `validarEfectos`), `lib/combate.ts`.
- **Qué hacer:**
  1. Añadir `componentes?: ComponenteDano[]`, donde cada componente tiene `{elemento, cantidad, caras, origen: 'base' | 'potenciador', id}`.
  2. Si `componentes` no existe, el efecto se comporta exactamente como hoy (`elemento` + `cantidad/caras`). Así no se migra ningún dato.
  3. Validación: como máximo 3 componentes; cada `elemento` debe estar en `ELEMENTOS`.
- **Prueba:** `tests/componentes-elementales.test.mjs`: un efecto antiguo da el mismo daño; un efecto con dos componentes suma por separado.
- **Criterio de salida:** `node --test tests/*.test.mjs` pasa sin cambios en las pruebas existentes.

## Paso 2 · Etiquetas de técnica

- **Archivos:** `lib/creacion.ts`, `components/yunque/editores/EditorAccion.tsx`.
- **Qué hacer:**
  1. Añadir `etiquetas?: string[]` a `Efecto`: por ejemplo `fuego`, `ataque`, `area`, `proyectil`, `natural`, `magica`.
  2. El editor de acciones ofrece etiquetas de una lista cerrada (no texto libre).
  3. Las etiquetas se derivan de forma automática cuando es posible (naturaleza y elemento) y el GM puede añadir más.
- **Prueba:** validación rechaza etiquetas fuera de la lista.
- **Criterio de salida:** toda habilidad de la Forja tiene etiquetas visibles.

## Paso 3 · Definición de Rasgo y Potenciador

- **Archivos nuevos:** `lib/rasgos.ts`, `tests/rasgos.test.mjs`.
- **Qué hacer:**
  1. Tipo `Rasgo`: `{id, nombre, origen: 'clan' | 'linaje' | 'adquirido', recursos: [...], potenciadores: Potenciador[]}`.
  2. Tipo `Potenciador`: `{id, nombre, acepta: string[] (etiquetas), coste: {ph?, fatiga?, recurso?: {nombre, cantidad}}, componentes_anadidos: ComponenteDano[], efectos_extra?: [...], limite_por_uso: 1}`.
  3. Validación: un potenciador debe aceptar al menos una etiqueta y tener al menos un componente o efecto.
- **Prueba:** `tests/rasgos.test.mjs`.
- **Criterio de salida:** un rasgo de ejemplo (bioelectricidad) se valida.

## Paso 4 · Recurso Carga Bioeléctrica (reutilizar `recursos_especiales`)

- **Archivos:** `lib/combate.ts` (`recursos_especiales`), `lib/rasgos.ts`.
- **Qué hacer:**
  1. Definir CB como recurso del rasgo, con tope configurable, generación y consumo.
  2. El consumo de CB se valida en el servidor (igual que PH).
  3. CB y Fatiga son independientes (ver propuesta, sección 2).
- **Prueba:** no se puede gastar más CB de la que hay; el tope se respeta.
- **Criterio de salida:** prueba de recurso pasa en el motor.

## Paso 5 · Aplicar un potenciador al lanzar una habilidad

- **Archivos:** `lib/combate.ts` (función de ejecución de acciones, cerca de `actuar`), `lib/yunque-arena.ts`.
- **Qué hacer:**
  1. Antes de resolver, el lanzador elige potenciadores compatibles con las etiquetas de la habilidad.
  2. El coste se paga **una vez** por ejecución.
  3. Los componentes añadidos se suman como nuevos componentes de daño del mismo efecto. Cada componente se resuelve por separado para aplicar sus propios efectos elementales.
  4. Un mismo rasgo no puede aplicar dos potenciadores en la misma ejecución.
  5. Los combos existentes (Electricidad + Mojado, chispa de cercanía) se evalúan sobre el componente correspondiente, nunca sobre el total, y no se duplican.
- **Prueba:** `tests/rasgos-potenciadores.test.mjs`: Bola de fuego 2d6 + 2 CB de electricidad da dos componentes; Mojado activa Superconducción solo sobre el componente eléctrico; el coste se descuenta una vez.
- **Criterio de salida:** los casos de la prueba pasan y el combate sin rasgos no cambia (regresión de `tests/combate*.test.mjs`).

## Paso 6 · Asignar rasgos a personajes y linajes

- **Archivos:** `app/dm/forja/page.tsx` (o su sucesor en el Yunque), `lib/yunque-vinculos.ts`, la lógica de herencia por linaje.
- **Qué hacer:**
  1. Un rasgo se asigna a un personaje, a un linaje o a una naturaleza adquirida.
  2. Un rasgo heredado por linaje se muestra en el personaje con su origen («heredado de <linaje>»).
  3. No se asigna nada automáticamente a todos los Kuro (regla de la propuesta: las excepciones van en la configuración de cada personaje).
- **Prueba:** `tests/rasgos-asignacion.test.mjs`: herencia por linaje, sin duplicar el rasgo si llega por dos vías.
- **Criterio de salida:** un personaje con rasgo heredado lo ve en su ficha.

## Paso 7 · Interfaz en el Yunque

- **Archivos:** `components/yunque/editores/EditorAccion.tsx`, `components/yunque/editores/EditorModulo.tsx`, nuevo `components/yunque/editores/EditorRasgo.tsx`.
- **Qué hacer:**
  1. Sección «Potenciadores compatibles» en cada habilidad: lista de rasgos del personaje con su coste.
  2. Editor de potenciador: etiquetas aceptadas, coste, componentes (elemento, dados, escala por CB) y efectos extra.
  3. Vista previa de fórmula: «Bola de fuego 2d6 fuego + 2d6 electricidad por 2 CB».
- **Prueba:** Playwright en la Forja a 390 px y escritorio.
- **Criterio de salida:** un GM crea el potenciador sin escribir JSON.

## Paso 8 · Interfaz en combate

- **Archivos:** `components/yunque/ArenaDolls.tsx`, `app/ficha/combate/page.tsx`, `components/MenuPotenciador.tsx` (nuevo).
- **Qué hacer:**
  1. Al elegir una habilidad compatible con potenciadores, aparece un menú (no `window.confirm`; usa `Dialogo` de la Parte 1).
  2. El menú muestra cada potenciador con su coste, el daño resultante por componente y los efectos elementales previstos.
  3. El jugador confirma o cancela. Cancelar no gasta nada.
- **Prueba:** Playwright: la previsualización coincide con el daño final registrado.
- **Criterio de salida:** previsualización y resultado idénticos.

## Paso 9 · Verificación

- `node --test tests/*.test.mjs`.
- Kion (regresión): sus defensas no cambian.
- Partida de prueba: un Kuro con bioelectricidad usa Bola de fuego potenciada, con Mojado en el objetivo.
- **Criterio de salida:** resultados anotados en `docs/metricas/`.

---

## Decisiones abiertas

1. **Conversión CB a dados:** ¿1 CB = 1d6, o la tabla es configurable por potenciador? Recomiendo configurable, con 1d6 por CB como valor de ejemplo.
2. **Enfriamiento:** ¿potenciar la habilidad cambia su enfriamiento? Recomiendo que no.
3. **Dos rasgos con el mismo elemento:** ¿se suman los dados o solo cuenta el mayor? Recomiendo sumar, respetando el tope de componentes.

## Riesgos

- Un efecto con varios componentes puede romper combos existentes. Por eso el paso 1 exige que los efectos antiguos no cambien.
- Los potenciadores aumentan la complejidad de la interfaz; la previsualización del paso 8 es obligatoria.
- No aprobar reglas oficiales: los valores de la propuesta siguen siendo de laboratorio.
