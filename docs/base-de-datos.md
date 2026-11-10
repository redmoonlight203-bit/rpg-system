# Base de datos — inventario observado el 10 de noviembre de 2026

Proyecto RealYugen, PostgreSQL 17, región us-west-2. Se incluyen triggers de usuario de public; se excluyen internos de FK.
No se ha eliminado ni modificado ningún trigger durante el inventario.

## Triggers

Propósitos orientativos por función/ruta de migración: requieren revisión de su definición antes de consolidar o eliminar.
Las nueve funciones de combate se conservan íntegramente en el diagnóstico de origen; no se atribuyen tiempos sin medirlos.

| Tabla | Trigger | Función | Propósito |
|---|---|---|---|
| arbol_nodos | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| articulos_alma | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| categorias_forja | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| categorias_forja | categorias_forja_validar_padre | validar_padre_categoria_yugen | Validación o sincronización de validar padre categoria yugen. Revisión funcional pendiente. |
| categorias_forja | validar_pasiva_racial | validar_pasiva_racial | Validación o sincronización de validar pasiva racial. Revisión funcional pendiente. |
| cementerio_personajes | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| codex_descubrimientos | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| codex_entradas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| combates_yugen | aaa_encuentro_validar_ciclo | encuentro_validar_ciclo | Valida transición de fase y protege el resultado del encuentro. |
| combates_yugen | arena_actualizar | arena_actualizar | Sincroniza la sala asociada a un encuentro de arena. |
| combates_yugen | combate_fin_aviso | combate_fin_aviso | Cierra el contexto de avisos al acabar una sentencia. |
| combates_yugen | combate_inicio_aviso | combate_inicio_aviso | Prepara el contexto de avisos antes de una sentencia. |
| combates_yugen | combate_persistir_vitales | combate_persistir_vitales | Persiste vida, PH y fatiga de fichas desde el combate. |
| combates_yugen | combate_proteger_progreso | combate_proteger_progreso | Impide alterar progreso que ya fue confirmado. |
| combates_yugen | combate_sincronizar_equipo | sincronizar_equipo | Sincroniza inventario y equipo de participantes. |
| combates_yugen | encuentro_registrar_resultado | encuentro_registrar_resultado | Materializa el resultado al finalizar el encuentro. |
| combates_yugen | zzz_combate_emitir_aviso | combate_emitir_aviso | Emite aviso de revisión de combate. |
| config_estadisticas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| creaciones_forja | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| deudas_kuroi | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| eventos_dominio | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| eventos_dominio | logros_evento | logros_evento | Validación o sincronización de logros evento. Revisión funcional pendiente. |
| forja_instancias | alma_instancia_unica | alma_validar_instancia | Validación o sincronización de alma validar instancia. Revisión funcional pendiente. |
| forja_instancias | instancias_snapshot_config | forja_guardar_snapshot_config | Validación o sincronización de forja guardar snapshot config. Revisión funcional pendiente. |
| forja_maestra | a_combinaciones_plantilla | combinaciones_plantilla | Validación o sincronización de combinaciones plantilla. Revisión funcional pendiente. |
| forja_maestra | a_monstruos_malla | forja_monstruos_malla | Validación o sincronización de forja monstruos malla. Revisión funcional pendiente. |
| forja_maestra | a_monstruos_variantes | forja_validar_variantes_monstruo | Validación o sincronización de forja validar variantes monstruo. Revisión funcional pendiente. |
| forja_maestra | aa_forja_carga_y_clase | forja_validar_carga_y_clase | Validación o sincronización de forja validar carga y clase. Revisión funcional pendiente. |
| forja_maestra | alma_plantilla_unica | alma_plantilla_unica | Validación o sincronización de alma plantilla unica. Revisión funcional pendiente. |
| forja_maestra | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| forja_maestra | forja_validar_configuracion | validar_configuracion_creacion | Validación o sincronización de validar configuracion creacion. Revisión funcional pendiente. |
| forja_maestra | forja_validar_motor | forja_validar_motor | Validación o sincronización de forja validar motor. Revisión funcional pendiente. |
| forja_maestra | forja_validar_tablas_armas | forja_validar_tablas_armas | Validación o sincronización de forja validar tablas armas. Revisión funcional pendiente. |
| forja_maestra | forja_validar_tablero | forja_validar_tablero | Validación o sincronización de forja validar tablero. Revisión funcional pendiente. |
| inventario_jugador | aaa_alma_propiedad | alma_proteger_propiedad | Validación o sincronización de alma proteger propiedad. Revisión funcional pendiente. |
| inventario_jugador | aab_alma_unica | alma_reservar_unica | Validación o sincronización de alma reservar unica. Revisión funcional pendiente. |
| inventario_jugador | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| inventario_jugador | habilidad_sincronizar_entrega | habilidad_sincronizar_entrega | Validación o sincronización de habilidad sincronizar entrega. Revisión funcional pendiente. |
| inventario_jugador | inventario_proteger_equipo | proteger_equipo_activo | Validación o sincronización de proteger equipo activo. Revisión funcional pendiente. |
| inventario_jugador | inventario_snapshot_config | forja_guardar_snapshot_config | Validación o sincronización de forja guardar snapshot config. Revisión funcional pendiente. |
| inventario_jugador | zy_habilidad_preparar_entrega | habilidad_preparar_entrega | Validación o sincronización de habilidad preparar entrega. Revisión funcional pendiente. |
| inventario_jugador | zz_combinaciones_inventario | combinaciones_inventario | Validación o sincronización de combinaciones inventario. Revisión funcional pendiente. |
| inventario_jugador | zz_inventario_requisitos_uso | inventario_validar_requisitos_uso | Validación o sincronización de inventario validar requisitos uso. Revisión funcional pendiente. |
| jugador_mapas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| jugador_vinculos | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| logros_auditoria | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| logros_concesiones | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| logros_yugen | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| logros_yugen | logro_sincronizar_titulo | logro_sincronizar_titulo | Validación o sincronización de logro sincronizar titulo. Revisión funcional pendiente. |
| logros_yugen | logro_validar | logro_validar | Validación o sincronización de logro validar. Revisión funcional pendiente. |
| mapas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| monedas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| movimientos_moneda | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| naturalezas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| naturalezas | naturaleza_validar_motor | naturaleza_validar_motor | Validación o sincronización de naturaleza validar motor. Revisión funcional pendiente. |
| negociaciones_tienda | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| perfiles | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| personaje_naturalezas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| personaje_naturalezas | naturaleza_actualizar | sincronizar_naturaleza | Validación o sincronización de sincronizar naturaleza. Revisión funcional pendiente. |
| personaje_naturalezas | naturaleza_borrar | sincronizar_naturaleza | Validación o sincronización de sincronizar naturaleza. Revisión funcional pendiente. |
| personaje_naturalezas | naturaleza_insertar | sincronizar_naturaleza | Validación o sincronización de sincronizar naturaleza. Revisión funcional pendiente. |
| personajes | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| personajes | personaje_antes_borrar | personaje_antes_borrar | Validación o sincronización de personaje antes borrar. Revisión funcional pendiente. |
| personajes | personaje_archivar | personaje_archivar | Validación o sincronización de personaje archivar. Revisión funcional pendiente. |
| personajes | personaje_vitales | personaje_vitales | Validación o sincronización de personaje vitales. Revisión funcional pendiente. |
| progreso_logros | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| progreso_logros | logro_materializar_titulo | logro_materializar_titulo | Validación o sincronización de logro materializar titulo. Revisión funcional pendiente. |
| registro_experiencia | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| reglas_saqueo | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| reglas_saqueo | validar_bandas_saqueo | validar_bandas_saqueo | Validación o sincronización de validar bandas saqueo. Revisión funcional pendiente. |
| resultados_encuentro | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| salas_arena | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| saldos_usuario | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| saqueos_encuentro | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tablas_botin | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tablas_botin | validar_tabla_botin | validar_tabla_botin | Validación o sincronización de validar tabla botin. Revisión funcional pendiente. |
| tablero_tokens | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tableros | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tiempo_juego | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tienda_items | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tienda_ofertas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tienda_ofertas | tienda_entregar_compra | tienda_entregar_compra | Validación o sincronización de tienda entregar compra. Revisión funcional pendiente. |
| tienda_ofertas | tienda_limpiar_propuesta | tienda_limpiar_propuesta | Validación o sincronización de tienda limpiar propuesta. Revisión funcional pendiente. |
| titulos_obtenidos | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |

## Reconciliación

Las migraciones historial_sin_imagenes y borrar_encuentros_terminados registran definiciones completas ya observadas en producción.
La primera incluye las dos funciones recursivas y los caminos GM/jugador. No ejecuta limpieza retroactiva.
No registrar estas migraciones como ejecutadas hasta comparar definiciones y revisar permisos en una copia.

## Seguridad observada

- resultados_encuentro: lectura de GM.
- saqueos_encuentro: lectura mediante private.resultado_acceso(combate_id).
- eventos_dominio: lectura propia o de GM.
- La revisión de las tres políticas no sustituye pruebas de autorización por identidades.
- Advisors Security: 0 ERROR; avisos WARN para 11 funciones SECURITY DEFINER expuestas a authenticated y protección de contraseñas filtradas desactivada.
- Tres INFO por tablas privadas con RLS sin políticas: mantener acceso denegado al cliente; no crear políticas abiertas para silenciar avisos.
- No revocar las RPC autenticadas sin revisar sus comprobaciones de rol, propiedad y participante.

## Pendiente

Medición de triggers en copia, índices de FK, retención, Advisors Performance, respaldos, región Vercel y revisión completa de RPC.

## Cambios aplicados tras la copia restaurada (2026-11-10)

Descarte atómico de acciones GM, persistencia selectiva de vitales, validación selectiva de mapa y fuentes de botín, salida temprana de arena e índices de las 25 FK sin cobertura. Se conservan las protecciones de recompensas aprobadas, propiedad, vitales y progresión. Advisors Performance ya no muestra FK sin índice. Los avisos RLS y políticas múltiples continúan pendientes de revisión; no se abrieron permisos para silenciarlos.
