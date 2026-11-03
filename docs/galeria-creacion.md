# Galería de La creación

La colección presenta una tarjeta por creación, con portada, nombre, clasificación y hasta tres atributos. Los filtros de tipo, clasificación, nombre y orden permanecen al volver desde el detalle.

Al pulsar una tarjeta se abre su ficha de lectura: atributos completos, acciones, pasivas, reglas, equipo e historia. «Editar ficha» sigue abriendo el editor existente del Yunque; ese formulario no se ha modificado. Entrega, preparación para batalla, publicación en tienda y eliminación están disponibles desde el detalle.

«Añadir imagen» / «Cambiar imagen» permite escribir una URL HTTP/HTTPS o insertar un archivo PNG, JPG o WebP de hasta 10 MB. Se muestra la previsualización antes de guardar; también se puede quitar o cancelar. Los archivos se reducen a un máximo de 1200 píxeles de lado y se comprimen como WebP, con un límite de 450 000 caracteres para la imagen final. Las imágenes remotas se conservan como enlaces; un servidor externo puede impedir su visualización.

Se reutiliza `forja_maestra.imagen_url`. Los archivos se guardan como imágenes raster incrustadas, por lo que no hace falta crear un bucket, aplicar SQL ni configurar almacenamiento local. El guardado actualiza la imagen y el identificador de icono y confirma la fila devuelta antes de mostrar éxito. Las copias existentes no se modifican. El icono de respaldo se configura en el mismo panel: tiene prioridad el símbolo de la creación, seguido del de su raza o categoría. Una imagen disponible tiene prioridad sobre ambos.

Sin portada, o si la URL no carga, se muestra un símbolo según el tipo. La colección no incluye imágenes de ejemplo ni altera los datos de las creaciones.

Verificación: `node --test tests/imagenes-creacion.test.mjs`, `npx tsc --noEmit` y `npm run build` con las variables públicas de conexión del proyecto. La vista previa administrada disponible en este entorno pasa opciones de Vite a Next.js, por lo que la verificación visual en navegador queda pendiente.
