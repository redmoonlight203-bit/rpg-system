import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderizar} from './helpers/render-tsx.mjs';

const NOMBRES={personaje:'Axel Kuro',habilidad:'Aliento de Dragón',objeto:'Espada Rota',pasiva:'Pulmones de dragón',titulo:'Matadragones',otro:'Reliquia sin nombre'};
export function fixture(tipo,extra={}){
 return {id:extra.id||`id-${tipo}`,nombre:NOMBRES[tipo]||tipo,tipo:extra.tipo||'general',tipo_creacion:tipo,
  descripcion:'',historia:'',requisitos:'',defectos:'',imagen_url:'',clase:'A',es_grupo:false,slot_tipo:'ninguno',
  ligado_al_alma:false,stats:{},stats_rango:{},habilidades:[],pasivas:[],equipamiento:{},configuracion_dados:[],reglas_pasivas:[],reglas:[],...extra};
}
export function propsBase(items=[],extra={}){
 const nada=()=>{},promesa=async()=>{};
 return {items,cargando:false,iconoDe:()=>'ojo',tipoDe:i=>i.tipo_creacion,clasificacion:k=>k,clasificaciones:[],
  etiqueta:(_,k)=>k,esMonstruo:i=>i.tipo==='bestia',onEditar:nada,onEntregar:nada,onBatalla:nada,onEliminar:promesa,onNueva:nada,onImagen:promesa,onRestablecer:promesa,...extra};
}

test('el arnés renderiza una Carta de la galería',()=>{
 const item=fixture('habilidad');
 const html=renderizar('components/GaleriaCreacion.tsx','Carta',{item,props:propsBase([item]),dueno:null,orden:0});
 assert.match(html,/cg-carta/);
 assert.match(html,/Aliento de Dragón/);
});

const vista=(item,items=[item],extra={})=>renderizar('components/codices/VistaCodice.tsx','default',{item,props:propsBase(items),volver:()=>{},abrir:()=>{},...extra});

test('la ficha conserva sus acciones y textos',()=>{
 const html=vista(fixture('objeto'));
 for(const t of ['Volver a la colección','Editar ficha','Entregar','Publicar en tienda','href="/dm/mercado?forja=id-objeto"','Eliminar creación','Las copias existentes conservan sus valores.','Elegir imagen o icono'])
  assert.ok(html.includes(t),t);
});

test('personaje: preparar batalla y tienda de almas; alma única en uso',()=>{
 const html=vista(fixture('personaje'));
 assert.match(html,/Preparar batalla/);assert.match(html,/\/dm\/tienda-almas\?forja=/);
 const alma=vista(fixture('personaje',{ligado_al_alma:true,alma_en_uso:true}));
 assert.match(alma,/Ya entregada · Restablece para recuperar/);
 assert.doesNotMatch(alma,/Preparar batalla/);
 assert.match(alma,/Restablecer y devolver a La creación/);
});

test('un vínculo a una creación borrada no es un botón',()=>{
 const html=vista(fixture('objeto',{habilidades:['no-existe']}));
 assert.match(html,/Creación no disponible/);
 assert.doesNotMatch(html,/<button[^>]*>[^<]*Creación no disponible/);
});

test('los vínculos se dibujan como miniatura según el tipo de la creación enlazada',()=>{
 const h=fixture('habilidad',{id:'h',nombre:'Tajo'}),p=fixture('pasiva',{id:'p',nombre:'Piel'}),o=fixture('objeto',{id:'o',nombre:'Yelmo',slot_tipo:'casco'});
 const item=fixture('otro',{habilidades:['h'],pasivas:['p'],equipamiento:{casco:'o'}});
 const html=vista(item,[item,h,p,o]);
 assert.match(html,/cx-mini-tarot[ "]/);assert.match(html,/cx-mini-sello[ "]/);assert.match(html,/cx-mini-reliquia[ "]/);
 for(const n of ['Tajo','Piel','Yelmo'])assert.ok(html.includes(`aria-label="Abrir ${n}"`),n);
 assert.match(html,/Cabeza/,'el equipo muestra su espacio');
});

const tajo={id:'e1',nombre:'Tajo',efecto:'dano',cantidad:2,caras:6,modificador:1,coste_ph:3,tipo_dano:'',estado:'',duracion:0};

test('tarot: anverso y reverso accesibles',async()=>{
 const {cargarDependencia}=await import('./helpers/cargar-ts.mjs');
 const {arcanoDe}=cargarDependencia('codices');
 const item=fixture('habilidad');
 const html=vista(item);
 assert.match(html,/class="cx-tarot[ "]/);
 assert.match(html,/aria-pressed="false"/);
 assert.ok(html.includes(`>${arcanoDe(item.id).romano}<`),'muestra el arcano');
 assert.match(html,/Lectura/);
 assert.match(html,/is-reverso"[^>]*aria-hidden="true"/);
});

test('tarot: lectura de acciones y tirada de prueba',()=>{
 const html=vista(fixture('habilidad',{configuracion_dados:[tajo]}));
 assert.match(html,/Tajo/);assert.match(html,/2d6/);assert.match(html,/3 PH/);assert.match(html,/Lanzar/);
});

test('tarot: La portan',()=>{
 const h=fixture('habilidad',{id:'h'});
 const html=vista(h,[h,fixture('personaje',{id:'pj',nombre:'Axel Kuro',habilidades:['h']})]);
 assert.match(html,/La portan/);assert.match(html,/Abrir Axel Kuro/);
});

test('la raíz del códice usa un modificador que no choca con las piezas',()=>{
 const html=vista(fixture('habilidad'));
 assert.match(html,/class="cg-detail cx-codice cx-codice--tarot /);
});

const monstruo=(extra={})=>fixture('personaje',{id:'m',nombre:'Gorveth',tipo:'bestia',...extra});

test('bestiario: libro con portada, marcapáginas y navegación',()=>{
 const m=monstruo({stats:{vida:40},historia:'Despertó en el norte.',configuracion_monstruo:{variantes:[
  {id:'v1',nombre:'Cría',peso:1,bonos:{},habilidades:[],pasivas:[],equipamiento:{}},
  {id:'v2',nombre:'Anciano',peso:3,bonos:{vida:20},habilidades:[],pasivas:[],equipamiento:{}}]}});
 const html=vista(m);
 assert.match(html,/aria-roledescription="libro"/);
 assert.match(html,/Gorveth/);
 // lámina, ficha de campo, cría, anciano, crónica, ficha = 6
 assert.match(html,/Página 1 de 6/);
 for(const cinta of ['Lámina','Ficha de campo','Variantes','Crónica','Ficha'])assert.ok(html.includes(`>${cinta}<`),cinta);
 assert.match(html,/<button[^>]*disabled=""[^>]*>[^<]*<svg[^>]*>.*?<\/svg>Anterior/s);
});

test('bestiario: un monstruo vacío solo tiene portada y ficha',()=>{
 const html=vista(monstruo());
 assert.match(html,/Página 1 de 2/);
 assert.doesNotMatch(html,/>Variantes</);
 assert.doesNotMatch(html,/>Anatomía</);
});

test('reliquia: vitrina, espacio, consumible y despertar del artefacto',()=>{
 const html=vista(fixture('objeto',{slot_tipo:'casco',consumible:true,configuracion_artefacto:{niveles:[
  {nivel:1,nombre:'Despertar',condicion_subida:null,cambios:{}},
  {nivel:2,nombre:'Hambre',condicion_subida:{tipo:'contador',contador:'armas devoradas',meta:4},cambios:{stats:{dano:2}}}]}}));
 assert.match(html,/class="cx-vitrina/);
 for(const t of ['Cabeza','Consumible','Despertar del artefacto','Inicial','4 armas devoradas','dano +2'])assert.ok(html.includes(t),t);
});

test('sello: lacre con nombre grabado y ritual',()=>{
 const html=vista(fixture('pasiva',{reglas_pasivas:[{id:'r',nombre:'Piel',evento:'recibir_dano',condicion:'vida_mitad',reduccion_pct:20}]}));
 assert.match(html,/role="img"/);assert.match(html,/<textPath/);assert.match(html,/aria-label="Sello de Pulmones de dragón"/);
 for(const t of ['Ritual','Al recibir daño','Vida a la mitad','Reduce 20% de daño'])assert.ok(html.includes(t),t);
});

test('edicto: estandarte, proclama y heráldica',()=>{
 const html=vista(fixture('titulo',{stats:{fuerza:2},descripcion:'Quien cobra el paso.'}));
 assert.match(html,/class="cx-estandarte/);
 assert.match(html,/Por decreto de Kuroi/);
 assert.match(html,/cx-escudo">\+2</);
});

test('pergamino: rollo con el nombre como título',()=>{
 const html=vista(fixture('otro'));
 assert.match(html,/cx-rollo/);assert.match(html,/<h2[^>]*>Reliquia sin nombre<\/h2>/);
});

test('expediente: retrato, medallones, grimorio, arsenal y talismanes',()=>{
 const h=fixture('habilidad',{id:'h',nombre:'Tajo'}),p=fixture('pasiva',{id:'p',nombre:'Piel'}),o=fixture('objeto',{id:'o',nombre:'Yelmo',slot_tipo:'casco'});
 const pj=fixture('personaje',{habilidades:['h'],pasivas:['p'],equipamiento:{casco:'o'},stats:{vida:18,armadura:8,fatiga:5}});
 const html=vista(pj,[pj,h,p,o]);
 assert.match(html,/class="cx-mesa cx-mesa-expediente/);
 for(const t of ['Grimorio','Arsenal','Talismanes','Cabeza','aria-label="Mano derecha: vacío"','y3-medallon'])assert.ok(html.includes(t),t);
 assert.match(html,/cx-mini-tarot[ "]/);assert.match(html,/cx-mini-sello[ "]/);assert.match(html,/cx-mini-reliquia[ "]/);
 assert.match(html,/Preparar batalla/);
});

test('rastro: migas con la creación actual marcada',()=>{
 const a=fixture('personaje',{id:'a',nombre:'Axel'}),b=fixture('habilidad',{id:'b',nombre:'Tajo'});
 const html=vista(b,[a,b],{rastro:['a','b'],irA:()=>{}});
 assert.match(html,/aria-label="Rastro de creaciones"/);
 assert.match(html,/<button type="button">Axel<\/button>/);
 assert.match(html,/<span aria-current="page">Tajo<\/span>/);
});

test('taller de códices: pestañas, reglas editables, vista previa y guardado',async()=>{
 const {cargarDependencia}=await import('./helpers/cargar-ts.mjs');
 const {configuracionBase}=cargarDependencia('codices');
 const h=fixture('habilidad',{id:'h',nombre:'Tajo'});
 const html=renderizar('components/codices/TallerCodices.tsx','default',{
  config:configuracionBase(),origen:'local',error:'',guardando:false,
  props:propsBase([h],{clasificaciones:[{clave:'fuego',nombre:'Fuego'}]}),
  onGuardar:async()=>true,onCerrar:()=>{},
 });
 for(const t of ['Taller de códices','Asignación','Códices','Movimiento','Archivo','Añadir regla','Vista previa','Guardar configuración','Solo en este navegador'])assert.ok(html.includes(t),t);
 assert.match(html,/role="tablist"/);
 assert.match(html,/<option value="fuego">Fuego<\/option>/);
 assert.match(html,/Arrastrar reglas de asignación/);
 assert.match(html,/cx-codice--tarot/,'la vista previa usa el borrador');
 assert.doesNotMatch(html,/Eliminar creación/,'la vista previa no ofrece acciones reales');
});
