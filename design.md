# design.md — Yugen · Dirección visual v3 «de formulario a juego»

Sustituye a la v2 (archivada en `design-v2.md`). Origen: `docs/plan-de-formulario-a-juego.md`.
Decisiones del propietario (16-11-2026): se reinventa el estilo; se conserva el nombre **Yugen**; los kanji del menú se sustituyen por **runas** que aporta el propietario, igual que el resto de ilustraciones; la paleta y la fuente propuestas se aplican sin muestras previas; el orden es ficha del jugador → GM → login.

## 1. Concepto

Yugen deja de parecer un panel de administración y se siente como un **juego de fantasía oscura**. Toda pantalla cumple tres ideas:

1. **Mundo.** Cada pantalla es una escena con fondo de capas, marco y nombre propio; no una página de tarjetas planas.
2. **Respuesta.** Cada acción tiene un efecto visible: pulsar, tirar, crear, subir de nivel.
3. **Progreso.** Los números se convierten en avance: barras que se llenan, nodos que se iluminan, sellos al completar.

Lo que **no** cambia: lógica de datos, Supabase, combate, reglas, permisos de rol, nombres de rutas.

## 2. Paleta

Los nombres semánticos se conservan para que ninguna pantalla se rompa; cambian los valores (bloque `@theme` de `app/globals.css`).

| Token | Valor | Uso |
|---|---|---|
| `well` | `#0b0a14` | Pozos: tableros, campos, fondos hundidos |
| `canvas` / `ink` | `#14121f` | Noche pizarra-violeta: fondo de escena |
| `raised` | `#1d1a2c` | Paneles y marcos |
| `overlay` | `#29253b` | Modales y cajones |
| `gold` | `#b8925a` | Oro envejecido: acción principal, marcos |
| `gold-soft` / `gold-bright` | `#e3c58f` / `#f4dfae` | Títulos, cifras, estado activo |
| `parchment` | `#e9dcbf` | Pergamino: textos de lectura y fichas |
| `arcane` | `#9d8ae0` | Halo arcano: disponible, magia, foco |
| `crimson` | `#b0172b` | Peligro, crítico, acción irreversible, sellos |
| `text` / `text-muted` | `#ebe5d6` / `#a8a2bb` | Texto general |
| `line` / `line-strong` | oro al 24 % / 55 % | Bordes de marco |

Contraste comprobado sobre `well`, `canvas`, `raised` y `overlay`: todos los textos superan 5:1 (texto 11,8–15,7; secundario 6,0–8,0; oro 5,1–6,8; arcano 5,0–6,7). Tinta sobre oro 6,4:1; blanco sobre carmesí 7,0:1.

Colores de estado que no cambian de función: vida carmesí, fatiga cobre, PH/energía arcano, experiencia oro.
Las familias de Tailwind ya usadas (`neutral`, `amber`, `purple`…) se re-pintan con esta paleta: `neutral` → escala pizarra-violeta, `amber`/`yellow` → oro, `purple`/`violet`/`indigo` → arcano.

## 3. Tipografía

- **Display** (títulos de pantalla, nombres de héroe, sellos): **Cinzel** (OFL, `public/fonts/Cinzel-latin.woff2`), variable `--font-display`. Solo títulos; nunca párrafos.
- **Cifras grandes**: Noto Serif con `tabular-nums`.
- **Cuerpo y controles**: Noto Sans. Mínimo 13 px en texto de juego; 15 px en campos.

## 4. Elementos firma

| Elemento | Qué es | Dónde |
|---|---|---|
| **Escena** | Fondo de capas: vacío, halo arcano y grano de pergamino (CSS) | Toda pantalla (`.y3-escena`) |
| **Marco** | Panel con esquinas ornamentadas en SVG y filigrana sutil | Paneles principales, carta de héroe, formularios agrupados |
| **Runa** | Imagen del propietario que identifica cada sección; se tiñe con CSS (máscara) | Menú, cabeceras, lugares del hub |
| **Halo** | Brillo arcano suave alrededor de lo disponible o activo | Nodos disponibles, lugar con novedad, turno activo |
| **Barra vital** | Barra con relleno animado, brillo y cifra | Vida, PH, fatiga, experiencia |
| **Medallón** | Atributo como moneda: cifra grande dentro de un círculo con borde de oro | Atributos de la ficha |
| **Sello** | Lacre carmesí con runa | Aprobado, victoria, nivel subido, creación terminada |

**Runas:** entregadas el 16-11 (`public/arte/runas/<seccion>.png`, máscaras teñidas de oro). Una sección sin runa asignada muestra el kanji anterior.

**Figuras de raza:** cada raza tiene su figura (estilo hombre de Vitruvio, `public/arte/razas/`); sustituye por completo a la silueta antigua, que se eliminó. Sin raza conocida se usa la figura humana. El mapa estelar (`public/arte/escenas/mapa-estelar.webp`) es el cielo de la constelación de habilidades y de la entrada.

## 5. Movimiento

Se permiten estas animaciones; todas en CSS con `transform` u `opacity`, y desactivadas con `prefers-reduced-motion`:

- **Pulsar:** escala 0,97 en 120 ms.
- **Elevar:** lugares y cartas suben 2–4 px al pasar el cursor (180 ms).
- **Halo:** pulso suave de 2,4 s solo en lo *disponible* (no en todo).
- **Barras:** el relleno cambia en 450 ms; un destello recorre la barra al cambiar.
- **Celebración:** 400–900 ms, una sola vez (subir de nivel, sello, creación terminada).
- **Entrada de escena:** aparición de 300 ms al cargar la pantalla.

- **Ambiente del Yunque:** el taller de nodos de la Forja puede tener dos bucles continuos, y solo estos dos: las brasas que suben por el fondo del lienzo y el brillo que corre por los cables. Ambos se detienen con movimiento reducido (decisión R6 del Yunque).

- **Códices de La creación** (ficha de cada creación en la Forja). Duraciones por defecto, editables por el GM en el Taller de códices (0–2000 ms) y apagables con un interruptor: pasar página del bestiario 650 ms (`rotateY` desde el lomo), voltear la carta de tarot 600 ms, inclinación de la carta según el puntero hasta 6° (máx. 15°, solo ratón), aparición del sello 400 ms y del estandarte 600 ms, una sola vez. Sin bucles.

Prohibido: librerías de animación nuevas, animaciones infinitas fuera del halo y del ambiente del Yunque, mover el diseño (`width`, `top`…) para animar.

## 6. Patrones

- **Pantalla = escena.** Cabecera con runa, título en Cinzel, subtítulo con la voz de Kuroi y acciones.
- **Botones.** Principal en oro con presión; secundario con borde oro; peligro en carmesí con confirmación.
- **Formularios.** Campos agrupados dentro de un `Marco` con título; el guardado muestra un sello breve.
- **Números → progreso.** Toda cifra con máximo se muestra como barra; los atributos como medallones.
- **Voz de Kuroi** en vacíos, cargas y errores: «Aún no hay nada aquí. Crea algo en la Forja.»
- **Imágenes.** Solo URL o archivos de `public/arte/`; nunca base64. `next/image` con tamaño fijo.

## 7. Pantallas (orden de trabajo)

1. Ficha del jugador: hub de lugares (`/ficha`), carta de héroe (`/ficha/personaje`, `FichaVital`), habilidades, experiencia.
2. GM: mesa de Kuroi, Forja (hecha: cada creación se lee en su códice —bestiario, tarot, reliquia, sello, edicto, expediente o pergamino— configurable en el Taller de códices; «El yunque» es un lienzo de nodos con grimorio, arena de dolls y vista de lista por debajo de 1024 px; el formulario por pasos se retiró), galería de personajes.
3. Login como escena de entrada.
4. Combate (solo estilo), inventario, tiendas y resto.

## 8. Verificación

Lint y build sin errores nuevos; `npm test` sin cambios en combate; capturas a 390 px y escritorio sin desborde horizontal; contraste ≥ 4,5:1; animaciones detenidas con movimiento reducido; sin dependencias nuevas en `package.json`.

## 9. Reglas para asistentes

- Usa los tokens y primitivas de `components/ui/` (`Marco`, `BarraVital`, `Medallon`, `Sello`, `Runa`) antes de crear estilos nuevos.
- No generes ilustraciones, runas ni texturas de imagen: pídeselas al propietario con nombre, tamaño y formato (ver `public/arte/README.md`). Los fondos de escena se hacen con CSS.
- No toques la lógica de datos al cambiar el aspecto de una pantalla.
