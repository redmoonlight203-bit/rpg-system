# Visión ocular (primitiva «Visión» del Yunque)

Permite crear en el Yunque cualquier habilidad ocular: el GM combina piezas y el motor las ejecuta sin código nuevo.
Es la primitiva 10 de `plan-yunque-general.md` («Percepción o visión»).

## Cómo se crea

1. En el Yunque, añade una **acción** (o usa una existente).
2. Arrastra el módulo **Visión ocular** (familia Módulos) sobre la acción. También hay variantes listas: *Ojo analítico* y *Ojo cazador*, y tres plantillas de ejemplo: *Ojo del Eclipse*, *Mirada del cazador* y *Ojo de la verdad*.
3. Configura el ojo en su panel. La vista previa se dibuja con los mismos datos que verá el jugador.

| Bloque | Opciones |
|---|---|
| Apariencia | Nombre, color del iris y de las marcas, patrón (anillos, aspas, espiral, estrella, rejilla, pétalos, rendija, luna), número de marcas (0-9), intensidad del velo (0-3) o una imagen propia. |
| Activación | **Se abre con la acción** (la acción solo abre o cierra el ojo; puede no gastar el turno), **Al usar la acción** (la acción hace su efecto y además abre el ojo) o **Siempre abierto** (funciona como una pasiva). Duración en turnos (0 = todo el combate) y PH por turno de mantenimiento. |
| Mirada | Alcance en casillas (0 = todo el tablero) y si atraviesa muros. |
| Revelar | Vida y PH, estados, acciones, pasivas, atributos y criaturas ocultas bajo tierra. |
| Puntos débiles | De 1 a 4 direcciones por enemigo (de 8 rumbos), que cambian cada ronda o son fijas. Atacar desde ese lado da: ventaja (dos d20), bono al impacto, crítico seguro, daño fijo, dados extra o ignorar un % de armadura. Se combinan. |
| Defensa y lectura | Anticipar (armadura extra contra quien el ojo ve) y ver hasta dónde pueden llegar los enemigos en su turno. |
| Mientras está abierto | Bonos de atributos: ataque, daño, armadura, salvación, iniciativa y movimiento. |

Abrir cuesta los PH y la Fatiga de la acción; cerrar un ojo abierto es gratis. Un ojo *siempre abierto* sin dados propios no aparece en la barra de acciones.

## Qué ve el jugador

Cuando su personaje tiene un ojo abierto, durante su turno:

- Un **velo** del color del ojo cubre el tablero y un **HUD** muestra el ojo, su nombre, los turnos que le quedan y cuántos enemigos ve.
- Cada enemigo visto muestra **flechas** en sus lados débiles y la **casilla** desde la que golpear queda marcada.
- Al apuntar un ataque, la previsualización dice si cae en un punto débil y qué recompensa da.
- Al enfocar un enemigo, el panel **«Tu ojo ve a…»** muestra lo revelado (vida, PH, atributos, estados, acciones, pasivas).
- Con *amenazas*, un botón muestra las casillas que los enemigos alcanzan cuerpo a cuerpo en su próximo turno.
- Los enemigos bajo tierra se ven si el ojo revela lo oculto.

El GM ve lo mismo al controlar a un combatiente con el ojo abierto, y la arena de pruebas del Yunque lo muestra para probar cada ojo.

## Reglas del motor

- Los puntos débiles son deterministas (misma semilla en servidor e interfaz): ojo, observador, objetivo y ronda.
- La dirección del ataque es la del atacante respecto al objetivo, en 8 rumbos; vale también a distancia.
- El servidor del jugador (`combate-jugador`) solo envía la información de enemigos dentro de la mirada y solo lo que el ojo revela.
- Código: `lib/vision.ts` (vocabulario, validación, descripción, puntos débiles) y `lib/combate.ts` (`visionesActivas`, `golpeOcular`, `vistaOcular`, apertura y mantenimiento). Interfaz: `components/OjoVisual.tsx`, `components/CapaOcular.tsx`, `components/yunque/editores/EditorVision.tsx`.
- Pruebas: `tests/vision.test.mjs` y `tests/jugador-edge.test.mjs`.

## Ojos de clan, linajes y fases

**Herencia.** En *Requisitos* de una habilidad o pasiva:
- **Linaje:** marca una raza o subraza (por ejemplo, un clan de una sola raza creado como subraza en la Forja).
- **Clan:** marca uno o varios clanes. Un clan reúne personajes de cualquier raza; el GM lo crea y gestiona sus miembros en **Clanes y linajes** (`/dm/clanes`).
- Activa **«Se hereda»**: la habilidad se entrega sola a todo personaje vivo y aprobado que cumpla el linaje y/o pertenezca a uno de los clanes (y al nivel mínimo, si lo hay). Se retira sola si sale del clan, cambia de linaje o el GM quita la herencia. Lo que el GM entrega a mano no se toca.
- Si el linaje y el clan están marcados a la vez, se exigen los dos.

**Fases del ojo.** Un ojo puede ser una **transformación por etapas**: en cada etapa, «Ojo de esta fase» define un ojo distinto (apariencia, alcance, puntos débiles, revelación). Solo está abierto el de la fase actual. Avanzar de fase consume una acción.

**Un poder distinto por miembro en la fase avanzada.** Da a cada etapa un atributo de fase (p. ej. `fase_ojo: 2`) y crea para cada miembro su propia acción con *requisito de forma* `fase_ojo ≥ 2`, entregada a ese personaje. Solo aparece en su barra cuando su ojo está en esa fase.

La plantilla **«Ojo de clan con fases»** del Grimorio monta todo esto: fase 1 común (ventaja en puntos débiles), fase 2 con otro ojo más fuerte y un poder propio de ejemplo.

Código: `supabase/migrations/20261122100000_herencia_linajes_clanes.sql` (clanes, herencia), `app/dm/clanes/page.tsx`, `components/RequisitosYunque.tsx`, `lib/transformaciones.ts` (`EtapaTransformacion.vision`). Pruebas: `tests/herencia-database.mjs` y `tests/vision.test.mjs`.
