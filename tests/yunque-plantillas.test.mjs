import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {PLANTILLAS}=cargarDependencia('yunque-plantillas');
const {aplicar}=cargarDependencia('yunque-operaciones');
const {aGrafo}=cargarDependencia('yunque-grafo');
const {vacio}=cargarDependencia('yunque-borrador');
const {validarEfectos}=cargarDependencia('creacion');
const {validarReglas}=cargarDependencia('reglas');
const {validarPasivas}=cargarDependencia('pasivas');
const {validarTactica,PLANTILLAS_REACCION}=cargarDependencia('combate');
const {crearArena}=cargarDependencia('yunque-arena');
const json=x=>JSON.parse(JSON.stringify(x));
const ctx={creaciones:[]};
const pegar=(b,p)=>p.fragmentos.reduce((x,fragmento)=>aplicar(x,{op:'pegar',fragmento,padre:'nucleo'}),b);
const borrador=tipo=>{const b=json(vacio());b.nombre='Prueba';b.tipo=tipo;return b;};

test('las plantillas pedidas están todas, con las cinco defensas de Kion',()=>{
 const nombres=PLANTILLAS.map(p=>p.nombre);
 for(const n of ['Golpe con quemadura','Escudo que absorbe y devuelve','Barrera contra hechizos','Curar al matar','Furia temporal','Despertar con poca vida','Teletransporte'])assert.ok(nombres.includes(n),n);
 assert.equal(new Set(PLANTILLAS.map(p=>p.id)).size,PLANTILLAS.length,'ids únicos');
 for(const k of Object.keys(PLANTILLAS_REACCION)){
  const p=PLANTILLAS.find(x=>x.id==='kion-'+k);
  assert.ok(p,k);
  assert.deepEqual(json(p.fragmentos[0].datos.reaccion),json(PLANTILLAS_REACCION[k]),k);
 }
 for(const p of PLANTILLAS)assert.ok(p.nombre&&p.descripcion&&p.fragmentos.length,p.id);
});

test('cada plantilla pasa su validador al pegarla en un borrador vacío del tipo adecuado',()=>{
 for(const p of PLANTILLAS){
  const b=pegar(borrador(p.para),p);
  assert.equal(b.efectos.length+b.reglas.length+b.reglas_pasivas.length,p.fragmentos.length,p.id);
  assert.equal(validarEfectos(b.efectos),null,p.id);
  for(const e of b.efectos)assert.equal(validarTactica(e),null,p.id);
  assert.equal(validarReglas(b.reglas),null,p.id);
  assert.equal(validarPasivas(b.reglas_pasivas)??null,null,p.id);
  const errores=aGrafo(b,ctx).nodos.filter(n=>n.error);
  assert.deepEqual(json(errores.map(n=>`${n.id}: ${n.error}`)),[],p.id);
  const arena=crearArena(b,{creaciones:[],stats:{}});
  assert.equal(arena.error,undefined,`${p.id}: ${arena.error}`);
 }
});

test('pegar una plantilla dos veces genera ids distintos',()=>{
 for(const p of PLANTILLAS){
  const b=pegar(pegar(borrador(p.para),p),p);
  const ids=[...b.efectos.map(e=>e.id),...b.reglas.map(r=>r.id),...b.reglas_pasivas.map(x=>x.id)];
  assert.equal(ids.length,p.fragmentos.length*2,p.id);
  assert.equal(new Set(ids).size,ids.length,p.id);
  for(const f of p.fragmentos)assert.ok(!ids.includes(f.datos.id),`${p.id}: no reutiliza el id de la plantilla`);
  assert.equal(validarReglas(b.reglas),null,p.id);
  const nodos=aGrafo(b,ctx).nodos.map(n=>n.id);
  assert.equal(new Set(nodos).size,nodos.length,`${p.id}: nodos únicos`);
 }
 // Pegar no muta la plantilla.
 const antes=json(PLANTILLAS);pegar(borrador('habilidad'),PLANTILLAS[0]);
 assert.deepEqual(json(PLANTILLAS),antes);
});

test('en la arena: el golpe quema, el teletransporte golpea y el Escudo Astral guarda y devuelve',()=>{
 const {usar,golpeame}=cargarDependencia('yunque-arena');
 const arena=id=>{const p=PLANTILLAS.find(x=>x.id===id);const r=crearArena(pegar(borrador(p.para),p),{creaciones:[],stats:{}});assert.ok(r.combate,r.error);return r.combate;};
 const m=(c,id)=>c.miembros.find(x=>x.id===id);
 const {acciones}=cargarDependencia('combate');
 const primera=c=>acciones(m(c,'doll')).find(a=>a.id.startsWith('hab:')).id;
 for(const id of ['golpe-quemadura','teletransporte']){
  const c=arena(id);
  const n=usar(c,primera(c),'saco',()=>1);
  assert.ok(m(n,'saco').vida<60,`${id}: el saco pierde vida`);
 }
 const fuego=arena('golpe-quemadura'),quemado=usar(fuego,primera(fuego),'saco',()=>1);
 assert.ok(m(quemado,'saco').estados.some(e=>e.tipo==='quemadura'),'deja una quemadura');
 const escudo=golpeame(arena('escudo-astral'),{cantidad:2,caras:8,naturaleza:'magica'},()=>6);
 assert.equal(40-m(escudo,'doll').vida,6,'detiene la mitad de 12');
 assert.equal(m(escudo,'doll').recursos_especiales['Energía astral'],6,'guarda lo detenido');
 assert.equal(m(escudo,'saco').vida,60-6,'devuelve lo detenido al saco');
});
