Plan maestro: estabilizar, optimizar y dar sentido a las pantallas
Preparado el 10 de noviembre de 2026 · Basado en la revisión del código del proyecto y en el diagnóstico real del combate
0. Cómo usar este documento
Cada fase tiene pasos numerados. Cada paso dice qué hacer, por qué y cuándo se considera terminado («Listo cuando»). Los tiempos son estimaciones a ritmo de media jornada y se pueden mover; el orden no.
Reglas que valen para todo el plan:
• Un cambio grande o una migración a la vez, nunca varios juntos.
• Antes de aplicar algo en producción, probarlo en una copia (Supabase → Branching) o, como mínimo, con un respaldo reciente.
• Medir antes y después con los mismos números (paso 1.1) y anotar el resultado en docs/metricas.
• Si algo falla, primero se revierte y después se investiga.
• Nada de funciones nuevas hasta terminar las fases 1 a 3.
1. Punto de partida
Verificado con datos reales
• Dos combatientes pesaban 9,1 MB por encuentro: 8,2 MB eran el historial de deshacer (10 copias completas) y el resto eran imágenes base64 incrustadas (la ficha de Orin sola pesaba 844 KB).
• Guardar un encuentro tardaba unos 237 ms en la base de datos, repartidos entre 9 triggers. El más caro era aaa_encuentro_validar_ciclo (124 ms).
• No se podían borrar encuentros terminados por una clave foránea on delete restrict en resultados_encuentro.
• Tras la migración del historial sin imágenes, el combate va mucho mejor.
Todavía es hipótesis
• Que los avisos en tiempo real (una fila por perfil en cada guardado) escalen mal con más jugadores.
• Que el bloqueo por acción pendiente en el cliente explique los casos en que no dejaba terminar ni borrar.
• Que el problema de las imágenes base64 exista también en otras tablas.
• El estado real de las pantallas fuera del combate: solo se revisó su estructura, no su uso.
Hecho hasta ahora
• Diagnóstico del combate (diagnostico-combate.sql).
• Migración 20261109000000_historial_sin_imagenes.sql aplicada.
• Migración 20261109010000_borrar_encuentros_terminados.sql: pendiente de confirmar que está aplicada y que borrar funciona.
Fase 0 — Orden y seguridad (día 1)
0.1 Respaldo y rama de trabajo
Exporta o confirma un respaldo en Supabase (Database → Backups) y crea la rama estabilizacion en GitHub. Por qué: todo lo que sigue toca la base de datos. Listo cuando: existe un respaldo con fecha de hoy y la rama creada.
0.2 Que el repositorio cuente la misma historia que la base de datos
Las migraciones nuevas se aplicaron a mano desde el SQL Editor. Cópialas a supabase/migrations/ con su nombre y fecha, haz commit y push. Listo cuando: el repositorio contiene las tres piezas (diagnóstico, historial sin imágenes, borrado de encuentros) y coinciden con lo aplicado.
0.3 Confirmar el estado actual
• Ejecutar la consulta de tamaños de encuentros y comprobar que ninguno pesa varios MB.
• Borrar desde la app los encuentros de prueba y el terminado antiguo («Encuentro en Ambrosía»). Si el borrado falla, pegar el mensaje exacto.
• Listo cuando: solo quedan los encuentros que realmente usas.
0.4 Línea base
Guarda en docs/metricas/linea-base-2026-11-10.md: resultado del bloque 5 del diagnóstico, tamaño de datos y tiempos de F12 → Network de combate_guardar_accion y combate_consultar_ligero. Listo cuando: el archivo existe en el repositorio.
0.5 Higiene del repositorio
• .gitignore debe incluir node_modules, .next, .vercel y todos los .env*.
• No subir archivos comprimidos (.rar, .zip) al repositorio.
• Buscar claves en el código (service_role, sk-, secret). Si aparece alguna, rotarla en Supabase u OpenAI antes de seguir.
• Listo cuando: una búsqueda en todo el repositorio no devuelve ninguna clave privada.
Fase 1 — Combate rápido y confiable (semana 1)
El combate es el centro de una sesión. Mientras no esté sólido, ninguna otra pantalla importa.
1.1 Medición estándar y presupuestos
Siempre se miden tres cosas: (a) el bloque 5 del diagnóstico (tiempo de cada trigger), (b) el tamaño de datos del encuentro, (c) F12 → Network, filtro rpc: tiempo y tamaño de cada llamada.
Presupuestos que se deben cumplir:
• Acción de combate, de extremo a extremo: menos de 500 ms en el 95 % de los casos.
• datos del encuentro: menos de 200 KB.
• Respuesta de combate_consultar_ligero: menos de 150 KB.
• Suma de todos los triggers al guardar: menos de 40 ms.
1.2 Imágenes fuera de la base de datos
Es la mejora más grande que queda. Las imágenes base64 viven dentro de los JSON de personajes, forja y transformaciones, y viajan en cada lectura.
• a. Auditoría. Contar por tabla cuántas filas contienen data:image. Pídeme el script y lo preparo para recorrer todas las columnas de texto y JSON del esquema public.
• b. Bucket. Crear en Supabase Storage un bucket imagenes: lectura pública, escritura solo para usuarios autenticados en su carpeta user_id/, límite de 500 KB por archivo y solo webp o png.
• c. Cliente. En lib/imagenes-creacion.ts (donde hoy se comprime la portada) subir el archivo al bucket y guardar solo la URL. Mantener la compresión actual.
• d. Migrar lo existente. Script de una sola vez que lee cada fila con base64, sube la imagen y reemplaza el valor por la URL. Cubre portadas de personajes, forja y etapas de transformación. Se prueba primero en una copia.
• e. Combate. Los encuentros nuevos solo copian URLs. Las funciones imagenes_extraer e imagenes_restaurar quedan un tiempo como red de seguridad.
• Listo cuando: la auditoría devuelve 0 filas con base64 y un encuentro de 2 combatientes pesa menos de 100 KB.
1.3 Que nada bloquee terminar o borrar un encuentro
Hoy una acción pendiente (guardada en sessionStorage) desactiva el resto de acciones, incluidas terminar y borrar.
• Revisar lib/useAccionSegura.ts y app/dm/combate/page.tsx.
• Terminar y borrar usan su propio camino y, si hay una acción sin confirmar, muestran un aviso con dos botones: «Reintentar» y «Descartar».
• «Descartar» consulta primero al servidor para saber si la acción llegó a aplicarse.
• Listo cuando: provocando un corte de red a mitad de acción se puede igualmente terminar y borrar el encuentro.
1.4 Triggers del combate
Primero se repite el bloque 5 con las imágenes ya fuera. Después se ataca lo que siga alto, una migración por trigger y con medición antes y después:
• combate_persistir_vitales: salida temprana si no cambió vida, recursos, fase ni miembros; evitar comparar x.id::text fila por fila.
• aaa_encuentro_validar_ciclo: no comparar el datos completo; comparar solo fase y campos protegidos.
• arena_actualizar: ejecutar solo si el encuentro es de arena.
• combate_inicio_aviso y combate_fin_aviso: salida temprana si la fase no cambió.
• Listo cuando: la suma de triggers está por debajo de 40 ms.
1.5 Avisos en tiempo real
Hoy cada guardado actualiza una fila por cada perfil y los clientes vuelven a leer. Plan: emitir solo a GM y participantes del encuentro, y que useTiempoReal y useSincronizacionCombate recarguen solo el encuentro afectado. Listo cuando: con 5 jugadores conectados, una acción provoca como máximo una lectura por cliente.
1.6 Región y latencia
Comprobar que la región del proyecto de Supabase y la región de las funciones de Vercel coinciden o están cerca. Si no, alinearlas. Listo cuando: la latencia base de una consulta simple es menor de 100 ms.
1.7 Prueba de sesión completa
Con un GM y dos jugadores reales, ejecutar este guion y anotar el tiempo de cada paso: crear encuentro, unir jugadores, iniciar, mover, atacar, usar una habilidad, usar un objeto, deshacer, terminar, aprobar recompensas, borrar. Listo cuando: todos los pasos cumplen el presupuesto tres veces seguidas.
Fase 2 — Base de datos y calidad (semana 2)
2.1 Inventario de triggers
Ejecutar select event_object_table, trigger_name, action_timing, event_manipulation from information_schema.triggers where trigger_schema = 'public' order by 1; y documentar el resultado en docs/base-de-datos.md: qué hace cada trigger y por qué existe. Decidir cuáles sobran o pueden unirse. Listo cuando: cada trigger tiene una línea de propósito.
2.2 Dejar de parchear funciones con reemplazos de texto
Varias funciones críticas se modificaron con reemplazos sobre su definición, lo que las hace frágiles. Crear una migración de consolidación con la definición completa de combate_guardar_ligero, confirmar_jugador_rapido y combate_eliminar, con sus pruebas. Listo cuando: el repositorio tiene una sola definición legible de cada una.
2.3 Índices y avisos de Supabase
En el panel, Database → Advisors (Performance y Security): resolver los avisos marcados y añadir índice a las claves foráneas que no lo tengan. Listo cuando: los avisos críticos están en cero.
2.4 Retención automática
Con pg_cron, una tarea semanal que borre recibos antiguos de private.combate_acciones (más de 7 días), registros viejos de combate_actualizaciones y avisos_actualizacion, y que avise de encuentros terminados sin aprobar con más de 30 días. Listo cuando: las tablas de apoyo no crecen sin límite.
2.5 Pruebas automáticas
Los tests tests/*-database.mjs necesitan una base Postgres. Ejecutarlos en GitHub Actions con un servicio Postgres, junto con el chequeo de tipos y npm test, en cada push. Listo cuando: un push con un fallo intencionado se bloquea.
2.6 Seguridad
Revisar las políticas RLS de las tablas más recientes (resultados_encuentro, saqueos_encuentro, eventos_dominio) y confirmar que en el cliente solo está la clave anónima. Listo cuando: Advisors → Security no muestra errores.
2.7 Despliegue
Vercel con vista previa por rama, variables de entorno separadas para pruebas y producción, y un procedimiento de reversión escrito. Listo cuando: puedes volver a la versión anterior en menos de 5 minutos.
Fase 3 — Dar sentido a las pantallas (semanas 3 y 4)
3.1 Definir el recorrido de una sesión
Una sesión tiene dos recorridos que deben quedar escritos en docs/ciclo-juego.md:
• GM: preparar el mundo (personajes, forja, mercado) → abrir la sesión (panel, party) → combate → repartir recompensas y experiencia → cerrar.
• Jugador: entrar → ver su personaje (habilidades, equipamiento, inventario) → combate → tiradas → recibir recompensas y experiencia → tienda.
Cada pantalla debe responder a un paso de uno de estos recorridos. Si no responde a ninguno, se aplaza.
3.2 Clasificar cada pantalla (propuesta inicial, corrígela)
Los propósitos se infirieron por el nombre de cada ruta; confírmalos al revisar.
Núcleo (se pulen primero):
• Comunes: login.
• GM: dm/panel, dm/combate, dm/tablero, dm/personajes, dm/recompensas.
• Jugador: ficha/creacion, ficha/personaje, ficha/habilidades, ficha/equipamiento, ficha/inventario, ficha/combate.
Apoyo (después del núcleo):
• GM: dm/party, dm/forja, dm/mercado, dm/experiencia.
• Jugador: ficha/party, ficha/tiradas, ficha/mapas, ficha/tienda, ficha/experiencia.
Más adelante (detrás de un interruptor):
• dm/arbol, dm/reglas, dm/deudas, dm/tienda-almas.
• ficha/alma, ficha/tienda-almas, ficha/arena, ficha/codex, ficha/lore, ficha/logros, ficha/deudas, ficha/personajes.
3.3 Auditoría de cada pantalla
Para cada pantalla, en este orden (núcleo, luego apoyo, luego el resto), responder y anotar en docs/pantallas.md:
• ¿A qué paso del recorrido sirve y quién la usa?
• ¿Qué datos lee y cuántas consultas hace? (F12 → Network)
• ¿Qué acciones permite y cuáles fallan o son confusas?
• ¿Tiene estado de carga, vacío y error?
• ¿Funciona bien en móvil?
• ¿Cuánto tarda en estar usable?
• Decisión: mantener, simplificar, fusionar, esconder o eliminar.
3.4 Navegación agrupada (propuesta)
• GM: Sesión (panel, combate, tablero, party), Mundo (personajes, forja, mercado, tienda de almas, reglas), Economía (recompensas, experiencia, deudas), Avanzado (árbol).
• Jugador: Mi personaje (personaje, habilidades, equipamiento, inventario, alma), En sesión (combate, tiradas, party, mapas, arena), Mundo (tienda, códice, lore, logros), Cuenta (experiencia, deudas).
Listo cuando: cualquier función se encuentra en como máximo dos clics.
3.5 Fusionar, esconder o aplazar
Candidatas a revisar con datos de la auditoría: dm/panel frente a dm/tablero; ficha/personaje frente a ficha/personajes; dm/experiencia frente a dm/recompensas; las dos pantallas de tienda de almas frente a ficha/alma. Lo que quede en «Más adelante» se muestra solo si el GM activa su interruptor.
3.6 Estados y mensajes coherentes
Toda pantalla muestra cargando, vacío y error con botón de reintento. Textos en español, mensajes claros, sin pantallas en blanco ni errores técnicos crudos.
3.7 Rendimiento fuera del combate
Contar las consultas por pantalla, evitar select *, paginar listas largas, cargar imágenes de forma diferida y no traer más datos de los que se ven. Presupuesto: pantalla usable en menos de 2 segundos con conexión normal.
3.8 Móvil y accesibilidad
Probar el tablero y la ficha en móvil, con botones táctiles de al menos 44 px, contraste suficiente y uso básico con teclado.
Fase 4 — Funciones nuevas (solo después de las fases 1 a 3)
Candidatas, para elegir contigo:
• Reglas automáticas para obtener Puntos Kuro (hoy los asigna el GM, ya figura como pendiente).
• Resumen y registro de sesión exportable.
• Modo espectador del combate.
• Temporizador de turno visible.
• Aviso de «es tu turno».
• Copia de seguridad y exportación de la campaña.
Una función nueva solo entra si cumple los cinco puntos: ayuda al recorrido central, se midió su coste en el combate, tiene su pantalla definida, tiene pruebas y respeta los presupuestos.
Fase 5 — Calidad continua
• 5.1 Monitoreo. Registros de Vercel y de Supabase, y el panel de métricas del GM. Opcional: Sentry para errores.
• 5.2 Guía «el combate va lento». (1) Ejecutar diagnostico-combate.sql. (2) Revisar el tamaño de datos. (3) Repetir el bloque 5. (4) Mirar las sesiones activas. (5) Decidir y medir de nuevo.
• 5.3 Ritual semanal de 30 minutos. Revisar métricas, borrar encuentros viejos y actualizar pendientes.md.
• 5.4 Documentación viva. Cada cambio de pantalla o de base de datos actualiza docs/pantallas.md o docs/base-de-datos.md.
Hoja de ruta resumida
• Semana 1: Fase 0 completa y Fase 1 (pasos 1.1 a 1.4).
• Semana 2: pasos 1.5 a 1.7 y Fase 2.
• Semanas 3 y 4: Fase 3, empezando por las pantallas del núcleo.
• Semana 5 en adelante: Fase 4 una función a la vez, y Fase 5 de forma continua.
Plantilla para docs/pendientes.md
Ahora (máximo 3): las tareas de la fase en curso.
Siguiente: lo que viene después, en orden.
Más adelante: ideas aceptadas pero sin fecha.
Hecho: lo terminado, con fecha y la medición de antes y después.
Cuándo se puede decir que el proyecto está en buen estado
• Una acción de combate cumple el presupuesto de forma constante con GM y jugadores reales.
• Se puede terminar y borrar cualquier encuentro (salvo los protegidos por recompensas oficiales) sin errores.
• No quedan imágenes base64 dentro de la base de datos.
• Cada pantalla tiene un propósito escrito, estados de carga, vacío y error, y funciona en móvil.
• Existe una hoja de ruta actualizada y las pruebas se ejecutan solas en cada cambio.
