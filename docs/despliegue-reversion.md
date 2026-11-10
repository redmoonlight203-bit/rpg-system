# Despliegue y reversión

## Estado

Rama de trabajo: estabilizacion, basada en main. No se ha desplegado ni migrado producción desde esta rama.
Las migraciones de reconciliación contienen definiciones observadas en producción; no constituyen respaldo de datos.

## Antes de desplegar

- Respaldo reciente fechado y restauración comprobada; no basta con que exista una opción Backups.
- Copia aislada de la base con las migraciones pendientes y pruebas SQL.
- Preview Vercel enlazada a esa copia, con variables de Preview separadas de Production.
- Checks de Estabilización obligatorios en main.
- Registrar ID/URL del despliegue previo, proyecto, regiones y revisión de base.

## Reversión

1. En Vercel, abrir el despliegue anterior validado y promoverlo a producción.
2. Comprobar login, lectura y una operación de prueba autorizada.
3. Ante fallo de base, detener escrituras y restaurar la definición previa de la función afectada; no borrar migraciones del historial.
4. Si hay cambio irreversible de datos, restaurar primero en una copia y revisar la pérdida potencial antes de sustituir producción.
5. Registrar hora, causa, versión anterior y posterior, y resultado del guion.

Objetivo: reversión de aplicación en menos de 5 minutos. Aún no cronometrado.
Una restauración completa de base no tiene garantizado ese tiempo y requiere un plan propio.

## Guía de lentitud

Usar scripts/diagnostico-combate.sql: tamaños → triggers en copia → sesiones activas → Network.
Comparar el mismo escenario, cantidad de miembros e imágenes. Evitar EXPLAIN ANALYZE de escrituras en producción.
