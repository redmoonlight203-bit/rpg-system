# Baúl del alma por cuenta

`/ficha/alma` es una sección de la cuenta y funciona sin personaje activo ni cuerpos vivos. Muestra todas las pertenencias ligadas al alma, tanto en reposo como prestadas, con filtros para objetos, habilidades, pasivas y personajes.

La propiedad se representa con `inventario_jugador.user_id`. `personaje_id` es únicamente una asignación temporal. Las nuevas entregas ligadas al alma se guardan con `personaje_id = null`; el jugador las envía a un cuerpo vivo y aprobado mediante `alma_transferir`. La muerte conserva primero el snapshot del cementerio y después devuelve estas mismas copias al baúl, sin cambiarlas de cuenta ni duplicarlas.

Una compra de un personaje ligado al alma conserva su snapshot como pertenencia de la cuenta; no crea automáticamente otro cuerpo jugable. Los personajes no ligados conservan el flujo anterior de entrega. Las asignaciones existentes siguen siendo préstamos visibles desde el baúl.

Kuroi abre el baúl de cada cuenta desde Jugadores y personajes → Jugadores → Abrir baúl del alma. Puede entregar directamente una creación ligada al alma, incluso si no hay personajes, y eliminar pertenencias fuera de encuentros activos. La Forja también elige una cuenta cuando entrega una creación ligada al alma.

Los jugadores no pueden borrar ni desvincular pertenencias del alma. La restricción se aplica tanto en las funciones públicas como en el trigger de inventario, incluso si otra función intenta eliminar una copia. `alma_entregar` es idempotente por solicitud y está reservado a Kuroi; `alma_eliminar` también requiere su rol. Los snapshots del cementerio conservan sus copias históricas después de una eliminación posterior.

Verificación: `tests/alma-cuenta-database.mjs` ejecuta las migraciones en PostgreSQL aislado y comprueba entregas sin cuerpo, personajes como recursos de cuenta, snapshots, compras, propiedad, préstamos, retorno al morir, idempotencia y eliminación exclusiva del GM.
