import { readFileSync } from "node:fs";
const { PGlite } = await import(
  process.env.FORJA_PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
try {
  for (const p of [
    "./fixtures/forja_copias_schema.sql",
    "./fixtures/creacion_schema.sql",
    "../supabase/migrations/20261030_forja_copias.sql",
    "../supabase/migrations/20261030_forja_tipos_y_dados.sql",
    "../supabase/migrations/20261030_combate_pasivas.sql",
    "../supabase/migrations/20261030190047_pasivas_reactivas_y_elementos.sql",
    "./fixtures/elementos_regresion.sql",
  ])
    await db.exec(readFileSync(new URL(p, import.meta.url), "utf8"));
  console.log(
    "PostgreSQL: reglas reactivas, elementos y salvaciones válidos, inválidos rechazados y snapshots conservados.",
  );
} catch (e) {
  console.error(e.message, e.where || "");
  process.exitCode = 1;
} finally {
  await db.close();
}
