# Diseño · Transformaciones y poderes oculares por nodos

Fecha: 24-11-2026 · Estado: **borrador pendiente de aprobación** (no se ha programado nada).

## Intención

Hoy las transformaciones se configuran con un formulario fijo (`components/EditorTransformacion.tsx`): una lista
lineal de etapas (máximo 12), cada una con estadísticas, poderes, imagen y huella. Funciona, pero no permite
representar lo que pide la mesa: un dragón que cambia entre dragón y humano cuando quiere, o un hombre bestia que
alterna entre su forma más animal y su forma más humana. Se pide que se configure con nodos, igual que el resto
del Yunque, y que los poderes oculares sigan el mismo modelo.

## Decisiones del usuario

1. **Cambio libre:** las formas que se pueden alternar (dragón ↔ humano, hombre bestia ↔ bestia) se cambian en
   cualquier momento y en ambos sentidos.
2. **Secuencia cuando toca:** algunas transformaciones son progresivas (una cadena de etapas que se recorre en
   orden). Ejemplo: forma base → etapa 1 → etapa 2.
3. **Siempre hay vuelta a la realidad:** desde cualquier forma se puede volver a la forma base, sin importar la
   cadena o el enlace por el que se llegó.

## Objetivos

1. Una forma es un nodo con sus estadísticas, poderes y apariencia.
2. Una transición es un nodo o una conexión entre formas, con su coste o condición opcional.
3. Las formas pueden formar un grafo (cambio libre) o una cadena (secuencia), y se pueden mezclar en la misma
   transformación.
4. La forma base (la «realidad») siempre tiene una transición de vuelta válida desde cualquier forma.
5. Los poderes oculares usan el mismo modelo de nodos y no tienen formulario aparte.

## No objetivos

- Cambiar el motor de combate de forma radical. Se reutiliza `transformacion` tal como existe, y se añade la capa de grafo.
- Automatizar cambios por vida o por turno en esta fase. Se deja como nodo futuro (ver decisiones propias).
- Migrar las transformaciones existentes en la primera entrega. Se migran al final, con prueba.

## Antiobjetivos

- Que una forma quede sin salida y el personaje no pueda volver a la realidad.
- Que el cambio libre deje estadísticas o poderes de la forma anterior activos.
- Que un poder ocular se configure de forma distinta a los demás nodos.

## Restricciones (comprobadas en el código)

- `lib/creacion.ts:366`: una transformación tiene `tipo` ('forma' | 'poder') y `etapas` (1 a 12).
- `lib/creacion.ts:370`: una forma necesita HP propios; un poder conserva los HP del cuerpo.
- `lib/creacion.ts:369`: cada etapa puede llevar poderes (`habilidades`) elegidos de las acciones de la habilidad.
- `components/EditorTransformacion.tsx:225-238`: el editor crea y reordena etapas en lista.
- `lib/vision.ts`: un poder ocular tiene patrón, dirección, modo (`abrir`, `con_accion`, `permanente`), apariencia
  y recompensas. Se edita en `components/yunque/editores/EditorVision.tsx`.
- El combate ya lee `efectos.transformacion` y `activaciones` (`lib/combate.ts:874`).

## Enfoques considerados

- **A. Solo etapas con ramas.** Mantiene la lista y añade enlaces opcionales entre etapas. Cambio pequeño, pero
  el cambio libre queda incómodo: cada par de formas necesita su propio enlace a mano.
- **B. Grafo completo.** Cada forma es un nodo y cada transición es una conexión. Permite cambio libre, cadenas y
  la vuelta a la realidad como una regla general. Más trabajo, pero es el modelo que pide la mesa.
- **C. Dos tipos de transformación.** Una para cambio libre (grafo) y otra para cadena (lista). Simple de
  construir, pero obliga a elegir un tipo al principio y es menos flexible.

**Elegido B**, porque cubre los tres casos (libre, cadena y vuelta) con el mismo modelo, y el usuario ya pidió
la libertad del resto del Yunque.

## Diseño

### 1. Formas (nodos)

Cada forma tiene: `id`, `nombre`, `estadisticas`, `poderes` (de la habilidad), `apariencia` (imagen, huella,
empuje) y `es_realidad` (solo una por transformación; es la forma base). Una forma nueva empieza sin enlaces.

### 2. Transiciones (conexiones)

Una transición une dos formas, en un sentido o en ambos:

```
{ desde: 'humano', hasta: 'dragon', sentido: 'ambos', coste?: {...}, condicion?: {...} }
```

- `sentido`: `ambos` (cambio libre) o `uno` (solo en un sentido, para cadenas).
- `coste` y `condicion` son opcionales. Por defecto, no cuestan nada y no tienen condición.

### 3. Vuelta a la realidad

Regla fija del motor, no configurable: desde cualquier forma se puede volver a `es_realidad`, aunque no haya una
transición directa. Se modela como una transición implícita, que no se dibuja en el lienzo pero aparece en el menú.

### 4. Cadenas

Una cadena es un conjunto de transiciones `uno` encadenadas (base → etapa 1 → etapa 2). Dentro de una cadena, subir
o bajar un paso es una transición. La vuelta a la realidad sigue disponible desde cualquier punto.

### 5. Poderes oculares

Un poder ocular es un nodo de visión con el mismo formato que el resto del Yunque: patrón, dirección, modo y
recompensas se configuran como nodos conectados, no como formulario. Su apariencia usa el mismo selector que las
formas.

## Decisiones tomadas por mí (revisables)

- El cambio de forma es **manual**, por defecto. Los disparadores automáticos (por vida, por turno, por acción) se
  añaden después como nodos, y no entran en la primera entrega.
- La vuelta a la realidad no cuesta nada salvo que se configure un coste en una transición concreta.
- Las transiciones de cadena (`uno`) siguen el orden de la cadena, y no se puede saltar un paso sin una transición libre.
- Las transformaciones existentes se mantienen como cadenas, para no romper los datos.

## Decisiones del usuario (segunda ronda)

- **Referencia: Orin.** Su transformación «Liberar el sello» (`tests/movimiento-posesion.test.mjs:26`) es el caso de
  control: cambia a `gigante`, queda `descontrolada` y usa el campo `posesion` del motor. Es el modelo para las
  transformaciones que toman el control del personaje.
- **Migración automática** de las transformaciones existentes a cadenas, sin revisión una por una. Las que tienen
  `posesion` se migran con el indicador de control activo (ver siguiente punto).
- **Disparadores automáticos:** no se piden en esta fase. Se queda como decisión posterior.

## Decisiones tomadas por mí (con las respuestas del usuario)

- **Forma que toma el control** (`posesion`): mantiene el comportamiento que ya tiene Orin. Mientras esté activa,
  el personaje no actúa por su cuenta. **Mi decisión:** la vuelta a la realidad sigue disponible siempre, también
  desde una forma que toma el control, porque así lo pediste («siempre con la opción de volver»). Lo que sí se
  restringe es quién la activa: solo el GM, si la transformación lo marca. Revisable en el plan.
- **Migración:** cada transformación existente se convierte en una cadena lineal con sus etapas, y el campo
  `posesion` se traslada tal cual. No cambia ningún valor de Orin ni de otros personajes.

## Lo que queda abierto

Ninguna decisión bloquea el plan. Si quieres que solo el GM pueda volver a la realidad desde una forma que toma el
control, indícalo en la revisión del plan.

## Lo que deja el constructor

- Formato exacto de `transicion` y su validación de grafo (sin formas huérfanas, siempre hay realidad alcanzable).
- Cómo se dibuja el grafo en el lienzo sin superponer nodos.
- Pruebas: cambio libre, cadena, vuelta a la realidad desde cualquier forma, y un poder ocular configurado solo con nodos.
