import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderizar} from './helpers/render-tsx.mjs';

export function fixture(tipo, extra = {}) {
  return {
    id: tipo, nombre: 'Creación ' + tipo, tipo, tipo_creacion: tipo,
    descripcion: '', historia: '', requisitos: '', defectos: '',
    imagen_url: '', clase: 'A', es_grupo: false, slot_tipo: 'ninguno',
    ligado_al_alma: false, stats: {}, stats_rango: {},
    habilidades: [], pasivas: [], equipamiento: {},
    configuracion_dados: [], reglas_pasivas: [], reglas: [], ...extra,
  };
}

export function propsBase(items = []) {
  const nada = () => {};
  const hecho = async () => {};
  return {
    items, cargando: false, iconoDe: () => 'ojo', tipoDe: i => i.tipo_creacion,
    clasificacion: k => k, clasificaciones: [], etiqueta: (_, k) => k,
    onEditar: nada, onEntregar: nada, onRestablecer: hecho, onBatalla: nada,
    onEliminar: hecho, onNueva: nada, onImagen: hecho, esMonstruo: i => i.tipo === 'bestia',
  };
}

test('el arnés renderiza una Carta de la galería', () => {
  const item = fixture('habilidad');
  const html = renderizar('components/GaleriaCreacion.tsx', 'Carta', {item, props:propsBase(), dueno:null, orden:0});
  assert.match(html, /cg-carta/);
  assert.ok(html.includes(item.nombre));
});
