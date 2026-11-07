# Personajes, vida permanente y cementerio

La creación del jugador se realiza en `/ficha/personajes`. Las categorías del árbol `razas` (Seres vivos) y todos sus descendientes son seleccionables. Los atributos se resuelven desde la raíz hasta la raza elegida; una definición local sustituye la heredada. Las pasivas raciales siguen usando el snapshot del motor de combate.

Las propuestas se validan en `personaje_solicitar`, incluyendo propietario, perfil aprobado, Mente colmena, lugares conocidos, atributos existentes y límites configurados. No se permite insertar personajes directamente desde el cliente del jugador. Las solicitudes pendientes, editadas o rechazadas pueden corregirse y reenviarse; las fichas aprobadas se modifican desde el GM.

`vida_actual`, `vida_maxima_actual`, `ph_actual` y `fatiga_actual` son recursos permanentes independientes de `atributos`. La preparación conserva heridas y recursos gastados. Al cambiar la vida máxima por equipamiento se conserva la cantidad de vida perdida, con un mínimo de 1 para un personaje vivo que se prepara. Cada escritura del combate en curso o su finalización sincroniza los recursos dentro de la misma transacción, tanto para acciones del GM como para las confirmadas por Edge. Un personaje no puede participar en dos encuentros activos.

En `/dm/personajes`, el GM puede revisar solicitudes, editar fichas fuera del encuentro, curar una cantidad de vida o aplicar descanso completo (vida, PH y fatiga). La recuperación se bloquea durante preparación o combate. Los encuentros finalizados no vuelven a escribir recursos al consultarse o guardarse de nuevo.

Llegar a 0 durante el combate marca al personaje como muerto y genera una sola entrada de `cementerio_personajes`. La copia incluye toda la fila del personaje, inventario con sus configuraciones, equipo y snapshot final del participante. Las pertenencias ligadas al alma regresan a la cuenta después de copiarse. Las restantes permanecen asociadas al difunto y son invisibles para el jugador. RLS reserva el cementerio al GM y oculta los muertos de la gestión del jugador. La muerte no se revierte con deshacer el combate ni con una edición de la ficha.

Se preservan los datos anteriores de la campaña; los personajes ya muertos reciben una copia del registro disponible, identificada como registro previo. No se inventan estados históricos de combate.

## Verificación

- `npm run build`
- `node --test tests/*.test.mjs`
- `FORJA_PGLITE_MODULE=/ruta/a/@electric-sql/pglite/dist/index.js node tests/personajes-vida-database.mjs`

La prueba PostgreSQL cubre herencia, límites, permisos, exclusión de encuentros simultáneos, recuperación, muerte, copia íntegra, devolución al alma y creación de una nueva vida. Se carga también la protección de equipo en combate para verificar la integración de la muerte con el sistema existente.

## Borrado por el GM

El GM puede borrar un personaje desde su tarjeta, su ficha o la lista de personajes de una cuenta. La interfaz pide confirmación y la operación del servidor verifica el rol de Kuroi y la cuenta propietaria. Se bloquea durante encuentros en preparación o en curso. Un trigger protege también los borrados directos: devuelve las pertenencias ligadas al alma a su cuenta, desequipándolas, y elimina el inventario exclusivo antes de borrar la ficha. Los árboles y naturalezas se eliminan por sus relaciones; los recuerdos ya existentes en el cementerio se conservan. La prueba `tests/gm-borrar-personajes-database.mjs` cubre permisos, propiedad, encuentros y la conservación del alma.
