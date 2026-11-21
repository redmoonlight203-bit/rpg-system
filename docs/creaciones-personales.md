# Creaciones personales y generales (2026-11-21)

Cada creación de la Forja (habilidad, pasiva, objeto, título…) es **general** o **personal de** un personaje de la Forja.

- **Quién decide:** solo el GM. En el Yunque, campo «Ámbito»: «General · disponible para todos» o «Personal de <personaje>». Un personaje nunca es personal de otro.
- **Forja (La creación):** filtro «Ámbito». Por defecto se ven solo las generales; también «Personales», «Personales de <personaje>» y «Todas». Al buscar con el filtro en «Generales», un aviso indica cuántas personales coinciden. Cada tarjeta personal lleva «Personal de <personaje>».
- **Crear o editar un personaje (Grimorio del Yunque):** la colección se agrupa en «Personales de <este personaje>», «Generales» y «Personales de <otros>». Buscar por el nombre del personaje encuentra sus personales.
- **Crear una pieza desde un personaje** (botón de crear dentro): nace como personal de ese personaje; el GM puede cambiarla a general.
- **Aprender:** las personales se pueden aprender por otros personajes cumpliendo sus requisitos. En el árbol de habilidades del GM aparecen agrupadas («Generales», «Personales de Kion»…).

## Base de datos

`supabase/migrations/20261121100000_creaciones_personales.sql`

- Columna `forja_maestra.personal_de` (uuid, referencia a `forja_maestra`, `on delete set null`: si se borra el personaje, sus creaciones pasan a generales).
- Trigger `forja_personal_valido`: el dueño debe ser un personaje, una creación no puede ser personal de sí misma y un personaje no puede ser personal de otro.
- Kion Vaelthorne: todas sus creaciones (las sembradas con él y las que lleva en habilidades y pasivas) pasan a personales suyas, **salvo Bola de Fuego, Azul, Rojo y Morado**, que siguen generales.
- La interfaz funciona antes de aplicar la migración: sin la columna, todo se ve como general y no se envía `personal_de` al guardar.

## Verificación

- `tests/creaciones-personales.test.mjs`: ámbitos, agrupación, filtro, validación, Grimorio y contenido de la migración.
- `tests/creaciones-personales-database.mjs` (PGlite): migración idempotente, Kion y sus excepciones, trigger y borrado del dueño.
- Galería comprobada en navegador con datos de ejemplo.

## Diseño de cartas (2026-11-21)

- Cada creación de La creación es una carta con proporción de naipe (63×88), marco y tinte por tipo (personaje, monstruo, habilidad, pasiva, objeto, título), rango en un rombo, placa con el nombre y pie con sello y dos atributos.
- El arte vive en una ventana de tamaño fijo y se recorta (`object-fit: cover`, encuadre algo alto para que se vean las caras): cualquier imagen cuadra y todas las cartas miden lo mismo.
- Un personaje con creaciones personales lleva su **baraja** detrás: un dorso por cada carta que contiene (47 para Kion). El grosor total es de 18 px como máximo (menos en móvil) y cabe en el hueco de la rejilla, así que una baraja nunca toca otra carta ni otra baraja.
- **Abanico:** al pasar el ratón (o al tocar «Baraja N» en móvil) se abre un panel con todas sus cartas boca arriba; cada una abre su detalle sin entrar en la baraja. En escritorio se abre hacia el lado con espacio; en móvil es una hoja inferior. Se cierra al salir, con Esc, tocando fuera o con la X.
- «Ver la baraja completa» entra en la vista de baraja: cabecera «Baraja personal», el personaje como portada y sus cartas repartiéndose una a una; «Volver a la colección» regresa a las generales.
- Animaciones solo con `transform`/`opacity`, desactivadas con `prefers-reduced-motion`. Comprobado en navegador en escritorio y 390 px: alturas y ventanas de arte idénticas, sin scroll horizontal.

## Marcos por tipo y color por rango (2026-11-21)

- Cada tipo tiene su marco ilustrado (`public/arte/marcos/<tipo>.webp`, 512×768, fondo transparente): personaje (curvas y nudo), monstruo (espinas), habilidad (cuchillas), objeto (metal atornillado), otro (art déco con gemas). **Título** (gótico con estandarte) y **pasiva** (laureles) usan el art déco hasta recibir sus archivos: basta con guardarlos como `titulo.webp` y `pasiva.webp` y apuntar `pasiva` a su archivo en `lib/cartas.ts`.
- La carta tiene la proporción de los marcos (2:3). El arte llena el interior y se recorta para que cuadre; el marco va encima. El texto se coloca en la zona segura medida en cada marco.
- El rango (clase F–KUROI) tiñe el marco y los acentos: F hierro, D bronce, C jade, B acero azul, A arcano, S oro (colores originales), Z sangre y KUROI negro con halo violeta. Los dorsos de la baraja también toman el color del rango de cada carta.
- `lib/cartas.ts` (marco por tipo y rango) con pruebas en `tests/cartas.test.mjs`.
