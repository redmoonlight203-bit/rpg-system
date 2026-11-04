# Equipamiento durante el combate

El jugador abre Equipamiento y el GM usa «Cambiar equipamiento · 1 acción» en el simulador. Preparan el conjunto completo y lo confirman una vez: equipar, guardar, sustituir o mover varias piezas consume una única acción. Solo se permite durante el turno del participante, vivo y con su acción disponible. Fuera de combate no se gastan acciones.

Solo aparecen piezas del inventario asignado a ese personaje. Los personajes de la Forja conservan como reserva las piezas con las que se prepararon. Una pieza no puede ocupar dos espacios y las armas de dos manos bloquean ambas manos. Un arma en una mano y la otra libre conservan el ataque desarmado; ambas manos ocupadas, también con escudos, lo ocultan. Las habilidades naturales creadas expresamente siguen sus propias reglas.

El cambio conserva vida, PH y Fatiga actuales, limitándolos a sus nuevos máximos. Recalcula bonos y acciones, activa «Al equipar» y retira modificadores y acciones temporales cuyo origen sea una pieza guardada. Mover una pieza entre manos no reinicia su forma ni sus usos. Los aumentos permanentes anteriores se conservan. Los objetos guardados dejan de ofrecer ataques y pasivas.

El cliente no envía estadísticas calculadas como fuente de verdad. La función Edge equipo-combate verifica al usuario con Supabase Auth, obtiene el estado autorizado y ejecuta el mismo motor que el GM. Una operación SQL privada comprueba versión y disponibilidad de la acción antes de guardar el encuentro y sincronizar el inventario en una transacción. Las RPC de servidor solo son ejecutables por service_role; la clave permanece en el servidor. Las escrituras directas de equipamiento sobre personajes en combate se rechazan. El GM recibe cambios de jugadores y Deshacer restaura también el inventario.

## Phoenix

Se completa la plantilla existente Phoenix (Sellada), conservando identidad e imagen. Empuñarla activa la primera etapa; guardarla retira la forma. Las etapas superiores requieren una acción y 2/4 PH, reemplazan los bonos anteriores y desbloquean Llamas Azules y Esclavitud respectivamente. Ojo de Rey está incluido en la precisión de esas formas. Sera exige salvación al comenzar el turno. Parpadeante cuesta 3 PH, tiene un uso por encuentro y al expirar aplica automáticamente un turno de debilitamiento. Protección de rey y Transferencia de Energía son automáticas.

Esclavitud muestra Dominado y el GM dirige la siguiente acción. Devorador de Armas queda descrito para adjudicación del GM: la transferencia de propiedades todavía no se automatiza.

## Mantenimiento y pruebas

El motor Edge se genera desde lib/combate.ts. Después de modificarlo, ejecutar `node scripts/preparar-motor-edge.mjs`. CI comprueba que el archivo generado esté actualizado. Para desplegar, incluir index.ts y motor.js de supabase/functions/equipo-combate; el cuerpo autentica cada petición antes de acceder a datos.

`node --test tests/*.test.mjs` verifica el motor, Phoenix, permisos del endpoint y regresiones. `node tests/equipo-database.mjs` usa PGlite para probar los permisos SQL, conflictos, bloqueo de cambios directos y sincronización al deshacer. Puede localizarse PGlite con FORJA_PGLITE_MODULE.
