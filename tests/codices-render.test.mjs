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

const vista = 'components/codices/VistaCodice.tsx';
const nada = () => {};
function ver(item, items = [], extra = {}) {
  return renderizar(vista, 'default', {item, props:propsBase(items), volver:nada, abrir:nada, ...extra});
}

test('la ficha conserva sus acciones y textos', () => {
  const html = ver(fixture('objeto'));
  for (const texto of ['Volver a la colección', 'Editar ficha', 'Entregar', 'Publicar en tienda',
    'href="/dm/mercado?forja=', 'Eliminar creación', 'Las copias existentes conservan sus valores.', 'Elegir imagen o icono']) {
    assert.ok(html.includes(texto), texto);
  }
});

test('personaje: preparar batalla y tienda de almas', () => {
  const normal = ver(fixture('personaje'));
  assert.ok(normal.includes('Preparar batalla'));
  assert.ok(normal.includes('/dm/tienda-almas?forja='));
  const alma = ver(fixture('personaje', {ligado_al_alma:true, alma_en_uso:true}));
  assert.ok(alma.includes('Ya entregada · Restablece para recuperar'));
  assert.ok(alma.includes('Restablecer y devolver a La creación'));
  assert.ok(!alma.includes('Preparar batalla'));
});

test('enlace roto no expone un botón', () => {
  const html = ver(fixture('personaje', {habilidades:['no-existe']}));
  assert.match(html, /<span class="cx-no-disponible">Creación no disponible<\/span>/);
  assert.doesNotMatch(html, /aria-label="Abrir Creación no disponible"/);
});
