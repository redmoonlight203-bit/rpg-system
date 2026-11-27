import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {PIEZAS,piezasColeccion,piezaPermitida,planSoltar,probarSoltar}=cargarDependencia('yunque-grimorio');
const {aplicar}=cargarDependencia('yunque-operaciones');
const {aGrafo}=cargarDependencia('yunque-grafo');
const {describirRegla}=cargarDependencia('descripciones');
const {vacio}=cargarDependencia('yunque-borrador');
const F=JSON.parse(readFileSync(new URL('./fixtures/yunque-borradores.json',import.meta.url),'utf8'));
const json=x=>JSON.parse(JSON.stringify(x));
const ctx={creaciones:[]};
const pieza=nombre=>PIEZAS.find(p=>p.nombre===nombre)??assert.fail('falta la pieza '+nombre);
const soltar=(b,p,destino)=>{const ops=planSoltar(b,p,destino);assert.ok(ops,'debe tener plan');return ops.reduce((x,o)=>aplicar(x,o),b);};
const base=(tipo='habilidad')=>{const b=json(vacio());b.nombre='Prueba';b.tipo=tipo;return b;};
const por=(b,id)=>aGrafo(b,ctx).nodos.find(n=>n.id===id);

test('el grimorio tiene las familias pedidas, los 15 eventos y los 13 efectos de regla',()=>{
 const familias=new Set(PIEZAS.map(p=>p.familia));
 for(const f of ['acciones','modulos','eventos','condiciones','efectos','pasivas','plantillas'])assert.ok(familias.has(f),f);
 assert.equal(PIEZAS.filter(p=>p.familia==='eventos').length,15);
 assert.equal(PIEZAS.filter(p=>p.familia==='efectos').length,13);
 assert.equal(new Set(PIEZAS.map(p=>p.clave)).size,PIEZAS.length,'claves únicas');
 for(const n of ['Al impactar','Vida < 50 %','Curar'])pieza(n);
});
test('cada pieza simple crea un nodo válido donde corresponde',()=>{
 for(const p of PIEZAS.filter(p=>['acciones','modulos','eventos','pasivas'].includes(p.familia))){
  let b=base(p.familia==='pasivas'?'objeto':'habilidad');
  if(p.familia==='modulos'&&p.tipo!=='invocacion')b=soltar(b,pieza('Ataque'),null);
  const destino=p.familia==='modulos'&&p.tipo!=='invocacion'?{nodo:'accion:'+b.efectos[0].id}:null;
  const r=soltar(b,p,destino);
  const g=aGrafo(r,ctx),nuevos=g.nodos.filter(n=>!aGrafo(b,ctx).nodos.some(m=>m.id===n.id));
  assert.ok(nuevos.length>=1,p.clave);
  if(p.familia!=='eventos')for(const n of nuevos)assert.equal(n.error,null,`${p.clave}: ${n.error}`);
 }
 for(const p of PIEZAS.filter(p=>p.familia==='condiciones'||p.familia==='efectos')){
  let b=soltar(base(),pieza('Al impactar'),null);
  if(p.familia==='condiciones')b=soltar(b,pieza('Curar'),{nodo:'cuando:'+b.reglas[0].id});
  const r=soltar(b,p,{nodo:'cuando:'+b.reglas[0].id});
  const g=aGrafo(r,ctx);
  if(!['Todas','Alguna'].includes(p.nombre))for(const n of g.nodos.filter(n=>n.tipo!=='nucleo'&&n.tipo!=='requisitos'))assert.equal(n.error,null,`${p.clave} → ${n.id}: ${n.error}`);
 }
});
test('regla arrastrando «Al impactar», «Vida < 50 %» y «Curar»',()=>{
 let b=base();
 assert.equal(planSoltar(b,pieza('Vida < 50 %'),null),null,'una condición en el vacío queda sin conectar');
 b=soltar(b,pieza('Al impactar'),null);
 assert.equal(b.reglas.length,1);assert.equal(b.reglas[0].evento,'impactar');
 const id=b.reglas[0].id;
 b=soltar(b,pieza('Vida < 50 %'),{nodo:'cuando:'+id});
 assert.deepEqual(json(b.reglas[0].condicion),{tipo:'comparar',sujeto:'yo',atributo:'vida_actual',operador:'<',valor:50,porcentaje:true});
 b=soltar(b,pieza('Curar'),{nodo:'si:'+id});
 assert.equal(b.reglas[0].efectos[0].tipo,'curar');
 const g=aGrafo(b,ctx);
 const cable=(d,h)=>g.cables.some(c=>c.desde.nodo===d&&c.hasta.nodo===h);
 assert.ok(cable('nucleo','cuando:'+id)&&cable('cuando:'+id,'si:'+id)&&cable('si:'+id,'entonces:'+id+':0'));
 assert.ok(por(b,'cuando:'+id).frase.includes(describirRegla(b.reglas[0]).resumen));
});
test('soltar condiciones combina, agrupa y niega',()=>{
 let b=soltar(base(),pieza('Al impactar'),null);const id=b.reglas[0].id;
 b=soltar(b,pieza('Vida < 50 %'),{nodo:'cuando:'+id});
 b=soltar(b,pieza('Probabilidad 25 %'),{nodo:'cuando:'+id});
 assert.equal(b.reglas[0].condicion.tipo,'todas');
 assert.deepEqual(json(b.reglas[0].condicion.condiciones.map(c=>c.tipo)),['comparar','probabilidad']);
 b=soltar(b,pieza('Ataque de fuego'),{nodo:'si:'+id});
 assert.equal(b.reglas[0].condicion.condiciones.length,3,'sobre un grupo, se suma');
 b=soltar(b,pieza('No'),{nodo:'si:'+id+':1'});
 assert.deepEqual(json(b.reglas[0].condicion.condiciones[1]),{tipo:'no',condicion:{tipo:'probabilidad',porcentaje:25}});
 let c=soltar(base(),pieza('Al impactar'),null);
 c=soltar(c,pieza('Vida < 50 %'),{nodo:'si:'+c.reglas[0].id});
 assert.equal(c.reglas[0].condicion.tipo,'comparar','sobre «siempre», la sustituye');
});
test('efectos: ramas de éxito y fallo, hermanos y destinos inválidos',()=>{
 let b=soltar(base(),pieza('Al impactar'),null);const id=b.reglas[0].id;
 b=soltar(b,pieza('Tirada de salvación'),{nodo:'si:'+id});
 b=soltar(b,pieza('Perder acción del turno'),{nodo:`entonces:${id}:0`,puerto:'fallo'});
 b=soltar(b,pieza('Registrar mensaje'),{nodo:`entonces:${id}:0`});
 assert.equal(b.reglas[0].efectos[0].fallo[0].tipo,'perder_accion');
 assert.equal(b.reglas[0].efectos[0].exito[0].tipo,'mensaje');
 b=soltar(b,pieza('Curar'),{nodo:`entonces:${id}:0:fallo:0`});
 assert.equal(b.reglas[0].efectos[0].fallo.length,2,'junto a un hermano de la rama');
 b=soltar(b,pieza('Infligir daño directo'),{nodo:`entonces:${id}:0`,puerto:'exito'});
 assert.equal(b.reglas[0].efectos[0].exito.length,2);
 assert.equal(probarSoltar(b,pieza('Curar'),{nodo:'nucleo'}),false);
 assert.equal(probarSoltar(b,pieza('Curar'),{nodo:`cuando:${id}`}),true);
 assert.equal(probarSoltar(b,pieza('Alcance'),{nodo:`cuando:${id}`}),false);
});
test('eventos, módulos e invocación',()=>{
 let b=soltar(base(),pieza('Al impactar'),{nodo:'nucleo'});const id=b.reglas[0].id;
 b=soltar(b,pieza('Al matar a un enemigo'),{nodo:'cuando:'+id});
 assert.equal(b.reglas.length,1);assert.equal(b.reglas[0].evento,'matar','soltar un evento sobre «Cuándo» cambia su evento');
 b=soltar(b,pieza('Ataque'),null);const a=b.efectos[0].id;
 assert.equal(planSoltar(b,pieza('Alcance'),null),null);
 b=soltar(b,pieza('Salvación'),{nodo:'accion:'+a});
 b=soltar(b,pieza('Alcance'),{nodo:'salvacion:'+a});
 assert.ok(b.efectos[0].tablero&&b.efectos[0].salvacion,'un módulo soltado sobre otro va a su acción');
 assert.equal(probarSoltar(b,pieza('Alcance'),{nodo:'accion:'+a}),false,'repetido');
 const cur=soltar(b,pieza('Curación'),null);
 assert.equal(probarSoltar(cur,pieza('Estado'),{nodo:'accion:'+cur.efectos[1].id}),false,'estado solo sobre daño');
 assert.equal(probarSoltar(b,pieza('Estado'),{nodo:'accion:'+a}),true);
 b=soltar(b,pieza('Invocación'),{nodo:'accion:'+a});
 assert.ok(b.invocacion);
});
test('plantillas y colección se suman al núcleo y respetan lo que lleva la creación',()=>{
 const plantilla=PIEZAS.find(p=>p.familia==='plantillas'&&p.fragmentos.length>1&&p.fragmentos.every(f=>f.tipo==='cuando'));
 const b=soltar(base(),plantilla,null);
 assert.equal(b.reglas.length,plantilla.fragmentos.length);
 assert.notEqual(b.reglas[0].id,plantilla.fragmentos[0].datos.id,'ids nuevos');
 assert.throws(()=>planSoltar(b,plantilla,{nodo:'cuando:'+b.reglas[0].id}),/núcleo/);
 const col=piezasColeccion([{...F.objeto,configuracion_dados:F.objeto.efectos,reglas:F.habilidad.reglas,reglas_pasivas:F.pasiva.reglas_pasivas,id:'o1',nombre:'Lanza'}],['accion','cuando']);
 assert.equal(col.length,1);
 assert.deepEqual(json([...new Set(col[0].fragmentos.map(f=>f.tipo))]),['accion','cuando'],'sin pasivas si no las lleva');
 const r=soltar(base(),col[0],null);
 assert.equal(r.efectos.length,F.objeto.efectos.length);
 assert.ok(r.efectos.every(e=>!F.objeto.efectos.some(o=>o.id===e.id)));
 assert.equal(piezasColeccion([{id:'x',nombre:'Vacía',configuracion_dados:[],reglas:[],reglas_pasivas:[]}],['accion']).length,0);
 assert.equal(piezaPermitida(pieza('Alcance'),['cuando']),false);
 assert.equal(piezaPermitida(pieza('Curar'),['cuando']),true);
 assert.equal(piezaPermitida(pieza('Ataque'),['cuando','pasiva']),false);
});
test('frase del nodo «Cuándo» y de la pasiva sin claves crudas',()=>{
 const g=aGrafo(F.habilidad,ctx);
 const r=F.habilidad.reglas[0];
 assert.ok(g.nodos.find(n=>n.id==='cuando:'+r.id).frase.startsWith('Al impactar'));
 const p=aGrafo(F.pasiva,ctx).nodos.find(n=>n.tipo==='pasiva');
 assert.doesNotMatch(p.frase,/_/);
});
test('cambiar el tipo de un efecto nunca borra sus ramas en silencio',()=>{
 const {cambiarTipoEfecto}=cargarDependencia('yunque-grimorio');
 const s={tipo:'salvacion',destino:'objetivo',cd:12,atributo:'salvacion',exito:[{tipo:'mensaje',destino:'yo',nombre:'x'}],fallo:[{tipo:'condicional',destino:'yo',condicion:{tipo:'siempre'},exito:[{tipo:'perder_accion',destino:'yo'}],fallo:[]}]};
 assert.throws(()=>cambiarTipoEfecto(s,'curar'),/perderían 3 efectos/);
 const c=cambiarTipoEfecto(s,'condicional');
 assert.equal(c.tipo,'condicional');
 assert.deepEqual(json(c.exito),json(s.exito));assert.deepEqual(json(c.fallo),json(s.fallo));
 assert.equal(cambiarTipoEfecto({...s,exito:[],fallo:[]},'curar').tipo,'curar','ramas vacías: se puede');
 assert.equal(cambiarTipoEfecto(s,'salvacion'),s);
});

test('soltar una plantilla produce una operación desplegar',()=>{
 const p=PIEZAS.find(x=>x.clave==='plantilla:furia-temporal')??assert.fail('falta la pieza');
 assert.equal(p.plantilla,'furia-temporal');
 assert.deepEqual(json(planSoltar(base(),p,null)),[{op:'desplegar',plantilla:'furia-temporal'}]);
});
test('convertir el ataque Invocar conserva las otras acciones y la criatura configurada',()=>{
 const b=soltar(soltar(base(),pieza('Ataque'),null),pieza('Curación'),null);
 const previo=soltar(b,pieza('Invocación'),null);
 const r=aplicar(previo,{op:'convertir_invocacion',id:b.efectos[0].id});
 assert.deepEqual(r.invocacion,previo.invocacion);
 assert.deepEqual(r.efectos,[previo.efectos[1]]);
 assert.equal(previo.efectos.length,2);
});

test('la familia Pasivas reúne todas las formas de crear una pasiva',()=>{
 const pasivas=PIEZAS.filter(p=>p.familia==='pasivas');
 for(const n of ['Piel de piedra','Defensas e inmunidades','Ataque desarmado propio','Guardia propia','Regla automática'])assert.ok(pasivas.some(p=>p.nombre===n),n);
 for(const tipo of ['personaje','habilidad','objeto','pasiva']){
  for(const nombre of ['Defensas e inmunidades','Ataque desarmado propio','Guardia propia']){
   const p=pieza(nombre);
   const b=soltar(base(tipo),p,null);
   const g=aGrafo(b,ctx);
   const n=g.nodos.find(x=>x.tipo==='accion');
   assert.ok(n&&n.pasivo,`${tipo}/${nombre}: se ve como pasiva`);
   assert.equal(n.error,null,`${tipo}/${nombre}: ${n.error}`);
   assert.ok(g.cables.some(c=>c.desde.nodo==='nucleo'&&c.desde.puerto==='pasivas'&&c.hasta.nodo===n.id),'cuelga del puerto Pasivas');
  }
 }
 // Una acción normal sigue en «Acciones».
 const g=aGrafo(soltar(base(),PIEZAS.find(p=>p.familia==='acciones'&&p.tipo==='accion'),null),ctx);
 assert.ok(g.nodos.some(x=>x.tipo==='accion'&&!x.pasivo));
});

test('transformarse y curar nacen directamente del núcleo; una forma concede su acción mediante un cable',()=>{
 for(const entrada of ['Transformarse','Transformación']){
  const b=soltar(base(),pieza(entrada),null);
  const forma=b.efectos[0];
  assert.equal(forma.efecto,'transformacion');
  const etapa=forma.transformacion.etapas[0].id;
  const padre='transformacion:'+forma.id;
  const r=aplicar(b,{op:'pegar',padre,etapa,fragmento:pieza('Curación').fragmentos[0]});
  const cura=r.efectos[1];
  assert.equal(cura.efecto,'curacion');
  assert.deepEqual(json(r.efectos[0].transformacion.etapas[0].habilidades),[cura.id]);
  assert.ok(aGrafo(r,ctx).cables.some(c=>c.desde.nodo===padre&&c.desde.puerto==='poder:'+etapa&&c.hasta.nodo==='accion:'+cura.id));
  assert.equal(b.efectos.length,1);
 }
});
