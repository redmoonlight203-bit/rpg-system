# Estabilización de YUGEN

## Ahora (máximo 3)

1. Confirmar respaldo reciente con restauración comprobada (fase 0.1). Las herramientas conectadas no permiten verificar Backups ni han creado uno.
2. Probar reconciliación de migraciones en copia y medir triggers/Network (0.2–0.4).
3. Limpiar los encuentros de prueba desde la app tras revisar protecciones y respaldo (0.3).

## Siguiente

- 1.1–1.2: fijar medición y mover imágenes a Storage, incluidos inventario, resultados e historiales detectados en auditoría.
- 1.3: resolver acción incierta para terminar/borrar. Descartar requiere serialización en servidor: una consulta sin recibo no demuestra que una petición en vuelo no vaya a confirmar después.
- 1.4: una optimización por trigger, con antes/después.
- 1.5–1.7: avisos dirigidos, regiones y sesión GM + dos jugadores, tres pasadas.
- 2.1–2.7: completar revisión de triggers/RPC/índices/RLS, retención y despliegue reversible.
- 3.1–3.8: auditoría funcional de pantallas, navegación, estados, consultas y móvil. No esconder reglas ni alma únicamente por la clasificación propuesta: son funciones actuales de creación y cuenta que requieren revisión de uso.

## Más adelante

Fase 4 bloqueada hasta validar fases 1–3. Elegir una función junto al usuario: Puntos Kuro automáticos, exportación de sesión, espectador, temporizador, turno o respaldo de campaña.
Fase 5: monitoreo continuo y revisión semanal de métricas y pendientes.

## Hecho — 2026-11-10

- Rama estabilizacion creada desde main.
- Línea base de tamaños y auditoría completa de columnas text/JSON de public, consultas de solo lectura.
- Definiciones de producción recuperadas para historial sin imágenes y borrado protegido; migraciones versionadas y pruebas SQL aisladas.
- Inventario de triggers y revisión inicial RLS documentados; sin optimización declarada ni tiempos inventados.
- CI preparado con tipos, motor, tests de unidad y PostgreSQL aislado mediante PGlite; falta verificar ejecución remota y exigir el check en main.
- Guía de despliegue/reversión y diagnóstico reproducible.

## Recursos de usuario (pendiente previo conservado)

Oro y Puntos Kuro disponibles. El GM puede crear más monedas y ajustar saldos con motivo. Pendiente definir reglas automáticas para obtener Puntos Kuro; por ahora los asigna el GM.
