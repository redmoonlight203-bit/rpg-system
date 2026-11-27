import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as motor from '../supabase/functions/equipo-combate/motor.js';
import {cargarDependencia} from './helpers/cargar-ts.mjs';

const {planificarVFX,validarVFX}=cargarDependencia('vfx');
const clonar=valor=>JSON.parse(JSON.stringify(valor));
const paso=(id,disparador,ajustes={})=>({
 id,recurso:disparador==='haz'?'foundry-divine-beam':'foundry-hit-spark',
 disparador,inicio:0,duracion:1000,escala:1,giro:0,...ajustes,
});
const vfx={secuencia:{version:1,clips:[paso('haz','haz'),paso('chispa','impacto'),paso('eco','casilla',{casilla:{x:3,y:-3},inicio:1800})]}};
const casillas=[1,2,3,4].flatMap(x=>[{x,y:0},{x,y:-x},{x,y:x}]);
const origen={x:3,y:4};
const area=casillas.map(p=>({x:origen.x+p.x,y:origen.y+p.y}));
const impactos=[[{x:6,y:4}],[{x:4,y:4},{x:5,y:4}],[{x:5,y:3},{x:5,y:4}]];
const geometria={origen,objetivo:{x:7,y:4},area,patron:true,girar:true,impactos,tablero:{columnas:12,filas:10}};
const evento={id:'a',nombre:'Rayo',dados:[],desde:origen,vfx,geometria_vfx:geometria};

test('tres haces y un impacto por objetivo, con tiempos calculados a lo largo del haz',()=>{
 const clips=clonar(planificarVFX(evento));
 const haces=clips.filter(c=>c.haz),golpes=clips.filter(c=>c.id.startsWith('chispa'));
 assert.equal(haces.length,3);
 assert.deepEqual(haces.map(c=>c.hasta),[{x:7,y:4},{x:7,y:8},{x:7,y:0}]);
 assert.ok(haces.every(c=>c.inicio===0&&c.duracion===1000));
 assert.deepEqual(golpes.sort((a,b)=>a.inicio-b.inicio).map(c=>[c.desde.x,c.inicio]),[[4,110],[5,220],[6,330]]);
 assert.equal(clips.find(c=>c.id==='eco-casilla').inicio,1800);
 assert.deepEqual(clips.find(c=>c.id==='eco-casilla').desde,{x:6,y:1});
});

test('secuencia válida y validación de referencias, límites y duplicados',()=>{
 assert.equal(validarVFX(vfx),null);
 assert.ok(validarVFX({secuencia:{version:1,clips:[paso('x','haz'),paso('x','haz')]}}));
 assert.ok(validarVFX({secuencia:{version:1,clips:[paso('x','casilla')]}}));
 assert.ok(validarVFX({secuencia:{version:1,clips:[paso('x','haz',{inicio:10001})]}}));
});

test('el combate emite impactos confirmados y preserva los destinos al reflejar el tablero',()=>{
 const ataque={id:'sagrado',nombre:'Aliento Sagrado',efecto:'dano',cantidad:0,caras:8,modificador:1,
  tipo_dano:'',estado:'',duracion:0,coste_ph:0,vfx,
  tablero:{forma:'personalizada',afecta:'enemigos',origen_area:'lanzador',alcance:0,tamano:0,patron:{orientacion:'apuntar',casillas}}};
 const fuente=(id,px,py,efectos=[])=>({id,forja_id:null,nombre:id,posicion:{x:px,y:py},
  stats:{vida:50,ph:50,fatiga:10},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h',nombre:'H',stats:{},efectos}]}});
 let c=motor.agregar(motor.nuevoCombate(),fuente('sky',3,4,[ataque]),'jugador',()=>20);
 for(let i=1;i<=3;i++)c=motor.agregar(c,fuente('enemigo-'+i,3+i,4),'enemigo',()=>1);
 c=motor.iniciar(c,()=>10);
 c.regla='directo';
 const completado=motor.actuar(c,'sky','hab:h:sagrado','enemigo-1',()=>10,false,{x:7,y:4});
 const e=completado.evento_visual;
 assert.deepEqual(e.geometria_vfx.impactos,[[{x:4,y:4}],[{x:5,y:4}],[{x:6,y:4}]]);
 const tablero=motor.dimensionesTablero(completado);
 const vista=motor.proyectarVista({tablero,evento_visual:e},'sky',{espejar:true,intercambiar:false,ocultar:false});
 assert.deepEqual(vista.evento_visual.geometria_vfx.impactos.flat().map(p=>p.x),[4,5,6].map(x=>tablero.columnas-1-x));
 const n=motor.actuar({...c,regla:'impacto'},'sky','hab:h:sagrado','enemigo-1',()=>1,false,{x:7,y:4});
 assert.deepEqual(n.evento_visual.geometria_vfx.impactos,[]);
 assert.equal(planificarVFX(n.evento_visual).filter(clip=>clip.id.startsWith('chispa')).length,0);
});
