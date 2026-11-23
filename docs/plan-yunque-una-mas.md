# YUNQUE - UNA MÁS

Plan que reúne tres trabajos: (A) artefactos con nivel y mecánicas de Mao, (B) reacciones generales en vez de específicas de Kion, (C) menús en pantalla en lugar de diálogos del navegador.

Estado: plan. No hay cambios de código todavía.

## Diagnóstico (16-11 a 23-11, lectura del código)

### Reacciones
- `lib/combate.ts:506-515`: `PLANTILLAS_REACCION` tiene las cinco claves de Kion (inercia, absorción, reflejo, recíproco, ancla) como constante del motor.
- `lib/combate.ts:516`: `reaccionDe` mantiene compatibilidad con `Efecto.defensa`, que es un enum cerrado a esas cinco claves.
- `lib/yunque-plantillas.ts:17-27`: nombres y descripciones de Kion escritos a mano.
- `components/EditorReaccion.tsx:6`: etiquetas de Kion fijas.
- `components/yunque/ArenaDolls.tsx:188`: la oferta de reacción en la arena usa `window.confirm`.
- `lib/combate.ts:539-549` y `:1425`: el motor pregunta al RNG (`consultarReaccion`) si el defensor quiere usar la reacción; la forma en que se responde en la partida real no está verificada todavía.
- Problema de fondo: la reacción es un dato, pero el motor sigue atado a nombres y a dos sistemas de activación (`defensa` antiguo y `reaccion` nuevo), y la decisión de usarla no tiene pantalla propia.

### Diálogos del navegador
Hay alrededor de 35 llamadas a `window.confirm` o `window.alert` en `app/` y `components/`, por ejemplo en `app/dm/combate/page.tsx`, `app/dm/forja/page.tsx`, `app/dm/deudas/page.tsx`, `components/Tienda.tsx`, `components/Party.tsx`, `components/ArbolHabilidades.tsx`, `components/GaleriaCreacion.tsx` y `components/yunque/ArenaDolls.tsx`.

## Fase A · Artefactos con nivel (Mao)

Ver los planes anteriores de la conversación: forma por portador (d100), absorción en seis tramos, voces de demonio y espejo mental.

A1. Creación «Artefacto» en el Yunque, con niveles configurables.
A2. Tabla `portadores_artefacto` con RLS y pruebas PGlite (forma tirada, nivel, absorbido).
A3. Absorción en seis tramos: 1–30 una estadística; 31–45 dos o tres estadísticas; 46–60 una habilidad; 61–75 una habilidad y una estadística; 76–90 una habilidad y varias estadísticas; 91–100 set completo.
A4. Voces de demonio: salvación de Voluntad al tomar el arma; el GM asigna la voz; duración de tres turnos.
A5. Espejo mental: estado configurable (espejar tablero, intercambiar bandos, ocultar nombres), solo en la vista del jugador afectado; las acciones envían identificadores reales; el registro guarda el objetivo verdadero; salvación al inicio de cada turno; aviso en primera persona.

## Fase B · Reacciones generales

Objetivo: cualquier creación configura una reacción sin tocar el motor, y Kion pasa a ser solo un conjunto de plantillas.

B1. **Eliminar nombres de Kion del motor.** `PLANTILLAS_REACCION` se mueve a datos de plantilla (`lib/yunque-plantillas.ts`) y `combate.ts` solo ejecuta `Reaccion`. Migración: `Efecto.defensa` se convierte a `reaccion` cuando se carga la creación, sin pérdida. Prueba de regresión: las 1.344 combinaciones de `tests/reacciones-kion.test.mjs` deben dar el mismo resultado.
B2. **Un solo camino de activación.** Quitar la rama `defensa` del motor. Una reacción se activa por disparador (recibir golpe mágico o físico, recibir daño, forma activa) y por coste en PH.
B3. **Configuración general en el Yunque.** `components/EditorReaccion.tsx` deja de nombrar a Kion: disparador, naturaleza, reducción (fija, mitad, proporción), reserva, devolver, seguimiento y salvación, todo con etiquetas neutras. Vista previa en lenguaje claro.
B4. **Decisión de uso con menú en pantalla.** La oferta de reacción sale como panel en la pantalla del defensor (aceptar, rechazar, o usar después), no como `window.confirm`. Afecta a `components/yunque/ArenaDolls.tsx` y a la pantalla de combate (`app/ficha/combate/page.tsx`).
B5. **Pruebas.** Reacción inventada en cada combinación de disparador, naturaleza y reducción; regresión de Kion; prueba de la oferta sin navegador (solo lógica).

### Disparadores generales de reacción (decisión del GM, 23-11)

Cualquier reacción puede configurar su disparador entre estos (no solo defensas contra golpes):

| Disparador | Ejemplo |
|---|---|
| Antes de ser atacado | Defenderse antes del impacto |
| Después de ser atacado | Defenderse o devolver tras el golpe |
| Tras fallar un ataque propio | Volver a tirar |
| Tras fallar una prueba o salvación propia | Repetir la tirada |
| Cuando un aliado es atacado | Interponerse, compartir el daño |
| Cuando un aliado ataca | Atacar en respuesta, apoyar |
| Cuando un aliado cae a 0 de vida | Reaccionar por la caída |
| Al ser apuntado por un área | Esquivar o reducir el área |
| Al terminar su turno | Acción fuera de turno |

Cada disparador define qué puede hacer la reacción: repetir una tirada, contraatacar, reducir, interponerse, devolver, aplicar un estado o mover. Las combinaciones se validan en el Yunque (no se ofrece un disparador que el motor no pueda resolver).

B6. Ampliar `Reaccion` con `disparador` (lista de la tabla) y con los resultados nuevos (repetir tirada, contraatacar, interponer). El motor evalúa los disparadores en el mismo punto donde hoy se evalúan las defensas.
B7. **Coste y usos siempre visibles.** Cada reacción muestra en la tarjeta del Yunque, en el menú de decisión y en la ficha del combatiente: coste en PH, usos por encuentro o por turno y enfriamiento si lo tiene. Sin coste o usos, muestra «Sin coste». Esto va en la vista previa del editor y en el menú de la fase C.

## Fase C · Menús en pantalla

Objetivo: ningún `window.confirm`, `window.alert` ni `window.prompt` en la aplicación.

C1. Componente compartido `components/Dialogo.tsx` con API tipo promesa: `confirmar({titulo, mensaje, aceptar, cancelar, peligro})` y `avisar({titulo, mensaje})`. Accesible (foco atrapado, Esc, teclado), con tokens de `design.md`, y sin dependencias nuevas.
C2. Un proveedor `DialogoProvider` en el layout raíz (`app/layout.tsx`) para que cualquier componente lo use.
C3. Migración de las ~35 llamadas, en tandas: (1) `app/dm/*`, (2) `components/*` de combate y Yunque, (3) `app/ficha/*` y `app/login`, (4) `components/Tienda.tsx`, `Party.tsx`, `ArbolHabilidades.tsx` y resto.
C4. Prueba: una búsqueda en el código que impida volver a introducir `window.confirm|alert|prompt` (test en `tests/`).
C5. Comprobación en navegador (Playwright) de un borrado y de una oferta de reacción, en escritorio y a 390 px.

## Orden de trabajo

1. C1 y C2 (base de menús), luego C3 por tandas: es lo que más ve el usuario.
2. B1 y B2 (reacciones generales sin Kion), con regresión.
3. B3 y B4 (editor general y menú de reacción).
4. A1–A5 (Mao, artefactos con nivel).
5. Prueba de aceptación: Mao creado sin código nuevo y una reacción inventada funcionando en combate.

## Riesgos

- Migrar `Efecto.defensa` puede cambiar combates en curso; la conversión debe hacerse al cargar, sin tocar los datos guardados.
- El espejo mental cambia lo que ve el jugador; la verdad sigue en el servidor. No debe usarse sobre el registro ni sobre el GM.
- Hay 35 sitios de diálogo: hacerlo todo de una vez aumenta el riesgo de regresiones. Por eso se hace por tandas.

## Preguntas abiertas

1. ¿La oferta de reacción debe bloquear la acción del atacante mientras el defensor decide, o puede resolverse después del golpe?
2. ¿El menú de reacción muestra el coste en PH antes de confirmar? (Recomiendo sí.)
