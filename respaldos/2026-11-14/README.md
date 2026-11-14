# Respaldo previo a la guía v2

Exportación lógica de RealYugen el 14 de noviembre de 2026 a las 14:47 UTC. Contiene 81 tablas, 537 filas, 200 funciones y 85 triggers de public, private, yugen_interno y auth. Incluye índices, políticas y ACL como metadatos. Los datos permanecen cifrados con OpenPGP RSA y AES256; la clave privada se entrega por separado y nunca se incorpora al repositorio.

El archivo cifrado se entrega al propietario en privado. No forma parte del repositorio público: la revisión automática rechazó su publicación. Para recuperar el JSON en una carpeta privada:

```sh
cp /ruta/privada/YUGEN-respaldo-2026-11-14.pgp baseline.pgp
gpg --import /ruta/privada/YUGEN-clave-recuperacion-2026-11-14.asc
gpg --output baseline.json --decrypt baseline.pgp
sha256sum baseline.json
node /ruta/rpg-system/scripts/restaurar-respaldo.mjs baseline.json
```

SHA-256 del cifrado: `92dbb324e5dd1ffa0866781fd9218a8f966451f813c1c50de3eef665bbdee0a4` (7.455.481 bytes).

SHA-256 del JSON: `aefaa0bdd68ee6eb3595acba0e3f1aa93def9e9d3abe2c901bcac910364413bb` (11.519.670 bytes).

Se verificó el descifrado byte por byte y se restauraron datos, restricciones, funciones y triggers en PGlite. Después se aplicó la migración guía v2 en esa copia y se comprobó que los resultados oficiales no cambiaron. Evidencia: `docs/metricas/copia-guia-v2-2026-11-14.json`.

El ensayo no acredita recuperación completa de Supabase: los binarios de Storage, secretos, configuración Auth/Vercel, extensiones, políticas y ACL no se restauran automáticamente con el restaurador aislado. No importar sobre la campaña activa. En PGPy, un paquete literal binario puede devolverse como texto Latin-1: recuperar sus bytes con esa codificación antes de validar SHA-256.
