import {cargarDependencia} from './helpers/cargar-ts.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
function cargar(path){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:cargarDependencia,crypto,JSON,Array,Object,Math,Number,Map,Set,Error});return exports;}
const c=cargar('../lib/combate.ts'),r=cargar('../lib/reglas.ts');
const fija=(n)=>(()=>n);
function campo(reglas,patch={}){
 let b=c.nuevoCombate();for(const [id,bando,ini] of [['a','jugador',18],['b','enemigo',5]])b=c.agregar(b,{id,posicion:{x:id==='a'?1:2,y:1},forja_id:null,nombre:id,stats:{vida:20,armadura:0,ph:20,fatiga:10,dano:0,...patch},configuracion:{tipo_creacion:'personaje',reglas:id==='a'?reglas:[]}},bando,fija(ini));
 b.regla='directo';return c.iniciar(b,fija(15));
}
const a=b=>b.miembros[0], enemigo=b=>b.miembros[1];
const activar=(b,nombre,rng=fija(15))=>c.actuar(b,'a',c.acciones(a(b)).find(x=>x.nombre===nombre).id,'a',rng);
const regla=(efectos,patch={})=>({...r.nuevaRegla(),nombre:'Prueba',efectos,...patch});
test('las tres recetas son válidas y editables',()=>{for(const t of ['crecimiento','furia','objeto'])assert.equal(r.validarReglas(r.receta(t)),null);});
test('matar aumenta vida máxima sin curar; deshacer revierte el progreso',()=>{
 let b=campo(r.receta('crecimiento'));enemigo(b).vida=1;
 b=c.actuar(b,'a','ataque','b',fija(6));assert.equal(c.maxVida(a(b)),21);assert.equal(a(b).vida,20);assert.equal(a(b).motor.progreso.length,1);
 const antes=c.deshacer(b);assert.equal(c.maxVida(a(antes)),20);assert.equal(a(antes).motor,undefined);
 b=c.finalizar(b);assert.equal(c.maxVida(a(b)),21);
});
test('una víctima caída no otorga progreso de nuevo',()=>{let b=campo(r.receta('crecimiento'));enemigo(b).vida=1;b=c.actuar(b,'a','ataque','b',fija(6));b=c.siguiente(b,fija(15));assert.throws(()=>c.actuar(b,'a','ataque','b',fija(6)),/No hay objetivos válidos/);assert.equal(c.maxVida(a(b)),21);});
test('furia altera stats; falla salvación y pierde acción, superar la conserva',()=>{
 let b=activar(campo(r.receta('furia')),'Desatar furia');assert.equal(c.maxVida(a(b)),35);assert.equal(c.estadisticas(a(b)).dano,8);
 b=c.siguiente(b,fija(1));b=c.siguiente(b,fija(1));assert.equal(a(b).accion_usada,true);
 b=c.siguiente(b,fija(20));b=c.siguiente(b,fija(20));assert.equal(a(b).accion_usada,false);
 b=activar(b,'Abandonar furia');assert.equal(c.maxVida(a(b)),20);assert.equal(c.estadisticas(a(b)).dano,0);
});
test('objeto concede reglas activas y transformación sin duplicar piezas',()=>{
 let b=campo([]);a(b).configuracion.equipamiento={acc_1:{id:'pocion',nombre:'Poción',stats:{},reglas:r.receta('objeto')}};
 assert.ok(c.acciones(a(b)).some(x=>x.nombre==='Usar objeto de transformación'));b=activar(b,'Usar objeto de transformación');assert.equal(c.estadisticas(a(b)).armadura,3);
});
test('las habilidades también conceden reglas automáticas',()=>{let b=campo([]);a(b).configuracion.habilidades=[{id:'h',nombre:'H',stats:{},reglas:[regla([{tipo:'curar',destino:'yo',valor:2}],{evento:'inicio_turno'})]}];a(b).vida=5;b=c.siguiente(c.siguiente(b));assert.equal(a(b).vida,7);});
test('duración y reemplazo restauran stats sin alterar la base',()=>{
 let b=campo([regla([{tipo:'atributo',destino:'yo',atributo:'armadura',operacion:'multiplicar',valor:2,duracion:1}])],{armadura:5});b=activar(b,'Prueba');assert.equal(c.estadisticas(a(b)).armadura,10);
 b=c.siguiente(c.siguiente(b));assert.equal(c.estadisticas(a(b)).armadura,10);b=c.siguiente(b);assert.equal(c.estadisticas(a(b)).armadura,5);assert.equal(a(b).stats.armadura,5);
});
test('condiciones Y / O / NO y porcentajes seleccionan la rama correcta',()=>{
 const condicion={tipo:'todas',condiciones:[{tipo:'comparar',sujeto:'yo',atributo:'vida_actual',operador:'<=',valor:50,porcentaje:true},{tipo:'no',condicion:{tipo:'estado',sujeto:'yo',estado:'furia'}}]};
 let b=campo([regla([{tipo:'condicional',destino:'yo',condicion,exito:[{tipo:'curar',destino:'yo',valor:4}],fallo:[{tipo:'ph',destino:'yo',valor:-1}]}])]);a(b).vida=5;b=activar(b,'Prueba');assert.equal(a(b).vida,9);assert.equal(a(b).ph,20);
});
test('fórmulas, objetivos múltiples y ramas de salvación usan la tirada inyectada',()=>{
 let b=campo([regla([{tipo:'salvacion',destino:'enemigos',cd:12,atributo:'salvacion',exito:[],fallo:[{tipo:'dano',destino:'objetivo',valor:{dados:2,caras:6,bono:1}}]}])]);b=activar(b,'Prueba',fija(3));assert.equal(enemigo(b).vida,13);assert.equal(a(b).vida,20);
});
test('costes y usos se aplican una vez; un error no muta el encuentro',()=>{
 let b=campo([regla([{tipo:'curar',destino:'yo',valor:1}],{usos:1,coste_ph:3,coste_fatiga:2})]);b=activar(b,'Prueba');assert.equal(a(b).ph,17);assert.equal(a(b).fatiga,2);b=c.siguiente(c.siguiente(b));const antes=JSON.stringify(b);assert.throws(()=>activar(b,'Prueba'),/usos/);assert.equal(JSON.stringify(b),antes);
});
test('crecimiento acumulado respeta límite por encuentro',()=>{
 const rules=r.receta('crecimiento');rules[0].efectos[0].limite=1;let b=campo(rules);enemigo(b).vida=1;b=c.actuar(b,'a','ataque','b',fija(6));enemigo(b).vida=1;b=c.siguiente(c.siguiente(b));b=c.actuar(b,'a','ataque','b',fija(6));assert.equal(c.maxVida(a(b)),21);
});
test('acción concedida desaparece con su forma',()=>{
 let b=campo([regla([{tipo:'habilidad',destino:'yo',clave:'forma',accion:{id:'g',nombre:'Garra',efecto:'dano',cantidad:2,caras:8,modificador:0,coste_ph:0,duracion:0}}]),regla([{tipo:'quitar_estado',destino:'yo',clave:'forma'}],{nombre:'Salir'})]);b=activar(b,'Prueba');assert.ok(c.acciones(a(b)).some(x=>x.nombre==='Garra'));b=c.siguiente(c.siguiente(b));b=activar(b,'Salir');assert.ok(!c.acciones(a(b)).some(x=>x.nombre==='Garra'));
});
test('cadenas reactivas tienen un límite y no bloquean el simulador',()=>{const rules=[regla([{tipo:'dano',destino:'actor',valor:1}],{evento:'recibir_dano'})];let b=campo(rules,{vida:1000});enemigo(b).configuracion.reglas=rules;b=c.actuar(b,'a','ataque','b',fija(1));assert.ok(b.registro.some(x=>x.includes('cadena')));assert.ok(a(b).vida>900);});
test('validación rechaza reglas desconocidas, NaN, duplicados y ramas profundas',()=>{
 assert.match(r.validarReglas([regla([{tipo:'ejecutar_codigo',destino:'yo'}])]),/desconocido/);
 assert.ok(r.validarReglas([regla([{tipo:'atributo',destino:'yo',atributo:'vida',operacion:'sumar',valor:NaN}])]));
 const rule=r.receta('crecimiento')[0];assert.ok(r.validarReglas([rule,rule]));
 let cond={tipo:'siempre'};for(let i=0;i<10;i++)cond={tipo:'no',condicion:cond};assert.ok(r.validarReglas([{...rule,condicion:cond}]));
});

test('recuperar PH mediante reglas nunca supera su maximo ni baja de cero',()=>{
 let b=campo([regla([{tipo:'ph',destino:'yo',valor:5}],{evento:'inicio_turno'})]);a(b).ph=19;
 b=c.siguiente(c.siguiente(b));assert.equal(a(b).ph,20);
 let c2=campo([regla([{tipo:'ph',destino:'yo',valor:-40}],{evento:'inicio_turno'})]);
 c2=c.siguiente(c.siguiente(c2));assert.equal(a(c2).ph,0);
});
