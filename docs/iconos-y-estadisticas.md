# Estadísticas e iconos de Yugen

Estadísticas presenta un árbol de categorías con buscador, contadores, emblema de la categoría seleccionada y filtros de atributos (todos, propios y heredados). Se conservan las claves internas, la herencia, los valores predeterminados y la protección de atributos heredados.

Para asignar un emblema a una raza o categoría: seleccionarla y pulsar **Elegir icono** o **Editar**. El selector contiene 26 símbolos originales dibujados como SVG, agrupados en razas, equipo, poderes y símbolos. Guardar la categoría persiste el identificador en `categorias_forja.icono`.

Humanos, Enanos, Elfos y Dragones reciben de inicio símbolos distintos. Las nuevas razas pueden elegir su símbolo con el mismo selector. Las categorías sin símbolo explícito utilizan el predeterminado reconocido por nombre o el de su categoría superior.

En La creación, abrir una tarjeta y elegir **Elegir imagen o icono**. Un símbolo propio se guarda en `forja_maestra.icono`. La prioridad visual es imagen disponible → icono propio → icono de raza/categoría → sello de Yugen. Una imagen que falla también muestra el símbolo de respaldo. Elegir Automático vuelve al símbolo de categoría; no elimina ninguna imagen.

La migración `20261103182056_iconos_yugen.sql` añade dos columnas opcionales y valida el formato de sus IDs. Conserva imágenes, atributos, reglas y permisos existentes. Ya se aplicó al proyecto RealYugen durante este cambio. En otras instalaciones se debe aplicar antes de guardar iconos.

La biblioteca se define en `lib/iconos-yugen.ts`; `IconoYugen` renderiza únicamente los trazos incluidos en código, nunca SVG recibido de la base de datos. Un ID desconocido usa un respaldo.

Verificación: pruebas de herencia, imágenes e iconos; TypeScript; compilación de producción; comprobación de columnas y de los cuatro emblemas raciales en RealYugen. La vista previa administrada no soporta los argumentos del servidor Next.js de este repositorio; la revisión visual en navegador sigue pendiente.
