# Evolución y legado

Un personaje no es una ficha estática: crece, evoluciona y conserva lo que fue. El sistema amplía las formas existentes
(`formas_historia` y las transformaciones) sin sustituirlas.

## Tres clases de forma

| Clase | Qué es | Dónde se configura |
|---|---|---|
| Etapa de vida | Cambio permanente en su existencia (infancia, juventud…). No consume PH ni dura turnos. | Forja → Ficha → Evolución y legado |
| Evolución | Cambio permanente de naturaleza, especie o capacidades. Lineal, ramificada o condicionada. | Forja → Ficha → Evolución y legado |
| Transformación temporal | La de siempre (costes, duración, etapas internas, posesión). Ahora parte de la etapa permanente vigente. | Habilidad con efecto «transformación» |

En el Bestiario: **variante** = configuración alternativa de la especie (sorteada al aparecer); **evolución** = cambio
permanente de una criatura concreta; **transformación** = cambio temporal.

## Persistencia

| Capa | Dónde |
|---|---|
| Plantilla (etapas futuras configuradas) | `forja_maestra.linea_evolutiva` (las formas antiguas se leen como etapas de vida; nunca se reescriben) |
| Instancia individual y etapa actual | `personaje_evolucion` (copia propia de la línea, `etapa_actual`, `hitos`, `version`) |
| Historial de etapas completadas | `personaje_etapas_historial` (instantánea inmutable, quién autorizó, condiciones, combate, `action_id` único) |
| Solicitudes del jugador | `evolucion_solicitudes` |
| Transformación temporal activa | En el combatiente (`transformacion`), sin cambios |

Las transiciones pasan por `evolucion_aplicar_interno`: bloquea personaje y evolución, es idempotente por `action_id`,
valida que la conexión parta de la etapa actual, evalúa requisitos con datos del servidor, consume objetos (nunca
ligados al alma) y reconcilia recursos **sin curación gratuita** (la vida actual se conserva y se limita al nuevo máximo;
el bono de equipo se traslada). Cualquier recuperación se configura en la conexión. Conserva id, dueño, nivel, EXP,
inventario, monedas, relaciones, logros, títulos y grupos.

## RPC

| Función | Quién | Para qué |
|---|---|---|
| `evolucion_inicializar(personaje, linea?)` | GM | Copia la línea de la plantilla (o las formas antiguas) a la instancia. Idempotente. |
| `evolucion_guardar_linea(personaje, linea, version)` | GM | Edita etapas futuras de la instancia con control de versión. |
| `evolucion_aplicar(personaje, transicion, action_id, forzar?)` | GM / dueño | GM: cualquier conexión (forzar queda registrado). Dueño: solo automáticas cumplidas. |
| `evolucion_solicitar(personaje, transicion, action_id)` | Dueño | Pide una evolución de modo «solicitud», si cumple y no es secreta. |
| `evolucion_resolver_solicitud(solicitud, aprobar)` | GM | Aprueba (aplica con el `action_id` de la solicitud) o rechaza. |
| `evolucion_registrar_hito(personaje, tipo, clave, valor)` | GM | Misiones, acontecimientos, derrotas, energías, núcleo, salvaciones y edad; aplica automáticas. |
| `evolucion_comprobar(personaje)` | GM / dueño | Aplica las automáticas cumplidas (action_id determinista: nunca dos veces). |
| `evolucion_vista(personaje)` | GM / dueño | GM: todo. Jugador: lo vivido, la actual y solo los siguientes pasos no secretos, sin estadísticas futuras. |

RLS: la línea completa (`personaje_evolucion`) solo la lee el GM; el historial lo leen el GM y el dueño.

## Requisitos (motor del Yunque)

Árbol con `todas` (Y), `alguna` (O), `no` (NO) y `comparar` —las mismas primitivas de las reglas— más edad, nivel,
experiencia, objeto (poseer/consumir), habilidad, derrotar, misión, energía, núcleo, salvación, acontecimiento y
autorización del GM. Modos: manual del GM, automática, solicitud del jugador, evento de combate y habilidad u objeto.
No hay código por evolución: todo es configuración.

## Combate

`evolucionarEnCombate` cambia al mismo combatiente (mismo id y turno): estadísticas (manteniendo bonos de equipo),
retrato, tamaño con el sistema de huellas y empuje sin daño, habilidades y pasivas de la etapa, inmunidades, animación
de entrada y registro. Conserva heridas, enfriamientos y estados. Con una transformación activa, su referencia pasa a ser
la nueva etapa. En encuentros reales, el trigger `zz_combate_persistir_evoluciones` la guarda al finalizar; en práctica,
nunca. Un fallo al guardar no impide cerrar el encuentro (se avisa).

Encuentro histórico: en la preparación, el GM puede recrear a un personaje en una etapa pasada
(`prepararEtapaHistorica`): sin `personaje_id`, sin equipo real y con la política de práctica (sin EXP ni botín).

Al generar un monstruo desde la Forja se puede elegir la etapa evolutiva; la plantilla y el resto de la especie no cambian.

## Cementerio

`cementerio_evolucion` añade al recuerdo la etapa en la que murió y todo su historial.

## Pruebas

- `tests/evolucion.test.mjs`: lógica pura y combate (etapas, ramas, requisitos, recursos, idempotencia, visibilidad,
  transformación sobre etapa evolucionada, práctica e históricos, rendimiento).
- `tests/evolucion-render.test.mjs`: el editor se renderiza sin JSON.
- `tests/evolucion-database.mjs`: PostgreSQL real con RLS (identidad, permisos, solicitudes simultáneas, consumo sin
  duplicar, exclusivas, historial inmutable, persistencia tras combate real y no en práctica, cementerio).
