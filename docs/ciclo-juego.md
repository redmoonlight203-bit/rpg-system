# Ciclo de juego integrado (primera versión)

El documento maestro del 7 de noviembre guía este cambio. La exploración del mundo de YUGEN 2.0 permanece fuera de alcance.

## Uso

- En **Combate → Reglas del encuentro y resultado**, configurar campaña, modalidad, cierre automático, límite de rondas y política de EXP antes de iniciar. Elegir tablas por participante permite diferenciar un goblin asesino, tanque o mago. Los cofres y objetivos se añaden como fuentes independientes de botín.
- En **Forja → Botín, logros y títulos**, crear tablas con objetos o recursos de La Creación y monedas existentes, pesos, probabilidades, cantidades, rareza, bandas de calidad y nivel mínimo de la fuente. Las entradas garantizadas se añaden a una selección aleatoria elegible. Una tabla vacía no entrega nada.
- Las bandas del d20 se editan desde el acceso de **Estadísticas y reglas**. Las cinco bandas deben cubrir 1–20 sin huecos. Un 20 no puede introducir objetos fuera de la tabla.
- Al desaparecer el último bando activo se bloquean las acciones, se resuelven los efectos de fin y se presenta el resumen. El GM puede registrar rendición, retirada, captura o muerte; un neutral no determina la victoria. Llegar a 0 HP significa inconsciencia, no muerte definitiva.
- Antes de aprobar se puede revisar el ganador y ajustar EXP con motivo. Aprobar confirma el crecimiento de reglas, entrega EXP y tira el saqueo en una operación atómica. Un reintento devuelve el resultado guardado.
- La EXP se concede a participantes del bando ganador que sean personajes de jugadores aprobados o compañeros de su party activa. Invocaciones y plantillas no reciben EXP. Se puede replicar, dividir o ponderar por daño/curación; el reparto proporcional redondea hacia abajo. La dificultad multiplica EXP de enemigos y objetivo, y el ajuste del GM se aplica después; el total está limitado a un millón por destinatario.
- El GM reparte cada fuente de botín a un participante elegible. Las monedas van a la cuenta. Los objetos del alma van al baúl de la cuenta y los demás al personaje. `capacidad_inventario`, si está definido, limita el número de copias; ante falta de espacio la entrega completa se revierte y queda pendiente.
- Los logros responden a victorias, enemigos derrotados, niveles alcanzados y adjudicaciones de saqueo confirmadas. El alcance puede ser cuenta, personaje o cuenta dentro de una campaña. Los logros secretos se revelan al desbloquearse. Los títulos se conservan como recompensas cosméticas; el jugador elige cuál mostrar. Las correcciones del GM quedan auditadas.
- **Arena** permite crear entrenamiento PvE y salas PvP abiertas. Crear y aceptar una sala constituye el consentimiento de cada participante. Se juega desde la pantalla habitual de Combates, usando el mismo motor. Los vitales, el equipo y los consumibles de la ficha real no se sincronizan desde estas copias; no se paga EXP ni se genera botín permanente. Cualquiera de los participantes puede retirarse y cerrar su sala.
- **Mapa de combate** permite pintar muros, cobertura, suelo difícil y peligros; generar ruinas/bosque y elegir posiciones iniciales. El suelo difícil cuesta 2 de movimiento; cobertura otorga +2 ARM a distancia; peligros causan 2 de daño al llegar y al iniciar turno. Los muros bloquean movimiento y trayectorias de lanzamiento. Las áreas usan la geometría de casillas existente.
- Las acciones del Yunque pueden elegir representación 2D: proyectil, destello, aura, impacto, trayectoria, desplazamiento o ninguna. Son visuales de resultados confirmados, con movimiento reducido respetado.

## Persistencia y compatibilidad

Las nuevas tablas tienen RLS y las operaciones de recompensa se autorizan en funciones privadas, expuestas con envoltorios `SECURITY INVOKER`. Los encuentros y fuentes usan bloqueos transaccionales; sus claves únicas impiden repetir EXP o saqueo. Una aprobación congela el resultado. El historial del jugador muestra su EXP y los avisos de nivel/entrega sin exponer instantáneas privadas de enemigos.

Las cuatro migraciones son necesarias junto con los endpoints `combate-jugador`, `equipo-combate` y `arena-yugen`, todos con el mismo `motor.js` generado. Las fuentes Noto se incluyen localmente, con licencia OFL, para que compilar no dependa de Google Fonts.

## Validación

```sh
node scripts/preparar-motor-edge.mjs --check
node --test tests/*.test.mjs
FORJA_PGLITE_MODULE=/ruta/pglite/dist/index.js node tests/ciclo-encuentros-database.mjs
npx tsc --noEmit
npm run build
```

`tests/ciclo-encuentros-integracion.sql` está diseñado para una transacción con `ROLLBACK`. No ejecutar sus datos de prueba con `COMMIT`.

## Límites de esta versión

El reparto necesidad/codicia y el saqueo compartido quedan para versiones posteriores, como indica el documento maestro. El editor de logros inicial ofrece los cuatro disparadores comprobables indicados arriba; la exploración del mundo y los descubrimientos geográficos pertenecen a V2. No se añade IA generativa ni un motor 3D. Las salas abiertas se listan solo para jugadores aprobados; no se incluyen espectadores ni matchmaking automático.
