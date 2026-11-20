import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {razasDisponibles,validarPropuestaRaza,atributosPropuestaIniciales}=cargarDependencia('personajes');
const cats=[{id:'r',clave:'razas',nombre:'Razas'},{id:'h',clave:'humanos',nombre:'Humanos',parent_id:'r'},
 {id:'u1',clave:'unica_a',nombre:'Sombras',parent_id:'r',raza_unica_de:'yo'},{id:'u2',clave:'unica_b',nombre:'Ajena',parent_id:'r',raza_unica_de:'otro'},
 {id:'a',clave:'armas',nombre:'Armas'}];
const base=[{categoria:'razas',clave:'vida',etiqueta:'Vida',valor_defecto:20,limite_jugador:30},{categoria:'razas',clave:'ph',etiqueta:'PH',valor_defecto:5,limite_jugador:null},{categoria:'humanos',clave:'vida',etiqueta:'Vida',valor_defecto:22,limite_jugador:30}];
test('cada jugador ve las razas de lista y solo sus razas únicas',()=>{
 assert.deepEqual(razasDisponibles(cats,'yo').map(c=>c.id).sort(),['h','u1']);
 assert.deepEqual(razasDisponibles(cats,'otro').map(c=>c.id).sort(),['h','u2']);
});
test('la raíz razas no es elegible',()=>{assert.ok(!razasDisponibles(cats,'yo').some(c=>c.clave==='razas'));});
test('la propuesta parte de los atributos de la raíz razas',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(atributosPropuestaIniciales(base))),{vida:{valor_defecto:20,limite_jugador:30},ph:{valor_defecto:5,limite_jugador:null}});
});
test('validación de la propuesta de raza única',()=>{
 const ok={nombre:'Sombras',descripcion:'',imagen_url:'/arte/razas/x.webp',atributos:{vida:{valor_defecto:30,limite_jugador:40}},pasiva_racial:null};
 assert.equal(validarPropuestaRaza(ok,base,true,true),null);
 assert.match(validarPropuestaRaza(ok,base,true,false),/advertencia/);
 assert.equal(validarPropuestaRaza({...ok,imagen_url:null},base,false,false),null,'el borrador puede guardarse sin imagen');
 assert.match(validarPropuestaRaza({...ok,imagen_url:null},base,true,true),/imagen/);
 assert.match(validarPropuestaRaza({...ok,nombre:'  '},base,false,false),/nombre/);
 assert.match(validarPropuestaRaza({...ok,atributos:{fisico:{valor_defecto:1,limite_jugador:null}}},base,false,false),/no existe/);
 assert.match(validarPropuestaRaza({...ok,atributos:{vida:{valor_defecto:30,limite_jugador:10}}},base,false,false),/límite/);
 assert.match(validarPropuestaRaza({...ok,atributos:{vida:{valor_defecto:0,limite_jugador:null}}},base,true,true),/vida/);
 assert.match(validarPropuestaRaza({...ok,pasiva_racial:{nombre:'Velo',descripcion:'',reglas:[],reglas_pasivas:[]}},base,false,false),/pasiva/);
});
