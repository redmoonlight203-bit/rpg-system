# Artefactos con nivel · aceptación con Mao (23-11-2026)

Plan: `docs/planes/plan-yunque-una-mas.md`, paso 3.6. Mao se creó en el Yunque solo con la interfaz
(`scripts/comprobar-mao.mjs`, 12/12 a 1440 y 390 px): objeto → «Despertar como artefacto» → dos niveles
(«Despertar», «Mao saciado» a las 4 armas devoradas) → formas con búsqueda → seis tramos → voces.
El borrador se guardó como `tests/fixtures/mao.json` y la partida de prueba no añade lógica.

| Punto | Prueba | Resultado |
|---|---|---|
| Dos portadores con formas distintas | `tests/portadores-artefacto-database.mjs` (PGlite: d100 sin repetir, mismo portador recupera la suya, RLS, idempotente) + `mao-aceptacion` | correcto |
| Los seis tramos | `mao-aceptacion` (12/40/50/70/80/99 → seis tramos distintos; sube a nivel 2) + `artefactos-absorcion` 11/11 | correcto |
| Una voz que falle | `mao-aceptacion` (salvación 2 → pendiente → el GM asigna → el jugador responde) + `artefactos-voces` 6/6 | correcto |
| Espejo mental con ataque a un aliado | `mao-aceptacion` + `espejo-mental` 7/7 + navegador `scripts/comprobar-espejo-voz.mjs` 16/16: el jugador ve «???» como enemigo, ataca, la acción viaja con el id real y el registro dice «Bram recibe 4 daño» | correcto |

Suite completa: `npm test` 559/559; `npm run test:database` 41/41; `npm run build` correcto.

Límites: la Edge Function y Supabase se simularon (motor real + misma proyección); «Guardar» de la Forja clasifica en
una acción de servidor que necesita Supabase real, así que se validó el borrador, no la escritura.

Capturas: `capturas/mao-*.png`, `capturas/espejo-voz-*.png`.
