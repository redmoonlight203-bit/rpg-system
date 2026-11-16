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
| `razas/<clave>.webp` | ~1024 × 683 (se recorta la figura central) | WebP o PNG | Figura de cada raza, estilo hombre de Vitruvio. **Faltan: Dragones y Hadas.** Desde el 16-11 también se pueden subir desde Estadísticas al crear o editar la raza. |

### Regla: cada raza nueva lleva su imagen

Al crear una raza en Estadísticas hay que subir su figura; sin ella no se puede guardar (lo comprueba también el servidor). Una subraza puede heredar la de su raza superior, como Kuro con Humanos. Si la imagen trae dibujados los huecos de equipo, se recorta la figura central: la aplicación pone sus propios huecos interactivos encima.

## 3 · Opcional

- `lugares/<clave>.webp`, 320 × 200: viñeta ilustrada para cada lugar del Nexo.
- `texturas/pergamino.webp`, 512 × 512 sin costuras: grano de pergamino más rico que el actual (hecho con CSS).

## Entregado

| Archivo | Origen | Licencia | Fecha |
|---|---|---|---|
| `razas/humanos.webp` | Propietario, 16-11-2026 (recortada: sin huecos ni rótulos dibujados) | Del propietario | 16-11-2026 |
| `razas/elfos.webp` | Propietario, 16-11-2026 (recortada) | Del propietario | 16-11-2026 |
| `razas/enanos.webp` | Propietario, 16-11-2026 (recortada) | Del propietario | 16-11-2026 |
| `razas/hombres-bestia.webp` | Propietario, 16-11-2026 (recortada) | Del propietario | 16-11-2026 |
| `razas/gigantes.webp` | Propietario, 16-11-2026 (recortada) | Del propietario | 16-11-2026 |
