# Galería de La creación

La colección presenta una tarjeta por creación, con portada, nombre, clasificación y hasta tres atributos. Los filtros de tipo, clasificación, nombre y orden permanecen al volver desde el detalle.

Al pulsar una tarjeta se abre su ficha de lectura: atributos completos, acciones, pasivas, reglas, equipo e historia. «Editar ficha» sigue abriendo el editor existente del Yunque; ese formulario no se ha modificado. Entrega, preparación para batalla, publicación en tienda y eliminación están disponibles desde el detalle.

«Añadir imagen» / «Cambiar imagen» permite escribir una URL HTTP/HTTPS o insertar un archivo PNG, JPG o WebP de hasta 10 MB. Se muestra la previsualización antes de guardar; también se puede quitar o cancelar. Los archivos se reducen a un máximo de 1200 píxeles de lado y se comprimen como WebP, con un límite de 450 000 caracteres para la imagen final. Las imágenes remotas se conservan como enlaces; un servidor externo puede impedir su visualización.

Se reutiliza `forja_maestra.imagen_url`. Los archivos se guardan como imágenes raster incrustadas, por lo que no hace falta crear un bucket, aplicar SQL ni configurar almacenamiento local. El guardado actualiza la imagen y el identificador de icono y confirma la fila devuelta antes de mostrar éxito. Las copias existentes no se modifican. El icono de respaldo se configura en el mismo panel: tiene prioridad el símbolo de la creación, seguido del de su raza o categoría. Una imagen disponible tiene prioridad sobre ambos.

Sin portada, o si la URL no carga, se muestra un símbolo según el tipo. La colección no incluye imágenes de ejemplo ni altera los datos de las creaciones.

Verificación: `node --test tests/imagenes-creacion.test.mjs`, `npx tsc --noEmit` y `npm run build` con las variables públicas de conexión del proyecto. La vista previa administrada disponible en este entorno pasa opciones de Vite a Next.js, por lo que la verificación visual en navegador queda pendiente.

## Códices

La ficha de cada creación es un **códice**: una pieza central propia y secciones configurables.

| Códice | Por defecto para | Pieza central e interacción |
|---|---|---|
| Bestiario | Personajes de una clasificación de monstruo | Libro con láminas que se pasan (botones, flechas ←/→, deslizar el dedo o marcapáginas). Cada sección es una página y cada variante ocupa la suya con su probabilidad. |
| Carta de tarot | Habilidades | Carta con arcano romano estable por creación. Al pulsarla se voltea y muestra la lectura de sus acciones; se inclina con el ratón. Tirada de prueba que no aplica nada. |
| Reliquia | Objetos | Vitrina con placa, espacio de equipo, dados y niveles del artefacto. |
| Sello | Pasivas | Lacre con el nombre grabado y el ritual evento → condición → efectos. |
| Edicto | Títulos | Estandarte y proclama con heráldica de bonos. |
| Expediente de héroe | Personajes | Retrato, medallones, grimorio en abanico, arsenal por espacios y talismanes. |
| Pergamino | Lo demás | Rollo genérico. |

Las creaciones enlazadas aparecen como miniaturas (carta, sello, reliquia o retrato para personajes y monstruos) que abren su códice sin salir de la vista. Las migas del **rastro** permiten volver; abrir una creación que ya está en el rastro lo recorta, de modo que no hay ciclos. «La portan» lista las creaciones que incluyen la actual. Un enlace a una creación borrada se muestra como «Creación no disponible».

### Taller de códices

«Configurar códices» (cabecera de la colección) o «Configurar …» (en cada ficha) abre el taller, con vista previa en vivo de cualquier creación:

- **Asignación:** reglas tipo + monstruo + clasificación → códice, en orden; gana la primera. Cada regla se muestra plegada como una línea de resumen y se despliega para editarla. «Ver como», en cada ficha, fija el códice de una creación concreta.
- **Códices:** nombre, texto sobre el nombre con marcadores (`{nombre}`, `{clasificacion}`, `{tipo}`, `{rango}`, `{rango_nombre}`, `{romano}`) y secciones (mostrar, renombrar, ordenar, añadir o quitar; cualquier sección del catálogo sirve en cualquier códice).
- **Movimiento:** activar animaciones, duraciones, inclinación, ancho a partir del cual el libro muestra dos páginas, longitud del rastro y tirada de prueba. El movimiento reducido del sistema siempre detiene las animaciones.
- **Archivo:** exportar e importar la configuración en JSON (se valida y se muestra qué se corrige antes de aplicarla) y restablecer los valores por defecto.

La configuración se guarda en `public.forja_codices` (una fila; solo el GM escribe mediante `codices_guardar`, migración `20261124100000_forja_codices.sql`) y en una copia del navegador. La migración se aplicó a la base real el 24-11-2026. Si el servidor no responde (8 s como máximo) o rechaza el guardado, se usa la copia del navegador y tanto el taller como la ficha lo avisan.

Verificación: `node --test tests/codices.test.mjs tests/codices-render.test.mjs` y `node tests/codices-database.mjs` (PGlite aislado).
