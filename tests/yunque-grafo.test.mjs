import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {aGrafo,estabilizar}=cargarDependencia('yunque-grafo');
const {describirEfecto,describirReaccion}=cargarDependencia('descripciones');
const {PLANTILLAS_REACCION}=cargarDependencia('yunque-plantillas');
const F=JSON.parse(readFileSync(new URL('./fixtures/yunque-borradores.json',import.meta.url),'utf8'));
const clon=x=>JSON.parse(JSON.stringify(x));
const json=x=>JSON.parse(JSON.stringify(x));
const ctx={creaciones:[
 {id:F.habilidad.id,nombre:F.habilidad.nombre,tipo_creacion:'habilidad'},
 {id:F.pasiva.id,nombre:F.pasiva.nombre,tipo_creacion:'pasiva'},
 {id:F.objeto.id,nombre:F.objeto.nombre,tipo_creacion:'objeto'}]};
const cuenta=(g,tipo)=>g.nodos.filter(n=>n.tipo===tipo).length;
const por=(g,id)=>g.nodos.find(n=>n.id===id);
const conectado=(g,d,h)=>g.cables.some(c=>c.desde.nodo===d&&c.hasta.nodo===h);

test('objeto: núcleo + 2 acciones + módulos presentes y nada más',()=>{
 const g=aGrafo(F.objeto,ctx);
 assert.equal(por(g,'nucleo').frase,`objeto · ${F.objeto.clasificacion}`);
 assert.equal(por(aGrafo({...F.objeto,clasificacion:''},ctx),'nucleo').frase,'objeto');
 const esperado={nucleo:1,accion:2,alcance:1,salvacion:1,reaccion:1,estado:0,transformacion:0,recurso:0,vfx:0,tabla_armas:0,cuando:0,si:0,entonces:0,pasiva:0,vinculo:0,invocacion:0};
 for(const [t,n] of Object.entries(esperado))assert.equal(cuenta(g,t),n,t);
 assert.equal(cuenta(g,'requisitos'),1);
 assert.equal(g.nodos.length,1+2+3+1);
 assert.ok(conectado(g,'nucleo','accion:e-lanzada'));
 assert.ok(conectado(g,'accion:e-lanzada','alcance:e-lanzada'));
 assert.ok(conectado(g,'accion:e-lanzada','reaccion:e-lanzada'));
 assert.equal(por(g,'alcance:e-estocada'),undefined);
});
test('cada acción lleva la frase de describirEfecto',()=>{
 const g=aGrafo(F.objeto,ctx);
 for(const e of F.objeto.efectos)assert.equal(por(g,'accion:'+e.id).frase,describirEfecto(e).resumen);
});
test('regla: cuando→si→entonces conectados en orden, con ramas éxito/fallo en salvación',()=>{
 const b=clon(F.habilidad);
 const g=aGrafo(b,ctx);
 assert.ok(conectado(g,'nucleo','cuando:r-herida'));
 assert.ok(conectado(g,'cuando:r-herida','si:r-herida'));
 assert.ok(conectado(g,'si:r-herida','entonces:r-herida:0'));
 assert.ok(conectado(g,'si:r-herida','entonces:r-herida:1'));
 assert.equal(cuenta(g,'entonces'),2);
 b.reglas[0].efectos=[{tipo:'salvacion',destino:'objetivo',cd:12,atributo:'salvacion',
  exito:[{tipo:'mensaje',destino:'yo',nombre:'Resiste'}],
  fallo:[{tipo:'perder_accion',destino:'objetivo'},{tipo:'dano',destino:'objetivo',valor:3}]}];
 const h=aGrafo(b,ctx);
 const s=por(h,'entonces:r-herida:0');
 assert.deepEqual(json(s.puertos.filter(p=>p.lado==='salida').map(p=>p.id).sort()),['exito','fallo']);
 const desde=(n,p)=>h.cables.filter(c=>c.desde.nodo===n&&c.desde.puerto===p).map(c=>c.hasta.nodo);
 assert.deepEqual(json(desde(s.id,'exito')),['entonces:r-herida:0:exito:0']);
 assert.deepEqual(json(desde(s.id,'fallo')),['entonces:r-herida:0:fallo:0','entonces:r-herida:0:fallo:1']);
 assert.equal(por(h,'entonces:r-herida:0:fallo:1').ruta.join('/'),'reglas/0/efectos/0/fallo/1');
});
test('condiciones anidadas generan nodos si con índice',()=>{
 const b=clon(F.titulo);
 b.reglas[0].condicion={tipo:'todas',condiciones:[{tipo:'estado',sujeto:'yo',estado:'x'},{tipo:'no',condicion:{tipo:'probabilidad',porcentaje:50}}]};
 const g=aGrafo(b,ctx);
 assert.ok(conectado(g,'si:t-honor','si:t-honor:0'));
 assert.ok(conectado(g,'si:t-honor','si:t-honor:1'));
 assert.ok(conectado(g,'si:t-honor:1','si:t-honor:1:0'));
});
test('pasivas, personaje con vínculos, invocación y requisitos',()=>{
 const p=aGrafo(F.pasiva,ctx);
 assert.equal(cuenta(p,'pasiva'),2);
 assert.ok(conectado(p,'nucleo','pasiva:p-corteza'));
 const pj=aGrafo(F.personaje,ctx);
 for(const id of ['vinculo:habilidad:'+F.habilidad.id,'vinculo:pasiva:'+F.pasiva.id,'vinculo:mano_der:'+F.objeto.id]){assert.ok(por(pj,id),id);assert.ok(conectado(pj,'nucleo',id));}
 assert.equal(por(pj,'vinculo:habilidad:'+F.habilidad.id).titulo,F.habilidad.nombre);
 assert.equal(cuenta(pj,'requisitos'),0);
 const h=aGrafo(F.habilidad,ctx);
 assert.ok(por(h,'invocacion'));assert.ok(por(h,'requisitos'));
 assert.equal(cuenta(aGrafo(F.monstruo,ctx),'invocacion'),0);
 for(const k of ['titulo','otro'])assert.equal(cuenta(aGrafo(F[k],ctx),'requisitos'),1);
});
test('un efecto inválido marca su nodo con el mensaje del validador',()=>{
 const b=clon(F.objeto);
 assert.equal(por(aGrafo(b,ctx),'accion:e-estocada').error,null);
 b.efectos[1].caras=0;
 const g=aGrafo(b,ctx);
 assert.ok(por(g,'accion:e-estocada').error);
 assert.equal(por(g,'accion:e-lanzada').error,null);
});
test('regla inválida y reacción inválida marcan sus nodos',()=>{
 const b=clon(F.habilidad);
 b.reglas[0].efectos[0].valor={dados:1,caras:1};
 const g=aGrafo(b,ctx);
 assert.equal(por(g,'entonces:r-herida:0').error,'De 2 a 1000 caras.');
 assert.equal(por(g,'entonces:r-herida:1').error,null);
 assert.equal(por(g,'si:r-herida').error,null);
 const o=clon(F.objeto);o.efectos[0].reaccion={prioridad:500,principal:{reducir:{modo:'mitad'}}};
 assert.ok(por(aGrafo(o,ctx),'reaccion:e-lanzada').error);
});
test('defensa antigua aparece como nodo reaccion con la plantilla PLANTILLAS_REACCION',()=>{
 const g=aGrafo(F.antigua,ctx);
 const n=por(g,'reaccion:a-absorcion');
 assert.ok(n);assert.equal(n.tipo,'reaccion');
 assert.equal(F.antigua.efectos[0].reaccion,undefined);
 assert.equal(F.antigua.efectos[0].defensa,'absorcion');
 assert.equal(n.error,null);
 assert.equal(n.ruta.join('/'),'efectos/0/defensa');
 assert.equal(n.frase,describirReaccion(PLANTILLAS_REACCION.absorcion,F.antigua.efectos[0].coste_ph||0));
 assert.notEqual(n.frase,describirReaccion(PLANTILLAS_REACCION.inercia));
});
test('vínculo a creación inexistente: error «ya no está en La Creación»',()=>{
 const g=aGrafo(F.personaje,{creaciones:[]});
 const n=por(g,'vinculo:habilidad:'+F.habilidad.id);
 assert.ok(n);assert.match(n.error,/ya no está en La Creación/);
 assert.equal(por(aGrafo(F.personaje,ctx),'vinculo:habilidad:'+F.habilidad.id).error,null);
});
test('ids estables y aGrafo no muta el borrador',()=>{
 for(const [k,b] of Object.entries(F)){
  const antes=JSON.stringify(b);
  const a=aGrafo(b,ctx),c=aGrafo(b,ctx);
  assert.deepEqual(json(a.nodos.map(n=>n.id)),json(c.nodos.map(n=>n.id)),k);
  assert.equal(new Set(a.nodos.map(n=>n.id)).size,a.nodos.length,k+' ids únicos');
  assert.equal(JSON.stringify(b),antes,k);
  const ids=new Set(a.nodos.map(n=>n.id));
  for(const cab of a.cables){assert.ok(ids.has(cab.desde.nodo)&&ids.has(cab.hasta.nodo),k+' cable '+cab.id);
   assert.ok(a.nodos.find(n=>n.id===cab.desde.nodo).puertos.some(p=>p.id===cab.desde.puerto&&p.lado==='salida'),k+' puerto desde '+cab.id);
   assert.ok(a.nodos.find(n=>n.id===cab.hasta.nodo).puertos.some(p=>p.id===cab.hasta.puerto&&p.lado==='entrada'),k+' puerto hasta '+cab.id);}
  assert.equal(new Set(a.cables.map(x=>x.id)).size,a.cables.length,k+' cables únicos');
 }
});
test('un vínculo a una creación archivada se marca «ya no está en La Creación»',()=>{
 const b=clon(F.personaje);
 const archivado={creaciones:ctx.creaciones.map(c=>({...c,estado:c.id===F.habilidad.id?'archivado':'aprobado'}))};
 const g=aGrafo(b,archivado);
 const roto=g.nodos.find(n=>n.id===`vinculo:habilidad:${F.habilidad.id}`);
 assert.ok(roto,'el vínculo sigue en el grafo');
 assert.equal(roto.error,'Esta creación ya no está en La Creación.');
 assert.equal(roto.titulo,'Creación desconocida');
 const pasiva=g.nodos.find(n=>n.id===`vinculo:pasiva:${F.pasiva.id}`);
 assert.equal(pasiva?.error,null,'las aprobadas siguen válidas');
});
test('un borrador malformado (datos antiguos) no rompe aGrafo',()=>{
 const b=clon(F.habilidad);
 b.nombre=undefined;
 b.efectos=[{id:'e-viejo',efecto:'dano'},null];
 b.reglas=[{id:'r-sin-nada',evento:'impactar'},{id:'r-todas',evento:'impactar',condicion:{tipo:'todas'},efectos:[{tipo:'salvacion'},null]},{id:'r-no',evento:'impactar',condicion:{tipo:'no'},efectos:[]},null];
 b.reglas_pasivas=[{id:'p-vieja'}];
 let g;
 assert.doesNotThrow(()=>{g=aGrafo(b,ctx);});
 assert.ok(g.nodos.some(n=>n.id==='accion:e-viejo'));
 assert.ok(g.nodos.some(n=>n.id==='si:r-sin-nada'),'sin condición se trata como «siempre»');
 assert.ok(g.nodos.some(n=>n.id==='si:r-no:0'),'«No» sin condición dentro no rompe');
 assert.ok(g.nodos.some(n=>n.id==='pasiva:p-vieja'&&n.error),'la pasiva vieja se marca con error');
 assert.equal(g.nodos.find(n=>n.id==='nucleo').titulo,'Sin nombre');
});

test('estabilizar conserva los nodos y cables sin cambios y devuelve el mismo grafo si nada cambió',()=>{
 const b=clon(F.objeto),g1=aGrafo(b,ctx);
 assert.equal(estabilizar(null,g1),g1);
 assert.equal(estabilizar(g1,aGrafo(clon(b),ctx)),g1);
 const c=clon(b);c.efectos[0].nombre='Otro nombre';
 const g2=estabilizar(g1,aGrafo(c,ctx));
 assert.notEqual(g2,g1);
 assert.deepEqual(json(g2),json(aGrafo(c,ctx)));
 const id='accion:'+c.efectos[0].id;
 for(const n of g2.nodos){const previo=g1.nodos.find(x=>x.id===n.id);if(n.id===id||n.id==='nucleo')continue;assert.equal(n,previo,n.id);}
 assert.notEqual(g2.nodos.find(n=>n.id===id),g1.nodos.find(n=>n.id===id));
 assert.equal(g2.nodos.find(n=>n.id===id).titulo,'Otro nombre');
 g2.cables.forEach((k,i)=>assert.equal(k,g1.cables[i]));
 // Quitar una acción: el grafo cambia de tamaño y los nodos que quedan conservan su objeto.
 const d=clon(b);d.efectos.splice(1,1);
 const g3=estabilizar(g1,aGrafo(d,ctx));
 assert.deepEqual(json(g3),json(aGrafo(d,ctx)));
 assert.equal(g3.nodos.find(n=>n.id===id),g1.nodos.find(n=>n.id===id));
});

// --- Sello de plantilla ---
const {aplicar:aplicarOp}=cargarDependencia('yunque-operaciones');
const {vacio:vacioB}=cargarDependencia('yunque-borrador');
const {MENSAJE_ORIGEN}=cargarDependencia('yunque-origen');
const baseHab=()=>{const b=json(vacioB());b.nombre='Prueba';b.tipo='habilidad';return b;};
const desplegada=()=>aplicarOp(baseHab(),{op:'desplegar',plantilla:'golpe-quemadura'});
test('nodo desplegado lleva su plantilla',()=>{
 const b=desplegada();
 const g=aGrafo(b,{creaciones:[]});
 const n=por(g,'accion:'+b.efectos[0].id);
 assert.deepEqual(json(n.plantilla),{id:'golpe-quemadura',nombre:'Golpe con quemadura',version:1,huerfana:false});
 assert.equal(por(g,'nucleo').plantilla,undefined);
 const propio=aGrafo(F.objeto,ctx);
 assert.ok(propio.nodos.every(x=>x.plantilla===undefined));
});
test('plantilla inexistente: huerfana true y sin error',()=>{
 const b=desplegada();b.efectos[0].origen.plantilla='ya-no-existe';
 const n=por(aGrafo(b,{creaciones:[]}),'accion:'+b.efectos[0].id);
 assert.deepEqual(json(n.plantilla),{id:'ya-no-existe',nombre:'ya-no-existe',version:1,huerfana:true});
 assert.equal(n.error,null);
});
test('origen dañado: error MENSAJE_ORIGEN',()=>{
 const b=desplegada();b.efectos[0].origen.version='3';
 const n=por(aGrafo(b,{creaciones:[]}),'accion:'+b.efectos[0].id);
 assert.equal(n.error,MENSAJE_ORIGEN);
 assert.equal(n.plantilla,undefined);
});
test('estabilizar distingue un cambio de plantilla',()=>{
 const b=desplegada();
 const g1=aGrafo(b,{creaciones:[]});
 const c=json(b);c.efectos[0].origen.plantilla='ya-no-existe';
 const g2=estabilizar(g1,aGrafo(c,{creaciones:[]}));
 const id='accion:'+b.efectos[0].id;
 assert.notEqual(por(g2,id),por(g1,id));
 assert.equal(por(g2,id).plantilla.huerfana,true);
 assert.equal(estabilizar(g1,aGrafo(json(b),{creaciones:[]})),g1);
});
test('el núcleo de un personaje ofrece «Acciones del personaje»',()=>{
 const nucleo=g=>por(g,'nucleo').puertos.find(p=>p.id==='acciones');
 assert.equal(nucleo(aGrafo(F.personaje,ctx)).etiqueta,'Acciones del personaje');
 assert.equal(nucleo(aGrafo(F.objeto,ctx)).etiqueta,'Acciones');
 const b=clon(F.personaje);b.efectos=[clon(F.objeto.efectos[0])];
 const g=aGrafo(b,ctx);
 assert.ok(por(g,'accion:'+b.efectos[0].id));assert.ok(conectado(g,'nucleo','accion:'+b.efectos[0].id));
 assert.ok(por(g,'vinculo:habilidad:'+F.habilidad.id));
});
