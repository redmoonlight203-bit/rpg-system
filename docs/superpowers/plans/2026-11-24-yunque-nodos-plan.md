# Plan · Yunque por nodos: «La forja de los nueve niveles»

Fecha: 24-11-2026 · Basado en `docs/superpowers/specs/2026-11-24-yunque-nodos-design.md`
Estado: **pendiente de aprobación del diseño** antes de tocar código.

---

## Cómo se juega este plan

Cada fase es un **nivel**. Un nivel no se cierra hasta cumplir su **misión** (pruebas que pasan) y superar su
**jefe** (una comprobación de juego real en el navegador). Al cerrar un nivel se guarda la partida: un commit
con el nombre del nivel.

| Nivel | Nombre | Qué desbloquea | Dificultad |
|---|---|---|---|
| 0 | Preparación | Mapa de pruebas en verde | ★ |
| 1 | El Registro | Estados y formas sin escribir claves | ★★★ (jefe) |
| 2 | Plantillas vivas | Rugido que se actualiza solo | ★★★ |
| 3 | El Reloj de Acciones | Presupuesto por turno | ★★★★ |
| 4 | Personajes sin límites | Acciones, pasivas y reglas en personajes | ★★★ |
| 5 | El Menú de Conjuros | Plantillas como menú, sin botones de tipo | ★★ |
| 6 | Pulido de interfaz | Barras, avisos y transiciones | ★★ |
| 7 | Final: la partida completa | Medición y prueba con un personaje real | ★★★★ |

Progreso visible: cada misión tiene una casilla. Cuando un nivel queda completo, se marca con ✔ en este archivo.

```
Progreso general  [░░░░░░░░░░]  0 / 8 niveles
```

---

## Nivel 0 · Preparación

**Misión:** dejar el terreno listo sin cambiar comportamiento.

- [ ] 0.1 Ejecutar las pruebas existentes de Yunque (`tests/yunque-*.test.mjs`) y anotar el resultado base.
- [ ] 0.2 Compilar la aplicación (`npm run build`) y anotar errores previos, si los hay.
- [ ] 0.3 Crear `tests/yunque-nodos.test.mjs` vacío con la estructura, para ir sumando casos.
- [ ] 0.4 Anotar la lista exacta de sitios donde se escriben claves a mano (ver Nivel 1).

**Jefe:** las pruebas base pasan igual que antes. Ningún cambio de comportamiento.

---

## Nivel 1 · El Registro (la fase de las claves)

Este es el arreglo que pediste: dejar de escribir «furia» o «veneno» a mano.

### Qué pasa hoy (3 formas distintas para lo mismo)

| Dónde | Cómo se escribe hoy | Problema |
|---|---|---|
| `components/yunque/editores/EditorEntonces.tsx:87` | Texto libre «Clave del estado o forma» | Una errata (`Furia` ≠ `furia`) rompe el vínculo sin avisar. |
| `components/yunque/editores/EditorSi.tsx:70` | Texto libre «Estado o forma» | Mismo problema, y el valor por defecto es `furia` (línea 40). |
| `lib/estados.ts` (catálogo) | Lista fija con ids como `veneno` | El Yunque de acciones sí usa lista, pero los nodos de regla no. |

Resultado: el mismo estado puede tener dos nombres y el juego no lo relaciona.

### Lo que haría

**Un registro único de estados y formas por creación**, con un menú de opciones:

1. Al crear una clave, aparece un formulario tipo «Nuevo estado»: nombre visible, icono, duración.
2. Internamente recibe un **id estable** que nadie escribe (`estado_7f3a`). El nombre se puede cambiar sin romper nada.
3. En cada nodo, la clave se elige de un **menú desplegable** con los estados que existen. Nunca se escribe.
4. Si el estado no existe todavía, el menú tiene «+ Crear estado nuevo» al final.
5. Un estado que se usa en varios nodos se edita en un solo sitio.

### Pasos

- [ ] 1.1 Crear `lib/registro-estados.ts` con: tipo `EstadoRegistrado` (id, nombre, icono, duración), crear,
      renombrar y buscar por id. Sin dependencias de React.
- [ ] 1.2 Pruebas: crear, renombrar sin romper vínculos, buscar por id, rechazar nombres vacíos.
- [ ] 1.3 Migrar datos existentes: convertir cada `clave: 'furia'` en un registro con id nuevo y reescribir el nodo.
      Escribir la migración como función pura con prueba (no tocar la base todavía).
- [ ] 1.4 Crear `components/yunque/editores/SelectorEstado.tsx`: menú con búsqueda y botón «+ Crear estado».
- [ ] 1.5 Sustituir el texto libre en `EditorEntonces.tsx` y `EditorSi.tsx` por `SelectorEstado`.
- [ ] 1.6 Quitar el valor por defecto `furia` de `EditorSi.tsx` (línea 40 y 43): al crear un nodo, el menú queda vacío y pide elegir.
- [ ] 1.7 Pruebas de lectura: una regla con clave migrada se comporta igual en combate (comparar con la referencia de Nivel 0).

**Jefe:** en el navegador, crear un estado «Furia» desde un nodo `si`, usarlo en un nodo `entonces` y en otro
`si`, renombrarlo a «Rabia», y comprobar que ambos nodos siguen funcionando.

---

## Nivel 2 · Plantillas vivas

**Misión:** las plantillas se despliegan en nodos que se actualizan solos.

- [ ] 2.1 Añadir `version` a cada plantilla en `lib/yunque-plantillas.ts`.
- [ ] 2.2 Crear `lib/yunque-origen.ts`: campo `origen: { plantilla, version, editados: string[] }` y las funciones
      para marcar un campo como editado.
- [ ] 2.3 Pruebas: marcar campo editado, desplegar, cambiar plantilla con y sin campos editados.
- [ ] 2.4 Al pegar una plantilla (`pegar` en `lib/yunque-operaciones.ts`), guardar `origen` en cada fragmento.
- [ ] 2.5 Al editar un campo en un nodo, añadirlo a `editados`.
- [ ] 2.6 Función `actualizarDesplegados(creacion)`: recorre nodos con `origen`, aplica cambios de plantilla
      en campos no editados, y devuelve un resumen.
- [ ] 2.7 Al abrir una creación, mostrar un aviso con el resumen («Rugido: radio 2 → 3»).
- [ ] 2.8 Botón «Convertir en nodo propio» que quita `origen`.

**Jefe:** cambiar el radio de la plantilla «Rugido» y comprobar en el navegador que el nodo se actualiza, que
el daño editado a mano se conserva, y que el aviso aparece una sola vez.

---

## Nivel 3 · El Reloj de Acciones

**Misión:** cada combatiente tiene un presupuesto de acciones por turno.

- [ ] 3.1 Tipo `PresupuestoAcciones = { principal: 1, adicional: number, legendaria: number }` en `lib/combate.ts`
      (o un módulo nuevo `lib/acciones-turno.ts`).
- [ ] 3.2 Función pura `presupuestoDe(combatiente)`: suma los presupuestos de todas las fuentes (raza, clan, especie).
- [ ] 3.3 Pruebas: una fuente, varias fuentes (se suman), sin fuentes (solo principal).
- [ ] 3.4 Cada acción declara `presupuesto: 'principal' | 'adicional' | 'legendaria'`. Por defecto, principal.
- [ ] 3.5 Motor: al empezar el turno del dueño se recargan principal y adicional; al empezar la ronda, legendaria.
- [ ] 3.6 Motor: una acción legendaria puede usarse fuera de turno; una adicional solo en el propio turno.
- [ ] 3.7 Pruebas del motor (en `tests/`): gastar una adicional, usar una legendaria fuera de turno, agotarla.
- [ ] 3.8 Mostrar en la ficha de combate el contador de cada tipo (tres barras, estilo PH).

**Jefe:** en una partida de prueba, un monstruo con 2 legendarias ataca dos veces fuera de turno y después no puede más hasta la siguiente ronda.

---

## Nivel 4 · Personajes sin límites

**Misión:** un personaje puede tener acciones, pasivas y reglas propias.

- [ ] 4.1 Quitar `accion` y `pasiva` de la restricción de `personaje` en `NUCLEO_LLEVA` (`TallerYunque.tsx:56`).
- [ ] 4.2 Crear sección «Acciones del personaje» en `configuracion.acciones_personaje`.
- [ ] 4.3 Pruebas de guardado: un personaje con acción propia no pierde datos al enlazar o desenlazar una creación.
- [ ] 4.4 El combate lee `acciones_personaje` (con el presupuesto de Nivel 3).
- [ ] 4.5 Pasivas del personaje van a `configuracion.pasivas` (ya lo lee el combate; probar que aparecen).
- [ ] 4.6 Reglas del personaje van a `configuracion.reglas_pasivas` (ya lo lee el combate; probar).
- [ ] 4.7 Sincronizar la ficha del jugador (`app/ficha/personaje`) para que muestre la nueva sección.

**Jefe:** crear un personaje con una acción propia, enlazarle una creación de la Colección, y comprobar que ambas
acciones aparecen en combate y que desenlazar la creación no borra la acción propia.

---

## Nivel 5 · El Menú de Conjuros

**Misión:** el selector de plantillas sustituye a los botones de tipo.

- [ ] 5.1 Sustituir los botones de `components/EditorDados.tsx` (rugido, dash, salto, carrera) por un único menú
      de plantillas que despliega nodos.
- [ ] 5.2 Cada plantilla tiene icono, nombre y una frase corta («Onda que nace de ti»).
- [ ] 5.3 Pruebas: elegir una plantilla deja los mismos nodos que tenían los botones antiguos (comparar
      campos con una referencia en `tests/yunque-plantillas.test.mjs`).
- [ ] 5.4 Retirar los botones antiguos cuando las pruebas pasen.

**Jefe:** crear un «Rugido» en un personaje desde el menú y compararlo con uno hecho con los botones antiguos: son iguales.

---

## Nivel 6 · Pulido de interfaz

**Misión:** que se sienta como un juego, sin tocar la lógica.

- [ ] 6.1 Barra de progreso del nivel en la cabecera del Yunque (una barra por nivel de la lista de arriba).
- [ ] 6.2 Al completar una acción de configuración (guardar un nodo, crear un estado) → breve destello y sonido opcional.
- [ ] 6.3 Aviso de «nodo actualizado» con animación al recibir cambios de plantilla.
- [ ] 6.4 Revisar accesibilidad: foco, contraste y que las animaciones respeten `prefers-reduced-motion`.
- [ ] 6.5 Revisar en pantalla de móvil (ancho 390 px) sin desplazamiento horizontal.

**Jefe:** capturar pantallas en escritorio y móvil con Playwright (`deviceScaleFactor: 2`) y revisarlas.

---

## Nivel 7 · Final: la partida completa

**Misión:** comprobar todo junto con un personaje real.

- [ ] 7.1 Crear un personaje nuevo que use: estado propio, plantilla viva, acción legendaria y pasiva.
- [ ] 7.2 Llevarlo a un combate de prueba contra un monstruo con presupuesto de acciones.
- [ ] 7.3 Medir: tiempo para crear el personaje antes y después del cambio (anotar en `docs/metricas/`).
- [ ] 7.4 Comparar el número de clics y de escrituras a mano: meta, cero escrituras de claves.
- [ ] 7.5 Actualizar `docs/pantallas.md` y `docs/forja.md` con lo nuevo.

**Jefe final:** la partida completa se juega sin errores de consola y sin que nada se rompa en las pruebas de Nivel 0.

---

## Reglas del juego (para no perderse)

- Un nivel no empieza hasta que el anterior tiene su jefe superado.
- Si un jefe falla, no se avanza: se corrige en el mismo nivel.
- Cada misión se marca con ✔ al terminar. Si una misión no aplica, se marca con ⊘ y se anota el motivo.
- Los cambios de datos (migración de claves, Nivel 1) nunca se ejecutan sobre la base real sin confirmación tuya.
- Cada nivel termina con un commit y una línea en `docs/metricas/` con lo que cambió.

## Decisiones que tomo yo (revisables)

- Un estado se crea desde el propio nodo (menú «+ Crear estado»), no en una pantalla aparte.
- Los ids de estado son automáticos. Nadie los escribe ni los ve.
- La migración de claves (1.3) se escribe primero como función pura y se prueba antes de aplicarla.
- El sonido del Nivel 6 es opcional y se puede apagar.

## Qué necesito de ti antes de empezar

1. Aprobar el diseño (`docs/superpowers/specs/2026-11-24-yunque-nodos-design.md`).
2. Confirmar que el Nivel 1 (claves) va primero, porque las plantillas del Nivel 2 dependen de él.
