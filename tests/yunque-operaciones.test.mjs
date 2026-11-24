import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {aplicar,copiar,conexionValida}=cargarDependencia('yunque-operaciones');
const {aGrafo}=cargarDependencia('yunque-grafo');
const {validarEfectos,nuevoEfecto}=cargarDependencia('creacion');
const {validarReglas}=cargarDependencia('reglas');
const {validarPasivas}=cargarDependencia('pasivas');
const {vacio}=cargarDependencia('yunque-borrador');
const F=JSON.parse(readFileSync(new URL('./fixtures/yunque-borradores.json',import.meta.url),'utf8'));
const json=x=>JSON.parse(JSON.stringify(x));
const sinIds=x=>JSON.stringify(x,(k,v)=>k==='id'?undefined:v);
const base=()=>{const b=json(vacio());b.nombre='Prueba';b.tipo='habilidad';return b;};
const ctx={creaciones:[]};

test('fijar cambia solo la ruta indicada',()=>{
 const b=json(F.objeto),antes=json(b);
 const r=aplicar(b,{op:'fijar',ruta:['efectos',0,'caras'],valor:12});
 assert.equal(r.efectos[0].caras,12);
 assert.deepEqual(json(b),antes,'no muta la entrada');
 const esperado=json(antes);esperado.efectos[0].caras=12;
 assert.deepEqual(json(r),esperado);
 assert.throws(()=>aplicar(b,{op:'fijar',ruta:['efectos',9,'caras'],valor:1}),/no existe/);
 assert.throws(()=>aplicar(b,{op:'fijar',ruta:['__proto__','x'],valor:1}),/no permitida/);
});
test('agregar accion añade nuevoEfecto() al final de efectos',()=>{
 const b=json(F.objeto);
 const r=aplicar(b,{op:'agregar',tipo:'accion',padre:'nucleo'});
 assert.equal(r.efectos.length,b.efectos.length+1);
 const nuevo=r.efectos.at(-1),ref=nuevoEfecto();
 assert.deepEqual(json({...nuevo,id:0}),json({...ref,id:0}));
 assert.ok(nuevo.id);
});
test('agregar módulos deja un efecto que valida y aparece en el grafo',()=>{
 for(const t of ['alcance','salvacion','estado','reaccion','transformacion','recurso','vfx','tabla_armas','vision']){
  const b=base();b.efectos=[{...nuevoEfecto(),nombre:'Golpe'}];
  const id='accion:'+b.efectos[0].id;
  const r=aplicar(b,{op:'agregar',tipo:t,padre:id});
  assert.equal(validarEfectos(r.efectos),null,t);
  const g=aGrafo(r,ctx);
  assert.ok(g.nodos.some(n=>n.tipo===t&&n.error===null),t+' en grafo sin error');
  assert.throws(()=>aplicar(r,{op:'agregar',tipo:t,padre:id}),/ya tiene/,t);
  const q=aplicar(r,{op:'quitar',nodo:`${t}:${b.efectos[0].id}`});
  assert.ok(!aGrafo(q,ctx).nodos.some(n=>n.tipo===t),'quitar '+t);
  assert.equal(validarEfectos(q.efectos),null,'quitar '+t);
 }
 const b=base();assert.throws(()=>aplicar(b,{op:'agregar',tipo:'alcance'}),/Indica bajo qué nodo/);
});
test('agregar cuando, si y pasiva',()=>{
 let b=base();
 b=aplicar(b,{op:'agregar',tipo:'cuando'});
 const rid=b.reglas[0].id;
 assert.equal(b.reglas[0].condicion.tipo,'siempre');
 b=aplicar(b,{op:'agregar',tipo:'si',padre:'cuando:'+rid});
 assert.equal(b.reglas[0].condicion.tipo,'probabilidad');
 assert.throws(()=>aplicar(b,{op:'agregar',tipo:'si',padre:'cuando:'+rid}),/ya tiene condición/);
 b=aplicar(b,{op:'fijar',ruta:['reglas',0,'condicion'],valor:{tipo:'todas',condiciones:[]}});
 b=aplicar(b,{op:'agregar',tipo:'si',padre:'si:'+rid});
 assert.equal(b.reglas[0].condicion.condiciones.length,1);
 b=aplicar(b,{op:'agregar',tipo:'entonces',padre:'si:'+rid});
 assert.equal(validarReglas(b.reglas),null);
 b=aplicar(b,{op:'agregar',tipo:'pasiva',padre:'nucleo'});
 assert.equal(validarPasivas(b.reglas_pasivas),null);
 assert.equal(b.reglas_pasivas.length,1);
 assert.throws(()=>aplicar(b,{op:'agregar',tipo:'vinculo'}),/Usa la colección para enlazar creaciones/);
});
test('agregar entonces bajo un si añade un EfectoRegla a la regla correcta, y bajo rama fallo a fallo[]',()=>{
 const b=json(F.personaje??F.objeto);
 let x=base();
 x=aplicar(x,{op:'agregar',tipo:'cuando'});x=aplicar(x,{op:'agregar',tipo:'cuando'});
 const [r0,r1]=x.reglas.map(r=>r.id);
 x=aplicar(x,{op:'agregar',tipo:'entonces',padre:'si:'+r1});
 assert.equal(x.reglas[0].efectos.length,0);
 assert.equal(x.reglas[1].efectos.length,1);
 x=aplicar(x,{op:'fijar',ruta:['reglas',1,'efectos',0],valor:{tipo:'salvacion',destino:'yo',cd:12,atributo:'salvacion',exito:[],fallo:[]}});
 const sid=`entonces:${r1}:0`;
 x=aplicar(x,{op:'agregar',tipo:'entonces',padre:sid,rama:'fallo'});
 assert.equal(x.reglas[1].efectos[0].fallo.length,1);
 assert.equal(x.reglas[1].efectos[0].exito.length,0);
 assert.throws(()=>aplicar(x,{op:'agregar',tipo:'entonces',padre:sid}),/rama/);
 assert.equal(validarReglas(x.reglas.slice(1)),null);
 void b;void r0;
});
test('quitar núcleo lanza «El núcleo no se puede quitar»',()=>{
 assert.throws(()=>aplicar(base(),{op:'quitar',nodo:'nucleo'}),/El núcleo no se puede quitar/);
});
test('quitar acción, regla, pasiva, condición y efecto',()=>{
 let b=base();
 b=aplicar(b,{op:'agregar',tipo:'accion'});b=aplicar(b,{op:'agregar',tipo:'accion'});
 const [a0,a1]=b.efectos.map(e=>e.id);
 b=aplicar(b,{op:'quitar',nodo:'accion:'+a0});
 assert.deepEqual(b.efectos.map(e=>e.id),[a1]);
 b=aplicar(b,{op:'agregar',tipo:'cuando'});const rid=b.reglas[0].id;
 b=aplicar(b,{op:'agregar',tipo:'si',padre:'cuando:'+rid});
 b=aplicar(b,{op:'quitar',nodo:'si:'+rid});
 assert.equal(b.reglas[0].condicion.tipo,'siempre');
 b=aplicar(b,{op:'agregar',tipo:'entonces',padre:'si:'+rid});
 b=aplicar(b,{op:'quitar',nodo:`entonces:${rid}:0`});
 assert.equal(b.reglas[0].efectos.length,0);
 b=aplicar(b,{op:'quitar',nodo:'cuando:'+rid});
 assert.equal(b.reglas.length,0);
 assert.throws(()=>aplicar(b,{op:'quitar',nodo:'accion:zzz'}),/No existe el nodo/);
});
test('duplicar acción genera ids nuevos y copia todos los campos',()=>{
 const b=json(F.antigua);
 const r=aplicar(b,{op:'duplicar',nodo:'accion:'+b.efectos[0].id});
 assert.equal(r.efectos.length,2);
 assert.notEqual(r.efectos[1].id,b.efectos[0].id);
 assert.equal(sinIds(r.efectos[1]),sinIds(b.efectos[0]));
 const t=json(F.habilidad);const tr=base();
 tr.efectos=[{...nuevoEfecto(),nombre:'T'}];
 const id='accion:'+tr.efectos[0].id;
 const con=aplicar(tr,{op:'agregar',tipo:'transformacion',padre:id});
 const dup=aplicar(con,{op:'duplicar',nodo:id});
 const [o,c]=dup.efectos;
 assert.notEqual(c.transformacion.id,o.transformacion.id);
 assert.notEqual(c.transformacion.etapas[0].id,o.transformacion.etapas[0].id);
 assert.equal(sinIds(c),sinIds(o));
 assert.throws(()=>aplicar(con,{op:'duplicar',nodo:'transformacion:'+tr.efectos[0].id}),/no se puede duplicar/);
 void t;
});
test('duplicar efecto de regla regenera ids anidados',()=>{
 let b=base();b=aplicar(b,{op:'agregar',tipo:'cuando'});const rid=b.reglas[0].id;
 b=aplicar(b,{op:'agregar',tipo:'entonces',padre:'si:'+rid});
 b=aplicar(b,{op:'fijar',ruta:['reglas',0,'efectos',0],valor:{tipo:'habilidad',destino:'yo',accion:{...nuevoEfecto(),nombre:'X'}}});
 const r=aplicar(b,{op:'duplicar',nodo:`entonces:${rid}:0`});
 assert.equal(r.reglas[0].efectos.length,2);
 assert.notEqual(r.reglas[0].efectos[1].accion.id,r.reglas[0].efectos[0].accion.id);
 const d=aplicar(b,{op:'duplicar',nodo:'cuando:'+rid});
 assert.notEqual(d.reglas[1].id,rid);
});
test('copiar + pegar entre borradores distintos conserva los datos',()=>{
 const origen=json(F.antigua),destino=base();
 const frag=copiar(origen,'accion:'+origen.efectos[0].id);
 const r=aplicar(destino,{op:'pegar',fragmento:frag});
 assert.equal(sinIds(r.efectos[0]),sinIds(origen.efectos[0]));
 assert.notEqual(r.efectos[0].id,origen.efectos[0].id);
 // módulo: reacción
 const o=json(F.objeto);
 const fr=copiar(o,'reaccion:e-lanzada');
 let d=base();d.efectos=[{...nuevoEfecto(),nombre:'Y'}];
 d=aplicar(d,{op:'pegar',fragmento:fr,padre:'accion:'+d.efectos[0].id});
 assert.deepEqual(json(d.efectos[0].reaccion),json(o.efectos[0].reaccion));
 assert.throws(()=>copiar(o,'nucleo'),/núcleo/);
});
test('conexionValida rechaza estado→cuando y acepta accion→alcance',()=>{
 const g=aGrafo(json(F.objeto),ctx);
 const accion=g.nodos.find(n=>n.id==='accion:e-lanzada'),alcance=g.nodos.find(n=>n.id==='alcance:e-lanzada');
 const modulos=accion.puertos.find(p=>p.id==='modulos');
 assert.equal(conexionValida(modulos,alcance.puertos[0],'alcance'),true);
 assert.equal(conexionValida(modulos,{id:'entrada',lado:'entrada',acepta:['nucleo']},'cuando'),false);
 const estadoSalida={id:'x',lado:'salida',acepta:['estado']};
 assert.equal(conexionValida(estadoSalida,{id:'entrada',lado:'entrada',acepta:['nucleo']},'cuando'),false);
 assert.equal(conexionValida(alcance.puertos[0],modulos,'accion'),false);
});
test('editar otra acción conserva defensa, axioma, portal, suelo, vuelo, ley_limitless y companero_magico de una acción antigua',()=>{
 const b=json(F.antigua);
 const antigua={...b.efectos[0],axioma:true,portal:true,suelo:true,vuelo:true,ley_limitless:true,companero_magico:'luz'};
 b.efectos=[antigua,{...nuevoEfecto(),nombre:'Otra'}];
 const copia=json(b.efectos[0]);
 let r=aplicar(b,{op:'fijar',ruta:['efectos',1,'nombre'],valor:'Otra editada'});
 assert.deepEqual(json(r.efectos[0]),copia);
 r=aplicar(r,{op:'agregar',tipo:'vfx',padre:'accion:'+b.efectos[1].id});
 r=aplicar(r,{op:'quitar',nodo:'accion:'+b.efectos[1].id});
 assert.deepEqual(json(r.efectos[0]),copia);
 assert.equal(r.efectos[0].defensa,'absorcion');
});

test('estado/transformación/tabla_armas solo sobre acciones de daño y excluyentes',()=>{
 const b=base();b.efectos=[{...nuevoEfecto(),nombre:'A',efecto:'curacion'}];
 const id=b.efectos[0].id;
 assert.throws(()=>aplicar(b,{op:'agregar',tipo:'estado',padre:'accion:'+id}),/ya es de tipo Curación; crea otra acción/);
 const c=base();c.efectos=[{...nuevoEfecto(),nombre:'A'}];
 const cid='accion:'+c.efectos[0].id;
 const e=aplicar(c,{op:'agregar',tipo:'estado',padre:cid});
 assert.throws(()=>aplicar(e,{op:'agregar',tipo:'transformacion',padre:cid}),/ya es de tipo Estado/);
 assert.throws(()=>aplicar(e,{op:'agregar',tipo:'tabla_armas',padre:cid}),/ya es de tipo Estado/);
 assert.equal(json(aplicar(e,{op:'quitar',nodo:'estado:'+c.efectos[0].id}).efectos[0]).efecto,'dano');
 for(const t of ['estado','transformacion','tabla_armas']){
  const r=aplicar(aplicar(c,{op:'agregar',tipo:t,padre:cid}),{op:'quitar',nodo:`${t}:${c.efectos[0].id}`});
  assert.equal(r.efectos[0].efecto,'dano',t);
 }
 const r=aplicar(e,{op:'quitar',nodo:'estado:'+c.efectos[0].id});
 assert.equal(JSON.stringify(r.efectos[0]),JSON.stringify(c.efectos[0]));
});
test('quitar transformación o tabla de armas solo vuelve a «daño» la acción de ese tipo',()=>{
 const conModulos=efecto=>{const b=base();b.efectos=[{...nuevoEfecto(),efecto,transformacion:{nombre:'Forma de lobo'},tabla_armas:{caras:4,armas:[]}}];return b;};
 // Acción antigua de curación con módulos colgados: conserva su tipo.
 let b=conModulos('curacion');const id=b.efectos[0].id;
 b=aplicar(b,{op:'quitar',nodo:'transformacion:'+id});
 assert.equal(b.efectos[0].efecto,'curacion');assert.equal(b.efectos[0].transformacion,undefined);
 b=aplicar(b,{op:'quitar',nodo:'tabla_armas:'+id});
 assert.equal(b.efectos[0].efecto,'curacion');assert.equal(b.efectos[0].tabla_armas,undefined);
 // Las acciones del propio tipo del módulo sí vuelven a «daño».
 const t=conModulos('transformacion');assert.equal(aplicar(t,{op:'quitar',nodo:'transformacion:'+t.efectos[0].id}).efectos[0].efecto,'dano');
 const a=conModulos('crear_arma');assert.equal(aplicar(a,{op:'quitar',nodo:'tabla_armas:'+a.efectos[0].id}).efectos[0].efecto,'dano');
});

// ---- Plantillas vivas: despliegue, marcas y desvincular ----
test('desplegar inserta todos los fragmentos con ids nuevos y origen',()=>{
 const r=aplicar(base(),{op:'desplegar',plantilla:'furia-temporal'});
 assert.equal(r.reglas.length,2);
 assert.ok(r.reglas.every(x=>x.id!=='plantilla-miasma'&&x.id!=='plantilla-miasma-fin'));
 assert.notEqual(r.reglas[0].id,r.reglas[1].id);
 assert.equal(r.reglas[0].origen.version,1);
 assert.equal(r.reglas[0].origen.fragmento,'plantilla-miasma');
 assert.throws(()=>aplicar(base(),{op:'desplegar',plantilla:'nada'}),/ya no existe/);
});
test('fijar sobre un nodo desplegado marca el campo',()=>{
 const b=aplicar(base(),{op:'desplegar',plantilla:'golpe-quemadura'});
 const r=aplicar(b,{op:'fijar',ruta:['efectos',0,'cantidad'],valor:5});
 assert.deepEqual(json(r.efectos[0].origen.editados),['cantidad']);
});
test('cambios estructurales también se marcan',()=>{
 let b=aplicar(base(),{op:'desplegar',plantilla:'curar-al-matar'});
 const si=aGrafo(b,ctx).nodos.find(n=>n.tipo==='si');
 b=aplicar(b,{op:'agregar',tipo:'entonces',padre:si?si.id:'cuando:'+b.reglas[0].id});
 assert.ok(b.reglas[0].origen.editados.includes('efectos'));
 let c=aplicar(base(),{op:'desplegar',plantilla:'golpe-quemadura'});
 const al=aGrafo(c,ctx).nodos.find(n=>n.tipo==='alcance');
 c=aplicar(c,{op:'quitar',nodo:al.id});
 assert.ok(c.efectos[0].origen.editados.includes('tablero'));
});
test('desvincular quita el origen y nada más',()=>{
 const b=aplicar(base(),{op:'desplegar',plantilla:'golpe-quemadura'});
 const r=aplicar(b,{op:'desvincular',nodo:'accion:'+b.efectos[0].id});
 assert.equal(r.efectos[0].origen,undefined);
 const {origen,...resto}=b.efectos[0];
 assert.deepEqual(json(r.efectos[0]),json(resto));
 assert.throws(()=>aplicar(r,{op:'desvincular',nodo:'accion:'+r.efectos[0].id}),/no viene de una plantilla/);
});
test('duplicar conserva el origen',()=>{
 const b=aplicar(base(),{op:'desplegar',plantilla:'golpe-quemadura'});
 const r=aplicar(b,{op:'duplicar',nodo:'accion:'+b.efectos[0].id});
 assert.equal(r.efectos.length,2);
 assert.deepEqual(json(r.efectos[1].origen),json(b.efectos[0].origen));
});
