# YUNQUE - UNA MÁS · Plan paso a paso

> **Estado (23-11-2026):** ejecutado. Problemas menores pendientes en [pendientes-yunque-una-mas.md](../pendientes-yunque-una-mas.md).

Tres trabajos en un solo plan:

- **Parte 1 · Menús en pantalla:** eliminar `window.confirm`, `window.alert` y `window.prompt`.
- **Parte 2 · Reacciones generales:** cualquier creación configura reacciones; Kion pasa a ser solo plantillas.
- **Parte 3 · Artefactos con nivel (Mao):** forma por portador, absorción por tramos, voces de demonio y espejo mental.

Orden obligatorio: Parte 1 → Parte 2 → Parte 3. La Parte 2 necesita los menús de la Parte 1 para mostrar la oferta de reacción. La Parte 3 necesita las reacciones generales.

Cada paso indica: **archivos**, **qué hacer**, **prueba** y **criterio de salida**. No se pasa al siguiente paso hasta cumplir el criterio.

Comandos de verificación del repositorio:

- `node --test tests/*.test.mjs` (pruebas unitarias).
- `node tests/<nombre>-database.mjs` (pruebas de base de datos con PGlite, cuando aplique).
- `npm run build` (compilación y TypeScript).
- Navegador con Playwright a **390 px** y a escritorio, con el servidor de desarrollo en marcha.

---

## Diagnóstico de partida (23-11)

| Hallazgo | Ubicación |
|---|---|
| Cinco defensas de Kion como constante del motor | `lib/combate.ts:506-515` (`PLANTILLAS_REACCION`) |
| `Efecto.defensa` es un enum cerrado a esas cinco claves | `lib/creacion.ts` (tipo `Efecto`) |
| Dos caminos de activación: `defensa` antiguo y `reaccion` nuevo | `lib/combate.ts:516` (`reaccionDe`) |
| Oferta de reacción con diálogo del navegador | `components/yunque/ArenaDolls.tsx:188` |
| El motor pregunta al RNG si el defensor usa la reacción | `lib/combate.ts:539-549`, `:1425`, `:1571` |
| Nombres de Kion escritos a mano en el Yunque | `lib/yunque-plantillas.ts:17-27`, `components/EditorReaccion.tsx:6` |
| Unas 35 llamadas a `window.confirm`/`window.alert` | `app/dm/*`, `app/ficha/*`, `app/login/page.tsx`, `components/*` |

---

## PARTE 1 · Menús en pantalla

### Paso 1.1 · Crear el componente `Dialogo`

- **Archivos nuevos:** `components/Dialogo.tsx`, `components/dialogo.css` (o clases en el CSS existente de `design.md`).
- **Qué hacer:**
  1. Exportar `DialogoProvider` y el hook `useDialogo()` con dos funciones:
     - `confirmar({titulo, mensaje, aceptar, cancelar, peligro?}) → Promise<boolean>`
     - `avisar({titulo, mensaje, aceptar?}) → Promise<void>`
  2. Renderizar un panel centrado con superposición. Al abrirse: el foco va al botón de aceptar; Tab queda dentro del panel; Esc cancela; clic fuera cancela.
  3. Botón de peligro en rojo para borrados (`peligro: true`).
  4. Tokens de color y tipografía de `design.md` (Cinzel para el título). Sin dependencias nuevas.
  5. Animación solo con `transform` y `opacity`, y desactivada con `prefers-reduced-motion`.
- **Prueba:** `tests/dialogo.test.mjs` comprueba que `confirmar` resuelve `true` al aceptar, `false` al cancelar y `false` al pulsar Esc.
- **Criterio de salida:** la prueba pasa y el componente compila (`npm run build`).

### Paso 1.2 · Montar el proveedor en la raíz

- **Archivos:** `app/layout.tsx`.
- **Qué hacer:** envolver la aplicación en `DialogoProvider`. Sin cambios visuales en las páginas.
- **Criterio de salida:** `npm run build` pasa; ninguna página cambia de aspecto.

### Paso 1.3 · Migrar por tandas

Migrar cada llamada a `await confirmar(...)` o `await avisar(...)`. Cada tanda es un commit separado.

| Tanda | Archivos | Llamadas aprox. |
|---|---|---|
| 1 · DM | `app/dm/combate/page.tsx`, `app/dm/forja/page.tsx`, `app/dm/deudas/page.tsx`, `app/dm/clanes/page.tsx`, `app/dm/reglas/page.tsx`, `app/dm/personajes/page.tsx`, `app/dm/layout.tsx` | ~14 |
| 2 · Combate y Yunque | `components/yunque/ArenaDolls.tsx` (solo la línea 188 de la reacción; el resto llega en la Parte 2), `components/Party.tsx` | ~3 |
| 3 · Ficha y acceso | `app/ficha/personajes/page.tsx`, `app/ficha/deudas/page.tsx`, `app/login/page.tsx`, `components/AccesoReencarnado.tsx` | ~6 |
| 4 · Resto | `components/Tienda.tsx`, `components/ArbolHabilidades.tsx`, `components/GaleriaCreacion.tsx`, `components/BaulAlma.tsx`, `components/NaturalezasYugen.tsx`, `components/RevisionRazasUnicas.tsx`, `components/ColeccionTitulos.tsx`, `components/PasivaRacial.tsx` | ~10 |

- **Por cada tanda:** la función que llama al diálogo pasa a ser `async`. Si el `onClick` era síncrono, usar `void (async () => {...})()`. Conservar el texto de cada mensaje.
- **Prueba:** `npm run build` y revisión manual de la acción en navegador (ver paso 1.5).
- **Criterio de salida por tanda:** la acción funciona igual que antes, pero con panel en pantalla.

### Paso 1.4 · Prueba que impide volver a usar diálogos del navegador

- **Archivo:** `tests/sin-dialogos-nativos.test.mjs`.
- **Qué hacer:** recorrer `app/` y `components/`, y fallar si aparece `window.confirm(`, `window.alert(`, `window.prompt(`, `confirm(` o `alert(` sin prefijo de objeto. Excluir `components/Dialogo.tsx`.
- **Criterio de salida:** la prueba pasa solo cuando la tanda 4 está terminada.

### Paso 1.5 · Comprobación en navegador

- **Herramienta:** Playwright (Chromium ya instalado; no ejecutar `playwright install`).
- **Escenarios:** borrar una creación desde la Forja (confirmar y cancelar); aprender una habilidad en el árbol; retirar una oferta de la tienda.
- **Dispositivos:** escritorio y 390 px. Sin scroll horizontal.
- **Criterio de salida:** los tres escenarios funcionan en ambos tamaños. Los resultados se anotan en `docs/metricas/` con capturas a `deviceScaleFactor: 2`.

---

## PARTE 2 · Reacciones generales

### Paso 2.1 · Vocabulario de la reacción (tipos)

- **Archivos:** `lib/creacion.ts` (tipo `Reaccion`, `ResultadoReaccion`, `validarReaccion`).
- **Qué hacer:**
  1. Añadir `disparador` con los valores: `antes_ser_atacado`, `despues_ser_atacado`, `tras_fallar_ataque`, `tras_fallar_prueba`, `aliado_atacado`, `aliado_ataca`, `aliado_cae`, `apuntado_por_area`, `fin_de_turno`.
  2. Añadir resultados: `repetir_tirada`, `contraatacar`, `interponerse`. Los existentes (`reducir`, `reservar`, `devolver`, `animacion`, `salvacion`) se mantienen.
  3. Añadir `coste` (PH) y `usos` (`{tipo: 'encuentro' | 'turno' | 'ilimitado', maximo}`) y `enfriamiento`.
  4. `validarReaccion` rechaza combinaciones que el motor no sabe resolver (por ejemplo, `repetir_tirada` con disparador `aliado_ataca`).
- **Prueba:** `tests/reacciones-vocabulario.test.mjs` con combinaciones válidas e inválidas.
- **Criterio de salida:** la prueba pasa; los datos antiguos siguen validando.

### Paso 2.2 · Eliminar los nombres de Kion del motor

- **Archivos:** `lib/combate.ts` (líneas 506–515), `lib/yunque-plantillas.ts`.
- **Qué hacer:**
  1. Mover `PLANTILLAS_REACCION` a `lib/yunque-plantillas.ts` como datos de plantilla, sin referencias a Kion en el motor.
  2. `lib/combate.ts` no exporta nada llamado `inercia`, `absorcion`, `reflejo`, `reciproco` ni `ancla`.
  3. Mantener los nombres de Kion solo como nombres de plantilla en `yunque-plantillas.ts`.
- **Prueba:** `tests/reacciones-kion.test.mjs` (1.344 combinaciones) debe dar el mismo resultado que la referencia guardada.
- **Criterio de salida:** regresión idéntica; `grep` de los cinco nombres en `lib/combate.ts` no devuelve nada.

### Paso 2.3 · Migrar `defensa` a `reaccion`

- **Archivos:** `lib/creacion.ts` (carga), `lib/combate.ts` (`reaccionDe`).
- **Qué hacer:**
  1. Función `normalizarReaccion(efecto)` que convierte `efecto.defensa` a `efecto.reaccion` usando la plantilla correspondiente. Se ejecuta al **cargar** una creación, sin escribir en la base de datos.
  2. Eliminar la rama `defensa` de `reaccionDe`. Desde aquí, solo se lee `reaccion`.
- **Prueba:** `tests/reacciones-migracion.test.mjs`: una creación con `defensa: 'absorcion'` produce la misma reacción que antes y no se guarda.
- **Criterio de salida:** los combates en curso no cambian; no hay escritura nueva a la base.

### Paso 2.4 · Un solo camino de activación

- **Archivos:** `lib/combate.ts` (`recibir`, líneas 517–560 aprox.; y los puntos de `consultarReaccion` en `:1425` y `:1571`).
- **Qué hacer:**
  1. Crear `evaluarReacciones(combate, evento, contexto)` que devuelve las ofertas aplicables para el disparador dado.
  2. `recibir` llama a `evaluarReacciones` con `despues_ser_atacado` y `antes_ser_atacado`.
  3. Los demás disparadores (fallo propio, aliado atacado, aliado ataca, aliado cae, área, fin de turno) se conectan en su punto natural del motor.
  4. Cada oferta pasa por `rng.consultarReaccion` como hoy, pero el RNG ya no responde con diálogos: ver paso 2.6.
- **Prueba:** `tests/reacciones-disparadores.test.mjs`: una reacción de cada disparador se activa en el momento correcto y no en otro.
- **Criterio de salida:** las 9 combinaciones de disparador tienen prueba.

### Paso 2.5 · Coste y usos en el motor

- **Archivos:** `lib/combate.ts`, `lib/combate.ts` (estado del combatiente).
- **Qué hacer:**
  1. Descontar PH al activar. Si no alcanza, la oferta no aparece.
  2. Llevar el contador de usos por encuentro o por turno en el estado del combatiente.
  3. Aplicar enfriamiento tras cada uso.
- **Prueba:** `tests/reacciones-coste.test.mjs`: sin PH no se ofrece; el uso número 2 de una reacción de un solo uso no se ofrece; el enfriamiento bloquea la siguiente activación.
- **Criterio de salida:** la prueba pasa.

### Paso 2.6 · Menú de decisión en pantalla

- **Archivos:** `components/yunque/ArenaDolls.tsx` (línea 188), `app/ficha/combate/page.tsx`, `components/MenuReaccion.tsx` (nuevo), `lib/yunque-arena.ts`.
- **Qué hacer:**
  1. Reemplazar `window.confirm` por `MenuReaccion`, que muestra: nombre, disparador, coste en PH, usos restantes y enfriamiento. Botones: «Usar» y «No usar».
  2. El menú aparece en la pantalla del defensor. El atacante ve «Esperando a <nombre>» mientras se decide.
  3. Pendiente de la decisión del GM: si el ataque espera la decisión o se resuelve después (ver preguntas abiertas del plan).
- **Prueba:** Playwright: aparece el menú con el coste correcto; «No usar» continúa el combate; «Usar» aplica el efecto.
- **Criterio de salida:** escritorio y 390 px sin scroll horizontal.

### Paso 2.7 · Siempre visible: coste y usos

- **Archivos:** `components/EditorReaccion.tsx`, `components/yunque/NodoYunque.tsx`, `components/yunque/CajonFicha.tsx`, ficha del combatiente.
- **Qué hacer:** cada reacción muestra coste en PH, usos y enfriamiento. Si no tiene coste ni usos, muestra «Sin coste». La misma frase aparece en la tarjeta del Yunque, en el menú de decisión y en la ficha.
- **Prueba:** `tests/reacciones-descripcion.test.mjs` comprueba la frase generada para cada caso.
- **Criterio de salida:** ninguna reacción aparece sin esa línea.

### Paso 2.8 · Editor general

- **Archivos:** `components/EditorReaccion.tsx`, `components/yunque/editores/EditorModulo.tsx`.
- **Qué hacer:**
  1. Quitar las etiquetas de Kion. Usar nombres neutros: «Disparador», «Naturaleza», «Reducción», «Devolver», «Coste», «Usos».
  2. Mostrar solo los campos que el disparador elegido permite (por ejemplo, «Repetir tirada» solo aparece con `tras_fallar_ataque` o `tras_fallar_prueba`).
  3. Vista previa en lenguaje claro, que usa la misma frase del paso 2.7.
  4. Las plantillas de Kion siguen disponibles en el grimorio, con el nombre «(plantilla)».
- **Prueba:** Playwright en el Yunque: crear una reacción inventada con disparador `aliado_atacado`, guardarla y ver su frase.
- **Criterio de salida:** la reacción inventada aparece en combate y se activa.

### Paso 2.9 · Verificación final de la Parte 2

- `node --test tests/*.test.mjs` completo.
- Combate de prueba: Kion (regresión) y una reacción inventada de cada disparador.
- **Criterio de salida:** ambas cosas pasan. Se documenta en `docs/metricas/` con el resultado real.

---

## PARTE 3 · Artefactos con nivel (Mao)

### Paso 3.1 · Creación «Artefacto» con niveles

- **Archivos:** `lib/creacion.ts` (tipo `TipoCreacion`), `lib/yunque-borrador.ts`, `components/yunque/TallerYunque.tsx`.
- **Qué hacer:**
  1. Nuevo tipo `artefacto` con `niveles: [{nivel, nombre, condicion_subida, cambios}]`.
  2. `condicion_subida` puede ser un contador (por ejemplo, armas devoradas) o un evento.
  3. El Yunque permite editar los niveles en lista.
- **Prueba:** `tests/artefactos-niveles.test.mjs`: validación de niveles, orden y condiciones.
- **Criterio de salida:** se puede crear un artefacto de dos niveles y guardarlo.

### Paso 3.2 · Forma por portador (d100)

- **Archivos nuevos:** `supabase/migrations/<fecha>_portadores_artefacto.sql`, `tests/portadores-artefacto-database.mjs`.
- **Qué hacer:**
  1. Tabla `portadores_artefacto(artefacto_id, personaje_id, forma_tirada, nivel, absorbidas jsonb)` con clave única (artefacto, personaje).
  2. Políticas RLS: el GM lee y escribe; el jugador solo lee su propio personaje.
  3. Al primer portador se tira d100 y se guarda el resultado. Los siguientes portadores tiran de nuevo; el mismo portador recupera su forma.
  4. La tabla de formas es una tabla de 100 filas en el Yunque, editable en lista con búsqueda.
- **Prueba:** PGlite: migración idempotente, RLS por identidad, clave única.
- **Criterio de salida:** dos portadores distintos reciben formas distintas; el mismo portador recupera la suya.

### Paso 3.3 · Absorción por tramos

- **Archivos:** `lib/artefactos.ts` (nuevo), `components/yunque/editores/EditorModulo.tsx`.
- **Qué hacer:** la tirada d100 elige el tramo. Seis tramos editables en el Yunque:
  - 01–30 una estadística.
  - 31–45 dos o tres estadísticas.
  - 46–60 una habilidad.
  - 61–75 una habilidad y una estadística.
  - 76–90 una habilidad y varias estadísticas.
  - 91–100 set completo (estadísticas, habilidades y pasivas).
- **Prueba:** `tests/artefactos-absorcion.test.mjs` con cada tramo y con un rango que cruza dos tramos.
- **Criterio de salida:** los seis tramos producen lo esperado.

### Paso 3.4 · Voces de demonio

- **Archivos:** `lib/artefactos-voces.ts` (nuevo), `components/yunque/editores/EditorModulo.tsx`, `components/MenuVoz.tsx` (nuevo).
- **Qué hacer:**
  1. Al tomar el arma: salvación de Voluntad con CD configurable.
  2. Si falla, el GM asigna una voz: pregunta (el portador responde en un menú), comentario (solo texto) o negativa de habilidad (el portador puede repetir la prueba una vez por encuentro).
  3. Duración configurable (por defecto tres turnos).
  4. El control lo decide el GM, no las tiradas. Se usa el estado Dominado existente.
- **Prueba:** `tests/artefactos-voces.test.mjs`: salvación, duración, repetición única por encuentro.
- **Criterio de salida:** cada voz se activa y expira según su configuración.

### Paso 3.5 · Espejo mental

- **Archivos:** `lib/combate.ts` (estado), `components/yunque/ArenaDolls.tsx` y vistas de tablero del jugador (proyección).
- **Qué hacer:**
  1. Estado «Espejo mental» con tres opciones combinables: espejar tablero, intercambiar bandos, ocultar nombres.
  2. La proyección se aplica solo en la vista del jugador afectado. Los demás jugadores y el GM ven el tablero real.
  3. Las acciones envían identificadores reales. El registro guarda el objetivo verdadero.
  4. Salvación al inicio de cada turno para cortar el efecto.
  5. Aviso en primera persona («Tu mente se confunde») al empezar.
  6. Configuración opcional de confirmación antes de atacar a alguien que el jugador ve como enemigo (desactivada por defecto).
- **Prueba:** `tests/espejo-mental.test.mjs`: la proyección no altera el estado; el objetivo enviado es el real; el registro lo muestra. Playwright: aviso visible.
- **Criterio de salida:** el jugador ataca a un aliado disfrazado y el registro muestra al aliado real.

### Paso 3.6 · Prueba de aceptación con Mao

- Crear Mao en el Yunque **sin código nuevo**.
- Verificar: dos portadores con formas distintas; los seis tramos; una voz que falle; un espejo mental que produzca un ataque a un aliado y quede en el registro.
- **Criterio de salida:** los cuatro puntos pasan en partida de prueba, con resultados anotados en `docs/metricas/`.

---

## Riesgos

- **Migrar `defensa` a `reaccion`** puede afectar combates en curso. Se hace al cargar, sin escribir en la base.
- **Espejo mental** cambia lo que ve el jugador. La verdad sigue en el servidor. No se aplica al registro ni a la vista del GM.
- **35 llamadas a diálogos:** se migran por tandas para no romper varias pantallas a la vez.
- **Tabla de 100 formas:** la edición en lista debe funcionar a 390 px.

## Preguntas abiertas

1. Cuando una reacción se ofrece al defensor, ¿el ataque espera la decisión o se resuelve después del golpe? (Recomiendo esperar la decisión.)
2. ¿El menú de reacción muestra el coste antes de confirmar? (Recomiendo sí.)
