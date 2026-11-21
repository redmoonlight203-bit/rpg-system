# Activación y reversión del balance

## Ensayo aislado

Registrar el commit de la aplicación, la versión del informe del Yunque y la última migración aplicada al proyecto. Preparar una copia aislada con el mismo esquema y datos de prueba. Ejecutar la auditoría de `scripts/auditar-balance.sql`. Conservar el resultado junto con la copia previa de la base en el entorno autorizado del GM.

Aplicar en orden las migraciones de clases IPE y bases raciales. Evaluar el catálogo con `node scripts/reclasificar-forja.mjs`. El modo de lectura informa cuántas creaciones se pudieron evaluar. El indicador `pendientes` incluye, entre otros motivos, vínculos inválidos que necesitan revisión. Resolverlos antes de la reclasificación. La opción `--aplicar` guarda solo filas todavía pendientes y comprueba que la creación y sus vínculos no cambiaron durante la simulación.

Con una sesión del GM, guardar una creación de prueba en el Yunque, volver a abrirla y comparar la letra del catálogo con la del borrador. Repetir con malla, pasiva racial y una pieza vinculada. Con una sesión de jugador, verificar el rechazo de las operaciones exclusivas del GM. Comprobar que el inventario y los encuentros históricos conservan sus snapshots.

## Publicación

La versión de la aplicación que guarda IPE requiere las dos migraciones del PR. Coordinar la ventana de publicación con el GM para evitar ediciones del catálogo entre la captura previa y la comprobación posterior. Registrar las clases anteriores por ID, las definiciones raciales, las funciones y disparadores vigentes y la configuración de acceso. Probar la restauración de esa copia en la base aislada antes de publicar. Verificar también que la versión Edge del motor corresponde al mismo commit.

## Si falla la activación

Interrumpir la reclasificación; conservar el informe de filas pendientes. Si el fallo es una edición concurrente, releer el catálogo y reintentar. Si es una regresión de reglas, detener las nuevas ediciones de la Forja mientras se compara el estado con la captura previa.

Restaurar el comportamiento anterior de aplicación, motor Edge y disparador de clase como una misma versión. En una copia aislada, contrastar por ID cada fila afectada con sus valores antes y después del cambio. Restaurar en la base real solo las filas confirmadas y con autorización del GM. Si hubo ediciones de jugadores o del catálogo después de la captura, reconciliarlas antes de cualquier restauración. Conservar snapshots históricos y el registro de la operación. Repetir la prueba de guardar, reabrir e invocar antes de reanudar ediciones.
