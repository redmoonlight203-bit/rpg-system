import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {generarMapa,validarMapa}=cargarDependencia('./mapas-procedurales');
const {atlasYugen}=cargarDependencia('./tileset-yugen');
const {compilarDibujoMapa}=cargarDependencia('./mapas-render');
const atlas=atlasYugen(),regiones=new Set(atlas.regiones.map(r=>r.id)),lados=[8,12,16,20,24];
const opciones=(perfil,semilla,extra={})=>({schemaVersion:1,generatorVersion:'3.0.0',semilla,perfil,densidad:.6,protegidas:[],atlas,estiloCamino:'tierra',colorTecho:'gris',...extra});
const base=(w,h)=>({id:'mapa',version:1,nombre:'Prueba',columnas:w,filas:h,celdas:{}});
test('v3: 1000 semillas por perfil son deterministas, conectadas y usan piezas existentes',()=>{
 for(const perfil of ['bosque','pueblo','ruinas'])for(let i=0;i<1000;i++){
  const w=lados[i%5],h=lados[(i*3+1)%5],op=opciones(perfil,String(i),{densidad:(i%11)/10,estiloCamino:i%2?'piedra':'tierra',colorTecho:i%3?'gris':'rojo'});
  const a=generarMapa(base(w,h),op);
  assert.equal(JSON.stringify(a),JSON.stringify(generarMapa(base(w,h),op)));
  assert.equal(validarMapa(a).length,0,`${perfil}:${i}`);
  for(const k of Object.keys(a.celdas)){const [x,y]=k.split(',').map(Number);assert.ok(x>=0&&y>=0&&x<w&&y<h);}
  for(const o of a.procedural.objetos){assert.ok(regiones.has(o.regionId)||o.regionId==='muro-auto',o.regionId);assert.ok(o.x>=0&&o.y>=0&&o.x+o.ancho<=w&&o.y+o.alto<=h);}
  assert.equal(a.procedural.accesos.length,4);
  for(const p of a.procedural.accesos)assert.notEqual(a.celdas[`${p.x},${p.y}`],'muro');
  if(perfil!=='pueblo')assert.equal(a.procedural.objetos.some(o=>o.capa==='techos'),false);
 }
});
test('v3: la semilla cambia calles y edificios, no solo la decoración',()=>{
 for(const perfil of ['bosque','pueblo','ruinas']){
  const calles=new Set(),muros=new Set();
  for(let i=0;i<200;i++){
   const m=generarMapa(base(16,16),opciones(perfil,`s${i}`));
   calles.add(Object.entries(m.procedural.superficies).filter(e=>e[1].startsWith('camino')).map(e=>e[0]).sort().join('|'));
   muros.add(Object.entries(m.celdas).filter(e=>e[1]==='muro').map(e=>e[0]).sort().join('|'));
  }
  assert.ok(calles.size>=190,`${perfil}: ${calles.size} trazados`);
  if(perfil!=='bosque')assert.ok(muros.size>=190,`${perfil}: ${muros.size} disposiciones`);
 }
});
test('v3: el pueblo tiene techos por capa y el render mantiene el orden',()=>{
 const m=generarMapa(base(16,16),opciones('pueblo','orden')),comandos=compilarDibujoMapa(m);
 assert.ok(m.procedural.objetos.some(o=>o.capa==='techos'));
 assert.ok(comandos.findLastIndex(o=>o.capa==='objetos')<comandos.findIndex(o=>o.capa==='techos'));
});
test('v3: respeta casillas protegidas y la v2 guardada sigue generando igual',()=>{
 const celdas={'5,5':'muro'},m=generarMapa({...base(12,12),celdas},opciones('pueblo','p',{protegidas:['5,5']}));
 assert.equal(m.celdas['5,5'],'muro');
 const v2=opciones('pueblo','yugen',{generatorVersion:'2.0.0'});
 assert.equal(JSON.stringify(generarMapa(base(12,12),v2)),JSON.stringify(generarMapa(base(12,12),v2)));
});
