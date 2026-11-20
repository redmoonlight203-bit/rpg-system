# Combate: calidad visual y mecánica (v1, 2026-11-20)

Implementación del plan «Combate de Yugen, calidad visual y mecánica». Afecta al combate del jugador
(`app/ficha/combate`), al del GM (`app/dm/combate`) y a la arena del Yunque, porque los tres usan
`TableroCombate` y `BarraCombate`.

## Qué cambia para quien juega

- **Un clic ejecuta (escritorio).** Ya no existen «Confirmar acción» ni «Confirmar movimiento», ni el doble clic para moverse.
  - Acciones con objetivo: se elige la acción en la barra y un clic sobre un objetivo válido la ejecuta.
    Un clic sobre algo que no es objetivo (un aliado con un ataque, alguien fuera de la capa) solo lo selecciona.
  - Áreas: un clic en una casilla blanca lanza el efecto centrado ahí.
  - Acciones propias (guardia, transformaciones, crear arma, rugidos) y consumibles: un clic en su ranura.
  - Movimiento: un clic en una casilla verde.
- **Previsualización** al pasar el cursor (o al mantener pulsado en móvil): objetivo y su vida, casillas y afectados de un área, capa, coste y si se puede ejecutar. Sin porcentajes.
- **Dos toques en móvil.** Con puntero táctil, «Confirmar con segundo clic» viene activado: el primer toque previsualiza y marca la jugada (borde dorado), el segundo la ejecuta. Se puede cambiar en la cabecera del tablero; la preferencia se guarda en este navegador.
- **Barra fija.** Ranuras de 86×88 px con el nombre recortado a dos líneas; panel de información de altura fija; el tablero vive en un contenedor de altura fija y «Ver mapa completo» solo cambia el zoom. Los avisos del tablero (área, ruta, notas) flotan encima y no empujan nada.
- **Panel del héroe activo:** retrato, vida, PH, fatiga, estados, capa y acción usada/disponible. Cambia con una transición corta al pasar a otro personaje.
- **Inventario como ventana privada** (`components/VentanaInventario.tsx`): modal centrado que solo ve quien lo abre. No usa `useSincronizacionCombate`; lo que sí se sincroniza es el resultado de equipar o usar un objeto.
- **Consumibles en la barra:** pociones y pergaminos con cantidad (agrupados por nombre) y enfriamiento. En la ventana del inventario se arrastran a seis ranuras (o «Fijar»); con alguno fijado, la barra muestra solo los fijados y en ese orden. Se usan sobre el objetivo seleccionado o, si no hay, sobre uno mismo.
- **Atajos:** 1–9 para las ranuras numeradas (acciones, guardia y consumibles), Esc cancela la selección o la jugada pendiente, Tab (sin foco en un control) pasa al siguiente personaje propio del encuentro.
- **Resumen de turno:** al terminar el turno, un panel corto con vida, PH, fatiga, movimiento, capa, estados y si se usó la acción.
- **Tutorial contextual:** la primera vez que aparece una capa o un tipo de alcance, una nota breve sobre el tablero («Entendido» la descarta para siempre en ese navegador).

## Capas

La capa se deduce de los estados que ya produce el motor (`lib/combate-interfaz.ts`, `capaDe`); no se añadió lógica de juego.

| Capa | Estado que la activa | Aspecto |
|---|---|---|
| Aire | «En vuelo» (estado `vuelo` del motor) | La ficha se eleva y deja una sombra en el suelo; nubes al subir |
| Subsuelo | «Bajo tierra», «Enterrado» | Tierra removida; un enemigo bajo tierra solo deja su marca (sin nombre ni vida) |
| Agua | «Sumergido», «Nadando» | Ondas alrededor de la ficha |
| Otro plano | «Etéreo», «Otro plano» | Halo violeta y ficha translúcida |

- Regla visible reutilizada del motor: un efecto «solo suelo» (`suelo: true`) no alcanza a quien vuela. La previsualización lo dice y el clic no ejecuta.
- Al apuntar a alguien en el aire, la casilla exacta del suelo (su sombra) queda marcada con una mira.
- Hoy el motor solo produce la capa aire. Subsuelo, agua y otro plano tienen su tratamiento visual listo para cuando el plan de combate por capas añada esos estados.
- Las transiciones duran 700–800 ms, usan solo `transform`/`translate` y `opacity`, y se desactivan con `prefers-reduced-motion`.

## Verificación (2026-11-20)

- `npm test`: todas las pruebas pasan, incluidas las nuevas `tests/combate-interfaz.test.mjs` (capas, previsualización, resumen de turno, atajos, consumibles, privacidad del inventario) y los casos nuevos de `tests/tablero-render.test.mjs` (un clic mueve y ataca, áreas, efecto de suelo contra el aire, marca bajo tierra).
- Estabilidad, medida con Playwright sobre un banco de pruebas local (tablero 12×8, 20 movimientos, alternar mover/actuar y «Ver mapa completo»): la barra se desplazaba **96 px** en escritorio y **132 px** en 390 px; ahora **0 px** en ambos. Sin scroll horizontal en 390 px.
- Interacción en navegador: clic directo, dos toques en móvil, teclas 1–9, Esc, Tab, consumible, resumen de turno y mira del objetivo en el aire.

## Pendiente

- **Fase 7, partida de prueba** con tres jugadores en party y un GM, en móvil y escritorio: necesita una partida real.
- Las páginas del jugador y del GM se comprobaron con TypeScript y pruebas; la verificación en navegador se hizo con el tablero y la barra reales sobre datos de ejemplo, no contra Supabase.
