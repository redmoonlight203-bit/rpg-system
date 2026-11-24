# Arte de Yugen (design.md v3)

Las ilustraciones, runas y texturas las aporta el propietario. Este archivo dice qué falta, con qué nombre y en qué formato. Cada archivo nuevo se anota en la tabla «Entregado» con su origen y licencia.

## 1 · Runas de sección (entregadas el 16-11)

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

Entregadas como una hoja de 40 runas: se recortaron como máscaras (`runas/<clave>.png`, 160 px) y 21 están asignadas en `RUNAS_DISPONIBLES` (`lib/runas.ts`). Para cambiar una, sustituye el archivo con el mismo nombre. Las 19 restantes de la hoja siguen disponibles para nuevas secciones.

## 2 · Ilustraciones (prioridad media)

| Archivo | Medida | Formato | Uso |
|---|---|---|---|
| `escenas/entrada.webp` | 1920 × 1080 | WebP | Fondo de la escena de login (Kuroi en su vacío) |
| `escenas/nexo.webp` | 800 × 800, fondo transparente | WebP o PNG | Ilustración del portal del Nexo (sustituye al emblema) |
| `dolls/portador.webp`, `dolls/saco.webp` | ~200 × 560, fondo transparente | WebP | Doll portador y saco de golpes de la arena de pruebas del Yunque |
| `razas/<clave>.webp` | ~1024 × 683 (se recorta la figura central) | WebP o PNG | Figura de cada raza, estilo hombre de Vitruvio. Desde el 16-11 también se pueden subir desde Estadísticas al crear o editar la raza. |

### Regla: cada raza nueva lleva su imagen

Al crear una raza en Estadísticas hay que subir su figura; sin ella no se puede guardar (lo comprueba también el servidor). Una subraza puede heredar la de su raza superior, como Kuro con Humanos. Si la imagen trae dibujados los huecos de equipo, se recorta la figura central: la aplicación pone sus propios huecos interactivos encima.

## 3 · Opcional

- `lugares/<clave>.webp`, 320 × 200: viñeta ilustrada para cada lugar del Nexo.
- `texturas/pergamino.webp`, 512 × 512 sin costuras: grano de pergamino más rico que el actual (hecho con CSS).

## 4 · Códices de La creación (opcional)

Texturas sin costuras de 512 × 512 px en WebP para `public/arte/codices/`: `papel.webp` (páginas del bestiario y proclamas), `libro-cuero.webp` (tapas del bestiario) y `tarot-dorso.webp` (marco de las cartas). Sin ellas se usan gradientes CSS; al recibirlas se asignan a las variables `--cx-papel-img`, `--cx-cuero-img` y `--cx-dorso-img` de `components/codices/codices.css`.

## Entregado

| Archivo | Origen | Licencia | Fecha |
|---|---|---|---|
| `razas/humanos.webp` | Propietario, 16-11-2026 (recortada: sin huecos ni rótulos dibujados) | Del propietario | 16-11-2026 |
| `razas/elfos.webp` | Propietario, 16-11-2026 (recortada) | Del propietario | 16-11-2026 |
| `razas/enanos.webp` | Propietario, 16-11-2026 (recortada) | Del propietario | 16-11-2026 |
| `razas/hombres-bestia.webp` | Propietario, 16-11-2026 (recortada) | Del propietario | 16-11-2026 |
| `razas/gigantes.webp` | Propietario, 16-11-2026 (recortada) | Del propietario | 16-11-2026 |
| `razas/dragones.webp`, `razas/hadas.webp` | Propietario, 16-11-2026 (recortadas) | Del propietario | 16-11-2026 |
| `runas/*.png` (21) | Hoja de 40 runas del propietario, recortadas como máscaras | Del propietario | 16-11-2026 |
| `escenas/mapa-estelar.webp` | Mapa estelar del propietario (escala de grises, 552 px) | Del propietario | 16-11-2026 |
| `dolls/portador.webp` | Propietario, 16-11-2026 (fondo blanco eliminado y recortado) | Del propietario | 16-11-2026 |
| `dolls/saco.webp` | Propietario, 16-11-2026 (fondo blanco eliminado y recortado) | Del propietario | 16-11-2026 |
| `creaciones/*.webp` (54) | ImageGen, una ilustración por pieza. Véanse las indicaciones de generación abajo. | Uso en Yugen | 21-11-2026 |

## Ilustraciones de La Creación

Las imágenes cuadradas de 480 × 480 px se asignan por identificador en `lib/arte-creacion.json`. Una imagen guardada en la creación tiene prioridad.

**Indicación común de generación**

> Use case: stylized-concept. One original square RPG illustration for Yugen: Last Chance. Dark gothic fantasy digital oil painting, painterly textured shadows, readable value contrast, a single crisp central visual focus, antique brass accents over near-black plum atmosphere. Compose the key silhouette inside the central 60 percent of the square so it remains readable inside a small circular combat icon. Background full bleed, dark and unobtrusive. No text, font, numbers, title, card border, interface, watermark or collage. Fictional non-graphic fantasy.

| Creación | Archivo | Tema de la ilustración |
|---|---|---|
| Absorción | `absorcion.webp` | A dark amber many-faceted crystal charging with a thin ribbon of captured flame, streaks curl inward into the crystal. |
| Ancla Inercial | `ancla-inercial.webp` | An upright open leather-gloved palm stops a blunt steel gauntlet a hair away. Parallel ochre momentum trails shatter against a thin vertical translucent plane. |
| Bola de Fuego | `bola-de-fuego.webp` | A single vivid vermilion ball of turbulent fire, compact spherical silhouette with one upward curl and sparks, blackened background. |
| Bucle | `bucle.webp` | A single luminous amethyst eye in the center of receding concentric eyes carved in dark glass, infinite tunnel of violet reflections, hypnotic. |
| Caída Prestada | `caida-prestada.webp` | A falling chipped stone caught above the ground by successive gold air ripples, dust suspended beneath it. Side view. |
| Cero Absoluto | `cero-absoluto.webp` | A violet sphere hovers just above the ground, producing a wide crown of jagged pale-blue ice, frozen vapor sweeping outward. |
| Colisión de Horizontes | `colision-de-horizontes.webp` | Two opposite bowed planes of starlight collide in the center, forming a thin blinding white seam, with crimson on one side and deep indigo on the other. |
| Comprensión Arcana | `comprension-arcana.webp` | A weathered open spellbook catching an intricate floating amber geometric spell, gold diagrams only, no lettering. |
| Cronosfera | `cronosfera.webp` | A luminous hourglass suspended in a glass sphere, sand frozen midpour, tiny shards held motionless in smoky teal surroundings. |
| Despertar del Insaciable | `despertar-del-insaciable.webp` | A horned demon silhouette begins to emerge like an ember-red shadow from the shoulders of a cloaked male sorcerer. Strong orange cracks, chest-up. |
| Despertar Limitless | `despertar-limitless.webp` | One commanding cosmic eye opening from a black eclipse, pale iris made of bent gold, violet and cobalt orbits. Abstract, strong silhouette. |
| Deuda del Movimiento | `deuda-del-movimiento.webp` | Streams flowing inward from stopped projectiles into a single steel-blue orb, one concentrated diagonal discharge of white and gold leaving the sphere. |
| Dispersión | `dispersion.webp` | A small black nucleus inside a silver sphere, dramatic even radial blast lines and pushed rubble, no flame. |
| Escamas de dragón | `escamas-de-dragon.webp` | Close-up overlapping iridescent green-black dragon scales on a curved shoulder, sparks from a weak violet spell deflect across them, crisp keratin texture. |
| Escudo de tablones | `escudo-de-tablones.webp` | A roughly oval wooden plank shield, irregular worn boards and black iron cross-straps held by large rivets, worn leather grip partly visible from a slight three-quarter angle, muted copper edges. Rustic goblin craftsmanship. |
| Exclusión | `exclusion.webp` | Black-white shattered orb in a void, glitchy pale fragments dissolving part of a single obsidian pillar into fine dust, near-monochrome. |
| Extinción | `extincion.webp` | A ruby life-crystal visibly dimming as long orange-red threads are drawn into a hooded hand, tar-black surrounding silhouette, no injury. |
| Golpe de Transferencia | `golpe-de-transferencia.webp` | Close side view of a leather-wrapped fist delivering a compact hit into an armored plate, with a sharply localized golden pulse traveling through the plate. |
| Hambre de Gor’Veth | `hambre-de-gorveth.webp` | A demonic red maw silhouette devouring one luminous amber wisp, red and warm gold, devotional medieval horror symbolism, no gore. |
| Horizonte Muerto | `horizonte-muerto.webp` | A barren dark stone ridge under a dead gray horizon with spent spell wisps draining into a dim slate point, quiet desaturated lilac. |
| Juicio de la Tierra | `juicio-de-la-tierra.webp` | A single raised slab of earth surrounded by an amber ring of branching cracks, a chalky cloud of falling chunks behind the central slab. |
| Juicio de la Tierra: Cataclismo | `juicio-de-la-tierra-cataclismo.webp` | Two mountainous stone masses torn apart in midair, linked by a glowing network of gold stress fractures, miniature epic cataclysm with black sky. |
| Lengua del Devorador | `lengua-del-devorador.webp` | A demonic maw in the shadows with a long stylized crimson tongue curling into a hook around a metal ring. No gore. |
| Liberación | `liberacion.webp` | An upright silhouette releasing a broad disk of brilliant warm-white kinetic light from the chest, one readable halo. |
| Martillo y Yunque | `martillo-y-yunque.webp` | Two amber forces compress a metal breastplate, a descending wrapped fist above and a vertical blue shock from a paving slab below, balanced central stack. |
| Moneda Aberrante | `moneda-aberrante.webp` | A tumbling silver coin at the center with a crisp zigzag trail ricocheting between three rough stone markers, no text on the coin. |
| Moneda de Peaje | `moneda-de-peaje.webp` | A copper coin hits the center of a weathered iron shield, a gold pulse visibly goes through the rim toward a gripping gauntlet. |
| Paso Errante | `paso-errante.webp` | A hooded warrior silhouette charging low through a dust ring with one forward crescent, dark cinereous background and golden edges. |
| Paso Inercial | `paso-inercial.webp` | A hooded figure stepping sideways in the air beside one distinct elongated violet afterimage and a sharp right angle of light on the ground. |
| Puño Inercial | `puno-inercial.webp` | A single clenched bare fist in stark three-quarter view, surrounded by a compressed oval of golden sparks and a dark background, not striking a body. |
| Punto Cero | `punto-cero.webp` | A frost-covered dark metal orb with wisps of warm amber vapor pulled away from it and crystalline hoarfrost, icy turquoise contrasts. |
| Quietud Absoluta | `quietud-absoluta.webp` | Angular boulders frozen just outside a central black point, paired pale inward-moving vectors and a completely still aperture. |
| Reacción Designada | `reaccion-designada.webp` | A wrapped fist strikes empty air on the left and a thin yellow arc connects to a distant slate pillar carrying the visible burst of the impact, close central composition. |
| Reciprocidad Forzada | `reciprocidad-forzada.webp` | Two separate upright stones joined by taut bands of luminous red and gold in parallel, a pulse passing between them, one stone starts to crack. |
| Recíproco | `reciproco.webp` | Two blunt arm guards colliding dead center, a sharply bent golden recoil arc doubling backwards into the incoming guard, vivid copper light. |
| Recíproco Absoluto | `reciproco-absoluto.webp` | A spell bolt halted in midair, a cooler blue energy arc snaps backward into a distant hooded hand with dark silver sparks, no direct contact. |
| Reconstrucción | `reconstruccion.webp` | A stylized stone hand being restored by golden and emerald threads, ceramic-like fragments reunited, gentle healing glow and no gore. |
| Repercusión | `repercusion.webp` | A gray pearl sphere fractures at a struck rune stone, three angular silver shards travel toward separate stones on visible short tracks. |
| Repercusión: Dominó | `repercusion-domino.webp` | A tight diagonal row of radiant violet linked orbs, each one passing a sharply defined spark to the next like a long domino sequence. |
| Retribución Universal | `retribucion-universal.webp` | A single tall obsidian spire ringed by a large antique gold halo sending crimson feedback arcs towards three smaller spell motifs around it. |
| Segundo Impacto | `segundo-impacto.webp` | A central metal target recoils from a gloved fist edged with amber, with a distinct second spectral impulse nested behind the first on the same straight axis. |
| Sentencia del Suelo | `sentencia-del-suelo.webp` | A human fist strikes black pavement, a sharp amber wave runs through the tiles and lifts a far stone boot from the floor. |
| Silencio del Núcleo | `silencio-del-nucleo.webp` | A cracked amethyst crystal encased in black iron rings, violet filaments cut short at the rings, stifled energy and deep red edges. |
| Singularidad | `singularidad.webp` | A true black hole with a tilted warm orange accretion ring and warped starlight behind it, simple clear light silhouette. |
| Singularidad Eterna | `singularidad-eterna.webp` | A hungry dark singularity with a double gold-violet spiral accretion disk drawing threads of starlight from small nearby crystals. |
| Superfuerza Simulada | `superfuerza-simulada.webp` | A leather-clad figure lifts a huge stone slab with one arm, pale gold impulses visible around elbow and shoulder, simplified heroic silhouette. |
| Supernova | `supernova.webp` | One compact bright star exploding in warm golden white coronal loops and expanding rust-red shock rings, dark plum vacuum. |
| Supervelocidad Simulada | `supervelocidad-simulada.webp` | A low running silhouette leaving two slim parallel streaks in a dark stone passage, no afterimage figure, ice-gold contrast and sharp forward motion. |
| Talión | `talion.webp` | A black obsidian prism pinned between two converging opposing copper wavefronts, hairline gold cracks at the pinch point. |
| Talión: Juicio Absoluto | `talion-juicio-absoluto.webp` | A pair of dark targets side by side joined by arcs of kinetic gold; opposing amethyst jaws of energy close on both, pronounced symmetry. |
| Transmutación Energética | `transmutacion-energetica.webp` | An orange flame slowly transforming into blue lightning and then into radiant teal crystalline drops in a single centered swirl. |
| Umbral Espacial | `umbral-espacial.webp` | Two dark elliptical portal surfaces joined by a bent amethyst filament, different star fields visible inside, bold circular openings. |
| Vector Absoluto | `vector-absoluto.webp` | A concentrated bright diagonal lance of gold light made of thin co-aligned parallel lines that shear through a thin slate wall, one distinct vector. |
| Vuelo Inercial | `vuelo-inercial.webp` | A small airborne cloaked silhouette banked over a cloud of dust with crisp successive curved gold motion trails, dark navy sky. |
