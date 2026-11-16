> **Estado al 16-11-2026:** plan recuperado de una sesión local y en ejecución. Hecho: Fase 0 (`design.md` v3; v2 archivada en `design-v2.md`), Fase 1 (tokens v3, Cinzel, escena, `Runa`, `Marco`, `BarraVital`, `Medallon`, `Sello` en `components/ui/Juego.tsx` y `app/yugen-juego.css`) y la primera parte de la Fase 2 (hub del jugador, carta de héroe y vitales). Decisiones: Yugen con runas e imágenes aportadas por el propietario (lista en `public/arte/README.md`), paleta sin muestras previas, `src/app` eliminado, orden ficha → GM → login. Pendiente de la Fase 2: habilidades (constelación), experiencia con celebración, tiradas con `Dado3D`.

# Plan: rediseño de Yugen como juego de fantasía (jugador + GM)

## Context

La app (Next.js 16 + React 19 + Tailwind v4, Supabase) funciona, pero se ve como un panel administrativo: tarjetas planas, poca identidad y casi nada de respuesta visual. Quieres que se sienta como un juego: más dinámica, interactiva y fantasiosa, con prioridad en la ficha del jugador, la Forja/panel del GM y el login.

Decisiones tomadas (respuestas tuyas):
- **Reinventar el estilo.** Se abandona la dirección sobria de `design.md` v2. Se reemplaza por una v3.
- **Prioridad:** Ficha del jugador (`app/ficha`), GM Forja y panel (`app/dm/forja`, `app/dm/page.tsx`), Login (`app/login`).
- **Arte:** puedes aportar o generar ilustraciones, texturas e iconos.

## Hallazgos de la exploración (solo lectura)

- **Hay dos carpetas `app`.** La real es `app/` (raíz). `src/app/` contiene solo la plantilla por defecto de create-next-app (`src/app/layout.tsx` aún dice "Create Next App"). Conviene eliminarla en un paso aparte; no se toca en este plan.
- **Sistema de estilos:** tokens en `app/globals.css` (bloque `@theme`), más `app/mobile.css` y `app/yugen-design.css`. Las pantallas usan CSS propio por sección: `app/dm/gm.css`, `app/ficha/jugador.css`, `app/dm/forja/forja.css`, `app/dm/combate/*.css`, `components/*.css`.
- **Shells:** `app/dm/layout.tsx` (GM) usa `Riel` + `NavegacionMovil` + `MarcoRuta`. `app/ficha/layout.tsx` (jugador) usa `AccesoReencarnado` + `AlertaTurnoJugador`. El riel está en `components/layout/Riel.tsx`.
- **Componentes base reutilizables:** `components/ui/` (Button, Panel, Badge, Modal, Tabs, ResourceBar, EmptyState, Field). Hoy son muy finos; ahí está la mayor palanca.
- **Efectos que ya existen y se pueden reutilizar:** `components/Dado3D.tsx` (d20 3D en CSS, sin librerías), `components/EfectosCombate.tsx` + `lib/vfx` (sprites de `public/vfx/`), `components/AnimacionesArmas.tsx`, `components/FichaAnimada.tsx`, `components/FondoMapaProcedural.tsx`, `components/LogoYugen.tsx`, `components/PortadaYunque.tsx`.
- **Restricciones de `design.md` v2 que hay que superar explícitamente:** §1 (sin ornamentos, sin kanji decorativos), §11 (un solo gesto de movimiento, sin animaciones nuevas) y §17 (sin colores ni fuentes nuevos). Esto es lo que hay que reescribir en v3.
- **Presupuesto de rendimiento (§13):** el combate ya fue optimizado. Cualquier efecto nuevo debe usar CSS/`transform`/`opacity` o canvas puntual, sin librerías de animación pesadas.

## Enfoque recomendado

### Fase 0 · Nueva dirección visual (`design.md` v3)
- Escribir `design.md` v3 que sustituya a v2 (conservando v2 como `design-v2.md`). Define: concepto de fantasía de juego, paleta nueva, tipografía de títulos, marcos y elementos firma, movimiento permitido y reglas para asistentes.
- Propuesta de partida (a confirmar con una muestra visual antes de implementar): fondo noche profunda tipo pizarra-violeta, acentos de oro envejecido y pergamino, carmesí para peligro/crítico, y una fuente display de fantasía para títulos (por ejemplo Cinzel o similar, con licencia OFL) junto a Noto Sans KR para cuerpo.
- Mantener la función de los colores de estado (vida, fatiga, experiencia) para no romper la lógica de las barras.

### Fase 1 · Tokens y primitivas
- Reemplazar el bloque `@theme` de `app/globals.css` por los tokens v3. Los nombres semánticos (`text`, `text-muted`, `gold`, `crimson`, `canvas`, `raised`, `line`…) se conservan para que las pantallas no se rompan; solo cambian los valores.
- Añadir en `components/ui/`: `Marco` (panel con borde ornamentado en SVG, esquinas y filigrana sutil), `BarraVital` (barra animada con brillo y cifra en `tabular-nums`), `TarjetaRecurso`, `Insignia` de rareza y `Sello` para aprobado/victoria.
- Rehacer `Button` con estados de presión (escala 0.97), brillo al foco y variantes: principal, secundaria, peligro.
- Todas las animaciones van en CSS con `prefers-reduced-motion` respetado.

### Fase 2 · Jugador: ficha (`app/ficha/**`)
- `app/ficha/page.tsx` y `FichaVital.tsx`: el personaje como "carta de héroe" con retrato, barras de vida/energía animadas y nivel con brillo al subir.
- Interacción: tirar dados con `Dado3D` al pulsar una habilidad o un atributo, con resultado animado.
- `ConstelacionHabilidades.tsx` / `ArbolHabilidades.tsx`: nodos con estados visuales (bloqueado, disponible, desbloqueado) y conexiones iluminadas.
- `jugador.css` se sustituye por hojas por sección que usen los nuevos tokens.

### Fase 3 · GM: Forja y panel (`app/dm/forja`, `app/dm/page.tsx`, `app/dm/layout.tsx`)
- `Riel` y header del GM con marco de "trono de Kuroi": iconos de sección más expresivos y estado activo con marca de runa.
- `ForjaOperacion.tsx`: mesa de forja con pasos visibles y feedback al crear un objeto (pulso de luz, sello al finalizar).
- Panel `page.tsx`: tarjetas de resumen con cifras grandes y marcos, en lugar de listas planas.

### Fase 4 · Login y entrada (`app/login/page.tsx`, `app/page.tsx`)
- Pantalla de entrada con la marca `LogoYugen` / `PortadaYunque` como escena: fondo con capas de profundidad (parallax suave sin librerías), título display y transición única al entrar.
- La página raíz `app/page.tsx` es solo una pantalla de carga; se le da el mismo fondo para que no haya salto visual.

### Fase 5 · Arte
- Carpeta `public/arte/` con los assets que aportes: fondos, marcos, iconos y retratos en WebP, cargados con `next/image` y tamaños fijos.
- Cada asset se documenta en `public/arte/README.md` (origen, licencia, uso).

## Documento de cambios: de formulario a juego

Diagnóstico: hoy la app es una colección de listas, tablas y formularios (la Forja tiene 14 campos y 12 botones en una sola pantalla; el jugador ve datos en texto plano con barras finas). Un juego se reconoce porque **responde**, **celebra** y **tiene un mundo**. Cada cambio sigue una de estas tres ideas:

1. **Mundo:** cada pantalla es una escena con marco, luz y nombre propio, no una página con tarjetas.
2. **Respuesta:** cada acción tiene un efecto visible (pulsar, tirar, subir de nivel, crear).
3. **Progreso:** los números se convierten en avance (barras que se llenan, nodos que se iluminan, sellos al completar).

### Cambios por pantalla

| Pantalla | Hoy | Cambio para que parezca juego | Prioridad |
|---|---|---|---|
| **Entrada / login** (`app/login/page.tsx`) | Formulario de email y contraseña | Escena: Kuroi en su vacío con el logo, el formulario aparece dentro de un `Marco` tras una transición corta; el botón principal dice «Entrar al mundo». | Alta |
| **Inicio del jugador** (`app/ficha/page.tsx`) | Lista de enlaces con descripciones | Mapa de hub: 4–5 «lugares» en tarjetas con marco y halo, cada una con icono grande y un indicador de novedad (punto arcano). | Alta |
| **Ficha del personaje** (`app/ficha/personaje`, `components/FichaVital.tsx`, `app/ficha/jugador.css`) | Vida como `<meter>`, barras finas, datos en filas | Carta de héroe: retrato en `Marco`, vida con `BarraVital` (brillo y cambio animado), atributos como medallones con cifra grande, PH y fatiga como orbes. Tirar una habilidad abre `Dado3D`. | Alta |
| **Habilidades** (`app/ficha/habilidades`, `ArbolHabilidades.tsx`, `ConstelacionHabilidades.tsx`) | Árbol de nodos | Constelación: nodos bloqueados en gris, disponibles pulsando, desbloqueados con halo arcano; al desbloquear, la línea se ilumina. | Alta |
| **Experiencia** (`app/ficha/experiencia`) | Tabla o formulario de subida | Barra de experiencia que se llena; subir de nivel muestra un momento de celebración (destello, `Sello`, número de nivel grande). | Alta |
| **Creación de personaje** (`app/ficha/creacion`) | Pasos con formulario | Ceremonia en pasos: una escena por paso con Kuroi comentando y un `Sello` al terminar. | Media |
| **Combate** (`app/ficha/combate`, `TableroCombate.tsx`) | Tablero funcional | Tablero con halo en el turno activo (círculo ensō), efectos de impacto existentes (`EfectosCombate.tsx`) y registro en cajón. Solo ajustes de estilo, sin tocar la lógica. | Media |
| **Inventario y tienda** (`app/ficha/inventario`, `Tienda.tsx`, `InventarioReencarnado.tsx`) | Listas | Cuadrícula de objetos con marco de rareza; al comprar, el objeto «vuela» al inventario (transición de 300 ms). | Media |
| **Panel del GM** (`app/dm/page.tsx`, `app/dm/layout.tsx`) | Enlaces en lista | Mesa de Kuroi: tarjetas grandes con cifras y el riel como trono; la sección activa se marca con runa. | Alta |
| **Forja** (`app/dm/forja/page.tsx`, `ForjaOperacion.tsx`) | Formulario largo de 14 campos | Taller por pasos: cada paso es una «mesa» con un icono grande; los campos se agrupan en tarjetas con marco; al finalizar, sello y destello. | Alta |
| **Personajes del GM** (`app/dm/personajes`) | Tablas y 24 botones | Galería de tarjetas de personaje con retrato y barra de vida; acciones agrupadas en un menú de círculo o en barra flotante. | Media |
| **Tienda del GM** (`app/dm/mercado`, `app/dm/tienda-almas`) | Listas | Escaparate con marco por objeto y precio con icono de moneda. | Baja |

### Patrones que se repiten (aplicar en todas)

- **Escenas:** cada pantalla tiene un fondo de capas (vacío, halo arcano y textura de pergamino), sin cambiar el contenido.
- **Botones:** la acción principal en oro con escala al pulsar (ya en `Button`); la acción destructiva en carmesí con confirmación en `Modal`.
- **Formularios:** agrupar campos en `Marco` con título; el paso o la sección activa se marca con runa; el guardado muestra un sello.
- **Números:** cifras grandes en Noto Serif con `tabular-nums`; cambios de valor animan la barra o la cifra.
- **Feedback:** cada acción confirmada tiene una respuesta visual corta (120–250 ms) y los logros, una celebración (400–900 ms, una sola vez).
- **Lenguaje:** los textos de vacío, carga y error hablan con la voz de Kuroi («Aún no hay nada aquí. Crea algo en la Forja.»).

### Qué NO cambia

- La lógica de datos, Supabase, combate, reglas y permisos de rol.
- Los nombres de las rutas y el nombre Yugen.

### Orden sugerido

1. Primitivas y fondos de escena (Fase 1, ya en progreso).
2. Ficha del jugador y hub (`app/ficha`), que es la pantalla más vista por los jugadores.
3. Panel y Forja del GM.
4. Login, habilidades y experiencia.
5. Combate, inventario, tienda y resto del GM.

## Archivos críticos a modificar
- `design.md` (nuevo v3; v2 se archiva)
- `app/globals.css` (bloque `@theme`), `app/layout.tsx` (fuentes display)
- `components/ui/*.tsx` (Button, Panel + nuevos Marco, BarraVital, Sello)
- `components/layout/Riel.tsx`, `components/NavegacionMovil.tsx`, `app/dm/layout.tsx`, `app/ficha/layout.tsx`
- `app/ficha/**` (página, `FichaVital.tsx`, `jugador.css`), `app/dm/forja/**`, `app/dm/page.tsx`, `app/login/page.tsx`, `app/page.tsx`

Patrón a repetir: cambiar la clase de la pantalla a las primitivas nuevas, sin tocar la lógica de datos ni de Supabase.

## Verificación

1. `npm run lint` y `npm run build` (usa webpack) deben pasar sin errores nuevos.
2. `npm test`: los tests de combate no deben cambiar, porque el plan no toca `lib/`.
3. Capturas con Playwright (`mcp__plugin_playwright_playwright__*`) de cada pantalla prioritaria, antes y después, a 390 px (móvil) y a escritorio. Revisar sin scroll horizontal y con el riel colapsado.
4. Contraste: validar los pares de texto contra la tabla de §3 de `design.md` v3 (mínimo 4,5:1 para texto normal).
5. Movimiento: activar `prefers-reduced-motion` en el navegador y comprobar que las animaciones se detienen.
6. Rendimiento: revisar en DevTools que las animaciones usen solo `transform`/`opacity` y que no aparezcan nuevas dependencias en `package.json`.

## Preguntas abiertas para el paso de implementación
- ¿Mantenemos el nombre "Yugen" y los kanji del riel, o los sustituimos por otro vocabulario de fantasía?
- ¿Te sirve la propuesta de paleta y fuente display de la Fase 0, o prefieres mostrarme 2-3 muestras antes de aplicarla a todas las pantallas?
- ¿Eliminamos la carpeta `src/app/` (plantilla sin usar) en un commit aparte?

Nada de esto se ha ejecutado todavía: el plan no modifica archivos del proyecto.
