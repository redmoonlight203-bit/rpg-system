import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

// Cada archivo crea su propia base PostgreSQL en memoria: nunca usa producción.
const archivos = readdirSync(new URL('../tests/', import.meta.url))
  .filter(nombre => nombre.endsWith('-database.mjs')).sort();
let fallos = 0;
for (const archivo of archivos) {
  console.log(`\nSQL: ${archivo}`);
  const resultado = spawnSync(process.execPath, [new URL('../tests/' + archivo, import.meta.url).pathname],
    {stdio: 'inherit', timeout: 120_000});
  if (resultado.error || resultado.status !== 0) {fallos++; console.error(resultado.error?.message || `Falló ${archivo}`);}
}
console.log(`\nSQL: ${archivos.length - fallos}/${archivos.length} archivos correctos.`);
process.exitCode = fallos ? 1 : 0;
