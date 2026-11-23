# Reacciones generales · verificación final de la Parte 2 (23-11-2026)

Plan: `docs/planes/plan-yunque-una-mas.md`, paso 2.9.

## Pruebas unitarias
`npm test` (motor regenerado + `node --test tests/*.test.mjs`): **524/524** correctas.

| Prueba | Qué cubre | Resultado |
|---|---|---|
| `reacciones-kion.test.mjs` | 1.344 combinaciones de las cinco plantillas de Kion contra la referencia guardada | idéntica |
| `reacciones-vocabulario.test.mjs` | 9 disparadores, combinaciones válidas e inválidas, datos antiguos | 5/5 |
| `reacciones-migracion.test.mjs` | `defensa` → `reaccion` al cargar, sin reescribir el estado | 4/4 |
| `reacciones-disparadores.test.mjs` | una reacción inventada por disparador: se activa en su momento y no en otro | 10/10 |
| `reacciones-coste.test.mjs` | PH, usos por encuentro/ronda, enfriamiento, oferta con línea de coste | 9/9 |
| `reacciones-descripcion.test.mjs` | «Sin coste», PH, usos, enfriamiento, frase por disparador | 6/6 |

## Navegador (`scripts/comprobar-reacciones.mjs`, 1440 y 390 px)
24/24 correctas: menú de decisión con nombre, disparador y 2 PH; «No usar» deja pasar el golpe; «Usar» lo absorbe;
editor general limitado al disparador; vista previa con la línea de coste; la reacción inventada
(«Cuando atacan a un aliado cercano» + interponerse) pasa el validador de la Forja y en combate el guardián recibe el golpe.

Límite: «Guardar» clasifica la creación en una acción de servidor que necesita Supabase real; se comprobó el borrador
que se guardaría, no la escritura en la base.

Capturas: `capturas/menu-reaccion-*.png`, `capturas/editor-reaccion-*.png`.
