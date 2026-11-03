# Forja: condiciones y reglas

El Yunque conserva el editor de acciones y pasivas anterior. Añade un motor declarativo en todas las creaciones: personajes, habilidades, objetos, títulos, pasivas y otros. Las copias conservan el snapshot de sus reglas; modificar una plantilla no cambia copias ni encuentros ya preparados.

## Construir una regla

1. Elige un evento: activar, iniciar/finalizar combate, inicio/fin de turno propio, atacar, impactar, fallar, recibir/causar daño, matar o caer.
2. Combina condiciones con todas (Y), alguna (O) y negación (NO). Puedes comparar atributos, vida/PH/Fatiga actuales y porcentajes, exigir estados o formas, comprobar elementos y usar probabilidades.
3. Añade efectos en orden. Cada bloque selecciona su destino: portador, autor u objetivo del evento, aliados, enemigos o todos los vivos.
4. Configura costes, usos por encuentro, enfriamiento en turnos propios y prioridad. Las reglas automáticas sin condiciones o recursos suficientes se omiten. Las activaciones manuales explican el motivo y no consumen recursos si no pueden ejecutarse.

Los efectos disponibles modifican atributos (sumar, multiplicar, reemplazar), transforman varias estadísticas, aplican o quitan estados, infligen daño directo, curan, modifican PH/Fatiga, consumen la acción del turno, conceden acciones temporales y registran mensajes. Las salvaciones y los bloques condicionales tienen ramas independientes de éxito y fallo. No se evalúa código arbitrario.

Los valores admiten constantes o fórmulas: `(dados + bono + atributo elegido + daño del evento) × escala`. El objetivo de una rama de salvación es el personaje que acaba de salvar; el portador y autor originales no cambian. En destinos múltiples las fórmulas se tiran por receptor.

## Recetas

- **Vida permanente al matar:** +1 vida máxima por enemigo muerto a manos del portador. No se activa al atacar un cadáver ni al morir un aliado. No cura automáticamente.
- **Furia de Zack:** al activarla concede +15 vida máxima, +8 daño y +3 ARM. Cada inicio de turno exige salvación CD12; fallar consume su acción. Otra regla permite abandonar la furia. Las cifras son editables y la receta no modifica al Zack existente automáticamente.
- **Objeto de transformación:** las mismas reglas se pueden guardar en un objeto y usar desde el equipo o inventario activo del jugador.

## Duración y acumulación

La duración 0 conserva el efecto hasta finalizar el combate. Las duraciones positivas cuentan turnos completos posteriores del receptor; no consumen duración durante el turno en que se aplican. Al reemplazar un efecto con la misma clave se renueva; al acumular se añaden aplicaciones. Quitar una clave elimina sus cambios y acciones vinculadas. Usa la misma clave para una forma y las acciones concedidas por ella.

Modificar vida máxima no cura: añade curación explícita si corresponde. Al quitar una forma se vuelve a calcular el máximo y se limita la vida actual. Las operaciones se aplican sobre la base y estados anteriores, en orden de creación. No se modifica permanentemente la base para aplicar una transformación.

El daño del motor es directo: no tira impacto, no resta ARM ni activa los combos elementales antiguos. Para esos ataques usa el editor de acciones o concede una acción temporal. Un estado narrativo por sí solo no inmoviliza: añade perder acción y la condición correspondiente.

El motor tiene límites de tamaño, anidación y encadenamiento para evitar bloqueos. Una mecánica que necesite una operación nueva requiere ampliar el vocabulario de efectos; no se promete interpretar cualquier descripción de texto libre.

## Guardado del crecimiento

Los cambios permanentes se suman a los atributos del participante y quedan registrados con su origen en el encuentro. Deshacer restaura tanto estadísticas como registro. Al finalizar, Kuroi puede aplicar el progreso a las fichas de jugadores: una transacción comprueba propietario, rol, versión y estado del encuentro, bloquea las fichas, suma los incrementos una vez y cierra el encuentro. Reintentar la misma confirmación no duplica los valores. Una vez confirmado no puede deshacerse ni reescribirse el encuentro.

Las plantillas de enemigos no se alteran al ganar estadísticas: cada copia es una criatura distinta. Un encuentro de prueba puede conservar su resultado sin aplicar cambios a fichas reales. El Laboratorio del Yunque nunca escribe en la base de datos.

## Verificación

`node --test tests/*.test.mjs` ejecuta reglas nuevas y regresiones del combate anterior. `node tests/reglas-database.mjs` verifica en PostgreSQL aislado la validación, snapshots, permisos, conflictos de versión y confirmación idempotente. Requiere `@electric-sql/pglite`, o `FORJA_PGLITE_MODULE` apuntando al módulo instalado.
