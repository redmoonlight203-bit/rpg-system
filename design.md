# design.md — Sistema de diseño de Yugen Realm

Versión 1.0 · 10 de noviembre de 2026
Paleta base: tinta `#121312` · oro `#a67d43` · carmesí `#ad0013`

> **Para quien edite la app (personas o asistentes de código):** lee este archivo completo antes de tocar cualquier pantalla. Si un color, tamaño o componente no está aquí, no lo inventes: usa el más parecido de este documento o añade una entrada nueva en la sección 14.

---

## 1. Estado actual (verificado en el código)

Esto no se parte de cero. Ya existe una base sólida que este documento ordena y completa.

**Lo que ya está bien**

- `app/globals.css` ya instala la paleta. Redefine la escala de Tailwind v4 para que las clases existentes cambien de aspecto sin tocar cada archivo: `neutral` → negro cálido, `red` → carmesí, `amber` y `yellow` → dorado, `orange` → cobre, `purple`, `indigo` y `rose` → vino, `cyan` → champán, `emerald` → jade.
- Existen componentes de estilo reutilizables: `.kr-panel` (tarjeta con borde dorado y esquinas ornamentales), `.kr-divider` (divisor con rombo), `.kr-ambient` (fondo con resplandor carmesí), y brillos `.glow-blood`, `.glow-gold`, `.glow-cyan`, `.glow-emerald`.
- Foco visible dorado (`:focus-visible`), selección carmesí, scrollbar fina, `color-scheme: dark`.
- Fuentes locales: Noto Sans KR (interfaz) y Noto Serif KR (títulos).
- `app/mobile.css` ya resuelve navegación móvil, botones táctiles de 44 px y temas `forja-theme` y `battle-theme`.

**Lo que está desordenado**

| Hallazgo | Dato |
|---|---|
| Los nombres semánticos `crimson`, `gold` e `ink` existen pero no se usan | 0 usos de `bg-ink`, `text-gold` y `border-crimson` en `app/` y `components/` |
| El fondo de página no es la tinta de la paleta | `body` usa `#050505` y hay 65 usos de `bg-black` |
| Colores hexadecimales sueltos dentro de componentes | decenas, p. ej. `#11120e`, `#090a08`, `#e2c292`, `#f1d5a7`, `#c8a66e`, `#38231b`, y hasta un lavanda `#d5b3ff` que no pertenece a la paleta |
| Radios mezclados | 71 `rounded-lg`, 51 `rounded-xl`, 1 `rounded-2xl` |
| Mayúsculas con tracking amplio en exceso | 57 `uppercase` y 22 `tracking-widest` |
| `font-mono` está redefinida como sans, pero se usa 101 veces como si fuera monoespaciada | los números no alinean |

**Objetivo de este documento:** que todas las pantallas se vean como un solo producto, con reglas claras y una migración por oleadas sin reescribir la app.

---

## 2. Identidad

**Yugen Realm es un santuario de tinta negra con detalles de oro apagado y sangre.** Lujo sobrio, no ostentoso: mucho negro, el oro estructura y ordena, el carmesí aparece poco y siempre significa algo.

Principios, en orden de prioridad:

1. **La tinta manda.** Alrededor del 80 % de cualquier pantalla es negro cálido.
2. **El oro estructura.** Bordes, títulos, iconos, cifras y elementos seleccionados.
3. **El carmesí es escaso y significa algo.** Acciones irreversibles, combate y peligro. Si aparece en todas partes, deja de funcionar.
4. **Un momento memorable por pantalla.** Una sola cosa llama la atención (la ficha activa, el botón de atacar, la recompensa). Todo lo demás se mantiene tranquilo.
5. **El dato gana al adorno.** Ningún ornamento tapa información de juego.
6. **Un solo producto.** El GM y el jugador usan los mismos componentes, colores y tipografía.

---

## 3. Paleta

### 3.1 Núcleo

| Nombre | Hex | Token | Función |
|---|---|---|---|
| Tinta | `#121312` | `ink` (= `neutral-950`) | Fondo de página, base de todo |
| Oro | `#a67d43` | `gold` (= `amber-500`) | Estructura, acento, acción principal |
| Carmesí | `#ad0013` | `crimson` (= `red-700`) | Acción irreversible, combate, peligro |

### 3.2 Superficies (de más profunda a más elevada)

| Nivel | Hex | Token propuesto | Uso |
|---|---|---|---|
| Pozo | `#0a0b0a` | `well` | Campos de texto, tablero, mapas, zonas hundidas (hoy `bg-black`) |
| Lienzo | `#121312` | `canvas` (= `ink`) | Fondo de página |
| Elevada | `#1a1b19` | `raised` (= `neutral-900`) | Tarjetas y paneles |
| Superpuesta | `#262725` | `overlay` (= `neutral-800`) | Menús, modales, tooltips |

### 3.3 Líneas

| Uso | Valor | Token propuesto |
|---|---|---|
| Borde sutil (paneles) | `rgb(166 125 67 / 0.22)` | `line` |
| Borde fuerte (seleccionado) | `rgb(166 125 67 / 0.5)` | `line-strong` |
| Borde de control inactivo | `#3a3b38` (`neutral-700`) | — |

### 3.4 Texto

| Uso | Hex | Contraste sobre `#121312` | Token |
|---|---|---|---|
| Texto principal | `#e9e4d7` | 14,7 : 1 | `text` |
| Texto secundario | `#a9aaa5` | 8,0 : 1 | `text-muted` |
| Texto terciario (solo apoyo) | `#82837e` | 4,9 : 1 | `neutral-500` |
| Títulos y cifras destacadas | `#f1d5a7` | 13,1 : 1 | `gold-bright` |
| Etiquetas doradas | `#e2c292` | 11,0 : 1 | `gold-soft` |
| Oro de acento (texto grande o iconos) | `#a67d43` | 5,0 : 1 | `gold` |

### 3.5 Estados

| Estado | Relleno | Texto sobre fondo oscuro | Notas |
|---|---|---|---|
| Peligro / irreversible | `crimson` `#ad0013` con texto blanco (7,5 : 1) | `#f0606c` (`red-400`, 5,9 : 1) | Nunca usar `#ad0013` como texto sobre tinta |
| Éxito / aprobado | `emerald-700` | `#62b393` (`emerald-400`, 7,4 : 1) | Jade apagado, solo para éxito |
| Información | `cyan-800` | `cyan-300` (champán) | Detalles claros y ayudas |
| Aviso | `orange-700` | `orange-400` (cobre) | Verificar contraste al aplicarlo |

### 3.6 Combinaciones prohibidas (contraste insuficiente)

| Combinación | Contraste | Qué hacer |
|---|---|---|
| Texto `#ad0013` sobre tinta | 2,5 : 1 | Usar `red-400` para texto, o crimson solo como relleno |
| Texto tinta sobre `#ad0013` | 2,5 : 1 | Usar texto blanco o `gold-bright` |
| Carmesí sobre oro | 2,0 : 1 | No juntarlos sin un borde tinta entre ambos |

> **Nota sobre la imagen de referencia:** el cartel usa texto oscuro sobre el bloque rojo. Es atractivo en tamaño de póster, pero no cumple accesibilidad para texto de interfaz. En la app, el texto sobre carmesí es blanco.

### 3.7 Tokens que hay que añadir a `globals.css`

Añadir dentro del bloque `@theme` existente. Tailwind v4 genera automáticamente clases como `bg-canvas`, `text-gold-bright` o `border-line`.

```css
@theme {
  /* superficies */
  --color-well: #0a0b0a;
  --color-canvas: #121312;
  --color-raised: #1a1b19;
  --color-overlay: #262725;

  /* oro */
  --color-gold-soft: #e2c292;
  --color-gold-bright: #f1d5a7;
  --color-ember: #38231b;          /* fondo de elemento activo (pestañas, menú móvil) */

  /* líneas */
  --color-line: rgb(166 125 67 / 0.22);
  --color-line-strong: rgb(166 125 67 / 0.5);

  /* texto */
  --color-text: #e9e4d7;
  --color-text-muted: #a9aaa5;
  --color-danger-text: #f0606c;
  --color-success-text: #62b393;
}
```

---

## 4. Tipografía

Se mantienen las fuentes actuales; el cambio es usarlas con reglas.

| Rol | Fuente | Tamaño | Peso | Interlineado | Clases orientativas |
|---|---|---|---|---|---|
| Título de pantalla | Noto Serif KR | 28–32 px | 700 | 1,2 | `font-serif text-3xl font-bold text-gold-bright` |
| Título de sección | Noto Serif KR | 20–22 px | 600 | 1,3 | `font-serif text-xl font-semibold text-gold-soft` |
| Subtítulo de panel | Noto Sans KR | 16 px | 600 | 1,4 | `text-base font-semibold text-text` |
| Cuerpo | Noto Sans KR | 14–15 px | 400 | 1,55 | `text-sm text-text` |
| Apoyo | Noto Sans KR | 13 px | 400 | 1,5 | `text-xs text-text-muted` |
| Cifras de juego | Noto Sans KR | según contexto | 600 | 1,2 | `tabular-nums font-semibold` |

Reglas:

- Tamaño mínimo de texto legible: **13 px**. Nada de texto de 10 u 11 px para información de juego.
- Longitud de línea máxima: unos 70 caracteres en bloques de lectura (lore, descripciones, ayuda).
- Las cifras (vida, daño, oro, experiencia) llevan `tabular-nums` para que alineen en columnas. **No** usar `font-mono` para esto: en este proyecto es la misma fuente sans.
- Mayúsculas con tracking amplio (`uppercase tracking-widest`): solo para etiquetas de estado muy cortas (máximo 12 caracteres) como `VIVO`, `ACTIVO`. Para el resto, usar mayúscula inicial normal. Objetivo: bajar de 57 a menos de 15 usos.
- Un título nunca resalta una sola palabra con otro color. Todo el título lleva el mismo tratamiento.
- Los textos de la interfaz se escriben en español, con verbos claros («Guardar cambios», no «Enviar») y el mismo nombre para la misma acción en todo el flujo.

---

## 5. Espaciado, radios, bordes y elevación

**Espaciado:** escala de 4 px (`1` = 4 px). Padding interno de panel: 16 px en móvil, 20–24 px en escritorio. Separación entre paneles: 16 px. Separación entre secciones: 32 px.

**Radios (uno por nivel jerárquico):**

| Elemento | Radio | Clase |
|---|---|---|
| Panel principal | 0 + esquinas doradas ornamentales | `.kr-panel` |
| Controles (botones, campos, selects) | 8 px | `rounded-lg` |
| Tarjetas secundarias dentro de un panel | 12 px | `rounded-xl` |
| Chips, avatares, indicadores | pastilla | `rounded-full` |
| Prohibido | 16 px o más | `rounded-2xl` y mayores |

**Bordes:** 1 px siempre. El borde dorado sutil (`line`) es el normal; el fuerte (`line-strong`) indica selección.

**Elevación:** no se usan sombras grises genéricas. La profundidad se comunica con el nivel de superficie (sección 3.2) y con borde. Los brillos solo marcan estado:

- `glow-gold`: elemento seleccionado o activo.
- `glow-blood`: objetivo de un ataque o peligro inminente.
- `glow-emerald`: confirmación (solo unos segundos).

---

## 6. Componentes base

Crear una carpeta `components/ui/` con una función `cn()` (ya existen `clsx` y `tailwind-merge` como dependencias) y estos componentes. Todas las pantallas deben usarlos en lugar de repetir clases.

### 6.1 Botón

| Variante | Aspecto | Cuándo |
|---|---|---|
| Principal | Relleno oro `#a67d43`, texto tinta, hover `amber-400` | La acción principal de la pantalla (una sola por vista) |
| Secundario | Borde oro, texto `gold-soft`, fondo transparente | Acciones alternativas |
| Fantasma | Solo texto `text-muted`, hover `text` | Acciones de bajo peso |
| Destructivo | Relleno carmesí, texto blanco | Atacar, terminar, borrar, confirmar algo irreversible |

Estados: foco anillo dorado de 2 px (ya existe); deshabilitado al 45 % de opacidad, sin hover y con `cursor-not-allowed`; cargando con indicador y texto «Guardando…»; altura mínima 44 px en móvil.

> **Por qué el principal es oro y no carmesí:** así el carmesí queda reservado para lo irreversible y el combate, y mantiene su fuerza. Es una decisión a confirmar (sección 14).

### 6.2 Panel / tarjeta

- Contenedor principal: `.kr-panel`.
- Cabecera: título de sección en serif dorado, acciones a la derecha, `.kr-divider` debajo cuando haya varios bloques.
- Panel seleccionado: borde `line-strong` + `glow-gold`.
- El efecto de hover carmesí de `.kr-panel` se aplica **solo** a paneles clicables. Los paneles informativos no deben reaccionar al ratón.

### 6.3 Campo de formulario

- Fondo `well`, borde `neutral-700`, texto `text`, marcador `text-muted`.
- Foco: borde oro + anillo dorado.
- Error: borde `red-400`, mensaje debajo en `danger-text` que explica qué falló y cómo corregirlo. Nunca solo color: añadir icono o texto.
- La etiqueta va siempre encima del campo, nunca como marcador de posición.

### 6.4 Pestañas

Activa: texto `gold-bright`, fondo `ember`, línea inferior oro de 2 px. Inactiva: `text-muted`. En móvil se mantienen los estilos de `mobile.css` (activa con `#f1d5a7` sobre `#38231b`).

### 6.5 Chip / insignia

Estilo tonal: fondo del color al 15 %, borde al 30 %, texto en la versión clara. Estados de personaje y encuentro:

| Estado | Color |
|---|---|
| Activo, en curso | oro |
| Aprobado, vivo | jade |
| Pendiente | champán |
| Peligro, caído | carmesí / `red-400` |

Todo chip lleva texto; nunca depende solo del color.

### 6.6 Tabla

Cabecera con texto `gold-soft` sobre `raised`; filas separadas por `line`; fila al pasar el ratón con `ember` al 40 %; cifras alineadas a la derecha con `tabular-nums`. En móvil, se transforma en lista de tarjetas.

### 6.7 Modal

Fondo `overlay`, borde `line-strong`, fondo detrás `rgb(0 0 0 / 0.6)`. Título serif. Botón de cierre de 44 px. Las acciones destructivas piden confirmación con texto claro de lo que se pierde.

### 6.8 Barras de recurso (vida, fatiga y similares)

Fondo `well`, etiqueta y cifra siempre visibles junto a la barra.

| Recurso | Color propuesto |
|---|---|
| Vida | carmesí `red-500` |
| Fatiga | cobre `orange-400` |
| Recursos especiales | champán `cyan-300` |
| Experiencia | oro `gold` |

Ajusta esta tabla a los recursos reales del sistema de juego.

### 6.9 Estados vacíos, de carga y de error

- **Vacío:** una frase que invite a actuar («Aún no tienes habilidades. Crea la primera») y el botón principal.
- **Carga:** esqueleto con `raised` y pulso suave; nunca pantalla en blanco.
- **Error:** explica qué pasó y cómo seguir, con botón «Reintentar». Sin tono de disculpa y sin mensajes técnicos crudos.

---

## 7. Combate (la pantalla estrella)

Es donde se gasta el «momento memorable» del producto.

**Tablero**

- Fondo del tablero: `well`; casillas con borde `line` muy tenue.
- Aliados: oro / champán. Enemigos: carmesí. Neutrales: `neutral-400`.
- Ficha activa: `glow-gold` y borde `gold-bright`.
- Objetivo de ataque: `glow-blood` y borde `red-400`.
- Casillas alcanzables al mover: relleno champán al 15 %.
- Alcance de habilidad: relleno oro al 20 %.
- Zona de área peligrosa: relleno carmesí al 25 %.

**Interfaz**

- Panel de acciones: un solo botón destacado por turno (el de la acción seleccionada, destructivo carmesí si compromete el turno).
- Alerta de turno (`AlertaTurnoJugador`): pulso carmesí breve; es el único movimiento no pedido por el usuario en la pantalla.
- Registro de combate: texto `text-muted`, la línea más reciente en `text`.
- Retratos: borde del color del bando; nunca dejar la imagen sin marco.
- Todo botón táctil mide 44 px como mínimo (ya lo garantiza `mobile.css`).

**Rendimiento visual:** las imágenes de combatientes deben ser URLs, no base64 (ver el plan maestro, paso 1.2).

---

## 8. Estructura de pantallas

### 8.1 Plantilla de página

```
┌──────────────────────────────────────────────────────┐
│ Título de pantalla (serif, dorado)      [Acción]     │
│ Subtítulo breve (texto secundario)                   │
│ ──────────────── ◆ ─────────────────  (.kr-divider)  │
│                                                      │
│ ┌─ Panel ────────────┐  ┌─ Panel ─────────────────┐  │
│ │ contenido          │  │ contenido               │  │
│ └────────────────────┘  └─────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

- Alineación: contenido a la izquierda; nunca texto centrado en bloques largos. Centrado solo en login y estados vacíos.
- Ancho máximo de lectura: 1200 px; en combate, ancho completo.
- Una sola acción principal por pantalla, arriba a la derecha.

### 8.2 Estructuras por rol

- **GM:** barra lateral (`gm-shell`, `gm-sidebar`, `gm-content`). Grupos propuestos: Sesión, Mundo, Economía, Avanzado.
- **Jugador:** cabecera superior en escritorio y pestañas inferiores en móvil (`mobile-navigation`, `player-mobile-content`). Grupos propuestos: Mi personaje, En sesión, Mundo, Cuenta.
- La navegación activa se marca igual en ambos: texto `gold-bright`, fondo `ember`.

---

## 9. Movimiento

- Sin entradas animadas generalizadas ni hover en todas las tarjetas.
- Se permite movimiento que **responde a una acción**: abrir un modal, expandir un panel, confirmar un guardado, mover una ficha.
- Duración: 150–250 ms, curva suave. Los brillos se apagan solos tras unos segundos.
- Respetar siempre `prefers-reduced-motion` (ya existe en `mobile.css`; extenderlo a todo componente animado).

---

## 10. Accesibilidad (suelo mínimo)

- Contraste de texto normal: 4,5 : 1 o más (ver tablas de la sección 3).
- Foco visible en todo elemento interactivo (anillo dorado, ya implementado).
- Área táctil mínima de 44 × 44 px.
- El color nunca es el único portador de significado: siempre texto, forma o icono.
- Iconos sin texto llevan `aria-label` en español.
- Probar cada pantalla con teclado y a 200 % de zoom.

---

## 11. Aplicación por pantallas

Los propósitos de cada ruta se infieren por su nombre; corrige esta tabla si alguno no coincide con su uso real.

### Oleada 1 — Núcleo (primero)

| Pantalla | Uso del color y componente clave |
|---|---|
| `login` | Panel centrado sobre `.kr-ambient`; botón principal oro; el carmesí no aparece salvo en errores |
| `dm/panel` | Tarjetas de resumen en `kr-panel`; una cifra o alerta destacada en `gold-bright`; atajos en secundario |
| `dm/combate` | Sección 7 completa; botones destructivos carmesí; barra de acciones fija |
| `dm/tablero` | Mismo sistema de casillas que el combate; selección con `glow-gold` |
| `dm/personajes` | Tabla con chips de estado; acciones por fila en fantasma |
| `dm/recompensas` | Aprobar = botón principal oro; rechazar = secundario; avisos con chips jade |
| `ficha/creacion` | Pasos con pestañas; progreso en barra dorada; selectores visuales con borde `line-strong` al elegir |
| `ficha/personaje` | Barras de recurso (6.8); título del personaje en serif dorado |
| `ficha/habilidades` | Tarjetas con borde del tipo de habilidad; coste en `tabular-nums` |
| `ficha/equipamiento` e `ficha/inventario` | Cuadrículas con casillas `raised`, rareza indicada con borde y etiqueta, no solo color |
| `ficha/combate` | Igual que el combate del GM, con acciones grandes para móvil |

### Oleada 2 — Apoyo

`dm/party`, `dm/forja`, `dm/mercado`, `dm/experiencia`, `ficha/party`, `ficha/tiradas`, `ficha/mapas`, `ficha/tienda`, `ficha/experiencia`.

Reglas: paneles `kr-panel`, tablas del apartado 6.6, precios y cantidades con `tabular-nums` en oro, botón de compra o confirmación en principal oro.

### Oleada 3 — Más adelante

`dm/arbol`, `dm/reglas`, `dm/deudas`, `dm/tienda-almas`, `ficha/alma`, `ficha/tienda-almas`, `ficha/arena`, `ficha/codex`, `ficha/lore`, `ficha/logros`, `ficha/deudas`, `ficha/personajes`.

Reglas: mismos componentes base. Las pantallas de lectura (lore, códice) usan serif en cuerpo, interlineado 1,7 y línea de unos 65 caracteres.

---

## 12. Plan de migración paso a paso

Hacerlo en una rama (`estabilizacion` o `diseno`), un paso por commit, y revisar el resultado en el navegador entre pasos.

**Paso 1 — Tokens.** Añadir el bloque de la sección 3.7 a `globals.css`.
*Listo cuando:* `bg-canvas`, `text-gold-bright` y `border-line` funcionan en un componente de prueba.

**Paso 2 — Fondo y capas.** Cambiar el fondo de `body` de `#050505` a `canvas`; en `layout.tsx` cambiar `bg-black` por `bg-canvas` y ajustar `themeColor` a `#121312`. Reservar `bg-black` y `well` para campos, tableros y zonas hundidas.
*Listo cuando:* la página se ve en tinta `#121312` y los campos quedan visiblemente más oscuros.

**Paso 3 — Eliminar colores sueltos.** Reemplazar cada hexadecimal en componentes por un token:

| Hex suelto | Reemplazo |
|---|---|
| `#e2c292`, `#d2ac6d`, `#d1aa67`, `#c8a66e` | `gold-soft` |
| `#f1d5a7`, `#ffe0bc` | `gold-bright` |
| `#38231b`, `#211b12` | `ember` |
| `#11120e`, `#11130e`, `#090a08`, `#050505` | `well` o `canvas` según el uso |
| `#171710` | `raised` |
| `#d5b3ff` (lavanda) y otros fuera de paleta | `cyan-300` (champán) o `gold-soft` |
| `#b9cb9a` (verde) | `emerald-400` |

Medir el avance con:

```bash
grep -rhoE "#[0-9a-fA-F]{6}\b" app components --include=*.tsx --include=*.css | sort | uniq -c | sort -rn
```

*Listo cuando:* quedan solo los hexadecimales declarados en `globals.css` y en `mobile.css`.

**Paso 4 — Componentes base.** Crear `components/ui/` con Button, Panel, Field, Badge, Tabs, Modal, EmptyState y ResourceBar, siguiendo la sección 6.
*Listo cuando:* hay una página de muestra (`/dm/estilos`, solo para el GM) con todos los componentes en todos sus estados.

**Paso 5 — Oleada 1.** Migrar `login`, los dos shells (GM y jugador), combate del GM y del jugador, y las pantallas núcleo de la sección 11.
*Listo cuando:* cada pantalla pasa la lista de verificación de la sección 13.

**Paso 6 — Oleadas 2 y 3.** Repetir con el resto, en el orden de la sección 11.

**Paso 7 — Limpieza.** Reducir `uppercase tracking-widest` a menos de 15 usos, eliminar `rounded-2xl`, quitar sombras grises sueltas y reemplazar `font-mono` por `tabular-nums` donde sea para cifras.
*Listo cuando:* los conteos de la sección 1 cumplen los objetivos.

---

## 13. Lista de verificación por pantalla

- [ ] Fondo de página en `canvas`; campos y tableros en `well`.
- [ ] Solo colores de la paleta, ninguno suelto.
- [ ] Una sola acción principal visible; carmesí solo en acciones irreversibles o de combate.
- [ ] Texto de interfaz de 13 px o más; contraste de 4,5 : 1 o más.
- [ ] Cifras con `tabular-nums`.
- [ ] Estados de carga, vacío y error definidos, con texto en español.
- [ ] Foco visible y navegación por teclado.
- [ ] Botones táctiles de 44 px y sin desbordes a 360 px de ancho.
- [ ] Ninguna información depende solo del color.
- [ ] Sin imágenes base64 incrustadas.

---

## 14. Decisiones pendientes de confirmar

1. **Botón principal oro o carmesí.** Este documento propone oro para la acción principal y carmesí para lo irreversible. La alternativa es carmesí como principal en toda la app; tendría más impacto visual, pero perdería su significado de peligro.
2. **Lienzo `#121312` o más oscuro.** Hoy la página usa `#050505`. Se propone `#121312` para respetar la paleta y reservar los negros más profundos para los pozos.
3. **Esquinas ornamentales en todos los paneles o solo en los principales.** Hoy `.kr-panel` las pone siempre. Se propone mantenerlas en paneles principales y usar borde simple en tarjetas anidadas, para que el adorno no compita con los datos.

---

## 15. Reglas para asistentes de código

- Antes de crear un estilo, busca si ya existe en `globals.css`, `mobile.css` o `components/ui/`.
- No introduzcas colores hexadecimales nuevos: usa los tokens de la sección 3.
- No uses `rounded-2xl` ni mayores, ni sombras grises genéricas.
- No pongas texto `#ad0013` sobre fondos oscuros ni texto oscuro sobre carmesí.
- Todo botón nuevo usa el componente Button; todo contenedor principal usa `.kr-panel`.
- Escribe los textos visibles en español, con mayúscula inicial y verbos claros.
- Si una pantalla necesita algo que este documento no cubre, propón la entrada nueva en la sección 14 en lugar de improvisar.
