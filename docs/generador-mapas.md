# Taller de mapas procedural — primera entrega

Acceso: GM → Combate → preparación del encuentro → Mapa de combate → Taller de mapas.

## Uso

1. Elige tamaño (8–24 casillas por lado), escenario, semilla y densidad.
2. Genera una vista previa. Repetir los mismos parámetros produce el mismo resultado base.
3. Pinta o arrastra el pincel; usa relleno conectado, zoom y hasta 30 pasos de deshacer/rehacer.
4. Protege casillas para conservarlas en posteriores generaciones. Si esas casillas aíslan una zona, el taller muestra el conflicto y bloquea Aplicar, sin borrarlas.
5. Opcional: sube PNG/WebP, ajusta celda/margen/separación, actualiza cortes, selecciona varios recortes y asigna suelo, muro, terreno difícil, cobertura o peligro. Indica autor y permiso de uso.
6. Pulsa Aplicar mapa al encuentro. La configuración y el atlas se conservan con el encuentro en Supabase, usando el guardado y los permisos GM existentes. El taller no guarda cada pincelada en la base de datos.
7. Coloca posiciones iniciales en el mapa guardado. Los personajes conservan las reglas vigentes de movimiento, áreas, colisiones y visión. Durante combate el mapa queda fijado.

Los terrenos conservan el comportamiento previo del motor: difícil cuesta 2, cobertura aporta +2 ARM a distancia y peligro hace 2 de daño. Esta entrega no convierte esos valores en reglas configurables nuevas.

## Arquitectura

- `lib/mapas-procedurales.ts`: PRNG estable, contratos de procedencia versionados, corte de atlas, asignación visual y validación por componentes conexos.
- `components/TallerMapas.tsx`: borrador local, clasificación múltiple, herramientas e historial.
- `components/FondoMapaProcedural.tsx`: un Canvas y un atlas compartido bajo las casillas de interacción; funciona en el tablero GM y jugador.
- `MapaCombate.procedural`: metadatos opcionales; los mapas antiguos siguen funcionando. La autoridad táctica sigue en `celdas`, independientemente de las imágenes.
- Los cambios usan `combate_guardar_ligero`. Las acciones normales no generan mapas ni introducen escrituras por tile o fotograma.

## Alcance y trabajo pendiente de la especificación completa

Esta es una base integrada, no el generador universal completo del documento.

- Los perfiles iniciales generan perímetros, corredores y distribuciones de terreno; faltan gramáticas completas de mobiliario y roles semánticos extensibles.
- Un recorte ocupa una casilla: faltan objetos multitile, pivotes, recortes manuales, rotaciones, conectores, animaciones y autotile 16/47.
- Un atlas por mapa, PNG/WebP hasta 250 KB, máximo 4096×4096 y 4096 recortes. Se guarda en el documento del encuentro; falta sustituirlo por Storage validado en servidor, con bibliotecas y licencias privadas/compartidas. Los chequeos de archivos actuales son de cliente; no equivalen a validación del servidor.
- Falta catálogo de mapas independiente, publicación, versiones inmutables, duplicación entre encuentros y permisos por campaña. La persistencia actual es la del encuentro.
- Límite 24×24 impuesto también por el servidor existente; ampliar a 64/128 requiere cambiar y probar ese contrato, además de Workers, cancelación y chunks.
- Se protegen casillas completas. Falta selección por región/habitación, parches por capas, herramientas rectángulo/selección, minimapa, inspector de objetos y regeneración parcial.
- Falta estado dinámico de puertas/destructibles y nuevas reglas de altura, agua y cobertura configurable.
- La validación cubre transitabilidad y componentes. No valida todavía conectores, huellas ni regiones semánticas.

## Verificación

`npm run test:combate` incluye 1000 semillas por cada uno de los cinco perfiles, determinismo, conectividad, límites, conflictos con protecciones y corte de atlas irregular. Se conserva la batería de regresiones del combate.

`npm run build` requiere las variables públicas Supabase. En el entorno de desarrollo se comprobó la compilación con valores de ejemplo, sin conexión a una base real. No se verificaron visualmente dos sesiones autenticadas ni mediciones p95 en Android. Los tiempos objetivo de la especificación no se dan por cumplidos con pruebas unitarias.
