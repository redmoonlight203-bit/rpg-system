import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import * as c from '../supabase/functions/equipo-combate/motor.js';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {direccionVistaPatron,patronEnV,patronDesde,trazoPatron,DIRECCIONES_PATRON}=cargarDependencia('patron-area');

const clonar=v=>JSON.parse(JSON.stringify(v));
const p=(x,y)=>({x,y}),dims={columnas:8,filas:8},mapa=celdas=>({id:'prueba',nombre:'Prueba',version:1,...dims,celdas});
const tablero=(casillas,orientacion='fija')=>({forma:'personalizada',tamano:0,alcance:0,afecta:'enemigos',afecta_lanzador:false,origen_area:'lanzador',patron:{orientacion,casillas}});
const golpe=t=>({id:'golpe',nombre:'Patrón',efecto:'dano',cantidad:0,caras:6,modificador:5,tipo_dano:'fisico',estado:'',duracion:0,coste_ph:2,coste_fatiga:0,tablero:t});
const ficha=(id,posicion,efectos=[],huella)=>({id,nombre:id,forja_id:null,posicion,stats:{vida:40,ph:8,armadura:0},configuracion:{tipo_creacion:'personaje',huella,habilidades:efectos.length?[{id:'h',nombre:'Patrón',stats:{},efectos}]:[]}});
const preparar=(e,otros,celdas={},huella)=>{let b=c.configurarMapa(c.nuevoCombate(),mapa(celdas));b=c.agregar(b,ficha('a',p(2,2),[e],huella),'jugador',()=>20);for(const [f,bando='enemigo'] of otros)b=c.agregar(b,f,bando,()=>1);b.regla='directo';return c.iniciar(b,()=>1);};
const vida=(b,id)=>b.miembros.find(m=>m.id===id).vida;
const idAccion=b=>c.acciones(b.miembros.find(m=>m.id==='a')).find(a=>a.efecto.nombre==='Patrón').id;
const ejecutar=(b,centro)=>c.actuarConReacciones(b,'a',idAccion(b),'a',()=>20,false,centro);

test('el patrón conserva huecos, se recorta en el borde y rota desde el ancla, no desde el destino',()=>{
 const t=tablero([p(1,0),p(3,-1)],'apuntar');
 const origen=p(3,3);
 assert.deepEqual(c.areaDesde(origen,p(7,3),t,dims),[p(4,3),p(6,2)]);
 assert.deepEqual(c.areaDesde(origen,p(3,7),t,dims),[p(3,4),p(4,6)]);
 assert.deepEqual(c.areaDesde(origen,p(0,3),t,dims),[p(2,3),p(0,4)]);
 assert.deepEqual(c.areaDesde(origen,p(3,0),t,dims),[p(3,2),p(2,0)]);
 assert.deepEqual(c.areaDesde(p(6,3),p(7,3),t,dims),[p(7,3)]);
});

test('la V sigue el cursor en ocho direcciones sin mover su vértice; el clic anterior no congela la vista',()=>{
 const origen=p(10,10),d={columnas:21,filas:21};
 const patron={orientacion:'apuntar',casillas:patronEnV()};
 const formas=DIRECCIONES_PATRON.map(({x,y})=>{
  const cursor=p(10+5*x,10+5*y),extremo=p(10+x,10+y);
  const vista=patronDesde(patron,origen,direccionVistaPatron(origen,cursor,p(1,10)),d);
  assert.deepEqual(vista,patronDesde(patron,origen,extremo,d));
  assert.deepEqual(clonar(vista[0]),origen);
  assert.equal(vista.length,7);
  return JSON.stringify(vista);
 });
 assert.equal(new Set(formas).size,8);
 assert.equal(direccionVistaPatron(origen,origen,p(1,10)),null);
 assert.deepEqual(direccionVistaPatron(origen,null,p(1,10)),p(1,10));
 assert.deepEqual(clonar(trazoPatron(p(-3,-3),p(0,0))),[p(-3,-3),p(-2,-2),p(-1,-1),p(0,0)]);
 assert.deepEqual(clonar(trazoPatron(p(0,0),p(0,0))),[p(0,0)]);
});

test('girar el tablero completo conserva cada casilla y su distancia',()=>{
 const d={columnas:13,filas:13},origen=p(6,6);
 const casillas=Array.from({length:169},(_,i)=>p(i%13-6,Math.floor(i/13)-6));
 for(const {x,y} of DIRECCIONES_PATRON){
  const área=patronDesde({orientacion:'apuntar',casillas},origen,p(6+x,6+y),d);
  assert.equal(área.length,casillas.length);
  área.forEach((q,i)=>assert.equal(Math.max(Math.abs(q.x-6),Math.abs(q.y-6)),Math.max(Math.abs(casillas[i].x),Math.abs(casillas[i].y))));
 }
});

test('V diagonal: las celdas previsualizadas son exactamente las que reciben el golpe, no el hueco ni el clic',()=>{
 const t=tablero(patronEnV(),'apuntar');
 const b=preparar(golpe(t),[[ficha('este',p(4,2))],[ficha('sur',p(2,4))],[ficha('hueco',p(4,4))],[ficha('puntero',p(6,6))]]);
 const cursor=p(6,6);
 const vista=clonar(patronDesde(t.patron,p(2,2),cursor,dims));
 assert.deepEqual(vista,[p(2,2),p(3,2),p(2,3),p(4,2),p(2,4),p(5,2),p(2,5)]);
 // Se resuelven dos víctimas en las ramas de la V aunque la casilla pulsada sea otra.
 const n=ejecutar(b,cursor);
 for(const id of ['este','sur'])assert.equal(vida(n,id),35);
 for(const id of ['a','hueco','puntero'])assert.equal(vida(n,id),40);
 assert.deepEqual(n.evento_visual.area,vista);
});

test('hit real solo en celdas pintadas: un gigante recibe un golpe aunque coincidan dos casillas, y un aliado no recibe daño',()=>{
 const t=tablero([p(2,0),p(3,1),p(1,2)]),e=golpe(t);
 const b=preparar(e,[[ficha('gigante',p(4,2),[],{ancho:2,alto:2})],[ficha('hueco',p(3,2))],[ficha('aliado',p(3,4)),'jugador']]);
 const n=ejecutar(b,p(6,7));
 assert.equal(vida(n,'gigante'),35);
 for(const id of ['a','hueco','aliado'])assert.equal(vida(n,id),40);
 assert.deepEqual(n.evento_visual.area,[p(4,2),p(5,3),p(3,4)]);
});

test('muro corta geometría y animación; una ficha lanzadora grande no estampa el dibujo una vez por casilla',()=>{
 const t=tablero([p(2,0),p(0,3),p(0,1)],'apuntar'),e=golpe(t);
 const b=preparar(e,[[ficha('trasMuro',p(4,2))],[ficha('visible',p(2,5))]],{'3,2':'muro'});
 const n=ejecutar(b,p(7,2));
 assert.equal(vida(n,'trasMuro'),40);
 assert.equal(vida(n,'visible'),35);
 assert.deepEqual(n.evento_visual.area,[p(2,5),p(2,3)]);
 const gigante={huella:{ancho:2,alto:2}};
 assert.deepEqual(c.areaDesdeFicha(gigante,p(2,2),p(6,2),t,dims),[p(4,2),p(2,5),p(2,3)]);
 // x real=2 pasa a x espejo=5, mientras el ancla visual de la huella de ancho 2 pasa a 4.
 assert.deepEqual(c.areaDesdeFicha(gigante,p(4,2),p(1,2),t,dims,undefined,true),[p(3,2),p(5,5),p(5,3)]);
});

test('patrón orientable no gasta PH sin dirección, en el ancla o si no hay blancos válidos',()=>{
 const b=preparar(golpe(tablero([p(1,0)],'apuntar')),[[ficha('b',p(3,2))]]);
 for(const centro of [undefined,p(2,2),p(8,2)])assert.throws(()=>ejecutar(b,centro),/orientar/);
 assert.throws(()=>ejecutar(b,p(2,7)),/objetivos válidos/);
 assert.equal(b.miembros[0].ph,8);
 assert.equal(b.miembros[0].accion_usada,false);
 assert.equal(vida(ejecutar(b,p(7,2)),'b'),35);
});

test('valida payload: sin dibujo, con duplicado, flotante o fuera del rango se rechaza',()=>{
 for(const casillas of [[],[p(1,0),p(1,0)],[p(1.5,0)],[p(7,0)],[null]])assert.ok(c.validarTactica(golpe(tablero(casillas))));
 const valido=golpe(tablero([p(0,0),p(-6,6)]));
 assert.equal(c.validarTactica(valido),null);
 assert.ok(c.validarTactica({...valido,efecto:'desplazamiento'}));
});

test('Postgres autoriza guardar y volver a leer el patrón a través del trigger de Forja',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create table public.forja_maestra(configuracion_dados jsonb); create table public.categorias_forja(clave text); create table public.config_estadisticas(categoria text,clave text,etiqueta text,descripcion text,valor_defecto integer,limite_jugador integer);');
  for(const ruta of ['20261107144029_alcance_areas_movimiento.sql','20261124110000_forja_patrones_alcance.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+ruta,import.meta.url),'utf8'));
  const original=golpe(tablero([p(1,-1),p(-6,6)],'apuntar'));
  const sql='insert into public.forja_maestra values ($1::jsonb) returning configuracion_dados';
  const guardar=e=>db.query(sql,[JSON.stringify([e])]);
  assert.deepEqual((await guardar(original)).rows[0].configuracion_dados,[original]);
  const base=golpe({forma:'circulo',alcance:5,tamano:2,afecta:'enemigos'});
  assert.deepEqual((await guardar(base)).rows[0].configuracion_dados,[base]);
  for(const e of [golpe(tablero([])),golpe(tablero([p(2,2),p(2,2)])),golpe(tablero([p(7,0)])),{...original,portal:true}])await assert.rejects(guardar(e));
 }finally{await db.close();}
});
