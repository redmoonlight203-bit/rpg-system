import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const A=cargarDependencia('artefactos');
const json=x=>JSON.parse(JSON.stringify(x));
const hacha={nombre:'Hacha del norte',stats:{filo:3,peso:2,durabilidad:5,fuerza:1},habilidades:[{id:'h1',nombre:'Tajo'},{id:'h2',nombre:'Rugido'}],pasivas:[{id:'p1',nombre:'Sed de sangre'}]};
/** rng: la primera tirada es el d100; después elige siempre el primer candidato. */
const dado=d100=>{let i=0;return caras=>i++===0?d100:1;};

test('los seis tramos base cubren 1–100',()=>{
 const t=A.TRAMOS_BASE;assert.equal(t.length,6);
 assert.deepEqual(json(t.map(x=>[x.desde,x.hasta])),[[1,30],[31,45],[46,60],[61,75],[76,90],[91,100]]);
 assert.equal(A.validarTramos(t),null);
});
const casos=[
 [12,'una estadística',{s:1,h:0,p:0}],
 [40,'dos o tres',{s:[2,3],h:0,p:0}],
 [50,'una habilidad',{s:0,h:1,p:0}],
 [70,'habilidad y estadística',{s:1,h:1,p:0}],
 [80,'habilidad y varias',{s:[2,4],h:1,p:0}],
 [99,'set completo',{s:4,h:2,p:1}],
];
for(const [tirada,nombre,esp] of casos)test(`tramo ${tirada}: ${nombre}`,()=>{
 const r=A.absorber(hacha,A.TRAMOS_BASE,dado(tirada));
 assert.equal(r.tirada,tirada);
 const ns=Object.keys(r.stats).length;
 if(Array.isArray(esp.s))assert.ok(ns>=esp.s[0]&&ns<=esp.s[1],`${ns} estadísticas`);else assert.equal(ns,esp.s);
 assert.equal(r.habilidades.length,esp.h);assert.equal(r.pasivas.length,esp.p);
 for(const [k,v] of Object.entries(r.stats))assert.equal(v,hacha.stats[k],'conserva el valor del arma');
});
test('los bordes de cada tramo caen en el tramo correcto',()=>{
 for(const [t,i] of [[30,0],[31,1],[45,1],[46,2],[60,2],[61,3],[75,3],[76,4],[90,4],[91,5],[100,5]])assert.equal(A.tramoDe(A.TRAMOS_BASE,t),A.TRAMOS_BASE[i],String(t));
});
test('un rango que cruza dos tramos se rechaza; también huecos y desorden',()=>{
 const t=json(A.TRAMOS_BASE);
 const cruza=json(t);cruza[1].desde=25;assert.match(A.validarTramos(cruza),/cruza|solap/i);
 const hueco=json(t);hueco[2].desde=48;assert.match(A.validarTramos(hueco),/hueco|falta/i);
 const fin=json(t);fin[5].hasta=99;assert.match(A.validarTramos(fin),/100/);
 const raro=json(t);raro[0].estadisticas={min:3,max:1};assert.match(A.validarTramos(raro),/mínimo|máximo/i);
});
test('un arma con menos de lo pedido da lo que tiene, sin inventar',()=>{
 const pobre={nombre:'Palo',stats:{filo:1},habilidades:[],pasivas:[]};
 const r=A.absorber(pobre,A.TRAMOS_BASE,dado(80));
 assert.deepEqual(json(r.stats),{filo:1});assert.equal(r.habilidades.length,0);
});
test('devorar suma la absorción al portador y sube de nivel por el contador',()=>{
 const mao={niveles:[{nivel:1,nombre:'Hambre',condicion_subida:null,cambios:{}},{nivel:2,nombre:'Saciado',condicion_subida:{tipo:'contador',contador:'armas devoradas',meta:2},cambios:{}}],tramos:A.TRAMOS_BASE};
 let p={nivel:1,absorbidas:[]};
 p=A.devorar(mao,p,hacha,dado(12));assert.equal(p.nivel,1);assert.equal(p.absorbidas.length,1);assert.equal(p.absorbidas[0].arma,'Hacha del norte');
 p=A.devorar(mao,p,hacha,dado(99));assert.equal(p.nivel,2,'dos armas devoradas');
 assert.deepEqual(json(A.bonosAbsorbidos(p)).stats,{filo:6,peso:2,durabilidad:5,fuerza:1});
});
