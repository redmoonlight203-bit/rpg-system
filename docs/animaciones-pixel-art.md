# Animaciones pixel art

El Yunque ofrece una galería con búsqueda, familias, nombres en español y vistas previas animadas. Está disponible en cada acción de una habilidad u objeto. La escala visual se ajusta entre 0.5 y 4 casillas; las reglas de daño y alcance siguen siendo independientes.

| Paquete | Animaciones únicas importadas |
| --- | ---: |
| Kitsuwick FX Vol. 1 | 50 |
| pvfx.foundry | 101 |
| Combat FX Free | 6 |
| Warlock Free | 3 |
| Magic VFX Pack 1 Sample | 2 |
| Smoke N Dust 03 | 5 |
| Total | 167 |

Los proyectos editables y los archivos auxiliares de Kitsuwick contienen los mismos cincuenta efectos: no crean duplicados en el selector. En Foundry se utiliza la variante lit/grid; strict y packed son exportaciones alternativas de las mismas animaciones.

## Acciones y desplazamientos

- Al lanzar / salir: efecto en el origen del lanzador.
- Proyectil / estela: viaja entre las posiciones confirmadas. Los saltos trazan un arco; el teletransporte omite el recorrido.
- Al golpear / llegar al destino: en ataques, el impacto aparece en la casilla atacada o centro seleccionado, incluso cuando el lanzador se mueve o el objetivo es empujado. En movimientos sin blanco externo, aparece en la llegada real de cada desplazado.
- La salida se reproduce únicamente sobre el lanzador; atraer o empujar enemigos no genera lanzamientos adicionales sobre ellos.
- Si no hay movimiento de personajes, la secuencia es lanzamiento → proyectil → impacto sobre el centro seleccionado.

La estela representa los extremos del desplazamiento; no representa la ruta de navegación alrededor de obstáculos. El movimiento y las colisiones los resuelve el motor antes de emitir el evento. Las animaciones no retrasan acciones ni cambian tiradas.

## Transformaciones

Cada etapa tiene una entrada y un aura independientes. El aura se conserva en la transformación activa, también en posesión, y desaparece al salir, cambiar a una etapa sin aura, agotarse la duración o terminar el combate. La entrada se detecta al comparar las etapas del estado anterior y el confirmado.

## Implementación

`lib/catalogo-vfx.json` contiene referencias estables y nombres descriptivos. Los archivos APNG conservan transparencia, dimensiones y tiempos; se ofrecen versiones de un ciclo, bucle y póster estático. Las fichas guardan referencias, sin incrustar imágenes en la base de datos. No se requiere migración de esquema.

Las exportaciones con metadata conservan sus tiempos originales. Warlock usa 100 ms por fotograma y Magic Sample/Smoke N Dust usan 83 ms, al no incluir tiempos de reproducción en sus secuencias PNG. Smoke N Dust se corta en 80×64 (efecto 1), 64×64 (2–4) y 32×32 (5).

Las vistas previas se paginan de doce en doce. En combate, los eventos caducan a los diez segundos y no se repiten por una actualización del mismo evento. Las entradas y proyectiles se retiran al acabar; los bucles se reservan para auras. `prefers-reduced-motion` desactiva efectos de combate y cambia la galería a pósteres estáticos.

## Créditos

- Kitsuwick FX Vol. 1: NogitsuneGurl — https://nogitsunegurl.itch.io/kitsuwick-fx-vol-1
- pvfx.foundry: arcanite24/pixel-vfx-studio, CC0. Licencia incluida.
- Combat FX Free by heyheythere — https://heyheythere.itch.io/combat-fx-free — CC BY 4.0. Adaptado a APNG para YUGEN.
- Warlock Free: Frostwindz — https://frostwindz.itch.io/
- Magic VFX Pack 1 Sample: Thundersnow Pixel — https://thundersnowpixel.itch.io/
- Smoke N Dust 03: material aportado por el GM; el archivo recibido no contiene una nota de autoría.

Se mantienen los avisos de uso recibidos junto a los archivos correspondientes. Los recursos se integran en YUGEN y no se ofrecen como paquete descargable independiente.

## Verificación

`npm run test:combate` incluye integridad de los 167 recursos, secuencias de proyectiles, salto/teletransporte/atracción, posiciones confirmadas, rechazo de acciones y ciclo de transformación. `npm run build` verifica TypeScript y la compilación completa.
