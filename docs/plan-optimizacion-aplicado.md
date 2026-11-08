# Aplicación del plan de optimización del combate

Se aplican las prioridades del fragmento aportado: persistencia y reintentos antes de alterar reglas o embellecer efectos. No se han aumentado `statement_timeout`, desactivado RLS ni eliminado mecánicas.

## Cambios

- **Comandos identificados**: GM y jugadores envían un UUID `action_id`. La transacción guarda estado y recibo juntos. Un reintento comprueba usuario, actor y firma del comando; devuelve la confirmación original, sin tirar dados ni gastar recursos otra vez. La revisión del combate sigue siendo la secuencia autoritativa.
- **Respuesta perdida**: primero se consulta el recibo. Si existe, se recupera el snapshot actual. Si no se pudo confirmar, el comando queda pendiente, con el mismo ID guardado en la sesión del navegador. Una solicitud distinta no lo sobrescribe.
- **Espera visible**: mensaje inmediato, aviso de demora desde un segundo y controles para consultar/reintentar desde cinco segundos. El límite HTTP de quince segundos no supone que el commit haya fallado; se verifica antes de permitir otro comando.
- **Interfaz**: la confirmación de nuevas acciones queda protegida, pero se puede seguir seleccionando objetivos y leyendo habilidades. No se aplican daño ni recursos como definitivos antes de confirmar.
- **Reconexión**: se deduplican revisiones viejas, se conserva un solo canal y se pide snapshot al reconectar o volver a la pestaña. Los recibos privados permiten comprobar una acción pendiente tras perder Realtime.
- **Observabilidad**: la respuesta del backend separa autenticación, lectura, motor y commit. La pestaña conserva hasta doscientas muestras numéricas y calcula p50/p95. El diagnóstico del GM distingue SQL y confirmación completa. No se registran tokens, nombres, atributos ni comandos en esas métricas.
- **VFX**: precarga de efectos elegidos, caché acotada y cola visual FIFO independiente del commit. Máximo seis lotes en espera y veinticuatro sprites por lote. Al sobrepasar el presupuesto se omiten efectos antiguos en espera, nunca acciones ni estado del combate. Se mantienen los anclajes y movimientos confirmados.

## Verificación y límites

| Escenario | Verificado |
| --- | --- |
| Movimiento de 1, 5 y 10 casillas | 50 muestras sintéticas por distancia; destino y acción conservada |
| PvP | 100 cambios de turno entre dos identidades en SQL local, con doble envío de cada comando |
| Respuesta perdida y recarga | Consulta por ID, recuperación del snapshot y reutilización del mismo comando |
| PH, daño y revisiones | Un solo gasto/daño, rechazo de revisión obsoleta y recibos atómicos |
| Permisos | Recibos privados, RPC del servidor exclusiva de service_role, consulta GM restringida |
| Motor existente | Suite de regresión de áreas, recursos, pasivas, invocaciones, transformaciones y equipo |
| Cola visual | Orden, deduplicación, presupuesto y limpieza al desmontar |
| Realtime | Revisiones duplicadas/atrasadas y recuperación tras error del canal |

Los números de `docs/metricas/combate-motor-sintetico.json` miden **solo CPU del motor en Node**. No representan SQL remoto, React, red, dos navegadores conectados, FPS ni móvil. No se afirma haber completado la matriz del documento en producción. La validación pendiente incluye cien acciones con dos clientes reales, pérdida deliberada de conectividad, p95 antes/después por conexión y memoria/FPS en móvil de gama media. La recuperación actual converge mediante snapshot y recibos; no reproduce todas las animaciones intermedias perdidas durante una desconexión.

## Despliegue y rollback

1. Aplicar la migración aditiva de recibos; verificar sus permisos. No modifica encuentros existentes.
2. Desplegar `combate-jugador` conservando el motor compartido y autenticación del endpoint.
3. Publicar el cliente. Los endpoints anteriores siguen disponibles para sesiones antiguas.
4. Observar p95, errores y reconexiones. Si hay regresión, revertir el commit web y mantener backend/recibos nuevos para resolver solicitudes pendientes. No borrar recibos ni reconstruir a mano el estado de los jugadores.

El registro de recibos vive en el esquema privado y guarda metadatos y evento, sin snapshots completos ni imágenes duplicadas. Su conservación es necesaria para los reintentos; no se ha añadido una purga automática ni canales Realtime adicionales.
