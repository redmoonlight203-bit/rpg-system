import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const migration = nombre => readFileSync(new URL('../supabase/migrations/'+nombre,import.meta.url),'utf8');
try {
  await db.exec(`
    create role anon; create role authenticated; create schema private;
    create function private.tienda_es_gm() returns boolean language sql as $$select false$$;
    create table forja_maestra(id uuid primary key, clase text, nombre text, tipo text, tipo_creacion text, stats jsonb, stats_rango jsonb, es_grupo boolean, configuracion_dados jsonb, reglas jsonb, reglas_pasivas jsonb, requisitos_uso jsonb, habilidades jsonb, pasivas jsonb, equipamiento jsonb);
    create function forja_validar_requisitos(jsonb) returns void language sql as $$select$$;
    create function forja_puntuacion_calculada(jsonb,jsonb,jsonb,jsonb) returns numeric language sql as $$select 0$$;
    create function forja_clase_calculada(jsonb,jsonb,jsonb,jsonb) returns text language sql as $$select 'D'$$;
    create function forja_validar_carga_y_clase() returns trigger language plpgsql as $$begin return new; end$$;
    create trigger aa_forja_carga_y_clase before insert on forja_maestra for each row execute function forja_validar_carga_y_clase();
    insert into forja_maestra(id,clase) values('00000000-0000-0000-0000-000000000001','D');
    create table categorias_forja(clave text primary key,pasiva_racial jsonb);
    create table config_estadisticas(categoria text,clave text,etiqueta text,descripcion text,valor_defecto numeric,limite_jugador numeric);
    insert into categorias_forja values('elfos',null);
    insert into config_estadisticas values('razas','movimiento','MOV','',6,6),('elfos','vida','HP','',16,20);
  `);
  await db.exec(migration('20261120183000_clases_ipe.sql'));
  const original=(await db.query('select to_jsonb(f) v from forja_maestra f')).rows[0].v;
  const reconciliar=()=>db.query("select forja_reconciliar_ipe($1,2,'[]') ok",[JSON.stringify(original)]);
  await assert.rejects(reconciliar());
  await db.exec('create or replace function private.tienda_es_gm() returns boolean language sql as $$select true$$');
  assert.equal((await reconciliar()).rows[0].ok,true);
  assert.equal((await reconciliar()).rows[0].ok,false);
  for (const [ipe,clase] of [[0,'F'],[.5,'D'],[1,'C'],[2,'B'],[4,'A'],[8,'S'],[16,'Z'],[32,'KUROI']]) {
    assert.equal((await db.query('update forja_maestra set balance_ipe=$1 returning clase',[ipe])).rows[0].clase,clase);
  }
  await assert.rejects(db.query('update forja_maestra set balance_ipe=-1'));
  await db.exec(migration('20261120183100_bases_raciales_balance.sql'));
  assert.deepEqual((await db.query("select clave,valor_defecto::int v from config_estadisticas where categoria='elfos' order by clave")).rows,[{clave:'movimiento',v:7},{clave:'vida',v:18}]);
} finally { await db.close(); }
