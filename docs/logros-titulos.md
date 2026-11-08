# Logros asociados a títulos de la Forja

## Preparar un logro

1. Crear o elegir en la Forja una creación de tipo **Título**. Sus estadísticas, acciones, requisitos y pasivas narrativas o de combate siguen usando el sistema existente.
2. Abrir **Botín, logros y títulos → Logros y títulos → Crear o editar logros** y seleccionar ese título como recompensa. El nombre del título procede de la Forja, no de un texto independiente.
3. Elegir un símbolo de la galería visual o subir una foto PNG, JPG o WebP. Se usa el mismo procesamiento de imágenes que las creaciones.
4. Elegir **Decisión del GM** para hitos de una sesión presencial, o configurar un disparador automático con sus condiciones visibles.
5. Guardar el logro. Si se creó un título en otra pestaña, **Actualizar títulos** permite traerlo sin perder el formulario.

## Conceder sin un evento de la aplicación

En **Conceder logro como GM**, elegir un logro guardado y una cuenta aprobada. Si el alcance es por personaje, elegir también el personaje de esa cuenta. Registrar un motivo y elegir entre completar el logro o sumar una cantidad de progreso. No se requiere un combate, un personaje activo ni una acción previa dentro de la app para los logros de cuenta.

El GM puede conceder manualmente cualquier logro, incluso si tiene un disparador automático. La solicitud se identifica para que reintentar una entrega no sume dos veces el progreso. El motivo, el autor y los cambios quedan en la auditoría.

## Título real y efectos

Al desbloquearse un logro, la cuenta recibe una copia real del título en el baúl del alma, conservando la configuración de la Forja. El jugador lo envía a un personaje y lo equipa en el espacio **Título**. Se aplican los requisitos y las reglas de equipamiento habituales, incluido el coste de acción durante combate.

Elegir **Mostrar en el perfil** solo cambia la presentación: no equipa el título ni activa sus pasivas. Dos logros que conceden el mismo título no generan dos copias de recompensa en la cuenta. Una retirada del título por el GM no puede deshacerse mediante el botón de reclamar del jugador; el GM puede volver a concederlo con un nuevo motivo.

Las copias siguen el modelo habitual de la Forja: modificar posteriormente la plantilla no reescribe las pasivas de una copia ya entregada. Cambiar la asociación de un logro no borra recompensas anteriores.

## Disparadores automáticos

| Disparador | Condiciones disponibles |
| --- | --- |
| Derrotar enemigos | Enemigo concreto o cualquiera, cantidad, nivel mínimo del enemigo y del personaje, máximo de rondas, no haber caído |
| Ganar encuentros oficiales | Cantidad de victorias, nivel mínimo, máximo de rondas, no haber caído |
| Sobrevivir a una victoria oficial | Terminar con HP mayor que cero; opcionalmente no haber caído durante el encuentro |
| Subir niveles | Número de niveles subidos y nivel mínimo del personaje; por ejemplo, meta 1 y nivel mínimo 10 |
| Recibir botín confirmado | Número de entregas o cantidad de copias de un objeto específico, nivel mínimo del personaje |
| Decisión del GM | Criterio narrativo escrito por el GM y concesión manual con motivo |

Los eventos automáticos de combate proceden de recompensas oficiales aprobadas y conservan su elegibilidad de jugadores y compañeros de party. Los entrenamientos no conceden estos logros. Un enemigo no se cuenta repetidamente para una cuenta por cada compañero de la misma party.

## Comprobación

- `node --test tests/logros.test.mjs`
- `FORJA_PGLITE_MODULE=/ruta/pglite/dist/index.js node tests/logros-titulos-database.mjs`
- `tests/logros-titulos-integracion.sql`, dentro de una transacción que termine con `ROLLBACK`, verifica una copia con pasivas y su presencia en el equipo de combate real.
