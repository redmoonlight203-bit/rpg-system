# Forja de escenarios y primer tileset YUGEN

Acceso: **GM → Combate → preparación → Mapa de combate → Forja de escenarios**.

## Paquete instalado

La imagen aportada por el GM se conserva sin recomprimir en `public/tilesets/yugen-exteriores-oscuro-v1.jpg`. Aunque el archivo adjunto llevaba extensión PNG, su contenido real es JPEG de 1536×1536; se sirve con la extensión correcta. No se duplica el atlas dentro de los documentos de mapa.

El manifiesto `lib/tileset-yugen.ts` contiene **89 recortes manuales**: hierba, tierra, barro, grava, adoquines, caminos de tierra/piedra, muros, ruinas, cercas, portón, puerta, dos colores de techos, escaleras, rocas y tocones. Las filas de techos y objetos tienen divisiones distintas: una rejilla uniforme de 32 px rompería las piezas. Los recortes excluyen el borde de la celda en el atlas, pero la imagen conserva su fondo de hierba y las sombras originales.

La procedencia se registra como imagen proporcionada por el GM. Eso no constituye una afirmación de autoría ni una licencia de terceros verificada.

## Generación y uso

1. Elige **Bosque y senderos**, **Pueblo abandonado** o **Ruinas de piedra**.
2. Ajusta ancho/alto (8–24), densidad, camino de tierra/piedra y techo gris/rojo.
3. Genera con una semilla o pulsa **Otra variante**. Los ejes conectados reservan los cuatro accesos; los edificios abren su entrada hacia la calle. La decoración no invade los accesos reservados.
4. Pinta superficies, arrastra una pieza desde la paleta o usa un sello de 1×1, 2×2 o 3×3, con rotación. Los sellos grandes conservan su huella táctica completa y se borran como una sola pieza. No añaden detalle gráfico adicional a la imagen original.
5. Usa pincel/relleno, cuadrícula, zoom, deshacer/rehacer y protección de casillas. Proteger una parte de un objeto protege su huella entera. Si las protecciones introducen un conflicto de conectividad, se conserva el trabajo y se bloquea Aplicar hasta corregirlo.
6. Alterna **Ver interior / Ver techos**. Los techos son una capa visual y no bloquean por sí mismos el interior. El tablero compartido del GM y jugador también permite mostrarlos/ocultarlos; en combate comienza sin techos para ver las fichas.
7. **Aplicar al encuentro** guarda el documento y los datos tácticos con los permisos y revisiones existentes de `combate_guardar_ligero`. Cada pincelada queda local hasta aplicar. El mapa queda fijo al iniciar el combate.
8. **Descargar mapa / Abrir mapa** permite reutilizar escenarios completos entre encuentros, sin editar JSON. El archivo se valida antes de utilizarlo y contiene una referencia al tileset instalado.

El archivo actual es de exteriores. No se inventan muebles, suelo de madera ni árboles completos que no existen en la imagen. Los perfiles interiores antiguos siguen disponibles con atlas personalizados.

## Reglas visuales y tácticas

- Los caminos resuelven vecinos N/E/S/O y rotan variantes compatibles. Este atlas no incluye todos los cruces T nativos: se componen a partir de una cruz, cubriendo las salidas sobrantes con hierba. No se etiqueta falsamente una curva como un cruce T.
- Muros y cercas bloquean según `celdas`; piedras/tocones pequeños aportan cobertura; obstáculos grandes generados pueden bloquear; barro cuesta movimiento adicional. El pincel táctico permite cambiar esos comportamientos.
- Puerta y portón son sellos estáticos bloqueantes. Las entradas transitables generadas son huecos abiertos: no se representa una puerta cerrada como si estuviera abierta.
- Los techos se dibujan después de los objetos y pueden ocultarse sin modificar el mapa canónico.
- Se conservan los valores del motor actual: difícil cuesta 2, cobertura +2 ARM a distancia, peligro 2 daño. Esta entrega no añade reglas dinámicas de puertas o destrucción.

## Arquitectura

- `mapas-procedurales.ts`: contratos y versión 1 conservada; despacha la gramática nueva por `generatorVersion: 2.0.0`.
- `generador-exteriores.ts`: calles → edificios/ruinas → decoración → conectividad → restauración de protecciones completas.
- `tileset-yugen.ts`: atlas, recortes, familias y conectores; URL local permitida explícitamente.
- `mapas-topologia.ts`: azar estable y validación lineal de conectividad.
- `mapas-render.ts`: instrucciones deterministas por capas, composición de conectores y caché compartida de imágenes decodificadas.
- `mapas-edicion.ts`: edición con huellas, borrado íntegro, protección y relleno conectado.
- `mapas-archivo.ts`: validación de documentos portables, dimensiones, recortes, IDs y URLs.
- `TallerMapas.tsx`: editor visual con paleta, arrastre, controles de generación, historial y archivos. Flechas + espacio permiten pintar por teclado.
- `FondoMapaProcedural.tsx`: Canvas para el tablero compartido GM/jugador; las casillas existentes conservan selección, áreas, movimiento y efectos.

El servidor sigue autorizando el combate contra `celdas`, independientemente de las imágenes. No se regenera durante acciones ni se introducen escrituras por tile/fotograma. El atlas grande se descarga como recurso estático cacheable, no como base64 dentro de cada encuentro.

## Verificación y límites

La batería incluye 1000 semillas por cada uno de los cinco perfiles antiguos y 1000 por cada uno de los tres perfiles nuevos, alternando tamaños 8/12/16/20/24. Comprueba determinismo, conectividad, límites, accesos, conectores, orden de capas, huellas, borrado/protección, mapas portables y compatibilidad del guardado ligero.

Se verificó visualmente el renderer compartido mediante una página temporal de QA para pueblo, ruinas, senderos y ocultación de techos. La vista previa directa de Next no arrancó porque la infraestructura le añade opciones de Vite; por ello no se afirma una prueba visual completa de los controles React ni de dos sesiones Supabase autenticadas. La página temporal no forma parte de la app publicada. La compilación se comprueba con variables Supabase de ejemplo; no con acceso a la base real.

Continúan fuera de esta entrega del primer paquete: catálogo remoto independiente con versiones/publicación por campaña; importación de atlas grandes a Storage con validación de servidor; adaptadores genéricos de autotile 16/47; puertas/destructibles dinámicos; mapas de 64/128 y Workers/chunks; mediciones p95 en dispositivos móviles. El límite 24×24 pertenece también al servidor existente. Los atlas personalizados conservan el límite anterior de 250 KB y corte por rejilla.
