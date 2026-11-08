import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {generarMapa,validarMapa,cortarAtlas,regionParaCelda}=cargarDependencia('./mapas-procedurales');
const base={id:'mapa',version:1,nombre:'Prueba',columnas:24,filas:24,celdas:{}};
const opciones={schemaVersion:1,generatorVersion:'1.0.0',semilla:'yugen',perfil:'taberna',densidad:.7,protegidas:[]};
test('1000 semillas por perfil: determinismo, límites y conectividad',()=>{
 for(const perfil of ['taberna','casa','bosque','pueblo','mazmorra'])for(let i=0;i<1000;i++){
  const op={...opciones,perfil,semilla:String(i)},a=generarMapa(base,op),b=generarMapa(base,op);
  assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(validarMapa(a).length,0,`${perfil}:${i}`);
  for(const key of Object.keys(a.celdas)){const [x,y]=key.split(',').map(Number);assert.ok(x>=0&&y>=0&&x<24&&y<24);}
 }
});
test('protege cambios manuales incluso cuando provocan un conflicto',()=>{
 const celdas={};for(let x=0;x<24;x++)celdas[`${x},12`]='muro';const m=generarMapa({...base,celdas},{...opciones,protegidas:Object.keys(celdas)});
 for(const k of Object.keys(celdas))assert.equal(m.celdas[k],'muro');assert.ok(validarMapa(m).length);
});
test('atlas respeta márgenes, separación y regiones incompletas',()=>{
 const r=cortarAtlas(72,38,16,2,2);assert.equal(r.length,6);assert.equal(r[0].x,2);assert.equal(r[1].x,20);assert.equal(r[3].y,20);
 assert.throws(()=>cortarAtlas(32,32,0));assert.throws(()=>cortarAtlas(4096,4096,8));assert.throws(()=>cortarAtlas(9000,32,32));
});
test('resolución visual estable y sin piezas compatibles conserva color de terreno',()=>{
 const regiones=cortarAtlas(64,32,32);regiones[1].rol='muro';const m={...base,celdas:{'1,1':'muro','2,2':'peligro'},procedural:{...opciones,atlas:{regiones}}};
 assert.equal(regionParaCelda(m,1,1).rol,'muro');assert.equal(regionParaCelda(m,2,2),undefined);
});
test('rechaza dimensiones y densidades fuera de contrato',()=>{assert.throws(()=>generarMapa({...base,columnas:64},opciones));assert.throws(()=>generarMapa(base,{...opciones,densidad:NaN}));});
test('aplicar conserva metadatos y una acción posterior no retransmite el atlas',()=>{
 const motor=cargarDependencia('./combate'),{cambiosCombate}=cargarDependencia('./combate-transferencia');
 const mapa=generarMapa(base,opciones),antes=motor.configurarMapa(motor.nuevoCombate(),mapa);
 assert.equal(antes.mapa.procedural.semilla,opciones.semilla);
 const despues=JSON.parse(JSON.stringify(antes));despues.ronda=2;
 assert.equal(Object.hasOwn(cambiosCombate(antes,despues).campos,'mapa'),false);
 assert.throws(()=>motor.configurarMapa({...antes,fase:'en_curso'},mapa));
});
