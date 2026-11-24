import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderizar} from './helpers/render-tsx.mjs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {nuevaVision}=cargarDependencia('vision');

const nodos=html=>[...html.matchAll(/data-lienzo-nodo="([^"]+)"/g)].map(m=>m[1]);
test('un ojo se configura con nodos conectados al nodo de visión', () => {
  const html=renderizar('components/yunque/editores/EditorVision.tsx','default',{vision:nuevaVision(),onChange(){}});
  assert.deepEqual(nodos(html),['ojo','apariencia','activacion','mirada','revelar','puntos','recompensa','defensa','bonos']);
  // Cada módulo cuelga del nodo de visión; la recompensa cuelga de los puntos débiles (dirección).
  assert.match(html,/data-lienzo-cable="ojo-puntos"/);
  assert.match(html,/data-lienzo-cable="puntos-recompensa"/);
  // Solo se muestra el editor del nodo seleccionado (apariencia por defecto).
  assert.match(html,/Patrón del iris/);
  assert.doesNotMatch(html,/Cómo se activa/);
});
test('los módulos sin configurar se dibujan como fantasmas', () => {
  const v={...nuevaVision(),puntos_debiles:undefined};
  const html=renderizar('components/yunque/editores/EditorVision.tsx','default',{vision:v,onChange(){}});
  assert.match(html,/data-lienzo-nodo="puntos"[^>]*>\s*<button[^>]*is-fantasma/);
});
test('un ojo de fase no tiene nodo de activación ni de bonos', () => {
  const html=renderizar('components/yunque/editores/EditorVision.tsx','default',{vision:nuevaVision(),fase:true,onChange(){}});
  assert.ok(!nodos(html).includes('activacion'));
  assert.ok(!nodos(html).includes('bonos'));
});
