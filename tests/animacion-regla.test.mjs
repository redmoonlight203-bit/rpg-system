import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as Edge from '../supabase/functions/equipo-combate/motor.js';
import {cargarDependencia} from './helpers/cargar-ts.mjs';

const {validarReglas}=cargarDependencia('reglas');
const {planificarVFX}=cargarDependencia('vfx');
const {cambiosCombate,recibirEvento}=cargarDependencia('combate-transferencia');
const {proyectarVista}=cargarDependencia('espejo-mental');
const Arena=cargarDependencia('yunque-arena');
const clonar=o=>JSON.parse(JSON.stringify(o));
const onda='yugen-onda-carmesi';
const regla={id:'caceria',nombre:'Que empieze la caceria',evento:'inicio_turno',condicion:{tipo:'siempre'},
 efectos:[{tipo:'dano',valor:10,destino:'enemigos'}],coste_ph:0,coste_fatiga:0,enfriamiento:3,usos:0,prioridad:0};
const hueso=animacion=>({id:'instintos',nombre:'Seguir tus instintos',efecto:'transformacion',cantidad:0,caras:6,modificador:0,
 tipo_dano:'',estado:'',duracion:0,coste_ph:0,
 transformacion:{id:'rey',nombre:'Rey Lobo',tipo:'poder',etapas:[{id:'etapa_1',nombre:'Rey Lobo',stats:{},huella:{ancho:3,alto:3},vfx:{entrada:'foundry-fire-nova'},reglas:[{...regla,...(animacion?{animacion}:{})}]}]}});
const id='creacion-rey', accion=`hab:${id}:instintos`;
const m=(c,id)=>c.miembros.find(x=>x.id===id);
const dado=()=>1;
const arena=animacion=>{
 const borrador={id,tipo:'habilidad',nombre:'Rey Lobo',stats:{},efectos:[hueso(animacion)],reglas:[],reglas_pasivas:[]};
 const r=Arena.crearArena(borrador,{creaciones:[],stats:{}});
 assert.ok(r.combate,r.error);
 let c=Arena.colocar(r.combate,'saco',{x:7,y:5});
 c=Arena.agregarSaco(c,{}, {x:7,y:6});
 return c;
};

test('selector acepta catálogo y tamaño permitido sin invalidar reglas antiguas',()=>{
 for(const animacion of [undefined,{id:onda},{id:'combat-red_claw',escala:4}])assert.equal(validarReglas([{...regla,animacion}]),null);
 for(const animacion of [null,{}, {id:'ausente'}, {id:onda,escala:'2'}, {id:onda,escala:4.5}])
  assert.ok(validarReglas([{...regla,animacion}]));
});

test('Arena: entrada y rugido son distintos; 3×3 emite una sola onda y no cambia los 10 HP ni enfriamiento',()=>{
 let con=arena({id:onda}),sin=arena();
 assert.equal(con.evento_visual.activaciones,undefined);
 con=Arena.usar(con,accion,'doll',dado);sin=Arena.usar(sin,accion,'doll',dado);
 assert.ok(con.evento_visual.transformaciones.some(v=>v.animacion==='foundry-fire-nova'));
 assert.equal(con.evento_visual.activaciones,undefined);
 const origen=m(con,'doll').posicion;
 const previo=con;
 con=Arena.turno(con,dado);sin=Arena.turno(sin,dado);
 assert.deepEqual(clonar(con.miembros.map(f=>f.vida)),clonar(sin.miembros.map(f=>f.vida)));
 assert.deepEqual(clonar(con.evento_visual.cambios_vida),[{id:'saco',delta:-10},{id:'saco-2',delta:-10}]);
 assert.deepEqual(clonar(m(con,'doll').motor),clonar(m(sin,'doll').motor));
 const eventos=clonar(con.evento_visual.activaciones);
 assert.deepEqual(eventos,[{id:'0',animacion:onda,posicion:{x:origen.x+1,y:origen.y+1},escala:4}]);
 const clips=clonar(planificarVFX(con.evento_visual));
 assert.equal(clips.length,1);assert.equal(clips[0].animacion,onda);assert.deepEqual(clips[0].desde,eventos[0].posicion);
 assert.equal(clips[0].duracion,960);
 for(let i=0;i<3;i++){con=Arena.turno(con,dado);assert.equal(con.evento_visual.activaciones,undefined);assert.equal(m(con,'saco').vida,50);}
 assert.match(m(previo,'doll').transformacion.etapa_id,/etapa_1/);
 con=Arena.turno(con,dado);
 assert.equal(m(con,'saco').vida,40);assert.equal(con.evento_visual.activaciones.length,1);
});

test('Edge: pasar turno genera la onda conservada por JSON, ligera, vista normal y reflejada, sin repetición',()=>{
 const lobo={id:'a',nombre:'Lobo',posicion:{x:1,y:1},stats:{vida:40},configuracion:{
  tipo_creacion:'personaje',habilidades:[{id,nombre:'Rey Lobo',stats:{},efectos:[hueso({id:onda,escala:3.5})]}]}};
 const enemigo={id:'b',nombre:'Blanco',posicion:{x:7,y:7},stats:{vida:40},configuracion:{tipo_creacion:'personaje'}};
 let n=Edge.agregar(Edge.nuevoCombate(),lobo,'jugador',()=>20);
 n=Edge.agregar(n,enemigo,'enemigo',dado);
 n=Edge.turnoConReacciones(n,'iniciar',dado);
 n=Edge.actuarConReacciones(n,'a',accion,'a',dado);
 const pasa=Edge.turnoConReacciones(n,'siguiente',dado);
 const vuelto=Edge.turnoConReacciones(pasa,'siguiente',dado);
 const proyeccion=clonar({tablero:{columnas:10,filas:10},objetivos:[{id:'b',nombre:'Blanco',bando:'enemigo',posicion:enemigo.posicion}],evento_visual:vuelto.evento_visual,recibo:{evento:vuelto.evento_visual}});
 const original=proyeccion.evento_visual.activaciones;
 assert.deepEqual(original,[{id:'0',animacion:onda,posicion:{x:2,y:2},escala:3.5}]);
 assert.deepEqual(vuelto.evento_visual.cambios_vida,[{id:'b',delta:-10}]);
 assert.deepEqual(clonar(cambiosCombate(pasa,vuelto)).campos.evento_visual.activaciones,original);
 assert.deepEqual(clonar(recibirEvento(proyeccion)).evento_visual.activaciones,original);
 const reflejado=clonar(proyectarVista(proyeccion,'b',{espejar:true}));
 assert.deepEqual(reflejado.evento_visual.activaciones[0].posicion,{x:7,y:2});
 assert.deepEqual(reflejado.recibo.evento.activaciones[0].posicion,{x:7,y:2});
 assert.deepEqual(original[0].posicion,{x:2,y:2});
 assert.equal(Edge.deshacer(vuelto).evento_visual.activaciones,undefined);
 assert.equal(Edge.turnoConReacciones(vuelto,'siguiente',dado).evento_visual.activaciones,undefined);
});

test('las activaciones no reemplazan entrada, desplazamiento ni efecto de la acción que las genera',()=>{
 const punto={x:2,y:3},a={animacion:onda,posicion:punto,escala:4};
 const evento={id:'e',nombre:'e',dados:[],desde:punto,hasta:{x:4,y:3},
  movimientos:[{id:'lobo',desde:punto,hasta:{x:3,y:3},tipo:'salto'}],
  transformaciones:[{id:'lobo',animacion:'foundry-fire-nova',posicion:punto}],
  vfx:{impacto:'combat-red_claw',recorrido:'foundry-blink-dash'},
  activaciones:Array.from({length:24},(_,i)=>({...a,id:String(i)}))};
 const clips=clonar(planificarVFX(evento)).slice(0,24);
 assert.deepEqual(clips.slice(0,4).map(c=>c.id),['estela-lobo','impacto','etapa-lobo','regla-0']);
 assert.deepEqual(clips[3].desde,punto);
});
