# Pantallas de YUGEN — auditoría de la Fase 3 (16 de noviembre de 2026)

Pasos 3.2, 3.3 y 3.4 del [plan maestro](plan-maestro-2026-11-10.md). Los recorridos de sesión (3.1) están en [ciclo-juego.md](ciclo-juego.md#recorridos-de-una-sesión).

## Cómo se midió y qué falta

- **Medido en el código** con `node scripts/auditar-pantallas.mjs .` (lee cada `page.tsx` y los componentes que importa): tamaño del código de la pantalla, número de puntos de consulta (`.from`, `.rpc`, funciones), `select('*')`, y si existen textos de carga, vacío, error y reintento.
- **Medido en producción** (consultas de solo lectura, 16-11): filas por tabla, para saber qué sistemas se usan.
- **Sin medir todavía**: tiempo hasta pantalla usable, consultas reales en F12 → Network, uso en móvil y acciones confusas. Requieren una sesión autenticada con personas reales (GM y jugador). No se inventan.

«Consultas» cuenta los puntos del código que pueden consultar, no las peticiones de una visita. Uso en producción: 1 GM, 4 jugadores, 3 personajes, 63 creaciones de Forja, 2 encuentros, 1 resultado.

## Clasificación y decisión por pantalla

Leyenda de estados: C = carga, V = vacío, R = error con reintento. «—» = no lo tiene.

### Núcleo

| Ruta | Paso del recorrido | Código | Consultas | `select *` | Estados | Decisión |
| --- | --- | --- | --- | --- | --- | --- |
| /login | Entrar (ambos) | 16 KB | 1 | 0 | C V R | Mantener. |
| /dm/forja | GM · preparar el mundo | 258 KB | 22 | 6 | C V — | Mantener. Sin reintento al fallar la carga; revisar `select *`. |
| /dm/personajes | GM · preparar jugadores | 182 KB | 28 | 8 | C V R | Mantener. Es la que más `select *` tiene. |
| /dm/combate | GM · sesión | 282 KB | 28 | 2 | C V R | Mantener. Pantalla más pesada: auditar consultas reales primero. |
| /dm/recompensas | GM · recompensas | 36 KB | 23 | 5 | — V R | Mantener. Falta estado de carga. |
| /ficha | Jugador · entrar (Nexo) | 17 KB | 5 | 0 | — — — | Mantener. Solo enlaces; no necesita estados salvo el monedero. |
| /ficha/personajes | Jugador · elegir/crear personaje | 25 KB | 5 | 3 | C V R | Mantener. |
| /ficha/personaje | Jugador · ver su personaje | 14 KB | 3 | 3 | C — R | Mantener (detalle de la lista anterior). |
| /ficha/habilidades | Jugador · su personaje | 13 KB | 4 | 1 | C V — | Mantener. Sin reintento. |
| /ficha/equipamiento | Jugador · su personaje | 24 KB | 2 | 0 | — V R | Mantener. Falta estado de carga. |
| /ficha/inventario | Jugador · su personaje | 13 KB | 4 | 1 | C V — | Mantener. Sin reintento. |
| /ficha/combate | Jugador · sesión | 137 KB | 1 | 0 | C V R | Mantener. |

### Apoyo

| Ruta | Paso del recorrido | Código | Consultas | `select *` | Estados | Decisión |
| --- | --- | --- | --- | --- | --- | --- |
| /dm/party, /ficha/party | Abrir sesión | 51 KB | 6 | 2 | C V — | Mantener (mismo componente). |
| /dm/experiencia | GM · recompensas | 18 KB | 4 | 0 | C V — | Mantener: distinta de recompensas (EXP por personaje frente a botín y logros). |
| /dm/arbol, /ficha/experiencia | Progresión | 26 KB | 5 | 0 | C V — | Mantener. |
| /dm/reglas | GM · preparar | 174 KB | 14 | 4 | C V R | Mantener. |
| /dm/mercado, /ficha/tienda | Tienda | 27 KB | 9 | 0 | C V — | Mantener (componente `Tienda` compartido). |
| /ficha/tiradas | Jugador · sesión | 7 KB | 0 | 0 | sin datos | Mantener. |
| /ficha/alma | Jugador · su cuenta | 20 KB | 6 | 1 | C V R | Mantener. Es parte de la creación y la cuenta, no solo «más adelante». |

### Más adelante y retiradas

| Ruta | Estado | Datos en producción | Decisión |
| --- | --- | --- | --- |
| /dm/tienda-almas, /ficha/tienda-almas | En menú (jugador solo con Mente colmena) | — | Mantener tras el interruptor que ya existe (`mente_colmena`). |
| /ficha/logros, /ficha/arena | En menú | 0 logros, 0 salas | Mantener, al final del menú. |
| /dm/deudas | En menú del GM | 1 deuda, completada | **Decisión pendiente** con /ficha/deudas. |
| /ficha/deudas | **Sin enlace**: solo por URL | (la misma) | **Decisión pendiente**: el GM ve «Pactos y deudas», pero el jugador no puede llegar a su pantalla para pedir un pacto. O se enlaza para el jugador o se oculta también al GM. |
| /ficha/codex | Sin enlace | 0 entradas | **Aplazar.** No existe editor del GM para `codex_entradas`: siempre estaría vacía. Encaja con el Diario interactivo (Etapa 3). |
| /ficha/mapas | Sin enlace | 0 mapas | **Aplazar.** Sin editor de `mapas`. Encaja con Exploración (Etapa 3). |
| /ficha/lore | Sin enlace | 0 eras, 1 reloj | **Aplazar.** Sin editor de `linea_tiempo_eras`. |
| /dm/estilos | En menú del GM (último) | — | Herramienta de diseño. Mantener al final; candidata a ocultarse. |
| /dm/panel, /dm/tablero, /ficha/creacion, /dm | Redirecciones | 1 tablero, 5 fichas antiguas | Mantener como redirección: protegen marcadores antiguos. Las tablas `tableros`/`tablero_tokens` ya no las lee ninguna pantalla. |

Fusiones del paso 3.5 revisadas: dm/panel frente a dm/tablero (ambas retiradas); ficha/personaje frente a ficha/personajes (lista y detalle, se mantienen); dm/experiencia frente a dm/recompensas (funciones distintas); tiendas de almas frente a ficha/alma (el baúl es la cuenta; la tienda de almas compra cuerpos).

## Navegación (3.4)

Toda pantalla enlazada está a uno o dos clics: el menú lateral muestra todas; en móvil hay cuatro pestañas y «Más». El orden no seguía el recorrido: el jugador veía primero Arena y Logros; el GM, Estadísticas y Árboles antes que Personajes o Party. El 16-11 se reordenó, sin quitar ni renombrar entradas:

- **GM**: Forja · Jugadores y personajes · Parties · Combate · Botín, logros y títulos · Experiencia | Árboles · Estadísticas · Tiendas · Tienda de almas · Pactos y deudas · Guía visual.
- **Jugador**: Nexo · Personajes · Mi party · Combates · Mesa de dados · Árbol · Baúl del alma · Tienda · Logros · Arena (· Tienda de almas con Mente colmena).

## Estados y mensajes (3.6)

- Hecho el 16-11: `lib/errores.ts` (`mensajeError`) sustituye en 45 puntos de 27 archivos el patrón que mostraba `error.message` tal cual. Los fallos de red, sesión caducada, bloqueo, tiempo agotado, permisos, duplicados y dependencias tienen texto en español; cualquier otro mensaje técnico en inglés muestra el texto propio de la pantalla. Los mensajes en español del servidor se conservan: se comprobaron los 463 de las migraciones (462 intactos; el único sustituido era un texto interno en inglés).
- Pendiente: `components/ui` ya tiene `LoadingState`, `EmptyState` y `ErrorState` con «Reintentar», pero ninguna pantalla los usa. Siguiente paso: aplicarlos en las pantallas núcleo marcadas arriba sin carga o sin reintento (dm/forja, dm/recompensas, ficha/habilidades, ficha/inventario, ficha/equipamiento).

## Rendimiento (3.7) y móvil (3.8)

- 37 `select('*')` distintos en `app` y `components` (la tabla los cuenta por pantalla, así que un componente compartido aparece en varias). Prioridad: dm/personajes (8), dm/forja (6) y dm/recompensas (5). Cambiarlos exige saber qué columnas usa cada pantalla; con el volumen actual (decenas de filas) no hay urgencia medida.
- Sin medir: tiempo hasta usable y móvil. Requiere sesión real en dos teléfonos (ver guion de la guía v2).
