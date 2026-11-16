# Base de datos — inventario observado el 10 de noviembre de 2026

Proyecto RealYugen, PostgreSQL 17, región us-west-2. Se incluyen triggers de usuario de public; se excluyen internos de FK.
No se ha eliminado ni modificado ningún trigger durante el inventario.

## Triggers

Propósitos revisados el 16 de noviembre de 2026 leyendo la definición más reciente de cada función en supabase/migrations. Paso 2.1 del plan: cada trigger tiene una línea de propósito.
Las nueve funciones de combate se conservan íntegramente en el diagnóstico de origen; no se atribuyen tiempos sin medirlos.

| Tabla | Trigger | Función | Propósito |
|---|---|---|---|
| arbol_nodos | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| articulos_alma | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| categorias_forja | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| categorias_forja | categorias_forja_validar_padre | validar_padre_categoria_yugen || Impide ciclos en la herencia de categorías (una categoría no hereda de sí misma ni de sus descendientes); serializa con bloqueo consultivo. |
| categorias_forja | validar_pasiva_racial | validar_pasiva_racial || Solo Kuroi puede configurar la pasiva racial de una categoría; valida su estructura y reglas. |
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
| eventos_dominio | logros_evento | logros_evento || Al registrar un evento de dominio (EXP, derrota de enemigo) suma progreso a los logros activos que cumplan nivel, campaña y condiciones; ignora entrenamiento. |
| forja_instancias | alma_instancia_unica | alma_validar_instancia || Comprueba que la creación de origen de una instancia preparada no esté ligada al alma (copia única). |
| forja_instancias | instancias_snapshot_config | forja_guardar_snapshot_config || Congela en la copia (instancia o inventario) la configuración de la plantilla de Forja y suma bonos de equipo a personajes; respeta la restauración de consumibles del combate. |
| forja_maestra | a_combinaciones_plantilla | combinaciones_plantilla || Añade a una plantilla de personaje las habilidades combinadas de desbloqueo automático cuyos requisitos ya cumple (hasta 20 pasadas). |
| forja_maestra | a_monstruos_malla | forja_monstruos_malla || Las creaciones de la rama Monstruos se fuerzan a personaje en malla con al menos un rango; valida la configuración de invocación. |
| forja_maestra | a_monstruos_variantes | forja_validar_variantes_monstruo || Valida las variantes de una especie de Monstruos: máximo 30, nombres e ids únicos, peso 1–1000, bonos y equipo válidos. |
| forja_maestra | aa_forja_carga_y_clase | forja_validar_carga_y_clase || Valida requisitos de uso, que el personaje cumpla los de sus habilidades y equipo, y recalcula carga y clase (F…KUROI) según la puntuación. |
| forja_maestra | alma_plantilla_unica | alma_plantilla_unica || Protege plantillas ligadas al alma: no se borran ni desligan con copia reservada y solo se ligan si hay como máximo una copia fuera de combate. |
| forja_maestra | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| forja_maestra | forja_validar_configuracion | validar_configuracion_creacion || Valida categoría y tipo de creación, espacio de equipo y hasta 20 acciones de dados, incluidas manos y armas. |
| forja_maestra | forja_validar_motor | forja_validar_motor || Valida reglas del motor (máx. 40 y 200 KB): evento, costes, enfriamiento, condición y 1–50 efectos por regla. |
| forja_maestra | forja_validar_tablas_armas | forja_validar_tablas_armas || Valida la tabla de armas de cada acción de dados. |
| forja_maestra | forja_validar_tablero | forja_validar_tablero || Valida alcance, áreas y movimiento en tablero de cada acción de dados. |
| inventario_jugador | aaa_alma_propiedad | alma_proteger_propiedad || Pertenencias ligadas al alma: solo Kuroi las borra o cambia de dueño; al entregarse llegan al baúl y solo se asignan a personajes vivos y aprobados del mismo usuario. |
| inventario_jugador | aab_alma_unica | alma_reservar_unica || Reserva la copia única de una creación ligada al alma en forja_almas_unicas y rechaza una segunda copia; la entrega llega al baúl. |
| inventario_jugador | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| inventario_jugador | habilidad_sincronizar_entrega | habilidad_sincronizar_entrega || Tras entregar o activar una habilidad/pasiva, resincroniza las habilidades del personaje afectado (y del anterior si cambió). |
| inventario_jugador | inventario_proteger_equipo | proteger_equipo_activo || Bloquea cambios de equipo o de dueño de un objeto mientras su personaje está en un combate en curso, salvo desde el flujo interno de equipo. |
| inventario_jugador | inventario_snapshot_config | forja_guardar_snapshot_config || Congela en la copia (instancia o inventario) la configuración de la plantilla de Forja y suma bonos de equipo a personajes; respeta la restauración de consumibles del combate. |
| inventario_jugador | zy_habilidad_preparar_entrega | habilidad_preparar_entrega || Al asignar una habilidad/pasiva a un personaje vivo y aprobado, decide si queda activa según sus requisitos de raza, atributos y nivel. |
| inventario_jugador | zz_combinaciones_inventario | combinaciones_inventario || Tras cambios de inventario, recalcula combinaciones aprendidas y habilidades del personaje nuevo y del anterior; evita recursión. |
| inventario_jugador | zz_inventario_requisitos_uso | inventario_validar_requisitos_uso || Rechaza equipar o activar una habilidad si el personaje no cumple los requisitos de raza, atributos o nivel. |
| jugador_mapas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| jugador_vinculos | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| logros_auditoria | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| logros_concesiones | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| logros_yugen | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| logros_yugen | logro_sincronizar_titulo | logro_sincronizar_titulo || Copia nombre, título, imagen e icono del logro a cada progreso cuando cambian en el logro. |
| logros_yugen | logro_validar | logro_validar || Exige un título aprobado de la Forja y valida textos, imagen, condiciones (nivel, rondas, sin caer) del logro. |
| mapas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| monedas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| movimientos_moneda | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| naturalezas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| naturalezas | naturaleza_validar_motor | naturaleza_validar_motor || Solo Kuroi edita naturalezas; valida pasivas, habilidades y reglas (máx. 200 KB) contra creaciones aprobadas. |
| negociaciones_tienda | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| perfiles | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| personaje_naturalezas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| personaje_naturalezas | naturaleza_actualizar | sincronizar_naturaleza || Por confirmar: la función solo existe en producción y no está en supabase/migrations. Recuperar su definición con pg_get_functiondef antes de tocarla. |
| personaje_naturalezas | naturaleza_borrar | sincronizar_naturaleza || Por confirmar: la función solo existe en producción y no está en supabase/migrations. Recuperar su definición con pg_get_functiondef antes de tocarla. |
| personaje_naturalezas | naturaleza_insertar | sincronizar_naturaleza || Por confirmar: la función solo existe en producción y no está en supabase/migrations. Recuperar su definición con pg_get_functiondef antes de tocarla. |
| personajes | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| personajes | personaje_antes_borrar | personaje_antes_borrar || Solo Kuroi borra personajes y nunca en combate activo; antes devuelve al baúl lo ligado al alma y borra el resto del inventario exclusivo. |
| personajes | personaje_archivar | personaje_archivar || Al morir un personaje guarda una instantánea (ficha, inventario, árbol, naturalezas) en el cementerio y devuelve al baúl lo ligado al alma. |
| personajes | personaje_vitales | personaje_vitales || Limita vida, PH y fatiga a sus máximos; impide editar atributos en combate activo y cambios sobre personajes del cementerio. |
| progreso_logros | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| progreso_logros | logro_materializar_titulo | logro_materializar_titulo || Copia los datos del logro al progreso y, al desbloquearse, entrega la copia del título de la Forja al inventario. |
| registro_experiencia | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| reglas_saqueo | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| reglas_saqueo | validar_bandas_saqueo | validar_bandas_saqueo || Exige cinco bandas de calidad consecutivas que cubran del 1 al 20. |
| resultados_encuentro | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| salas_arena | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| saldos_usuario | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| saqueos_encuentro | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tablas_botin | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tablas_botin | validar_tabla_botin | validar_tabla_botin || Valida entradas de botín (ids únicos, cantidad, peso, calidad, probabilidad, nivel y objetos aprobados) y actualiza updated_at. |
| tablero_tokens | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tableros | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tiempo_juego | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tienda_items | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tienda_ofertas | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |
| tienda_ofertas | tienda_entregar_compra | tienda_entregar_compra || Al aceptarse una oferta entrega la compra: crea el personaje con sus componentes o copia el objeto al inventario del comprador. |
| tienda_ofertas | tienda_limpiar_propuesta | tienda_limpiar_propuesta || Borra el texto privado de la propuesta cuando la oferta vuelve a estar disponible o se retira. |
| titulos_obtenidos | avisar_actualizacion | avisar_actualizacion | Invalida lecturas de las tablas suscritas mediante avisos generales. |

## Triggers que sobran o pueden unirse (decisión del paso 2.1)

Propuestas; ninguna se aplica sin medir antes y después en una copia (una migración por cambio):

- inventario_jugador: `habilidad_sincronizar_entrega` y `zz_combinaciones_inventario` llaman ambos a `private.habilidades_sincronizar` en la misma fila. Unirlos en uno solo evita la segunda pasada.
- forja_maestra: `forja_validar_tablas_armas` y `forja_validar_tablero` recorren de nuevo `configuracion_dados`, que ya recorre `forja_validar_configuracion`. Pueden pasar a ser llamadas dentro de esa función.
- personaje_naturalezas: tres triggers (`naturaleza_insertar`, `naturaleza_actualizar`, `naturaleza_borrar`) con la misma función; uno solo `after insert or update or delete` basta.
- `sincronizar_naturaleza`: recuperar su definición de producción y versionarla antes de cualquier cambio.
- El resto cumple una función distinta y se conserva.

## Retención (paso 2.4)

Migración `20261116120000_retencion_semanal.sql`, probada en `tests/retencion-database.mjs`. `private.retencion_ejecutar()` borra recibos de `private.combate_acciones` y descartes con más de 7 días, y avisos de `combate_actualizaciones` de encuentros inexistentes o terminados hace más de 7 días. `avisos_actualizacion` no crece (una fila por perfil). Los encuentros terminados sin aprobar con más de 30 días no se borran: se anotan en `private.retencion_registro` (últimos 52) y el GM los consulta con `retencion_estado()`. Si pg_cron está disponible se programa los lunes a las 04:17 UTC (`yugen-retencion-semanal`).

**Estado: sin aplicar en producción.** Antes: ensayar en copia, contar filas que borraría y comprobar con `select * from cron.job` que la tarea quedó registrada.

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

Medición de triggers en copia, aplicar retención en producción, consolidación de funciones (paso 2.2), Advisors Performance (RLS y políticas múltiples) y región Vercel. Índices de FK, respaldos y revisión de RPC ya están hechos (ver avance del 14 de noviembre).

## Cambios aplicados tras la copia restaurada (2026-11-10)

Descarte atómico de acciones GM, persistencia selectiva de vitales, validación selectiva de mapa y fuentes de botín, salida temprana de arena e índices de las 25 FK sin cobertura. Se conservan las protecciones de recompensas aprobadas, propiedad, vitales y progresión. Advisors Performance ya no muestra FK sin índice. Los avisos RLS y políticas múltiples continúan pendientes de revisión; no se abrieron permisos para silenciarlos.
