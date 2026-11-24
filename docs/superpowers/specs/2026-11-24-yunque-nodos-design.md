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

Al abrir una creación, si hay nodos con `version` menor que la actual de su plantilla, aparece un aviso por nodo:

- Campos no editados: se actualizan solos al aplicar.
- Campos editados: se conservan. Si la plantilla cambia uno de ellos, se muestra el valor nuevo y se pregunta.
- Aplicar o ignorar, por nodo. Nunca en bloque sin ver.

### 3. Desvincular

Botón «Convertir en nodo propio»: quita `origen`. El nodo queda como cualquier otro y no vuelve a avisar.

### 4. Personajes con acciones, pasivas y reglas

- Quitar `accion` y `pasiva` de la restricción de `personaje` en `NUCLEO_LLEVA`.
- Las acciones de un personaje se guardan como entradas de `configuracion.habilidades` (con sus `efectos`), que
  el combate ya lee. No se añade un formato nuevo. *(Decisión mía, ver «Decisiones tomadas»).*
- Las pasivas de un personaje van a `configuracion.pasivas` y las reglas a `configuracion.reglas_pasivas`, que
  el combate ya lee.
- Los nodos propios del personaje y los enlazados desde la Colección conviven en el mismo lienzo.

### 5. Botones de tipo

Los botones de rugido, dash, salto y carrera de `EditorDados.tsx` pasan a ser el selector de plantillas: elegir
una la despliega en nodos. Desaparecen las opciones que solo rellenaban campos a la vez.

## Decisiones tomadas por mí (revisables)

- Las plantillas siguen en código (`lib/yunque-plantillas.ts`), con un número de versión por plantilla.
- Las defensas de Kion usan el mismo mecanismo de referencia viva que el resto.
- La versión de la plantilla se guarda junto al nodo, no en una tabla aparte.
- Sin migración de datos: lo existente no se toca.
- Las acciones de personaje van dentro de `configuracion.habilidades` (ver punto 4).

## Lo que queda abierto (decisión tuya)

1. **Cuando cambia una plantilla**, ¿prefieres que te pregunte por nodo (recomendado) o que actualice solo los campos
   que no has tocado, avisando después?
2. **Acciones de un personaje**: ¿deben aparecer mezcladas con sus habilidades en la ficha, o en una sección propia
   llamada «Acciones del personaje»?
3. **Plantillas de Kion**: ¿también deben quedar vivas, o prefieres que sigan siendo copias fijas?

## Lo que deja el constructor

- Formato exacto de `origen` y su validación.
- Cómo se marcan los campos `editados` sin ensuciar el borrador.
- Pruebas: despliegue de plantilla, actualización con campo editado, desvincular, personaje con acción que el
  combate ejecuta (un caso en `tests/yunque-*.test.mjs`).
