import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const e=cargarDependencia('estados');
const iconos=cargarDependencia('iconos-yugen');
const enterrado={id:'enterrado_x',nombre:'Madriguera',categoria:'fisico',duracion:{tipo:'turnos',turnos:2},efectos:[{tipo:'capa',capa:'subsuelo'}]};

test('la primitiva Capa decide la capa, no el nombre',()=>{
 assert.equal(e.validarDefinicionEstado(enterrado),null);
 assert.equal(e.capaDeEstados([{tipo:enterrado.id,nombre:'Madriguera',def:enterrado}]),'subsuelo');
 // Un estado con definición y sin Capa no se mueve de capa aunque su nombre lo sugiera.
 const nombre={...enterrado,id:'levitando_x',nombre:'Levitando',efectos:[{tipo:'bonos',bonos:{armadura:1}}]};
 assert.equal(e.capaDeEstados([{tipo:nombre.id,nombre:'Levitando',def:nombre}]),'suelo');
});

test('el vuelo del motor y los estados antiguos siguen funcionando',()=>{
 assert.equal(e.capaDeEstados([{tipo:'vuelo',nombre:'En vuelo'}]),'aire');
 assert.equal(e.capaDeEstados([{tipo:'estado:abc',nombre:'Sumergido'}]),'agua');
 assert.equal(e.capaDeEstados([]),'suelo');
});

test('la Capa se valida y se describe',()=>{
 assert.match(e.validarDefinicionEstado({...enterrado,efectos:[{tipo:'capa',capa:'luna'}]}),/capa/i);
 assert.match(e.describirEstado(enterrado),/bajo tierra/);
});

test('todo estado tiene un icono existente',()=>{
 const validos=new Set(iconos.ICONOS_YUGEN.map(i=>i.id));
 for(const d of e.CATALOGO_ESTADOS)assert.ok(validos.has(e.iconoEstado(d)),`${d.id}: ${e.iconoEstado(d)}`);
 for(const t of Object.keys(e.NOMBRE_PRIMITIVA))assert.ok(validos.has(e.iconoAutomatico({...enterrado,icono:undefined,efectos:[t==='capa'?{tipo:'capa',capa:'aire'}:{tipo:t}]})),t);
 assert.ok(validos.has(e.iconoEstado({...enterrado,icono:undefined,efectos:[]})));
});

test('los iconos del catálogo base ya no se repiten tanto',()=>{
 const usos=new Map();for(const d of e.CATALOGO_ESTADOS)usos.set(e.iconoEstado(d),(usos.get(e.iconoEstado(d))||0)+1);
 assert.ok(Math.max(...usos.values())<=2,JSON.stringify([...usos]));
});
