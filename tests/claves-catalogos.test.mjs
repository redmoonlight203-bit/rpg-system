import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const k=cargarDependencia('claves');
const c=cargarDependencia('catalogos');
const inm=cargarDependencia('inmunidades');

test('claveDesdeNombre produce claves válidas desde cualquier nombre',()=>{
 assert.equal(k.claveDesdeNombre('Sopor tóxico'),'sopor_toxico');
 assert.equal(k.claveDesdeNombre('  Energía  Astral!! '),'energia_astral');
 assert.equal(k.claveDesdeNombre('3 golpes'),'_3_golpes');
 assert.equal(k.claveDesdeNombre('¡¡¡',"estado"),'estado');
 for(const n of ['Sopor tóxico','3 golpes','Ñandú','x'.repeat(200)])assert.match(k.claveDesdeNombre(n),k.CLAVE_VALIDA);
});

test('claveLibre no pisa claves ocupadas',()=>{
 assert.equal(k.claveLibre('Furia',[]),'furia');
 assert.equal(k.claveLibre('Furia',['furia','furia_2']),'furia_3');
});

test('claveNueva es única y respeta el límite de 40 caracteres de rasgos y recursos',()=>{
 const vistas=new Set();
 for(let i=0;i<200;i++){const v=k.claveNueva('potenciador');assert.match(v,/^[a-z_][a-z0-9_]{0,40}$/);vistas.add(v);}
 assert.ok(vistas.size>190);
 assert.match(k.claveNueva('un prefijo larguísimo que no cabe en ningún sitio'),/^[a-z_][a-z0-9_]{0,40}$/);
});

test('los elementos del catálogo compartido son los del motor',()=>{
 assert.equal(c.OPCIONES_ELEMENTO.map(o=>o.valor).join(','),'fuego,agua,electricidad,hielo,luz_sagrada');
 assert.equal(c.OPCIONES_ELEMENTO_O_NINGUNO[0].valor,'ninguno');
});

test('una etiqueta por atributo',()=>{
 assert.equal(c.cortoAtributo('bono_impacto'),'Precisión');
 assert.equal(c.nombreAtributo('desconocido_x'),'desconocido x');
 assert.equal(new Set(c.ATRIBUTOS_COMBATE.map(a=>a.clave)).size,c.ATRIBUTOS_COMBATE.length);
});

test('el tipo de daño elegido del catálogo lo reconoce la inmunidad',()=>{
 for(const t of c.TIPOS_DANO_INMUNIDAD){
  const r=inm.comprobarInmunidad([{tipo:'dano',valor:t.valor,modo:'bloquear_dano'}],{clase:'dano',tipos:[inm.norm(t.valor)]});
  assert.notEqual(r,'si',`${t.valor} no se bloquea`);
 }
});

test('los tipos de daño antiguos escritos a mano se conservan o se reconocen',()=>{
 assert.equal(c.tipoDanoCanonico('Fuego '),'fuego');
 assert.equal(c.tipoDanoCanonico('Físico'),'fisico');
 assert.equal(c.tipoDanoCanonico('plasma'),'plasma');
 assert.ok(c.opcionesTipoDano('plasma').some(o=>o.valor==='plasma'));
 assert.equal(c.opcionesTipoDano('fuego'),c.TIPOS_DANO);
});
