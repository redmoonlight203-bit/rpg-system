import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync(new URL('../lib/imagenes-creacion.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function load(overrides = {}) {
  const exports = {};
  vm.runInNewContext(source, { exports, URL, ...overrides });
  return exports;
}
const api = load();
test('portadas aceptan URLs web, rutas y borrado explícito', () => {
  for (const value of ['', 'https://example.com/a.jpg', 'http://example.com/a.png', '/personajes/a.webp']) assert.equal(api.validarPortada(value), null);
});
test('bloquea scripts, SVG inline, credenciales y rutas ambiguas', () => {
  for (const value of ['javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', '//host/a.png', '/\\host/a', 'https://user:pass@example.com/a', 'blob:https://example.com/a', 'archivo.jpg']) assert.notEqual(api.validarPortada(value), null, value);
});
test('solo raster inline dentro del límite permitido', () => {
  assert.equal(api.validarPortada('data:image/webp;base64,AAAA'), null);
  assert.notEqual(api.validarPortada('data:image/webp;base64,' + 'A'.repeat(api.MAX_PORTADA_BYTES)), null);
  assert.notEqual(api.validarPortada('data:image/png;base64,<script>'), null);
});
test('rechaza tipos y tamaños incorrectos antes de decodificar', async () => {
  let called = false;
  const a = load({ createImageBitmap: () => { called = true; } });
  await assert.rejects(a.prepararPortada({ type: 'image/svg+xml', size: 10 }), /PNG/);
  await assert.rejects(a.prepararPortada({ type: 'image/jpeg', size: 11 * 1024 * 1024 }), /10 MB/);
  assert.equal(called, false);
});
test('optimiza la imagen y libera el bitmap', async () => {
  let closed = false, drawn = false;
  const canvas = { getContext: () => ({ drawImage: () => { drawn = true; } }), toDataURL: () => 'data:image/webp;base64,AAAA' };
  const a = load({ createImageBitmap: async () => ({ width: 2400, height: 1600, close: () => { closed = true; } }), document: { createElement: () => canvas } });
  assert.equal(await a.prepararPortada({ type: 'image/jpeg', size: 1024 }), 'data:image/webp;base64,AAAA');
  assert.equal(canvas.width, 1200); assert.equal(canvas.height, 800);
  assert.equal(drawn, true); assert.equal(closed, true);
});
test('libera el bitmap si el archivo supera el límite de píxeles', async () => {
  let closed = false;
  const a = load({ createImageBitmap: async () => ({ width: 10000, height: 10000, close: () => { closed = true; } }) });
  await assert.rejects(a.prepararPortada({ type: 'image/png', size: 2000 }), /megapíxeles/);
  assert.equal(closed, true);
});
