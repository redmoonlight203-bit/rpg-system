# Conceptos básicos configurables · verificación global (23-11-2026)

Plan: [planes/plan-conceptos-basicos-configurables-maestro.md](../planes/plan-conceptos-basicos-configurables-maestro.md).
Rama: `claude/sweet-volta-djx6me` (base `main`, PR #56).

## Resultados reales

| Comprobación | Resultado |
|---|---|
| `npm test` (motor, Yunque, Kion, reacciones, Edge) | 643/643 (566 antes del plan; 77 pruebas nuevas) |
| `npm run test:database` (PGlite, incluye `esqueletos` y `portadores-unicos`) | 43/43 archivos |
| `npm run build` | sin errores de TypeScript |
| `node scripts/comprobar-conceptos.mjs todo` (Playwright, 1440 px y 390 px) | 58/58 |
| Batería de Kion y pruebas de reacciones | sin cambios en sus archivos y en verde |

Datos de Supabase simulados en Playwright: no se probó contra la base real.

## Partida de prueba (`tests/partida-conceptos.test.mjs`)

Todo creado como datos (habilidades pasivas y efectos), sin código por caso:

| Escenario | Resultado |
|---|---|
| Dragón inmune al fuego y a Quemadura recibe una Bola de fuego | 0 daño, sin Quemadura y sin tirada de salvación |
| Kuro moja al dragón y lanza Bola de fuego + 2 CB (bioelectricidad) | el fuego no pasa; el rayo (2d6+1d4) se dobla por Superconducción; Mojado se consume una vez; el registro dice «Técnica potenciada: Bola de fuego 2d6 fuego + 2d6 electricidad por 2 CB» |
| Monje con «Mente de control» | el control mental común se bloquea; el que ignora la inmunidad mental lo controla |
| Desarmado y guardia del dragón | «Mordisco» 2d6 sin manos; «Caparazón» +4 ARM, dos turnos, inmóvil |
| Seis esqueletos base | cada ataque lleva el gesto de su esqueleto en el evento visual |

Fallo real encontrado por la partida y corregido: el tipo de daño de la técnica base («fuego») se heredaba en el
componente eléctrico y la inmunidad al fuego bloqueaba también el rayo.

## Navegador (Playwright · `scripts/comprobar-conceptos.mjs`)

| Escenario | Escritorio 1440 | 390 px |
|---|---|---|
| Defensas: «Inmune al fuego; no a Quemadura»; dragón inmune a ambos; mente de control | ✓ | ✓ |
| Rasgo con recurso propio: «Bola de fuego 2d6 fuego + 2d6 electricidad por 2 CB» | ✓ | ✓ |
| Desarmado propio (Mordisco) y guardia propia (+4 ARM inmóvil) con su frase | ✓ | ✓ |
| Estado nuevo que combina perder turno y daño periódico | ✓ | ✓ |
| Esqueleto nuevo «Guadaña» copiado del hacha, guardado en `esqueletos` y animado | ✓ | ✓ |
| Seis gestos (espada, hacha, lanza, arco, bastón, puños) | ✓ | ✓ |
| Sin gestos con `prefers-reduced-motion` | ✓ | ✓ |
| Arena: elegir la técnica abre el menú; previsualización = registro; coste una vez | ✓ | ✓ |
| Sin scroll horizontal; sin errores de página | ✓ | ✓ |

Capturas (`deviceScaleFactor` 2 a 390 px): `capturas/conceptos-*`, `capturas/gesto-*`, `capturas/potenciador-*`.

## Calidad visual

Los gestos usan solo `transform` y `opacity`; la estela tiene un `drop-shadow` fijo (no animado). Con
`prefers-reduced-motion` la capa no se muestra. Arreglo de paso: el SVG del arma se centraba mal (se alineaba arriba
al desbordar la casilla); ahora se centra con `translate`, también en el tablero de combate.
