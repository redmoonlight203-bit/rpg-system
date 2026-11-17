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
| /ficha/equipamiento | Jugador · su personaje | 24 KB | 2 | 0 | C V R | Mantener. Ya tenía carga («Preparando tu armería…»); la auditoría automática solo buscaba «Cargando». |
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
| /dm/deudas | En menú del GM | 1 deuda, completada | Mantener: Kuroi aprueba, rechaza y cobra. |
| /ficha/deudas | En menú del jugador desde el 16-11 («Pactos con Kuroi») | (la misma) | **Mantener y enlazar** (decisión del usuario): los jugadores registran lo que Kuroi les prometió en persona. Mismo flujo que antes; permisos ahora en el servidor (ver abajo). |
| /ficha/codex | Sin enlace | 0 entradas | **Aplazar.** No existe editor del GM para `codex_entradas`: siempre estaría vacía. Encaja con el Diario interactivo (Etapa 3). |
| /ficha/mapas | Sin enlace | 0 mapas | **Aplazar.** Sin editor de `mapas`. Encaja con Exploración (Etapa 3). |
| /ficha/lore | Sin enlace | 0 eras, 1 reloj | **Aplazar.** Sin editor de `linea_tiempo_eras`. |
| /dm/estilos | En menú del GM (último) | — | Mantener al final (decisión del usuario). |
| /dm/panel, /dm/tablero, /ficha/creacion, /dm | Redirecciones | 1 tablero, 5 fichas antiguas | Mantener como redirección: protegen marcadores antiguos. Las tablas `tableros`/`tablero_tokens` ya no las lee ninguna pantalla. |

Fusiones del paso 3.5 revisadas: dm/panel frente a dm/tablero (ambas retiradas); ficha/personaje frente a ficha/personajes (lista y detalle, se mantienen); dm/experiencia frente a dm/recompensas (funciones distintas); tiendas de almas frente a ficha/alma (el baúl es la cuenta; la tienda de almas compra cuerpos).

## Navegación (3.4)

Toda pantalla enlazada está a uno o dos clics: el menú lateral muestra todas; en móvil hay cuatro pestañas y «Más». El orden no seguía el recorrido: el jugador veía primero Arena y Logros; el GM, Estadísticas y Árboles antes que Personajes o Party. El 16-11 se reordenó, sin quitar ni renombrar entradas:

- **GM**: Forja · Jugadores y personajes · Parties · Combate · Botín, logros y títulos · Experiencia | Árboles · Estadísticas · Tiendas · Tienda de almas · Pactos y deudas · Guía visual.
- **Jugador**: Nexo · Personajes · Mi party · Combates · Mesa de dados · Árbol · Baúl del alma · Tienda · Logros · Arena (· Tienda de almas con Mente colmena).

## Estados y mensajes (3.6)

- Hecho el 16-11: `lib/errores.ts` (`mensajeError`) sustituye en 45 puntos de 27 archivos el patrón que mostraba `error.message` tal cual. Los fallos de red, sesión caducada, bloqueo, tiempo agotado, permisos, duplicados y dependencias tienen texto en español; cualquier otro mensaje técnico en inglés muestra el texto propio de la pantalla. Los mensajes en español del servidor se conservan: se comprobaron los 463 de las migraciones (462 intactos; el único sustituido era un texto interno en inglés).
- Hecho el 16-11: «Reintentar» junto al error en la Forja, Recompensas, Habilidades e Inventario (este último componente sirve a ambas), con el estilo propio de cada zona. Recompensas muestra además estado de carga. Equipamiento ya lo tenía.
- Pendiente: pantallas de apoyo sin reintento (party, árbol, experiencia, tiendas). `components/ui` tiene `LoadingState`/`ErrorState` sin usar; no se impusieron porque su estilo no coincide con el de las fichas del jugador.

## Rendimiento (3.7) y móvil (3.8)

- 37 `select('*')` distintos en `app` y `components` (la tabla los cuenta por pantalla, así que un componente compartido aparece en varias). Prioridad: dm/personajes (8), dm/forja (6) y dm/recompensas (5). Cambiarlos exige saber qué columnas usa cada pantalla; con el volumen actual (decenas de filas) no hay urgencia medida.
- Sin medir: tiempo hasta usable y móvil. Requiere sesión real en dos teléfonos (ver guion de la guía v2).

## Seguridad encontrada durante la auditoría (16-11)

Al revisar Pactos y deudas apareció que `deudas_kuroi` y otras 17 tablas tenían la política heredada «Permitir todo» (rol `public`, `using true`) y permisos completos para `anon`. Supabase Advisors no lo marca porque formalmente hay política. Aplicado en producción:

- `deudas_kuroi` (migración `20261116150000_deudas_permisos.sql`): sin acceso anónimo; cada jugador ve y crea solo sus promesas, que siempre nacen pendientes; solo puede autoaprobar pasados 5 días, aceptar o impugnar un cobro; Kuroi ve todas, aprueba, rechaza y cobra (la fecha del cobro la fija el servidor); título, mensaje, autor y fecha no se pueden reescribir; nadie borra. Prueba: `tests/deudas-database.mjs`.
- Las otras 17 tablas (migración `20261116160000_tablas_abiertas_sin_anon.sql`): retirado el acceso sin sesión. Para usuarios con sesión no cambia nada. Prueba: `tests/tablas-abiertas-database.mjs`.

**Pendiente importante:** en esas 17 tablas cualquier usuario con sesión (también un jugador) sigue pudiendo modificar o borrar filas, por ejemplo `categorias_forja` y `config_estadisticas`, que definen razas y atributos. Hay que sustituir cada «Permitir todo» por reglas de lectura para todos y escritura solo para Kuroi (o propias del jugador donde corresponda), comprobando antes qué pantallas escriben en cada tabla.

## Rediseño visual · tanda GM (16-11)

Aplicación del plan de `design.md` a las pantallas del GM. Las pantallas del jugador van en la siguiente tanda.

- Pieza común `components/layout/Cabecera.tsx` (§8): kanji índice, migas, título serif, subtítulo, zona de acciones y divisor kintsugi; y `Secciones`, pestañas con subrayado oro navegables con teclado. Usadas en Forja, Jugadores y personajes, Parties, Combate, Recompensas, Experiencia, Árbol, Estadísticas, Tiendas, Tienda de almas y Pactos. Antes había seis estilos de cabecera distintos.
- Piezas de contenido en `app/yugen-design.css`: rejilla de líneas compartidas, chips tonales, cita, vacío, campo.
- Pactos y deudas rehecha entera: nombre del jugador en cada pacto, filtros por estado, carga y error con reintento, botón principal oro en vez de verde y rojo.
- Limpieza (§7 del plan): 57 fuentes monoespaciadas sustituidas, 132 radios grandes llevados a 2 px (se respetan círculos y píldoras), barra de vida en carmesí, `sky`, `violet` y `green` incorporados a la paleta.
- Comprobado con capturas a 1440 y 390 px de las 10 pantallas: sin desbordes horizontales. Lint: 15 avisos menos que antes y ninguno nuevo.
- Pendiente del GM: contenido interior de Estadísticas (editores grandes), tablero de combate y textos en mayúsculas espaciadas («PERSONAJE DE JUGADOR · #1»).
- Forja, 17-11: la pestaña «El yunque» deja el formulario por pasos y monta el taller de nodos (`components/yunque/TallerYunque.tsx`, spec `docs/superpowers/specs/2026-11-16-yunque-lienzo-design.md`): grimorio a la izquierda, lienzo en el centro (lista por debajo de 1024 px), arena de dolls a la derecha y cajón «Ficha». «Forjar» guarda con la misma función de siempre: si sale bien, sello con destello y la creación sigue abierta con su `id`; si falla, el foco va al primer nodo con error (o al núcleo) y el error se ve en la barra. Se conservan «La creación», «Preparados para batalla», «Peticiones», crear dentro de un personaje y volver a él, y Navy. Se retiraron la ruta de pruebas `/dm/forja/taller` y `VinculosYunque`. Comprobado con `scripts/capturar-yunque.mjs` a 1440 y 390 px y con movimiento reducido.
