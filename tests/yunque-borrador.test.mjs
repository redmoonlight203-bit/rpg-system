import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {vacio,vinculoVacio}=cargarDependencia('yunque-borrador');
const CLAVES=['formas','icono','naturalezaVinculo','ramaMonstruo','monstruo','nivelMaximo','invocacion','requisitos_uso','consumible','nombre','tipo','clasificacion','descripcion','historia','requisitos','defectos','imagen','clase','malla','slot','stats','rangos','efectos','habilidades','pasivas','reglas','reglas_pasivas','equipamiento','alma','venta','precio'];
test('vacio() devuelve el borrador inicial del Yunque',()=>{
 const b=vacio();
 assert.deepEqual(Object.keys(b).sort(),[...CLAVES].sort());
 assert.equal(b.tipo,'objeto');
 assert.equal(b.nivelMaximo,20);
 assert.equal(b.slot,'ninguno');
 assert.notEqual(vacio().efectos,vacio().efectos);
 assert.notEqual(vacio().naturalezaVinculo,vacio().naturalezaVinculo);
});
test('vinculoVacio() devuelve un vínculo en blanco',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(vinculoVacio())),{naturaleza_id:'',origen:'',bestia:'',sello:'',notas:''});
});
