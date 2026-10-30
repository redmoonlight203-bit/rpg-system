# Forja de Yugen

Una entrada en forja_maestra es una creación reutilizable. Único significa estadísticas fijas; no impone una sola copia global. Malla significa una plantilla con rangos. Cada copia conserva sus valores, aunque la plantilla cambie después.

## Uso

1. Define categorías, subcategorías y atributos en Estadísticas.
2. En la Forja elige la clasificación por su ruta completa y el espacio de equipamiento.
3. Selecciona Único para valores fijos o Malla para mínimos y máximos. Los rangos enteros generan enteros; los que contienen decimales se sortean en centésimas.
4. Entregar a personaje permite seleccionar un personaje aprobado, una cantidad de 1 a 50 y el motivo. Cada copia aparece en su inventario sin equiparse. Se conserva user_id, personaje_id, slot_tipo y una copia de sus estadísticas.
5. Preparar para batalla genera apariciones independientes en Preparados para batalla. Recargar no vuelve a sortearlas. Pueden marcarse en batalla o finalizarse. La resolución del combate sigue pendiente.
6. La tienda consulta la misma Forja. Tanto las entregas directas como la aprobación de una negociación usan la misma operación de copia. Para una negociación se elige un personaje de la cuenta que hizo la oferta.

La Forja mantiene el catálogo al entregar copias. Archivar una creación evita nuevas copias y no borra las ya entregadas. Retirar una copia desde Mercado afecta únicamente a esa copia. No se asignan objetos ni se preparan enemigos automáticamente al actualizar la aplicación.

## Base de datos

La migración 20261030_forja_copias.sql añade forja_operaciones, forja_instancias y las columnas operacion_id y motivo_entrega al inventario. La función forja_crear_copias comprueba el rol Kuroi, valida el destinatario y los rangos, realiza la operación en una transacción y utiliza un identificador de solicitud para evitar duplicados al reintentar. No cambia las estadísticas del catálogo al entregar.

La migración se aplicó mediante la conexión Supabase. La verificación adicional en la base real quedó bloqueada por saturación del servicio de revisión automática. Se validó la función con una base PostgreSQL aislada en memoria, sin tocar datos reales.

## Validación

- node --test tests/forja.test.mjs
- node --experimental-strip-types --test tests/estadisticas.test.mjs
- npx tsc --noEmit
- npm run build

La regresión SQL se ejecuta únicamente en una base vacía en memoria con PGlite. Para reproducirla en un entorno de desarrollo: instala @electric-sql/pglite sin guardarlo como dependencia de la aplicación y ejecuta node tests/forja-database.mjs. También puede indicarse su ruta de módulo con FORJA_PGLITE_MODULE. El script no utiliza credenciales ni permite conectarse a una base real.

## Creación por tipo

La pestaña La creación sustituye a Galería. Los filtros muestran nombres cortos de subcategorías. El Yunque separa Tipo (personaje, habilidad, objeto, título, pasiva u otro) de Clasificación (solo subcategorías de Estadísticas). Las familias conocidas ofrecen clasificaciones compatibles con el tipo; las categorías personalizadas continúan disponibles mediante Otro.

Los personajes seleccionan habilidades aprobadas y piezas compatibles con los espacios existentes. Las habilidades y los objetos pueden configurar acciones mediante nombre, efecto, cantidad de dados, caras, modificador, coste de PH y duración. Los efectos disponibles son daño, curación, recuperación de PH, reducción de Fatiga y estados descritos. Probar una tirada solo muestra un resultado: no aplica daño, cura ni consume PH.

El tipo Objeto muestra el espacio de equipamiento. Un título conserva internamente su espacio de título. El resto no utiliza espacios de equipo. Al generar un personaje se copian habilidades, piezas y acciones; los bonos del equipo se suman a los atributos que ya existen en su base, que también queda conservada en la configuración. El equipo procedente de una malla se sortea por aparición y queda guardado.

La migración 20261030_forja_tipos_y_dados.sql prepara los campos, valida referencias y guarda configuraciones en inventarios e instancias. El catálogo anterior mantiene sus estadísticas. La espada con dados antiguos se presenta como una acción. Las nuevas ediciones usan acciones como fuente de configuración de dados.

El tablero se retira de los menús. Su ruta anterior redirige a la Forja; los mapas almacenados no se eliminan.

Validación adicional: node --test tests/creacion.test.mjs y node tests/creacion-database.mjs (PGlite aislado, igual que la regresión anterior). Se probaron restricciones por tipo, referencias, dos manos, dados, copia de habilidades/equipo, bonos de equipo fijo y de malla, y conservación de snapshots.
