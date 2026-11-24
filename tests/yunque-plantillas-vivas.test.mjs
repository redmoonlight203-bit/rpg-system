import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {PLANTILLAS}=cargarDependencia('yunque-plantillas');
const {aplicar}=cargarDependencia('yunque-operaciones');
const {vacio}=cargarDependencia('yunque-borrador');
const {validarEfectos}=cargarDependencia('creacion');
const {actualizarFragmento,actualizarDesdePlantillas,lineaCambio}=cargarDependencia('yunque-plantillas-vivas');
const json=x=>JSON.parse(JSON.stringify(x));
const base=()=>{const b=json(vacio());b.nombre='Prueba';b.tipo='habilidad';return b;};
const con=id=>aplicar(base(),{op:'desplegar',plantilla:id});
const nueva=(id,fn,version=2)=>{const l=structuredClone(PLANTILLAS);const p=l.find(x=>x.id===id);p.version=version;fn(p);return l;};

test('campo no editado se actualiza; editado se conserva y se anota',()=>{
 let b=con('golpe-quemadura');
 b=aplicar(b,{op:'fijar',ruta:['efectos',0,'cantidad'],valor:4});
 const l=nueva('golpe-quemadura',p=>{p.fragmentos[0].datos.cantidad=3;p.fragmentos[0].datos.caras=10;});
 const r=actualizarDesdePlantillas(b,l);
 assert.equal(r.borrador.efectos[0].caras,10);
 assert.equal(r.borrador.efectos[0].cantidad,4);
 const c=json(r.cambios[0]);
 assert.equal(c.tipo,'actualizado');assert.equal(c.desde,1);assert.equal(c.hasta,2);
 assert.deepEqual(c.actualizados,['caras']);assert.deepEqual(c.conservados,['cantidad']);
 assert.equal(c.nodo,'accion:'+b.efectos[0].id);
 assert.equal(r.borrador.efectos[0].origen.version,2);
 assert.deepEqual(json(r.borrador.efectos[0].origen.editados),json(b.efectos[0].origen.editados));
});

test('misma versión: no cambia nada',()=>{
 const b=con('golpe-quemadura');
 const r=actualizarDesdePlantillas(b,structuredClone(PLANTILLAS));
 assert.equal(r.borrador,b);assert.equal(r.cambios.length,0);
});

test('plantilla borrada: nodo intacto y aviso sin_plantilla',()=>{
 const b=con('golpe-quemadura');
 const l=PLANTILLAS.filter(p=>p.id!=='golpe-quemadura');
 const r=actualizarDesdePlantillas(b,l);
 assert.equal(r.borrador,b);
 assert.equal(r.cambios[0].tipo,'sin_plantilla');
 assert.equal(r.cambios[0].hasta,null);
 assert.equal(actualizarDesdePlantillas(b,l).cambios.length,1,'se avisa cada vez');
});

test('fragmento quitado: aviso sin_fragmento',()=>{
 const b=con('furia-temporal');
 const l=nueva('furia-temporal',p=>{p.fragmentos.pop();});
 const r=actualizarDesdePlantillas(b,l);
 assert.equal(r.cambios.length,1);
 assert.equal(r.cambios[0].tipo,'sin_fragmento');
 assert.equal(r.cambios[0].nodo,'cuando:'+b.reglas[1].id);
 assert.equal(r.borrador.reglas[1],b.reglas[1]);
});

test('ids anidados no cuentan como cambio',()=>{
 const b=con('ojo-clan-fases');
 const idsAntes=json(b.efectos[0].transformacion.etapas.map(e=>e.id));
 const l=nueva('ojo-clan-fases',()=>{});
 const r=actualizarDesdePlantillas(b,l);
 assert.equal(r.cambios.length,0);
 const e=r.borrador.efectos[0];
 assert.deepEqual(json(e.transformacion.etapas.map(x=>x.id)),idsAntes);
 const pos=e.transformacion.posesion;
 if(pos)assert.ok(e.transformacion.etapas.some(x=>x.id===pos.etapa_id));
 assert.equal(validarEfectos(r.borrador.efectos),null);
});

test('origen dañado se ignora sin romper',()=>{
 const b=con('golpe-quemadura');
 b.efectos[0].origen.version='x';
 const r=actualizarDesdePlantillas(b,nueva('golpe-quemadura',p=>{p.fragmentos[0].datos.caras=12;}));
 assert.equal(r.borrador,b);assert.equal(r.cambios.length,0);
});

test('campo que la plantilla quita y el GM no tocó desaparece',()=>{
 const b=con('golpe-quemadura');
 assert.ok(b.efectos[0].tablero);
 const r=actualizarDesdePlantillas(b,nueva('golpe-quemadura',p=>{delete p.fragmentos[0].datos.tablero;}));
 assert.equal('tablero' in r.borrador.efectos[0],false);
 assert.deepEqual(json(r.cambios[0].actualizados),['tablero']);
});

test('actualizarFragmento: solo difieren ids, se conserva el valor del nodo',()=>{
 const nodo={id:'a',x:{id:'1',v:1},origen:{plantilla:'p',fragmento:'f',version:1,editados:[]}};
 const r=actualizarFragmento(nodo,{id:'b',x:{id:'2',v:1}},2);
 assert.equal(r.datos.x.id,'1');assert.equal(r.datos.origen.version,2);
 assert.equal(r.actualizados.length,0);assert.equal(r.conservados.length,0);
});

test('lineaCambio devuelve las tres frases exactas',()=>{
 const c={nodo:'accion:1',titulo:'Fuego',plantilla:'p',nombrePlantilla:'Golpe',tipo:'actualizado',desde:1,hasta:2,actualizados:['caras'],conservados:['cantidad','tablero']};
 assert.equal(lineaCambio(c),'«Fuego» (Golpe) pasa de la versión 1 a la 2. Actualizado: caras. Se conserva tu valor en: cantidad, tablero.');
 assert.equal(lineaCambio({...c,actualizados:[],conservados:[]}),'«Fuego» (Golpe) pasa de la versión 1 a la 2.');
 assert.equal(lineaCambio({...c,tipo:'sin_plantilla',hasta:null}),'«Fuego»: la plantilla «Golpe» ya no existe. El nodo se conserva tal cual; conviértelo en nodo propio para dejar de ver este aviso.');
 assert.equal(lineaCambio({...c,tipo:'sin_fragmento',hasta:null}),'«Fuego»: la plantilla «Golpe» ya no incluye esta pieza. El nodo se conserva tal cual; conviértelo en nodo propio para dejar de ver este aviso.');
});

test('no muta el borrador ni las plantillas',()=>{
 let b=con('golpe-quemadura');
 b=aplicar(b,{op:'fijar',ruta:['efectos',0,'cantidad'],valor:4});
 const l=nueva('golpe-quemadura',p=>{p.fragmentos[0].datos.caras=10;});
 const sb=JSON.stringify(b),sl=JSON.stringify(l);
 actualizarDesdePlantillas(b,l);
 assert.equal(JSON.stringify(b),sb);assert.equal(JSON.stringify(l),sl);
});

const {PLANTILLAS_REACCION}=cargarDependencia('reacciones');
test('cada defensa de Kion se despliega enlazada',()=>{
 for(const k of Object.keys(PLANTILLAS_REACCION)){
  const b=con('kion-'+k);
  assert.deepEqual(json(b.efectos[0].origen),{plantilla:'kion-'+k,fragmento:'plantilla-kion-'+k,version:1,editados:[]});
 }
});

test('un cambio en Inercia llega a los nodos sin tocar lo editado',()=>{
 const b=con('kion-inercia');
 const l=nueva('kion-inercia',p=>{p.fragmentos[0].datos.reaccion.principal.salvacion.cd=16;});
 const r=actualizarDesdePlantillas(b,l);
 assert.equal(r.borrador.efectos[0].reaccion.principal.salvacion.cd,16);
 const b2=aplicar(b,{op:'fijar',ruta:['efectos',0,'reaccion'],valor:{disparador:'antes_ser_atacado',principal:{reducir:{modo:'fijo',valor:9}}}});
 const r2=actualizarDesdePlantillas(b2,l);
 assert.equal(r2.borrador.efectos[0].reaccion.principal.reducir.valor,9);
 assert.ok(json(r2.cambios[0].conservados).includes('reaccion'));
});
