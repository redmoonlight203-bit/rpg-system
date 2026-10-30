# Activar categorías con herencia

1. En Supabase abre SQL Editor y ejecuta `20261030_categorias_heredadas.sql` completo. La transacción añade `parent_id`, impide ciclos y prepara el grupo Razas con Vida, Armadura, PH y Fatiga, inicialmente en cero. No modifica los valores de personajes existentes ni asigna sus categorías automáticamente.
2. Integra el cambio de código y actualiza el servidor. La interfaz antigua sigue siendo compatible con la columna nueva; la nueva permite seguir editando datos si la migración aún no se ejecutó.
3. En Estadísticas edita cada categoría de raza existente (Humanos, Enanos, Elfos, Dragones…) y elige Razas en Heredar atributos de. No cambies sus claves.
4. Ajusta los valores generales en Razas. Añade en cada raza los atributos exclusivos. Para cambiar el valor de un general únicamente en esa raza, crea un atributo propio con la misma clave.
5. Para objetos crea un grupo Objetos y subcategorías como Cascos, Guantes o Armas. Añade al grupo solo los atributos comunes a sus hijos. No es obligatorio que objetos y razas compartan estadísticas.

La Forja muestra la combinación de atributos heredados y propios. En creaciones nuevas utiliza sus valores predeterminados; editar una creación existente conserva sus cifras guardadas. Los cambios de configuración no modifican automáticamente el inventario ni los personajes existentes.

Comprobaciones locales: `node --experimental-strip-types --test tests/estadisticas.test.mjs`, `npx tsc --noEmit`, `npm run build` (con variables ficticias de Supabase). Las escrituras reales y la migración necesitan validación en tu proyecto Supabase.
