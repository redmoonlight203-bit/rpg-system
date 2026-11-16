# El Yunque como lienzo de nodos con arena de dolls

Fecha: 16-11-2026 · Estado: pendiente de aprobación del propietario

## 1. Intención

El Yunque (pestaña de creación de `app/dm/forja/page.tsx`) es hoy un formulario largo: cinco secciones de arriba abajo, `details` dentro de `details` y desplegables (`EditorDados`, `EditorReglas`, `EditorPasivas`, `EditorReaccion`, `EditorAlcance`…). El propietario lo describe así: «muchos menús, hay que repetir procesos, es aburrido» y «cuando ya no sé qué hace, es bastante complicado».

Se rehace como un **taller visual de nodos**, centrado en PC, lo más interactivo y vistoso posible, con una **arena de dolls** a un lado para probar al momento lo que se está creando. Las mecánicas no cambian: el taller lee y escribe exactamente los mismos datos que el formulario actual.

Decisiones del propietario:
- Lienzo de nodos libre (opción A), pensado para PC. Libertad creativa total en lo visual.
- Dos dolls: un **saco de golpes** que no se mueve ni actúa solo, y un **doll portador** que lleva la creación (si es un personaje, el portador es ese personaje).
- Rehacerlo por completo «sin cambiar las mecánicas y que dejen de ser menús y menús».

## 2. Objetivos, no objetivos y antiobjetivos

**Objetivos**
1. Ver de un vistazo qué hace una creación: cada nodo muestra una frase clara de lo que hace.
2. Construir arrastrando y conectando, sin desplegables anidados.
3. Probar al instante con los dolls, sin guardar y sin tocar datos reales.
4. Repetir menos: plantillas, duplicar nodos y copiar nodos de otras creaciones.
5. Que se sienta como un juego: nodos que se encienden cuando se activan en la prueba, cables con energía, sellos al guardar.

**No objetivos**
- Mecánicas nuevas (las primitivas pendientes del Yunque general siguen su propio plan).
- Cambios de base de datos o de formato de las creaciones.
- Un lienzo optimizado para móvil.

**Antiobjetivos** (sería un fracaso aunque funcione)
- Perder cualquier campo configurable que hoy exista.
- Que guardar desde el lienzo produzca datos distintos de los del formulario para la misma creación.
- Que la arena modifique fichas, inventarios o combates reales.
- Un lienzo que se convierta en una maraña de cables ilegible.

## 3. Restricciones

- Next.js 16, React 19, Tailwind v4 y tokens de `design.md` v3 (paleta, Cinzel, `Marco`, `Runa`, `Sello`, `BarraVital`).
- **Sin dependencias nuevas** (`design.md` §8): el lienzo se hace a mano con SVG para los cables, DOM para los nodos y eventos de puntero.
- Animaciones solo con `transform` y `opacity`, desactivadas con `prefers-reduced-motion`.
- La arena usa `lib/combate.ts` en el navegador, igual que `components/LaboratorioReglas.tsx` hoy.
- Imágenes: no se generan. Se piden al propietario (ver §9).
- Accesibilidad: todo lo que se hace en el lienzo se puede hacer con teclado; existe una vista de lista equivalente.

## 4. Enfoques considerados

| Enfoque | Qué es | Ventajas | Inconvenientes |
|---|---|---|---|
| **A · Lienzo de nodos libre** (elegido) | Cajas que se arrastran y se unen con cables, con zoom y desplazamiento | Lo más visual, interactivo y flexible; refleja la estructura real de las reglas (evento → condición → efectos) | Lo más costoso de construir; incómodo en móvil |
| B · Mesa de nodos encadenados | Carta central con filas de fichas Cuándo ▸ Si ▸ Entonces | Funciona en móvil; más rápido de construir | Menos libre y menos espectacular |
| C · Tarjetas por pasos | El formulario partido en pantallas | Lo más barato | Sigue siendo un formulario; el propietario lo descarta |

Se elige **A** porque el propietario trabaja en PC y pidió la versión más interactiva y visual. En pantallas estrechas se ofrece la vista de lista (§6.7).

## 5. Modelo: de la creación al grafo y de vuelta

El corazón técnico es un módulo puro `lib/yunque-grafo.ts`:

- `aGrafo(borrador) → Grafo` convierte el borrador actual del Yunque (el tipo `Borrador` de `app/dm/forja/page.tsx`) en nodos y conexiones.
- `aBorrador(grafo, borradorBase) → Borrador` hace la conversión inversa.
- **Garantía:** `aBorrador(aGrafo(b), b)` es idéntico a `b` para cualquier creación (prueba de ida y vuelta con creaciones reales y fixtures; §8).

Las posiciones de los nodos **no** forman parte de la creación. Se calculan con una disposición automática determinista y, si el GM mueve nodos, la disposición se guarda en `localStorage` por id de creación (con `try/catch`; si no hay almacenamiento, se usa la automática).

### Tipos de nodo (uno por pieza de datos real)

| Nodo | Datos que representa | Puertos |
|---|---|---|
| **Núcleo** | tipo, familia, nombre, imagen, atributos fijos o rangos de malla, clase calculada | salidas a acciones, reglas, pasivas, equipo |
| **Acción** | un `Efecto` (daño, curación, estado, crear arma, transformación…) con dados, coste, elemento y naturaleza | entradas desde el núcleo; salidas a sus módulos |
| Módulos de acción | `tablero` (alcance y área), `salvacion`, estado aplicado, `reaccion`, `transformacion`, `recurso`, `vfx`, `tabla_armas` | cuelgan de su acción |
| **Regla** (cadena) | una `Regla`: nodo **Cuándo** (evento) → nodo **Si** (condición; `todas`/`alguna`/`no` como nodos que agrupan) → nodos **Entonces** (cada `EfectoRegla`) | `salvacion` y `condicional` tienen dos salidas: éxito y fallo |
| **Pasiva** | una `ReglaPasiva` (evento, condición, bonos, curación, represalia) | desde el núcleo |
| **Vínculo** (personajes y monstruos) | habilidades, pasivas y piezas de equipo enlazadas desde la colección | ranuras de equipo (mano der., mano izq., dos manos…), habilidades y pasivas |
| **Invocación** | `configuracion_invocacion` | desde una acción de habilidad |
| **Requisitos** | `requisitos_uso` | desde el núcleo |

Lo que no es lógica de combate (historia, descripción, naturaleza adquirida, formas de historia, venta, ligado al alma, requisitos narrativos) va en un **cajón «Ficha»** lateral, no en nodos.

Cada nodo muestra:
- Una **frase** generada con `describirEfecto`, `describirRegla`, `condicionClara` y `describirReaccion` (las de `lib/descripciones.ts` y `components/EditorReaccion.tsx`).
- Su **estado de validación**, con los validadores existentes (`validarEfectos`, `validarReglas`, `validarReaccion`, `validarPasivas`, `validarTactica`, `validarRequisitos`). Si un nodo no es válido, se ve un borde carmesí y el mensaje.

## 6. La pantalla

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ⟨runa⟩ EL YUNQUE · Espada de Mao        Clase B · 212 pts      [Ficha] [Deshacer] [Forjar ⚒] │
├───────────┬──────────────────────────────────────────────────────┬─────────────────────┤
│ GRIMORIO  │                    LIENZO                            │   ARENA DE DOLLS     │
│ ▸ Acciones│   ┌─────────┐       ┌──────────────┐                 │  [Portador] [Saco]   │
│ ▸ Módulos │   │ NÚCLEO  │══════▶│ ⚔ Tajo 2d8   │══▶[◎ Alcance 1] │   40/40     60/60    │
│ ▸ Reglas  │   │ Espada  │       │ «Golpe que…» │══▶[🔥 Quemad.]  │  ░░░ tablero ░░░     │
│ ▸ Pasivas │   └─────────┘       └──────────────┘                 │  [Usar Tajo ▸ Saco]  │
│ ▸ Plantil.│        ║  ┌Cuándo┐  ┌Si──────┐  ┌Entonces────┐       │  [Golpéame: 2d6 ⚡]   │
│ ▸ Colecc. │        ╚═▶│Impac.│═▶│vida<50%│═▶│Curar 1d6   │       │  [Turno] [Reiniciar] │
│ 🔍 buscar │           └──────┘  └────────┘  └────────────┘       │  registro…           │
└───────────┴──────────────────────────────────────────────────────┴─────────────────────┘
```

### 6.1 Grimorio (izquierda)
Paleta de piezas agrupadas por familia, con búsqueda. Se arrastran al lienzo o se hace doble clic para añadirlas conectadas al nodo seleccionado. Familias: acciones, módulos de acción, eventos, condiciones, efectos de regla, pasivas, plantillas y colección (creaciones existentes para enlazar o copiar).

### 6.2 Lienzo (centro)
- Desplazar arrastrando el fondo; zoom con la rueda (límites 40–200 %); botón «encuadrar todo».
- Los nodos se arrastran; los cables se dibujan arrastrando de un puerto de salida a uno de entrada. **Solo se permiten conexiones válidas**: al empezar a arrastrar un cable, se iluminan los puertos compatibles y el resto se apaga.
- Al seleccionar un nodo, se edita **en el propio nodo**: los campos aparecen dentro de la tarjeta, sin ventanas aparte. Nada de desplegables anidados: los valores cortos son fichas que se pulsan (elemento, naturaleza, forma de área) y los números son ruedas o arrastrables con flechas.
- Atajos: Supr borra, Ctrl+D duplica, Ctrl+Z / Ctrl+Y deshacen y rehacen, Ctrl+C / Ctrl+V copian entre creaciones, Tab recorre los nodos, flechas mueven el nodo seleccionado.
- Los cables tienen dirección y un brillo que recorre el cable en el sentido de la ejecución.

### 6.3 Arena de dolls (derecha)
Combate aislado en el navegador con `lib/combate.ts`. Nunca guarda nada.
- **Portador:** se construye a partir del borrador.
  - objeto → doll base con la pieza en su ranura;
  - habilidad → doll base con la habilidad;
  - pasiva → doll base con la pasiva;
  - personaje o monstruo → el propio personaje con sus vínculos (usando la colección cargada) y el nivel elegido si es malla.

  Los atributos del doll base son editables en la arena (vida, PH, fatiga, armadura, salvación…).
- **Saco de golpes:** quieto, sin acciones propias. Su vida, armadura, salvación y elemento débil son editables. Si su vida llega a 0, se levanta solo con vida completa para seguir probando.
- **Golpéame:** el saco ataca al portador **solo cuando el GM pulsa el botón**. El GM elige los dados, si el golpe es físico o mágico y el elemento. Sirve para probar reacciones y pasivas al recibir daño.
- Tablero pequeño (reutilizando `TableroCombate` si encaja; si no, una rejilla propia) para probar alcance, áreas, empujes y teletransporte. El saco se puede colocar a mano.
- Botones: usar cada acción del portador sobre el saco, pasar turno, deshacer, reiniciar.
- La arena **se reconstruye sola** (con un retraso de 300 ms) cuando cambia el borrador, y avisa «la prueba se reinició con los cambios».
- Se ven tiradas de dados (`Dado3D` o `AnimacionDados`), números de daño flotantes, efectos visuales (`EfectosCombate`) y el registro del combate.

### 6.4 Nodos que se encienden
Cuando en la arena se ejecuta una acción, una reacción, una regla o una pasiva, **su nodo en el lienzo se ilumina** y sus cables lanzan un pulso. Es el vínculo visible entre «lo que construí» y «lo que pasó». Para saber qué nodo encender se puede comparar el registro antes y después de cada paso, o añadir un rastro opcional al motor. Lo decide el constructor (§10), siempre sin cambiar resultados del combate.

### 6.5 Menos repetición
- **Plantillas** en el grimorio: subgrafos listos para usar, como «golpe con quemadura», «escudo que absorbe y devuelve» (Escudo Astral), las defensas de Kion o «curar al matar». Las primeras se sacan de las 20 mecánicas del propietario que ya son posibles.
- Duplicar nodos o grupos, y copiar o pegar nodos entre creaciones.
- Desde la colección: arrastrar una creación existente copia sus nodos como punto de partida.

### 6.6 Guardar
«Forjar ⚒» valida todo el grafo, convierte a borrador y llama a la misma función `guardar` de hoy. Si sale bien, muestra un sello con destello (celebración breve de `design.md` §5). Si falla, lleva el foco al primer nodo con error. Se mantienen el flujo «crear dentro de un personaje» (`padre` / `volverPadre`) y abrir peticiones en el yunque.

### 6.7 Vista de lista y pantallas estrechas
Hay un conmutador «Lienzo / Lista». La lista muestra los mismos nodos como bloques ordenados y editables con los mismos editores de nodo. Por debajo de 1024 px la lista es la vista por defecto. Sirve también para teclado y lectores de pantalla.

## 7. Qué se elimina

Cuando el taller cubra todos los campos (comprobado por la prueba de ida y vuelta), se elimina el formulario actual del Yunque y los editores quedan solo como piezas internas de los nodos, o se borran si dejan de usarse. La pestaña «La creación» (galería), «Preparados para batalla» y «Peticiones» no cambian, salvo el estilo.

## 8. Verificación

- Pruebas `node --test`: ida y vuelta borrador → grafo → borrador sin pérdida para todos los tipos de creación (personaje, monstruo, objeto, habilidad, pasiva, título, otro), con fixtures que cubren todos los campos de `Efecto`, `Regla` y `ReglaPasiva`.
- Pruebas de la arena: el constructor del portador produce combatientes válidos para cada tipo; «Golpéame» activa una reacción configurada; la arena no hace ninguna llamada de red.
- Pruebas del grafo: se rechazan las conexiones inválidas, y las cadenas de regla producen el mismo `Regla` que el editor actual.
- Capturas de Playwright a 1440 px (lienzo) y 390 px (lista) sin desbordes; contraste ≥ 4,5:1; animaciones detenidas con movimiento reducido.
- `npm test`, `npm run test:database`, `tsc`, lint y build sin errores nuevos. Sin cambios en `motor.js` salvo, si se elige, el rastro opcional de §6.4, que debe dejar idéntica la caracterización de Kion (`tests/reacciones-kion.test.mjs`).

## 9. Arte que se pide al propietario

`design.md` §9 prohíbe generar imágenes. Hacen falta:
1. **Doll portador** (maniquí de entrenamiento): figura de cuerpo entero, fondo transparente, WebP o PNG, unos 512×768 px.
2. **Saco de golpes**: mismo formato.
3. Opcional: textura o fondo del taller del herrero para el lienzo. Si no llega, el fondo se hace con CSS.

Mientras no lleguen, el portador usa la figura de su raza (`public/arte/razas/`) y el saco, un marcador CSS sencillo que no sea la silueta antigua.

## 10. Lo que decide el constructor

- Cómo se detecta qué nodo encender (§6.4), sin alterar resultados.
- El algoritmo de disposición automática (columnas por profundidad de cadena es suficiente).
- La estructura interna de componentes (`components/yunque/…`) y el estado (un reductor con historial para deshacer).
- Si `TableroCombate` se reutiliza o se hace una rejilla propia para la arena.
- El orden de entrega por fases. Propuesta: (1) modelo y prueba de ida y vuelta; (2) lienzo con núcleo y acciones; (3) reglas, pasivas y módulos; (4) arena de dolls; (5) personajes y monstruos con vínculos; (6) plantillas, nodos que se encienden, pulido y retirada del formulario.

Decisiones que tomé yo, a revisar:
- Las posiciones de los nodos viven en `localStorage`, no en la base de datos (así no cambian los datos).
- El saco se levanta solo al llegar a 0 de vida.
- La arena se reinicia sola al editar.
- El cajón «Ficha» guarda lo narrativo fuera del lienzo.
