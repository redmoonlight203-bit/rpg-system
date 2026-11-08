# Party y entrada automática al combate

Al añadir un personaje de jugador desde la biblioteca del GM, `combate_preparar_party` prepara al personaje y a los NPC vivos, aprobados y activos de la misma cuenta. No incorpora otros cuerpos jugables de Mente colmena. Al añadir un NPC por separado, solo entra ese NPC.

El motor incorpora el grupo en el mismo bando y lo guarda en una única operación. Cada integrante conserva sus recursos permanentes, nivel, equipo, habilidades y tirada de iniciativa. Los miembros ya presentes en el mismo bando no se duplican ni vuelven a tirar iniciativa. Un conflicto de bando, falta de configuración o exceso del cupo rechaza la operación completa.

Las páginas `/ficha/party` y `/dm/party` ofrecen acceso a la party. Desde las tarjetas se abre el editor visual de equipamiento sin abandonar la party; los jugadores también acceden a la ficha completa, inventario, habilidades/pasivas y árbol de cada integrante. El GM conserva la asignación y retirada de compañeros.

El editor encuentra tanto encuentros en preparación como en curso. En preparación, el propietario puede cambiar el equipo de sus personajes y compañeros sin gastar acción, actualizando la copia del encuentro y la ficha. Una vez iniciado el combate, los cambios conservan las restricciones de turno y acción. El GM recibe también las actualizaciones del encuentro preparado.

Pruebas: `tests/party-combate.test.mjs`, `tests/party-combate-database.mjs` y `tests/party-combate-integracion.sql`. La última usa una transacción con rollback contra el esquema completo y comprueba entrada de miembros y edición del equipo del NPC desde su cuenta.
