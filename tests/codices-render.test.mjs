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
