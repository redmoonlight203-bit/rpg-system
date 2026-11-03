import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:k=>deps[k],crypto,Set});return exports;}
const stats=load('../lib/estadisticas.ts'),c=load('../lib/creacion.ts',{'./estadisticas':stats}),r=load('../lib/reglas.ts');
const d=load('../lib/descripciones.ts',{'./creacion':c});
const e={id:'basico',nombre:'Ataque desarmado',efecto:'dano',cantidad:1,caras:4,modificador:0,tipo_dano:'físico',estado:'',duracion:0,coste_ph:0};
test('ataque desarmado se explica como un puñetazo y omite valores irrelevantes',()=>{const a=d.describirEfecto(e);assert.equal(a.resumen,'Ataca con el puño.');assert.equal(a.detalles.join(' '),'Daño: 1d4.');});
test('una descripción propia tiene prioridad, sin ocultar el coste real',()=>{const a=d.describirEfecto({...e,descripcion:'Golpea con tu mano de piedra.',coste_ph:2,coste_fatiga:1});assert.equal(a.resumen,'Golpea con tu mano de piedra.');assert.match(a.detalles.join(' '),/Consume 2 PH/);assert.match(a.detalles.join(' '),/Genera 1 de Fatiga/);});
test('creaciones antiguas conservan la explicación elemental y la salvación',()=>{const a=d.describirEfecto({...e,nombre:'Llama',tipo_dano:'fuego'});assert.match(a.resumen,/fuego/);assert.match(a.detalles.join(' '),/1d4 de daño de fuego/);assert.match(a.detalles.join(' '),/salvación de 12/);});
test('no anuncia un elemento cuando se configura explícitamente ninguno',()=>{const a=d.describirEfecto({...e,nombre:'Golpe',tipo_dano:'fuego',elemento:'ninguno'});assert.doesNotMatch(a.resumen,/fuego/);});
test('curación fija no muestra dados inexistentes y explica su límite',()=>{const a=d.describirEfecto({...e,efecto:'curacion',cantidad:0,modificador:8});assert.match(a.resumen,/sin superar/);assert.equal(a.detalles[0],'Vida recuperada: 8.');});
test('reglas complejas explican salvaciones y efectos sin identificadores internos',()=>{const a=d.describirRegla({...r.nuevaRegla(),efectos:[{tipo:'salvacion',destino:'yo',atributo:'salvacion',cd:12}]});assert.match(a.resumen,/salvación/);assert.doesNotMatch(a.resumen,/perder_accion|Regla activa/);});
test('validadores admiten descripciones cortas y rechazan las inválidas',()=>{assert.equal(c.validarEfectos([{...e,descripcion:'Ataca con el puño.'}]),null);assert.notEqual(c.validarEfectos([{...e,descripcion:42}]),null);const regla={...r.nuevaRegla(),descripcion:'Protege al aliado.',efectos:[{tipo:'mensaje',destino:'yo',nombre:'Protección'}]};assert.equal(r.validarReglas([regla]),null);assert.notEqual(r.validarReglas([{...regla,descripcion:'x'.repeat(2001)}]),null);});
