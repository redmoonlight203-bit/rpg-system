# Guía rectora de YUGEN v2

Fuente única del orden de trabajo. La evaluación original es del 12 de noviembre; no representa mediciones actuales. La ejecución y sus límites se actualizan en [avance del 14 de noviembre](metricas/avance-2026-11-14.md).

## Decisiones de ejecución del 14 de noviembre

- Versión oficial: `main`, coincidente con el despliegue verificado `7edfa4c9310ec36dffcf502d0c158006a33dda60`. `master` conserva 10 commits divergentes, con 186 exclusivos en `main`; se conservan ambas historias mientras se cambia la configuración predeterminada. La herencia de atributos de `master` ya existe en `main`.
- 0 HP: inconsciencia. La muerte es explícita del GM y conserva las reglas de alma y cementerio. No se reviven personajes históricos como parte de esta corrección.
- Encuentros terminados: cierre definitivo y compactación del historial técnico. Resultados, EXP y botín permanecen protegidos.
- Expansiones y prioridades 4–5 congeladas hasta cerrar Etapa 1 con evidencia. La primera expansión prevista sigue siendo el laboratorio.

## Tres prioridades activas

1. Estabilidad y versión: respaldo, restauración, reversión, alineación de migraciones y pruebas.
2. Rendimiento y seguridad: compactación, imágenes, autorización de RPC y métricas reales.
3. Integración: tres partidas con un GM y dos jugadores y persistencia de recursos y recompensas.

## Contenido de la guía recibida

El siguiente texto conserva los hallazgos y tareas del documento original; sus cifras son históricas. El registro fechado de avance distingue lo ejecutado, lo preparado y lo pendiente.

DOCUMENTO RECTOR  /  PLAN DE TRABAJO

YUGENEvaluación de la aplicacióny hoja de ruta de desarrollo

Estado del producto, sistemas disponibles, problemas críticos, mejoras y expansiones propuestas.

| CORTE DE EVALUACIÓN12 de noviembre de 2026 | REFERENCIA TÉCNICArpg-system / rama main |
| --- | --- |

Propósito

Este documento transforma la evaluación de YUGEN en una guía de desarrollo. Mantiene los hallazgos, las funciones ya desarrolladas, los riesgos y las propuestas identificadas. Incorpora tareas verificables para controlar el avance sin confundir código implementado con funcionamiento demostrado.

Alcance y límites

Base: revisión del repositorio GitHub, documentación técnica y consultas de solo lectura a Supabase. No equivale a una prueba de la interfaz en producción ni a una sesión completa con varios jugadores. Las nuevas ideas se presentan como propuestas, nunca como funciones existentes.

Revisión v2 (12 de noviembre de 2026): conserva el contenido original y añade, marcado como «nuevo», una lectura rápida, las causas medidas del peso de los encuentros, opciones para la regla de 0 HP, pasos de seguridad, un orden de trabajo con plazos orientativos, lecciones del proceso, objetivos medibles y decisiones propuestas.

| PRINCIPIO DEL PROYECTO Primero garantizar que una partida completa funcione bien. Después simplificar el uso y ampliar la libertad de creación y exploración. |
| --- |

Índice de trabajo

00  Lectura rápida (nuevo)

01  Diagnóstico y estado general

02  Inventario funcional actual

03  Fortalezas implementadas

04  Problemas y riesgos identificados

05  Prioridades de mejora

06  Expansiones propuestas

07  Hoja de ruta por etapas

08  Guion de validación de una partida

09  Registro de seguimiento y criterios de cierre

10  Lecciones del proceso (nuevo)

11  Objetivos medibles (nuevo)

12  Decisiones propuestas (nuevo)

13  Fuentes y notas de alcance

| CÓMO UTILIZAR ESTA GUÍA Usar la etapa 1 como puerta de entrada. No dar por finalizada una funcionalidad solo porque existe un archivo, una migración o una prueba sintética: cerrar cada tarea cuando haya evidencia reproducible y un resultado real aceptable. |
| --- |

## 00. Lectura rápida (nuevo)

Estado en una frase: YUGEN tiene mucho construido y el combate ya mejoró tras las correcciones de peso y bloqueos, pero ninguna mejora está todavía certificada con una sesión completa medida.

| TRES RIESGOS QUE MANDAN 1. Versión desplegada sin confirmar: main está 177 commits por delante de la rama predeterminada (master). 2. Sin prueba de extremo a extremo medida: falta el guion del apartado 08 con un GM y dos jugadores, con tiempos. 3. Datos pesados que no se pueden limpiar: un encuentro aprobado es inmutable y pesa unos 5,5 MB; quedan 4 portadas de Forja y 3 registros de inventario con imágenes incrustadas. |
| --- |

| TRES PRÓXIMOS PASOS 1. Confirmar el commit desplegado y ensayar el respaldo (apartados 05 y 07). 2. Medir 30 acciones reales y registrar p95 y tamaños (apartado 11). 3. Ejecutar el guion de partida tres veces seguidas (apartado 08). |
| --- |

Las funciones nuevas del apartado 06 quedan congeladas hasta cerrar la Etapa 1 con evidencia.

## 01. Diagnóstico y estado general

YUGEN tiene una base considerable para convertirse en una plataforma de rol completa. Su principal necesidad no es acumular más pantallas, sino conseguir que los sistemas existentes funcionen juntos con rapidez, claridad y consistencia.

| Dimensión | Evaluación | Lectura práctica |
| --- | --- | --- |
| Amplitud funcional | Alta | Existen módulos de creación, combate, mapas, progresión y economía. |
| Validación real | Incompleta | No se ha acreditado una sesión completa con GM y varios jugadores. |
| Prioridad inmediata | Combate | Rendimiento, persistencia, reconexión y acciones seguras. |
| Mayor oportunidad | Integración | Conectar Forja, reglas, personaje, combate y recompensas. |

Divergencia de ramas

El repositorio mantiene master como rama predeterminada, pero main conserva una versión mucho más avanzada. En el corte revisado, main tenía 177 commits que no estaban en master y master mantenía 10 commits divergentes. La evaluación toma main como referencia técnica y exige comprobar la rama efectiva utilizada por Vercel y las herramientas de desarrollo.

☐   Identificar la rama y el commit desplegados en producción y en cada vista previa.

☐   Definir una única rama fuente para el desarrollo y un procedimiento de integración para los cambios divergentes.

☐   Registrar versión de app y versión de base de datos al verificar cada entrega.

## 02. Inventario funcional actual

Estado de implementación: describe lo encontrado en código, documentación o migraciones. No representa una prueba funcional completa.

| Sistema | Estado | Principal verificación |
| --- | --- | --- |
| Acceso, cuentas y roles | Implementado | Revalidar permisos de cada rol. |
| Forja y Yunque | Muy desarrollado | Simplificar creación avanzada y combinaciones. |
| Estadísticas y reglas | Implementado | Comprobar herencias y atributos en casos reales. |
| Personajes | Implementado | Validar vida, recursos, muerte y cementerio. |
| Combate por turnos | Implementado; pruebas parciales | Optimizar y medir sesiones multijugador. |
| Party y compañeros | Implementado | Sin compañeros registrados; validar integración. |
| Monstruos e invocaciones | Implementado | Probar variantes, equipamiento y efectos combinados. |
| Mapas procedurales | Desarrollado | Ampliar atlas y validar editor real. |
| Animaciones y efectos | Catálogo integrado | Probar origen, trayectoria e impacto. |
| Inventario y equipamiento | Implementado | Ensayar cambios simultáneos y persistencia. |
| Tiendas y monedas | Infraestructura disponible | Escaso uso real registrado. |
| Alma y cementerio | Implementado | Verificar unicidad y muerte permanente. |
| Experiencia, logros y títulos | Motor desarrollado | Falta progresión real registrada. |
| Diseño móvil | Adaptaciones implementadas | Pendiente prueba en teléfonos reales. |

## 03. Fortalezas implementadas

### 3.1 Forja y Yunque

Permiten definir habilidades y efectos, acciones, pasivas, requisitos, transformaciones, invocaciones y equipamiento. Incluyen herramientas visuales, variantes de monstruos y creaciones únicas ligadas al alma. La mejora más valiosa es reducir el esfuerzo necesario para combinar estas capacidades.

### 3.2 Motor de combate

Ya contempla iniciativa, PH, Fatiga, elementos, defensas, daño, estados, equipamiento, invocaciones, turnos y resultados. Utiliza identificadores de acción para evitar duplicaciones, además de mecanismos de consulta, reintento y reconexión. La lógica es extensa, pero todavía falta acreditarla en condiciones normales de partida.

### 3.3 Mapas y escenarios

El primer atlas exterior incluye 89 recortes clasificados y perfiles de bosques, senderos, pueblos abandonados y ruinas. El sistema ofrece superficies, caminos, obstáculos, cobertura, terreno difícil, tejados y un editor visual de escenarios. Quedan pendientes atlas adicionales y una auditoría completa de la experiencia visual.

### 3.4 Animaciones

La documentación registra 167 efectos únicos con fases de lanzamiento, desplazamiento o proyectil, impacto, auras y transformaciones. El diseño diferencia el origen del lanzador de la casilla golpeada. Esto necesita una prueba de regresión visual para comprobar que se cumple en todas las combinaciones.

## 04. Problemas y riesgos identificados

### 4.1 Peso excesivo de un encuentro

| Indicador | Observación |
| --- | --- |
| Encuentro antiguo | Aproximadamente 5,50 MB en Supabase. |
| Objetivo de proyecto | Menos de 200 KB por encuentro. |
| Desviación | Aproximadamente 27,5 veces el objetivo. |
| Imágenes incrustadas | 1 encuentro, 4 portadas de Forja y 3 registros de inventario identificados en la consulta. |
| Medición pendiente | Latencia p95 HTTP y prueba con GM y jugadores reales. |

La migración de imágenes a Storage no estaba completamente terminada. La solución debe preservar resultados oficiales, mantener el historial y evitar reemplazos inseguros de recursos que pertenecen a la campaña.

### 4.2 Interpretación de 0 HP, inconsciencia y muerte

Existe una discrepancia que debe verificarse: la lógica de situación del motor trata 0 HP como inconsciencia cuando no hay un estado explícito, mientras que documentación de vida permanente describe una transición a muerte y cementerio. No se afirma que el juego esté aplicando una muerte equivocada; se exige fijar y probar una única regla de transición, con las excepciones de campaña correspondientes.

### 4.3 Sistemas poco ejercitados

Supabase mostraba 21 categorías de Forja, 96 configuraciones de estadísticas, 14 creaciones y 3 personajes. Varias tablas de compañeros, logros, experiencia y economía no reflejaban uso real. La ausencia de filas no prueba un defecto; demuestra que faltan recorridos completos para validar la integración.

### 4.4 Seguridad

El proyecto de Supabase está activo y las tablas públicas consultadas tienen RLS. Los avisos de seguridad mostraban 12 funciones SECURITY DEFINER ejecutables por usuarios autenticados y protección de contraseñas filtradas desactivada. Cada función privilegiada debe revisarse según su autorización interna antes de considerarla segura.

### 4.5 Peso real de un encuentro: causas y estado de las correcciones (nuevo)

Medición del 10 de noviembre de 2026, antes de aplicar las correcciones. Son datos de ese momento, no el estado actual.

| Indicador | Observación |
| --- | --- |
| Encuentro activo (2 combatientes) | 9,1 MB. |
| Historial de deshacer | 8,2 MB (90 %): 10 copias completas del encuentro, cada una con sus imágenes. |
| Combatientes | 0,9 MB. La ficha de uno pesaba 844 KB: 700 KB de habilidades (692 KB en las etapas de una transformación) y 141 KB de imagen en base64. |
| Guardado en base de datos | 237 ms en una medición aislada. El trigger de validación del ciclo tardaba 124 ms y había 9 triggers por guardado. |
| Causa de «no se puede borrar» | Una clave foránea del resultado del encuentro impedía borrar encuentros terminados. |
| Correcciones en el repositorio | Historial sin imágenes (puntero y tabla privada), borrado de encuentros terminados salvo con recompensas oficiales o logros auditados, descarte de acciones pendientes, triggers selectivos, índices en claves foráneas y bucket de Storage preparado. |
| Pendiente real | Un encuentro aprobado es inmutable (el trigger del ciclo rechaza cualquier cambio en sus datos) y su borrado está protegido: sus 5,5 MB no pueden reducirse con las reglas actuales. |

Propuesta técnica: excluir el campo historial de la comprobación de inmutabilidad y compactarlo (vaciarlo) en los encuentros aprobados. El historial solo sirve para deshacer y, una vez aplicado el progreso, deshacer ya no está permitido; por tanto no se pierde ninguna función ni resultado oficial. Conviene vaciarlo también al finalizar cada encuentro para que no vuelva a crecer. Debe probarse en una copia y con las pruebas de base de datos antes de aplicarse.

Imágenes restantes, orden seguro de migración a Storage:

☐   Auditar qué filas contienen imágenes incrustadas y anotar su identificador.

☐   Subir cada imagen y comprobar que su dirección pública responde.

☐   Reemplazar en una copia de la base de datos y revisar visualmente ficha, forja e inventario.

☐   Aplicar en producción dentro de una transacción y repetir la auditoría.

☐   Conservar el valor original hasta confirmar que todo se ve igual.

### 4.6 Regla de 0 HP: opciones y pruebas (nuevo)

El motor ya reserva al GM la decisión de marcar una muerte o la neutralidad, lo que apunta a que 0 HP significa inconsciencia y que la muerte es una decisión explícita. La documentación de vida permanente describe otra cosa. Se propone elegir una de estas opciones:

| Opción | Qué significa | Consecuencia |
| --- | --- | --- |
| A · Inconsciencia (recomendada) | 0 HP deja al personaje inconsciente. La muerte la decide el GM o una regla de campaña; al morir pasa a alma y cementerio. | Coherente con el motor actual, permite rescates y curación, y exige una regla clara para morir. |
| B · Muerte inmediata | 0 HP es muerte, con paso automático a alma y cementerio. | Simple y dura; obliga a cambiar la lógica de situación y puede resultar castigadora. |
| C · Configurable por encuentro | Un ajuste en la política del encuentro (inconsciencia o muerte), con A como valor por defecto. | Más flexible; añade un ajuste y pruebas para ambas ramas. |

Pruebas mínimas, que deben escribirse antes de cambiar la lógica:

☐   Un jugador llega a 0 HP: queda inconsciente, su ficha guarda vida 0 y no pasa al cementerio.

☐   El GM marca a un personaje como muerto: el estado cambia una sola vez y se crea un único registro de alma y cementerio.

☐   Una curación sobre un personaje inconsciente lo devuelve a activo.

☐   Una reconexión o la repetición de la acción en 0 HP no duplica nada.

☐   Al cerrar el encuentro, la ficha conserva vida y estado coherentes con la regla elegida.

### 4.7 Seguridad: pasos concretos (nuevo)

| Paso | Acción | Evidencia |
| --- | --- | --- |
| 1 · Contraseñas filtradas | Activar la protección contra contraseñas filtradas en Authentication (disponibilidad según el plan de Supabase). | Captura del ajuste activo. |
| 2 · Inventario | Listar las funciones SECURITY DEFINER de public con la consulta de abajo. | Lista con las 12 funciones y su propósito. |
| 3 · Revisión | Cada una debe comprobar quién llama (auth.uid() y rol) al principio, tener search_path fijo y no ser ejecutable por anon sin necesitarlo. | Una marca por función: correcta, corregir o retirar. |
| 4 · Corrección | Revocar EXECUTE a PUBLIC y anon cuando no haga falta y corregir las que no validen el rol. | Migración en el repositorio y prueba de acceso con un jugador. |
| 5 · Registro | Anotar fecha, commit y resultado en el apartado 09. | Entrada en el registro de seguimiento. |

| select n.nspname as esquema, p.proname as funcion,        has_function_privilege('anon', p.oid, 'execute') as anon,        has_function_privilege('authenticated', p.oid, 'execute') as autenticado,        p.proconfig as ajustes from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.prosecdef and n.nspname = 'public' order by 2; |
| --- |

## 05. Prioridades de mejora

| REGLA DE FOCO (nuevo) Solo las prioridades 1 a 3 están activas. Las prioridades 4 y 5, y todas las expansiones del apartado 06, esperan a que la Etapa 1 esté cerrada con evidencia. |
| --- |

Prioridad 1. Estabilidad de la aplicación

☐   Unificar el criterio sobre ramas de desarrollo, despliegue y versiones.

☐   Exigir pruebas automáticas antes de integrar cambios sensibles.

☐   Mantener un respaldo utilizable y un procedimiento de reversión probado.

☐   Corroborar que el estado real de base de datos y migraciones coincide con el repositorio.

Prioridad 2. Rendimiento y seguridad del combate

☐   Migrar recursos gráficos a Storage con permisos controlados y comprobación del resultado.

☐   Medir el tiempo de acción y el peso de la respuesta en condiciones de red reales.

☐   Validar reintentos idempotentes, desconexión, reconexión y acciones pendientes.

☐   Asegurar el cierre de encuentros y el borrado de encuentros permitidos sin bloqueos indebidos.

☐   Aclarar la transición entre inconsciencia, muerte y cementerio.

Prioridad 3. Integración de la partida

☐   Probar el recorrido: crear personaje → equipar → party → combate → habilidad → cierre → EXP y botín.

☐   Verificar que recursos, objetos, equipamiento y progresión persisten correctamente.

☐   Ensayar usuarios simultáneos y roles GM/jugador.

Prioridad 4. Interfaz intuitiva

☐   Agrupar tareas por flujo del GM y flujo del jugador, en vez de por estructura interna.

☐   Reducir rutas redundantes, clics y pasos de creación.

☐   Dotar las pantallas de estados de carga, vacío, error y recuperación.

☐   Auditar versión móvil y controles táctiles.

Prioridad 5. Libertad de creación

☐   Convertir configuraciones complejas en bloques visuales de condición, objetivo y consecuencia.

☐   Permitir previsualizar efectos sin alterar la campaña.

☐   Conservar compatibilidad con las reglas existentes y evitar editores JSON obligatorios.

## 06. Expansiones propuestas

Todas las ideas siguientes son propuestas de producto. No se presentan como sistemas terminados.

### 6.1 Centro de campañas

Espacio único para preparar y dirigir sesiones, administrar misiones, participantes, encuentros, NPC, recompensas e historial. Objetivo: reducir el salto continuo entre pantallas durante una partida.

### 6.2 Motor visual universal de reglas

Constructor capaz de expresar de manera visual: cuándo ocurre algo, bajo qué condición, a quién afecta y cuál es la consecuencia. Ejemplo: “Cuando este personaje derrote a un enemigo, recupera 1d6 HP y recibe 1 Fatiga”. Debe poder reutilizarse en habilidades, objetos, naturalezas, razas, títulos y monstruos.

### 6.3 Mazmorras vivas

Evolución del generador de mapas hacia mazmorras que reaccionan a los jugadores: modificar salas, invocar defensores, adaptarse a invasiones y sufrir consecuencias al dañarse su núcleo. Inspiración narrativa: el Diario lector y la concepción de las mazmorras como entidades vivas.

### 6.4 Diario del Espectador interactivo

Códice de descubrimientos gobernado por el GM: criaturas halladas, regiones exploradas, NPC conocidos, eventos históricos y poderes descubiertos. No debe revelar información que un personaje todavía desconoce.

### 6.5 Exploración y eventos fuera del combate

Mapas persistentes para explorar, hablar con NPC, investigar, descubrir trampas y desencadenar sucesos. Reutiliza las herramientas de mapas y las reglas del sistema para representar escenas más allá del combate.

### 6.6 Ideas complementarias

Puntos Kuro con reglas automáticas, exportación o resumen de sesión, modo espectador, temporizador de turno, avisos de turno y laboratorio para ensayar habilidades sin afectar la campaña. Se incorporarán una a una después de estabilizar el núcleo.

## 07. Hoja de ruta por etapas

El orden importa. Una expansión atractiva no compensa un combate que tarda demasiado o una recompensa que se duplica después de una reconexión.

ETAPA 1 · Estabilidad y confianza

Objetivo: que la versión de producción esté identificada y que el combate pueda utilizarse sin comprometer los datos de campaña.

| Frente | Resultado esperado | Evidencia de cierre |
| --- | --- | --- |
| Repositorio | Versión y rama de producción definidas | Registro de commit, despliegue y migraciones. |
| Respaldo | Recuperación ensayada | Respaldo verificable y procedimiento escrito. |
| Imágenes | Sin datos gráficos pesados incrustados en registros de juego nuevos | Auditoría de datos, muestras y referencias a Storage. |
| Combate | Acciones y cierres consistentes | Guion real GM + 2 jugadores; resultados repetibles. |
| Seguridad | Permisos revisados | Revisión documentada de funciones privilegiadas y avisos críticos. |

Orden recomendado dentro de la Etapa 1 (nuevo)

Plazos orientativos en jornadas completas; se ajustan tras la primera medición. El total ronda entre 5,5 y 7,5 jornadas, es decir, unas dos a tres semanas a media jornada.

| Paso y plazo | Qué se hace | Cierre |
| --- | --- | --- |
| 1 · Versión y respaldo (1 día) | Confirmar el commit desplegado, fijar main como rama única y ensayar una restauración. | Registro de commit y restauración probada. |
| 2 · Medición (½ día) | Medir 30 acciones reales: p95, tamaño de las respuestas y suma de triggers. Guardar el resultado en docs/metricas. | Línea base actualizada y fechada. |
| 3 · Peso restante (1 a 3 días) | Compactar el historial de los encuentros aprobados y mover a Storage las portadas y registros con imágenes incrustadas. | Auditoría con 0 filas con base64. |
| 4 · Seguridad mínima (1 día) | Los cinco pasos del apartado 4.7. | Lista revisada y migración aplicada. |
| 5 · Regla de 0 HP (1 día) | Elegir la opción del apartado 4.6 y escribir las cinco pruebas. | Pruebas en verde. |
| 6 · Guion completo (1 día) | Ejecutar el guion 08 con un GM y dos jugadores, tres veces seguidas. | Ficha de avance con tiempos y capturas. |

ETAPA 2 · Experiencia de uso

Objetivo: preparar y jugar una sesión con pocos pasos y sin depender de configuraciones técnicas.

Referencia de diseño (nuevo): el archivo design.md define una dirección visual y ocho esqueletos de página (entrada, panel, combate, ficha, catálogo, lista y detalle, editor y lectura) que cubren todas las rutas actuales. Puede usarse como base de la auditoría de navegación y de la revisión móvil.

| Frente | Resultado esperado | Evidencia de cierre |
| --- | --- | --- |
| Navegación | Tareas del GM y del jugador fácilmente localizables | Pruebas de recorrido sin confusión. |
| Yunque visual | Acciones y reglas complejas configurables con controles claros | Crear varias habilidades sin editar JSON. |
| Móvil | Controles cómodos y estados legibles | Ensayo en teléfonos y navegadores reales. |
| Mapas | Atlas y editor utilizables en la sesión | Crear, guardar, aplicar y reabrir escenario. |

ETAPA 3 · Expansión de YUGEN

Objetivo: desarrollar capacidades propias que hagan de YUGEN una plataforma flexible de campañas y creación.

| Frente | Primera entrega razonable |
| --- | --- |
| Campañas | Vista central de sesiones, encuentros y recompensas. |
| Reglas universales | Editor de evento → condición → objetivo → efecto. |
| Mazmorras vivas | Prototipo de núcleo, reacciones y defensores. |
| Diario interactivo | Descubrimientos, visibilidad del GM e historial de mundo. |
| Exploración | Eventos básicos en mapas persistentes. |

## 08. Guion de validación de una partida

Este escenario reúne el recorrido más importante de la aplicación. Debe ejecutarse con un GM y dos jugadores autenticados, preferiblemente en una campaña de prueba aislada. No alterar datos oficiales de la campaña para efectuar el ensayo.

| # | Paso | Resultado que debe verificarse |
| --- | --- | --- |
| 01 | Acceso y permisos | Ingresan GM y dos jugadores; cada rol ve solo sus capacidades autorizadas. |
| 02 | Creación | Se crea o elige un personaje y se comprueba su raza, atributos y recursos. |
| 03 | Preparación | Se asigna equipo, inventario y un compañero cuando corresponda. |
| 04 | Encuentro | El GM crea el combate y se incorpora la party sin duplicaciones. |
| 05 | Rondas | Se ejecutan movimiento, ataque, habilidad, consumible y cambio de turno. |
| 06 | Resiliencia | Se repite una acción identificada y se simula pérdida de respuesta y reconexión. |
| 07 | Reglas | Se revisan recursos, daño, estados, impactos y reglas de 0 HP. |
| 08 | Cierre | Se termina el combate y se registran resultados válidos. |
| 09 | Recompensas | Se aprueban EXP y botín una sola vez; los cambios persisten en la ficha. |
| 10 | Retorno | Se sale, se vuelve a entrar y se confirma persistencia de todos los datos. |

Resultado de la auditoría: esta prueba de extremo a extremo no estaba acreditada en el corte revisado. Debe registrarse su fecha, participantes, commit, errores, tiempos y capturas pertinentes.

## 09. Registro de seguimiento

Utilizar este registro después de cada sesión de desarrollo. Marcar el estado únicamente cuando exista evidencia. Mantener tres prioridades activas como máximo evita dispersar el trabajo entre decenas de sistemas.

| Elemento | Estado inicial | Próxima acción |
| --- | --- | --- |
| Rama y despliegue | Por verificar | Confirmar commit publicado. |
| Imágenes incrustadas | Pendiente | Completar migración segura. |
| Acciones del combate | Parcialmente probado | Prueba real con varios clientes. |
| Regla de muerte | Por reconciliar | Acordar definición y verificarla. |
| Seguridad | Revisión pendiente | Analizar RPC y configuración Auth. |
| Flujo completo | Sin certificar | Ejecutar guion del apartado 08. |
| Interfaz móvil | Sin certificar | Auditar GM y jugador en teléfonos. |
| Nuevas funciones | Propuestas | Esperar validación del núcleo. |

Ficha de avance reutilizable

Fecha y versión (commit / deploy): __________________________________________

Módulo y tarea: ___________________________________________________________

Estado:  ☐ Pendiente    ☐ En curso    ☐ Verificado    ☐ Bloqueado

Prueba ejecutada y resultado: _______________________________________________

Evidencia (captura, logs, métricas, enlace): __________________________________

Problema pendiente o decisión del GM: _______________________________________

Criterios para afirmar que YUGEN está listo para jugar con confianza

☐   Un combate completo con jugadores reales termina sin errores, duplicaciones ni pérdida de recursos.

☐   Los datos y las imágenes tienen tamaños controlados; el rendimiento está medido y documentado.

☐   Los permisos de GM y jugador se verifican en los sistemas sensibles.

☐   Una persona puede crear, equipar, pelear y recibir recompensas sin acudir a ajustes técnicos.

☐   Las pantallas principales son utilizables en móvil y recuperan errores de manera clara.

☐   La versión desplegada coincide con la rama aprobada y hay una reversión practicable.

## 10. Lecciones del proceso (nuevo)

Esta sección resume, sin buscar culpables, por qué el combate llegó a tener los problemas medidos y qué regla evita repetirlos.

| Qué ocurrió | Por qué importa | Regla desde ahora |
| --- | --- | --- |
| Se optimizaron capas del combate durante semanas sin medir datos reales. La causa mayor (historial de 8,2 MB) no estaba en ninguna métrica. | Se invirtió esfuerzo en síntomas mientras el origen seguía igual. | Medir primero tres cosas (tiempo, tamaño y triggers) antes de cada optimización. |
| Las métricas existentes eran sintéticas: el motor tardaba 1 ms, pero no se registraba el tamaño de los datos ni la latencia p95 real. | Una cifra buena en un laboratorio no demuestra una sesión fluida. | Medir con datos reales y guardar fecha y commit en docs/metricas. |
| Parte de las correcciones se aplicó directamente en producción y se reconcilió después en el repositorio. | Repositorio y base de datos pueden divergir sin que nadie lo note. | Repositorio primero, prueba en copia y registro de la migración aplicada. |
| Un trigger del camino caliente se reescribió y requirió una corrección posterior por una colisión de nombres (migración corregir_proyeccion_vitales). | Un fallo en ese punto afecta a cada acción de combate. | Pruebas de base de datos obligatorias antes de tocar triggers, ejecutadas en cada cambio. |
| Existen dos ramas con 177 commits de diferencia y la predeterminada no es la más avanzada. | Se puede probar una versión y desplegar otra. | Una sola rama de producción, identificada en cada despliegue. |
| Los encuentros aprobados se declararon inmutables sin un plan para su peso. | Un dato protegido y pesado queda para siempre. | Toda regla de inmutabilidad incluye su plan de compactación. |
| Se acumularon muchos sistemas (más de treinta pantallas) y varias tablas de compañeros, logros y economía siguen sin uso real. | No se puede validar bien lo que nadie ha recorrido de principio a fin. | Máximo tres prioridades activas y funciones nuevas congeladas hasta cerrar la Etapa 1. |
| Conviven varios documentos (plan maestro, guía, pendientes y diseño) sin una fuente única. | Cada uno puede decir algo distinto y confundir la dirección. | Un único documento rector; los demás enlazan a él. |

Lo que sí funcionó

Una consulta reproducible de diagnóstico encontró la causa mayor en pocos pasos. Las migraciones atómicas, que verifican la definición real antes de modificarla, fallan sin cambiar nada si algo no coincide. Las pruebas de acción segura y el principio de no dar por terminado nada sin evidencia evitaron falsas victorias.

## 11. Objetivos medibles (nuevo)

Los objetivos son propuestas de partida; se ajustan después de la primera medición.

| Métrica | Objetivo | Cómo se mide y estado actual |
| --- | --- | --- |
| Acción de combate (p95, de extremo a extremo) | Menos de 500 ms | DevTools → Network con 30 acciones. Sin medir. |
| Tamaño de un encuentro nuevo | Menos de 200 KB | pg_column_size de los datos del encuentro. Objetivo ya existente. |
| Respuesta de la consulta ligera | Menos de 150 KB | DevTools → Network. Sin medir. |
| Suma de triggers por guardado | Menos de 40 ms | EXPLAIN ANALYZE dentro de una transacción con rollback. 237 ms antes de las correcciones; sin remedir. |
| Imágenes base64 en la base de datos | 0 filas | Consulta de auditoría. Un encuentro, 4 portadas y 3 registros de inventario. |
| Acción pendiente tras cortar la red | Se resuelve o se descarta sin bloquear terminar ni borrar | Prueba manual de reconexión. Sin certificar. |
| Partida completa (guion 08) | 3 repeticiones seguidas sin errores ni duplicados | Guion con un GM y dos jugadores. Sin certificar. |
| Versión móvil | Guion completo en 2 teléfonos reales | Prueba en dispositivos. Sin certificar. |

Cada medición se guarda con fecha y commit en docs/metricas. Una cifra sin fecha no cuenta como actual.

## 12. Decisiones propuestas (nuevo)

Para cerrar las decisiones pendientes del apartado 13 se proponen estas respuestas. Son propuestas: la decisión final corresponde al GM.

| Decisión | Propuesta | Razón |
| --- | --- | --- |
| Versión oficial | main como única rama de producción; revisar los 10 commits de master y archivarla. | main está 177 commits por delante y contiene las correcciones recientes. |
| Regla de 0 HP | Opción A (inconsciencia), con un ajuste por encuentro si se desea. | Coincide con el motor actual y permite rescates. |
| Funciones nuevas | Congeladas hasta cerrar la Etapa 1. | Evita repetir la acumulación de sistemas sin uso real. |
| Primera expansión | Laboratorio para ensayar habilidades sin afectar la campaña. | Riesgo bajo, facilita el uso de Forja y prepara el motor visual de reglas. |
| Encuentros aprobados | Conservar el resultado y compactar el historial. | Preserva las recompensas oficiales y reduce el peso. |
| Documentos | Un único documento rector (esta guía); el plan maestro y pendientes enlazan a él. | Evita versiones paralelas. |

## 13. Fuentes y límites de la evaluación

Fuentes examinadas al 12 de noviembre de 2026: repositorio rpg-system, rama main; documentación de plan maestro, pendientes, avance de métricas, generador de mapas, flujo de combate, Forja, almas y catálogo de animaciones; consultas de solo lectura a RealYugen en Supabase.

Repositorio  |  https://github.com/redmoonlight203-bit/rpg-system

Plan maestro  |  https://github.com/redmoonlight203-bit/rpg-system/blob/main/docs/plan-maestro-2026-11-10.md

Pendientes  |  https://github.com/redmoonlight203-bit/rpg-system/blob/main/docs/pendientes.md

Avance técnico  |  https://github.com/redmoonlight203-bit/rpg-system/blob/main/docs/metricas/avance-2026-11-10.md

Línea base  |  https://github.com/redmoonlight203-bit/rpg-system/blob/main/docs/metricas/linea-base-2026-11-10.md

Mapas  |  https://github.com/redmoonlight203-bit/rpg-system/blob/main/docs/generador-mapas.md

Animaciones  |  https://github.com/redmoonlight203-bit/rpg-system/blob/main/docs/animaciones-pixel-art.md

Decisiones que deberán quedar registradas

☐   Qué versión se considera la versión oficial del producto.

☐   Cuál es la regla exacta para inconsciencia, muerte y retorno al alma.

☐   Qué funciones se mantienen, fusionan o posponen tras una prueba de uso real.

☐   Qué expansión se acepta primero una vez terminado el núcleo.

Cómo mantener el documento vigente

Después de cada entrega, actualizar el registro de seguimiento del apartado 09, indicar el commit desplegado, enlazar la prueba que la valida y mover las tareas terminadas fuera de la lista de prioridades. Las observaciones de esta auditoría son una fotografía del 12 de noviembre de 2026 y no deben reutilizarse como si fueran mediciones actuales.

| CONCLUSIÓN DE PRODUCTO YUGEN ya cuenta con motores y herramientas suficientes para concentrarse en la experiencia real de juego. El siguiente gran paso es convertir esas piezas en una plataforma estable, intuitiva y capaz de materializar reglas complejas sin exigir programación al GM. |
| --- |
