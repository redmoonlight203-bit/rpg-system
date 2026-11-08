# Corrección de demora al confirmar acciones

El registro de producción confirmó `statement timeout` en `combate_guardar`. Las acciones del GM enviaban todas las fichas, imágenes incrustadas y diez snapshots completos de deshacer. Además, las notificaciones convertían las filas enteras a JSON, incluyendo ese historial.

- El cliente transmite diferencias por ID. En movimiento no vuelve a enviar configuraciones ni imágenes.
- El servidor reconstruye el estado bajo control de versión y conserva diez snapshots reales para deshacer.
- La lectura del GM omite el historial; deshacer se resuelve en el servidor con la misma revisión.
- Los avisos usan únicamente miembros, versión y destinatarios, sin convertir las filas completas.
- Las esperas de bloqueo se acotan a 1.5 segundos; una escritura concurrente se rechaza sin aplicar dos veces la acción.
- Los recursos que no cambiaron no generan escrituras derivadas al moverse.
- La caducidad visual usa la recepción local de un nuevo evento confirmado, evitando descartarlo por retraso o diferencia entre relojes.

No se eliminan imágenes ni pasos de deshacer, no se modifica el resultado del motor y no se aumenta el timeout para ocultar la demora. Los endpoints anteriores siguen disponibles para sesiones existentes; el nuevo cliente usa `combate_guardar_ligero` y `combate_consultar_ligero`.

Verificación: pruebas de diferencias y presupuesto de bytes; prueba SQL con imágenes, doce escrituras, diez snapshots, deshacer, permisos, conflictos y lecturas condicionales. La prueba de integración remota usa un encuentro temporal y revierte toda la transacción. Las mediciones SQL no incluyen la conexión del jugador, el despliegue web ni el renderizado de su navegador.
