import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {atlasYugen,TILESET_YUGEN_URL}=cargarDependencia('./tileset-yugen');
const {generarMapa,validarMapa}=cargarDependencia('./mapas-procedurales');
const {compilarDibujoMapa,elegirConector,rotarMascara}=cargarDependencia('./mapas-render');
const {editarCasillaMapa}=cargarDependencia('./mapas-edicion');
const {leerArchivoMapa}=cargarDependencia('./mapas-archivo');
const base={id:'prueba',version:1,nombre:'Exteriores',columnas:16,filas:16,celdas:{}};
const op={schemaVersion:1,generatorVersion:'2.0.0',semilla:'yugen',perfil:'pueblo',densidad:.8,protegidas:[],atlas:atlasYugen(),estiloCamino:'tierra',colorTecho:'gris'};
test('el archivo conservado es JPEG y los 89 recortes excluyen las líneas negras',()=>{
 const bytes=readFileSync(new URL('../public'+TILESET_YUGEN_URL,import.meta.url));assert.equal(bytes[0],255);assert.equal(bytes[1],216);
 const a=atlasYugen();assert.equal(a.regiones.length,89);assert.equal(new Set(a.regiones.map(r=>r.id)).size,89);
 for(const r of a.regiones){assert.ok(r.x>=2&&r.y>=2&&r.w>0&&r.h>0&&r.x+r.w<=1534&&r.y+r.h<=1534);}
 assert.ok(new Set(a.regiones.map(r=>r.w)).size>3,'recortes manuales irregulares');
});
test('3000 escenarios: reproducibles, sin zonas aisladas, objetos válidos y accesos libres',()=>{
 for(const perfil of ['bosque','pueblo','ruinas'])for(let i=0;i<1000;i++){
  const lado=[8,12,16,20,24][i%5],config={...op,perfil,semilla:String(i)},m=generarMapa({...base,columnas:lado,filas:lado},config);
  assert.equal(validarMapa(m).length,0,`${perfil}:${i}:${lado}`);assert.equal(JSON.stringify(m),JSON.stringify(generarMapa({...base,columnas:lado,filas:lado},config)));
  for(const p of m.procedural.accesos)assert.notEqual(m.celdas[`${p.x},${p.y}`],'muro');
  for(const o of m.procedural.objetos){assert.ok(o.x>=0&&o.y>=0&&o.x+o.ancho<=lado&&o.y+o.alto<=lado);assert.ok(o.regionId==='muro-auto'||op.atlas.regiones.some(r=>r.id===o.regionId));}
 }
});
test('los 15 conectores de caminos tienen orientación exacta incluso sin variante nativa',()=>{
 for(const familia of ['camino_tierra','camino_piedra'])for(let mask=1;mask<16;mask++){
  const seleccion=elegirConector(op.atlas.regiones.filter(r=>r.familia===familia),mask);
  assert.equal(rotarMascara(seleccion.region.conexiones,seleccion.rotacion/90)&~(seleccion.cerrar||0),mask);
 }
});
test('pueblo incluye techos por capa y puertas transitables; ruinas no inventan techos',()=>{
 const m=generarMapa(base,op);assert.ok(m.procedural.objetos.some(o=>o.capa==='techos'));
 const comandos=compilarDibujoMapa(m);assert.ok(comandos.some(o=>o.capa==='suelo'));assert.ok(comandos.some(o=>o.capa==='techos'));assert.ok(comandos.some(o=>o.capa==='objetos'));
 assert.ok(comandos.findLastIndex(o=>o.capa==='objetos')<comandos.findIndex(o=>o.capa==='techos'));
 const r=generarMapa(base,{...op,perfil:'ruinas'});assert.equal(r.procedural.objetos.some(o=>o.capa==='techos'),false);
});
test('sellos 2x2: ocupación entera, borrado entero y protección entera',()=>{
 let m=generarMapa(base,{...op,perfil:'bosque',densidad:0});const region=op.atlas.regiones.find(r=>r.id==='roca-4');
 m=editarCasillaMapa(m,1,1,{tipo:'pieza',region:{...region,rol:'muro'},ancho:2,alto:2,rotacion:0});
 for(const k of ['1,1','2,1','1,2','2,2'])assert.equal(m.celdas[k],'muro');
 const p=editarCasillaMapa(m,2,2,{tipo:'proteger'});assert.equal(p.procedural.protegidas.length,4);
 assert.equal(editarCasillaMapa(p,1,1,{tipo:'borrar',capa:'objetos'}),p);
 const regenerado=generarMapa(p,{...op,perfil:'bosque',semilla:'otra',protegidas:p.procedural.protegidas});
 for(const k of p.procedural.protegidas)assert.equal(regenerado.celdas[k],'muro');
 const borrado=editarCasillaMapa(m,2,2,{tipo:'borrar',capa:'objetos'});for(const k of ['1,1','2,1','1,2','2,2'])assert.equal(borrado.celdas[k],undefined);
 assert.equal(editarCasillaMapa(m,15,15,{tipo:'pieza',region,ancho:2,alto:2,rotacion:0}),m);
});
test('archivo portable conserva apariencia y rechaza URLs externas, regiones y huellas inválidas',()=>{
 const m=generarMapa(base,op),r=leerArchivoMapa(JSON.stringify(m));assert.equal(JSON.stringify(compilarDibujoMapa(r)),JSON.stringify(compilarDibujoMapa(m)));
 const externo=JSON.parse(JSON.stringify(m));externo.procedural.atlas.url='https://example.com/image.png';assert.throws(()=>leerArchivoMapa(JSON.stringify(externo)));
 const invalid=JSON.parse(JSON.stringify(m));invalid.procedural.objetos[0].ancho=99;assert.throws(()=>leerArchivoMapa(JSON.stringify(invalid)));
 const recorte=JSON.parse(JSON.stringify(m));recorte.procedural.atlas.regiones[0].x=-1;assert.throws(()=>leerArchivoMapa(JSON.stringify(recorte)));
});
test('el paquete de exteriores no genera interiores con mobiliario inexistente',()=>{assert.throws(()=>generarMapa(base,{...op,perfil:'taberna'}));});
test('pincel de muro y cobertura produce imágenes aunque no haya sello explícito',()=>{
 let m=generarMapa(base,{...op,perfil:'bosque',densidad:0});m=editarCasillaMapa(m,1,1,{tipo:'terreno',terreno:'muro'});m=editarCasillaMapa(m,2,1,{tipo:'terreno',terreno:'cobertura'});
 const comandos=compilarDibujoMapa(m);assert.ok(comandos.some(c=>c.x===1&&c.y===1&&c.capa==='objetos'&&c.region.familia==='muro'));assert.ok(comandos.some(c=>c.x===2&&c.y===1&&c.capa==='objetos'&&c.region.familia==='roca'));
});
