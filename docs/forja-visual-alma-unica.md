# Forja visual y pertenencias únicas del alma

El Yunque conserva sus atributos, costes, requisitos, efectos, reglas, invocaciones y variantes. Acciones, pasivas, reglas, efectos, variantes y etapas se ordenan mediante un asa de arrastre, con botones equivalentes para teclado y móvil. Los archivos de reglas se importan con validación y vista previa antes de reemplazar el borrador; no hay un editor de configuración en texto.

La identidad incluye imagen por archivo, arrastre, enlace o emblema. Presentación e historia contiene únicamente historia, clase calculada y vínculo al alma. Los requisitos narrativos, mecánicos y limitaciones conservan sus campos en una sección propia. Las previsualizaciones de áreas no alteran las reglas del combate.

`forja_almas_unicas` reserva una creación por su ID, con una sola copia y una cuenta propietaria. El trigger de inventario cubre entregas del GM, compras, aprendizaje y entregas indirectas. Todas las nuevas pertenencias del alma llegan al baúl sin personaje asignado. Los préstamos y el retorno al morir conservan el mismo ID. Los NPC y las instancias desechables no pueden copiar una creación del alma ni sus componentes.

Kuroi puede restablecer desde la ficha de La creación. La operación retira inventarios y preparaciones, cancela ofertas abiertas y libera la reserva, conservando la plantilla y los recuerdos históricos del cementerio y encuentros terminados. Se rechaza durante un encuentro activo del portador. Una solicitud antigua de entrega no recrea una pertenencia retirada; una nueva entrega utiliza otra solicitud.

No se borran duplicados preexistentes arbitrariamente: la migración rechaza ese estado para que el GM lo revise. Marcar como ligada al alma una plantilla con una sola copia devuelve esta al baúl; con varias copias o preparaciones exige resolverlas primero.

Verificación: `tests/alma-unica-database.mjs`, prueba transaccional `tests/forja-alma-unica-integracion.sql`, `tests/orden-visual.test.mjs` y renderizado real de React en `tests/forja-visual.test.mjs`.
