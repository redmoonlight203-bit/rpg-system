import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
try {
  await db.exec(`
    create table categorias_forja(id int, clave text, parent_id int);
    create table config_estadisticas(categoria text, clave text, etiqueta text, valor_defecto numeric, limite_jugador numeric);
    create table forja_maestra(tipo_creacion text, stats jsonb);
    create table inventario_jugador(tipo text, stats jsonb, personaje_id int);
    insert into categorias_forja values (1, 'razas', null), (2, 'hadas', 1);
    insert into config_estadisticas values ('hadas', 'vida', 'Vida', 14, 14), ('hadas', 'vida', 'Vida', 15, 15);
    insert into forja_maestra values ('objeto', '{"peso":"3"}'), ('objeto', '{"peso":-1}'), ('objeto', '{"peso":0}'),
      ('objeto', '{}'), ('objeto', 'null'), ('objeto', '{"peso":null}'), ('personaje', '{"vida":14}');
    insert into inventario_jugador values ('espada', '{"peso":3}', 1), ('espada', '{"peso":20}', null);
  `);
  const sql = readFileSync(new URL('../scripts/auditar-balance.sql', import.meta.url), 'utf8');
  const [,, duplicadas, catalogo,, pesos] = await db.exec(sql);
  assert.equal(Number(duplicadas.rows[0].registros), 2);
  assert.equal(catalogo.rows[0].padre, 'razas');
  const forja = pesos.rows.find(fila => fila.origen === 'forja_maestra');
  assert.equal(Number(forja.sin_peso), 2);
  assert.equal(Number(forja.peso_invalido), 3);
  assert.equal(Number(forja.peso_cero), 1);
  assert.equal(pesos.rows.length, 3);
  console.log('Auditoría de balance comprobada en PostgreSQL aislado.');
} finally {
  await db.close();
}
