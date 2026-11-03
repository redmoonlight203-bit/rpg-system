# Descripciones claras

Los recuadros de ayuda de acciones en combate y de tarjetas y acciones en La creación utilizan una explicación en lenguaje natural. Debajo se muestran únicamente los datos pertinentes, con sus costes y salvaciones reales. Se eliminó la descripción técnica automática que enumeraba tipos internos, elementos inexistentes y duración o enfriamiento cero.

Ejemplos: Ataque desarmado → «Ataca con el puño»; Guardia → «Adopta una postura defensiva para protegerte»; curación → «Recupera vida del objetivo sin superar su vida máxima».

En Dados y efectos se añadió **Descripción para el jugador (opcional)** por acción. El motor de reglas tiene el mismo campo por regla. Si está vacío se genera una explicación según su configuración. El texto propio no altera daño, costes, salvaciones ni condiciones. Las descripciones se guardan dentro de los JSON de efectos y reglas existentes; no requieren SQL.

Las acciones y reglas de encuentros ya guardados conservan su configuración de aquel momento. Para incorporar una descripción recién editada hay que preparar de nuevo el participante en un encuentro nuevo. Las explicaciones automáticas sí funcionan con datos antiguos sin editar ni volver a guardar nada.

Las ayudas se abren con el ratón y con foco de teclado. Las tarjetas mantienen la apertura de detalle al pulsarlas. Las descripciones nunca se interpretan como HTML.

Verificación: `node --test tests/descripciones.test.mjs tests/creacion.test.mjs tests/combate.test.mjs tests/combate-interactivo.test.mjs`, TypeScript y compilación de producción. La revisión visual en navegador queda pendiente por la limitación del servidor de vista previa administrado.
