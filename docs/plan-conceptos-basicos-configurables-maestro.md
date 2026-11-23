# CONCEPTOS BÁSICOS QUE NO ERAN CONFIGURABLES Y AHORA SÍ · Plan maestro

Estado: plan. Sin cambios de código. Un solo documento con todo lo acordado desde la propuesta de rasgos combinables hasta hoy.

## Alcance

Incluye, en este orden de dependencias:

| Apéndice | Tema | Por qué aquí |
|---|---|---|
| A | Inmunidades, efectos mentales y equipamiento | Los estados y las habilidades que ignoran inmunidades dependen de ella |
| B | Estados configurables | Quemadura, Congelado, Asustado y demás se definen con primitivas y usan las inmunidades |
| C | Rasgos combinables | Bioelectricidad potencia Bola de fuego; usa recursos configurables y etiquetas |
| D | Conceptos básicos configurables | Desarmado, guardia y esqueletos de armas; no depende de A–C salvo en que sus efectos pueden llevar estados |

No incluye: YUNQUE - UNA MÁS Partes 1–3 (menús, reacciones generales y artefactos con nivel). Están ejecutadas en `main` (PR #56), con pendientes menores en `docs/pendientes-yunque-una-mas.md`.

Cada apéndice conserva su numeración interna. Las referencias como «Paso 2» dentro de un apéndice apuntan a ese mismo apéndice.

## Orden global de ejecución

0. **Fase 0 · Base.** Crear la rama `claude/conceptos-basicos-configurables` desde `origin/main` y traer este documento. Resolver los siete pendientes de `main` si siguen abiertos (no bloquean, pero conviene cerrarlos antes de tocar reacciones).
1. **Fase 1 · Apéndice A.** Sistema universal de inmunidades (paso 4.1), estados con origen (4.2), efectos mentales (4.3), pasivas y rutas especiales (4.4), equipamiento (4.5), editor visual (4.6), pruebas (4.7).
2. **Fase 2 · Apéndice B.** Estados configurables: auditoría (paso 1), modelo (2), y después primitivas y migración (3–9), editor (10) y combate (11–12).
3. **Fase 3 · Apéndice C.** Rasgos: modelo de efectos con componentes elementales y etiquetas (pasos 1–2), definición de rasgo y potenciador (3), catálogo de recursos (4), aplicación en combate (5), asignación (6), interfaz (7–8), verificación (9).
4. **Fase 4 · Apéndice D.** Conceptos básicos: desarmado (A), guardia (B), esqueletos y animaciones (C), verificación (D).
5. **Fase 5 · Verificación global.** Ver abajo.

Las fases 3 y 4 pueden hacerse en paralelo después de la fase 2, porque no comparten archivos del motor salvo `lib/combate.ts`. Hacerlas en paralelo exige revisar conflictos en ese archivo antes de unir.

## Decisiones tomadas

- **Bioelectricidad:** 1 CB = 1d6, configurable por potenciador. Potenciar no cambia el enfriamiento. Dos rasgos con el mismo elemento suman sus dados, con un máximo de componentes.
- **Recursos:** ningún recurso está fijo en el motor. CB es solo la primera entrada del catálogo.
- **Asustado:** solo huye mientras dure el efecto. No ataca a la fuente.
- **Control mental:** el rival puede ordenar daño a sus propios aliados.
- **Dormido:** criterios de despertar configurables.
- **En trance:** pierde el turno y no puede usar reacciones.
- **Paralizado:** pierde el primer turno siempre. Después pierde un turno más por cada inicio de turno hasta superar la salvación. Mantiene reacciones.
- **Hipnotizado:** probabilidad de cambio de bando configurable.
- **Ignorar inmunidades:** se pueden crear habilidades que ignoran categorías, estados o tipos de daño. Qué queda bloqueado por defecto lo decide YUGEN.
- **Desarmado y guardia:** configurables por personaje, criatura o linaje, con sustitución por identificador.
- **Esqueletos:** las animaciones salen de un esqueleto. Solo el GM crea esqueletos nuevos. Los puños pueden tener un ancla opcional para objetos.

## Verificación global

- `node --test tests/*.test.mjs` completo, sin cambios en las pruebas de Kion (1.344 combinaciones) ni en las de reacciones.
- Pruebas de base de datos con PGlite cuando haya migraciones (inmunidades, recursos, esqueletos).
- `npm run build` sin errores de TypeScript.
- Playwright a 390 px y escritorio para cada pantalla nueva o modificada: Yunque (defensas, estados, recursos, esqueletos), combate (potenciadores, estados, animaciones).
- Partida de prueba con: un dragón inmune al fuego y a Quemadura; un personaje inmune a control mental que recibe una habilidad que lo ignora; una Bola de fuego potenciada con bioelectricidad; los seis esqueletos base; un desarmado y una guardia personalizados.
- Resultados anotados en `docs/metricas/` con la fecha real.

## Riesgos generales

- **Cambiar el motor de estados e inmunidades** afecta a todos los combates. Cada apéndice exige regresión antes de pasar al siguiente.
- **Migrar de datos a catálogos** puede dejar creaciones antiguas sin valor. Toda migración se hace al cargar, sin escribir en la base, salvo donde se indique.
- **Animaciones nuevas** tienen coste visual. Cada esqueleto debe pasar la prueba de rendimiento de `docs/combate-calidad-visual.md`.

## Preguntas abiertas (consolidadas)

1. Qué estados mentales quedan bloqueados por defecto por Mente Inquebrantable. Lo decide YUGEN en sus reglas oficiales.
2. ¿El esqueleto de puños puede sostener un objeto? Propongo que sí, como ancla opcional.
3. ¿La guardia dura turnos del portador o rondas? Propongo turnos del portador.
4. ¿La potenciación de rasgos puede combinar dos elementos distintos en una sola técnica además de sumar componentes? Propongo que solo sume componentes; los combos se evalúan por componente.

---



---

## Apéndice A · Inmunidades, efectos mentales y equipamiento (Parte 4 de YUNQUE - UNA MÁS)

Origen: resumen técnico del 23-11 («Resumen de mejoras necesarias para la Forja y el Yunque»). Se ejecuta **antes de la Parte 3**: la Parte 3 necesita la clasificación mental de este bloque.

Principio: un solo sistema reutilizable de inmunidades y resistencias. Nada de excepciones por criatura ni por estado.

Orden interno: 4.1 → 4.2 → 4.3 → 4.4 → 4.5. El paso 4.2 es el de mayor riesgo, porque cambia cómo se aplican los estados.

##### Paso 4.1 · Sistema universal de inmunidades

- **Archivos nuevos:** `lib/inmunidades.ts`, `tests/inmunidades.test.mjs`.
- **Qué hacer:**
  1. Definir una inmunidad como `{tipo, valor, origen, modo}` con `tipo` en: `dano` (tipo de daño o elemento), `estado` (nombre de estado), `categoria` (por ejemplo, `mental`) y `modo` en: `bloquear_dano`, `bloquear_aplicacion`, `bloquear_todo`.
  2. Una inmunidad al fuego (`dano: fuego`) **no** implica inmunidad a Quemadura (`estado: quemadura`). Son entradas independientes; si el GM quiere ambas, las configura.
  3. Función única `comprobarInmunidad(objetivo, candidato)` que devuelve `{bloqueado: boolean, motivo}`.
  4. Las inmunidades se agregan de: personaje, raza, linaje, pasivas, estados activos y equipo equipado. Al desequipar, se retiran.
- **Prueba:** cada combinación de `tipo` y `modo`; inmunidad al fuego sin inmunidad a Quemadura; inmunidad de equipo que desaparece al desequipar.
- **Criterio de salida:** prueba de `lib/inmunidades.ts` pasa; el motor todavía no lo usa.

##### Paso 4.2 · Estados y daño periódico conservan su origen

- **Archivos:** `lib/combate.ts` (aplicación de estados, daño de inicio de turno, Quemadura), `lib/creacion.ts`.
- **Qué hacer:**
  1. Cada estado registra el elemento de origen (`origen.elemento`), además de su nombre.
  2. El daño periódico de Quemadura se procesa como daño de **fuego** (con su origen), así la inmunidad al fuego lo reconoce.
  3. Antes de aplicar un estado o un daño periódico, se comprueba `comprobarInmunidad`. Si bloquea, se registra en el log el motivo.
  4. Antes de este paso, un estado sin inmunidad **sigue aplicándose igual** (regresión).
- **Prueba:** `tests/estados-origen.test.mjs`: Quemadura con inmunidad al fuego se bloquea solo si hay inmunidad a Quemadura; el daño periódico de fuego se reduce con inmunidad a fuego.
- **Criterio de salida:** `tests/combate*.test.mjs` y las pruebas de Kion pasan sin cambios de resultado.

##### Paso 4.3 · Clasificación de efectos mentales

- **Archivos:** `lib/creacion.ts` (tipo `Efecto` y estados), `lib/reglas.ts`, `components/yunque/editores/EditorAccion.tsx`.
- **Qué hacer:**
  1. Añadir `categoria?: 'mental'` (y subcategorías configurables: control, miedo, ilusión, confusión, memoria, posesión) a habilidades y estados.
  2. Los estados existentes que sean mentales se etiquetan en la migración de datos, sin cambiar su efecto.
  3. Distinguir tres resultados: **superar la salvación** (el efecto no ocurre), **resistir** (el efecto ocurre reducido o acortado) y **inmunidad completa** (el efecto se bloquea antes de la salvación).
- **Prueba:** `tests/efectos-mentales.test.mjs`: tres resultados diferenciados; un efecto sin categoría no se ve afectado por inmunidades mentales.
- **Criterio de salida:** los estados mentales existentes tienen categoría y su resultado no cambia.

##### Paso 4.4 · Pasivas de inmunidad mental y revisión de rutas especiales

- **Archivos:** `lib/pasivas.ts`, `lib/combate.ts` (rutas de posesión y pérdida de control, como «Esclavitud» y «Dominado»).
- **Qué hacer:**
  1. Una pasiva puede otorgar inmunidad o resistencia a una categoría (por ejemplo, Mente Inquebrantable: inmunidad a `mental` de tipo `control`, sin tirada).
  2. Revisar cada ruta especial de control o posesión y hacer que pase por `comprobarInmunidad` antes de aplicar el efecto. Listar las rutas en el informe de la fase.
  3. **No** se decide todavía qué posesiones son bloqueables. Esa decisión queda como pregunta abierta del GM y de las reglas oficiales.
- **Prueba:** `tests/mente-inquebrantable.test.mjs`: la pasiva bloquea un efecto de control sin tirar salvación; un efecto de daño físico no se bloquea.
- **Criterio de salida:** el informe de rutas especiales está completo y cada ruta usa la comprobación.

##### Paso 4.5 · Equipamiento: Fatiga, Vida y PH en las familias donde corresponda

- **Archivos:** `lib/creacion.ts` (`SLOTS`, familias de equipo), editor de atributos de la Forja (ubicar en `components/yunque/editores/`).
- **Qué hacer:**
  1. Confirmar en la base de datos qué atributos tiene cada familia (Accesorios sí tiene Fatiga; Armadura solo Defensa).
  2. Habilitar Fatiga máxima, Vida máxima y PH máximo para las familias donde corresponda, **sin cambiar el cálculo de estadísticas**: el motor ya suma bonificaciones.
  3. Los controles aparecen en el Yunque según la familia elegida.
  4. Ejemplo de validación: «Capa del Viajero · Objeto · Ranura Capa · +2 Fatiga máxima mientras esté equipada».
- **Prueba:** `tests/equipo-atributos.test.mjs`: la bonificación aparece al equipar y desaparece al desequipar; no altera otras familias.
- **Criterio de salida:** una capa con +2 Fatiga máxima funciona en la ficha y en combate.

##### Paso 4.6 · Editor visual «Defensas e inmunidades» en el Yunque

- **Archivos:** `components/yunque/editores/EditorDefensas.tsx` (nuevo), `components/yunque/TallerYunque.tsx`.
- **Qué hacer:**
  1. Sección nueva con tres columnas: **Daño** (elemento), **Estado** y **Categoría** (mental, etc.), cada una con un selector y un interruptor «Inmunidad».
  2. Selector de duración: permanente, mientras esté equipada, o por turnos.
  3. La vista previa usa la frase de la Parte 2 («Inmune al fuego; no a Quemadura»).
  4. Sin JSON ni SQL para el GM.
- **Prueba:** Playwright en la Forja a 390 px y escritorio: crear una criatura inmune al fuego que no sea inmune a Quemadura.
- **Criterio de salida:** los cuatro ejemplos del resumen se crean desde la interfaz.

##### Paso 4.7 · Pruebas de combate y equipamiento

- Criatura inmune al fuego, vulnerable a otros estados.
- Dragón inmune al fuego y a Quemadura.
- Personaje inmune al control mental, vulnerable al daño físico.
- Objeto que concede inmunidad temporal mientras está equipado; desaparece al desequipar.
- Capa con Fatiga máxima sin habilidades adicionales.
- **Criterio de salida:** las cinco pruebas pasan y se anotan en `docs/metricas/`.

---


---

## Apéndice B · Estados configurables

Estado: plan. Sin cambios de código.

Relación con otros planes:
- **YUNQUE - UNA MÁS** (`docs/planes/plan-yunque-una-mas.md` en `main`): este plan usa sus menús (Parte 1), sus reacciones (Parte 2) y la proyección del «espejo mental» (Parte 3), sin duplicarlos.
- **Parte 4 de inmunidades** (`docs/plan-yunque-una-mas.md` en la rama `claude/admiring-heisenberg-fh1iyc`, pendiente de llevar a `main`): cada estado declara la categoría y el origen que las inmunidades pueden bloquear.

#### Principio

Un estado es **una definición de datos** creada en el Yunque, formada por **primitivas** que el motor ya sabe ejecutar. Asustado, Dormido o Envenenado no son casos especiales en el código: son combinaciones de primitivas. Añadir un estado nuevo no debe requerir código.

#### Diagnóstico de partida

En `main`, `lib/combate.ts` tiene hoy:

| Estado | Cómo funciona hoy | Ubicación |
|---|---|---|
| Congelado / Aturdido | Pierden el turno; se consume el estado | `lib/combate.ts:813-817` |
| Mojado | Se aplica con agua; se consume con electricidad; permite Superconducción | `:1636-1642`, `:1696`, `:1733-1736` |
| Dominado | El GM decide por el combatiente; el jugador no actúa | `:615-632` |
| Quemadura | Daño periódico (ver Parte 4 del plan de inmunidades) | `lib/combate.ts` |
| Resto (asustado, hipnotizado, dormido, envenenado, paralizado, en trance) | No existen como mecánica; solo como texto | — |

Conclusión: el motor solo tiene estados codificados a mano. Hay que pasar a un catálogo.

#### Primitivas nuevas

| Primitiva | Qué hace | Ejemplos |
|---|---|---|
| **Perder turno** | El afectado no actúa en su turno. Puede despertar al recibir daño o al superar una salvación. | Dormido, En trance, Congelado, Aturdido |
| **Movimiento forzado** | Se aleja (o se acerca) de una fuente un número de casillas, con tirada opcional. | Asustado |
| **Cesión de control** | Un jugador rival decide las acciones del afectado durante N turnos. El GM puede cortarlo. | Control mental |
| **Percepción alterada** | Los bandos se ven invertidos en la vista del afectado, de forma aleatoria cada turno. Reutiliza el espejo mental de la Parte 3. | Hipnotizado |
| **Daño periódico** | Daño al inicio o fin del turno, con elemento o naturaleza de origen. | Envenenado, Quemado |
| **Modificador de movimiento** | Cambia las casillas disponibles o las pone a cero, sin tocar acciones. | Paralizado, Congelado |
| **Vulnerabilidad elemental** | Multiplica o amplía el daño de un elemento sobre el afectado. | Mojado frente a electricidad |

#### Pasos

##### Paso 1 · Auditoría de estados existentes
- **Qué hacer:** listar cada `estado(t, "...")`, `tiene(m, "...")` y `tipo: '...'` de `lib/combate.ts` y de las pantallas de combate. Documentar en `docs/estados-auditoria.md`.
- **Prueba:** ninguna (solo inventario).
- **Criterio de salida:** inventario completo revisado por el GM.

##### Paso 2 · Modelo de definición de estado
- **Archivos:** `lib/estados.ts` (nuevo), `lib/creacion.ts`.
- **Qué hacer:** tipo `DefinicionEstado`:
  - `id`, `nombre`, `icono`, `categoria` (`mental`, `fisico`, `elemental`, `narrativo`).
  - `duracion`: turnos fijos, hasta fin de combate, o hasta superar una salvación.
  - `efectos`: lista de primitivas con sus parámetros.
  - `origen`: elemento o naturaleza, para inmunidades y daño periódico.
  - `despertar`: condiciones de fin anticipado (recibir daño, salvación al inicio de turno).
- **Prueba:** `tests/estados-modelo.test.mjs`: validación de duraciones, primitivas y origen.
- **Criterio de salida:** un estado de ejemplo se valida y se guarda.

##### Paso 2.1 · Habilidades que ignoran inmunidades
- **Archivos:** `lib/creacion.ts` (tipo `Efecto`), `lib/inmunidades.ts` (Parte 4).
- **Qué hacer:** un efecto puede declarar `ignora`: lista de categorías, estados o tipos de daño que atraviesa. Por ejemplo, una habilidad de control mental que ignora la inmunidad mental. `comprobarInmunidad` respeta esa lista, y solo para ese efecto.
- **Prueba:** `tests/ignorar-inmunidad.test.mjs`: un personaje inmune a control mental recibe el efecto de una habilidad que lo ignora, y no el de una habilidad común.
- **Criterio de salida:** prueba pasa; la lista vacía no cambia ningún resultado.

##### Paso 3 · Primitiva «Perder turno»
- **Archivos:** `lib/combate.ts` (inicio de turno, `:813`).
- **Reglas configurables:**
  - **Primer turno siempre perdido** (opción «pierde el primer turno al 100 %»), sin tirada.
  - **Salvación al inicio de cada turno** para terminar el estado (Paralizado la usa).
  - **Permite reacciones:** sí/no (En trance = no; Paralizado = sí).
  - **Despertar al recibir daño:** sí/no (Dormido puede usarlo).
- **Qué hacer:** reemplazar la condición `congelado || aturdido` por la primitiva. Congelado y aturdido se convierten en definiciones de datos que usan la misma primitiva.
- **Prueba:** Congelado y Aturdido siguen perdiendo el turno exactamente igual (regresión de `tests/combate*.test.mjs`).
- **Criterio de salida:** regresión idéntica.

##### Paso 4 · Primitiva «Movimiento forzado»
- **Archivos:** `lib/combate.ts` (movimiento y turno), `lib/yunque-arena.ts`.
- **Qué hacer:**
  1. El estado guarda la **fuente** (identificador del combatiente o casilla).
  2. Al inicio de turno, el afectado se mueve 1 o 2 casillas alejándose de la fuente. Durante el efecto no ataca a la fuente, ni cuando está acorralado.
  3. El efecto dura hasta que se pierde (duración del estado, sin salvación).
  4. Si no hay casilla libre, no se mueve y se registra en el log.
  5. Validación en servidor: la distancia se comprueba en el motor, no en la interfaz.
- **Prueba:** `tests/estado-asustado.test.mjs`: se aleja 1 o 2 casillas; no atraviesa muros; sin casilla libre no se mueve.
- **Criterio de salida:** prueba pasa.

##### Paso 5 · Primitiva «Cesión de control»
- **Archivos:** `lib/combate.ts` (`dominado`, `:615-632`), `components/yunque/ArenaDolls.tsx`, `app/ficha/combate/page.tsx`.
- **Qué hacer:**
  1. Generalizar Dominado: el controlador puede ser el GM (como hoy) **o un jugador rival**.
  2. El jugador controlador decide las acciones del afectado durante N turnos. El afectado ve un aviso en pantalla (Dialogo, Parte 1).
  3. El GM puede cortar el control en cualquier momento.
  4. Los recursos (PH, Fatiga) del afectado siguen gastándose de su ficha.
- **Prueba:** `tests/control-mental.test.mjs`: el rival puede actuar con el personaje ajeno; al terminar, el control vuelve; el GM puede cortarlo.
- **Criterio de salida:** prueba pasa; Dominado existente se comporta igual.

##### Paso 6 · Primitiva «Percepción alterada» (Hipnotizado)
- **Archivos:** la proyección de la Parte 3 (espejo mental), `lib/combate.ts` (estado).
- **Qué hacer:**
  1. Hipnotizado usa la misma proyección que el espejo mental, con **aleatoriedad por turno**. La probabilidad de cambio de bando es configurable en el estado.
  2. Solo cambia la vista del afectado. El objetivo que envía la acción es el real, y el registro lo guarda.
- **Prueba:** `tests/hipnotizado.test.mjs`: la probabilidad se respeta con semilla fija; el objetivo real queda en el registro.
- **Criterio de salida:** prueba pasa.

##### Paso 7 · Primitiva «Daño periódico» (Envenenado, Quemado)
- **Archivos:** `lib/combate.ts` (inicio o fin de turno), `lib/inmunidades.ts` (Parte 4).
- **Qué hacer:**
  1. Daño por turno con naturaleza o elemento configurable (veneno para Envenenado, fuego para Quemado).
  2. Antes de aplicarlo, `comprobarInmunidad` (Parte 4). Un personaje inmune a veneno no recibe el daño ni el estado.
  3. Cada estado guarda su origen, como exige la Parte 4.
- **Prueba:** `tests/estado-periodico.test.mjs`: Envenenado da daño de veneno; inmunidad a veneno lo bloquea; Quemado conserva fuego.
- **Criterio de salida:** prueba pasa.

##### Paso 8 · Primitiva «Modificador de movimiento» (Paralizado, Congelado)
- **Archivos:** `lib/combate.ts` (cálculo de movimiento).
- **Qué hacer:** reduce o anula las casillas de movimiento sin tocar las acciones. Paralizado pone el movimiento a 0; Congelado lo reduce a la mitad (valor configurable).
- **Prueba:** `tests/estado-movimiento.test.mjs`.
- **Criterio de salida:** prueba pasa.

##### Paso 9 · Migración de estados existentes
- **Archivos:** `lib/estados.ts`, `lib/combate.ts`.
- **Qué hacer:** Congelado, Aturdido, Mojado, Dominado y Quemadura pasan a ser definiciones. Sus resultados no cambian.
- **Prueba:** regresión completa: `node --test tests/*.test.mjs`. La batería de Kion debe dar el mismo resultado.
- **Criterio de salida:** ningún resultado cambia.

##### Paso 10 · Editor de estados en el Yunque
- **Archivos:** `components/yunque/editores/EditorEstados.tsx` (nuevo), `components/yunque/TallerYunque.tsx`.
- **Qué hacer:**
  1. Panel «Estados»: elegir un estado del catálogo o crear uno nuevo.
  2. Para cada estado: duración, primitivas (con sus parámetros), origen, despertar.
  3. Vista previa en lenguaje claro: «Asustado: se aleja 1–2 casillas de su fuente cada turno; dura 3 turnos».
  4. Sin JSON ni SQL.
- **Prueba:** Playwright en el Yunque a 390 px y escritorio: crear un estado nuevo que combine «perder turno» y «daño periódico».
- **Criterio de salida:** el estado nuevo funciona en combate sin tocar código.

##### Paso 11 · Interfaz de combate
- **Archivos:** tarjeta de combatiente, `app/ficha/combate/page.tsx`.
- **Qué hacer:** icono y duración visibles en la tarjeta; tooltip con la frase; aviso en el registro cuando un estado empieza, actúa o termina.
- **Prueba:** Playwright: la frase del tooltip coincide con la del editor.
- **Criterio de salida:** coherencia entre editor y combate.

##### Paso 12 · Verificación final
- Habilidad que ignora inmunidad mental frente a un personaje inmune.
- Estados de ejemplo: Asustado, Control mental, Hipnotizado, Dormido, Envenenado, Congelado, Mojado, Quemado, Paralizado y En trance.
- Cada uno con su prueba y con una combinación entre dos estados.
- Resultados anotados en `docs/metricas/`.
- **Criterio de salida:** los diez estados pasan en partida de prueba.

#### Decisiones tomadas

1. **Asustado:** solo huye mientras dure el efecto. No ataca a la fuente, ni acorralado.
2. **Control mental:** el rival puede ordenar acciones que dañen a sus propios aliados.
3. **Dormido:** los criterios de despertar son configurables en el Yunque (recibir daño, superar salvación, o ambos).
4. **En trance:** pierde el turno y **no puede usar reacciones**.
5. **Paralizado:** pierde el primer turno siempre (100 %). Después pierde un turno más por cada inicio de turno hasta superar la salvación configurada. Las reacciones siguen disponibles.
6. **Hipnotizado:** la probabilidad de cambio de bando es configurable.
7. **Estados mentales e inmunidades:** deben poder crearse habilidades que ignoren inmunidades (por categoría, estado o tipo de daño). Lo que se decide en YUGEN es qué estados quedan bloqueados por defecto (por ejemplo, Mente Inquebrantable); el motor solo ofrece la mecánica.

#### Riesgos

- Mezclar estados de datos y estados codificados puede dejar combates en curso con resultados distintos. Por eso el paso 9 exige regresión completa antes de pasar al editor.
- Cesión de control entre jugadores puede frustrar la partida; por eso el GM puede cortarla siempre.
- La percepción alterada debe ser solo visual. Si cambia el objetivo real, se rompe la confianza del registro.


---

## Apéndice C · Rasgos combinables (Bioelectricidad como ejemplo)

Estado: plan. No hay cambios de código. Depende de **YUNQUE - UNA MÁS** (`docs/plan-yunque-una-mas.md`), sobre todo de la Parte 1 (menús en pantalla) y de la Parte 2 (reacciones generales).

Usa la bioelectricidad Kuro como caso de prueba. Es la propuesta «YUGEN | Propuesta de integración: Bioelectricidad de los Kuro» (no aprobada, no está en el repositorio; se trabaja a partir de la copia que compartiste).

#### Idea

Un **rasgo** (de clan, de linaje o adquirido) no es una habilidad aislada. Es una capacidad que puede **potenciar otras habilidades**:

- La bioelectricidad (rasgo) genera Carga Bioeléctrica (CB).
- Una Bola de fuego (habilidad) puede gastar CB para añadir un componente eléctrico.
- Ese componente tiene sus propios dados (por ejemplo, 1d6 por CB gastada) y sus propios efectos elementales.
- Los efectos del elemento se aplican a toda la técnica combinada, no solo a una parte.

Ejemplo: Bola de fuego 2d6 de fuego + potenciador eléctrico (gasta 2 CB, añade 2d6 eléctrico). El daño total se calcula por componente. Si el objetivo está Mojado, el componente eléctrico activa Superconducción igual que hoy.

#### Lo que ya existe (no reinventar)

- `Efecto.elemento` (un solo elemento por efecto), `Efecto.naturaleza`, `Efecto.recurso` y `recursos_especiales` en `lib/combate.ts`.
- Electricidad con 1d4 elemental, ignora 3 ARM, chispa de cercanía 3 (`lib/combate.ts:1536`) y Superconducción (`lib/combate.ts:1480`, `:1538`).
- Naturaleza adquirida: `components/NaturalezasYugen.tsx`, `components/yunque/NaturalezaAdquirida.tsx`, con bonos que se suman a la raza.
- Herencia por linaje y clan (último commit de `main`, «herencia por linaje y clan»).

#### Problema que hay que resolver

El motor asume **un elemento por efecto**. Para combinar fuego y electricidad en la misma técnica hace falta que un efecto tenga varios componentes elementales, sin romper los efectos actuales.

---

#### Paso 1 · Modelo de datos: componentes elementales

- **Archivos:** `lib/creacion.ts` (tipo `Efecto`, `validarEfectos`), `lib/combate.ts`.
- **Qué hacer:**
  1. Añadir `componentes?: ComponenteDano[]`, donde cada componente tiene `{elemento, cantidad, caras, origen: 'base' | 'potenciador', id}`.
  2. Si `componentes` no existe, el efecto se comporta exactamente como hoy (`elemento` + `cantidad/caras`). Así no se migra ningún dato.
  3. Validación: como máximo 3 componentes; cada `elemento` debe estar en `ELEMENTOS`.
- **Prueba:** `tests/componentes-elementales.test.mjs`: un efecto antiguo da el mismo daño; un efecto con dos componentes suma por separado.
- **Criterio de salida:** `node --test tests/*.test.mjs` pasa sin cambios en las pruebas existentes.

#### Paso 2 · Etiquetas de técnica

- **Archivos:** `lib/creacion.ts`, `components/yunque/editores/EditorAccion.tsx`.
- **Qué hacer:**
  1. Añadir `etiquetas?: string[]` a `Efecto`: por ejemplo `fuego`, `ataque`, `area`, `proyectil`, `natural`, `magica`.
  2. El editor de acciones ofrece etiquetas de una lista cerrada (no texto libre).
  3. Las etiquetas se derivan de forma automática cuando es posible (naturaleza y elemento) y el GM puede añadir más.
- **Prueba:** validación rechaza etiquetas fuera de la lista.
- **Criterio de salida:** toda habilidad de la Forja tiene etiquetas visibles.

#### Paso 3 · Definición de Rasgo y Potenciador

El coste de un potenciador referencia recursos del catálogo del paso 4 por `id`, no por nombre.

- **Archivos nuevos:** `lib/rasgos.ts`, `tests/rasgos.test.mjs`.
- **Qué hacer:**
  1. Tipo `Rasgo`: `{id, nombre, origen: 'clan' | 'linaje' | 'adquirido', recursos: [...], potenciadores: Potenciador[]}`.
  2. Tipo `Potenciador`: `{id, nombre, acepta: string[] (etiquetas), coste: {ph?, fatiga?, recurso?: {nombre, cantidad}}, componentes_anadidos: ComponenteDano[], efectos_extra?: [...], limite_por_uso: 1}`.
  3. Validación: un potenciador debe aceptar al menos una etiqueta y tener al menos un componente o efecto.
- **Prueba:** `tests/rasgos.test.mjs`.
- **Criterio de salida:** un rasgo de ejemplo (bioelectricidad) se valida.

#### Paso 4 · Catálogo de recursos configurable (CB es solo el primer ejemplo)

Principio: **ningún recurso está escrito en el motor.** Carga Bioeléctrica es una entrada más del catálogo, creada desde el Yunque, igual que cualquier otra.

- **Archivos:** `lib/recursos.ts` (nuevo: catálogo y validación), `lib/combate.ts` (`recursos_especiales`, consumo y generación), `components/yunque/editores/EditorRecurso.tsx` (nuevo), tabla `recursos_definiciones` si el catálogo debe ser compartido entre creaciones (ver migración en el paso 4.2).
- **Qué hacer:**
  1. **4.1 · Definición de recurso** con: `id`, `nombre`, `tope` (fijo o formula), `inicial`, `generacion` (eventos o acciones que lo suman, con cantidad), `consumo` (cantidades y cuándo se permite), `recuperacion` (opcional), `visible` (quién lo ve).
  2. **4.2 · Persistencia:** el catálogo vive en la creación del rasgo, no en código. Si varios rasgos comparten un recurso, se referencia por `id` del catálogo. Migración idempotente, con pruebas PGlite.
  3. **4.3 · Validación en servidor:** nunca se gasta más de lo que hay; el tope se respeta; un recurso no definido no puede consumirse.
  4. **4.4 · Interfaz:** barra del recurso en la tarjeta del combatiente y en la ficha, con su nombre configurado.
  5. **4.5 · Independencia:** cada recurso es independiente de Fatiga, PH y de los demás recursos, salvo que el GM configure una relación explícita.
- **Prueba:** `tests/recursos-configurables.test.mjs`: dos recursos distintos en el mismo personaje no se mezclan; un recurso creado desde el Yunque (no CB) se genera, gasta y topa igual que CB.
- **Criterio de salida:** se crea un recurso nuevo con nombre distinto a CB desde el Yunque y funciona en combate sin tocar código.

#### Paso 5 · Aplicar un potenciador al lanzar una habilidad

- **Archivos:** `lib/combate.ts` (función de ejecución de acciones, cerca de `actuar`), `lib/yunque-arena.ts`.
- **Qué hacer:**
  1. Antes de resolver, el lanzador elige potenciadores compatibles con las etiquetas de la habilidad.
  2. El coste se paga **una vez** por ejecución.
  3. Los componentes añadidos se suman como nuevos componentes de daño del mismo efecto. Cada componente se resuelve por separado para aplicar sus propios efectos elementales.
  4. Un mismo rasgo no puede aplicar dos potenciadores en la misma ejecución.
  5. Los combos existentes (Electricidad + Mojado, chispa de cercanía) se evalúan sobre el componente correspondiente, nunca sobre el total, y no se duplican.
- **Prueba:** `tests/rasgos-potenciadores.test.mjs`: Bola de fuego 2d6 + 2 CB de electricidad da dos componentes; Mojado activa Superconducción solo sobre el componente eléctrico; el coste se descuenta una vez.
- **Criterio de salida:** los casos de la prueba pasan y el combate sin rasgos no cambia (regresión de `tests/combate*.test.mjs`).

#### Paso 6 · Asignar rasgos a personajes y linajes

- **Archivos:** `app/dm/forja/page.tsx` (o su sucesor en el Yunque), `lib/yunque-vinculos.ts`, la lógica de herencia por linaje.
- **Qué hacer:**
  1. Un rasgo se asigna a un personaje, a un linaje o a una naturaleza adquirida.
  2. Un rasgo heredado por linaje se muestra en el personaje con su origen («heredado de <linaje>»).
  3. No se asigna nada automáticamente a todos los Kuro (regla de la propuesta: las excepciones van en la configuración de cada personaje).
- **Prueba:** `tests/rasgos-asignacion.test.mjs`: herencia por linaje, sin duplicar el rasgo si llega por dos vías.
- **Criterio de salida:** un personaje con rasgo heredado lo ve en su ficha.

#### Paso 7 · Interfaz en el Yunque

- **Archivos:** `components/yunque/editores/EditorAccion.tsx`, `components/yunque/editores/EditorModulo.tsx`, nuevo `components/yunque/editores/EditorRasgo.tsx`.
- **Qué hacer:**
  1. Sección «Potenciadores compatibles» en cada habilidad: lista de rasgos del personaje con su coste.
  2. Editor de potenciador: etiquetas aceptadas, coste, componentes (elemento, dados, escala por CB) y efectos extra.
  3. Vista previa de fórmula: «Bola de fuego 2d6 fuego + 2d6 electricidad por 2 CB».
- **Prueba:** Playwright en la Forja a 390 px y escritorio.
- **Criterio de salida:** un GM crea el potenciador sin escribir JSON.

#### Paso 8 · Interfaz en combate

- **Archivos:** `components/yunque/ArenaDolls.tsx`, `app/ficha/combate/page.tsx`, `components/MenuPotenciador.tsx` (nuevo).
- **Qué hacer:**
  1. Al elegir una habilidad compatible con potenciadores, aparece un menú (no `window.confirm`; usa `Dialogo` de la Parte 1).
  2. El menú muestra cada potenciador con su coste, el daño resultante por componente y los efectos elementales previstos.
  3. El jugador confirma o cancela. Cancelar no gasta nada.
- **Prueba:** Playwright: la previsualización coincide con el daño final registrado.
- **Criterio de salida:** previsualización y resultado idénticos.

#### Paso 9 · Verificación

- `node --test tests/*.test.mjs`.
- Kion (regresión): sus defensas no cambian.
- Partida de prueba: un Kuro con bioelectricidad usa Bola de fuego potenciada, con Mojado en el objetivo.
- **Criterio de salida:** resultados anotados en `docs/metricas/`.

---

#### Decisiones tomadas (23-11)

1. **1 CB = 1d6.** Es el valor de ejemplo del catálogo. Cada potenciador puede cambiar la escala (por ejemplo, 1 CB = 1d4) desde el Yunque.
2. **Potenciar no cambia el enfriamiento** de la habilidad.
3. **Dos rasgos con el mismo elemento suman sus dados**, con el máximo de componentes definido en el paso 1.

#### Requisito general del plan

Todo lo que aparece como ejemplo (CB, 1d6, Bola de fuego, Mojado) es **configuración**, no código. El motor solo conoce mecanismos: recursos del catálogo, componentes elementales, etiquetas y potenciadores. Si una pieza nueva necesita código del motor, se documenta como excepción en el plan antes de programarla.

#### Riesgos

- Un efecto con varios componentes puede romper combos existentes. Por eso el paso 1 exige que los efectos antiguos no cambien.
- Los potenciadores aumentan la complejidad de la interfaz; la previsualización del paso 8 es obligatoria.
- No aprobar reglas oficiales: los valores de la propuesta siguen siendo de laboratorio.


---

## Apéndice D · Conceptos básicos configurables (desarmado, guardia, esqueletos)

Estado: plan. Sin cambios de código. Este documento reúne todo lo que falta para que el Yunque configure lo que antes estaba fijo en el motor.

#### Mapa de planes

| Plan | Dónde está | Estado |
|---|---|---|
| YUNQUE - UNA MÁS, Partes 1–3 (menús en pantalla, reacciones generales, artefactos con nivel) | `main`, `docs/planes/plan-yunque-una-mas.md` | Ejecutado (PR #56). Pendientes menores en `docs/pendientes-yunque-una-mas.md` |
| YUNQUE - UNA MÁS, Parte 4 (inmunidades, efectos mentales, equipamiento) | Rama `claude/admiring-heisenberg-fh1iyc`, `docs/plan-yunque-una-mas.md` | Plan. No está en `main` |
| Rasgos combinables (potenciadores, recursos configurables) | Rama `claude/admiring-heisenberg-fh1iyc`, `docs/plan-rasgos-combinables.md` | Plan |
| Estados configurables (primitivas) | Rama `claude/admiring-heisenberg-fh1iyc`, `docs/plan-estados-configurables.md` | Plan con decisiones tomadas |
| **Conceptos básicos configurables** (este documento) | Rama `claude/admiring-heisenberg-fh1iyc`, `docs/plan-conceptos-basicos-configurables.md` | Plan |

**Orden de dependencias:** Parte 4 (inmunidades) → Estados → Rasgos → Conceptos básicos (esqueletos y animaciones). Los conceptos básicos pueden empezar en paralelo para la parte de **ataque desarmado** y **guardia**, porque solo necesitan el catálogo de acciones.

Primero se traslada todo a una rama nueva desde `main` (paso 0). Ningún paso se ejecuta sobre la rama desfasada.

#### Diagnóstico de partida

Lo que hoy está fijo en código, según `origin/main`:

| Concepto | Dónde está | Qué lo fija |
|---|---|---|
| Ataque desarmado | `lib/combate.ts:1007` (nombre «Ataque desarmado»), `:1037`, `:1040` (variante «mano libre») | Nombre, alcance y efecto codificados. No se puede crear un «ataque desarmado» distinto para una criatura o un personaje. |
| Guardia | `lib/combate.ts:1267-1268` (`accionId === "guardia"`, estado «Guardia» con armadura 2) | Valor de armadura y duración fijos en el motor. |
| Animación de armas | `lib/animaciones-armas.ts` (`tipoAnimacionArma`): solo tres tipos, `arco`, `espada` y `punos`, decididos con expresiones regulares sobre el nombre | Un arma nueva solo tiene animación si su nombre coincide con una lista. Hacha y martillo caen en «espada» por regex, no por diseño. |
| Armas básicas | Forja: arco, lanza y bastón existen como básicos | Sus animaciones no salen de una estructura reutilizable. |

#### Principio

Los conceptos básicos son **plantillas configurables**, no código. El motor ejecuta el concepto (atacar, defender, pelear sin armas) y cada creación decide sus valores y su animación desde un **esqueleto**. Un esqueleto es un molde: define qué puntos de anclaje tiene un arma o un gesto, y cada creación lo rellena.

---

#### Paso 0 · Rama nueva desde `main`

- **Qué hacer:** crear `claude/conceptos-basicos-configurables` desde `origin/main`. Traer los documentos de la rama anterior con `git checkout origin/claude/admiring-heisenberg-fh1iyc -- docs/plan-yunque-una-mas.md docs/plan-rasgos-combinables.md docs/plan-estados-configurables.md docs/plan-conceptos-basicos-configurables.md`.
- **Criterio de salida:** `git log` muestra `main` como base y los cuatro documentos están en la rama.

---

#### PARTE A · Ataque desarmado configurable

##### A.1 · Modelo de ataque básico
- **Archivos:** `lib/creacion.ts` (tipo `Efecto`), `lib/conceptos-basicos.ts` (nuevo).
- **Qué hacer:**
  1. Un **concepto básico** es una definición con `id` (`desarmado`, `guardia`, `ataque_arma`…), `nombre`, `alcance`, `daño` (dados, caras, modificador, naturaleza, elemento), `coste` y `animacion` (referencia a un esqueleto, ver Parte B).
  2. Cada personaje, raza, criatura o linaje puede **sustituir** el concepto por uno propio. Si no sustituye nada, se usa el concepto por defecto.
  3. Sustitución por `id`, no por nombre.
- **Prueba:** `tests/conceptos-basicos-modelo.test.mjs`: validación; sustitución por id; el concepto por defecto se usa si no hay sustitución.
- **Criterio de salida:** prueba pasa.

##### A.2 · Migrar el desarmado al modelo
- **Archivos:** `lib/combate.ts` (líneas 1007, 1037, 1040), `lib/yunque-plantillas.ts`.
- **Qué hacer:** el nombre «Ataque desarmado» y los valores pasan a la definición por defecto. El motor lee el concepto, no el texto.
- **Prueba:** regresión: `node --test tests/*.test.mjs`; el desarmado de los personajes actuales da el mismo daño, alcance y coste.
- **Criterio de salida:** ningún resultado cambia.

##### A.3 · Ataque desarmado distinto para alguien o algo
- **Archivos:** `components/yunque/editores/EditorAccion.tsx`, `components/yunque/TallerYunque.tsx`.
- **Qué hacer:** en la Forja, un personaje o criatura puede definir su propio desarmado: por ejemplo, una criatura que muerde con 2d6 y alcance 1, o un personaje con garras y efecto de sangrado.
- **Prueba:** Playwright en el Yunque a 390 px y escritorio: crear un desarmado con mordisco y verlo en combate.
- **Criterio de salida:** el desarmado personalizado aparece en la tarjeta del combatiente y se ejecuta.

---

#### PARTE B · Guardia configurable

##### B.1 · Guardia como concepto básico
- **Archivos:** `lib/conceptos-basicos.ts`, `lib/combate.ts` (`:1267-1268`).
- **Qué hacer:**
  1. La guardia es un concepto con `bonos` (armadura, bloqueo, salvación), `duracion` (hasta el inicio del siguiente turno, o configurable), `coste` y `condiciones` (por ejemplo, solo con escudo o sin arma a dos manos).
  2. El estado «Guardia» pasa a ser una definición de estado (plan de estados, Paso 2).
- **Prueba:** `tests/guardia-configurable.test.mjs`: la guardia por defecto da armadura 2 como antes; una guardia configurada da otros bonos.
- **Criterio de salida:** regresión idéntica.

##### B.2 · Guardia distinta para alguien o algo
- **Archivos:** igual que A.3.
- **Qué hacer:** un personaje o criatura puede definir su guardia: por ejemplo, una criatura que se endurece con armadura 4 pero no puede moverse, o un personaje que gana salvación en lugar de armadura.
- **Prueba:** Playwright: la guardia personalizada muestra su frase en la tarjeta y en el menú.
- **Criterio de salida:** se crea y funciona en combate sin tocar código.

---

#### PARTE C · Esqueletos de armas y animaciones

Esta es la parte central. Hoy las animaciones se deciden leyendo el nombre del arma. Un **esqueleto** define la forma y los puntos de anclaje de un arma; la animación se construye sobre él.

##### C.1 · Definición de esqueleto
- **Archivos nuevos:** `lib/esqueletos.ts`, `tests/esqueletos.test.mjs`.
- **Qué hacer:** un esqueleto tiene:
  - `id`: `espada`, `hacha`, `lanza`, `arco`, `baston`, `punos`.
  - `familia_gesto`: cómo se mueve el arma (`corte`, `estocada`, `golpe_pesado`, `barrido`, `tiro`, `impacto_corto`).
  - `anclas`: puntos donde se sujeta el arma y dónde termina el gesto (mango, centro, punta).
  - `longitud_relativa`: tamaño visual en casillas o en píxeles normalizados.
  - `fases`: preparación, impacto y recuperación, con su duración.
- **Prueba:** validación de anclas y fases.
- **Criterio de salida:** los seis esqueletos base se validan.

##### C.2 · Esqueletos base para las armas básicas
- **Archivos:** `lib/esqueletos.ts`, `lib/animaciones-armas.ts`.
- **Qué hacer:** crear los esqueletos de **espada, hacha, lanza, arco, bastón y puños**. El arco, la lanza y el bastón que ya existen en la Forja se asignan a su esqueleto sin cambiar su aspecto.
- **Prueba:** `tests/esqueletos-basicos.test.mjs`: cada arma básica usa su esqueleto; ninguna cae en otro por nombre.
- **Criterio de salida:** las seis armas básicas se animan desde su esqueleto.

##### C.3 · Sustituir la detección por nombre
- **Archivos:** `lib/animaciones-armas.ts` (`tipoAnimacionArma`).
- **Qué hacer:**
  1. La animación se elige por el **esqueleto asignado** al arma o al concepto. El nombre ya no decide.
  2. La función antigua se conserva como respaldo solo para creaciones antiguas sin esqueleto. Al cargar, se asigna el esqueleto que corresponde (migración en memoria, sin escritura).
  3. Hacha y martillo dejan de caer en «espada»: tienen su propio esqueleto.
- **Prueba:** `tests/animaciones-armas.test.mjs` (ya existente) debe pasar; se añaden casos de hacha, martillo y lanza.
- **Criterio de salida:** regresión de las pruebas de animación y los casos nuevos.

##### C.4 · Animación de cada esqueleto
- **Archivos:** `components/AnimacionesArmas.tsx`, `components/animaciones-armas.css`.
- **Qué hacer:** cada esqueleto define su gesto con las fases de C.1. Solo `transform` y `opacity`, desactivados con `prefers-reduced-motion`.
- **Prueba:** Playwright: un gesto de cada esqueleto a 390 px y escritorio; capturas a `deviceScaleFactor: 2`.
- **Criterio de salida:** los seis gestos se ven y no producen scroll horizontal.

##### C.5 · Crear un arma nueva desde un esqueleto en el Yunque
- **Archivos:** `components/yunque/editores/EditorAccion.tsx`, `components/TablaArmas.tsx`.
- **Qué hacer:**
  1. Al crear un arma, el GM elige un esqueleto de la lista (espada, hacha, lanza, arco, bastón, puños, o uno nuevo).
  2. El esqueleto rellena la animación automáticamente. El GM ajusta solo longitud y color.
  3. Vista previa de la animación en el propio Yunque.
- **Prueba:** Playwright: crear una «Guadaña» con esqueleto de hacha y ver su gesto.
- **Criterio de salida:** un arma nueva sale con animación sin programar.

##### C.6 · Esqueletos nuevos desde el Yunque
- **Archivos:** `lib/esqueletos.ts`, tabla `esqueletos` si debe compartirse entre creaciones (migración idempotente con PGlite).
- **Qué hacer:** el GM puede crear un esqueleto nuevo copiando uno existente y cambiando anclas, fases y familia de gesto.
- **Prueba:** `tests/esqueletos-database.mjs` (PGlite): migración idempotente, permisos de escritura solo para el GM.
- **Criterio de salida:** un esqueleto creado desde la interfaz se usa en combate.

---

#### PARTE D · Verificación

- `node --test tests/*.test.mjs` completo.
- Regresión: Kion (batería de 1.344 combinaciones) y las pruebas de reacciones.
- Playwright en el Yunque: crear un desarmado y una guardia personalizados, y un arma nueva con esqueleto.
- Partida de prueba: los seis esqueletos base en combate.
- Resultados anotados en `docs/metricas/`.

#### Riesgos

- **Migrar el desarmado y la guardia** puede cambiar combates en curso. Se hace al cargar, sin escribir en la base, igual que la migración de `defensa` a `reaccion`.
- **Esqueletos y animaciones** tienen un coste visual. Cada esqueleto nuevo debe pasar la prueba de rendimiento de `docs/combate-calidad-visual.md`.
- **Hacha y martillo** hoy se animan como espada. Al cambiarlo, la apariencia en combate cambia; conviene avisar al GM.

#### Preguntas abiertas

1. ¿El esqueleto de «puños» debe poder sostener un objeto (por ejemplo, un guantelete con pinchos)? Propongo que sí, como ancla opcional.
2. ¿Se permiten esqueletos nuevos creados por jugadores, o solo por el GM? Propongo que solo el GM.
3. ¿La duración de la guardia se cuenta en turnos del portador o en rondas? Propongo turnos del portador, como hoy.
