import test from 'node:test';
import assert from 'node:assert/strict';
import { cargarDependencia } from './helpers/cargar-ts.mjs';

const { proyectarCarga } = cargarDependencia('balance-carga');
const { evaluarBalance, claseLaboratorio } = cargarDependencia('balance-laboratorio');
const { vacio } = cargarDependencia('yunque-borrador');

const pieza = (id, pesoKg, extra = {}) => ({ id, pesoKg, cantidad: 1, ubicacion: 'transportado', ...extra });
const aptitudes = { fisico: 6, resistencia: 4 };

test('equipar una instancia no duplica el peso; pilas y contenedores siguen su ubicación', () => {
  const espada = pieza('espada', 3);
  const r = proyectarCarga([
    espada, { ...espada }, pieza('armadura', 14), pieza('comida', 2, { contenedor: 'mochila', cantidad: 5 }),
    pieza('mochila', 1), pieza('baul', 3, { ubicacion: 'externo' }), pieza('gema', 900, { contenedor: 'baul' }),
  ], aptitudes);
  assert.equal(r.pesoConocido, 28);
  assert.equal(r.capacidad, 38);
  assert.equal(r.banda.nombre, 'Normal');
  assert.throws(() => proyectarCarga([
    pieza('a', 1, { contenedor: 'b' }), pieza('b', 1, { contenedor: 'a' }),
  ], aptitudes), /ciclo/);
  assert.throws(() => proyectarCarga([espada, { ...espada, pesoKg: 9 }], aptitudes), /contradictorios/);
});

test('respeta los límites inclusivos, el cero explícito y la masa histórica indeterminada', () => {
  const casos = [[30.4, 0], [30.41, -1], [38, -1], [38.01, -2], [47.5, -2], [47.51, -3], [57, -3], [57.01, -4]];
  for (const [peso, mov] of casos) {
    assert.equal(proyectarCarga([pieza('p', peso)], aptitudes).banda.movimiento, mov, String(peso));
  }
  const r = proyectarCarga([pieza('ausente'), pieza('cero', 0), pieza('negativo', -3), pieza('infinito', Infinity)], {});
  assert.equal(r.capacidad, 37);
  assert.equal(r.capacidadProvisional, true);
  assert.equal(r.pendientes.join(','), 'ausente,negativo,infinito');
  assert.equal(r.banda, null);
});

function tecnica(coste) {
  return {
    ...vacio(), id: 'tecnica', tipo: 'habilidad', nombre: 'Técnica de prueba',
    efectos: [{ id: 'golpe', nombre: 'Golpe', efecto: 'dano', cantidad: 2, caras: 6, modificador: 0,
      tipo_dano: 'físico', estado: '', duracion: 0, coste_ph: coste, animacion: 'impacto' }],
  };
}

test('el motor reproduce la prueba y distingue pico, rendimiento y consumo de PH', () => {
  const ctx = { creaciones: [], stats: {} };
  const opciones = { semilla: 194, repeticiones: 3, doll: { ph: 2 } };
  const gratis = evaluarBalance(tecnica(0), ctx, opciones);
  const pagada = evaluarBalance(tecnica(2), ctx, opciones);
  assert.equal(JSON.stringify(pagada), JSON.stringify(evaluarBalance(tecnica(2), ctx, opciones)));
  const a = gratis.informe[0].creacion, b = pagada.informe[0].creacion;
  assert.equal(a.phGastado, 0);
  assert.equal(b.phGastado, 2);
  assert.ok(a.dano > b.dano);
  assert.ok(b.pico > 0);
  assert.equal(a.pico, b.pico);
  assert.equal(a.curacion, 0);
  assert.equal(gratis.modo, 'impacto');
  assert.equal(claseLaboratorio(31.999), 'Z');
  assert.equal(claseLaboratorio(32), 'KUROI');
  assert.equal(claseLaboratorio(999), 'KUROI');
  assert.equal(claseLaboratorio(Infinity), null);
});

test('la curación a vida completa no aporta HP y se mide ante daño real', () => {
  const curacion = tecnica(0);
  curacion.efectos[0].efecto = 'curacion';
  const ctx = { creaciones: [], stats: {} };
  const r = evaluarBalance(curacion, ctx, { semilla: 194, repeticiones: 2, doll: { armadura: 100 } });
  assert.ok(r.informe[0].creacion.curacion <= r.informe[0].creacion.danoRecibido);
  const expuesto = evaluarBalance(curacion, ctx, { semilla: 194, repeticiones: 2, doll: { armadura: 0 } });
  assert.ok(expuesto.informe[0].creacion.curacion > 0);
});

test('el daño directo del Yunque mantiene su rendimiento frente a ARM alta', () => {
  const directa = { ...vacio(), tipo: 'habilidad', id: 'directa', nombre: 'Directa' };
  directa.reglas = [{ id: 'dano', nombre: 'Daño de prueba', evento: 'usar', condicion: { tipo: 'siempre' },
    efectos: [{ tipo: 'dano', destino: 'objetivo', valor: 7 }],
    coste_ph: 0, coste_fatiga: 0, enfriamiento: 0, usos: 0, prioridad: 0 }];
  const ctx = { creaciones: [], stats: {} };
  const a = evaluarBalance(directa, ctx, { repeticiones: 3 });
  const b = evaluarBalance(tecnica(0), ctx, { repeticiones: 3 });
  assert.equal(a.informe[2].creacion.dano, 35);
  assert.ok(a.informe[2].creacion.dano > b.informe[2].creacion.dano);
});
