import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {cambiosCombate,recibirEvento}=cargarDependencia('combate-transferencia');
function aplicar(antes,p){
 const restar=(o,keys)=>Object.fromEntries(Object.entries(o).filter(([k])=>!keys.includes(k)));
 const previos=new Map(antes.miembros.map(m=>[m.id,m]));
 return {...restar(antes,p.eliminar),...p.campos,miembros:p.miembros.map(m=>({...restar(previos.get(m.id)||{},m.eliminar),...m.campos,id:m.id}))};
}
const imagen='data:image/png;base64,'+'A'.repeat(400000);
const estado={fase:'en_curso',actual:'a',miembros:[{id:'a',vida:20,posicion:{x:1,y:1},configuracion:{imagen_url:imagen,habilidades:[{id:'h',imagen_url:imagen}]}}]};
test('un movimiento no transporta imágenes ni historial, y reconstruye el estado completo',()=>{
 const antes={...structuredClone(estado),historial:Array.from({length:10},()=>estado)},despues=structuredClone(antes);despues.miembros[0].posicion={x:2,y:1};
 const patch=cambiosCombate(antes,despues),bytes=JSON.stringify(patch).length;
 assert.ok(bytes<250,bytes);assert.ok(JSON.stringify(antes).length>8000000);assert.deepEqual(aplicar(antes,patch),despues);assert.equal(patch.campos.historial,undefined);
});
test('alta inicial, cambios de equipo, altas/bajas y propiedades borradas se conservan',()=>{
 const inicial=cambiosCombate(undefined,estado);assert.equal(inicial.campos.fase,'en_curso');assert.equal(inicial.miembros[0].campos.configuracion.imagen_url,imagen);
 const antes={...structuredClone(estado),resultado:'Golpe'};antes.miembros[0].arma={id:'temporal'};
 const despues=structuredClone(antes);despues.resultado=undefined;delete despues.miembros[0].arma;despues.miembros[0].configuracion.equipamiento={casco:{id:'x'}};despues.miembros.push({id:'b',vida:12});
 assert.deepEqual(JSON.parse(JSON.stringify(aplicar(antes,cambiosCombate(antes,despues)))),JSON.parse(JSON.stringify(despues)));
 const final={...despues,miembros:[despues.miembros[1]]};assert.deepEqual(aplicar(despues,cambiosCombate(despues,final)).miembros,final.miembros);
});
test('la llegada de un evento confirmado registra reloj local sin alterar su fecha original',()=>{
 const e={evento_visual:{id:'x',creado_en:1,dados:[],nombre:'Acción'}};const recibido=recibirEvento(e);
 assert.equal(recibido.evento_visual.creado_en,1);assert.ok(recibido.evento_visual.recibido_en>1);assert.equal(e.evento_visual.recibido_en,undefined);
});
