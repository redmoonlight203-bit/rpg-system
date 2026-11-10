# Respaldo cifrado — 10 de noviembre de 2026

Snapshot lógico único de 91 tablas, 543 filas, 223 funciones y 96 triggers. El contenido incluye autenticación y permanece cifrado con OpenPGP (RSA/AES256). La clave privada se entrega al propietario por separado; nunca se publica en este repositorio.

Desde esta carpeta:

```sh
cat baseline.pgp.b64.parte-* | base64 --decode > baseline.pgp
sha256sum baseline.pgp
gpg --import /ruta/privada/YUGEN-clave-recuperacion-2026-11-10.asc
gpg --output baseline.json --decrypt baseline.pgp
sha256sum baseline.json
```

Huella del archivo cifrado: `1f103dcace0b0debbd85d11bcc6b012a198b597f2546af7fb6860bfecb7b9da1` (6.383.552 bytes).

Huella del JSON descifrado: `d7f18b3873f076416c4e4ab22ac2991827c130ca39efa379bc8a7a760a528016` (9.562.482 bytes).

El descifrado se verificó contra la huella registrada al exportar. La restauración aislada con `node scripts/restaurar-respaldo.mjs /ruta/privada/baseline.json` comprobó tablas, filas, restricciones, funciones y triggers en PGlite.

Este ensayo no sustituye un respaldo administrado completo de Supabase. No incluye archivos binarios de Storage, secretos de infraestructura, configuración Auth/Vercel ni restauración probada de ACL o extensiones de plataforma. Antes de restaurar producción, preparar un proyecto Supabase compatible y probar estos componentes. No importar directamente sobre la campaña activa.
