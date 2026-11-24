# Diseño · Yunque por nodos con plantillas vivas

Fecha: 24-11-2026 · Estado: **borrador pendiente de aprobación** (no se ha programado nada).

## Intención

El Yunque deja de ofrecer botones que hacen mucho de golpe («+ Rugido», «+ Carrera arrasadora») y pasa a ser un
lienzo de nodos donde todo se configura. Las plantillas siguen existiendo, pero como **punto de partida enlazado**:
al usarlas se despliegan en nodos normales que siguen conectados a la plantilla. Además, un personaje puede tener
acciones, pasivas y reglas propias, no solo enlazar creaciones de la Colección.

Motivo declarado: calidad de vida. Hoy, mientras se trabaja, aparecen muchos caminos que no llevan a ninguna parte
(por ejemplo, crear una acción en un personaje no hace nada salvo vincular).

## Objetivos

1. Usar una plantilla la despliega en nodos editables (acción, área, origen, reglas) en el lienzo.
2. Cada nodo desplegado recuerda de qué plantilla viene y qué campos has editado tú.
3. Cuando la plantilla cambia, los campos que no has tocado se actualizan; los que sí tocaste se conservan.
4. Un personaje admite nodos de acción, pasiva y regla directamente.
5. Ninguna actualización de plantilla borra trabajo del GM sin avisar.

## No objetivos

- Rehacer el motor de combate. Se usa tal como lo lee hoy.
- Sustituir la Colección de creaciones enlazables.
- Añadir primitivas nuevas. Las 14 de `docs/plan-yunque-general.md` siguen fuera de este cambio.
- Migrar creaciones ya guardadas. Siguen funcionando igual; la vinculación empieza en las que se creen o editen después.

## Antiobjetivos (si pasa esto, ha fallado aunque compile)

- Que al cambiar una plantilla se pierdan ediciones del GM sin que lo sepa.
- Que un personaje pierda sus acciones o pasivas al enlazar o desenlazar una creación.
- Que un nodo desplegado siga atado a una plantilla que ya no existe sin avisar.

## Restricciones (comprobadas en el código)

- `lib/yunque-plantillas.ts`: las plantillas viven en código, con ids fijos. `pegar` las copia con ids nuevos
  (`regenerar`, `lib/yunque-operaciones.ts:187`).
- `components/EditorDados.tsx`: los botones de rugido, dash, salto y carrera rellenan muchos campos de una vez.
- `components/yunque/TallerYunque.tsx:56`: `NUCLEO_LLEVA.personaje = ['cuando','vinculo']`. Es la restricción que
  impide acciones y pasivas en personajes. Es configuración, no motor.
- `lib/combate.ts`: el combate lee las acciones desde `configuracion.habilidades[].efectos`, y las pasivas desde
  `configuracion.pasivas` y `configuracion.reglas_pasivas` (líneas 302–304, 503, 606, 1227). Un personaje ya puede
  llevarlas en su configuración.
- `lib/yunque-grafo.ts`: el grafo ya trata cada efecto, regla y pasiva como nodo con ruta.

## Enfoques considerados

- **A. Copia al insertar** (lo que ya hace `pegar`). Simple, sin cambios de motor, pero una plantilla mejorada no
  llega a las creaciones ya hechas.
- **B. Referencia viva** (elegido). Cada nodo desplegado guarda su origen y los campos editados. Permite
  actualizar sin pisar. Más trabajo: hay que calcular diferencias y mostrarlas.
- **C. Copia con procedencia**. Muestra de dónde viene y permite restaurar, pero no hereda cambios. Queda como
  paso posterior barato.

Elegido **B** porque el usuario lo prefiere por ser más interactivo, y acepta el coste.

## Diseño

### 1. Vínculo con la plantilla

Cada fragmento desplegado lleva un bloque `origen`:

```
origen: { plantilla: 'rugido', version: 3, editados: ['alcance', 'cantidad'] }
```

- `plantilla`: id estable de la plantilla.
- `version`: la versión de la plantilla con la que se desplegó.
- `editados`: campos que el GM ha cambiado a mano. Se marcan al pasar por el editor del nodo.

Las plantillas llevan un número de versión que se sube cuando cambian sus campos.

### 2. Actualización

Al cambiar una plantilla, todos los nodos desplegados de esa plantilla se actualizan automáticamente:

- Campos no editados: se actualizan solos.
- Campos editados: se conservan. Si la plantilla también cambió uno de ellos, el valor del GM gana y queda
  anotado en el resumen.
- Resumen: un aviso al abrir la creación lista qué nodos cambiaron y qué campos. Así nada cambia sin que lo sepas.

### 3. Desvincular

Botón «Convertir en nodo propio»: quita `origen`. El nodo queda como cualquier otro y no vuelve a avisar.

### 4. Personajes con acciones, pasivas y reglas

- Quitar `accion` y `pasiva` de la restricción de `personaje` en `NUCLEO_LLEVA`.
- Las acciones de un personaje se guardan en `configuracion.acciones_personaje` (nombre provisional), en una
  sección propia de la ficha. El combate debe poder usarlas fuera de turno o como acción adicional, por lo que
  esta parte sí toca `lib/combate.ts`.
- Las pasivas de un personaje van a `configuracion.pasivas` y las reglas a `configuracion.reglas_pasivas`, que
  el combate ya lee.
- Los nodos propios del personaje y los enlazados desde la Colección conviven en el mismo lienzo.

### 5. Botones de tipo

Los botones de rugido, dash, salto y carrera de `EditorDados.tsx` pasan a ser el selector de plantillas: elegir
una la despliega en nodos. Desaparecen las opciones que solo rellenaban campos a la vez.

### 6. Presupuesto de acciones por turno

Hoy el combate no tiene un concepto de acciones por turno; solo hay límites por regla. Se añade:

- **Presupuesto en el núcleo de cualquier combatiente**: personaje, monstruo o cualquier cosa que entre al combate.
  El nodo muestra cuántas acciones tiene de cada tipo:
  - **Principal**: la acción normal del turno (hoy existe de forma implícita).
  - **Adicional**: una acción extra en el turno.
  - **Legendaria**: acciones fuera de turno, con un número fijo por ronda (por ejemplo, 3).
- **Configurable desde fuentes**: el presupuesto puede venir de una raza, un clan, una especie o cualquier fuente
  que ya aporta pasivas (mismo mecanismo y mismos requisitos). Se conecta solo al nodo del personaje o monstruo.
- **Cada acción declara qué presupuesto usa**: principal, adicional o legendaria. Una acción legendaria puede usarse
  fuera de su turno; una adicional, solo como acción extra en el propio turno.
- **Varias fuentes**: se suman (decisión mía, ver abajo).

## Decisiones tomadas por mí (revisables)

- Varias fuentes de presupuesto se suman. Ejemplo: raza +1 adicional y clan +2 legendarias dan 1 adicional y 2 legendarias.
- Las acciones legendarias se recargan al inicio de cada ronda. Las principales y adicionales, al inicio del turno del dueño.

- Las plantillas siguen en código (`lib/yunque-plantillas.ts`), con un número de versión por plantilla.
- Las defensas de Kion usan el mismo mecanismo de referencia viva que el resto.
- La versión de la plantilla se guarda junto al nodo, no en una tabla aparte.
- Sin migración de datos: lo existente no se toca.
- Las acciones de personaje van en `configuracion.acciones_personaje`, no en `configuracion.habilidades` (ver «Decisiones del usuario», punto 2).

## Decisiones del usuario (aprobadas en conversación)

1. **Cuando cambia una plantilla:** se actualiza sola. Ejemplo: la plantilla «Rugido» pasa de radio 2 a radio 3, y
   los nodos desplegados pasan a radio 3. Si el GM ya había cambiado el daño de un nodo, el daño se conserva.
   Al final se muestra un resumen de lo que cambió.
2. **Acciones de un personaje:** sección propia «Acciones del personaje», separada de las habilidades. Motivo: poder
   usar acciones legendarias fuera de su turno o como acción adicional. Esto afecta al motor: el combate debe poder
   ejecutar acciones de esa sección fuera del turno normal. Lo confirmaré al planificar.
3. **Plantillas de Kion:** vivas, con el mismo mecanismo que el resto.

4. **Actualización de plantillas:** automática, con resumen (ver punto 2 del diseño).
5. **Presupuesto de acciones por turno:** configurable en cualquier combatiente. Puede venir de raza, clan, especie
   u otra fuente. Acciones principales, adicionales y legendarias, conectadas al nodo del personaje o monstruo.

Consecuencia de la decisión 2: las acciones de personaje ya no van dentro de `configuracion.habilidades`. Se guardan en
su propia lista (`configuracion.acciones_personaje`, nombre provisional) y el motor debe leerla con reglas de uso
distintas (fuera de turno o como acción adicional). Esto sí exige cambios en `lib/combate.ts`.

## Lo que deja el constructor

- Formato exacto de `origen` y su validación.
- Cómo se marcan los campos `editados` sin ensuciar el borrador.
- Pruebas: despliegue de plantilla, actualización con campo editado, desvincular, personaje con acción que el
  combate ejecuta (un caso en `tests/yunque-*.test.mjs`).
