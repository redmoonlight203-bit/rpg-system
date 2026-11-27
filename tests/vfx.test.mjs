import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
import * as motor from '../supabase/functions/equipo-combate/motor.js';
const catalogo=JSON.parse(readFileSync(new URL('../lib/catalogo-vfx.json',import.meta.url)));
const exports={};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/vfx.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>({default:catalogo}),Map,Set,Math,Object,Number});
const {planificarVFX,validarVFX}=exports;
const vfx={lanzamiento:'kitsuwick-blink-step',recorrido:'foundry-blink-dash',impacto:'smoke-dust-polvo-1',escala:2};
const evento={id:'e',nombre:'Paso',dados:[],creado_en:Date.now(),desde:{x:1,y:1},hasta:{x:6,y:1},vfx};
test('catálogo conserva 185 efectos únicos, imágenes animadas y avisos de autoría',()=>{
 assert.equal(catalogo.length,185);assert.equal(new Set(catalogo.map(v=>v.id)).size,185);
 for(const v of catalogo){
  assert.ok(v.nombre&&v.categoria&&v.duracion>0);
  for(const key of ['url','bucle']){const path=new URL('../public'+v[key],import.meta.url);assert.ok(existsSync(path));const png=readFileSync(path);assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(png.includes(Buffer.from('acTL')),v.id);}
 }
 assert.ok(readFileSync(new URL('../public/vfx/combat/LICENSE.txt',import.meta.url),'utf8').includes('CC BY 4.0'));
});
test('un proyectil enlaza lanzamiento, recorrido e impacto sin alterar posiciones',()=>{
 const original=JSON.stringify(evento),p=planificarVFX(evento);
 assert.equal(p.length,3);assert.ok(p[1].inicio>0);assert.equal(p[2].inicio,p[1].inicio+p[1].duracion);assert.equal(p[1].hasta.x,6);assert.equal(JSON.stringify(evento),original);
 assert.equal(validarVFX(vfx),null);assert.ok(validarVFX({impacto:'no-existe'}));assert.ok(validarVFX({escala:99}));
});
test('teletransporte omite trayecto, salto dibuja arco y atracción anima posiciones reales',()=>{
 const movimiento={id:'a',desde:{x:1,y:1},hasta:{x:4,y:2},tipo:'teletransporte'};
 let p=planificarVFX({...evento,hasta:undefined,movimientos:[movimiento]});assert.ok(!p.some(c=>c.id.startsWith('estela')));assert.equal(p.find(c=>c.id==='llegada-a').hasta.x,4);
 p=planificarVFX({...evento,hasta:undefined,movimientos:[{...movimiento,tipo:'salto'}]});assert.equal(p.find(c=>c.id==='estela-a').salto,true);
 p=planificarVFX({...evento,hasta:undefined,movimientos:[{...movimiento,tipo:'forzado'},{...movimiento,id:'b',hasta:{x:5,y:3},tipo:'forzado'}]});assert.equal(p.filter(c=>c.id.startsWith('llegada')).length,2);
});
test('Paso errante: dash, salto y teletransporte golpean la casilla atacada',()=>{
 for(const tipo of ['dash','salto','teletransporte']){
  const movimiento={id:'orin',desde:evento.desde,hasta:{x:5,y:1},tipo};
  const p=planificarVFX({...evento,movimientos:[movimiento]});
  const impacto=p.find(c=>c.id==='impacto');
  assert.deepEqual(impacto.hasta,evento.hasta);
  assert.ok(!p.some(c=>c.id.startsWith('llegada')));
  assert.equal(impacto.inicio,Math.min(350,p[0].duracion)+(tipo==='teletransporte'?200:600));
  if(tipo!=='teletransporte')assert.deepEqual(p.find(c=>c.id==='estela-orin').hasta,movimiento.hasta);
 }
});
test('empujar conserva el impacto en la casilla atacada sin relanzar desde la víctima',()=>{
 const p=planificarVFX({...evento,movimientos:[{id:'enemigo',desde:evento.hasta,hasta:{x:8,y:1},tipo:'forzado'}]});
 assert.deepEqual(p.find(c=>c.id==='impacto').hasta,evento.hasta);
 assert.equal(p.filter(c=>c.id.startsWith('salida')).length,1);
});
const ataque={id:'salto',nombre:'Salto',efecto:'dano',cantidad:0,caras:6,modificador:1,tipo_dano:'fisico',estado:'',duracion:0,coste_ph:0,vfx,tablero:{alcance:6,forma:'individual',tamano:0,afecta:'enemigos',movimiento_lanzador:{tipo:'salto',casillas:5,alcance_golpe:1}}};
function campo(efecto=ataque){let c=motor.nuevoCombate();c=motor.agregar(c,{id:'a',posicion:{x:1,y:1},nombre:'A',forja_id:null,stats:{vida:30,ph:10,fatiga:10},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'Prueba',stats:{},efectos:[efecto]}]}},'jugador',()=>20);c=motor.agregar(c,{id:'b',posicion:{x:5,y:1},nombre:'B',forja_id:null,stats:{vida:40,ph:0},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);c=motor.iniciar(c,()=>10);c.regla='directo';return c;}
test('motor emite salto confirmado; acción rechazada no produce efectos ni mutaciones',()=>{
 const c=campo(),original=JSON.stringify(c),n=motor.actuar(c,'a','hab:h:salto','b',()=>20);
 assert.deepEqual(planificarVFX(n.evento_visual).find(c=>c.id==='impacto').hasta,{x:5,y:1});assert.equal(n.evento_visual.vfx.impacto,vfx.impacto);assert.ok(n.evento_visual.creado_en);
 const m=n.evento_visual.movimientos.find(m=>m.id==='a');assert.equal(m.tipo,'salto');assert.equal(m.desde.x,1);assert.deepEqual(m.hasta,motor.posicionesTablero(n).a);
 assert.throws(()=>motor.actuar(c,'b','ataque','a'));assert.equal(JSON.stringify(c),original);
});
test('etapas activan su entrada sobre el actor y limpian el aura al volver',()=>{
 const forma={...ataque,id:'forma',efecto:'transformacion',tablero:undefined,transformacion:{id:'bestia',nombre:'Bestia',tipo:'poder',etapas:[{id:'uno',nombre:'Manto',stats:{armadura:5},vfx:{entrada:'kitsuwick-ascension',aura:'kitsuwick-rage-aura'}}]}};
 let c=campo(forma);c=motor.actuar(c,'a','hab:h:forma','b',()=>20);
 assert.equal(c.miembros[0].transformacion.vfx.aura,'kitsuwick-rage-aura');assert.deepEqual(c.evento_visual.hasta,{x:1,y:1});assert.equal(c.evento_visual.transformaciones[0].animacion,'kitsuwick-ascension');
 c=motor.siguiente(motor.siguiente(c,()=>20),()=>20);c=motor.actuar(c,'a','volver_forma','a');assert.equal(c.miembros[0].transformacion,null);assert.equal(c.evento_visual.transformaciones.length,0);
});

// Los paquetes conservan identificadores propios, incluidos guiones bajos en Combat FX.
test('todas las referencias del catálogo se pueden guardar en una acción',()=>{
 const {validarEfectos}=cargarDependencia('creacion');
 for(const a of catalogo)assert.equal(validarEfectos([{...ataque,vfx:{lanzamiento:a.id,recorrido:a.id,impacto:a.id,escala:1.5}}]),null,a.id);
});

test('proyectiles con atracción o repulsión nacen del lanzador y terminan en la casilla atacada',()=>{
 for(const nombre of ['azul','rojo','morado']){
  const vfx={lanzamiento:`espacial-${nombre}-carga`,recorrido:`espacial-${nombre}-viaje`,impacto:`espacial-${nombre}-impacto`,escala:4};
  const e={...evento,vfx,movimientos:[{id:'victima',tipo:'forzado',desde:evento.hasta,hasta:{x:8,y:1}}]};
  const p=planificarVFX(e);
  assert.equal(p.length,3);
  assert.deepEqual(p[0].desde,evento.desde);assert.deepEqual(p[0].hasta,evento.desde);
  assert.equal(p[1].id,'proyectil');assert.deepEqual(p[1].desde,evento.desde);assert.deepEqual(p[1].hasta,evento.hasta);
  assert.deepEqual(p[2].hasta,evento.hasta);assert.equal(p[2].inicio,p[1].inicio+p[1].duracion);
  assert.ok(!p.some(c=>c.id.startsWith('estela-victima')));
 }
});

test('Inercia resuelve cada impacto y el despertar exime solo las leyes propias',()=>{
 const ley={id:'ley',nombre:'Inercia',efecto:'dano',cantidad:1,caras:8,modificador:0,coste_ph:2,ley_limitless:true};
 const fuente=(id,efectos)=>({id,nombre:id,stats:{vida:32,ph:240,armadura:0,salvacion:0},posicion:{x:id==='a'?1:2,y:1},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'Técnicas',stats:{},efectos}]}});
 const k=fuente('k',[{...ley,id:'defensa',defensa:'inercia'},ley,{...ley,id:'aprendida',ley_limitless:false}]);
 let c=motor.iniciar(motor.agregar(motor.agregar(motor.nuevoCombate(),fuente('a',[ley]),'enemigo',()=>20),k,'jugador',()=>1));c.regla='directo';
 for(const [salva,vida] of [[14,28],[13,24]]){
  const n=motor.actuar(c,'a','hab:h:ley','k',caras=>caras===20?salva:8);
  const blanco=n.miembros.find(m=>m.id==='k');assert.equal(blanco.vida,vida);assert.equal(blanco.ph,238);assert.equal(blanco.accion_usada,false);
  assert.equal(n.evento_visual.transformaciones.some(v=>v.animacion==='axioma-defensa'),salva===14);
 }
 const actor=c.miembros.find(m=>m.id==='k');actor.transformacion={definicion_id:'limitless'};
 const barra=motor.acciones(actor);assert.ok(!barra.some(a=>a.efecto.defensa));assert.equal(barra.find(a=>a.efecto.id==='ley').efecto.coste_ph,0);assert.equal(barra.find(a=>a.efecto.id==='aprendida').efecto.coste_ph,2);
});

test('la orientación de un proyectil se suma a su rumbo y conserva el recurso base',()=>{
 const id=exports.orientarVFX(vfx.recorrido,{cuartos:1,horizontal:true,vertical:false});
 const clip=planificarVFX({...evento,hasta:{x:1,y:6},vfx:{recorrido:id}})[0];
 assert.equal(clip.animacion,id);
 assert.equal(exports.transformacionVFX(id,clip.giro),'rotate(180deg) scale(-1, 1)');
 assert.equal(exports.buscarVFX(id).url,exports.buscarVFX(vfx.recorrido).url);
 assert.equal(validarVFX({impacto:id}),null);
 assert.equal(exports.orientarVFX(id,{cuartos:0,horizontal:false,vertical:false}),vfx.recorrido);
 assert.ok(validarVFX({aura:'ori-911-'+vfx.recorrido}));
});

test('un efecto personal se resuelve en el almacenamiento del proyecto con una referencia válida para reglas y acciones',()=>{
 const usuario='12345678-1234-1234-1234-123456789abc';
 const id='usr-'+usuario+'-0123456789abcdef-rayo-900-webp';
 const lib=cargarDependencia('vfx',{process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://ejemplo.test'}}});
 const orientado=lib.orientarVFX(id,{cuartos:3,vertical:true,horizontal:false});
 assert.match(lib.buscarVFX(orientado).url,/\/imagenes\/12345678-1234-1234-1234-123456789abc\/vfx\/0123456789abcdef-rayo-900.webp$/);
 assert.equal(lib.validarVFX({aura:orientado}),null);
 assert.equal(cargarDependencia('creacion').validarEfectos([{...ataque,vfx:{impacto:orientado}}]),null);
 assert.equal(lib.buscarVFX(id.replace('900','9999')),undefined);
 assert.equal(lib.buscarVFX(id.replace('rayo','../rayo')),undefined);
});

test('el aro de Aliento sagrado permanece en la salida con cualquier giro o reflejo',()=>{
 for(const cuartos of [0,1,2,3])for(const horizontal of [false,true])for(const vertical of [false,true]){
  const animacion=exports.orientarVFX('foundry-divine-beam',{cuartos,horizontal,vertical});
  const clip={id:'salida',animacion};
  const transformacion=exports.transformacionClipVFX(clip);
  assert.equal(transformacion,exports.transformacionVFX(animacion)+` translateY(${-40/96*100}%)`);
  assert.equal(exports.transformacionClipVFX({...clip,id:'impacto'}),exports.transformacionVFX(animacion));
 }
});

test('«Gratis en la forma» funciona con cualquier forma, no solo con la de Kion',()=>{
 const tec={id:'tec',nombre:'Danza lunar',efecto:'dano',cantidad:1,caras:6,modificador:0,coste_ph:3,gratis_en_forma:'forma_luna'};
 const pj={id:'p',nombre:'p',stats:{vida:30,ph:50,armadura:0,salvacion:0},posicion:{x:1,y:1},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'Técnicas',stats:{},efectos:[tec,{...tec,id:'otra',gratis_en_forma:undefined}]}]}};
 const c=motor.iniciar(motor.agregar(motor.nuevoCombate(),pj,'jugador',()=>10));
 const m=c.miembros.find(x=>x.id==='p');
 assert.equal(motor.acciones(m).find(a=>a.efecto.id==='tec').efecto.coste_ph,3);
 m.transformacion={definicion_id:'forma_luna'};
 assert.equal(motor.acciones(m).find(a=>a.efecto.id==='tec').efecto.coste_ph,0);
 assert.equal(motor.acciones(m).find(a=>a.efecto.id==='otra').efecto.coste_ph,3);
 m.transformacion={definicion_id:'limitless'};
 assert.equal(motor.acciones(m).find(a=>a.efecto.id==='tec').efecto.coste_ph,3);
});

test('grupos de la barra: el antiguo «axioma» es el grupo Axioma',()=>{
 assert.equal(motor.grupoBarra({axioma:true}),'Axioma');
 assert.equal(motor.grupoBarra({grupo_barra:' Danzas '}),'Danzas');
 assert.equal(motor.grupoBarra({}),undefined);
 assert.equal(motor.formaGratis({ley_limitless:true}),'limitless');
 assert.equal(motor.formaGratis({gratis_en_forma:'luna',ley_limitless:true}),'luna');
});
