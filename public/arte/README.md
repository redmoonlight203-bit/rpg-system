# Arte de Yugen (design.md v3)

Las ilustraciones, runas y texturas las aporta el propietario. Este archivo dice qué falta, con qué nombre y en qué formato. Cada archivo nuevo se anota en la tabla «Entregado» con su origen y licencia.

## 1 · Runas de sección (prioridad alta)

Sustituyen a los kanji del menú lateral, las pestañas móviles y las cabeceras.

- **Formato:** SVG (preferido) o PNG de 256 × 256 px con fondo transparente.
- **Color:** un solo color, cualquiera (blanco o negro). La aplicación las tiñe de oro con CSS, así que el color del archivo no importa; solo cuenta la forma.
- **Encuadre:** cuadrado, la runa centrada y con un margen de ~10 %. Trazo legible a 20 px.
- **Nombre:** `public/arte/runas/<clave>.svg` con la clave exacta de la tabla.

| Clave | Sección | Quién la ve |
|---|---|---|
| `nexo` | Inicio (El Nexo) | Jugador |
| `personajes` | Personajes / ficha | Jugador y GM |
| `party` | Mi party / Parties | Jugador y GM |
| `combate` | Combates / Campo de batalla | Jugador y GM |
| `tiradas` | Mesa de dados | Jugador |
| `experiencia` | Árbol de habilidades del jugador / Experiencia del GM | Jugador y GM |
| `alma` | Baúl del alma | Jugador |
| `tienda` | Tienda | Jugador |
| `mercado` | Tiendas del GM | GM |
| `tienda-almas` | Tienda de almas | Ambos |
| `deudas` | Pactos con Kuroi / Pactos y deudas | Ambos |
| `logros` | Logros y títulos | Jugador |
| `arena` | Arena | Jugador |
| `forja` | La Forja | GM |
| `recompensas` | Botín, logros y títulos | GM |
| `reglas` | Estadísticas y reglas | GM |
| `arbol` | Árboles de habilidades (GM) | GM |
| `estilos` | Guía visual | GM |

Al recibir cada runa se añade a `RUNAS_DISPONIBLES` en `lib/runas.ts`. Mientras tanto se sigue viendo el kanji.

## 2 · Ilustraciones (prioridad media)

| Archivo | Medida | Formato | Uso |
|---|---|---|---|
| `escenas/entrada.webp` | 1920 × 1080 | WebP | Fondo de la escena de login (Kuroi en su vacío) |
| `escenas/nexo.webp` | 800 × 800, fondo transparente | WebP o PNG | Ilustración del portal del Nexo (sustituye al emblema) |
| `retratos/<clave-de-raza>.webp` | 600 × 800 | WebP | Retrato genérico por raza en la carta de héroe (p. ej. `humano.webp`, `elfo.webp`) |

## 3 · Opcional

- `lugares/<clave>.webp`, 320 × 200: viñeta ilustrada para cada lugar del Nexo.
- `texturas/pergamino.webp`, 512 × 512 sin costuras: grano de pergamino más rico que el actual (hecho con CSS).

## Entregado

| Archivo | Origen | Licencia | Fecha |
|---|---|---|---|
| — | — | — | — |
