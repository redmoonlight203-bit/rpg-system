# design.md — Yugen Realm 幽玄 · Dirección visual v2

Versión 2.0 · 10 de noviembre de 2026
Reemplaza a la v1 (queda una copia en `design-v1-paleta.md`).
Paleta base, sin cambios: tinta `#121312` · oro `#a67d43` · carmesí `#ad0013`

> **Para quien edite la app (personas o asistentes de código):** lee este archivo completo antes de tocar una pantalla. Si algo no está aquí, no lo inventes: usa lo más parecido o propón una entrada nueva en la sección 15.

---

## 1. Concepto: yūgen (幽玄)

La app ya se llama Yugen. **Yūgen es la belleza que sugiere más de lo que muestra**: luz tenue, profundidad, silencio, un detalle que hace pensar. Ese es el concepto de diseño, y es lo que lo hace original: no es una imitación de «lo japonés», sale del nombre y del vocabulario propio del producto (Kuroi, Reencarnados, Alma, Forja).

**Lo moderno viene de cinco decisiones:**

1. Mucho espacio vacío con intención (間, *ma*): menos elementos, cada uno con más peso.
2. Rejillas finas de líneas de 1 px, en lugar de tarjetas sueltas con sombras.
3. Tipografía grande y ligera para las cifras y los títulos.
4. Superficies planas, sin sombras grises ni adornos ornamentales.
5. Un solo gesto de movimiento por pantalla.

**Lo que este diseño NO es:** círculo rojo de bandera, flores de cerezo, farolillos, tipografías «estilo katana», ni kanji decorativos sin función.

### Principios

| Principio | Significado en la interfaz |
|---|---|
| 間 Espacio | Los márgenes grandes son parte del diseño; no se rellenan |
| 線 Línea fina | Estructura con líneas doradas de 1 px; separar con línea antes que con caja |
| 印 Sello | Un sello carmesí solo para decisiones: aprobado, victoria, finalizado |
| 円 Círculo | Un único movimiento firma: el círculo (ensō) que marca el turno activo |
| 墨 Tinta | La oscuridad tiene profundidad: lavados sutiles, no negro plano |
| 字 Kanji con función | Cada kanji es un índice de sección; siempre va acompañado del nombre en español |

Proporción de color en cualquier pantalla: **85 % tinta, 10 % oro, 5 % carmesí.**

---

## 2. Vocabulario propio de la app

La interfaz ya usa estos términos; el diseño los refuerza:

- **Kuroi (黒)**: rol de GM. Su marca es el kanji 黒 en el riel lateral.
- **Reencarnados (転生)**: rol de jugador. Su marca es 転生 en el riel lateral.
- **Yugen (幽玄)**: nombre del producto, se usa vertical en el login.

> **Importante:** los kanji de este documento son una propuesta. Antes de publicar, pide a alguien que lea japonés que los revise (sección 15).

---

## 3. Paleta

### 3.1 Núcleo

| Nombre | Hex | Token | Función |
|---|---|---|---|
| Tinta (墨 *sumi*) | `#121312` | `ink` / `canvas` | Fondo de página |
| Oro (金 *kin*) | `#a67d43` | `gold` | Líneas, acento, acción principal |
| Carmesí (紅 *beni*) | `#ad0013` | `crimson` | Sello, peligro, acciones irreversibles |

### 3.2 Superficies

| Nivel | Hex | Token |
|---|---|---|
| Pozo (campos, tablero) | `#0a0b0a` | `well` |
| Lienzo (página) | `#121312` | `canvas` |
| Elevada | `#1a1b19` | `raised` |
| Superpuesta (menús, modales) | `#262725` | `overlay` |

### 3.3 Texto y líneas

| Uso | Hex | Contraste sobre tinta | Token |
|---|---|---|---|
| Texto principal | `#e9e4d7` | 14,7 : 1 | `text` |
| Texto secundario | `#a9aaa5` | 8,0 : 1 | `text-muted` |
| Títulos y cifras | `#f1d5a7` | 13,1 : 1 | `gold-bright` |
| Etiquetas y kanji | `#e2c292` | 11,0 : 1 | `gold-soft` |
| Oro de acento | `#a67d43` | 5,0 : 1 | `gold` |
| Línea sutil | `rgb(166 125 67 / 0.22)` | — | `line` |
| Línea fuerte | `rgb(166 125 67 / 0.5)` | — | `line-strong` |
| Fondo de elemento activo | `#38231b` | — | `ember` |

### 3.4 Estados y combinaciones prohibidas

- **Peligro:** relleno `crimson` con texto blanco (7,5 : 1). Como texto sobre oscuro, usar `#f0606c` (5,9 : 1).
- **Éxito:** `emerald-400` `#62b393` (7,4 : 1). **Información:** `cyan-300` (champán). **Aviso:** `orange-400` (cobre; verificar contraste al aplicarlo).
- **Prohibido:** texto `#ad0013` sobre tinta (2,5 : 1), texto tinta sobre `#ad0013` (2,5 : 1) y carmesí junto a oro sin borde tinta (2,0 : 1).

### 3.5 Tokens para `globals.css`

Dentro del bloque `@theme` existente (si ya aplicaste los de la v1, solo falta `--font-kanji`):

```css
@theme {
  --color-well: #0a0b0a;
  --color-canvas: #121312;
  --color-raised: #1a1b19;
  --color-overlay: #262725;
  --color-gold-soft: #e2c292;
  --color-gold-bright: #f1d5a7;
  --color-ember: #38231b;
  --color-line: rgb(166 125 67 / 0.22);
  --color-line-strong: rgb(166 125 67 / 0.5);
  --color-text: #e9e4d7;
  --color-text-muted: #a9aaa5;
  --color-danger-text: #f0606c;
  --color-success-text: #62b393;
}
@theme inline {
  --font-kanji: var(--font-kanji-src), var(--font-serif);
}
```

---

## 4. Tipografía

| Rol | Fuente | Tamaño | Peso | Clases orientativas |
|---|---|---|---|---|
| Cifra grande (vida, oro, nivel) | Noto Serif KR | 48 px | 300 | `font-serif text-5xl font-light tabular-nums text-gold-bright` |
| Título de pantalla | Noto Serif KR | 30 px | 600 | `font-serif text-3xl font-semibold text-gold-bright` |
| Título de sección | Noto Serif KR | 20 px | 500 | `font-serif text-xl text-gold-soft` |
| Subtítulo de panel | Noto Sans KR | 16 px | 600 | `text-base font-semibold` |
| Cuerpo | Noto Sans KR | 14–15 px | 400 | `text-sm text-text` |
| Apoyo | Noto Sans KR | 13 px | 400 | `text-xs text-text-muted` |
| Kanji índice | fuente kanji | 24–40 px | 600 | `font-kanji text-gold` |

**Fuente de los kanji.** Las fuentes actuales (`public/fonts/*-latin.ttf`) son solo latinas y no dibujan kanji. Se añade una única fuente japonesa, recortada a los glifos que se usan (unos 20 KB):

```bash
pip install fonttools brotli
pyftsubset ShipporiMincho-SemiBold.ttf \
  --text="幽玄黒転生入主戦盤絆人鍛市魂賞経借樹規創術装倉闘賽図巻典功承" \
  --flavor=woff2 --output-file=public/fonts/kanji-yugen.woff2
```

En `layout.tsx`, junto a las otras `localFont`:

```ts
const kanji = localFont({
  src: "../public/fonts/kanji-yugen.woff2",
  variable: "--font-kanji-src",
  display: "swap",
});
// y añadir `${kanji.variable}` a la clase del <html>
```

Comprueba la licencia de la fuente elegida (Shippori Mincho se publica con licencia OFL, que permite recortarla y alojarla tú mismo).

**Reglas**

- Tamaño mínimo de texto de juego: 13 px. Línea de lectura máxima: unos 65 caracteres.
- Cifras siempre con `tabular-nums`. No usar `font-mono` (aquí es la misma fuente sans).
- Mayúsculas con tracking amplio solo en etiquetas de estado de 12 caracteres o menos.
- Texto vertical (縦書き) solo para el kanji índice o para 幽玄 en el login: máximo 4 caracteres, nunca información única.
- Los kanji llevan `aria-hidden="true"`; el nombre en español es el que se lee.
- Textos de interfaz en español, con verbos claros («Guardar cambios») y el mismo nombre para la misma acción en todo el flujo.

---

## 5. Elementos firma

Seis elementos que dan identidad. Se usan con cuidado: el diseño depende de no saturarlos.

| Elemento | Qué es | Dónde se usa | Dónde NO |
|---|---|---|---|
| **Riel (柱)** | Columna lateral de 64 px con el kanji de cada sección | Navegación del GM y del jugador en escritorio | Móvil (allí hay pestañas) |
| **Rejilla (格子)** | Paneles unidos por líneas de 1 px que se comparten, como un shoji | Paneles de control, fichas, combate | Páginas de lectura |
| **Kintsugi (金継ぎ)** | Divisor de línea dorada con un pequeño quiebre diagonal | Entre bloques grandes de una página | Dentro de tarjetas |
| **Sello (判子)** | Cuadrado carmesí con un kanji en blanco, ligeramente girado | Solo: aprobado (承), victoria y encuentro finalizado | Botones, decoración |
| **Círculo (円相)** | Anillo abierto que se dibuja alrededor del retrato activo | Turno activo en combate; indicador de carga | Cualquier otro lugar |
| **Lavado de tinta (墨)** | Degradado suave en gris cálido sobre el lienzo | Cabeceras de página y login | Detrás de texto de lectura |

```css
@layer components {
  /* 柱 riel */
  .riel { width: 64px; background: var(--color-canvas); border-right: 1px solid var(--color-line); }
  .tategaki { writing-mode: vertical-rl; text-orientation: upright; letter-spacing: .3em; }

  /* 格子 rejilla: los hijos comparten borde */
  .lattice { display: grid; gap: 1px; background: var(--color-line); border: 1px solid var(--color-line); }
  .lattice > * { background: var(--color-canvas); padding: 1.5rem; }

  /* 金継ぎ divisor */
  .kintsugi { position: relative; height: 1px;
    background: linear-gradient(90deg, rgb(166 125 67 / .7) 0 38%, transparent 38% 40%, rgb(166 125 67 / .7) 40% 100%); }
  .kintsugi::after { content: ""; position: absolute; left: 38%; top: -5px; width: 2%; height: 11px;
    border-left: 1px solid var(--color-gold); transform: skewX(-30deg); }

  /* 判子 sello */
  .hanko { display: inline-grid; place-items: center; width: 40px; height: 40px; border-radius: 2px;
    background: var(--color-crimson); color: #fff; font-family: var(--font-kanji); font-size: 22px; line-height: 1;
    transform: rotate(-4deg); box-shadow: inset 0 0 0 2px rgb(255 255 255 / .18); }

  /* 円相 círculo (SVG: <circle class="enso" r="26" cx="32" cy="32"/>) */
  .enso { fill: none; stroke: var(--color-crimson); stroke-width: 3; stroke-linecap: round;
    stroke-dasharray: 150 14; transform: rotate(-90deg); transform-origin: 50% 50%; }
  .enso--dibujar { animation: enso-dibujar .9s ease-out both; }
  @keyframes enso-dibujar { from { stroke-dashoffset: 164; } to { stroke-dashoffset: 0; } }
  @media (prefers-reduced-motion: reduce) { .enso--dibujar { animation: none; } }

  /* 墨 lavado */
  .sumi { background: radial-gradient(ellipse 70% 50% at 20% 0%, rgb(38 39 37 / .9), transparent 70%), var(--color-canvas); }
}
```

Los trazos exactos (inclinación del kintsugi, giro del sello) son un punto de partida; ajústalos al verlos en pantalla.

---

## 6. Espacio, radios y líneas

- **Escala de espacio (ma):** 4 · 8 · 16 · 24 · 48 · 72 · 96 px. Los saltos grandes (48 o más) separan secciones; no se compensan con relleno.
- **Radios:** `rounded-xs` (2 px) en controles y paneles; `rounded-full` en chips; el sello usa 2 px. Prohibido `rounded-xl` y mayores.
- **Líneas:** 1 px siempre. La línea sutil (`line`) es la normal; la fuerte (`line-strong`) marca selección.
- **Sin sombras grises.** La profundidad viene del nivel de superficie y de la línea. Los brillos (`glow-gold`, `glow-blood`) solo señalan estado: seleccionado u objetivo.
- **Esquinas ornamentales de `.kr-panel`:** se retiran. Se mantiene la clase solo durante la migración.

---

## 7. Componentes

### Botón

| Variante | Aspecto | Cuándo |
|---|---|---|
| Principal | Relleno oro, texto tinta, hover `amber-400` | Una acción principal por pantalla |
| Secundario | Borde oro, texto `gold-soft` | Alternativas |
| Fantasma | Solo texto `text-muted` | Bajo peso |
| Destructivo | Relleno carmesí, texto blanco | Atacar, terminar, borrar |

Foco: anillo dorado de 2 px. Deshabilitado: 45 % de opacidad. Cargando: «Guardando…». Altura mínima de 44 px en móvil.

### Campo
Fondo `well`, borde `neutral-700`, foco con borde oro. Error: borde `red-400` y mensaje que explica qué falló y cómo corregirlo. Etiqueta siempre visible encima.

### Chip
Tonal: fondo al 15 %, borde al 30 %, texto claro. Siempre con texto, nunca solo color.

### Tabla
Cabecera `gold-soft`, filas separadas por `line`, cifras a la derecha con `tabular-nums`. En móvil se convierte en lista.

### Modal
Fondo `overlay`, borde `line-strong`, cierre de 44 px. Las acciones destructivas dicen qué se pierde.

### Barras de recurso
Vida en carmesí `red-500`, fatiga en cobre, recursos especiales en champán, experiencia en oro. Etiqueta y cifra siempre visibles junto a la barra. Ajusta a los recursos reales del juego.

### Vacío, carga y error
- **Vacío:** una frase que invita a actuar y el botón principal.
- **Carga:** esqueleto en `raised`; en acciones largas, el círculo ensō.
- **Error:** qué pasó y cómo seguir, con «Reintentar». Sin disculpas ni mensajes técnicos crudos.

---

## 8. Estructura general (shells)

### Escritorio, GM y jugador

```
+------+-----------------------------------------------------+
| RIEL |  [K] Título de pantalla                 [ Acción ]  |
|      |  Subtítulo breve                                    |
| [K]  |  ---------------- ~ ------------------------------  |
| [K]  |                                                     |
| [K]  |   CONTENIDO (uno de los 8 esqueletos)               |
| [K]  |                                                     |
|      |                                                     |
| [yo] |                                                     |
+------+-----------------------------------------------------+
 64 px   ancho máx. 1280 px · margen lateral 48 px
```

- `[K]` es el kanji índice. Al pasar el ratón o al ampliar el riel (220 px) aparece el nombre en español.
- Abajo del riel: avatar y rol (黒 Kuroi o 転生 Reencarnado).
- El título de pantalla lleva su kanji a la izquierda, en oro, a 40 px.

### Móvil

```
+---------------------+
| [K] Título   [Acc.] |
| subtítulo           |
| ------- ~ --------- |
|  contenido en una   |
|  sola columna       |
+---------------------+
| [K] [K] [K] [K] [K] |
| Inic Comb Part Más  |
+---------------------+
```

Cinco pestañas inferiores (ya existen en `mobile.css`), con kanji y nombre. «Más» abre la lista del resto.

---

## 9. Los 8 esqueletos de página

Toda pantalla de la app encaja en uno de estos ocho. Cada uno se implementa una vez como componente de layout y las pantallas solo ponen el contenido.

### A · Entrada (入) — `PaginaLogin`

```
+--------------------------------------------------------+
|  (lavado de tinta + patrón al 3 %)               V     |
|                                                  E     |
|            +------------------------+            R     |
|            | Yugen Realm            |            T     |
|            | Entra al reino         |            I     |
|            | [correo             ]  |            C     |
|            | [contraseña         ]  |            A     |
|            | [      Entrar       ]  |            L     |
|            +------------------------+     (幽玄)       |
+--------------------------------------------------------+
```
- Único lugar con patrón de fondo (geométrico, máximo 4 % de opacidad, hecho con CSS).
- Errores bajo el campo, en español claro. Móvil: el panel ocupa el ancho con margen de 24 px.

### B · Panel de control (主) — `PaginaPanel`

```
+----------------------------+---------------------------+
| Sesión de hoy              | Encuentro en curso        |
| 3 jugadores conectados     | Ronda 4 · Turno de Orin   |
| [ Abrir combate ]          | (retrato con círculo)     |
+---------------+------------+---------------------------+
| Pendientes    | Party      | Registro reciente         |
| 2 recompensas | 4 fichas   | ...                       |
+---------------+------------+---------------------------+
```
- Rejilla de 1 px compartida. Una sola cifra grande (serif ligera) por celda.
- Un solo elemento destacado: el encuentro en curso.
- Móvil: las celdas se apilan; lo urgente va primero.

### C · Tablero de combate (戦) — `PaginaCombate`

```
+----------------------------------------+---------------+
| Ronda 4 · Turno: Orin                  | Iniciativa    |
+----------------------------------------+ > Orin        |
|                                        |   Goblin      |
|            TABLERO (pozo)              +---------------+
|                                        | Ficha activa  |
|                                        | Vida  ████░   |
+----------------------------------------+ Fatiga ██░░░  |
| [Mover] [Atacar] [Habilidad] [Objeto]  | Registro      |
|                    [ Terminar turno ]  | ...           |
+----------------------------------------+---------------+
```
- El tablero ocupa todo el ancho posible; los paneles laterales miden 280 px.
- Aliados en oro, enemigos en carmesí, ficha activa con círculo ensō y `glow-gold`, objetivo con `glow-blood`.
- Alcance: relleno oro al 20 %; movimiento: champán al 15 %; zona peligrosa: carmesí al 25 %.
- Un único botón destacado por turno. «Terminar turno» es destructivo (carmesí).
- Móvil: tablero arriba, iniciativa como tira horizontal, acciones en 2 columnas abajo, registro en cajón.
- Variante **C′ (lienzo)** para árbol de habilidades y mapas: tablero a pantalla completa con barra flotante mínima.
- El sello 勝 / 承 aparece solo al finalizar el encuentro. Si usas 勝, añádelo a la fuente kanji.

### D · Ficha (人) — `PaginaFicha`

```
+-------------------------+--------------------------------+
|  retrato enmarcado      | Orin                           |
|                         | Raza · Linaje · Nivel          |
|                         +----------------+---------------+
+-------------------------+ Vida           | Fatiga        |
| Atributos               | 42 / 60        | 3 / 10        |
| ...                     +----------------+---------------+
|                         | Habilidades · Equipo · Inventario|
+-------------------------+--------------------------------+
```
- Cifras grandes en serif ligera; atributos en lista tabular.
- Móvil: retrato y cifras arriba, pestañas debajo en una columna.

### E · Catálogo (術 装 倉 市 魂 功 典) — `PaginaCatalogo`

```
+--------------------------------------------------------+
| [Buscar.......] [Tipo v] [Rareza v]       24 elementos |
+----------+----------+----------+----------+------------+
| celda    | celda    | celda    | celda    | DETALLE    |
| imagen   |          |          |          | (cajón al  |
| Nombre   |          |          |          |  elegir)   |
+----------+----------+----------+----------+            |
| celda    | celda    | celda    | celda    |            |
+----------+----------+----------+----------+------------+
```
- Celdas unidas por línea (rejilla), imagen como URL (nunca base64), nombre y un dato clave. Rareza con borde y etiqueta, no solo color.
- Selección: borde `line-strong` y `glow-gold`.
- Móvil: 2 columnas; el detalle abre como hoja inferior.

### F · Lista y detalle (絆 賞 経 借 人) — `PaginaListaDetalle`

```
+----------------+-----------------------------------------+
| [Buscar....]   | Nombre del elemento          [ Acción ] |
|----------------|  +----------+----------+-------------+  |
| > Elemento 1   |  | dato     | dato     | dato        |  |
|   Elemento 2   |  +----------+----------+-------------+  |
|   Elemento 3   |  Historial o detalle en pestañas        |
+----------------+-----------------------------------------+
   320 px           resto
```
- Aprobar en recompensas: botón principal; al completarse, aparece el sello 承.
- Móvil: primero la lista; al elegir, el detalle ocupa la pantalla con botón «Volver».

### G · Editor (創 鍛 規) — `PaginaEditor`

```
+--------------------------------------------------------+
| Paso 2 de 5: Raza         (1)--(2)--(3)--( )--( )      |
+----------------------------+---------------------------+
| FORMULARIO (máx. 640 px)   | VISTA PREVIA              |
| Campo                      | (ficha o ítem en vivo)    |
| Campo                      |                           |
+----------------------------+---------------------------+
| [ Atrás ]                              [ Continuar ]   |
+--------------------------------------------------------+
```
- El indicador de pasos solo se usa en la creación de personaje, que sí es una secuencia. Forja y reglas usan pestañas.
- Barra de acciones fija abajo con una única acción principal.
- Móvil: la vista previa pasa a una pestaña junto al formulario.

### H · Lectura (巻) — `PaginaLectura`

```
+--------------------------------------------------------+
|  T  | Título del texto                 | Notas al       |
|  V  | -------------- ~ ------------    | margen         |
|     | Párrafo de unos 62 caracteres,   | (índice,       |
|     | interlineado 1,7 y serif.        |  relacionados) |
+--------------------------------------------------------+
```
- Serif en cuerpo, sin lavado de tinta detrás del texto. Título vertical corto opcional.
- Móvil: columna única; las notas pasan al final.

---

## 10. Mapa de pantallas a esqueletos

Los propósitos de cada ruta se infieren por su nombre; corrige lo que no coincida.

| Ruta | Esqueleto | Kanji |
|---|---|---|
| `login` | A Entrada | 入 |
| `dm/panel` | B Panel | 主 |
| `dm/combate`, `ficha/combate` | C Combate | 戦 |
| `dm/tablero` | C Combate | 盤 |
| `ficha/arena` | C Combate | 闘 |
| `dm/arbol` | C′ Lienzo | 樹 |
| `ficha/mapas` | C′ Lienzo | 図 |
| `ficha/personaje` | D Ficha | 人 |
| `ficha/habilidades` | E Catálogo | 術 |
| `ficha/equipamiento` | E Catálogo | 装 |
| `ficha/inventario` | E Catálogo | 倉 |
| `dm/mercado`, `ficha/tienda` | E Catálogo | 市 |
| `dm/tienda-almas`, `ficha/tienda-almas`, `ficha/alma` | E Catálogo | 魂 |
| `ficha/logros` | E Catálogo | 功 |
| `ficha/codex` | E Catálogo | 典 |
| `dm/personajes`, `ficha/personajes` | F Lista y detalle | 人 |
| `dm/party`, `ficha/party` | F Lista y detalle | 絆 |
| `dm/recompensas` | F Lista y detalle | 賞 |
| `dm/experiencia`, `ficha/experiencia` | F Lista y detalle | 経 |
| `dm/deudas`, `ficha/deudas` | F Lista y detalle | 借 |
| `ficha/tiradas` | F Lista y detalle | 賽 |
| `ficha/creacion` | G Editor (con pasos) | 創 |
| `dm/forja` | G Editor (con pestañas) | 鍛 |
| `dm/reglas` | G Editor (con pestañas) | 規 |
| `ficha/lore` | H Lectura | 巻 |

Orden de implementación: primero C, D, B y A (el núcleo), después F y E, y al final G y H.

---

## 11. Movimiento

- **Un gesto firma:** el círculo ensō se dibuja (0,9 s) cuando empieza el turno de un personaje y desaparece al terminar.
- Se permite movimiento que **responde a una acción**: abrir un cajón, confirmar un guardado, mover una ficha (150–250 ms).
- Sin entradas animadas en bloques, sin hover generalizado en tarjetas.
- Todo respeta `prefers-reduced-motion`.

---

## 12. Accesibilidad

- Contraste de texto normal de 4,5 : 1 o más (ver tablas de la sección 3).
- Foco visible con anillo dorado de 2 px.
- Áreas táctiles de 44 × 44 px.
- Kanji decorativos con `aria-hidden`; el nombre en español siempre está en el texto.
- El color nunca es el único portador de significado.
- Probar cada pantalla con teclado, a 200 % de zoom y a 360 px de ancho.

---

## 13. Presupuesto de rendimiento visual

Después de arreglar la lentitud del combate, el diseño no debe volver a añadir peso.

- Fuente kanji recortada: menos de 30 KB. Sin más fuentes nuevas.
- Cero imágenes de decoración: patrón, lavado, círculo y kintsugi se hacen con CSS o SVG en línea.
- Cero imágenes base64 en el código o en la base de datos.
- Ninguna pantalla debe tardar más de 2 segundos en ser usable con conexión normal.

---

## 14. Plan de implementación

Una rama (`diseno`), un paso por commit, y revisión en el navegador a 360, 768 y 1280 px entre pasos.

**Paso 1 · Tokens y fuente.** Añadir los tokens de 3.5, generar la fuente kanji (sección 4) y registrarla en `layout.tsx`. Cambiar el fondo de `body` y de `layout.tsx` a `canvas` y `themeColor` a `#121312`.
*Listo cuando:* `bg-canvas`, `text-gold-bright` y `font-kanji` funcionan y los kanji se dibujan.

**Paso 2 · Elementos firma.** Añadir el CSS de la sección 5 y crear los componentes `Hanko`, `Enso` y `Kintsugi`.
*Listo cuando:* una página de muestra solo para el GM (`/dm/estilos`) los enseña en todos sus estados.

**Paso 3 · Shells.** Reconstruir la navegación con el riel (escritorio) y las pestañas inferiores (móvil), usando los kanji de la sección 10.
*Listo cuando:* se puede navegar por toda la app en ambos modos y los nombres en español se leen en todas las pestañas.

**Paso 4 · Componentes base.** Botón, campo, chip, tabla, modal, barra de recurso, estados vacío, carga y error (sección 7) en `components/ui/`.
*Listo cuando:* la página de muestra los contiene y los usan los esqueletos.

**Paso 5 · Esqueletos.** Crear `PaginaLogin`, `PaginaPanel`, `PaginaCombate`, `PaginaFicha`, `PaginaCatalogo`, `PaginaListaDetalle`, `PaginaEditor` y `PaginaLectura` en `components/layout/`.
*Listo cuando:* cada esqueleto funciona con contenido de prueba en móvil y escritorio.

**Paso 6 · Oleadas.** Migrar las pantallas en el orden de la sección 10 (núcleo, luego F y E, luego G y H). En cada una: sustituir los hexadecimales sueltos por tokens y quitar `rounded-xl` o mayores.
*Listo cuando:* cada pantalla pasa la lista de la sección 16.

**Paso 7 · Limpieza.** Retirar `.kr-panel` y las esquinas ornamentales, reducir `uppercase tracking-widest` a menos de 15 usos, eliminar `rounded-2xl` y los restos de `font-mono` para cifras.
Medir el avance con:

```bash
grep -rhoE "#[0-9a-fA-F]{6}\b" app components --include=*.tsx --include=*.css | sort | uniq -c | sort -rn
```

*Listo cuando:* solo quedan los hexadecimales declarados en `globals.css` y `mobile.css`.

---

## 15. Decisiones pendientes

1. **Revisión de los kanji.** Que alguien que lea japonés confirme cada uno antes de publicar (especialmente 賽, 典, 転生 y 勝).
2. **Rejilla o tarjetas separadas.** La rejilla de líneas compartidas da el aspecto más original y moderno, pero en pantallas muy densas puede cansar. Alternativa: rejilla en paneles de control y fichas, y filas simples en el resto.
3. **Botón principal oro y carmesí reservado.** Se mantiene la decisión de la v1: oro para la acción principal, carmesí para lo irreversible.
4. **Retirar las esquinas ornamentales.** Se propone quitarlas del todo; si prefieres conservarlas, que sea solo en los paneles principales.
5. **Alcance del texto vertical.** Se propone solo para 幽玄 en el login y títulos cortos de lectura; ampliar su uso restaría legibilidad.

---

## 16. Lista de verificación por pantalla

- [ ] Usa uno de los 8 esqueletos y sus componentes, sin estructuras propias.
- [ ] Fondo en `canvas`; campos y tableros en `well`.
- [ ] Solo colores de la paleta, sin hexadecimales sueltos.
- [ ] 85 / 10 / 5 de tinta, oro y carmesí; el carmesí solo en lo irreversible, el combate y los sellos.
- [ ] Una sola acción principal visible.
- [ ] Kanji índice con `aria-hidden` y nombre en español presente.
- [ ] Cifras con `tabular-nums`; texto de juego de 13 px o más.
- [ ] Estados de carga, vacío y error definidos, con texto en español.
- [ ] Foco visible, teclado completo, botones de 44 px y sin desbordes a 360 px.
- [ ] Sin imágenes base64 ni imágenes de decoración.
- [ ] Movimiento solo el círculo ensō o respuestas a una acción.

---

## 17. Reglas para asistentes de código

- Antes de crear un estilo, busca si ya existe en `globals.css`, `mobile.css`, `components/ui/` o `components/layout/`.
- Toda pantalla nueva parte de uno de los 8 esqueletos. Si ninguno encaja, propón una entrada en la sección 15.
- No introduzcas colores hexadecimales nuevos ni fuentes nuevas.
- No uses radios de más de 2 px en paneles y controles, ni sombras grises.
- No pongas texto `#ad0013` sobre oscuro ni texto oscuro sobre carmesí.
- Un kanji nunca se usa solo ni sin `aria-hidden`; el sello solo para aprobado, victoria o finalizado.
- No añadas animaciones nuevas fuera de la sección 11.
- Textos visibles en español, con mayúscula inicial y verbos claros.
