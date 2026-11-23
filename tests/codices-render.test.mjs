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

const efecto = {id:'tajo', nombre:'Tajo', efecto:'dano', cantidad:2, caras:6, modificador:1, coste_ph:3};

test('tarot: anverso y reverso accesibles, acciones y portadores', () => {
  const item = fixture('habilidad', {id:'tajo', configuracion_dados:[efecto]});
  const portador = fixture('personaje', {nombre:'Portadora de prueba', habilidades:[item.id]});
  const html = ver(item, [item, portador]);
  assert.match(html, /cx-tarot/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /is-reverso[^>]*aria-hidden="true"[^>]*inert=""/);
  for (const texto of ['Lectura', 'Tajo', '2d6', '3 PH', 'Lanzar', 'La portan', portador.nombre]) {
    assert.ok(html.includes(texto), texto);
  }
});

test('bestiario: portada y navegación, sin láminas vacías ni controles fantasma', () => {
  const item = fixture('personaje', {
    tipo:'bestia', stats:{vida:10}, historia:'La crónica de prueba',
    configuracion_monstruo:{variantes:[{id:'v1', nombre:'Primera', peso:1},{id:'v2', nombre:'Segunda', peso:3}]}
  });
  const html = ver(item);
  for (const texto of ['aria-roledescription="libro"', 'Ficha de campo', 'Página 1', 'de 5', 'Lámina', 'Variantes']) {
    assert.ok(html.includes(texto), texto);
  }
  assert.match(html, /<button[^>]*disabled=""[^>]*>[^<]*(?:<svg[\s\S]*?<\/svg>)?Anterior/);
  const vacio = ver(fixture('personaje', {tipo:'bestia'}));
  assert.ok(vacio.includes('de 2'));
  assert.doesNotMatch(vacio, /Anatomía|Variantes/);
});

test('reliquia: placa, consumible y ascenso', () => {
  const html = ver(fixture('objeto', {
    slot_tipo:'casco', consumible:true,
    configuracion_artefacto:{niveles:[
      {nivel:1,nombre:'Despertar',condicion_subida:null,cambios:{}},
      {nivel:2,nombre:'Hambre',condicion_subida:{tipo:'contador',contador:'armas devoradas',meta:4},cambios:{stats:{dano:2}}},
    ]},
  }));
  for (const texto of ['Cabeza', 'Consumible', 'Despertar del artefacto', 'Inicial', '4 armas devoradas', 'dano +2']) {
    assert.ok(html.includes(texto), texto);
  }
});

test('sello: anillo SVG y cadena ritual', () => {
  const html = ver(fixture('pasiva', {reglas_pasivas:[{
    id:'r1', nombre:'Protección', evento:'recibir_dano', condicion:'vida_mitad', reduccion_pct:20,
  }]}));
  for (const texto of ['role="img"', '<textPath', 'Ritual', 'Al recibir daño', 'Vida a la mitad', 'Reduce 20% de daño']) {
    assert.ok(html.includes(texto), texto);
  }
});

test('edicto heráldico y pergamino de reserva', () => {
  const edicto = ver(fixture('titulo', {stats:{fuerza:2}}));
  for (const texto of ['Por decreto de Kuroi', '+2']) assert.ok(edicto.includes(texto), texto);
  const pergamino = ver(fixture('otro', {tipo_creacion:'desconocido'}));
  assert.match(pergamino, /cx-rollo/);
  assert.match(pergamino, /<h2[^>]*>Creación otro<\/h2>/);
});

test('expediente: grimorio, arsenal y tres clases de miniatura enlazada', () => {
  const h = fixture('habilidad',{id:'h'});
  const p = fixture('pasiva',{id:'p'});
  const o = fixture('objeto',{id:'o',slot_tipo:'casco'});
  const item = fixture('personaje',{habilidades:['h'],pasivas:['p'],equipamiento:{casco:'o'},stats:{vida:12,fuerza:2,armadura:3}});
  const html = ver(item,[item,h,p,o]);
  for (const texto of ['Grimorio','Arsenal','Cabeza','Mano derecha: vacío','cx-mini-tarot','cx-mini-sello','cx-mini-reliquia','Preparar batalla','Editar ficha']) {
    assert.ok(html.includes(texto), texto);
  }
  for (const x of [h,p,o]) assert.ok(html.includes(`aria-label="Abrir ${x.nombre}"`));
  const armaDos = {...o,slot_tipo:'dos_manos'};
  const conArma = ver({...item,equipamiento:{mano_izq:'o'}},[h,p,armaDos]);
  assert.doesNotMatch(conArma, /Mano derecha: vacío/);
  assert.equal(conArma.split('aria-label="Abrir Creación objeto"').length, 2);
});

test('rastro: retorno accionable y miga actual', () => {
  const a = fixture('personaje',{id:'a',nombre:'Bestia Alfa'});
  const b = fixture('habilidad',{id:'b',nombre:'Arcano Beta'});
  const html = ver(b,[a,b],{rastro:['a','b'],irA:nada});
  assert.match(html,/aria-label="Rastro de creaciones"/);
  assert.match(html,/<button[^>]*>Bestia Alfa<\/button>/);
  assert.match(html,/<span aria-current="page">Arcano Beta<\/span>/);
});
