# Laboratorio de balance de YUGEN

El Yunque muestra el laboratorio dentro de la arena de La Forja. Ejecuta el borrador y un portador desarmado de referencia durante cinco rondas en siete escenarios de modo Impacto. El informe es local, se calcula bajo demanda y puede descargarse con los insumos, los perfiles, la versión y la semilla. La clase preliminar usa únicamente daño observado. La apertura mide la primera acción ejecutada y el rendimiento sostenido acumula el daño efectivo de las cinco rondas.

Los resultados informan daño, curación aprovechada, HP perdido, PH y Fatiga netos de cada acción, acciones consumidas, caídas y control observado. Un ataque de reemplazo desarmado cuenta como acción cuando la técnica elegida no está disponible. El motor puede elegir una activación alternativa por orden del borrador. Los avisos se muestran en el laboratorio y el guardado normal de La Forja permanece disponible.

## Inventario y contrato de estadísticas

| Campo | Ámbito y unidad | Resolución vigente | Fuente y acumulación |
|---|---|---|---|
| `vida`, `hp` | Combatiente, HP máximos | `vida` prevalece sobre el alias `hp`. `vida` del estado de combate es el HP actual | Ficha, equipo permitido, pasivas y estados del motor |
| `ph` | Combatiente, puntos | Capacidad. El saldo disponible se recorta al máximo efectivo | Ficha, equipo y efectos. El saldo se gasta y recupera independientemente |
| `fatiga` | Combatiente, puntos | Capacidad. Fatiga actual se acumula y puede causar agotamiento | Ficha, equipo y efectos. El saldo se calcula por separado |
| `armadura` | Combatiente, puntos | Umbral en Impacto, reducción en Reducción, según el modo del encuentro | Ficha, equipo y defensas aplicables al evento |
| `bono_impacto`, `dano` | Combatiente, puntos | Modificador del d20 y del daño convencional | El daño propio de un arma se resuelve en su efecto de dados |
| `iniciativa`, `salvacion` | Combatiente, puntos | Modificadores del dado de orden o de una salvación | Ficha y efectos efectivos. Una salvación puede declarar su atributo |
| `movimiento` | Combatiente, casillas | Presupuesto de movimiento, calculado con el motor y el tablero | Estadística efectiva, terreno y movimiento ya gastado |
| `fisico`, `magico`, `resistencia`, `inteligencia`, `agilidad` | Combatiente, puntos | Progresión, requisitos y efectos que declaren la clave | La subida de una aptitud carece de escalado universal al ataque |
| `peso` | Instancia de objeto, unidad histórica pendiente | Excluido de los bonos de equipo. Evidencia estática de valores `1`, `1.5` y `2` en el catálogo de armas sin declaración de unidad | Conservar el peso de la copia. Una masa de ensayo se captura explícitamente en kg |
| `carga_actual`, `carga_capacidad` | Combatiente, kg | Derivadas solo en el laboratorio | Suma de instancias llevadas y capacidad experimental desde Físico y Resistencia |
| `peso` de botín o variante | Tabla de aparición, ponderación | Sorteo de botín o de variante | La ponderación tiene origen y unidad independientes de la masa |

**Contrato para nuevas definiciones.** Cada clave debe registrar propietarios permitidos, tipo, unidad, fuente, límites, valor por defecto, política de acumulación, instante de resolución, efecto, visibilidad, versión y estado funcional. El catálogo persistente actual resuelve definiciones numéricas por linaje, con sustitución por clave en el hijo. Identificador, booleano, porcentaje, recurso y regla requieren un contrato de datos antes de extender ese almacenamiento. Las propiedades de materiales pertenecen a recetas o transformaciones de forja. Los atributos sin consumidor confirmado se marcan pendientes en el inventario y requieren revisión por clave.

`scripts/auditar-balance.sql` devuelve duplicados, definiciones heredables, mínimos y máximos por clave, y un resumen de peso ausente, inválido o cero en el catálogo y en las copias. El resultado se divide por relación con un personaje. La asociación a un personaje todavía requiere validación como fuente de ubicación física. La consulta no lee nombres de jugadores ni modifica filas. La lectura de RealYugen quedó pendiente por permisos del conector y las consultas se comprobaron en PostgreSQL aislado. Los respaldos de producción requieren acceso autorizado.

| Recorrido | Implementación vigente que se debe preservar |
|---|---|
| Catálogo y herencia | `lib/estadisticas.ts`, `app/dm/reglas`, `config_estadisticas`, `categorias_forja` |
| Edición y validación | `app/dm/forja`, `lib/creacion.ts`, `components/yunque` |
| Clase guardada | `lib/clases.ts`, `forja_clase_calculada` y disparador de `forja_maestra` |
| Inventario y equipo | `inventario_jugador`, RPC de copias y preparación de configuración, `cambiarEquipo` |
| Combate y snapshots | `lib/combate.ts`, versión Edge generada y snapshots de encuentro |
| Razas, progresión y monstruos | Migración `20261104124500`, `lib/progresion.ts` y `lib/monstruos.ts` |

## Resultados reproducibles

```sh
node scripts/simular-balance.mjs
node scripts/simular-balance.mjs yugen-balance.json
npm test
npm run test:database
```

El ejemplo enfrenta dos técnicas de 2d6 con una reserva inicial de 2 PH. Media de 24 repeticiones por escenario, semilla 20261120. La variante de coste 2 PH ejecuta el ataque ordinario cuando queda sin PH.

| ARM | Daño de apertura en ambas técnicas | Daño en cinco rondas, 0 PH | Daño en cinco rondas, 2 PH |
|---:|---:|---:|---:|
| 5 | 5,75 | 30,71 | 14,38 |
| 9 | 4,83 | 24,46 | 11,71 |
| 14 | 3,25 | 17,75 | 8,38 |

El IPE ofensivo agregado fue 2,886 y 1,374 respectivamente, con apertura B en ambos casos. Los valores se basan en un ancla sintética de ataque desarmado. No representan a una raza ni a una campaña. Las pruebas de carga incluyen deduplicación por instancia, contenedores externos y cíclicos, pilas, masa explícita cero y límites 80/100/125/150 %. La proyección visual prueba la pieza sola en tres portadores sintéticos y no modifica estadísticas de combate.

## Decisiones de reglamento y activación

| Fase del plan | Estado y criterio para avanzar |
|---|---|
| 0 y 1 | Mapa local, contrato inicial y auditoría SQL listos. Verificar inventario, unidades, reglas y snapshots efectivos de RealYugen con acceso de lectura |
| 2 | Banco de cinco rondas y comparación inicial reproducible. Faltan duelos raciales, equipos de referencia por nivel, anclas de apoyo, defensa y control, y dispersión estadística |
| 3 | Pendiente de aprobación por paquete racial, incluyendo rasgos extraordinarios, pasivas existentes y efectos de fabricación |
| 4 | Carga experimental y verificadores. Para activar consecuencias reales, confirmar unidad y bandas. Diseñar ubicación física y cantidades de las copias, recomputar al cambiar posesión o forma y verificar combate, botín y cementerio con IDs de instancia reales |
| 5 | Avisos en La Forja y clase ofensiva preliminar F–KUROI. Faltan anclas por rol y nivel, preparación estratégica, sacrificios permanentes, presupuesto de encuentros, valoración de efectos no comparables y clasificación oficial del servidor |
| 6 | Pendiente de autorización. Probar el catálogo versionado y la reconciliación de datos legacy en una copia aislada. Preservar snapshots, guardar origen de cada unidad y separar clase estimada de clase confirmada. El rollback debe poder volver al motor anterior sin reescribir fichas históricas |
| 7 | Verificación de repositorio y base aislada. Resta una prueba autenticada con perfiles y datos de prueba, revisión de concurrencia al activar la mecánica y verificación del despliegue autorizado |

La medición actual usa enemigos de referencia y una estrategia determinista simple. Una acción negada solo cuenta cuando el motor deja al rival con su acción consumida en su turno. Los controles o sacrificios que el motor no ejecuta y las ventajas narrativas requieren valoración aparte. El informe no tiene autoridad sobre las reglas ni permisos. La etiqueta KUROI conserva su posición final.
