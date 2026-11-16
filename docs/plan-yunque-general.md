> **Estado al 16-11-2026**
> - **Hecho · primitiva «Reacción» (fases 1-2):** tipo `Reaccion` en `lib/creacion.ts` con validación (`validarReaccion`); ejecutor genérico en `recibir()` de `lib/combate.ts`. Las cinco defensas de Kion (Inercia, Absorción, Recíproco, Ancla, Reflejo) ya no están programadas: son datos (`PLANTILLAS_REACCION`). Regresión: 1.344 combinaciones idénticas al motor anterior (`tests/reacciones-kion.test.mjs`, referencia generada antes de migrar) y 6 pruebas con reacciones inventadas (`tests/reacciones.test.mjs`).
> - **Hecho · Grimorio, primer bloque (fase 3):** sección «Reacción al recibir un golpe» en cada acción del Yunque, con frase en vivo y plantillas de Kion (`components/EditorReaccion.tsx`).
> - **Verificado · jugador inmortal:** a 0 de vida queda inconsciente; solo el GM registra la muerte o borra el personaje (`tests/inmortal.test.mjs`).
> - **Bloqueado · fase 0:** faltan las 20 mecánicas de la mesa (pregunta abierta 1).
> - **Pendiente:** primitivas 1, 3–14 (disparador «observar», vínculo, cadena, zona, reserva gastable, umbral, inmunidad, copia, percepción, eliminación, capa/portal, al caer configurable, movimiento), resto del grimorio, medición 16/20 y prueba final con Kion (vuelo y movimiento).

# Plan: Yunque general (crear mecánicas por combinación, sin programar cada una)

Reemplaza y amplía a `plan-forja-efectos-libres.md`. El rediseño visual sigue en su propio plan.

## Contexto

La Forja ya tiene piezas útiles (estampida, empuje y atracción, área, vuelo, portal, transformaciones). Pero algunas mecánicas siguen programadas a mano, como las defensas de Kion en `lib/combate.ts` (~líneas 505–532). El objetivo es un **Yunque general**: el GM combina primitivas y crea casi cualquier mecánica, incluidas las que hoy requieren código.

## Decisiones tomadas

- **Kion es la prueba de fuego.** Se usa como caso de prueba, no como caso especial. Su vuelo y su movimiento mejorado (Paso Inercial, Vuelo Inercial, Supervelocidad Simulada) se incluyen en la fase final para comprobar si el Yunque ya puede crear casi cualquier cosa.
- **Jugador inmortal:** al llegar a 0 de vida queda **inconsciente**, no muere. Su personaje **nunca se borra** salvo que el GM lo elimine directamente.
- **Habilidades visuales que otorgan cosas:** no es el Sharingan literal. Se trata de habilidades de percepción o de ojos que, al mirar o al observar, **conceden efectos**: revelar información oculta, dar ventaja, copiar o aplicar un estado o un bono. Un «ojo» es un disparador de tipo observación.

## Primitivas del Yunque (vocabulario)

1. **Disparador:** recibir o causar daño, impactar, fallar, iniciar o terminar turno, caer, equipar o desequipar, observar un objetivo, usar una acción.
2. **Reacción:** interceptar, reducir, devolver, transmitir o redirigir un impacto. Sustituye las defensas programadas de Kion.
3. **Vínculo:** enlazar dos o más personajes y repartir un efecto (Talión, Reciprocidad Forzada).
4. **Cadena:** repetir un efecto a nuevos objetivos hasta un límite de saltos (Repercusión, Segundo Impacto).
5. **Zona:** área con duración y efecto por turno (Cronosfera, Cero Absoluto).
6. **Reserva:** capturar un recurso (daño absorbido, energía del entorno) y gastarlo después.
7. **Umbral:** condición de vida o recurso (Cosecha Oscura, al 20 %).
8. **Inmunidad:** bloquear familias de efectos (desplazamiento, estados, daño).
9. **Copia:** aprender una técnica observada con tirada (Comprensión Arcana, +15).
10. **Percepción o visión:** al observar, revelar, dar ventaja o aplicar un efecto. Cubre las habilidades visuales.
11. **Eliminación:** efecto final que ignora la vida (Exclusión).
12. **Capa o portal:** mover entre capas o puntos (volar, bucear, desterrar).
13. **Al caer:** qué pasa a 0 de vida. Por defecto: inconsciente. Opciones: revivir, quedar en pie con condición, o morir solo por decisión del GM.
14. **Movimiento:** desplazarse de forma distinta (paso instantáneo, aceleración, vuelo). Reutiliza `desplazar` y las capas.

Lo que ya existe se reutiliza: estampida, empuje, atracción, área por origen, transformaciones por etapas, equipar, portal.

## Fases

0. **Inventario de mecánicas del GM**: 20 mecánicas reales, sin Kion, para medir cobertura.
1. **Vocabulario**: tipos nuevos en `lib/reglas.ts`, validación y pruebas unitarias.
2. **Motor**: implementar las primitivas en `lib/combate.ts`. Migrar las defensas de Kion a la primitiva «Reacción» y comprobar que el resultado no cambia (pruebas existentes).
3. **Grimorio en la Forja**: tarjetas agrupadas por familia, frase en vivo y plantillas.
4. **Medición sin código nuevo**: las 20 mecánicas del inventario. Meta: 16 de 20.
5. **Prueba final con Kion**: vuelo, movimiento mejorado, Moneda Aberrante con rebotes, Martillo y Yunque, Recíproco. Y el jugador inmortal con su regla de inconsciencia. Si Kion se expresa sin código nuevo, el Yunque está listo.
6. **Sensación de juego**: animaciones y sellos, con reduced-motion.

## Archivos críticos

- `lib/reglas.ts`: tipos de disparador, efecto y validación.
- `lib/combate.ts`: defensas (~505–532), `desplazar` (~1754), áreas y estampida (~1084–1114), portal y vuelo.
- `lib/creacion.ts`: tipo `Efecto`.
- `lib/transformaciones.ts`: formas.
- `components/EditorPasivas.tsx`, `components/EditorReglas.tsx`, `components/LaboratorioReglas.tsx`: base del grimorio.
- Pruebas: `tests/*.test.mjs`, `tests/reglas-database.mjs`.

## Verificación

- Pruebas unitarias por primitiva y por combinación.
- Regresión: las defensas de Kion dan el mismo resultado tras migrar.
- Inmortal: a 0 de vida queda inconsciente, no se borra, y solo el GM puede eliminarlo.
- Kion de prueba (fase 5) sin código nuevo.
- Playwright en la Forja a 390 px y escritorio.

## Preguntas abiertas

1. ¿Me pasas las 20 mecánicas de tu mesa?
2. «Otra dimensión»: ¿zona de espera que regresa a un punto, o mapa propio?
