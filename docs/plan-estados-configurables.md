# Estados configurables · Plan paso a paso

Estado: plan. Sin cambios de código.

Relación con otros planes:
- **YUNQUE - UNA MÁS** (`docs/planes/plan-yunque-una-mas.md` en `main`): este plan usa sus menús (Parte 1), sus reacciones (Parte 2) y la proyección del «espejo mental» (Parte 3), sin duplicarlos.
- **Parte 4 de inmunidades** (`docs/plan-yunque-una-mas.md` en la rama `claude/admiring-heisenberg-fh1iyc`, pendiente de llevar a `main`): cada estado declara la categoría y el origen que las inmunidades pueden bloquear.

## Principio

Un estado es **una definición de datos** creada en el Yunque, formada por **primitivas** que el motor ya sabe ejecutar. Asustado, Dormido o Envenenado no son casos especiales en el código: son combinaciones de primitivas. Añadir un estado nuevo no debe requerir código.

## Diagnóstico de partida

En `main`, `lib/combate.ts` tiene hoy:

| Estado | Cómo funciona hoy | Ubicación |
|---|---|---|
| Congelado / Aturdido | Pierden el turno; se consume el estado | `lib/combate.ts:813-817` |
| Mojado | Se aplica con agua; se consume con electricidad; permite Superconducción | `:1636-1642`, `:1696`, `:1733-1736` |
| Dominado | El GM decide por el combatiente; el jugador no actúa | `:615-632` |
| Quemadura | Daño periódico (ver Parte 4 del plan de inmunidades) | `lib/combate.ts` |
| Resto (asustado, hipnotizado, dormido, envenenado, paralizado, en trance) | No existen como mecánica; solo como texto | — |

Conclusión: el motor solo tiene estados codificados a mano. Hay que pasar a un catálogo.

## Primitivas nuevas

| Primitiva | Qué hace | Ejemplos |
|---|---|---|
| **Perder turno** | El afectado no actúa en su turno. Puede despertar al recibir daño o al superar una salvación. | Dormido, En trance, Congelado, Aturdido |
| **Movimiento forzado** | Se aleja (o se acerca) de una fuente un número de casillas, con tirada opcional. | Asustado |
| **Cesión de control** | Un jugador rival decide las acciones del afectado durante N turnos. El GM puede cortarlo. | Control mental |
| **Percepción alterada** | Los bandos se ven invertidos en la vista del afectado, de forma aleatoria cada turno. Reutiliza el espejo mental de la Parte 3. | Hipnotizado |
| **Daño periódico** | Daño al inicio o fin del turno, con elemento o naturaleza de origen. | Envenenado, Quemado |
| **Modificador de movimiento** | Cambia las casillas disponibles o las pone a cero, sin tocar acciones. | Paralizado, Congelado |
| **Vulnerabilidad elemental** | Multiplica o amplía el daño de un elemento sobre el afectado. | Mojado frente a electricidad |

## Pasos

### Paso 1 · Auditoría de estados existentes
- **Qué hacer:** listar cada `estado(t, "...")`, `tiene(m, "...")` y `tipo: '...'` de `lib/combate.ts` y de las pantallas de combate. Documentar en `docs/estados-auditoria.md`.
- **Prueba:** ninguna (solo inventario).
- **Criterio de salida:** inventario completo revisado por el GM.

### Paso 2 · Modelo de definición de estado
- **Archivos:** `lib/estados.ts` (nuevo), `lib/creacion.ts`.
- **Qué hacer:** tipo `DefinicionEstado`:
  - `id`, `nombre`, `icono`, `categoria` (`mental`, `fisico`, `elemental`, `narrativo`).
  - `duracion`: turnos fijos, hasta fin de combate, o hasta superar una salvación.
  - `efectos`: lista de primitivas con sus parámetros.
  - `origen`: elemento o naturaleza, para inmunidades y daño periódico.
  - `despertar`: condiciones de fin anticipado (recibir daño, salvación al inicio de turno).
- **Prueba:** `tests/estados-modelo.test.mjs`: validación de duraciones, primitivas y origen.
- **Criterio de salida:** un estado de ejemplo se valida y se guarda.

### Paso 3 · Primitiva «Perder turno»
- **Archivos:** `lib/combate.ts` (inicio de turno, `:813`).
- **Qué hacer:** reemplazar la condición `congelado || aturdido` por la primitiva. Congelado y aturdido se convierten en definiciones de datos que usan la misma primitiva.
- **Prueba:** Congelado y Aturdido siguen perdiendo el turno exactamente igual (regresión de `tests/combate*.test.mjs`).
- **Criterio de salida:** regresión idéntica.

### Paso 4 · Primitiva «Movimiento forzado»
- **Archivos:** `lib/combate.ts` (movimiento y turno), `lib/yunque-arena.ts`.
- **Qué hacer:**
  1. El estado guarda la **fuente** (identificador del combatiente o casilla).
  2. Al inicio de turno, el afectado se mueve 1 o 2 casillas alejándose de la fuente, eligiendo la casilla libre más lejana (determinista) o con tirada, según configuración.
  3. Si no hay casilla libre, no se mueve y se registra en el log.
  4. Validación en servidor: la distancia se comprueba en el motor, no en la interfaz.
- **Prueba:** `tests/estado-asustado.test.mjs`: se aleja 1 o 2 casillas; no atraviesa muros; sin casilla libre no se mueve.
- **Criterio de salida:** prueba pasa.

### Paso 5 · Primitiva «Cesión de control»
- **Archivos:** `lib/combate.ts` (`dominado`, `:615-632`), `components/yunque/ArenaDolls.tsx`, `app/ficha/combate/page.tsx`.
- **Qué hacer:**
  1. Generalizar Dominado: el controlador puede ser el GM (como hoy) **o un jugador rival**.
  2. El jugador controlador decide las acciones del afectado durante N turnos. El afectado ve un aviso en pantalla (Dialogo, Parte 1).
  3. El GM puede cortar el control en cualquier momento.
  4. Los recursos (PH, Fatiga) del afectado siguen gastándose de su ficha.
- **Prueba:** `tests/control-mental.test.mjs`: el rival puede actuar con el personaje ajeno; al terminar, el control vuelve; el GM puede cortarlo.
- **Criterio de salida:** prueba pasa; Dominado existente se comporta igual.

### Paso 6 · Primitiva «Percepción alterada» (Hipnotizado)
- **Archivos:** la proyección de la Parte 3 (espejo mental), `lib/combate.ts` (estado).
- **Qué hacer:**
  1. Hipnotizado usa la misma proyección que el espejo mental, con **aleatoriedad por turno**: cada enemigo o aliado tiene una probabilidad configurable de aparecer en el bando contrario.
  2. Solo cambia la vista del afectado. El objetivo que envía la acción es el real, y el registro lo guarda.
- **Prueba:** `tests/hipnotizado.test.mjs`: la probabilidad se respeta con semilla fija; el objetivo real queda en el registro.
- **Criterio de salida:** prueba pasa.

### Paso 7 · Primitiva «Daño periódico» (Envenenado, Quemado)
- **Archivos:** `lib/combate.ts` (inicio o fin de turno), `lib/inmunidades.ts` (Parte 4).
- **Qué hacer:**
  1. Daño por turno con naturaleza o elemento configurable (veneno para Envenenado, fuego para Quemado).
  2. Antes de aplicarlo, `comprobarInmunidad` (Parte 4). Un personaje inmune a veneno no recibe el daño ni el estado.
  3. Cada estado guarda su origen, como exige la Parte 4.
- **Prueba:** `tests/estado-periodico.test.mjs`: Envenenado da daño de veneno; inmunidad a veneno lo bloquea; Quemado conserva fuego.
- **Criterio de salida:** prueba pasa.

### Paso 8 · Primitiva «Modificador de movimiento» (Paralizado, Congelado)
- **Archivos:** `lib/combate.ts` (cálculo de movimiento).
- **Qué hacer:** reduce o anula las casillas de movimiento sin tocar las acciones. Paralizado pone el movimiento a 0; Congelado lo reduce a la mitad (valor configurable).
- **Prueba:** `tests/estado-movimiento.test.mjs`.
- **Criterio de salida:** prueba pasa.

### Paso 9 · Migración de estados existentes
- **Archivos:** `lib/estados.ts`, `lib/combate.ts`.
- **Qué hacer:** Congelado, Aturdido, Mojado, Dominado y Quemadura pasan a ser definiciones. Sus resultados no cambian.
- **Prueba:** regresión completa: `node --test tests/*.test.mjs`. La batería de Kion debe dar el mismo resultado.
- **Criterio de salida:** ningún resultado cambia.

### Paso 10 · Editor de estados en el Yunque
- **Archivos:** `components/yunque/editores/EditorEstados.tsx` (nuevo), `components/yunque/TallerYunque.tsx`.
- **Qué hacer:**
  1. Panel «Estados»: elegir un estado del catálogo o crear uno nuevo.
  2. Para cada estado: duración, primitivas (con sus parámetros), origen, despertar.
  3. Vista previa en lenguaje claro: «Asustado: se aleja 1–2 casillas de su fuente cada turno; dura 3 turnos».
  4. Sin JSON ni SQL.
- **Prueba:** Playwright en el Yunque a 390 px y escritorio: crear un estado nuevo que combine «perder turno» y «daño periódico».
- **Criterio de salida:** el estado nuevo funciona en combate sin tocar código.

### Paso 11 · Interfaz de combate
- **Archivos:** tarjeta de combatiente, `app/ficha/combate/page.tsx`.
- **Qué hacer:** icono y duración visibles en la tarjeta; tooltip con la frase; aviso en el registro cuando un estado empieza, actúa o termina.
- **Prueba:** Playwright: la frase del tooltip coincide con la del editor.
- **Criterio de salida:** coherencia entre editor y combate.

### Paso 12 · Verificación final
- Estados de ejemplo: Asustado, Control mental, Hipnotizado, Dormido, Envenenado, Congelado, Mojado, Quemado, Paralizado y En trance.
- Cada uno con su prueba y con una combinación entre dos estados.
- Resultados anotados en `docs/metricas/`.
- **Criterio de salida:** los diez estados pasan en partida de prueba.

## Decisiones que necesito

1. **Asustado:** ¿el afectado puede atacar a la fuente si está acorralado, o solo huye?
2. **Control mental:** ¿el rival puede ordenar acciones que harían daño a sus propios aliados? (Recomiendo sí, porque es el efecto que pediste.)
3. **Dormido:** ¿despierta solo al recibir daño, o también al superar una salvación al inicio de turno? (Recomiendo las dos opciones configurables.)
4. **En trance:** ¿se diferencia de Dormido solo en la duración o también en las reacciones que permite? (Propongo que En trance no permite reacciones.)
5. **Paralizado:** ¿puede seguir usando reacciones? (Propongo que sí.)
6. **Hipnotizado:** ¿la probabilidad de cambio de bando es por enemigo, o un valor único para todo el combate? (Propongo por combatiente y por turno.)
7. **Relación con inmunidades:** ¿los estados mentales (asustado, control mental, hipnotizado) quedan bloqueados por Mente Inquebrantable, o requieren revisión de las reglas oficiales de YUGEN? (Mismo criterio que la Parte 4: no lo decide el plan.)

## Riesgos

- Mezclar estados de datos y estados codificados puede dejar combates en curso con resultados distintos. Por eso el paso 9 exige regresión completa antes de pasar al editor.
- Cesión de control entre jugadores puede frustrar la partida; por eso el GM puede cortarla siempre.
- La percepción alterada debe ser solo visual. Si cambia el objetivo real, se rompe la confianza del registro.
