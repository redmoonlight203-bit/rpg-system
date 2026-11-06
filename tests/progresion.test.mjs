import {test} from 'node:test';
import assert from 'node:assert/strict';
import {esMonstruo,escalarMalla,experienciaParaNivel,nivelPorExperiencia} from '../lib/progresion.ts';
const categorias=[
 {id:'m',clave:'monstruos'},
 {id:'s',clave:'monstruos_generales',parent_id:'m'},
 {id:'l',clave:'lobo',parent_id:'s'},
 {id:'r',clave:'razas'},
 {id:'h',clave:'humanos',parent_id:'r'}
];
test('todas las especies bajo Monstruos son mallas por herencia',()=>{
 assert.equal(esMonstruo(categorias,'monstruos_generales'),true);
 assert.equal(esMonstruo(categorias,'lobo'),true);
 assert.equal(esMonstruo(categorias,'humanos'),false);
 assert.equal(esMonstruo(categorias,'desconocido'),false);
});
test('el nivel 1 usa mínimos, el nivel máximo usa máximos',()=>{
 const stats={vida:{min:10,max:110},armadura:{min:1,max:21}};
 assert.deepEqual(escalarMalla(stats,1,20,()=>.5),{vida:10,armadura:1});
 assert.deepEqual(escalarMalla(stats,20,20,()=>.5),{vida:110,armadura:21});
 assert.deepEqual(escalarMalla(stats,99,20,()=>.5),{vida:110,armadura:21});
 assert.deepEqual(escalarMalla(stats,-10,20,()=>.5),{vida:10,armadura:1});
});
test('el nivel intermedio tiene escala proporcionada y pequeñas variaciones',()=>{
 const stats={vida:{min:10,max:110}};
 const medio=escalarMalla(stats,10,20,()=>.5).vida;
 const bajo=escalarMalla(stats,10,20,()=>0).vida;
 const alto=escalarMalla(stats,10,20,()=>1).vida;
 assert.ok(bajo<medio&&medio<alto);
 assert.ok(medio>=10&&medio<=110);
 assert.equal(escalarMalla(stats,10,20,()=>.5).vida,medio);
});
test('las estadísticas enteras no producen decimales',()=>{
 assert.equal(Number.isInteger(escalarMalla({hp:{min:15,max:50}},5,20,()=>.73).hp),true);
 assert.equal(escalarMalla({ph:{min:2.5,max:4.75}},20,20).ph,4.75);
});
test('la experiencia aumenta con umbrales deterministas sin sobrepasar nivel máximo',()=>{
 assert.equal(experienciaParaNivel(1),0);
 assert.equal(experienciaParaNivel(2),100);
 assert.equal(experienciaParaNivel(3),300);
 assert.equal(nivelPorExperiencia(0),1);
 assert.equal(nivelPorExperiencia(99),1);
 assert.equal(nivelPorExperiencia(100),2);
 assert.equal(nivelPorExperiencia(299),2);
 assert.equal(nivelPorExperiencia(300),3);
 assert.equal(nivelPorExperiencia(1e10),100);
});
