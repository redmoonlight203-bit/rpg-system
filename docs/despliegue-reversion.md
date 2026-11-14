# Despliegue y reversión

## Estado

La fuente de producción verificada es main. El avance de la guía v2 está en [el registro fechado](metricas/avance-2026-11-14.md). El respaldo del 14 de noviembre y la reversión de funciones e historiales se ensayaron en copia aislada; no acreditan recuperación de toda la plataforma.

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

## Reversión de la guía v2

`scripts/revertir-guia-v2.sql` recupera funciones e historiales desde copias privadas y rechaza encuentros cuyo estado funcional haya cambiado. Ensayar antes con `node scripts/verificar-copia-guia-v2.mjs /ruta/privada/baseline.json`. Las versiones se incrementan para invalidar clientes antiguos. El archivo cifrado y sus huellas están en `respaldos/2026-11-14/README.md`.
