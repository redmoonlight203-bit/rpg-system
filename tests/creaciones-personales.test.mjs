import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const p=cargarDependencia('creaciones-personales');
const lista=x=>JSON.parse(JSON.stringify(x));

const kion={id:'kion',nombre:'Kion Vaelthorne',tipo_creacion:'personaje'};
const mao={id:'mao',nombre:'Mao',tipo_creacion:'personaje'};
const items=[
 {id:'1',nombre:'Puño Inercial',personal_de:'kion'},
 {id:'2',nombre:'Bola de Fuego',personal_de:null},
 {id:'3',nombre:'Azul'},
 {id:'4',nombre:'Ancla Inercial',personal_de:'kion'},
 {id:'5',nombre:'Llama de Mao',personal_de:'mao'},
];
const todas=[kion,mao,...items];

test('el ámbito depende de quién mira',()=>{
 assert.equal(p.ambitoDe(items[0],'kion'),'propia');
 assert.equal(p.ambitoDe(items[0],'mao'),'ajena');
 assert.equal(p.ambitoDe(items[0],null),'ajena');
 assert.equal(p.ambitoDe(items[1],'kion'),'general');
 assert.equal(p.ambitoDe(items[2],'kion'),'general');
 assert.equal(p.duenoDe(items[0],todas),'Kion Vaelthorne');
 assert.equal(p.duenoDe(items[1],todas),null);
});

test('al crear a Kion salen primero sus habilidades, luego las generales y al final las de otros',()=>{
 const g=lista(p.agruparPorAmbito(items,{id:'kion',nombre:'Kion Vaelthorne'},todas));
 assert.deepEqual(g.map(x=>x.titulo),['Personales de Kion Vaelthorne','Generales','Personales de Mao']);
 assert.deepEqual(g[0].items.map(x=>x.nombre),['Ancla Inercial','Puño Inercial']);
 assert.deepEqual(g[1].items.map(x=>x.nombre),['Azul','Bola de Fuego']);
});

test('con otro personaje, las de Kion no se mezclan con las generales',()=>{
 const g=lista(p.agruparPorAmbito(items,{id:'mao',nombre:'Mao'},todas));
 assert.deepEqual(g.map(x=>x.titulo),['Personales de Mao','Generales','Personales de Kion Vaelthorne']);
 assert.ok(!g[1].items.some(x=>x.nombre==='Puño Inercial'));
 // Un personaje nuevo (sin id) no tiene propias.
 assert.equal(lista(p.agruparPorAmbito(items,{nombre:''},todas))[0].titulo,'Generales');
});

test('filtro de la galería y lista de dueños',()=>{
 assert.deepEqual(lista(p.filtrarAmbito(items,'generales')).map(x=>x.id),['2','3']);
 assert.deepEqual(lista(p.filtrarAmbito(items,'personales')).map(x=>x.id),['1','4','5']);
 assert.deepEqual(lista(p.filtrarAmbito(items,'kion')).map(x=>x.id),['1','4']);
 assert.equal(p.filtrarAmbito(items,'todas').length,5);
 assert.deepEqual(lista(p.duenosConPersonales(items,todas)),[{id:'kion',nombre:'Kion Vaelthorne',cantidad:2},{id:'mao',nombre:'Mao',cantidad:1}]);
});

test('validación del borrador',()=>{
 const personajes=[kion,mao];
 assert.equal(p.errorPersonal({tipo:'habilidad',personal_de:null},personajes),null);
 assert.equal(p.errorPersonal({tipo:'habilidad',personal_de:'kion'},personajes),null);
 assert.match(p.errorPersonal({tipo:'personaje',personal_de:'kion'},personajes),/personaje no puede/);
 assert.match(p.errorPersonal({id:'x',tipo:'habilidad',personal_de:'x'},[...personajes,{id:'x',tipo_creacion:'habilidad'}]),/sí misma/);
 assert.match(p.errorPersonal({tipo:'habilidad',personal_de:'nadie'},personajes),/ya no existe/);
});

test('la migración marca a Kion salvo Bola de Fuego, Azul, Rojo y Morado',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261121100000_creaciones_personales.sql',import.meta.url),'utf8');
 assert.match(sql,/add column if not exists personal_de uuid/);
 assert.match(sql,/aa386a13-fec2-59b5-bd77-1fa6424fec28/);
 for(const nombre of ['Bola de Fuego','Azul','Rojo','Morado'])assert.ok(sql.includes(`'${nombre}'`),nombre);
});

test('el Grimorio de un personaje agrupa su colección: suyas, generales y de otros',()=>{
 const g=cargarDependencia('yunque-grimorio');
 const enlazables=[{id:'1',nombre:'Puño Inercial',tipo:'habilidad',personal_de:'kion'},{id:'2',nombre:'Bola de Fuego',tipo:'habilidad'},{id:'5',nombre:'Llama de Mao',tipo:'habilidad',personal_de:'mao'}];
 const piezas=lista(g.piezasVinculo(enlazables,{id:'kion',nombre:'Kion Vaelthorne'},[kion,mao]));
 assert.deepEqual(piezas.map(x=>[x.nombre,x.grupo]),[['Puño Inercial','Personales de Kion Vaelthorne'],['Bola de Fuego','Generales'],['Llama de Mao','Personales de Mao']]);
 // Sin personaje (otras creaciones) no hay grupos.
 assert.equal(lista(g.piezasVinculo(enlazables))[0].grupo,undefined);
});
