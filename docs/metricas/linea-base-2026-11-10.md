# Línea base — 10 de noviembre de 2026

Fuente: consultas de solo lectura a RealYugen (yzvpahcjbuotnqjmbkeu), rama de origen main d6b3ae6. Región: us-west-2.

| Medida | Resultado observado | Presupuesto |
|---|---:|---:|
| Encuentros guardados | 1 | — |
| Datos de Encuentro en Ambrosía (finalizado, 2 miembros) | 5.482.199 bytes | <200.000 |
| Historial del mismo encuentro | 5.076.294 bytes | incluido en datos |
| Datos sin historial (diferencia aproximada) | 405.905 bytes | RPC <150.000 |
| Acción extremo a extremo, p95 | pendiente de sesión autenticada | <500 ms |
| Triggers por guardado | pendiente de copia restaurada | <40 ms |
| Pantalla usable | pendiente de navegador y red comparables | <2 s |

La diferencia de tamaños no es una medición HTTP: faltan la envoltura RPC, compresión y tiempos de red.
No se han ejecutado escrituras de diagnóstico en producción. No se trasladan los 237 ms del informe anterior a esta línea base.

## Auditoría de imágenes en public

| Tabla | Columna | Filas con data:image/ |
|---|---|---:|
| combates_yugen | datos | 1 |
| forja_maestra | configuracion_dados | 1 |
| forja_maestra | imagen_url | 6 |
| inventario_jugador | imagen_url | 3 |
| resultados_encuentro | datos | 1 |

Son conteos por columna: una misma fila puede aparecer en varias. La consulta recorre todas las columnas text, varchar, json y jsonb de public y no imprime imágenes.

## Estado manual verificado

Existen private.combate_imagenes, imagenes_extraer, imagenes_restaurar y las llamadas a extracción en los guardados GM/jugador.
combate_eliminar ya borra las dependencias y protege recompensas oficiales y logros auditados.
Estas modificaciones no aparecen en el historial de migraciones remoto consultado. Se incorporan definiciones completas al repositorio sin volver a aplicarlas.

El encuentro antiguo conserva un historial grande; la existencia de las funciones no acredita que todos los historiales se hayan limpiado.

## Protocolo pendiente

1. Confirmar respaldo reciente y restauración utilizable.
2. Ejecutar scripts/diagnostico-combate.sql en copia restaurada, con guardado sin cambios y acciones reales.
3. GM y dos jugadores: tres recorridos completos de crear, unir, iniciar, mover, atacar, habilidad, objeto, deshacer, terminar, aprobar y borrar.
4. Exportar Network (RPC), eliminando Authorization, cookies y claves antes de guardar.
5. Registrar muestra, p50, p95, bytes y escenario exacto antes/después. No declarar presupuesto aprobado sin esas mediciones.
