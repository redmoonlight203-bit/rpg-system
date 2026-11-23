# Códices de La creación · Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** sustituir la ficha de lectura genérica de cada creación de la Forja (`Detalle` en `components/GaleriaCreacion.tsx`) por un **códice** propio de cada tipo. Los monstruos se leen en un bestiario con páginas que se pasan, las habilidades son cartas de tarot que se voltean, los objetos son reliquias en vitrina, las pasivas son sellos rituales, los títulos son edictos, los personajes son expedientes de héroe y «otro» es un pergamino. Todos los códices se enlazan entre sí para recorrer el mundo creado sin salir de la vista.

**Arquitectura:** la lógica pura (qué códice corresponde, cómo se paginan las láminas, qué creaciones se enlazan, el arcano de cada carta, el resumen de pasivas y la tirada de prueba) va en `lib/codices.ts` y se prueba con `node --test`. La presentación va en `components/codices/`: un despachador `VistaCodice`, piezas comunes extraídas del `Detalle` actual (acciones, editor de presentación, reglas, historia, vínculos y zona de peligro) y una vista por tipo. Los estilos van en un único `components/codices/codices.css` con el prefijo `cx-`. `GaleriaCreacion` conserva el estado y añade un **rastro** de navegación entre creaciones enlazadas.

**Tecnologías:** Next.js 16.3 (App Router; lee `node_modules/next/dist/docs/` antes de usar cualquier API de Next, según `AGENTS.md`), React 19.2, Tailwind v4 con los tokens de `app/globals.css`, CSS puro para las animaciones, `lucide-react` para los iconos y las primitivas de `components/ui/Juego.tsx` (`Marco`, `Medallon`, `Sello`, `Runa`).

**Especificación:** este documento incluye su especificación en la sección «Decisiones de diseño» y se basa en `design.md` (v3), `docs/galeria-creacion.md` y `docs/forja.md`. Quien ejecute el plan debe leer esos tres archivos antes de empezar.

---

## Decisiones de diseño (la especificación)

### Qué se conserva sin cambios (obligatorio)

Todo lo que hoy hace la ficha de lectura sigue funcionando igual. Solo cambia la presentación:

- Las acciones **Editar ficha**, **Entregar** (y sus variantes de alma única: «Entregar única al baúl» y «Ya entregada · Restablece para recuperar»), **Preparar batalla** (solo para personajes no ligados al alma), **Publicar en tienda** (enlaza a `/dm/tienda-almas?forja=` para personajes y a `/dm/mercado?forja=` para el resto), **Restablecer y devolver a La creación** y **Eliminar creación**.
- El editor de imagen e icono: URL, archivo, vista previa en tarjeta y en ficha circular, `SelectorIconoYugen`, «Restaurar ilustración» o «Quitar imagen», «Cancelar», «Guardar presentación», el aviso de cambios sin guardar, la protección `beforeunload` y las confirmaciones con `useDialogo` al salir con cambios sin guardar.
- El selector de forma (`formas_historia`) cambia la imagen visible y muestra la historia de esa forma.
- El foco va al título `h2` al abrir la ficha y vuelve al botón de filtro «Todo» al regresar a la colección.
- Se mantienen todos los textos visibles que existen hoy. Las pruebas buscan esos textos.
- Las props de `GaleriaCreacion` y la página `app/dm/forja/page.tsx` no cambian, salvo que el tipo `PiezaGaleria` gana campos opcionales.
- La lógica de datos, Supabase, `lib/` del combate y el Yunque no se tocan.

### Códice por tipo

| Clave `Codice` | Cuándo | Metáfora | Interacción principal |
|---|---|---|---|
| `bestiario` | `tipo_creacion==='personaje'` y `esMonstruo(item)` | Libro abierto con dos páginas y marcapáginas | Pasar páginas (botones, flechas ←/→, marcapáginas o deslizar el dedo) con giro de hoja en 3D |
| `expediente` | personaje que no es monstruo | Expediente de héroe: retrato enmarcado y sello de rango | Abanico de habilidades, muñeco de equipo y medallones |
| `tarot` | `habilidad` | Carta de tarot de 2:3,5 con arcano romano | Voltear la carta (anverso con arte, reverso con la «lectura») e inclinación con el puntero; tirada de prueba |
| `reliquia` | `objeto` | Vitrina con pedestal y placa grabada | Recorrido de niveles de artefacto y dados del arma |
| `sello` | `pasiva` | Sello de lacre circular con el nombre grabado en el anillo | Cadena ritual Evento → Condición → Efectos |
| `edicto` | `titulo` | Estandarte colgante y proclama en pergamino con capitular | Los bonos aparecen como heráldica |
| `pergamino` | `otro` o un tipo desconocido | Rollo con varillas superior e inferior | Lectura |

### Contenido de cada códice

Todo bloque sin datos se omite. Nunca se muestra un encabezado vacío.

- **Bestiario.** Se compone de láminas con este orden: (1) `lamina`, con ilustración, nombre, «Especie · {clasificación}», sello de amenaza (rango) y «Ficha de campo» con los atributos (rangos mín–máx si `es_grupo`); (2) `anatomia`, con habilidades como mini cartas de tarot, pasivas como mini sellos y equipo; (3) una lámina `variante` por cada variante de `configuracion_monstruo.variantes`, con nombre, probabilidad de aparición en % (peso/total, un decimal), bonos con signo, habilidades y pasivas añadidas y equipo (opciones del catálogo por nombre o «Generado: {nombre}» con sus rangos); (4) `cronica`, con historia, formas, requisitos, defectos y reglas; (5) `ficha`, con acciones, editor de presentación y zona de peligro. En escritorio (≥ 900 px) se ven dos láminas por pliego. Por debajo se ve una.
- **Tarot.** Anverso: número romano del arcano arriba, ilustración, nombre en una banda y rango que tiñe el marco (variables `--marco`, `--tinta` y `--tinte` de `.cg-rango-*`). Reverso, titulado «Lectura»: cada acción con su nombre, `formula(e)`, coste de PH y fatiga, y `describirEfecto(e).resumen`. Debajo de la carta se muestran «Requisitos de uso», las reglas, la historia y «La portan», que lista las creaciones que la incluyen.
- **Reliquia.** Vitrina con la imagen, la etiqueta del espacio (`SLOTS[].nombre` según `slot_tipo`, o «Dos manos»), la marca «Consumible» y una placa con los atributos. Si el objeto es un arma con acciones de daño, muestra «Dados» con `formula`. Si tiene `configuracion_artefacto`, añade el recorrido «Despertar del artefacto» con los niveles en orden y la condición de subida en texto. Termina con «La portan».
- **Sello.** El nombre se graba en el anillo con un SVG `<textPath>` y el icono va en el centro. Cada regla pasiva se muestra como una cadena vertical de nodos unidos por una línea de oro: evento → condición → efectos (reducción, curación, PH, fatiga, represalia y bonos). Las `reglas` generales usan el bloque común de reglas.
- **Edicto.** Estandarte con cola de golondrina (`clip-path`) del color del rango. La proclama en pergamino usa la descripción y la historia con capitular (`::first-letter`). Los bonos de atributos son la heráldica, con una lista de escudos pequeños.
- **Expediente.** Retrato enmarcado (`Marco`) y sello de rango. Los atributos se muestran con `Medallon`. «Grimorio» es un abanico de mini cartas de tarot de sus habilidades. «Arsenal» es un muñeco de equipo con cada `SLOTS` ocupado que enlaza a su reliquia, y los espacios vacíos se muestran atenuados. Las pasivas aparecen como mini sellos. Se incluyen el vínculo de naturaleza (`naturaleza_vinculo` con bestia, sello y origen) y la invocación si existen.
- **Pergamino.** Muestra la cabecera, los atributos, las reglas y la historia en un rollo.

### Cómo se combinan los códices

- Cada creación enlazada (habilidad, pasiva, equipo, opciones de las variantes o «La portan») es un **botón** que abre el códice de esa creación dentro de la misma vista.
- `GaleriaCreacion` guarda un **rastro** de hasta 8 identificadores. Se muestra como migas («Colección › Gorveth › Hambre de Gorveth») y cada miga vuelve a ese punto. «Volver a la colección» vacía el rastro. Abrir una creación que ya está en el rastro lo recorta hasta ella, de modo que no hay ciclos. Si el rastro supera 8 entradas, se descarta la más antigua.
- Si una creación enlazada no existe (se borró o se archivó), se muestra «Creación no disponible» como texto atenuado, sin botón.
- Si la presentación tiene cambios sin guardar, navegar por un enlace pide la misma confirmación que «Volver».

### Movimiento (amplía `design.md` §5)

Se permiten solo estas animaciones nuevas. Todas usan `transform` u `opacity` y todas se desactivan con `prefers-reduced-motion: reduce`, en cuyo caso el cambio es inmediato:

- **Pasar página:** 650 ms, `rotateY` de 0 a −180° (o al revés) con `transform-origin` en el lomo.
- **Voltear carta:** 600 ms, `rotateY(180deg)`.
- **Inclinación de carta:** como máximo 6° según el puntero. Solo con `(hover:hover) and (pointer:fine)`.
- **Entrada de códice:** 300 ms, la misma que `y3-entrada`.
- **Sello al abrir:** escala de 0,92 a 1 en 400 ms, una sola vez.

No hay bucles infinitos y no se añaden librerías.

### Arte

No se generan imágenes. Las texturas (papel, cuero, lacre y madera) se hacen con gradientes CSS. Se añade al `public/arte/README.md` la petición opcional de `public/arte/codices/` (`libro-cuero.webp`, `papel.webp`, `tarot-dorso.webp`, 512 px, sin costuras). El CSS debe funcionar sin ellas y usarlas solo si existen, por medio de una variable CSS que por defecto vale `none`.

---

## Restricciones globales

- No se añade ninguna dependencia a `package.json`.
- No se modifica nada en `lib/combate*`, `supabase/`, `app/dm/forja/page.tsx` (salvo que el tipo lo exija), el Yunque ni `components/ForjaOperacion.tsx`.
- Se usan solo los tokens de color de `design.md` §2. No se escriben colores hex nuevos fuera de los `--marco`, `--tinta` y `--tinte` de rango que ya existen.
- Tipografía: los títulos usan `var(--font-display)` (Cinzel), las cifras `tabular-nums`, y el cuerpo mide como mínimo 13 px.
- Todos los textos de la interfaz van en español. Las cadenas existentes se conservan literalmente.
- A 390 px de ancho no puede haber desplazamiento horizontal. El contraste de texto debe ser de al menos 4,5:1.
- Todo control interactivo es un `<button>` o un `<a>` real, con foco visible (`outline: 2px solid var(--color-gold-soft)`).
- Los componentes nuevos que usen hooks empiezan con `"use client";`.
- El código de los archivos nuevos se formatea con legibilidad normal: una sentencia por línea, sin el estilo compactado de `GaleriaCreacion.tsx`.
- Al terminar deben pasar `npm test`, `npx tsc --noEmit`, `npm run lint` y `npm run build`, sin errores nuevos.

## Foco de revisión

Estos son los casos que un usuario encontrará y que ninguna prueba de una sola tarea cubre por sí misma. Cada uno tiene una prueba asignada en la tarea indicada.

1. **Monstruo sin variantes ni habilidades:** el bestiario no muestra láminas vacías y la navegación no ofrece páginas inexistentes. Se prueba en la Tarea 1 (`paginasBestiario`) y en la Tarea 6.
2. **Ciclos de enlaces** (A porta B y B lista a A en «La portan»): el rastro no crece sin límite ni duplica entradas. Se prueba en la Tarea 1 (`avanzarRastro`).
3. **Creación enlazada borrada:** se muestra «Creación no disponible» sin botón y sin errores. Se prueba en las Tareas 1 y 3.
4. **Cambios de imagen sin guardar al navegar por un enlace:** se pide confirmación igual que con «Volver». Se prueba en la Tarea 9 (prueba manual guiada con Playwright) y en la Tarea 3 (el callback `navegar` envuelve los enlaces).
5. **Movimiento reducido y lectores de pantalla:** la cara oculta de la carta y las láminas fuera de vista son `inert` y `aria-hidden`, y el número de página se anuncia con `aria-live`. Se prueba en las Tareas 5 y 6.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `lib/codices.ts` | Crear | Lógica pura: `codiceDe`, `arcanoDe`, `romano`, `paginasBestiario`, `variantesBestiario`, `vinculosDe`, `portadoresDe`, `avanzarRastro`, `cadenaPasiva`, `espacioDe`, `tirarPrueba` |
| `tests/codices.test.mjs` | Crear | Pruebas de `lib/codices.ts` con `tests/helpers/cargar-ts.mjs` |
| `tests/helpers/render-tsx.mjs` | Crear | Cargador de `.tsx` para `renderToStaticMarkup`, copiado del de `tests/forja-visual.test.mjs`, con stubs de `next/link`, `next/navigation`, `.css` e `imagenes-storage` |
| `tests/codices-render.test.mjs` | Crear | Renderizado de cada códice y de las piezas comunes |
| `components/codices/tipos.ts` | Crear | Tipo `ContextoCodice` compartido por todas las vistas |
| `components/codices/Comunes.tsx` | Crear | `CabeceraCodice`, `AccionesCreacion`, `ZonaPeligro`, `HistoriaCodice`, `AtributosCodice`, `EnlaceCreacion`, `Rastro` |
| `components/codices/ReglasCodice.tsx` | Crear | `ReglasCreacion`, `AccionesEfectos`, `PasivasLista` y `resumenCondicion`/`ResumenEfecto` (movidos desde `GaleriaCreacion.tsx`) |
| `components/codices/EditorPresentacion.tsx` | Crear | Editor de imagen e icono extraído de `Detalle`, con el mismo comportamiento |
| `components/codices/Miniaturas.tsx` | Crear | `MiniTarot`, `MiniSello`, `MiniReliquia`: enlaces compactos entre códices |
| `components/codices/VistaCodice.tsx` | Crear | Despachador. Contiene el estado de la presentación (que antes vivía en `Detalle`) y elige la vista |
| `components/codices/Bestiario.tsx` | Crear | Libro paginado y hook `usePaginasLibro` |
| `components/codices/Tarot.tsx` | Crear | Carta volteable, inclinación y tirada de prueba |
| `components/codices/Reliquia.tsx` | Crear | Vitrina, placa y niveles de artefacto |
| `components/codices/Sello.tsx` | Crear | Sello circular y cadena ritual |
| `components/codices/Edicto.tsx` | Crear | Estandarte y proclama |
| `components/codices/Expediente.tsx` | Crear | Retrato, medallones, grimorio y arsenal |
| `components/codices/Pergamino.tsx` | Crear | Rollo genérico |
| `components/codices/codices.css` | Crear | Todos los estilos `cx-` y sus `@media` |
| `components/GaleriaCreacion.tsx` | Modificar | Exportar `Portada`, `Carta`, `atributos` y `valor`; ampliar `PiezaGaleria`; sustituir `Detalle` por `VistaCodice`; añadir el rastro |
| `design.md` | Modificar | §5: animaciones permitidas para los códices. §7: «Forja: códices hechos» |
| `docs/galeria-creacion.md` | Modificar | Párrafo «Códices» y comandos de verificación |
| `public/arte/README.md` | Modificar | Petición opcional de `codices/*.webp` |

---

### Tarea 1: lógica pura de los códices (`lib/codices.ts`)

**Archivos:**
- Crear: `lib/codices.ts`
- Crear: `tests/codices.test.mjs`

**Interfaces:**
- Consume: `TipoCreacion`, `SLOTS`, `Efecto` y `formula` de `lib/creacion.ts`; `ConfiguracionMonstruo` y `VarianteMonstruo` de `lib/monstruos.ts`; `ReglaPasiva` de `lib/pasivas.ts`; `rangoDe` de `lib/cartas.ts`.
- Produce (exportado, usado por las tareas 2–8):
  ```ts
  export type Codice='bestiario'|'expediente'|'tarot'|'reliquia'|'sello'|'edicto'|'pergamino';
  export function codiceDe(tipo:TipoCreacion|string,monstruo:boolean):Codice;
  export function romano(n:number):string;                       // 0→"0", 1..21→"I".."XXI"
  export function arcanoDe(id:string):{numero:number;romano:string}; // número estable 0..21 por id
  export type PaginaBestiario={clave:'lamina'|'anatomia'|'variante'|'cronica'|'ficha';titulo:string;varianteId?:string};
  export type DatosBestiario={stats:number;habilidades:number;pasivas:number;equipo:number;variantes:{id:string;nombre:string}[];cronica:boolean};
  export function paginasBestiario(d:DatosBestiario):PaginaBestiario[];
  export type VarianteLegible={id:string;nombre:string;probabilidad:number;bonos:[string,number][];habilidades:string[];pasivas:string[];equipo:{espacio:string;texto:string}[]};
  export function variantesBestiario(config:ConfiguracionMonstruo|null|undefined,nombreDe:(id:string)=>string|null):VarianteLegible[];
  export type Vinculo={id:string;nombre:string|null;tipo:'habilidad'|'pasiva'|'equipo';espacio?:string};
  export type FuenteVinculos={id:string;nombre:string;habilidades?:string[];pasivas?:string[];equipamiento?:Record<string,string>;configuracion_monstruo?:ConfiguracionMonstruo|null};
  export function vinculosDe(item:FuenteVinculos,items:FuenteVinculos[]):Vinculo[];
  export function portadoresDe(id:string,items:FuenteVinculos[]):{id:string;nombre:string}[];
  export function avanzarRastro(rastro:string[],id:string,max?:number):string[]; // max por defecto 8
  export type PasoRitual={tipo:'evento'|'condicion'|'efecto';texto:string};
  export function cadenaPasiva(r:ReglaPasiva,etiqueta:(clave:string)=>string):PasoRitual[];
  export function espacioDe(slotTipo:string):string|null;          // "mano"→"Mano", "dos_manos"→"Dos manos", "casco"→"Cabeza", "ninguno"/"" → null
  export function tirarPrueba(e:Pick<Efecto,'cantidad'|'caras'|'modificador'>,rng?:()=>number):{dados:number[];total:number};
  ```

- [ ] **Paso 1: escribir las pruebas que fallan** en `tests/codices.test.mjs`. Copia la cabecera de `tests/cartas.test.mjs` y usa `const c=cargarDependencia('codices');`. Pruebas y aserciones:
  - `codiceDe elige la metáfora por tipo`: `codiceDe('personaje',true)==='bestiario'`, `('personaje',false)==='expediente'`, `('habilidad',false)==='tarot'`, `('habilidad',true)==='tarot'` (el monstruo solo afecta a personajes), `('objeto')==='reliquia'`, `('pasiva')==='sello'`, `('titulo')==='edicto'`, `('otro')==='pergamino'`, `('desconocido',false)==='pergamino'`.
  - `romano y arcanoDe`: `romano(0)==='0'`, `romano(4)==='IV'`, `romano(9)==='IX'`, `romano(14)==='XIV'`, `romano(21)==='XXI'`; `arcanoDe('abc')` igual en dos llamadas; para 200 ids `'id'+i`, `0<=numero<=21` y al menos 10 números distintos.
  - `paginasBestiario omite láminas vacías`: con `{stats:0,habilidades:0,pasivas:0,equipo:0,variantes:[],cronica:false}` el resultado es `['lamina','ficha']` (en claves). Con 2 variantes `v1` y `v2` y `cronica:true`, las claves son `['lamina','variante','variante','cronica','ficha']` y `varianteId` vale `'v1'` y `'v2'` en ese orden. Con `habilidades:1` se incluye `'anatomia'` en la posición 1.
  - `variantesBestiario`: con pesos 1 y 3, las probabilidades son `25` y `75`. Con pesos 1, 1 y 1 son `33.3` (un decimal). Los bonos con valor 0 se omiten. Un equipo `{modo:'catalogo',opciones:['x','borrada']}` con `nombreDe` que devuelve `'Hacha'` para `'x'` y `null` para `'borrada'` da `texto:'Hacha o Creación no disponible'`. Un equipo `{modo:'generado',nombre:'Garras',rangos:{dano:{min:1,max:3}}}` da `texto:'Generado: Garras (dano 1–3)'`. `espacio` es el `SLOTS[].nombre` de la clave (`mano_der` → `'Mano derecha'`). Con `null` el resultado es `[]`.
  - `vinculosDe deduplica y marca las borradas`: si un ítem tiene `habilidades:['h1','h1','zz']`, `pasivas:['p1']` y `equipamiento:{mano_der:'o1'}`, el resultado tiene 4 entradas. La de `'zz'` tiene `nombre:null`. La de `o1` tiene `tipo:'equipo'` y `espacio:'Mano derecha'`. Las habilidades y pasivas de las variantes de monstruo se incluyen sin duplicar las de la base.
  - `portadoresDe encuentra a quien la lleva`: dados A con `habilidades:['h']`, M con `configuracion_monstruo.variantes[0].habilidades:['h']` y C sin nada, `portadoresDe('h',...)` devuelve los ids `['A','M']` ordenados por nombre (`localeCompare('es')`) y nunca incluye a la propia `h`.
  - `avanzarRastro no crea ciclos`: `avanzarRastro(['a','b','c'],'b')` da `['a','b']`. `avanzarRastro(['a'],'b')` da `['a','b']`. Con 8 elementos y uno nuevo, la longitud se queda en 8 y se descarta el primero. `avanzarRastro([],'a')` da `['a']`.
  - `cadenaPasiva`: `{evento:'recibir_dano',condicion:'vida_mitad',reduccion_pct:20,bonos:{armadura:2,fuerza:0}}` con `etiqueta=k=>k.toUpperCase()` da `[{tipo:'evento',texto:'Al recibir daño'},{tipo:'condicion',texto:'Vida a la mitad'},{tipo:'efecto',texto:'Reduce 20% de daño'},{tipo:'efecto',texto:'ARMADURA +2'}]`. Una regla sin efectos devuelve solo el evento y la condición.
  - `espacioDe`: `'casco'`→`'Cabeza'`, `'mano'`→`'Mano'`, `'dos_manos'`→`'Dos manos'`, `'accesorio'`→`'Accesorio'`, `'ninguno'`→`null`, `''`→`null`.
  - `tirarPrueba`: con `rng=()=>0.999` y `{cantidad:2,caras:6,modificador:3}` da `dados:[6,6]` y `total:15`. Con `rng=()=>0` da `dados:[1,1]` y `total:5`. Con `cantidad:0` da `dados:[]` y `total:modificador`. `cantidad` se limita a 100.

- [ ] **Paso 2: ejecutar las pruebas y comprobar que fallan.** Ejecuta `node --test tests/codices.test.mjs`. Resultado esperado: FALLO por `ENOENT …/lib/codices.ts`.

- [ ] **Paso 3: implementar `lib/codices.ts`.** Notas para que la implementación sea unívoca:
  - Los textos de evento y condición de `cadenaPasiva` se mueven aquí como constantes exportadas `EVENTOS_PASIVA` y `CONDICIONES_PASIVA`, con los mismos literales del mapa inline de `Detalle` (`permanente:"Siempre activa"`, …). Los textos de efecto también son los de `Detalle`: `Reduce N% de daño`, `Cura N`, `Recupera N PH`, `Reduce N Fatiga`, `Represalia XdY`, y los bonos como `${etiqueta(k)} ${v>0?'+':''}${v}`, omitiendo los que valen 0.
  - `arcanoDe`: hash FNV-1a de 32 bits sobre los códigos de carácter del id, `numero = hash % 22`.
  - `probabilidad = Math.round(peso/total*1000)/10`. Si el total es 0, todas valen 0.
  - El rango en el texto de equipo generado usa la clave cruda del atributo y `min–max` con el guion largo «–», igual que `valor()` en la galería.
  - `tirarPrueba`: `dado = 1 + Math.floor(rng()*caras)`, limitado a `[1, caras]`. `caras` mínimo 1.
  - Este archivo no importa React ni nada del navegador.

- [ ] **Paso 4: ejecutar las pruebas y comprobar que pasan.** Ejecuta `node --test tests/codices.test.mjs`. Resultado esperado: todas pasan. Ejecuta también `npx tsc --noEmit` sin errores nuevos.

- [ ] **Paso 5: commit.**
  ```bash
  git add lib/codices.ts tests/codices.test.mjs
  git commit -m "feat(forja): lógica pura de los códices de La creación"
  ```

---

### Tarea 2: arnés de renderizado y exportaciones de la galería

**Archivos:**
- Crear: `tests/helpers/render-tsx.mjs`
- Modificar: `components/GaleriaCreacion.tsx` (exportaciones y tipo)
- Crear: `tests/codices-render.test.mjs` (primera prueba)

**Interfaces:**
- Produce:
  ```js
  // tests/helpers/render-tsx.mjs
  export function cargarTsx(rutaRelativaDesdeRaiz:string):Record<string,any>;
  export function renderizar(ruta:string,componente:string,props:object,envoltorio?:(el)=>el):string; // HTML estático
  export const raiz:string;
  ```
  Los stubs: `*.css` devuelve `{}`. `*/imagenes-storage` devuelve `publicarArchivoImagen` que lanza un error. `next/link` es un componente que renderiza `<a href>`. `next/navigation` devuelve `{useRouter:()=>({push(){}})}`. `./Dialogo` y `../Dialogo` se resuelven al archivo real, y `renderizar` envuelve el árbol en su `DialogoProvider` real (comprueba su nombre exportado en `components/Dialogo.tsx`).
- Produce en `components/GaleriaCreacion.tsx`: `export function Portada`, `export function Carta`, `export function atributos`, `export function valor` y `export type PropsGaleria<T>` (el `Props` actual, renombrado y exportado). `PiezaGaleria` gana estos campos opcionales: `configuracion_monstruo?: ConfiguracionMonstruo|null; configuracion_artefacto?: ConfiguracionArtefacto|null; requisitos_uso?: RequisitosUso; consumible?: boolean; naturaleza_vinculo?: VinculoNaturaleza; configuracion_invocacion?: InvocacionEditor|null; nivel_maximo?: number`. Importa solo los tipos, con `import type`.

- [ ] **Paso 1: escribir la prueba que falla.** En `tests/codices-render.test.mjs`, la prueba `el arnés renderiza una Carta de la galería` llama a `renderizar('components/GaleriaCreacion.tsx','Carta',{item:fixture('habilidad'),props:propsBase(),dueno:null,orden:0})` y comprueba que el resultado coincide con `/cg-carta/` y con el nombre del fixture. Define en este archivo `fixture(tipo, extra)`, que devuelve una `PiezaGaleria` completa (todos los campos obligatorios con valores vacíos válidos, `clase:'A'` y `nombre` según el tipo), y `propsBase(items)`, que devuelve un `PropsGaleria` con callbacks que no hacen nada, `tipoDe:i=>i.tipo_creacion`, `iconoDe:()=> 'ojo'`, `clasificacion:k=>k`, `etiqueta:(_,k)=>k` y `esMonstruo:i=>i.tipo==='bestia'`.

- [ ] **Paso 2: ejecutar la prueba y comprobar que falla.** Ejecuta `node --test tests/codices-render.test.mjs`. Resultado esperado: FALLO porque `Carta` no está exportada.

- [ ] **Paso 3: implementar.** Crea el helper copiando el cargador `cargar` de `tests/forja-visual.test.mjs` (líneas 11–23) y añade los stubs. Añade las exportaciones y los campos opcionales en `GaleriaCreacion.tsx`, sin cambiar ningún comportamiento.

- [ ] **Paso 4: ejecutar las pruebas.** Ejecuta `node --test tests/codices-render.test.mjs tests/forja-visual.test.mjs` y `npx tsc --noEmit`. Resultado esperado: todo pasa. `app/dm/forja/page.tsx` sigue compilando porque `Creacion` ya contiene esos campos.

- [ ] **Paso 5: commit.** `git commit -m "test(forja): arnés de renderizado para los códices"`.

---

### Tarea 3: piezas comunes y extracción del `Detalle`

Esta tarea es solo una refactorización: al terminarla, la app se ve **igual que hoy**, pero el `Detalle` vive en `components/codices/` y está dividido en piezas.

**Archivos:**
- Crear: `components/codices/tipos.ts`, `components/codices/Comunes.tsx`, `components/codices/ReglasCodice.tsx`, `components/codices/EditorPresentacion.tsx`, `components/codices/VistaCodice.tsx`, `components/codices/codices.css` (vacío salvo el comentario de cabecera)
- Modificar: `components/GaleriaCreacion.tsx` (borrar `Detalle`, `resumenValor`, `resumenCondicion` y `ResumenEfecto`, y renderizar `VistaCodice`)

**Interfaces:**
- Produce `components/codices/tipos.ts`:
  ```ts
  export type ContextoCodice<T extends PiezaGaleria>={
    item:T; props:PropsGaleria<T>;
    codice:Codice; tipo:TipoCreacion; monstruo:boolean;
    imagenVisible:string|undefined; iconoVisible:string;   // ya resueltos con la forma activa y la edición en curso
    ocupado:boolean;
    abrir:(id:string)=>void;            // navega a una creación enlazada (ya envuelto en navegar())
    navegar:(fn:()=>void)=>void;        // confirma si hay presentación sin guardar
    titulo:React.RefObject<HTMLHeadingElement|null>;
    ranuras:{acciones:ReactNode;presentacion:ReactNode;peligro:ReactNode;formas:ReactNode;estado:ReactNode};
  };
  ```
  `ranuras` lo construye `VistaCodice`. Cada vista decide dónde colocar cada ranura, pero debe colocarlas todas.
- Produce `Comunes.tsx`:
  - `CabeceraCodice({ctx, eyebrow?})`: el eyebrow, el `h2 tabIndex={-1} ref={ctx.titulo}`, la descripción o «Sin descripción.» y las etiquetas «Clase X», «Malla · valores por rango» o «Único · valores fijos», y «Ligado al alma».
  - `AccionesCreacion({ctx})`: los cuatro botones o enlaces actuales con los mismos textos y condiciones.
  - `ZonaPeligro({ctx, onError})`: el aviso de restablecer (si aplica) y el pie «Las copias existentes conservan sus valores.» con «Eliminar creación».
  - `HistoriaCodice({ctx, forma})`: la forma activa, Historia, Requisitos, y Limitaciones y defectos.
  - `AtributosCodice({ctx, variante?:'rejilla'|'medallones'|'placa'|'heraldica'})`: los mismos datos que hoy, con el marcado distinto según la variante.
  - `EnlaceCreacion({ctx, id, children, className})`: `<button>` que llama a `ctx.abrir(id)`, o `<span className="cx-no-disponible">Creación no disponible</span>` si el id no está en `props.items`.
  - `Rastro({rastro, items, irA, volver})`: un `<nav aria-label="Rastro de creaciones">` con `<ol>`. La última miga lleva `aria-current="page"`.
- Produce `ReglasCodice.tsx`: `AccionesEfectos({ctx})` (sección «Acciones y efectos»), `PasivasLista({ctx})` (sección «Pasivas», que ahora usa `cadenaPasiva`), `ReglasCreacion({ctx})` (sección «Reglas de la creación») y `resumenCondicion`/`ResumenEfecto` movidos sin cambios.
- Produce `EditorPresentacion.tsx`: `EditorPresentacion({ctx, estado})`, donde `estado` es lo que devuelve el hook `usePresentacion(item, props)`, definido en el mismo archivo y movido desde `Detalle`: `{imagen,setImagen,icono,setIcono,procesando,guardando,error,setError,aviso,editando,setEditando,dirty,ocupado,archivo(file),guardar(),cancelar()}`.
- Produce `VistaCodice.tsx`: `export default function VistaCodice<T>({item, props, volver, abrir}:{item:T;props:PropsGaleria<T>;volver:()=>void;abrir:(id:string)=>void})`. En esta tarea siempre renderiza la vista **`Clasica`** (el marcado actual del `Detalle`, montado con las piezas nuevas). Las tareas 4–8 sustituyen `Clasica` por la vista de cada códice.

- [ ] **Paso 1: escribir las pruebas que fallan** en `tests/codices-render.test.mjs`:
  - `la ficha conserva sus acciones y textos`: renderiza `VistaCodice` con `fixture('objeto')` y comprueba estos textos: `Volver a la colección`, `Editar ficha`, `Entregar`, `Publicar en tienda`, `href="/dm/mercado?forja=`, `Eliminar creación`, `Las copias existentes conservan sus valores.` y `Elegir imagen o icono`.
  - `personaje: preparar batalla y tienda de almas`: con `fixture('personaje')` aparecen `Preparar batalla` y `/dm/tienda-almas?forja=`. Con `ligado_al_alma:true, alma_en_uso:true` aparece `Ya entregada · Restablece para recuperar` y no aparece `Preparar batalla`.
  - `enlace roto`: un ítem con `habilidades:['no-existe']` renderiza `Creación no disponible` y ningún `<button` que lo contenga.

- [ ] **Paso 2: ejecutar las pruebas y comprobar que fallan.** Ejecuta `node --test tests/codices-render.test.mjs`. Resultado esperado: FALLO porque falta el módulo `components/codices/VistaCodice`.

- [ ] **Paso 3: implementar** moviendo el código y conservando el comportamiento. En `GaleriaCreacion`, `if (seleccionada) return <VistaCodice key={seleccionada.id} item={seleccionada} props={props} volver={volver} abrir={abrir}/>;`. Por ahora, `abrir` es el `abrir` existente. La Tarea 9 añade el rastro.

- [ ] **Paso 4: ejecutar las pruebas.** Ejecuta `node --test tests/codices-render.test.mjs`, `npx tsc --noEmit` y `npm run lint`. Resultado esperado: todo pasa. Además haz una comprobación visual con `npm run dev`: la ficha de «Axel Kuro» se ve igual que la captura de referencia.

- [ ] **Paso 5: commit.** `git commit -m "refactor(forja): extraer la ficha de La creación a components/codices"`.

---

### Tarea 4: miniaturas que enlazan códices (`Miniaturas.tsx`) y base de estilos

**Archivos:**
- Crear: `components/codices/Miniaturas.tsx`
- Modificar: `components/codices/codices.css`

**Interfaces:**
- Consume: `EnlaceCreacion`, `ContextoCodice`, `arcanoDe`, `rangoDe`, `imagenCreacion` y `Portada`.
- Produce: `MiniTarot({ctx,id})`, `MiniSello({ctx,id})`, `MiniReliquia({ctx,id,espacio?})` y `GrupoVinculos({ctx, vinculos:Vinculo[], titulo})`. `GrupoVinculos` elige la miniatura según el `tipoDe` real del ítem enlazado (habilidad → tarot, pasiva → sello, objeto → reliquia; cualquier otro tipo → chip con el icono, como el `.cg-related` actual). Cada miniatura es un `EnlaceCreacion` con `aria-label="Abrir {nombre}"`.
- CSS base: `.cx-codice` (contenedor, con la entrada de 300 ms), las variables de textura `--cx-papel`, `--cx-cuero` y `--cx-dorso` (gradientes, más `url()` opcional), `.cx-no-disponible`, `.cx-rastro`, `.cx-seccion` (título en Cinzel, 13 px de cuerpo mínimo) y el bloque `@media (prefers-reduced-motion: reduce)` que anula todas las transiciones y animaciones `cx-`. Las miniaturas miden 72 × 126 px (tarot), 64 px de diámetro (sello) y 88 × 88 px (reliquia), con elevación de 3 px al pasar el cursor.

- [ ] **Paso 1: prueba que falla.** `GrupoVinculos elige la miniatura por tipo`: con items `h` (habilidad), `p` (pasiva) y `o` (objeto), el HTML contiene `cx-mini-tarot`, `cx-mini-sello`, `cx-mini-reliquia` y `aria-label="Abrir {nombre}"` tres veces.
- [ ] **Paso 2:** ejecuta la prueba y comprueba que falla.
- [ ] **Paso 3:** implementa los componentes y el CSS.
- [ ] **Paso 4:** ejecuta la prueba y comprueba que pasa. Ejecuta también `npx tsc --noEmit`.
- [ ] **Paso 5: commit.** `git commit -m "feat(forja): miniaturas que enlazan los códices"`.

---

### Tarea 5: códice de tarot (habilidad)

**Archivos:**
- Crear: `components/codices/Tarot.tsx`
- Modificar: `components/codices/VistaCodice.tsx` (`codice==='tarot'` → `<Tarot ctx>`), `components/codices/codices.css`

**Interfaces:**
- Consume: `arcanoDe`, `portadoresDe`, `tirarPrueba`, `formula`, `efectosDe`, `describirEfecto`, `CabeceraCodice`, `ReglasCreacion`, `HistoriaCodice` y `GrupoVinculos`.
- Produce: `export default function Tarot<T>({ctx}:{ctx:ContextoCodice<T>})`.

**Estructura (escritorio: carta a la izquierda y texto a la derecha; móvil: apilado):**
- `.cx-tarot-escena` con `perspective:1200px`. Contiene `<button className="cx-tarot" aria-pressed={volteada} aria-label={volteada?'Ver el anverso de la carta':'Voltear la carta para leerla'}>`, y dentro `.cx-tarot-cara.is-anverso` y `.cx-tarot-cara.is-reverso`. La cara oculta lleva `aria-hidden="true"` e `inert`. Las dos caras usan `backface-visibility:hidden`. El reverso se gira `rotateY(180deg)` y la carta volteada `rotateY(180deg)` en 600 ms.
- Anverso: arcano (`{romano}`) arriba en Cinzel, `Portada` en un óvalo con borde `--marco`, banda con el nombre y el rango abajo. Usa la textura `--cx-dorso` en el borde.
- Reverso: título «Lectura» y una fila por acción: nombre, `formula(e)`, «{coste_ph} PH · {coste_fatiga||0} Fatiga» y el resumen. Sin acciones muestra «Esta carta no tiene acciones; su poder está en sus reglas.».
- Inclinación: `onPointerMove` en la escena actualiza `--rx` y `--ry` (como máximo ±6°) con `requestAnimationFrame`, y `onPointerLeave` las devuelve a 0. Solo se activa si `matchMedia('(hover:hover) and (pointer:fine)').matches` y no hay movimiento reducido. Se calcula en el cliente dentro de un `useEffect`, nunca durante el render.
- «Tirada de prueba»: debajo de la carta hay un `<select>` de acciones con dados (`cantidad>0`) y un botón «Lanzar». El resultado se muestra en `<output aria-live="polite">` como «{dados.join(' + ')} {±mod} = {total}», con un aviso pequeño: «Solo es una prueba: no aplica daño ni consume PH.». Si no hay acciones con dados, el bloque no aparece.
- Columna de texto: `CabeceraCodice` con eyebrow «Arcano {romano} · {clasificación}», ranura de acciones, «Requisitos de uso» (requisitos_uso: razas, mínimos y nivel mínimo en texto), `ReglasCreacion`, `HistoriaCodice`, `GrupoVinculos` titulado «La portan» (con `portadoresDe`), y las ranuras de presentación, estado y peligro.

- [ ] **Paso 1: pruebas que fallan.**
  - `tarot: anverso y reverso accesibles`: el HTML contiene `cx-tarot`, `aria-pressed="false"`, el romano de `arcanoDe(item.id)`, `Lectura` y `aria-hidden="true"` dentro del bloque `is-reverso`.
  - `tarot: lectura de acciones`: un fixture con la acción `{nombre:'Tajo',efecto:'dano',cantidad:2,caras:6,modificador:1,coste_ph:3}` contiene `Tajo`, `2d6` y `3 PH`, además de `Lanzar`.
  - `tarot: La portan`: si otro ítem la lista en `habilidades`, aparece `La portan` y su nombre.
- [ ] **Paso 2:** ejecuta las pruebas y comprueba que fallan.
- [ ] **Paso 3:** implementa la vista y el CSS.
- [ ] **Paso 4:** ejecuta las pruebas, `npx tsc --noEmit` y una comprobación visual en `/dm/forja` abriendo una habilidad a 390 px y en escritorio.
- [ ] **Paso 5: commit.** `git commit -m "feat(forja): las habilidades se leen como cartas de tarot"`.

---

### Tarea 6: códice de bestiario (monstruo)

**Archivos:**
- Crear: `components/codices/Bestiario.tsx`
- Modificar: `components/codices/VistaCodice.tsx`, `components/codices/codices.css`

**Interfaces:**
- Consume: `paginasBestiario`, `variantesBestiario`, `vinculosDe`, `GrupoVinculos`, `AtributosCodice`, `HistoriaCodice`, `ReglasCreacion` y `AccionesEfectos`.
- Produce: `export default function Bestiario<T>({ctx})` y `export function usePaginasLibro(total:number):{indice:number;porVista:1|2;ir:(n:number)=>void;siguiente:()=>void;anterior:()=>void;girando:null|'adelante'|'atras'}`.

**Comportamiento de `usePaginasLibro`:**
- `porVista` vale 2 si `matchMedia('(min-width: 900px)')` coincide y 1 en caso contrario. Se escucha el evento `change`. En el render inicial del servidor vale 1.
- `indice` es siempre la primera lámina visible. Con 2 por vista, se alinea a un número par.
- `siguiente` y `anterior` no hacen nada en los extremos (los botones se desactivan). `ir(n)` acota y alinea el valor.
- Pasar página: `girando` toma la dirección, se espera el `animationend` de la hoja y entonces se confirma el nuevo `indice`. Con movimiento reducido el cambio es inmediato, sin `girando`. Debe haber además un temporizador de seguridad de 800 ms por si `animationend` no llega.

**Estructura:**
- `.cx-libro` (cubierta de cuero `--cx-cuero`, lomo central con sombra) con `role="region"`, `aria-roledescription="libro"` y `aria-label="Bestiario: {nombre}"`. Es enfocable (`tabIndex={0}`) y ←/→ llaman a `anterior` y `siguiente`.
- Pliego: dos `.cx-pagina` (papel `--cx-papel`, texto en tinta `--color-ink` sobre pergamino; el contraste debe superar 4,5:1). Las láminas que no están en vista no se renderizan.
- Hoja que gira: mientras `girando` tiene valor, `.cx-hoja` se coloca sobre la mitad derecha (al avanzar) o la izquierda (al retroceder), con la cara frontal igual a la lámina saliente y la trasera igual a la entrante. La animación `cx-pasar` dura 650 ms y usa `rotateY`. En móvil (1 por vista) la hoja cubre toda la página y gira desde el borde izquierdo.
- Gesto táctil: `onPointerDown`/`onPointerUp` con un desplazamiento horizontal de más de 50 px y menos de 30 px de desplazamiento vertical llama a `siguiente` o `anterior`.
- Marcapáginas: cintas a la derecha del libro (en móvil, encima, en una fila con desplazamiento propio y sin desbordar la página), una por cada clave distinta (`Lámina`, `Anatomía`, `Variantes`, `Crónica`, `Ficha`). Cada una es un botón que llama a `ir()`. La activa lleva `aria-current="true"`.
- Pie: «Anterior», `<span aria-live="polite">Página {indice+1}{porVista===2&&indice+2<=total?`–${indice+2}`:''} de {total}</span>` y «Siguiente».
- Contenido de las láminas (según las decisiones de diseño):
  - `lamina`: retrato con un marco grabado (`Portada`), un `Sello` con la amenaza `{rango.clave} · {rango.nombre}`, y `AtributosCodice variante="rejilla"` con el título «Ficha de campo».
  - `anatomia`: `GrupoVinculos` con «Habilidades», «Pasivas» y «Equipo», solo con los vínculos de la base.
  - `variante`: título con el nombre de la variante, «Aparece {probabilidad}% de las veces», bonos con signo, enlaces a sus habilidades y pasivas, y la lista de equipo `{espacio}: {texto}`.
  - `cronica`: `HistoriaCodice` y `ReglasCreacion`.
  - `ficha`: `CabeceraCodice`, `AccionesEfectos` y las ranuras de acciones, formas, presentación, estado y peligro.
- La cabecera (nombre `h2`) está en la lámina `lamina`, porque el foco inicial va a `ctx.titulo` y la lámina 0 siempre se renderiza al abrir. **Importante:** `CabeceraCodice` lleva la ref y se coloca en `lamina`. En `ficha` se usa una cabecera sin ref (`h3`).

- [ ] **Paso 1: pruebas que fallan.**
  - `bestiario: portada y navegación`: un monstruo (`tipo:'bestia'`, `tipo_creacion:'personaje'`) con 2 variantes de pesos 1 y 3 contiene `aria-roledescription="libro"`, `Ficha de campo`, `Página 1`, `de 5` (lamina, variante, variante, cronica si tiene historia, ficha: ajusta el fixture para que sumen 5) y los marcapáginas `Lámina` y `Variantes`. El botón «Anterior» lleva `disabled`.
  - `bestiario: monstruo vacío`: sin variantes, stats, vínculos ni historia, contiene `de 2` y no contiene `Anatomía` ni `Variantes`.
  - `usePaginasLibro` (renderiza un componente de prueba que muestra `indice` y `porVista`): el render inicial da `0` y `1`.
- [ ] **Paso 2:** ejecuta las pruebas y comprueba que fallan.
- [ ] **Paso 3:** implementa la vista y el CSS (`@keyframes cx-pasar`, hoja, papel y cuero; con movimiento reducido, sin animación).
- [ ] **Paso 4:** ejecuta las pruebas y `npx tsc --noEmit`. Comprobación visual: abre un monstruo y pasa todas las páginas con el ratón, el teclado y el gesto táctil (`browser_resize` a 390 × 844). Comprueba que no hay desplazamiento horizontal: `document.documentElement.scrollWidth<=innerWidth`.
- [ ] **Paso 5: commit.** `git commit -m "feat(forja): los monstruos se leen en un bestiario paginado"`.

---

### Tarea 7: códices de reliquia, sello, edicto y pergamino

Esta tarea agrupa cuatro vistas porque son estáticas y comparten patrón. Si un revisor rechaza una de ellas, se corrige en esta misma tarea.

**Archivos:**
- Crear: `components/codices/Reliquia.tsx`, `components/codices/Sello.tsx`, `components/codices/Edicto.tsx`, `components/codices/Pergamino.tsx`
- Modificar: `components/codices/VistaCodice.tsx`, `components/codices/codices.css`

**Interfaces:**
- Consume: `espacioDe`, `portadoresDe`, `cadenaPasiva`, `formula`, `efectosDe`, `rangoDe`, las piezas comunes y `GrupoVinculos`.
- Produce: un componente por defecto por archivo, con la firma `({ctx}:{ctx:ContextoCodice<T>})`.

**Detalles que definen cada vista:**
- **Reliquia.** `.cx-vitrina`: cristal con `backdrop-filter` solo si `@supports` lo admite, pedestal con halo de color `--marco` y la `Portada`. Debajo, chips con `espacioDe(slot_tipo)` y «Consumible», y `AtributosCodice variante="placa"`, con el título «Inscripción». Si tiene acciones de daño, muestra la sección «Dados» con `formula`. Con `configuracion_artefacto?.niveles?.length`, muestra «Despertar del artefacto» como una `<ol>` vertical: cada nivel con su número, nombre, cambios de stats con signo y la condición en texto. Si `condicion_subida` es `null`, el texto es «Inicial». Con `tipo:'contador'`, el texto es `{meta} {contador}`. Con `tipo:'evento'` es `Al ocurrir: {evento}`. Si añade `cambios.descripcion`, se muestra debajo. Al final, «La portan».
- **Sello.** El SVG mide 220 × 220 (`viewBox="0 0 220 220"`). Lleva un círculo exterior con borde dentado (`stroke-dasharray`), un `<path id="cx-anillo-{id}">` circular de radio 88 con `<textPath>` que contiene `{NOMBRE} · {rango.nombre}` en mayúsculas Cinzel, e `IconoYugen` en el centro mediante `foreignObject`. Si `foreignObject` complica el renderizado estático, el icono se superpone con posición absoluta. El SVG lleva `role="img"` y `aria-label="Sello de {nombre}"`. A la derecha (debajo en móvil), «Ritual»: por cada regla pasiva, una `<ol className="cx-ritual">` con un `<li data-paso={tipo}>` por paso (iconos lucide: `Zap` para evento, `GitBranch` para condición y `Sparkles` para efecto), unidos por una línea de oro (`::before`). Al abrir se aplica la animación `cx-sellar` de 400 ms, una sola vez.
- **Edicto.** `.cx-estandarte`: columna de 160 px con `clip-path: polygon(0 0,100% 0,100% 100%,50% 88%,0 100%)`, fondo `--tinte`, borde `--marco`, la `Portada` circular y el nombre en vertical (`writing-mode: vertical-rl` solo en escritorio). `.cx-proclama`: papel con «Por decreto de Kuroi» como eyebrow, descripción e historia con `::first-letter` capitular de 3 líneas, y `AtributosCodice variante="heraldica"` (escudos con `clip-path` de blasón y el bono con signo).
- **Pergamino.** `.cx-rollo`: varillas arriba y abajo hechas con pseudoelementos degradados. Dentro van la cabecera, los atributos, las acciones, las reglas, la historia y los vínculos.
- Todas las vistas colocan las cinco ranuras.

- [ ] **Paso 1: pruebas que fallan** (una por vista):
  - `reliquia`: un objeto con `slot_tipo:'casco'`, `consumible:true` y `configuracion_artefacto:{niveles:[{nivel:1,nombre:'Despertar',condicion_subida:null,cambios:{}},{nivel:2,nombre:'Hambre',condicion_subida:{tipo:'contador',contador:'armas devoradas',meta:4},cambios:{stats:{dano:2}}}]}` contiene `Cabeza`, `Consumible`, `Despertar del artefacto`, `Inicial`, `4 armas devoradas` y `dano +2`.
  - `sello`: una pasiva con una regla pasiva `recibir_dano/vida_mitad/reduccion_pct:20` contiene `role="img"`, `<textPath`, `Ritual`, `Al recibir daño`, `Vida a la mitad` y `Reduce 20% de daño`.
  - `edicto`: un título con `stats:{fuerza:2}` contiene `Por decreto de Kuroi` y `+2`.
  - `pergamino`: un ítem `otro` contiene `cx-rollo` y su nombre en un `h2`.
- [ ] **Paso 2:** ejecuta las pruebas y comprueba que fallan.
- [ ] **Paso 3:** implementa las vistas y el CSS.
- [ ] **Paso 4:** ejecuta las pruebas, `npx tsc --noEmit` y la comprobación visual de las cuatro vistas a 390 px y en escritorio.
- [ ] **Paso 5: commit.** `git commit -m "feat(forja): reliquias, sellos, edictos y pergaminos"`.

---

### Tarea 8: códice de expediente (personaje)

**Archivos:**
- Crear: `components/codices/Expediente.tsx`
- Modificar: `components/codices/VistaCodice.tsx` (aquí desaparece `Clasica`; el caso por defecto pasa a ser `Pergamino`), `components/codices/codices.css`

**Interfaces:**
- Consume: `Marco` y `Medallon` de `components/ui/Juego.tsx`, `SLOTS`, `vinculosDe`, `MiniTarot`, `MiniSello`, `MiniReliquia` y las piezas comunes.
- Produce: `export default function Expediente<T>({ctx})`.

**Estructura:**
- Columna izquierda (`position: sticky` en escritorio): `Marco` con la `Portada` en 3:4, un `Sello` con el rango, la ranura de formas (el selector de forma, con la clase de Tailwind sustituida por `cx-select`) y la ranura de presentación.
- Columna derecha: `CabeceraCodice` con el eyebrow «Expediente · {clasificación}» y la ranura de acciones. Después, «Atributos» con `AtributosCodice variante="medallones"`, que usa `Medallon` y como máximo 10. Si hay más, el resto va en una lista compacta, para no repetir los datos.
- «Grimorio»: las mini cartas de tarot de `item.habilidades`, en abanico (`rotate` según `--k` y como máximo ±18°). Al pasar el cursor o al enfocar se abren. En móvil se muestran en una fila con desplazamiento horizontal interno (`overflow-x:auto` en el contenedor, nunca en la página).
- «Arsenal»: una rejilla con forma de muñeco de 3 columnas (cabeza y capa arriba; mano derecha, torso y mano izquierda; piernas; botas; accesorios en una fila abajo). Cada espacio usa `SLOTS[].nombre` como etiqueta. Un espacio ocupado contiene `MiniReliquia`. Uno vacío muestra un guion con `aria-label="{espacio}: vacío"`. Si un arma de `dos_manos` está en `mano_der`, ocupa ambas manos visualmente.
- «Pasivas»: `MiniSello` de cada id de `item.pasivas`.
- «Vínculo de naturaleza»: solo si `naturaleza_vinculo` tiene `bestia`, `sello` u `origen` no vacíos. Muestra esos tres campos y las notas.
- «Invocación»: solo si `configuracion_invocacion?.plantilla`. Muestra el nombre de la plantilla y sus stats.
- `AccionesEfectos`, `ReglasCreacion`, `HistoriaCodice` y las ranuras de estado y peligro.

- [ ] **Paso 1: pruebas que fallan.**
  - `expediente`: un personaje con `habilidades:['h']`, `pasivas:['p']`, `equipamiento:{casco:'o'}` y stats de 3 atributos contiene `Grimorio`, `Arsenal`, `Cabeza`, `Mano derecha: vacío`, `cx-mini-tarot`, `cx-mini-sello` y `cx-mini-reliquia`, además de los textos de las acciones de la Tarea 3.
  - `la vista clásica ya no existe`: el código fuente de `VistaCodice.tsx` no contiene `Clasica`. Para un tipo desconocido, el HTML contiene `cx-rollo`.
- [ ] **Paso 2:** ejecuta las pruebas y comprueba que fallan.
- [ ] **Paso 3:** implementa la vista y el CSS.
- [ ] **Paso 4:** ejecuta las pruebas, `npx tsc --noEmit` y la comprobación visual de «Axel Kuro» (la captura de referencia).
- [ ] **Paso 5: commit.** `git commit -m "feat(forja): los personajes se leen como expedientes de héroe"`.

---

### Tarea 9: rastro de navegación entre códices

**Archivos:**
- Modificar: `components/GaleriaCreacion.tsx`, `components/codices/VistaCodice.tsx`

**Interfaces:**
- Consume: `avanzarRastro` y `Rastro`.
- Cambios en la galería: `seleccion: string|null` se sustituye por `rastro: string[]`, y `seleccionada` es el último elemento. `abrir(id)` llama a `setRastro(r=>avanzarRastro(r,id))`. `volver()` vacía el rastro y devuelve el foco como hoy. `irA(i)` recorta el rastro a `slice(0,i+1)`. A `VistaCodice` se le pasan `rastro` e `irA`, y esta coloca `<Rastro>` junto a «Volver a la colección». Las migas también pasan por `navegar` (confirmación de cambios sin guardar).
- `key={seleccionada.id}` se mantiene, para que al cambiar de creación se reinicie el estado de presentación y el foco vuelva al nuevo `h2`.
- Al cambiar de creación se ejecuta `window.scrollTo({top: <posición del contenedor>, behavior: reducido ? 'auto' : 'smooth'})`.

- [ ] **Paso 1: prueba que falla.** `rastro`: renderiza `VistaCodice` con `rastro=['a','b']` (items a y b) y comprueba que contiene `aria-label="Rastro de creaciones"`, el nombre de a como botón y el nombre de b con `aria-current="page"`.
- [ ] **Paso 2:** ejecuta la prueba y comprueba que falla.
- [ ] **Paso 3:** implementa los cambios.
- [ ] **Paso 4: verificación de extremo a extremo con Playwright** (`npm run dev`, inicia sesión como GM con las credenciales de desarrollo que te dé el propietario; no las inventes):
  1. Abre un monstruo, ve a «Anatomía», pulsa una habilidad (se abre el tarot), pulsa en «La portan» el monstruo (el rastro vuelve a tener 2 elementos, sin duplicados).
  2. Abre «Elegir imagen o icono», escribe una URL y, sin guardar, pulsa una miga. Debe aparecer el diálogo «Imagen sin guardar». Pulsa «Seguir editando» y comprueba que la URL sigue ahí.
  3. Activa `browser_emulate_media` con `reducedMotion:'reduce'`, voltea la carta y pasa la página: el cambio es inmediato.
  4. A 390 × 844 px, en cada códice, comprueba que `document.documentElement.scrollWidth<=innerWidth`.
  5. Revisa que no aparecen errores en `browser_console_messages`.
- [ ] **Paso 5: commit.** `git commit -m "feat(forja): rastro para recorrer creaciones enlazadas"`.

---

### Tarea 10: documentación y verificación final

**Archivos:**
- Modificar: `design.md` (§5: añade «Códices de La creación» con las cinco animaciones y sus duraciones exactas; §7: «Forja: códices hechos»), `docs/galeria-creacion.md` (nuevo apartado «Códices» con la tabla de metáforas, el rastro y la verificación), `public/arte/README.md` (sección «Códices (opcional)» con los tres archivos de 512 px).

- [ ] **Paso 1:** escribe la documentación. Debe estar en español, en prosa breve y con el mismo estilo que los documentos que ya existen.
- [ ] **Paso 2: verificación completa.** Ejecuta `npm test`, `node --test tests/codices.test.mjs tests/codices-render.test.mjs tests/forja-visual.test.mjs tests/cartas.test.mjs tests/imagenes-creacion.test.mjs`, `npx tsc --noEmit`, `npm run lint` y `npm run build`. Resultado esperado: todo pasa sin errores nuevos. Si `build` necesita las variables públicas de Supabase y no están disponibles, dilo explícitamente en el informe; no lo des por superado.
- [ ] **Paso 3:** haz capturas (`deviceScaleFactor: 2`) de los siete códices en escritorio y a 390 px en `docs/capturas/codices/`, solo si el propietario lo pide. Si no lo pide, adjúntalas al informe final.
- [ ] **Paso 4: commit.** `git commit -m "docs(forja): códices de La creación"`.

---

## Autorrevisión

- **Cobertura:** bestiario (T6), tarot (T5), diseño propio para cada tipo (T5–T8), combinación de los códices (T4 miniaturas, T9 rastro, `portadoresDe` en T1), interactividad (voltear, pasar página, inclinación, abanico, tirada) y conservación de todas las acciones (T3, cuyas pruebas se repiten en T8). No queda ningún requisito sin tarea.
- **Coherencia de nombres:** `ContextoCodice`, `PropsGaleria`, `codiceDe`, `vinculosDe`, `portadoresDe`, `avanzarRastro`, `cadenaPasiva`, `espacioDe`, `tirarPrueba`, `paginasBestiario`, `variantesBestiario` y `usePaginasLibro` se definen en T1–T3/T6 y se usan con la misma firma en el resto de tareas.
- **Riesgos conocidos:** (1) `useDialogo` lanza un error sin su proveedor, y el arnés de T2 lo envuelve. (2) `matchMedia` no existe en el renderizado estático, así que todos los usos van dentro de `useEffect`. (3) Si el `foreignObject` del sello falla en Safari, el icono se superpone con posición absoluta (T7). (4) El papel claro del bestiario y de los edictos exige texto `--color-ink`, nunca `--color-text`. Compruébalo con el contraste del navegador.
