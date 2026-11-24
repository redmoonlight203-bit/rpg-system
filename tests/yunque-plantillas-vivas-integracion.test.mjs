import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {PLANTILLAS}=cargarDependencia('yunque-plantillas');
const {aplicar}=cargarDependencia('yunque-operaciones');
const {actualizarDesdePlantillas}=cargarDependencia('yunque-plantillas-vivas');
const A=cargarDependencia('yunque-arena');
const F=JSON.parse(readFileSync(new URL('./fixtures/yunque-borradores.json',import.meta.url),'utf8'));
const json=x=>JSON.parse(JSON.stringify(x));
const creacion=b=>({id:b.id,nombre:b.nombre,tipo:b.clasificacion,tipo_creacion:b.tipo,descripcion:'',historia:'',requisitos:'',defectos:'',imagen_url:'',clase:b.clase,stats:b.stats,stats_rango:{},es_grupo:false,slot_tipo:b.slot,estado:'',ligado_al_alma:false,es_vendible:false,precio_sugerido:'',habilidades:[],pasivas:[],reglas:b.reglas,reglas_pasivas:b.reglas_pasivas,equipamiento:{},configuracion_dados:b.efectos,requisitos_uso:b.requisitos_uso});
const rugidoV2=()=>{const l=structuredClone(PLANTILLAS);const p=l.find(x=>x.id==='rugido');p.version=2;p.fragmentos[0].datos.caras=8;p.fragmentos[0].datos.cantidad=3;return l;};

test('historia completa de una plantilla viva en un personaje',()=>{
 let b=json(F.personaje);
 // «Legendaria» exige presupuesto legendario en el personaje.
 b.stats={...b.stats,acciones_legendaria:1,fatiga:10};
 b=aplicar(b,{op:'desplegar',plantilla:'rugido'});
 const id=b.efectos[0].id;
 assert.equal(b.efectos[0].origen.plantilla,'rugido');
 b=aplicar(b,{op:'fijar',ruta:['efectos',0,'cantidad'],valor:5});
 b=aplicar(b,{op:'fijar',ruta:['efectos',0,'presupuesto'],valor:'legendaria'});

 const r=actualizarDesdePlantillas(b,rugidoV2());
 const e=r.borrador.efectos[0];
 assert.equal(e.caras,8);assert.equal(e.cantidad,5);assert.equal(e.presupuesto,'legendaria');
 assert.equal(r.cambios.length,1);
 // Decisión de T3: un campo editado se anota como conservado si difiere del valor de la plantilla (presupuesto también).
 assert.deepEqual(json(r.cambios[0].conservados).sort(),['cantidad','presupuesto']);
 assert.ok(r.cambios[0].actualizados.includes('caras'));

 const ctx={creaciones:[creacion(r.borrador)],stats:r.borrador.stats};
 const a=A.crearArena(json(r.borrador),ctx);
 assert.ok(a.combate,a.error);
 const antes=a.combate.miembros.find(x=>x.id==='saco').vida;
 const c=A.usar(a.combate,`hab:propias:${id}`,'saco',()=>3);
 assert.ok(c.miembros.find(x=>x.id==='saco').vida<antes,'el rugido actualizado baja la vida del saco');

 // Desvinculado: ya no sigue a la plantilla.
 const d=aplicar(r.borrador,{op:'desvincular',nodo:'accion:'+id});
 const otra=structuredClone(rugidoV2());otra.find(x=>x.id==='rugido').version=3;
 const r2=actualizarDesdePlantillas(d,otra);
 assert.equal(r2.cambios.length,0);assert.equal(r2.borrador,d);

 // Plantilla quitada antes de desvincular: aviso y nodo idéntico.
 const sin=PLANTILLAS.filter(p=>p.id!=='rugido');
 const r3=actualizarDesdePlantillas(r.borrador,sin);
 assert.equal(r3.cambios[0].tipo,'sin_plantilla');
 assert.deepEqual(json(r3.borrador.efectos[0]),json(r.borrador.efectos[0]));
});
