# design.md — Yugen · Dirección visual v3 «La noche de Kuroi»

Versión 3.0 · 16 de noviembre de 2026
Reemplaza a la v2 (archivada en `design-v2.md`). Cambia la sobriedad de la v2 por una estética de juego de fantasía, manteniendo el nombre **Yugen** y a **Kuroi** como identidad.

> **Para quien edite la app (personas o asistentes de código):** lee este archivo completo antes de tocar una pantalla. Si algo no está aquí, usa lo más parecido o propón una entrada nueva en la sección 12.

---

## 1. Concepto: la noche de Kuroi

Yugen es un mundo que se juega. Kuroi, el Director, es la oscuridad que lo contiene: un gato negro como el vacío, o una figura negra como el espacio, con ojos blancos y una sonrisa. Todo lo que se ve en la app sale de esa noche: el jugador y el GM tocan un mundo que brilla desde la oscuridad.

**Principios**

| Principio | Significado en la interfaz |
|---|---|
| Vacío | El fondo es una noche violeta profunda, nunca negro plano. |
| Luz | Lo importante brilla: oro para lo que se puede tocar, morado arcano para la magia. |
| Dado | El azar es el centro del juego. Los dados se ven, se tiran y se celebran. |
| Pergamino | Las superficies de texto son hojas de un libro antiguo: marcos finos con ornamentos ligeros. |
| Sonrisa | Kuroi sonríe. Los momentos de victoria y de suerte tienen una recompensa visual clara. |

Proporción de color: **70 % vacío, 15 % oro, 10 % arcano, 5 % carmesí** (el carmesí solo para peligro o lo irreversible).

---

## 2. Vocabulario

- **Kuroi (黒)**: el Director. Su marca es el gato negro con ojos blancos y sonrisa del logo.
- **Reencarnados (転生)**: los jugadores.
- **Yugen (幽玄)**: el nombre del producto. Nunca cambia.
- Los kanji son índices de sección y van siempre acompañados del nombre en español.

---

## 3. Paleta

### 3.1 Núcleo

| Nombre | Hex | Token | Función |
|---|---|---|---|
| Vacío (夜 *yoru*) | `#0e0c14` | `canvas` | Fondo de página |
| Pozo | `#07060b` | `well` | Campos, tablero, fondos de escena |
| Piedra oscura | `#17131f` | `raised` | Paneles |
| Velo | `#221c2e` | `overlay` | Menús, modales |
| Oro de pergamino (金 *kin*) | `#c7a46a` | `gold` | Líneas, acción principal, emblemas |
| Oro brillante | `#f4dcae` | `gold-bright` | Títulos, cifras |
| Arcano (魔 *ma*) | `#8b6cff` | `arcano` | Magia, habilidades, estados especiales |
| Carmesí (紅 *beni*) | `#b3122e` | `crimson` | Peligro, acciones irreversibles |

### 3.2 Texto y líneas

| Uso | Hex | Token |
|---|---|---|
| Texto principal | `#efe9dc` | `text` |
| Texto secundario | `#a39db3` | `text-muted` |
| Etiquetas | `#e7c994` | `gold-soft` |
| Línea sutil | `rgb(199 164 106 / 0.22)` | `line` |
| Línea fuerte | `rgb(199 164 106 / 0.55)` | `line-strong` |
| Fondo activo | `#2c1f2a` | `ember` |

### 3.3 Estados

- **Peligro sobre oscuro:** `#ff7a88`. **Éxito:** `#7fd6a4`. **Arcano:** `#c4b5ff` como texto.
- **Prohibido:** texto `#b3122e` sobre fondo oscuro; texto oscuro sobre carmesí.
- Contraste mínimo de texto normal: **4,5 : 1**.

---

## 4. Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Títulos y cifras de héroe | Cinzel (OFL, display de fantasía) | Nombres de personaje, títulos de pantalla, emblemas |
| Cuerpo y datos | Noto Sans KR | Texto, tablas, formularios |
| Cifras de vida, oro y nivel | Noto Serif KR, `tabular-nums` | Grandes números |
| Kanji índice | Fuente kanji ya incluida | Índices de sección |

Cinzel se carga con `next/font` y expone `--font-display`. Solo para títulos: nunca en texto corrido.

---

## 5. Elementos firma

1. **Marco de pergamino:** panel con borde de 1 px en oro y esquinas con un ornamento SVG discreto (`Marco`).
2. **Barra vital:** barra con brillo que se mueve al cambiar el valor (`BarraVital`). Vida en carmesí, energía en arcano, experiencia en oro.
3. **Dado:** el d20 3D (`Dado3D`) aparece al tirar y se queda con el resultado. Un 20 o un 1 tienen un destello propio.
4. **Sello:** un sello de oro solo para aprobado, victoria o finalizado.
5. **Halo:** una luz arcana suave detrás del personaje o la escena activa.

---

## 6. Espacio, radios y líneas

- Radios: 4 px en controles, 6 px en paneles. Sin sombras grises; la profundidad viene del halo y del brillo del borde.
- Líneas de 1 px. Separar con línea antes que con caja cuando sea posible.
- Márgenes en escritorio de 24 px a 40 px; en móvil, 16 px a cada lado sin scroll horizontal.

---

## 7. Componentes

- **Botón:** principal en oro sobre vacío; secundario con borde de oro; peligro en carmesí. Al pulsar escala a 0,97.
- **Campo:** fondo `well`, foco con borde oro y halo suave. Error en `danger-text` con un mensaje que explica cómo corregirlo.
- **Chip:** tonal, con texto siempre visible.
- **Barras:** ver §5. Etiqueta y cifra siempre junto a la barra.
- **Vacío, carga y error:** cada uno con una frase de Kuroi y una acción clara.

---

## 8. Movimiento

Se permite movimiento que **responde a algo** y que **celebra** algo:

- Responde: pulsar, abrir un cajón, cambiar una barra, confirmar un guardado (120–250 ms).
- Celebra: tirar un dado, subir de nivel, completar una creación, ganar un combate (400–900 ms, una vez).
- Ambiente: el halo arcano respira muy despacio (8 s) en las pantallas de entrada y de ficha. Se detiene si el usuario lo pide.
- Solo se animan `transform` y `opacity`.
- Todo se desactiva con `prefers-reduced-motion`; en ese caso se muestra el estado final sin transición.

---

## 9. Accesibilidad

- Foco visible: anillo oro de 2 px.
- Áreas táctiles de 44 × 44 px.
- Kanji decorativos con `aria-hidden`.
- El color nunca es el único portador de significado: cada estado tiene texto o icono.
- Probar a 200 % de zoom y a 360 px de ancho.

---

## 10. Rendimiento

- Sin librerías de animación. CSS y SVG por defecto; canvas solo en el mapa de combate.
- Los assets nuevos van en `public/arte/` en WebP o SVG, con `next/image` y tamaño fijo.
- No se añade peso nuevo al combate sin medirlo primero.

---

## 11. Logo y marca

- El logo es `public/brand/yugen-kuroi.png`: el diseño original de Kuroi sobre dados de rol y el nombre YUGEN, con los ojos cambiados a blanco y una sonrisa añadida.
- Kuroi siempre es un gato negro (o figura negra) con ojos blancos y sonrisa. No se usan ojos rojos ni rasgos demoníacos como marca principal.
- Favicon y `apple-icon`: el mismo PNG.

---

## 12. Decisiones pendientes

1. Confirmar la fuente Cinzel frente a otra display de fantasía (con licencia abierta).
2. Decidir si el halo arcano respira en todas las pantallas o solo en entrada y ficha.
3. Revisar los kanji con alguien que lea japonés (especialmente 魔 y 夜).

---

## 13. Reglas para asistentes de código

- Los colores y fuentes salen de los tokens de `app/globals.css`. No inventar hexadecimales sueltos en componentes.
- No usar radios mayores de 6 px ni sombras grises.
- No cambiar el nombre Yugen ni el diseño de Kuroi del logo sin que lo pida la persona responsable.
- Animar solo según §8 y siempre con `prefers-reduced-motion`.
