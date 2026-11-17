# Yunque como lienzo de nodos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir el formulario del Yunque (`app/dm/forja/page.tsx`) por un taller de nodos para PC con una arena de dolls que prueba el borrador en el navegador, sin cambiar las mecánicas ni el formato guardado.

**Architecture:** El `Borrador` sigue siendo la **única fuente de verdad**. El grafo se *deriva* de él (`aGrafo`) y cada gesto del lienzo es una operación pura sobre el borrador (`aplicar`), así que ningún campo se puede perder. Hay tres módulos puros en `lib/` (grafo, operaciones, disposición), uno de arena (`lib/yunque-arena.ts`, que usa `lib/combate.ts`) y componentes React en `components/yunque/`. Guardar reutiliza la función `guardar` actual.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4 + `app/yugen-juego.css`, motor `lib/combate.ts`, `node --test` con `tests/helpers/cargar-ts.mjs`, Playwright preinstalado para capturas.

**Spec:** `docs/superpowers/specs/2026-11-16-yunque-lienzo-design.md`

## Global Constraints

- Sin dependencias nuevas en `package.json`: lienzo con SVG (cables) y DOM (nodos), eventos de puntero propios.
- Animaciones solo con `transform`/`opacity`; todas desactivadas bajo `@media (prefers-reduced-motion: reduce)`.
- Tokens y primitivas de `design.md` v3 (`Marco`, `Runa`, `Sello`, `BarraVital`, colores `well/canvas/raised/overlay/gold/arcane/crimson`, Cinzel para títulos).
- El formato guardado en `forja_maestra` no cambia; sin migraciones de base de datos.
- La arena no hace llamadas de red ni escribe en Supabase.
- Los módulos de `lib/` nuevos importan a sus hermanos con rutas `./x` (lo exige `cargarDependencia`) y no importan React.
- Zoom del lienzo entre 40 % y 200 %. Arena: reconstrucción con 300 ms de retraso tras un cambio. Vista de lista por defecto por debajo de 1024 px.
- `localStorage` siempre dentro de `try/catch`; sin él se usa la disposición automática.
- Arte: `public/arte/dolls/portador.webp` y `public/arte/dolls/saco.webp` (ya entregados).
- Textos de interfaz en español, con la voz de Kuroi en vacíos y errores.

## Review Focus

1. **Campos que el lienzo no muestra** (`defensa`, `axioma`, `portal`, `suelo`, `vuelo`, `ley_limitless`, `companero_magico` en creaciones antiguas): deben sobrevivir intactos a editar otros nodos y guardar. Prueba en Tarea 3.
2. **`localStorage` lleno, bloqueado o con posiciones de nodos que ya no existen:** el lienzo debe abrir igual, con disposición automática para lo que falte. Prueba en Tarea 4.
3. **Borrador inválido a medias** (dados en 0, regla sin efectos) mientras la arena está abierta: la arena muestra «La prueba no puede empezar: …» con el mensaje del validador y no se rompe. Prueba en Tarea 5.
4. **Personaje con vínculos a creaciones borradas o archivadas:** el nodo vínculo se ve en carmesí con «ya no está en La Creación» y la arena arranca sin esa pieza. Prueba en Tareas 2 y 5.
5. **Creación enorme** (30 acciones, 20 reglas): la disposición no superpone nodos y «encuadrar todo» los deja visibles. Prueba en Tarea 4.

---

### Task 1: Sacar el borrador del Yunque a `lib/yunque-borrador.ts`

**Files:**
- Create: `lib/yunque-borrador.ts`
- Modify: `app/dm/forja/page.tsx:40-49` (quitar tipos locales e importar)
- Modify: `tests/helpers/cargar-ts.mjs` (añadir `structuredClone` al contexto)
- Test: `tests/yunque-borrador.test.mjs`

**Interfaces:**
- Produces: `export type Borrador`, `VinculoNaturaleza`, `Peticion`, `Creacion` (copiados tal cual de `page.tsx`), `export function vacio(): Borrador`, `export function vinculoVacio(): VinculoNaturaleza`.

- [ ] **Step 1: Write the failing test** `vacio() devuelve el borrador inicial del Yunque`: `assert.deepEqual(Object.keys(vacio()).sort(), [...las 34 claves actuales...].sort())`, `vacio().tipo==='objeto'`, `vacio().nivelMaximo===20`, `vacio().slot==='ninguno'`, y dos llamadas devuelven objetos distintos (`vacio().efectos!==vacio().efectos`).
- [ ] **Step 2: Run** `node --test tests/yunque-borrador.test.mjs` → FAIL (no existe el módulo).
- [ ] **Step 3: Mover** `Borrador`, `Creacion`, `Peticion`, `VinculoNaturaleza`, `vacio`, `vinculoVacio` a `lib/yunque-borrador.ts` sin cambiar ningún campo. `FormaHistoria`, `InvocacionEditor` y `ConfiguracionMonstruo` se importan como tipos (`import type`) para no arrastrar React. `page.tsx` los importa.
- [ ] **Step 4: Run** `node --test tests/yunque-borrador.test.mjs && npx next typegen && npx tsc --noEmit` → PASS sin errores.
- [ ] **Step 5: Commit** `refactor: sacar el borrador del Yunque a lib/yunque-borrador.ts`.

### Task 2: Grafo derivado — `lib/yunque-grafo.ts`

**Files:**
- Create: `lib/yunque-grafo.ts`
- Test: `tests/yunque-grafo.test.mjs`, `tests/fixtures/yunque-borradores.json` (un borrador por tipo: objeto con 2 acciones, una con `tablero`, `reaccion` y `salvacion`; habilidad con invocación y una regla `impactar → comparar vida<50% → curar + estado`; pasiva con 2 `reglas_pasivas`; personaje con habilidades, pasivas y equipo; monstruo; título; otro; y una creación antigua con `defensa:'absorcion'`).

**Interfaces:**
- Consumes: `Borrador` (Tarea 1); `describirEfecto`, `describirRegla`, `condicionClara` (`lib/descripciones.ts`); validadores `validarEfectos`, `validarReaccion`, `validarTactica`, `validarReglas`, `validarPasivas`, `validarRequisitos`.
- Produces:
  ```ts
  export type TipoNodo='nucleo'|'accion'|'alcance'|'salvacion'|'estado'|'reaccion'|'transformacion'|'recurso'|'vfx'|'tabla_armas'|'cuando'|'si'|'entonces'|'pasiva'|'vinculo'|'invocacion'|'requisitos';
  export type Ruta=(string|number)[];            // camino dentro del Borrador
  export type Puerto={id:string;lado:'entrada'|'salida';acepta:TipoNodo[];etiqueta?:string}; // 'exito'/'fallo' en salvación y condicional
  export type Nodo={id:string;tipo:TipoNodo;ruta:Ruta;titulo:string;frase:string;error:string|null;puertos:Puerto[]};
  export type Cable={id:string;desde:{nodo:string;puerto:string};hasta:{nodo:string;puerto:string}};
  export type Grafo={nodos:Nodo[];cables:Cable[]};
  export type ContextoGrafo={creaciones:{id:string;nombre:string;tipo_creacion?:string}[]};
  export function aGrafo(b:Borrador,ctx:ContextoGrafo):Grafo;
  ```
  Ids de nodo estables: `nucleo`; `accion:<efecto.id>`; módulos `<tipo>:<efecto.id>`; `cuando:<regla.id>`, `si:<regla.id>`, `si:<regla.id>:<índice anidado>`, `entonces:<regla.id>:<índice>` (con `:exito:`/`:fallo:` para ramas); `pasiva:<regla_pasiva.id>`; `vinculo:<slot|habilidad|pasiva>:<creación id>`; `invocacion`; `requisitos`.

- [ ] **Step 1: Write the failing tests:**
  - `objeto: núcleo + 2 acciones + módulos presentes y nada más` (cuenta exacta de nodos por tipo).
  - `cada acción lleva la frase de describirEfecto` (`nodo.frase===describirEfecto(efecto).resumen`).
  - `regla: cuando→si→entonces conectados en orden, con ramas éxito/fallo en salvación`.
  - `un efecto inválido marca su nodo con el mensaje del validador` (dados `caras:0` → `error` no nulo).
  - `defensa antigua aparece como nodo reaccion con la plantilla PLANTILLAS_REACCION`.
  - `vínculo a creación inexistente: error «ya no está en La Creación»` (Review Focus 4).
  - `ids estables: aGrafo dos veces da los mismos ids`.
- [ ] **Step 2: Run** `node --test tests/yunque-grafo.test.mjs` → FAIL.
- [ ] **Step 3: Implement `aGrafo`.** Recorrido directo del borrador; los errores se calculan llamando al validador con un único elemento (`validarEfectos([e])`, `validarReglas([r])`…).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: grafo derivado del borrador del Yunque`.

### Task 3: Operaciones del lienzo — `lib/yunque-operaciones.ts`

**Files:**
- Create: `lib/yunque-operaciones.ts`
- Test: `tests/yunque-operaciones.test.mjs`

**Interfaces:**
- Consumes: `Borrador`, `Grafo`, `Nodo`, `Puerto`, `TipoNodo`; `nuevaRegla` (`lib/reglas.ts`); `nuevoEfecto()` de `lib/creacion.ts` (con `efecto` sobrescrito según el tipo pedido).
- Produces:
  ```ts
  export type Operacion=
   |{op:'fijar';ruta:Ruta;valor:unknown}
   |{op:'agregar';tipo:TipoNodo;padre?:string;rama?:'exito'|'fallo'}
   |{op:'quitar';nodo:string}
   |{op:'duplicar';nodo:string}
   |{op:'pegar';fragmento:Fragmento;padre?:string};
  export type Fragmento={tipo:TipoNodo;datos:unknown};
  export function aplicar(b:Borrador,o:Operacion):Borrador;   // inmutable; lanza Error con mensaje claro si no aplica
  export function copiar(b:Borrador,nodo:string):Fragmento;
  export function conexionValida(origen:Puerto,destino:Puerto,tipoDestino:TipoNodo):boolean;
  ```
  Los ids nuevos usan `crypto.randomUUID()`; duplicar y pegar regeneran todos los ids anidados.

- [ ] **Step 1: Write the failing tests:**
  - `fijar cambia solo la ruta indicada` (deepEqual del resto del borrador).
  - `agregar accion añade `nuevoEfecto()` al final de efectos`.
  - `agregar entonces bajo un si añade un EfectoRegla a la regla correcta, y bajo rama fallo a fallo[]`.
  - `quitar núcleo lanza «El núcleo no se puede quitar»`.
  - `duplicar acción genera ids nuevos y copia todos los campos`.
  - `copiar + pegar entre borradores distintos conserva los datos`.
  - `conexionValida rechaza estado→cuando y acepta accion→alcance`.
  - **Review Focus 1:** `editar otra acción conserva defensa, axioma, portal, suelo, vuelo, ley_limitless y companero_magico de una acción antigua` (deepEqual del efecto antiguo antes y después).
- [ ] **Step 2: Run** `node --test tests/yunque-operaciones.test.mjs` → FAIL.
- [ ] **Step 3: Implement** `aplicar`, `copiar`, `conexionValida`. Copias con `structuredClone`; `fijar` recorre la ruta y sustituye solo el último tramo.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: operaciones puras del lienzo del Yunque`.

### Task 4: Disposición automática y memoria de posiciones — `lib/yunque-disposicion.ts`

**Files:**
- Create: `lib/yunque-disposicion.ts`
- Test: `tests/yunque-disposicion.test.mjs`

**Interfaces:**
- Consumes: `Grafo`.
- Produces:
  ```ts
  export type Punto={x:number;y:number};
  export const NODO={ancho:260,alto:140,separacionX:80,separacionY:40};
  export function disponer(g:Grafo,guardadas?:Record<string,Punto>):Record<string,Punto>;
  export function leerPosiciones(clave:string):Record<string,Punto>;          // nunca lanza
  export function guardarPosiciones(clave:string,p:Record<string,Punto>):void; // nunca lanza
  export function encuadre(p:Record<string,Punto>,vista:{ancho:number;alto:number}):{x:number;y:number;zoom:number}; // zoom acotado a 0.4–2
  ```
  Columnas por profundidad desde el núcleo (núcleo en x=0; acciones, pasivas y vínculos en la columna 1; módulos y `cuando` en la 2; `si` en la 3; `entonces` en la 4 y siguientes). Clave de almacenamiento: `yugen_yunque_pos_<id creación|nuevo>`.

- [ ] **Step 1: Write the failing tests:**
  - `disponer es determinista`.
  - **Review Focus 5:** `30 acciones y 20 reglas: ningún par de nodos se superpone` (rectángulos de `NODO`) y `encuadre deja todos los nodos dentro de la vista con zoom ≥ 0.4`.
  - **Review Focus 2:** `posiciones guardadas de nodos inexistentes se ignoran y los nodos nuevos reciben posición automática`; `leerPosiciones con localStorage que lanza devuelve {}`; `guardarPosiciones con almacenamiento lleno no lanza` (simulando `globalThis.localStorage`).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: disposición automática del lienzo del Yunque`.

### Task 5: Arena de dolls — `lib/yunque-arena.ts`

**Files:**
- Create: `lib/yunque-arena.ts`
- Test: `tests/yunque-arena.test.mjs`

**Interfaces:**
- Consumes: `Borrador`; `nuevoCombate`, `agregar`, `iniciar`, `siguiente`, `actuar`, `acciones`, `deshacer`, tipos `Combate`, `Fuente` (`lib/combate.ts`); `validarEfectos`, `validarReglas`, `validarPasivas`.
- Produces:
  ```ts
  export type AjustesDoll={vida:number;ph:number;fatiga:number;armadura:number;salvacion:number};
  export const DOLL_BASE:AjustesDoll={vida:40,ph:20,fatiga:10,armadura:0,salvacion:0};
  export const SACO_BASE:AjustesDoll={vida:60,ph:0,fatiga:0,armadura:0,salvacion:0};
  export type ContextoArena={creaciones:Creacion[];stats:Record<string,number>}; // stats: valores del borrador ya resueltos (valoresBorrador)
  export type Golpe={cantidad:number;caras:number;naturaleza:'fisica'|'magica';elemento?:string};
  export function crearArena(b:Borrador,ctx:ContextoArena,doll?:Partial<AjustesDoll>,saco?:Partial<AjustesDoll>):{combate:Combate}|{error:string};
  export function usar(c:Combate,accionId:string,objetivo?:string):Combate;  // acción del portador; tras ella pasa los turnos del saco
  export function golpeame(c:Combate,g:Golpe):Combate;                        // el saco ataca al portador una vez
  export function activados(antes:Combate,despues:Combate,g:Grafo):string[];  // ids de nodo a encender
  ```
  Ids fijos: portador `doll`, saco `saco`. Portador según `b.tipo`: objeto → `configuracion.equipamiento[<slot>]`; habilidad → `configuracion.habilidades=[{…, efectos:b.efectos, reglas:b.reglas}]`; pasiva → `configuracion.pasivas=[{nombre, reglas:b.reglas_pasivas, reglas_motor:b.reglas}]`; personaje o monstruo → stats del borrador, más las habilidades, pasivas y equipo resueltos desde `ctx.creaciones`, omitiendo los que no existan. El saco no tiene habilidades. `usar` y `golpeame` encadenan `siguiente` mientras el turno sea del saco. Si el saco queda a 0 de vida, se restaura a su vida máxima con una entrada de registro «El saco se recompone.». `activados` busca en las entradas nuevas del registro los nombres de acciones, reglas y pasivas («activa X», «X (evento).», «X: …») y devuelve sus ids de nodo.

- [ ] **Step 1: Write the failing tests:**
  - `cada tipo de los fixtures crea una arena válida con doll y saco`.
  - `usar una acción de daño baja la vida del saco y el saco nunca actúa` (el registro no contiene acciones del saco).
  - `golpeame mágico activa una reacción de absorción del portador` (vida perdida < daño bruto; `recursos_especiales['Energía absorbida']` sube).
  - `golpeame activa una pasiva recibir_dano` y `activados` incluye `pasiva:<id>`.
  - `el saco a 0 de vida se recompone`.
  - **Review Focus 3:** `borrador con dados en 0 devuelve {error:'La prueba no puede empezar: …'}` en vez de lanzar.
  - **Review Focus 4:** `personaje con habilidad borrada arranca sin ella`.
  - `la arena no usa la red`: `globalThis.fetch=()=>{throw Error('red')}` durante toda la prueba.
- [ ] **Step 2: Run** `npm test` → los nuevos FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` → todo PASS (y `tests/reacciones-kion.test.mjs` sin cambios).
- [ ] **Step 5: Commit** `feat: arena de dolls del Yunque en el navegador`.

### Task 6: Lienzo y nodos base — núcleo y acciones

**Files:**
- Create: `components/yunque/TallerYunque.tsx` (barra superior + tres paneles; recibe `b`, `setB`, `ctx`, `onGuardar`, `guardando`, `error`), `components/yunque/Lienzo.tsx`, `components/yunque/NodoYunque.tsx`, `components/yunque/editores/EditorNucleo.tsx`, `components/yunque/editores/EditorAccion.tsx`, `components/yunque/yunque.css`
- Create: `app/dm/forja/taller/page.tsx` (ruta de desarrollo que monta `TallerYunque` con un borrador vacío, hasta la Tarea 11)
- Test: `scripts/capturar-yunque.mjs` (Playwright; mismo patrón de interceptación de `https://ejemplo.supabase.co/**` que `scripts/auditar-pantallas.mjs`)

**Interfaces:**
- Consumes: `aGrafo`, `aplicar`, `conexionValida`, `disponer`, `encuadre`, `leer/guardarPosiciones`.
- Produces: `<TallerYunque b setB ctx onGuardar guardando error/>`; `<Lienzo grafo posiciones seleccion encendidos onMover onSeleccionar onConectar onOperar/>`; `<NodoYunque nodo seleccionado encendido onOperar>{editor}</NodoYunque>`; la convención de los editores de nodo es `({b,nodo,operar}:{b:Borrador;nodo:Nodo;operar:(o:Operacion)=>void})`.

Comportamiento visual (lo que lo hace «interesante»):
- Fondo de forja: rejilla de puntos en `well`, viñeta y brasas CSS que suben lentamente (solo con movimiento permitido).
- Nodos como `Marco` con cabecera teñida por familia (acción oro, módulo arcano, regla carmesí, pasiva verde, vínculo pergamino), icono `IconoYugen` y la frase en cursiva bajo el título.
- Cables SVG Bézier con trazo dorado y un guion animado (`stroke-dashoffset`) que corre en la dirección de ejecución. Al arrastrar un cable, los puertos compatibles laten en arcano y los incompatibles bajan a 30 % de opacidad.
- Al soltar un nodo nuevo: escala 0.9→1 con un destello de 250 ms. Al seleccionar: halo arcano. Si hay error: borde carmesí y un sello pequeño con «!».
- `EditorAccion`: fichas pulsables para tipo de efecto, elemento y naturaleza; dados como «2 d 8 + 0» con botones ± y rueda del ratón; coste PH y fatiga igual. Un conmutador «Todos los campos» monta `EditorDados` con `value=[efecto]` para editar lo que las fichas no cubren.
- `EditorNucleo`: tipo como cartas grandes (las mismas de `TIPOS` con `IconoYugen`), familia, nombre, `PortadaYunque` y atributos como `Medallon` editables (fijos o mínimo→máximo en malla).

- [ ] **Step 1: Write** `scripts/capturar-yunque.mjs`: abre `/dm/forja/taller` a 1440×900, añade una acción desde el botón «+ Acción» del núcleo, comprueba que existan `[data-nodo="nucleo"]` y un `[data-nodo^="accion:"]`, que haya ≥ 1 `path.yq-cable`, y guarda `capturas/yunque-1440.png`. Termina con código 1 si algo falta.
- [ ] **Step 2: Run** el script con el servidor de desarrollo en el puerto 3100 (variables de entorno de `ejemplo.supabase.co`) → FAIL (la ruta no existe).
- [ ] **Step 3: Implement** los componentes. Desplazar: arrastrar el fondo. Zoom: rueda entre 0.4 y 2, alrededor del cursor. Los nodos se mueven con `transform: translate()`. Las posiciones se guardan al soltar.
- [ ] **Step 4: Run** el script → PASS. Revisa la captura.
- [ ] **Step 5: Commit** `feat: lienzo del Yunque con núcleo y acciones`.

### Task 7: Reglas, pasivas, módulos y Grimorio

**Files:**
- Create: `components/yunque/Grimorio.tsx`, `components/yunque/editores/EditorCuando.tsx`, `EditorSi.tsx`, `EditorEntonces.tsx`, `EditorPasivaNodo.tsx`, `EditorModulo.tsx` (alcance, salvación, estado, reacción, transformación, recurso, vfx, tabla de armas, invocación, requisitos)
- Modify: `scripts/capturar-yunque.mjs`

**Interfaces:**
- Consumes: `Operacion` (`agregar` con `padre` y `rama`), `EVENTOS`, `EFECTOS_REGLA`, `DESTINOS` (`lib/reglas.ts`); componentes existentes reutilizados dentro de `EditorModulo`: `EditorAlcance`, `EditorReaccion`, `EditorInvocacion`, `RequisitosYunque`.
- Produces: `<Grimorio onSoltar={(tipo:TipoNodo,punto:Punto)=>void} filtro/>` con familias Acciones · Módulos · Eventos · Condiciones · Efectos de regla · Pasivas · Plantillas · Colección, y búsqueda por texto.

- `EditorCuando`: los 15 eventos de `EVENTOS` como fichas con icono. `EditorSi`: `siempre`, `comparar`, `estado`, `elemento`, `probabilidad` y `estado_terminado` como fichas; `todas`/`alguna`/`no` crean nodos `si` hijos. `EditorEntonces`: los 13 tipos de `EFECTOS_REGLA` y los 6 `DESTINOS` como fichas, y el valor como `2d6 + atributo × escala`.
- Arrastrar desde el Grimorio hasta un puerto compatible conecta directamente. Soltar en vacío crea el nodo suelto, marcado «sin conectar». Al guardar, los nodos sueltos que no pertenezcan a ninguna regla se descartan con un aviso.

- [ ] **Step 1: Extend the script:** crear una regla arrastrando «Al impactar», «Vida < 50 %» y «Curar» desde el Grimorio; comprobar 3 nodos `cuando/si/entonces` conectados y la frase de `describirRegla` en el nodo `cuando`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: reglas, pasivas, módulos y grimorio en el lienzo`.

### Task 8: Panel de la arena con dolls y nodos que se encienden

**Files:**
- Create: `components/yunque/ArenaDolls.tsx`, `components/yunque/arena.css`
- Modify: `components/yunque/TallerYunque.tsx` (pasar `encendidos` al lienzo)
- Modify: `scripts/capturar-yunque.mjs`

**Interfaces:**
- Consumes: `crearArena`, `usar`, `golpeame`, `activados`, `DOLL_BASE`, `SACO_BASE`; `Dado3D` o `AnimacionDados`; `EfectosCombate`; `BarraVital`.
- Produces: `<ArenaDolls b ctx grafo onEncender={(ids:string[])=>void}/>`.

Comportamiento:
- Escenario con suelo de piedra en CSS. El doll portador (`portador.webp`) a la izquierda y el saco (`saco.webp`) colgado a la derecha, cada uno con su `BarraVital` de vida (y PH en el portador).
- Al usar una acción: el doll avanza 12 px y vuelve, el saco se balancea (rotación ±6° desde el gancho), los dados ruedan y aparecen números flotantes (daño en carmesí, curación en verde, absorbido en arcano).
- «Golpéame»: el saco se balancea hacia el doll; el selector de dados, naturaleza y elemento está junto al botón.
- Los nodos devueltos por `activados` se encienden 900 ms en el lienzo (halo dorado más un pulso que recorre sus cables).
- Ajustes de los dolls (vida, PH, armadura, salvación) en un panel plegable. Botones Turno, Deshacer y Reiniciar, y un registro con las 12 últimas entradas.
- Tras cada cambio del borrador, se reconstruye a los 300 ms con el aviso «La prueba se reinició con los cambios». Si `crearArena` devuelve un error, se muestra con la voz de Kuroi.

- [ ] **Step 1: Extend the script:** con una acción de daño 2d8, pulsar «Usar» y comprobar que la `BarraVital` del saco baja y que el nodo de la acción tiene `data-encendido="true"`; pulsar «Golpéame» y comprobar que baja la vida del doll.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS. Capturas `yunque-arena-1440.png` y, con `REDUCIDO=1`, que no haya animaciones (`getAnimations().length===0`).
- [ ] **Step 5: Commit** `feat: arena de dolls con nodos que se encienden`.

### Task 9: Personajes y monstruos, cajón Ficha y vista de lista

**Files:**
- Create: `components/yunque/editores/EditorVinculo.tsx`, `components/yunque/CajonFicha.tsx`, `components/yunque/VistaLista.tsx`
- Modify: `components/yunque/TallerYunque.tsx`, `scripts/capturar-yunque.mjs`

**Interfaces:**
- Consumes: la lógica de `ponerEquipo`, `crearDentro` y `faltantes`, que hoy vive en `page.tsx` y se recibe por props desde la página. `EditorMonstruo`, `FormasHistoria`, el bloque de «Naturaleza adquirida» (se extrae de `page.tsx:157` a `components/yunque/NaturalezaAdquirida.tsx`) y `PortadaYunque`.
- Produces: `<VistaLista b grafo operar/>` (mismos editores de nodo en bloques ordenados) y `<CajonFicha b patch/>` (descripción, historia, formas, naturaleza adquirida, requisitos narrativos, defectos, venta y precio, ligado al alma, clase calculada con «Cómo se calcula»).

- El núcleo de un personaje muestra la figura de su raza con huecos de equipo como puertos. Arrastrar un objeto desde la familia Colección del Grimorio hasta un hueco lo equipa. El botón «Crear aquí» de un hueco llama a `crearDentro`.
- Conmutador Lienzo/Lista en la barra superior, con la lista por defecto si `innerWidth < 1024`.

- [ ] **Step 1: Extend the script:** personaje con una espada enlazada → existe `vinculo:mano_der:<id>`. A 390 px se ve la lista sin desplazamiento horizontal (`document.documentElement.scrollWidth<=390`).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: personajes, cajón Ficha y vista de lista del Yunque`.

### Task 10: Plantillas, copiar y pegar, deshacer y teclado

**Files:**
- Create: `lib/yunque-plantillas.ts`, `components/yunque/useHistorial.ts`
- Modify: `components/yunque/Grimorio.tsx`, `components/yunque/TallerYunque.tsx`
- Test: `tests/yunque-plantillas.test.mjs`

**Interfaces:**
- Produces: `export const PLANTILLAS:{id:string;nombre:string;descripcion:string;fragmentos:Fragmento[]}[]` y `useHistorial(b,setB)→{hacer(o:Operacion):void;deshacer():void;rehacer():void;puedeDeshacer:boolean;puedeRehacer:boolean}` (máximo 50 pasos).
- Plantillas iniciales: «Golpe con quemadura» (01), «Escudo que absorbe y devuelve» (07), «Barrera contra hechizos» (06), «Curar al matar» (08), «Furia temporal» (09), «Despertar con poca vida» (17), «Teletransporte» (13) y las cinco defensas de Kion (`PLANTILLAS_REACCION`).

- [ ] **Step 1: Write the failing tests:** `cada plantilla pasa su validador al pegarla en un borrador vacío del tipo adecuado` y `pegar una plantilla dos veces genera ids distintos`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** plantillas, historial y atajos (Supr, Ctrl+D, Ctrl+Z, Ctrl+Y, Ctrl+C, Ctrl+V, Tab, flechas). Los atajos se ignoran cuando el foco está en un campo de texto.
- [ ] **Step 4: Run** `npm test` → PASS. Extiende el script: Ctrl+D duplica una acción y Ctrl+Z la quita.
- [ ] **Step 5: Commit** `feat: plantillas, historial y atajos del Yunque`.

### Task 11: Sustituir el formulario y cerrar

**Files:**
- Modify: `app/dm/forja/page.tsx` (la pestaña «El yunque» monta `TallerYunque` con `guardar` adaptado a `onGuardar`; se borra el formulario de las líneas 153–172)
- Delete: `app/dm/forja/taller/page.tsx`; los componentes que queden sin uso (`AyudaYunque.tsx`, `SelectorCreacionVisual.tsx` si `rg` no encuentra otros usos)
- Modify: `docs/superpowers/specs/2026-11-16-yunque-lienzo-design.md` (§5: el borrador es la fuente de verdad y el grafo se deriva; §9: arte entregado), `docs/pantallas.md`, `design.md` §7

- «Forjar ⚒»: si `guardar` sale bien, un `Sello` con destello de 600 ms. Si falla, foco y desplazamiento al primer nodo con `error`.
- Se mantienen `padre`/`volverPadre`, peticiones, `NavyCompanera` y el aviso de creación guardada.

- [ ] **Step 1: Extend the script:** desde `/dm/forja` → «El yunque» se ve el lienzo; «Forjar» con el nombre vacío lleva el foco al núcleo y muestra el error.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** el cambio.
- [ ] **Step 4: Verify everything:** `npm test`, `npm run test:database`, `npx next typegen && npx tsc --noEmit`, `npm run lint` (sin errores nuevos), `npm run build`, el script de capturas a 1440 y 390 px, y `node scripts/preparar-motor-edge.mjs --check` (el motor no cambia).
- [ ] **Step 5: Commit** `feat: el Yunque pasa a ser un lienzo de nodos` y abre el PR.
