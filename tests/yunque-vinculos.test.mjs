import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {planEnlazar,planMoverEquipo,ponerEquipo,huecoLibre,huecosCompatibles}=cargarDependencia('yunque-vinculos');
const {aplicar}=cargarDependencia('yunque-operaciones');
const {aGrafo}=cargarDependencia('yunque-grafo');
const {piezasVinculo,enlazableDe,planSoltar,piezaPermitida}=cargarDependencia('yunque-grimorio');
const F=JSON.parse(readFileSync(new URL('./fixtures/yunque-borradores.json',import.meta.url),'utf8'));
const json=x=>JSON.parse(JSON.stringify(x));
const ESPADA={id:'espada',nombre:'Espada',tipo:'objeto',slot_tipo:'mano'};
const MANDOBLE={id:'mandoble',nombre:'Mandoble',tipo:'objeto',slot_tipo:'dos_manos'};
const ANILLO={id:'anillo',nombre:'Anillo',tipo:'objeto',slot_tipo:'accesorio'};
const CATALOGO=[ESPADA,MANDOBLE,ANILLO];
const pj=()=>{const b=json(F.personaje);b.equipamiento={};b.habilidades=[];b.pasivas=[];return b;};
const hacer=(b,ops)=>ops.reduce((x,o)=>aplicar(x,o),b);

test('ponerEquipo: dos manos libera la otra mano y una pieza normal desplaza a un arma a dos manos',()=>{
 assert.deepEqual(json(ponerEquipo({mano_izq:'espada'},'mano_der','mandoble',CATALOGO)),{mano_der:'mandoble'});
 assert.deepEqual(json(ponerEquipo({mano_der:'mandoble'},'mano_izq','espada',CATALOGO)),{mano_izq:'espada'});
 assert.deepEqual(json(ponerEquipo({mano_der:'espada',casco:'x'},'mano_der','',CATALOGO)),{casco:'x'});
});
test('huecoLibre elige el primer hueco libre compatible',()=>{
 assert.equal(huecoLibre({mano_der:'espada'},'mano'),'mano_izq');
 assert.equal(huecoLibre({acc_1:'a',acc_2:'b'},'accesorio'),'acc_3');
 assert.equal(huecoLibre({mano_der:'espada'},'dos_manos'),'mano_der');
 assert.deepEqual(json(huecosCompatibles('ninguno')),[]);
});
test('enlazar un objeto en un hueco crea el nodo vinculo:<hueco>:<id>',()=>{
 const b=hacer(pj(),planEnlazar(pj(),ESPADA,'mano_der',CATALOGO));
 assert.equal(b.equipamiento.mano_der,'espada');
 assert.ok(aGrafo(b,{creaciones:CATALOGO}).nodos.some(n=>n.id==='vinculo:mano_der:espada'));
});
test('sin hueco, el objeto busca uno libre; si ya estaba equipado, se mueve',()=>{
 let b=hacer(pj(),planEnlazar(pj(),ESPADA,undefined,CATALOGO));
 assert.equal(b.equipamiento.mano_der,'espada');
 b=hacer(b,planEnlazar(b,ESPADA,'mano_izq',CATALOGO));
 assert.deepEqual(json(b.equipamiento),{mano_izq:'espada'});
 assert.throws(()=>planEnlazar(b,ESPADA,'mano_izq',CATALOGO),/ya está en Mano izquierda/);
});
test('un hueco incompatible o un objeto que no se equipa se rechazan con un mensaje claro',()=>{
 assert.throws(()=>planEnlazar(pj(),ANILLO,'casco',CATALOGO),/no cabe en Cabeza: va en Accesorio 1/);
 assert.throws(()=>planEnlazar(pj(),{id:'p',nombre:'Poción',tipo:'objeto',slot_tipo:'ninguno'},undefined,CATALOGO),/no se equipa/);
 assert.throws(()=>planEnlazar(pj(),{id:'k',nombre:'Kion',tipo:'personaje'},undefined,CATALOGO),/no se enlaza/);
 const objeto=json(F.objeto);
 assert.throws(()=>planEnlazar(objeto,ESPADA,undefined,CATALOGO),/Solo los personajes/);
});
test('habilidades y pasivas se suman a su lista una sola vez y no van en huecos',()=>{
 const h={id:'h',nombre:'Tajo',tipo:'habilidad'};
 const b=hacer(pj(),planEnlazar(pj(),h,undefined,CATALOGO));
 assert.deepEqual(json(b.habilidades),['h']);
 assert.throws(()=>planEnlazar(b,h,undefined,CATALOGO),/ya está enlazada/);
 assert.throws(()=>planEnlazar(pj(),h,'mano_der',CATALOGO),/no es equipo/);
 const p=hacer(pj(),planEnlazar(pj(),{id:'s',nombre:'Piel',tipo:'pasiva'},undefined,CATALOGO));
 assert.deepEqual(json(p.pasivas),['s']);
});
test('mover una pieza de hueco respeta la compatibilidad',()=>{
 const b=hacer(pj(),planEnlazar(pj(),ESPADA,'mano_der',CATALOGO));
 assert.deepEqual(json(hacer(b,planMoverEquipo(b,'mano_der','mano_izq',CATALOGO)).equipamiento),{mano_izq:'espada'});
 assert.throws(()=>planMoverEquipo(b,'mano_der','casco',CATALOGO),/no cabe en Cabeza/);
});
test('quitar un vínculo lo desenlaza sin tocar lo demás',()=>{
 const b=json(F.personaje);
 const sinEspada=aplicar(b,{op:'quitar',nodo:'vinculo:mano_der:'+F.objeto.id});
 assert.deepEqual(json(sinEspada.equipamiento),{});
 assert.deepEqual(sinEspada.habilidades,b.habilidades);
 const sinHab=aplicar(b,{op:'quitar',nodo:'vinculo:habilidad:'+F.habilidad.id});
 assert.deepEqual(json(sinHab.habilidades),[]);
 assert.deepEqual(json(aplicar(b,{op:'quitar',nodo:'vinculo:pasiva:'+F.pasiva.id}).pasivas),[]);
});
test('piezas de la colección para enlazar: solo creaciones enlazables y solo en personajes',()=>{
 const piezas=piezasVinculo([ESPADA,{id:'k',nombre:'Kion',tipo:'personaje'},{id:'h',nombre:'Tajo',tipo:'habilidad',clase:'C'}]);
 assert.deepEqual(piezas.map(p=>p.clave),['vinculo:espada','vinculo:h']);
 assert.match(piezas[0].ayuda,/Equipo · una mano/);
 assert.equal(enlazableDe(piezas[1]).id,'h');
 assert.equal(piezaPermitida(piezas[0],['cuando','vinculo']),true);
 assert.equal(piezaPermitida(piezas[0],['accion','cuando']),false);
 assert.throws(()=>planSoltar(pj(),piezas[0],null),/planEnlazar/);
});
