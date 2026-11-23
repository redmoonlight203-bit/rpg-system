# Pendientes · plan «Yunque · una más» (23-11-2026)

Problemas menores que encontró la revisión final de la rama. **Resueltos los siete el 24-11-2026** (fase 0 del plan maestro de conceptos básicos configurables; prueba en `tests/pendientes-reacciones.test.mjs` y migración `20261124090000_portadores_unicos.sql`). Ninguno rompe el
combate; todos tienen arreglo local. Plan: [planes/plan-yunque-una-mas.md](planes/plan-yunque-una-mas.md).

| # | Problema | Dónde | Qué pasa | Arreglo propuesto |
|---|---|---|---|---|
| 1 | «Devorar arma» sin control de errores ni bloqueo de doble clic | `components/yunque/editores/FormasArtefacto.tsx` (`devorarArma`) | Con tramos inválidos en el borrador, el error no se muestra. Un doble clic tira dos d100 sobre el mismo estado y se pierde una absorción. Usa el borrador sin guardar, no la configuración guardada. | `try/catch` con aviso, desactivar el botón mientras escribe y leer la configuración guardada. |
| 2 | Filtro de naturaleza oculto en el editor de reacciones | `components/EditorReaccion.tsx` (`inicial`) | Al pasar a «Tras fallar un ataque/salvación» se conserva `naturaleza`, que ya no se ve; la repetición solo funciona ante ataques de esa naturaleza. | Borrar `naturaleza` al cambiar a esos disparadores. |
| 3 | `una_por_ronda` heredado sin interruptor | `components/EditorReaccion.tsx` | Las reacciones antiguas con «una vez por ronda» no se pueden desmarcar desde el editor (se quita al elegir «Usos»). | Mostrarlo como «1 uso por ronda» y convertirlo en `usos`. |
| 4 | La base no impide dos portadores con la misma forma | `supabase/migrations/20261123100100_portadores_artefacto.sql` | Solo `artefacto_portar` reparte formas sin repetir; una escritura directa del GM podría duplicarlas. Tampoco comprueba que el objeto sea un artefacto. | `unique (artefacto_id, forma_tirada)` y comprobar `configuracion_artefacto is not null` en la función. |
| 5 | PH perdidos cuando un aliado reduce y otro se interpone | `lib/combate.ts` (bucle `aliado_atacado` en `resolverEfecto`) | El primero paga una reducción sobre el objetivo original; si después otro se interpone, esa reducción se descarta. | Ofrecer primero interponerse, o trasladar la reducción al que se interpone. |
| 6 | Menú de reacción sin trampa de foco | `components/MenuReaccion.tsx` | Tab puede salir del menú y el foco no vuelve al cerrar. | Reutilizar la trampa de foco de `components/Dialogo.tsx`. |
| 7 | Animación tras interponerse | `lib/combate.ts` (`animarAccion`) | El efecto visual sigue apuntando al objetivo original, no a quien se interpuso. | Tomar el destino del último `recibe` o guardar el objetivo final en el evento. |

Decisiones tomadas durante el plan (para revisarlas si no convencen): ver los mensajes de commit de la rama
`claude/fervent-mccarthy-2imqvj` y las métricas en `docs/metricas/*-2026-11-23.md`.
